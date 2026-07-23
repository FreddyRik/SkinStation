import type { TradeUpCatalogSkin, TradeUpSkinRef } from "@/lib/tradeup/types";
import { normalizeBaseSkinName } from "@/lib/tradeup/rarity";

export type TradeUpSkinIndex = {
  byId: Map<string, TradeUpCatalogSkin>;
  byBaseName: Map<string, TradeUpCatalogSkin>;
  byPaintIndex: Map<string, TradeUpCatalogSkin>;
};

export function buildSkinIndex(skins: TradeUpCatalogSkin[]): TradeUpSkinIndex {
  const byId = new Map<string, TradeUpCatalogSkin>();
  const byBaseName = new Map<string, TradeUpCatalogSkin>();
  const byPaintIndex = new Map<string, TradeUpCatalogSkin>();

  for (const skin of skins) {
    byId.set(skin.id, skin);
    const key = skin.baseName.toLowerCase();
    if (!byBaseName.has(key)) byBaseName.set(key, skin);
    if (skin.name) {
      const nameKey = skin.name.toLowerCase();
      if (!byBaseName.has(nameKey)) byBaseName.set(nameKey, skin);
    }
    if (skin.paintIndex) {
      byPaintIndex.set(String(skin.paintIndex), skin);
    }
  }

  return { byId, byBaseName, byPaintIndex };
}

export function resolveSkinById(
  index: TradeUpSkinIndex,
  skinId: string,
): TradeUpCatalogSkin | null {
  return index.byId.get(skinId) ?? null;
}

/** Match inventory / market hash to a catalog trade-up skin. */
export function resolveSkinFromMarketHash(
  index: TradeUpSkinIndex,
  marketHashName: string,
  paintIndex?: number | string | null,
): TradeUpCatalogSkin | null {
  const base = normalizeBaseSkinName(marketHashName);
  const byName = index.byBaseName.get(base.toLowerCase());
  if (byName) return byName;

  if (paintIndex != null && paintIndex !== "") {
    const byPaint = index.byPaintIndex.get(String(paintIndex));
    if (byPaint) return byPaint;
  }

  // Soft fallback: strip ★ for knives if still unmatched
  const noStar = base.replace(/^[★\u2605]\s*/, "").trim();
  if (noStar !== base) {
    const hit = index.byBaseName.get(noStar.toLowerCase());
    if (hit) return hit;
    // Also try with ★ prefix on catalog names
    const withStar = index.byBaseName.get(`★ ${noStar}`.toLowerCase());
    if (withStar) return withStar;
  }

  return null;
}

export function toSkinRef(skin: TradeUpCatalogSkin): TradeUpSkinRef {
  return {
    id: skin.id,
    name: skin.name,
    image: skin.image,
    rarityTier: skin.rarityTier,
    minFloat: skin.minFloat,
    maxFloat: skin.maxFloat,
    wearNames: skin.wearNames,
    collectionIds: skin.collectionIds,
    crateIds: skin.crateIds,
    isKnife: skin.isKnife,
    isGlove: skin.isGlove,
    stattrak: skin.stattrak,
    paintIndex: skin.paintIndex,
    baseName: skin.baseName,
    phase: skin.phase,
  };
}
