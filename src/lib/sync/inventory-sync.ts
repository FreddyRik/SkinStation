import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY, parseCurrency } from "@/lib/currency";
import {
  decodeInspectLocally,
  enrichItemsLocally,
} from "@/lib/csfloat/inspect";
import { itemCanListOnMarket, itemSupportsStickers } from "@/lib/item-flags";
import { lookupPlayerReputation } from "@/lib/reputation/lookup";
import { portfolioTotalFromItems } from "@/lib/price-source";
import {
  buffPriceFor,
  cacheBuffPricesForNames,
  cacheTraderSteamPricesForNames,
  getCsgoTraderBuffCatalog,
  getCsgoTraderSteamCatalog,
  stickerMarketHashName,
  traderSteamPriceFor,
} from "@/lib/steam-market/csgotrader";
import {
  getStickerIconCatalog,
  resolveStickerIconUrl,
} from "@/lib/stickers/catalog";
import { mergeStickersBySlot } from "@/lib/stickers/merge";
import { stripStickerPrefix } from "@/lib/stickers/normalize";
import { resolveSteamPrices } from "@/lib/steam-market/prices";
import { fetchSteamInventory } from "@/lib/steam/inventory";
import {
  fetchSteamProfileMeta,
  resolveSteamId64,
} from "@/lib/steam/resolve";
import {
  enrichFloatsViaSteamwebapi,
  getSteamwebapiKey,
} from "@/lib/steamwebapi/float";
import { fetchSteamwebapiInventory } from "@/lib/steamwebapi/inventory";
import {
  STEAMWEBAPI_LIMIT_MESSAGE,
  SteamwebapiLimitError,
} from "@/lib/steamwebapi/errors";
import {
  enrichFloatsViaInspectApi,
  getInspectApiBaseUrl,
  INSPECT_API_MISSING_MESSAGE,
} from "@/lib/inspect/remote";

const REPUTATION_REFRESH_MS = 24 * 60 * 60 * 1000;

/** Fetch FACEIT + Leetify and persist on the profile. Safe to call often. */
export async function applyReputationToProfile(
  steamId: string,
  options?: { force?: boolean },
) {
  const existing = await prisma.profile.findUnique({ where: { steamId } });
  if (!existing) return null;

  if (
    !options?.force &&
    existing.faceitFetchedAt &&
    Date.now() - existing.faceitFetchedAt.getTime() < REPUTATION_REFRESH_MS
  ) {
    return existing;
  }

  const rep = await lookupPlayerReputation(steamId);
  const now = new Date();

  return prisma.profile.update({
    where: { steamId },
    data: {
      faceitId: rep.faceit.playerId,
      faceitNickname: rep.faceit.nickname,
      faceitUrl: rep.faceit.found ? rep.faceit.profileUrl : null,
      faceitLevel: rep.faceit.skillLevel,
      faceitElo: rep.faceit.elo,
      faceitFound: rep.faceit.found,
      faceitFetchedAt: now,
      leetifyId: rep.leetify.id,
      leetifyName: rep.leetify.name,
      leetifyUrl: rep.leetify.found ? rep.leetify.profileUrl : null,
      leetifyRating: rep.leetify.rating,
      leetifyFound: rep.leetify.found,
    },
  });
}

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;

export function getSyncCooldownMs(): number {
  const raw = process.env.SYNC_COOLDOWN_MS;
  if (!raw) return DEFAULT_COOLDOWN_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_COOLDOWN_MS;
}

export type SyncResult = {
  profileId: string;
  steamId: string;
  currency: Currency;
  itemCount: number;
  totalSteam: number;
  totalBuff: number;
  inspected: number;
  steamPricesResolved: number;
  skippedCooldown?: boolean;
  /** Soft warning (e.g. Steamwebapi quota) — sync still completed. */
  warning?: string | null;
  /** Steam upstream failed; served last successful DB inventory instead. */
  usedCachedInventory?: boolean;
};

