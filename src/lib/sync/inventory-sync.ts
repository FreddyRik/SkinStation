import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY, parseCurrency } from "@/lib/currency";
import {
  decodeInspectLocally,
  enrichItemsLocally,
} from "@/lib/csfloat/inspect";
import { lookupPlayerReputation } from "@/lib/reputation/lookup";
import {
  cacheSkinportPricesForNames,
  getSkinportCatalog,
  skinportPriceFor,
} from "@/lib/skinport/catalog";
import {
  cacheTraderSteamPricesForNames,
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
import { enrichFloatsViaSteamwebapi } from "@/lib/steamwebapi/float";
import { fetchSteamwebapiInventory } from "@/lib/steamwebapi/inventory";
import {
  STEAMWEBAPI_LIMIT_MESSAGE,
  SteamwebapiLimitError,
} from "@/lib/steamwebapi/errors";

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
  totalSkinport: number;
  inspected: number;
  steamPricesResolved: number;
  skippedCooldown?: boolean;
  /** Soft warning (e.g. Steamwebapi quota) — sync still completed. */
  warning?: string | null;
};

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
    const totalSteam = items.reduce((sum, i) => sum + (i.steamPrice ?? 0), 0);
    const totalSkinport = items.reduce(
      (sum, i) => sum + (i.skinportPrice ?? 0),
      0,
    );
    return {
      profileId,
      steamId: profile.steamId,
      currency,
      itemCount: items.length,
      totalSteam,
      totalSkinport,
      inspected: items.filter((i) => i.floatValue != null).length,
      steamPricesResolved: items.filter((i) => i.steamPrice != null).length,
      skippedCooldown: true,
    };
  }

  if (profile.syncing) {
    const lockAgeMs = Date.now() - profile.updatedAt.getTime();
    const staleLock = lockAgeMs > 10 * 60 * 1000;
    if (!options?.force && !staleLock) {
      throw new Error("A sync is already in progress for this profile.");
    }
    // Force or stale lock: clear so we can reclaim below.
    await prisma.profile.update({
      where: { id: profileId },
      data: { syncing: false },
    });
  }

  const claimed = await prisma.profile.updateMany({
    where: { id: profileId, syncing: false },
    data: { syncing: true, lastError: null, currency },
  });
  if (claimed.count !== 1) {
    throw new Error("A sync is already in progress for this profile.");
  }

  try {
    // Refresh FACEIT/Leetify in parallel with inventory (best-effort, never blocks sync).
    void applyReputationToProfile(profile.steamId, {
      force: Boolean(options?.force) || !profile.faceitFetchedAt,
    }).catch((err) => console.warn("Reputation enrich failed:", err));

    const inventory = await fetchSteamInventory(profile.steamId, {
      force: Boolean(options?.force),
    });

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

    // Prefer Steamwebapi inventory for floats/patterns/certificates
    let webapiInventory = new Map<
      string,
      Awaited<ReturnType<typeof fetchSteamwebapiInventory>> extends Map<
        string,
        infer V
      >
        ? V
        : never
    >();
    let steamwebapiWarning: string | null = null;
    try {
      webapiInventory = await fetchSteamwebapiInventory(profile.steamId);
    } catch (err) {
      if (err instanceof SteamwebapiLimitError) {
        steamwebapiWarning = STEAMWEBAPI_LIMIT_MESSAGE;
        console.warn(STEAMWEBAPI_LIMIT_MESSAGE);
      } else {
        console.warn("Steamwebapi inventory enrich failed:", err);
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
      // Prefer certificate decode when Steam inventory inspect was masked/broken
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

    // Fallback float enrichment for any assets still missing floats
    const missingFloatAssets = inventory.filter((i) => {
      const w = webapiInventory.get(i.assetId);
      const local = inspectResults.get(i.assetId);
      return w?.floatValue == null && local?.floatValue == null;
    });
    let remoteFloats = new Map<
      string,
      { floatValue: number | null; paintSeed: number | null; paintIndex: number | null }
    >();
    if (!steamwebapiWarning && missingFloatAssets.length > 0) {
      const remoteFloatEnrich = await enrichFloatsViaSteamwebapi(
        profile.steamId,
        missingFloatAssets.map((i) => ({
          assetId: i.assetId,
          marketHashName: i.marketHashName,
          type: i.type,
        })),
      );
      remoteFloats = remoteFloatEnrich.floats;
      if (remoteFloatEnrich.limitHit) {
        steamwebapiWarning = STEAMWEBAPI_LIMIT_MESSAGE;
        console.warn(STEAMWEBAPI_LIMIT_MESSAGE);
      }
    }

    let skinportCatalog;
    try {
      skinportCatalog = await getSkinportCatalog(currency);
    } catch {
      skinportCatalog = new Map();
    }

    let traderSteam = new Map<string, number>();
    try {
      traderSteam = await getCsgoTraderSteamCatalog(currency);
    } catch {
      traderSteam = new Map();
    }

    const stickerNames = new Set<string>();
    for (const item of inventory) {
      const webapi = webapiInventory.get(item.assetId);
      const inspect = inspectResults.get(item.assetId);
      const cert = certificateStickers.get(item.assetId);
      const merged = mergeStickersBySlot(
        webapi?.stickers,
        item.stickersFromDescription,
        cert,
        inspect?.stickers,
      );
      for (const s of merged) {
        if (s.name) stickerNames.add(stickerMarketHashName(s.name));
      }
    }

    const itemNames = inventory.map((i) => i.marketHashName);
    const allNames = [...new Set([...itemNames, ...stickerNames])];

    if (skinportCatalog.size > 0) {
      await cacheSkinportPricesForNames(skinportCatalog, allNames, currency);
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
    let totalSteam = 0;
    let totalSkinport = 0;

    const rows = inventory.map((item) => {
      const inspect = inspectResults.get(item.assetId);
      const webapi = webapiInventory.get(item.assetId);
      const remote = remoteFloats.get(item.assetId);
      const steamPrice = steamPrices.get(item.marketHashName) ?? null;
      const skinportPrice = skinportPriceFor(
        skinportCatalog,
        item.marketHashName,
      );

      if (steamPrice != null) totalSteam += steamPrice;
      if (skinportPrice != null) totalSkinport += skinportPrice;

      const cert = certificateStickers.get(item.assetId);
      const merged = mergeStickersBySlot(
        webapi?.stickers,
        item.stickersFromDescription,
        cert,
        inspect?.stickers,
      );

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
          skinportPrice: hash
            ? skinportPriceFor(skinportCatalog, hash)
            : null,
        };
      });

      return {
        profileId,
        assetId: item.assetId,
        classId: item.classId,
        instanceId: item.instanceId,
        marketHashName: item.marketHashName,
        name: item.name,
        iconUrl: item.iconUrl,
        exterior: item.exterior,
        floatValue:
          webapi?.floatValue ?? inspect?.floatValue ?? remote?.floatValue ?? null,
        paintSeed:
          webapi?.paintSeed ?? inspect?.paintSeed ?? remote?.paintSeed ?? null,
        paintIndex:
          webapi?.paintIndex ??
          inspect?.paintIndex ??
          remote?.paintIndex ??
          null,
        stickers: stickers.length ? JSON.stringify(stickers) : null,
        inspectLink: webapi?.inspectLink ?? item.inspectLink,
        steamPrice,
        skinportPrice,
        tradable: item.tradable,
        rarity: item.rarity,
        type: item.type,
        updatedAt: now,
      };
    });

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
          totalSkinport,
        },
      });

      await tx.profile.update({
        where: { id: profileId },
        data: {
          lastSyncedAt: now,
          syncing: false,
          lastError: steamwebapiWarning,
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
      totalSkinport,
      inspected: rows.filter((r) => r.floatValue != null).length,
      steamPricesResolved: [...steamPrices.values()].filter((v) => v != null)
        .length,
      warning: steamwebapiWarning,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await prisma.profile.update({
      where: { id: profileId },
      data: { syncing: false, lastError: message },
    });
    throw err;
  }
}
