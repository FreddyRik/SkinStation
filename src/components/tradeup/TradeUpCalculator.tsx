"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TradeUpContractSlots, type SlotDraft } from "@/components/tradeup/TradeUpContractSlots";
import { TradeUpResultsPanel } from "@/components/tradeup/TradeUpResultsPanel";
import { TradeUpSandboxPicker } from "@/components/tradeup/TradeUpSandboxPicker";
import { TradeUpInventoryPicker } from "@/components/tradeup/TradeUpInventoryPicker";
import {
  catalogHelpers,
  contractSlotCount,
  defaultCostForSkin,
  defaultFloatForSkin,
  inventoryCost,
  inventoryFloatForTradeUp,
  inventoryItemEligibility,
  type InventoryItemRow,
} from "@/components/tradeup/helpers";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { toFiniteNumber } from "@/lib/format";
import { isFloatProviderSoftWarning } from "@/lib/inspect/warnings";
import { isSteamwebapiLimitMessage } from "@/lib/steamwebapi/errors";
import {
  DEFAULT_PRICE_SOURCE,
  readStoredPriceSource,
  type PriceSource,
} from "@/lib/price-source";
import {
  parseRecentProfileEntry,
  readRecentProfiles,
  recentProfileIds,
  rememberRecentProfile,
  writeRecentProfiles,
  type RecentProfileEntry,
} from "@/lib/recent-profiles";
import {
  looksLikeSteamRateLimitMessage,
  markSteamBackoff,
} from "@/lib/steam-backoff";
import { computeTradeUp } from "@/lib/tradeup/compute";
import type {
  TradeUpCatalogPayload,
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpInput,
  TradeUpTier,
  TradeUpVariant,
} from "@/lib/tradeup/types";
import { PriceSourceToggle } from "@/components/PriceSourceToggle";
import {
  apiErrorMessage,
  parseCreateProfileResponse,
  parseProfileDetailApiResponse,
  parseProfileListApiResponse,
  parseSyncApiResponse,
} from "@/types/api";
import { customEventDetail } from "@/types/events";
import { isRecord, readString } from "@/types/json";

type Mode = "inventory" | "sandbox";

type ProfileOption = {
  id: string;
  personaName: string | null;
  avatarUrl: string | null;
  steamId: string;
  itemCount: number;
};

const EMPTY_SKINS = new Map<string, TradeUpCatalogSkin>();
const EMPTY_COLLECTIONS = new Map<string, TradeUpCollectionRow>();
const EMPTY_CRATES = new Map<string, TradeUpCrateRow>();

function isTradeUpCatalogPayload(value: unknown): value is TradeUpCatalogPayload {
  return (
    isRecord(value) &&
    Array.isArray(value.skins) &&
    Array.isArray(value.collections) &&
    Array.isArray(value.crates) &&
    isRecord(value.prices)
  );
}

function emptySlots(n: number): SlotDraft[] {
  return Array.from({ length: n }, () => null);
}

/** Resize slot array while preserving already-filled entries. */
function resizeSlots(prev: SlotDraft[], targetCount: number): SlotDraft[] {
  if (prev.length === targetCount) return prev;
  const next = emptySlots(targetCount);
  for (let i = 0; i < Math.min(prev.length, targetCount); i++) {
    next[i] = prev[i] ?? null;
  }
  return next;
}

function pickEmptySlotIndex(
  working: SlotDraft[],
  activeSlotIndex: number | null,
): number {
  if (
    activeSlotIndex != null &&
    activeSlotIndex < working.length &&
    !working[activeSlotIndex]
  ) {
    return activeSlotIndex;
  }
  return working.findIndex((s) => s == null);
}

function steamIcon(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `https://community.cloudflare.steamstatic.com/economy/image/${url}`;
}

/** Trade-up estimates missing floats from wear — hide float-provider nags here. */
function tradeUpSyncNote(warning: string | null | undefined): string | null {
  if (!warning) return null;
  if (isSteamwebapiLimitMessage(warning)) return null;
  if (isFloatProviderSoftWarning(warning)) return null;
  return warning;
}