const STEAM_RATE_LIMIT_CACHE_WARNING =
  "Steam rate-limited this server IP. Showing your last successful sync — try Refresh again in a few minutes.";

const STEAM_TRANSIENT_CACHE_WARNING =
  "Steam inventory was temporarily unavailable. Showing your last successful sync — try Refresh again shortly.";

function isPrivateInventoryError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("private") ||
    lower.includes("hidden") ||
    lower.includes("ensure the profile and cs2 inventory are public")
  );
}

/** Transient Steam Community failures where serving DB cache is better than failing hard. */
function isTransientSteamInventoryError(message: string): boolean {
  if (isPrivateInventoryError(message)) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("rate-limited") ||
    lower.includes("rate limited") ||
    lower.includes("steam inventory request failed") ||
    lower.includes("empty inventory response") ||
    lower.includes("invalid json") ||
    lower.includes("could not load inventory") ||
    lower.includes("too large to sync")
  );
}

async function syncResultFromCachedItems(
  profileId: string,
  steamId: string,
  currency: Currency,
  warning: string | null,
  flags?: { skippedCooldown?: boolean; usedCachedInventory?: boolean },
): Promise<SyncResult> {
  const items = await prisma.inventoryItem.findMany({
    where: { profileId },
  });
  const totalSteam = portfolioTotalFromItems(items, "steam");
  const totalBuff = portfolioTotalFromItems(items, "buff");
  return {
    profileId,
    steamId,
    currency,
    itemCount: items.length,
    totalSteam,
    totalBuff,
    inspected: items.filter((i) => i.floatValue != null).length,
    steamPricesResolved: items.filter(
      (i) => itemCanListOnMarket(i) && i.steamPrice != null,
    ).length,
    warning,
    skippedCooldown: flags?.skippedCooldown,
    usedCachedInventory: flags?.usedCachedInventory,
  };
}

export async function ensureProfileFromInput(rawInput: string) {
  const steamId = await resolveSteamId64(rawInput);
  const meta = await fetchSteamProfileMeta(steamId);

  const profile = await prisma.profile.upsert({
    where: { steamId },
    create: {
      steamId,
      personaName: meta.personaName,
      avatarUrl: meta.avatarUrl,
      profileUrl: meta.profileUrl,
    },
    update: {
      personaName: meta.personaName ?? undefined,
      avatarUrl: meta.avatarUrl ?? undefined,
      profileUrl: meta.profileUrl,
    },
  });

  // Reputation lookup is best-effort and must never block profile creation.
  void applyReputationToProfile(steamId, {
    force: !profile.faceitFetchedAt,
  }).catch((err) => console.warn("Reputation enrich failed:", err));

  return prisma.profile.findUniqueOrThrow({ where: { id: profile.id } });
}

