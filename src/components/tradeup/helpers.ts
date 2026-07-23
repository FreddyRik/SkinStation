import { skinMarketHashName, wearBandForName, wearRangeForSkin } from "@/lib/cs-catalog/wears";
import { toFiniteNumber } from "@/lib/format";
import { itemPrice, type PriceSource } from "@/lib/price-source";
import {
  contractSlotCount,
  detectMarketVariant,
  extractWearName,
  isTradeUpInputTier,
  normalizeBaseSkinName,
  rarityNameToTier,
  type TradeUpTier,
} from "@/lib/tradeup/rarity";
import { pickPrice, wearBandForFloat } from "@/lib/tradeup/math";
import type { TradeUpPoolContext } from "@/lib/tradeup/outcomes";
import { buildSkinIndex } from "@/lib/tradeup/resolve";
import type {
  TradeUpCatalogPayload,
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpVariant,
} from "@/lib/tradeup/types";

export function buildPoolContext(
  payload: TradeUpCatalogPayload,
): TradeUpPoolContext {
  return {
    skinsById: new Map(payload.skins.map((s) => [s.id, s])),
    collectionsById: new Map(payload.collections.map((c) => [c.id, c])),
    cratesById: new Map(payload.crates.map((c) => [c.id, c])),
  };
}

/** Collection names for regular trade-ups; case names for Covert → rare. */
export function skinGroupLabels(
  skin: TradeUpCatalogSkin,
  collectionsById: Map<string, TradeUpCollectionRow>,
  cratesById: Map<string, TradeUpCrateRow>,
): string[] {
  if (skin.rarityTier === "covert") {
    const cases = skin.crateIds
      .map((id) => cratesById.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (cases.length > 0) return [...new Set(cases)];
  }
  const collections = skin.collectionIds
    .map((id) => collectionsById.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  return [...new Set(collections)];
}

export function skinGroupLabel(
  skin: TradeUpCatalogSkin,
  collectionsById: Map<string, TradeUpCollectionRow>,
  cratesById: Map<string, TradeUpCrateRow>,
): string {
  const groups = skinGroupLabels(skin, collectionsById, cratesById);
  if (groups.length > 0) return groups.join(" · ");
  return skin.rarityTier === "covert" ? "Unknown case" : "Unknown collection";
}

export function catalogHelpers(payload: TradeUpCatalogPayload) {
  const index = buildSkinIndex(payload.skins);
  const ctx = buildPoolContext(payload);
  return { index, ctx, skinsById: ctx.skinsById };
}

export function defaultFloatForSkin(skin: TradeUpCatalogSkin): number {
  return skin.minFloat + (skin.maxFloat - skin.minFloat) * 0.25;
}

/**
 * Float to use for a trade-up inventory input.
 * Prefer the real inspected float; otherwise mid-point of the exterior wear
 * band (clamped to the skin's paint-kit range). Example: Field-Tested → ~0.265.
 */
export function inventoryFloatForTradeUp(
  item: Pick<InventoryItemRow, "floatValue" | "exterior" | "marketHashName">,
  skin: TradeUpCatalogSkin,
): { floatValue: number; estimated: boolean } {
  const real = toFiniteNumber(item.floatValue);
  if (real != null) {
    const clamped = Math.min(
      skin.maxFloat,
      Math.max(skin.minFloat, real),
    );
    return { floatValue: clamped, estimated: false };
  }

  const wearName =
    item.exterior?.trim() ||
    extractWearName(item.marketHashName) ||
    null;
  const band = wearName ? wearBandForName(wearName) : null;
  if (band) {
    const overlap = wearRangeForSkin(band, skin.minFloat, skin.maxFloat);
    if (overlap) {
      return {
        floatValue: (overlap.min + overlap.max) / 2,
        estimated: true,
      };
    }
  }

  // No exterior tag — fall back to mid paint-kit range.
  return {
    floatValue: (skin.minFloat + skin.maxFloat) / 2,
    estimated: true,
  };
}

export function defaultCostForSkin(
  skin: TradeUpCatalogSkin,
  variant: TradeUpVariant,
  floatValue: number,
  prices: TradeUpCatalogPayload["prices"],
  priceSource: PriceSource,
): number {
  const band = wearBandForFloat(floatValue);
  const hash = skinMarketHashName(
    skin.baseName,
    band.name,
    skin.isGlove ? "normal" : variant,
  );
  return pickPrice(prices[hash], priceSource) ?? 0;
}

export type InventoryItemRow = {
  id: string;
  assetId: string;
  marketHashName: string;
  name: string;
  iconUrl: string | null;
  exterior: string | null;
  floatValue: number | null;
  paintIndex: number | null;
  steamPrice: number | null;
  buffPrice: number | null;
  rarity: string | null;
  type: string | null;
  marketable: boolean;
};

export function inventoryItemEligibility(
  item: InventoryItemRow,
  index: ReturnType<typeof buildSkinIndex>,
  cratesById: Map<string, TradeUpCrateRow>,
): {
  ok: boolean;
  skin: TradeUpCatalogSkin | null;
  tier: TradeUpTier | null;
  variant: TradeUpVariant;
  reason?: string;
} {
  const detected = detectMarketVariant(item.marketHashName);
  const variant: TradeUpVariant =
    detected.variant === "stattrak" ? "stattrak" : "normal";

  const base = normalizeBaseSkinName(item.marketHashName).toLowerCase();
  let resolved =
    index.byBaseName.get(base) ??
    (item.paintIndex != null
      ? (index.byPaintIndex.get(String(item.paintIndex)) ?? null)
      : null);

  if (!resolved) {
    const noStar = base.replace(/^[★\u2605]\s*/, "").trim();
    resolved =
      index.byBaseName.get(noStar) ??
      index.byBaseName.get(`★ ${noStar}`) ??
      null;
  }

  if (!resolved) {
    return {
      ok: false,
      skin: null,
      tier: rarityNameToTier(item.rarity),
      variant,
      reason: "Not in catalog",
    };
  }

  if (
    !isTradeUpInputTier(resolved.rarityTier) ||
    resolved.isKnife ||
    resolved.isGlove
  ) {
    return {
      ok: false,
      skin: resolved,
      tier: resolved.rarityTier,
      variant,
      reason: "Cannot trade up",
    };
  }

  if (resolved.rarityTier === "covert") {
    const hasRareCase = resolved.crateIds.some((id) => {
      const crate = cratesById.get(id);
      return Boolean(crate && crate.containsRare.length > 0);
    });
    if (!hasRareCase) {
      return {
        ok: false,
        skin: resolved,
        tier: resolved.rarityTier,
        variant,
        reason: "No knife/glove case",
      };
    }
  } else if (resolved.collectionIds.length === 0) {
    return {
      ok: false,
      skin: resolved,
      tier: resolved.rarityTier,
      variant,
      reason: "No collection",
    };
  }

  return {
    ok: true,
    skin: resolved,
    tier: resolved.rarityTier,
    variant,
  };
}

export function inventoryCost(
  item: InventoryItemRow,
  priceSource: PriceSource,
): number {
  return (
    itemPrice(
      {
        steamPrice: item.steamPrice,
        buffPrice: item.buffPrice,
        marketable: item.marketable,
        type: item.type,
        marketHashName: item.marketHashName,
        name: item.name,
      },
      priceSource,
    ) ?? 0
  );
}

export { contractSlotCount };