export function TradeUpCalculator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProfileId = searchParams.get("profileId");

  const [mode, setMode] = useState<Mode>(
    initialProfileId ? "inventory" : "sandbox",
  );
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [priceSource, setPriceSource] =
    useState<PriceSource>(DEFAULT_PRICE_SOURCE);

  const [catalog, setCatalog] = useState<TradeUpCatalogPayload | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [slots, setSlots] = useState<SlotDraft[]>(() => emptySlots(10));
  const [lockedTier, setLockedTier] = useState<TradeUpTier | null>(null);
  const [lockedVariant, setLockedVariant] = useState<TradeUpVariant | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [profileId, setProfileId] = useState<string | null>(initialProfileId);
  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [profileInput, setProfileInput] = useState("");
  const autoSyncedRef = useRef(new Set<string>());

  // Keep profile selection in sync with the URL (e.g. shared /tradeup?profileId=).
  useEffect(() => {
    const fromUrl = searchParams.get("profileId");
    if (!fromUrl) return;
    setProfileId((prev) => (prev === fromUrl ? prev : fromUrl));
    setMode("inventory");
  }, [searchParams]);

  useEffect(() => {
    setCurrency(readStoredCurrency());
    setPriceSource(readStoredPriceSource());
    function onCurrency(e: Event) {
      const next = customEventDetail<Currency>(e);
      if (next) setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    fetch(`/api/tradeup/catalog?currency=${currency}`)
      .then(async (res) => {
        const data: unknown = await res.json();
        if (!res.ok) {
          throw new Error(apiErrorMessage(data, "Failed to load catalog"));
        }
        if (!isTradeUpCatalogPayload(data)) {
          throw new Error("Trade-up catalog response was invalid.");
        }
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : "Failed to load catalog",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  useEffect(() => {
    void refreshProfileList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot device-local profile load
  }, []);

  async function fetchInventory(id: string): Promise<InventoryItemRow[]> {
    const res = await fetch(`/api/profiles/${id}`);
    const data: unknown = await res.json();
    if (!res.ok) {
      throw new Error(apiErrorMessage(data, "Failed to load inventory"));
    }
    const parsed = parseProfileDetailApiResponse(data);
    return parsed.items.map((item) => ({
      ...item,
      exterior:
        typeof item.exterior === "string" && item.exterior.trim()
          ? item.exterior.trim()
          : null,
      floatValue: toFiniteNumber(item.floatValue),
      paintIndex: toFiniteNumber(item.paintIndex),
      steamPrice: toFiniteNumber(item.steamPrice),
      buffPrice: toFiniteNumber(item.buffPrice),
    }));
  }

  function profilesFromLocal(): ProfileOption[] {
    return readRecentProfiles().map((p) => ({
      id: p.id,
      personaName: p.personaName,
      avatarUrl: p.avatarUrl,
      steamId: p.steamId,
      itemCount: p.itemCount,
    }));
  }

  async function refreshProfileList() {
    const ids = recentProfileIds();
    if (ids.length === 0) {
      setProfiles([]);
      return;
    }

    try {
      const listRes = await fetch(
        `/api/profiles?ids=${ids.map(encodeURIComponent).join(",")}`,
      );
      const listData = parseProfileListApiResponse(await listRes.json());

      if (!listRes.ok) {
        setProfiles(profilesFromLocal());
        return;
      }

      const byId = new Map(listData.profiles.map((p) => [readString(p.id) ?? "", p]));
      const refreshed: RecentProfileEntry[] = [];
      for (const id of ids) {
        const p = byId.get(id);
        if (!p) continue;
        const entry = parseRecentProfileEntry({
          ...p,
          faceitFetchedAt:
            p.faceitFetchedAt instanceof Date
              ? p.faceitFetchedAt.toISOString()
              : p.faceitFetchedAt,
          lastSyncedAt:
            p.lastSyncedAt instanceof Date
              ? p.lastSyncedAt.toISOString()
              : p.lastSyncedAt,
        });
        if (entry) refreshed.push(entry);
      }

      writeRecentProfiles(refreshed);
      setProfiles(
        refreshed.map((p) => ({
          id: p.id,
          personaName: p.personaName,
          avatarUrl: p.avatarUrl,
          steamId: p.steamId,
          itemCount: p.itemCount,
        })),
      );
    } catch {
      setProfiles(profilesFromLocal());
    }
  }

  async function syncInventory(
    id: string,
  ): Promise<{ inspected: number; itemCount: number; warning?: string | null }> {
    setSyncNote("Syncing inventory from Steam… this can take a minute.");
    const syncRes = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Omit currency so sync keeps the profile's storage currency and does not
      // force a full rebuild just because the trade-up UI default is USD.
      body: JSON.stringify({
        profileId: id,
      }),
    });
    const syncData = parseSyncApiResponse(
      await syncRes.json().catch(() => null),
    );
    if (!syncRes.ok) {
      if (
        syncRes.status === 429 ||
        looksLikeSteamRateLimitMessage(syncData.error)
      ) {
        markSteamBackoff();
      }
      throw new Error(syncData.error ?? "Failed to sync inventory");
    }
    if (
      syncData.usedCachedInventory ||
      looksLikeSteamRateLimitMessage(syncData.warning)
    ) {
      markSteamBackoff();
    }
    return {
      inspected: syncData.inspected ?? 0,
      itemCount:
        typeof syncData.itemCount === "number" ? syncData.itemCount : 0,
      warning:
        typeof syncData.warning === "string" ? syncData.warning : null,
    };
  }

  useEffect(() => {
    if (mode !== "inventory" || !profileId) {
      setInventory([]);
      setSyncNote(null);
      return;
    }
    let cancelled = false;
    setInventoryLoading(true);
    setInventoryError(null);
    setSyncNote(null);

    (async () => {
      try {
        let items = await fetchInventory(profileId);
        if (cancelled) return;

        let note: string | null = null;

        // Empty DB usually means the profile was created but never synced.
        if (items.length === 0 && !autoSyncedRef.current.has(profileId)) {
          autoSyncedRef.current.add(profileId);
          setSyncNote("No local items yet — syncing from Steam…");
          const syncResult = await syncInventory(profileId);
          if (cancelled) return;
          items = await fetchInventory(profileId);
          if (cancelled) return;
          await refreshProfileList();
          note = tradeUpSyncNote(syncResult.warning);
        }

        setInventory(items);
        setSyncNote(note);
      } catch (err) {
        if (!cancelled) {
          setInventory([]);
          setInventoryError(
            err instanceof Error ? err.message : "Failed to load inventory",
          );
          setSyncNote(null);
        }
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local fetch/sync helpers
  }, [mode, profileId]);

  const helpers = useMemo(
    () => (catalog ? catalogHelpers(catalog) : null),
    [catalog],
  );

  const eligibleInventoryCount = useMemo(() => {
    if (!helpers) return 0;
    let n = 0;
    for (const item of inventory) {
      const el = inventoryItemEligibility(
        item,
        helpers.index,
        helpers.ctx.cratesById,
      );
      if (el.ok) n += 1;
    }
    return n;
  }, [helpers, inventory]);

  const floatedInventoryCount = useMemo(
    () => inventory.filter((i) => toFiniteNumber(i.floatValue) != null).length,
    [inventory],
  );

  const slotCount = lockedTier ? contractSlotCount(lockedTier) : 10;

  // Resize slots when lock changes; drop stale picker target against old geometry
  useEffect(() => {
    setActiveSlotIndex(null);
    setSlots((prev) => resizeSlots(prev, slotCount));
  }, [slotCount]);

  const filled = useMemo(
    () => slots.filter((slot): slot is TradeUpInput => slot != null),
    [slots],
  );
  const filledCount = filled.length;
  const remainingSlots = slotCount - filledCount;

  const selectedInventoryKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (s?.key) set.add(s.key);
    }
    return set;
  }, [slots]);

  const result = useMemo(() => {
    if (!helpers || !catalog || !lockedTier || !lockedVariant) return null;
    if (filledCount !== slotCount) return null;
    try {
      return computeTradeUp({
        inputs: filled,
        skinsById: helpers.skinsById,
        ctx: helpers.ctx,
        variant: lockedVariant,
        prices: catalog.prices,
        priceSource,
      });
    } catch (err) {
      console.error("computeTradeUp failed:", err);
      return {
        ok: false as const,
        error:
          "Could not calculate this contract. Please remove and re-add a skin.",
      };
    }
  }, [
    helpers,
    catalog,
    lockedTier,
    lockedVariant,
    filled,
    filledCount,
    slotCount,
    priceSource,
  ]);

  const clearContract = useCallback(() => {
    setSlots(emptySlots(slotCount));
    setLockedTier(null);
    setLockedVariant(null);
  }, [slotCount]);

  const lockFromFirst = useCallback((tier: TradeUpTier, variant: TradeUpVariant) => {
    setLockedTier(tier);
    setLockedVariant(variant);
  }, []);

  const addSandboxSkin = useCallback((skin: TradeUpCatalogSkin, variant: TradeUpVariant) => {
    if (!catalog) return;
    if (lockedTier && skin.rarityTier !== lockedTier) return;
    if (lockedVariant && variant !== lockedVariant) return;

    const tier = skin.rarityTier;
    const n = contractSlotCount(tier);
    if (!lockedTier) lockFromFirst(tier, variant);

    setSlots((prev) => {
      const targetCount = lockedTier ? slotCount : n;
      const working = resizeSlots(prev, targetCount);
      const idx = pickEmptySlotIndex(working, activeSlotIndex);
      if (idx < 0) return working;
      const floatValue = defaultFloatForSkin(skin);
      const cost = defaultCostForSkin(
        skin,
        variant,
        floatValue,
        catalog.prices,
        priceSource,
      );
      const next = [...working];
      next[idx] = {
        key: `sandbox-${skin.id}-${idx}-${Date.now()}`,
        skinId: skin.id,
        floatValue,
        cost,
        image: skin.image,
        displayName:
          variant === "stattrak" ? `StatTrak™ ${skin.name}` : skin.name,
        marketHashName:
          variant === "stattrak"
            ? `StatTrak™ ${skin.baseName} (Field-Tested)`
            : `${skin.baseName} (Field-Tested)`,
      };
      return next;
    });
    setActiveSlotIndex(null);
    if (remainingSlots <= 1) setPickerOpen(false);
  }, [
    catalog,
    lockedTier,
    lockedVariant,
    lockFromFirst,
    slotCount,
    activeSlotIndex,
    remainingSlots,
    priceSource,
  ]);

  const toggleInventoryItem = useCallback((item: InventoryItemRow) => {
    if (!helpers || !catalog) return;
    const el = inventoryItemEligibility(
      item,
      helpers.index,
      helpers.ctx.cratesById,
    );
    if (!el.ok || !el.skin || !el.tier) return;

    if (selectedInventoryKeys.has(item.assetId)) {
      setSlots((prev) => {
        const next = prev.map((s) => (s?.key === item.assetId ? null : s));
        if (next.every((s) => s == null)) {
          setLockedTier(null);
          setLockedVariant(null);
        }
        return next;
      });
      return;
    }

    if (lockedTier && el.tier !== lockedTier) return;
    if (lockedVariant && el.variant !== lockedVariant) return;
    if (!lockedTier) lockFromFirst(el.tier, el.variant);

    setSlots((prev) => {
      const n = contractSlotCount(el.tier!);
      const working =
        !lockedTier && prev.length !== n ? resizeSlots(prev, n) : prev;
      const idx = pickEmptySlotIndex(working, activeSlotIndex);
      if (idx < 0) return working;
      const next = [...working];
      const { floatValue } = inventoryFloatForTradeUp(item, el.skin!);
      next[idx] = {
        key: item.assetId,
        skinId: el.skin!.id,
        floatValue,
        cost: inventoryCost(item, priceSource),
        marketHashName: item.marketHashName,
        image: steamIcon(item.iconUrl),
        displayName: item.marketHashName,
      };
      return next;
    });
    setActiveSlotIndex(null);
  }, [
    helpers,
    catalog,
    selectedInventoryKeys,
    lockedTier,
    lockedVariant,
    lockFromFirst,
    activeSlotIndex,
    priceSource,
  ]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setActiveSlotIndex(null);
  }, []);

  const onRemoveSlot = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      if (next.every((s) => s == null)) {
        setLockedTier(null);
        setLockedVariant(null);
      }
      return next;
    });
  }, []);

  const onFloatChange = useCallback(
    (index: number, floatValue: number) => {
      setSlots((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (!cur || !helpers) return prev;
        const skin = helpers.skinsById.get(cur.skinId);
        const clamped = skin
          ? Math.min(skin.maxFloat, Math.max(skin.minFloat, floatValue))
          : floatValue;
        next[index] = { ...cur, floatValue: clamped };
        return next;
      });
    },
    [helpers],
  );

  const onCostChange = useCallback((index: number, cost: number) => {
    setSlots((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      next[index] = { ...cur, cost };
      return next;
    });
  }, []);

  const onPickSlot = useCallback((index: number) => {
    setActiveSlotIndex(index);
    setPickerOpen(true);
  }, []);

  const onOpenPicker = useCallback(() => {
    setActiveSlotIndex(null);
    setPickerOpen(true);
  }, []);

  async function loadProfileFromInput() {
    const input = profileInput.trim();
    if (!input) return;
    setInventoryError(null);
    setInventoryLoading(true);
    try {
      const createRes = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const createData = parseCreateProfileResponse(await createRes.json());
      if (!createRes.ok || !createData.profile) {
        throw new Error(createData.error ?? "Failed to resolve profile");
      }
      const id = readString(createData.profile.id);
      if (!id) {
        throw new Error("Failed to resolve profile");
      }
      const remembered = parseRecentProfileEntry(createData.profile);
      if (remembered) {
        rememberRecentProfile(remembered);
      }
      // Allow the profile effect to auto-sync if this profile has no items yet.
      autoSyncedRef.current.delete(id);
      setMode("inventory");
      setProfileId(id);
      router.replace(`/tradeup?profileId=${id}`);
      await refreshProfileList();
      setProfileInput("");
    } catch (err) {
      setInventoryError(
        err instanceof Error ? err.message : "Failed to load profile",
      );
    } finally {
      setInventoryLoading(false);
    }
  }

  async function onSyncClick() {
    if (!profileId) return;
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const syncResult = await syncInventory(profileId);
      const items = await fetchInventory(profileId);
      setInventory(items);
      await refreshProfileList();
      const warningNote = tradeUpSyncNote(syncResult.warning);
      setSyncNote(
        warningNote ?? `Synced ${items.length} items.`,
      );
    } catch (err) {
      setInventoryError(
        err instanceof Error ? err.message : "Failed to sync inventory",
      );
      setSyncNote(null);
    } finally {
      setInventoryLoading(false);
    }
  }

  function onModeChange(next: Mode) {
    setMode(next);
    clearContract();
    setPickerOpen(false);
    if (next === "sandbox") {
      router.replace("/tradeup");
    } else if (profileId) {
      router.replace(`/tradeup?profileId=${profileId}`);
    }
  }

  const tierHint =
    lockedTier === "covert"
      ? "5 Covert skins → knife / gloves"
      : lockedTier
        ? `10 ${lockedTier} skins → next rarity`
        : "Pick a skin to lock rarity (10 slots, or 5 for Covert)";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-[var(--text)] sm:text-4xl"
            style={{ fontFamily: "var(--font-ui), Inter, system-ui, sans-serif" }}
          >
            Trade-up{" "}
            <span className="text-[var(--accent)]">Calculator</span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-muted)]">
            Pick items from your inventory or the catalog to see outcome odds,
            floats, and expected value.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriceSourceToggle value={priceSource} onChange={setPriceSource} />
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="et-seg">
          <button
            type="button"
            onClick={() => onModeChange("inventory")}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              mode === "inventory"
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            My Inventory
          </button>
          <button
            type="button"
            onClick={() => onModeChange("sandbox")}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              mode === "sandbox"
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Custom Sandbox
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">{tierHint}</p>
        {filledCount > 0 ? (
          <button
            type="button"
            onClick={clearContract}
            className="et-card px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)] sm:ml-auto"
          >
            Clear contract
          </button>
        ) : null}
      </div>

      {mode === "inventory" ? (
        <div className="et-card flex flex-col gap-3 p-4">
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Profile
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <select
              value={profileId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                setProfileId(id);
                clearContract();
                if (id) router.replace(`/tradeup?profileId=${id}`);
                else router.replace("/tradeup");
              }}
              className="et-field w-full min-w-0 flex-1 px-3 py-2 text-sm text-[var(--text)] sm:min-w-[14rem]"
            >
              <option value="">Select a synced profile…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.personaName ?? p.steamId} ({p.itemCount} items)
                </option>
              ))}
            </select>
            <div className="et-command min-w-0 flex-1 sm:min-w-[12rem]">
              <input
                type="text"
                value={profileInput}
                onChange={(e) => setProfileInput(e.target.value)}
                placeholder="Or Steam URL / SteamID64"
                className="et-command-input"
              />
              <button
                type="button"
                onClick={() => void loadProfileFromInput()}
                disabled={inventoryLoading || !profileInput.trim()}
                className="et-command-submit"
              >
                Load
              </button>
            </div>
            <button
              type="button"
              onClick={() => void onSyncClick()}
              disabled={!profileId || inventoryLoading}
              className="et-card px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
            >
              Sync
            </button>
          </div>
          {inventoryLoading || syncNote ? (
            <p className="text-sm text-[var(--steam)]">
              {syncNote ?? "Loading inventory…"}
            </p>
          ) : null}
          {inventoryError ? (
            <p className="text-sm text-[var(--danger)]">{inventoryError}</p>
          ) : null}
          {profileId && !inventoryLoading && !inventoryError ? (
            <p className="text-xs text-[var(--text-muted)]">
              {inventory.length} item{inventory.length === 1 ? "" : "s"} loaded
              {inventory.length > 0
                ? ` · ${floatedInventoryCount} with real floats`
                : ""}
              {helpers
                ? ` · ${eligibleInventoryCount} eligible for trade-up`
                : ""}
              {inventory.length > 0 && eligibleInventoryCount === 0
                ? " — no trade-up-capable skins matched the catalog"
                : inventory.length > 0 &&
                    floatedInventoryCount < eligibleInventoryCount
                  ? " — missing floats use mid-wear estimates (editable)"
                  : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {catalogLoading ? (
        <p className="et-slot p-8 text-center text-[var(--text-muted)]">
          Loading trade-up catalog…
        </p>
      ) : catalogError ? (
        <p className="et-card p-4 text-[var(--danger)]">
          {catalogError}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-[var(--text)]">
                Contract ({filledCount}/{slotCount})
              </h2>
              <button
                type="button"
                onClick={onOpenPicker}
                disabled={
                  remainingSlots <= 0 ||
                  (mode === "inventory" && !profileId) ||
                  !catalog
                }
                className="et-card px-3 py-1.5 text-xs text-[var(--accent)] disabled:opacity-40"
              >
                Browse skins
              </button>
            </div>
            <TradeUpContractSlots
              slots={slots}
              currency={currency}
              skinsById={helpers?.skinsById ?? EMPTY_SKINS}
              collectionsById={helpers?.ctx.collectionsById ?? EMPTY_COLLECTIONS}
              cratesById={helpers?.ctx.cratesById ?? EMPTY_CRATES}
              onRemove={onRemoveSlot}
              onFloatChange={onFloatChange}
              onCostChange={onCostChange}
              onPickSlot={onPickSlot}
            />
          </section>

          {pickerOpen && catalog && helpers ? (
            mode === "sandbox" ? (
              <TradeUpSandboxPicker
                skins={catalog.skins}
                collectionsById={helpers.ctx.collectionsById}
                cratesById={helpers.ctx.cratesById}
                lockedTier={lockedTier}
                lockedVariant={lockedVariant}
                remainingSlots={remainingSlots}
                onPick={addSandboxSkin}
                onClose={closePicker}
              />
            ) : (
              <TradeUpInventoryPicker
                items={inventory}
                index={helpers.index}
                collectionsById={helpers.ctx.collectionsById}
                cratesById={helpers.ctx.cratesById}
                lockedTier={lockedTier}
                lockedVariant={lockedVariant}
                selectedKeys={selectedInventoryKeys}
                remainingSlots={remainingSlots}
                currency={currency}
                priceSource={priceSource}
                onToggle={toggleInventoryItem}
                onClose={closePicker}
              />
            )
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-[var(--text)]">
              Results & odds
            </h2>
            <TradeUpResultsPanel
              result={result}
              currency={currency}
              filledCount={filledCount}
              slotCount={slotCount}
              goodsIds={catalog?.goodsIds ?? {}}
            />
          </section>
        </>
      )}
    </div>
  );
}