export async function syncInventory(
  profileId: string,
  options?: { force?: boolean; currency?: Currency },
): Promise<SyncResult> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  const currency = parseCurrency(
    options?.currency ?? profile.currency,
    DEFAULT_CURRENCY,
  );
  const currencyChanged = profile.currency !== currency;

  const cooldownMs = getSyncCooldownMs();
  if (
    !options?.force &&
    !currencyChanged &&
    profile.lastSyncedAt &&
    Date.now() - profile.lastSyncedAt.getTime() < cooldownMs
  ) {
    // Still refresh FACEIT/Leetify if missing — cheap and independent of inventory.
    if (!profile.faceitFetchedAt) {
      void applyReputationToProfile(profile.steamId, { force: true }).catch(
        (err) => console.warn("Reputation enrich failed:", err),
      );
    }

    const items = await prisma.inventoryItem.findMany({
      where: { profileId },
    });
    return syncResultFromCachedItems(
      profileId,
      profile.steamId,
      currency,
      items.length > 0
        ? `Cooldown active (${Math.round(cooldownMs / 60000)} min). Showing cached inventory.`
        : null,
      { skippedCooldown: true },
    );
  }

  const STALE_LOCK_MS = 10 * 60 * 1000;
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const lockToken = crypto.randomUUID();

  // Atomic claim: idle lock, or steal only when the lock is stale.
  // Force no longer steals a fresh in-progress lock (abuse / race safe).
  const claimed = await prisma.profile.updateMany({
    where: {
      id: profileId,
      OR: [
        { syncing: false },
        { syncing: true, updatedAt: { lt: staleBefore } },
      ],
    },
    data: {
      syncing: true,
      syncLockToken: lockToken,
      lastError: null,
      currency,
    },
  });
  if (claimed.count !== 1) {
    throw new Error("A sync is already in progress for this profile.");
  }

  const releaseLock = async (lastError: string | null) => {
    await prisma.profile.updateMany({
      where: { id: profileId, syncLockToken: lockToken },
      data: {
        syncing: false,
        syncLockToken: null,
        lastError,
      },
    });
  };

  try {
    // Refresh FACEIT/Leetify in parallel with inventory (best-effort, never blocks sync).
    void applyReputationToProfile(profile.steamId, {
      force: Boolean(options?.force) || !profile.faceitFetchedAt,
    }).catch((err) => console.warn("Reputation enrich failed:", err));

    let inventory: Awaited<ReturnType<typeof fetchSteamInventory>>;
    try {
      inventory = await fetchSteamInventory(profile.steamId, {
        force: Boolean(options?.force),
      });
    } catch (fetchErr) {
      const message =
        fetchErr instanceof Error ? fetchErr.message : "Steam inventory failed";
      if (isTransientSteamInventoryError(message)) {
        const existingCount = await prisma.inventoryItem.count({
          where: { profileId },
        });
        if (existingCount > 0) {
          const lower = message.toLowerCase();
          const warning =
            lower.includes("rate-limited") || lower.includes("rate limited")
              ? STEAM_RATE_LIMIT_CACHE_WARNING
              : STEAM_TRANSIENT_CACHE_WARNING;
          // Soft-fail: keep cache, surface warning, clear sync lock.
          await releaseLock(warning);
          return syncResultFromCachedItems(
            profileId,
            profile.steamId,
            currency,
            warning,
            { usedCachedInventory: true },
          );
        }
      }
      throw fetchErr;
    }

    // Keep floats/patterns across rebuilds when re-enrichment fails (e.g. API quota
    // burned by syncing another profile). Match by Steam assetId.
    const previousFloatRows = await prisma.inventoryItem.findMany({
      where: { profileId },
      select: {
        assetId: true,
        floatValue: true,
        paintSeed: true,
        paintIndex: true,
      },
    });
    // Normalize assetId keys — Steam/JSON can disagree on string vs number-like ids.
    const previousFloats = new Map(
      previousFloatRows.map((row) => [
        String(row.assetId),
        {
          floatValue: row.floatValue,
          paintSeed: row.paintSeed,
          paintIndex: row.paintIndex,
        },
      ]),
    );

    const prevFor = (assetId: string) => previousFloats.get(String(assetId));
    const pickFiniteFloat = (
      ...candidates: Array<number | null | undefined>
    ): number | null => {
      for (const c of candidates) {
        if (typeof c === "number" && Number.isFinite(c)) return c;
      }
      return null;
    };

    const inspectResults = enrichItemsLocally(
      inventory.map((i) => ({
        assetId: i.assetId,
        inspectLink: i.inspectLink,
        stickersFromDescription: i.stickersFromDescription,
      })),
    );

    // Icon map from standalone sticker items already in this inventory
    const stickerIconByName = new Map<string, string>();
    for (const item of inventory) {
      if (!item.marketHashName.startsWith("Sticker |") || !item.iconUrl) continue;
      const short = item.marketHashName.replace(/^Sticker\s*\|\s*/i, "").trim();
      stickerIconByName.set(short.toLowerCase(), item.iconUrl);
      stickerIconByName.set(item.marketHashName.toLowerCase(), item.iconUrl);
    }

    let stickerIconCatalog = new Map<string, string>();
    try {
      stickerIconCatalog = await getStickerIconCatalog();
    } catch (err) {
      console.warn("Sticker icon catalog failed:", err);
    }

    // Float cascade (Steamwebapi is optional last resort, not required):
    // 1) Local masked inspect decode (already in inspectResults)
    // 2) Self-hosted INSPECT_API_URL (CSGOFloat-compatible)
    // 3) Optional Steamwebapi inventory + per-asset float
    // 4) Previous DB values (applied when building rows)
    let floatProviderWarning: string | null = null;

    const stillMissingFloat = (assetId: string) => {
      const local = inspectResults.get(assetId);
      const prev = prevFor(assetId);
      return (
        pickFiniteFloat(local?.floatValue) == null &&
        pickFiniteFloat(prev?.floatValue) == null
      );
    };

    let inspectApiFloats = new Map<
      string,
      {
        floatValue: number | null;
        paintSeed: number | null;
        paintIndex: number | null;
        stickers?: Array<{
          slot: number;
          stickerId: number;
          name?: string;
          wear?: number;
        }>;
        inspectLink?: string | null;
      }
    >();

    const missingForInspectApi = inventory.filter((i) =>
      stillMissingFloat(i.assetId),
    );
    if (missingForInspectApi.length > 0) {
      const inspectEnrich = await enrichFloatsViaInspectApi(
        profile.steamId,
        missingForInspectApi.map((i) => ({
          assetId: i.assetId,
          marketHashName: i.marketHashName,
          type: i.type,
          inspectLink: i.inspectLink,
        })),
      );
      inspectApiFloats = inspectEnrich.floats;
      if (inspectEnrich.warning) {
        floatProviderWarning = inspectEnrich.warning;
        console.warn(inspectEnrich.warning);
      }

      // Prefer masked/certificate links returned by the inspect API for local decode.
      for (const [assetId, remote] of inspectApiFloats) {
        if (remote.inspectLink) {
          const decoded = decodeInspectLocally(remote.inspectLink);
          if (decoded) {
            if (!inspectResults.has(assetId)) {
              inspectResults.set(assetId, decoded);
            } else {
              const prev = inspectResults.get(assetId)!;
              if (prev.floatValue == null && decoded.floatValue != null) {
                prev.floatValue = decoded.floatValue;
              }
              if (prev.paintSeed == null && decoded.paintSeed != null) {
                prev.paintSeed = decoded.paintSeed;
              }
              if (prev.paintIndex == null && decoded.paintIndex != null) {
                prev.paintIndex = decoded.paintIndex;
              }
              if (!prev.stickers.length && decoded.stickers.length) {
                prev.stickers = decoded.stickers;
              }
            }
          }
        }
      }
    }

    // Optional Steamwebapi — only when a key is configured and gaps remain.
    let webapiInventory = new Map<
      string,
      Awaited<ReturnType<typeof fetchSteamwebapiInventory>> extends Map<
        string,
        infer V
      >
        ? V
        : never
    >();
    let steamwebapiLimitHit = false;
    if (getSteamwebapiKey()) {
      try {
        webapiInventory = await fetchSteamwebapiInventory(profile.steamId);
      } catch (err) {
        if (err instanceof SteamwebapiLimitError) {
          // Optional last-resort only — don't surface quota noise in the UI.
          steamwebapiLimitHit = true;
          console.warn(STEAMWEBAPI_LIMIT_MESSAGE);
        } else {
          console.warn("Steamwebapi inventory enrich failed:", err);
        }
      }
    }

    // Decode Steamwebapi certificate inspect links for sticker wear / ids
    const certificateStickers = new Map<
      string,
      NonNullable<ReturnType<typeof decodeInspectLocally>>["stickers"]
    >();
    for (const [assetId, webapi] of webapiInventory) {
      if (!webapi.inspectLink) continue;
      const decoded = decodeInspectLocally(webapi.inspectLink);
      if (decoded?.stickers?.length) {
        certificateStickers.set(assetId, decoded.stickers);
      }
      if (decoded && !inspectResults.has(assetId)) {
        inspectResults.set(assetId, decoded);
      } else if (decoded && inspectResults.has(assetId)) {
        const prev = inspectResults.get(assetId)!;
        if (prev.floatValue == null && decoded.floatValue != null) {
          prev.floatValue = decoded.floatValue;
        }
        if (prev.paintSeed == null && decoded.paintSeed != null) {
          prev.paintSeed = decoded.paintSeed;
        }
        if (prev.paintIndex == null && decoded.paintIndex != null) {
          prev.paintIndex = decoded.paintIndex;
        }
      }
    }

    let remoteFloats = new Map<
      string,
      { floatValue: number | null; paintSeed: number | null; paintIndex: number | null }
    >();
    const missingAfterInspect = inventory.filter((i) => {
      const w = webapiInventory.get(String(i.assetId));
      const local = inspectResults.get(i.assetId);
      const inspectRemote = inspectApiFloats.get(i.assetId);
      const prev = prevFor(i.assetId);
      return (
        pickFiniteFloat(w?.floatValue) == null &&
        pickFiniteFloat(local?.floatValue) == null &&
        pickFiniteFloat(inspectRemote?.floatValue) == null &&
        pickFiniteFloat(prev?.floatValue) == null
      );
    });
    if (
      getSteamwebapiKey() &&
      !steamwebapiLimitHit &&
      missingAfterInspect.length > 0
    ) {
      const remoteFloatEnrich = await enrichFloatsViaSteamwebapi(
        profile.steamId,
        missingAfterInspect.map((i) => {
          const w = webapiInventory.get(String(i.assetId));
          return {
            assetId: String(i.assetId),
            marketHashName: i.marketHashName,
            type: i.type,
            inspectLink: w?.inspectLink ?? i.inspectLink,
          };
        }),
      );
      remoteFloats = remoteFloatEnrich.floats;
      if (remoteFloatEnrich.limitHit) {
        steamwebapiLimitHit = true;
        console.warn(STEAMWEBAPI_LIMIT_MESSAGE);
      }
    }

    // Soft hint when weapon floats are still missing after the cascade.
    if (!floatProviderWarning) {
      const missingCount = inventory.filter((i) => {
        const w = webapiInventory.get(String(i.assetId));
        const local = inspectResults.get(i.assetId);
        const inspectRemote = inspectApiFloats.get(i.assetId);
        const remote = remoteFloats.get(String(i.assetId));
        const prev = prevFor(i.assetId);
        const name = i.marketHashName;
        const type = (i.type ?? "").toLowerCase();
        const weaponLike =
          name.includes("|") &&
          !name.startsWith("Sticker |") &&
          !name.startsWith("Patch |") &&
          !name.startsWith("Sealed Graffiti") &&
          !name.startsWith("Charm |") &&
          (type.includes("rifle") ||
            type.includes("pistol") ||
            type.includes("smg") ||
            type.includes("shotgun") ||
            type.includes("sniper") ||
            type.includes("machinegun") ||
            type.includes("knife") ||
            type.includes("gloves") ||
            !type);
        if (!weaponLike) return false;
        return (
          pickFiniteFloat(w?.floatValue) == null &&
          pickFiniteFloat(local?.floatValue) == null &&
          pickFiniteFloat(inspectRemote?.floatValue) == null &&
          pickFiniteFloat(remote?.floatValue) == null &&
          pickFiniteFloat(prev?.floatValue) == null
        );
      }).length;

      if (missingCount > 0) {
        if (!getInspectApiBaseUrl() && !getSteamwebapiKey()) {
          floatProviderWarning = INSPECT_API_MISSING_MESSAGE;
        } else if (steamwebapiLimitHit) {
          floatProviderWarning =
            "Float provider quota hit — many skins still have no float. Try Force again later, or set INSPECT_API_URL to a self-hosted inspect service.";
        } else if (
          getSteamwebapiKey() &&
          webapiInventory.size === 0 &&
          !getInspectApiBaseUrl()
        ) {
          floatProviderWarning =
            "Steamwebapi inventory returned no items for float enrichment. Check the API key/plan, or set INSPECT_API_URL to a self-hosted inspect service.";
        } else if (missingCount >= 5) {
          floatProviderWarning =
            `${missingCount} skins still have no float after sync. ` +
            (getInspectApiBaseUrl()
              ? "Inspect API may be rate-limited — try Force again shortly."
              : "Steam no longer exposes certificate floats on public inventory. Steamwebapi had gaps — Force sync again later, or set INSPECT_API_URL for a self-hosted GC bot.");
        }
      }
    }

    const steamwebapiWarning = floatProviderWarning;

    let priceCatalogWarning: string | null = null;
    let buffCatalog;
    try {
      buffCatalog = await getCsgoTraderBuffCatalog(currency);
    } catch {
      buffCatalog = new Map();
      priceCatalogWarning =
        "Buff163 price catalog unavailable — prices may be incomplete.";
    }

    let traderSteam = new Map<string, number>();
    try {
      traderSteam = await getCsgoTraderSteamCatalog(currency);
    } catch {
      traderSteam = new Map();
      priceCatalogWarning = priceCatalogWarning
        ? `${priceCatalogWarning} Steam Market price catalog also unavailable.`
        : "Steam Market price catalog unavailable — prices may be incomplete.";
    }

    const stickerNames = new Set<string>();
    for (const item of inventory) {
      const webapi = webapiInventory.get(String(item.assetId));
      const inspect = inspectResults.get(item.assetId);
      const cert = certificateStickers.get(item.assetId);
      const inspectRemote = inspectApiFloats.get(item.assetId);
      const merged = mergeStickersBySlot(
        item.stickersFromDescription,
        inspect?.stickers,
        inspectRemote?.stickers,
        cert,
        webapi?.stickers,
      );
      for (const s of merged) {
        if (s.name) stickerNames.add(stickerMarketHashName(s.name));
      }
    }

    const itemNames = inventory.map((i) => i.marketHashName);
    const allNames = [...new Set([...itemNames, ...stickerNames])];

    if (buffCatalog.size > 0) {
      await cacheBuffPricesForNames(buffCatalog, allNames, currency);
    }
    if (traderSteam.size > 0) {
      await cacheTraderSteamPricesForNames(traderSteam, allNames, currency);
    }

    const steamPrices = new Map<string, number | null>();
    const missingForSteamApi: string[] = [];
    for (const name of allNames) {
      const fromTrader = traderSteamPriceFor(traderSteam, name);
      if (fromTrader != null) {
        steamPrices.set(name, fromTrader);
      } else {
        missingForSteamApi.push(name);
      }
    }

    if (missingForSteamApi.length > 0) {
      const gaps = await resolveSteamPrices(missingForSteamApi, {
        maxFetches: Math.min(15, missingForSteamApi.length),
        delayMs: 1100,
        currency,
      });
      for (const [name, price] of gaps) {
        if (price != null) steamPrices.set(name, price);
      }
    }

    const now = new Date();

    const rows = inventory.map((item) => {
      const inspect = inspectResults.get(item.assetId);
      const inspectRemote = inspectApiFloats.get(item.assetId);
      const webapi = webapiInventory.get(String(item.assetId));
      const remote = remoteFloats.get(String(item.assetId));
      const previous = prevFor(item.assetId);
      const listable = itemCanListOnMarket({
        marketable: item.marketable,
        type: item.type,
        marketHashName: item.marketHashName,
        name: item.name,
      });
      const steamPrice = listable
        ? (steamPrices.get(item.marketHashName) ?? null)
        : null;
      const buffPrice = listable
        ? buffPriceFor(buffCatalog, item.marketHashName)
        : null;

      const cert = certificateStickers.get(item.assetId);
      const canHaveStickers = itemSupportsStickers(
        item.type,
        item.marketHashName,
      );
      const merged = canHaveStickers
        ? mergeStickersBySlot(
            item.stickersFromDescription,
            inspect?.stickers,
            inspectRemote?.stickers,
            cert,
            webapi?.stickers,
          )
        : [];

      const stickers = merged.map((s) => {
        const name = s.name ? stripStickerPrefix(s.name) : undefined;
        const hash = name ? stickerMarketHashName(name) : null;
        const iconFromInventory = name
          ? (stickerIconByName.get(name.toLowerCase()) ??
            stickerIconByName.get(stickerMarketHashName(name).toLowerCase()))
          : null;
        return {
          slot: s.slot,
          stickerId: s.stickerId,
          name,
          wear: s.wear,
          iconUrl: resolveStickerIconUrl(
            stickerIconCatalog,
            name,
            s.iconUrl || iconFromInventory || null,
          ),
          steamPrice: hash ? (steamPrices.get(hash) ?? null) : null,
          buffPrice: hash ? buffPriceFor(buffCatalog, hash) : null,
        };
      });

      return {
        profileId,
        assetId: String(item.assetId),
        classId: item.classId,
        instanceId: item.instanceId,
        marketHashName: item.marketHashName,
        name: item.name,
        iconUrl: item.iconUrl,
        exterior: item.exterior,
        // Prefer local + self-hosted inspect API; Steamwebapi is last resort.
        // Always fall back to previous DB floats so a quota-burned re-sync cannot wipe them.
        floatValue: pickFiniteFloat(
          inspect?.floatValue,
          inspectRemote?.floatValue,
          webapi?.floatValue,
          remote?.floatValue,
          previous?.floatValue,
        ),
        paintSeed:
          inspect?.paintSeed ??
          inspectRemote?.paintSeed ??
          webapi?.paintSeed ??
          remote?.paintSeed ??
          previous?.paintSeed ??
          null,
        paintIndex:
          inspect?.paintIndex ??
          inspectRemote?.paintIndex ??
          webapi?.paintIndex ??
          remote?.paintIndex ??
          previous?.paintIndex ??
          null,
        stickers: stickers.length ? JSON.stringify(stickers) : null,
        inspectLink:
          inspectRemote?.inspectLink ??
          webapi?.inspectLink ??
          item.inspectLink,
        steamPrice,
        buffPrice,
        tradable: item.tradable,
        marketable: item.marketable,
        rarity: item.rarity,
        type: item.type,
        updatedAt: now,
      };
    });

    // Same fallback rules as the inventory grid / cooldown short-circuit.
    const totalSteam = portfolioTotalFromItems(rows, "steam");
    const totalBuff = portfolioTotalFromItems(rows, "buff");

    const softWarning = [steamwebapiWarning, priceCatalogWarning]
      .filter((w): w is string => Boolean(w))
      .join(" ")
      || null;

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.deleteMany({ where: { profileId } });
      if (rows.length > 0) {
        await tx.inventoryItem.createMany({ data: rows });
      }

      await tx.portfolioSnapshot.create({
        data: {
          profileId,
          currency,
          itemCount: inventory.length,
          totalSteam,
          totalBuff,
        },
      });

      // Only clear the lock if we still own it (another force sync may have taken over).
      await tx.profile.updateMany({
        where: { id: profileId, syncLockToken: lockToken },
        data: {
          lastSyncedAt: now,
          syncing: false,
          syncLockToken: null,
          lastError: softWarning,
          currency,
        },
      });
    });

    return {
      profileId,
      steamId: profile.steamId,
      currency,
      itemCount: inventory.length,
      totalSteam,
      totalBuff,
      inspected: rows.filter((r) => r.floatValue != null).length,
      steamPricesResolved: [...steamPrices.values()].filter((v) => v != null)
        .length,
      warning: softWarning,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await releaseLock(message);
    throw err;
  }
}
