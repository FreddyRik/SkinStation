import { getCatalogMaps } from "@/lib/cs-catalog/catalog";
import type { CatalogItemDetail } from "@/lib/cs-catalog/types";
import { isGloveCategory, isKnifeCategory } from "@/lib/cs-catalog/flags";
import {
  getCsgoTraderBuffCatalog,
  getCsgoTraderSteamCatalog,
} from "@/lib/steam-market/csgotrader";
import {
  buffGoodsIdFor,
  getBuffGoodsIdMap,
} from "@/lib/buff/goods-ids";
import type { Currency } from "@/lib/currency";
import { rarityToTier, type TradeUpTier } from "@/lib/tradeup/rarity";
import { resolveSkinPhase } from "@/lib/cs-catalog/phase";
import type {
  TradeUpCatalogPayload,
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpPriceEntry,
} from "@/lib/tradeup/types";
import {
  skinMarketHashName,
  wearBandForName,
  wearRangeForSkin,
} from "@/lib/cs-catalog/wears";

function wearNamesFromDetail(detail: CatalogItemDetail): string[] {
  if (detail.wears.length > 0) return detail.wears.map((w) => w.name);
  return [
    "Factory New",
    "Minimal Wear",
    "Field-Tested",
    "Well-Worn",
    "Battle-Scarred",
  ];
}

function mapSkin(detail: CatalogItemDetail): TradeUpCatalogSkin | null {
  if (detail.kind !== "skin") return null;
  const tier = rarityToTier(detail.rarity);
  if (!tier) return null;
  const minFloat = detail.minFloat;
  const maxFloat = detail.maxFloat;
  if (
    minFloat == null ||
    maxFloat == null ||
    !Number.isFinite(minFloat) ||
    !Number.isFinite(maxFloat)
  ) {
    return null;
  }

  return {
    id: detail.id,
    name: detail.name,
    image: detail.image,
    rarityTier: tier,
    rarityId: detail.rarity?.id ?? null,
    rarityName: detail.rarity?.name ?? null,
    rarityColor: detail.rarity?.color ?? null,
    minFloat,
    maxFloat,
    wearNames: wearNamesFromDetail(detail),
    collectionIds: detail.collections.map((c) => c.id),
    crateIds: detail.crates.map((c) => c.id),
    isKnife: detail.isKnife,
    isGlove: detail.isGlove,
    stattrak: detail.stattrak,
    paintIndex: detail.paintIndex,
    baseName: detail.name,
    phase: resolveSkinPhase({
      phase: detail.phase,
      paintIndex: detail.paintIndex,
      patternId: detail.patternId,
    }),
  };
}

function collectPriceHashes(
  skins: TradeUpCatalogSkin[],
  crates: TradeUpCrateRow[],
  skinsById: Map<string, TradeUpCatalogSkin>,
): string[] {
  const hashes = new Set<string>();

  function addSkinHashes(skin: TradeUpCatalogSkin) {
    const variants: Array<"normal" | "stattrak"> =
      skin.stattrak && !skin.isGlove ? ["normal", "stattrak"] : ["normal"];
    for (const variant of variants) {
      for (const wearName of skin.wearNames) {
        const band = wearBandForName(wearName);
        if (!band) continue;
        if (!wearRangeForSkin(band, skin.minFloat, skin.maxFloat)) continue;
        hashes.add(skinMarketHashName(skin.baseName, wearName, variant));
      }
    }
  }

  for (const skin of skins) {
    if (skin.isKnife || skin.isGlove) continue;
    if (skin.rarityTier === "extraordinary") continue;
    addSkinHashes(skin);
  }

  for (const crate of crates) {
    for (const rare of crate.containsRare) {
      const skin = skinsById.get(rare.id);
      if (skin) addSkinHashes(skin);
    }
  }

  return [...hashes];
}

/** Build a slim trade-up catalog payload with prices in the given currency. */
export async function buildTradeUpCatalogPayload(
  currency: Currency = "USD",
): Promise<TradeUpCatalogPayload> {
  const maps = await getCatalogMaps();
  const skins: TradeUpCatalogSkin[] = [];
  const skinsById = new Map<string, TradeUpCatalogSkin>();

  for (const detail of maps.byId.values()) {
    if (detail.kind !== "skin") continue;
    const mapped = mapSkin(detail);
    if (!mapped) continue;
    skins.push(mapped);
    skinsById.set(mapped.id, mapped);
  }

  const collections: TradeUpCollectionRow[] = [];
  for (const detail of maps.collectionsById.values()) {
    const slim = maps.collections.find((c) => c.id === detail.id);
    if (slim && !slim.isSkinCollection) continue;
    collections.push({
      id: detail.id,
      name: detail.name,
      contains: detail.contains.map((c) => ({
        id: c.id,
        rarityTier: (rarityToTier(c.rarity) as TradeUpTier | null) ?? null,
      })),
    });
  }

  const crates: TradeUpCrateRow[] = [];
  for (const detail of maps.byId.values()) {
    if (detail.kind !== "crate") continue;
    if (detail.containsRare.length === 0) continue;

    const containsRare = detail.containsRare.map((r) => {
      const skin = skinsById.get(r.id);
      let isKnife = skin?.isKnife ?? false;
      let isGlove = skin?.isGlove ?? false;
      if (!isKnife && !isGlove) {
        const fromCat = maps.byId.get(r.id);
        if (fromCat) {
          isKnife = fromCat.isKnife || isKnifeCategory(fromCat.weaponCategoryId);
          isGlove = fromCat.isGlove || isGloveCategory(fromCat.weaponCategoryId);
        }
      }
      if (!isKnife && !isGlove) {
        isGlove = /gloves|wraps/i.test(r.name);
        isKnife = !isGlove;
      }
      return {
        id: r.id,
        name: r.name,
        image: r.image ?? skin?.image ?? null,
        isKnife,
        isGlove,
      };
    });

    crates.push({
      id: detail.id,
      name: detail.name,
      image: detail.image,
      containsRare,
    });
  }

  // Ensure rare specials are present with float bounds for outcome math.
  for (const crate of crates) {
    for (const rare of crate.containsRare) {
      if (skinsById.has(rare.id)) {
        const existing = skinsById.get(rare.id)!;
        if (rare.isKnife) existing.isKnife = true;
        if (rare.isGlove) existing.isGlove = true;
        existing.rarityTier = "extraordinary";
        continue;
      }
      const detail = maps.byId.get(rare.id);
      if (!detail) continue;
      const mapped = mapSkin(detail);
      if (!mapped) continue;
      mapped.isKnife = rare.isKnife;
      mapped.isGlove = rare.isGlove;
      mapped.rarityTier = "extraordinary";
      skins.push(mapped);
      skinsById.set(mapped.id, mapped);
    }
  }

  let steam = new Map<string, number>();
  let buff = new Map<string, number>();
  try {
    steam = await getCsgoTraderSteamCatalog(currency);
  } catch (err) {
    console.warn("Trade-up steam prices unavailable:", err);
  }
  try {
    buff = await getCsgoTraderBuffCatalog(currency);
  } catch (err) {
    console.warn("Trade-up buff prices unavailable:", err);
  }

  const hashes = collectPriceHashes(skins, crates, skinsById);
  const prices: Record<string, TradeUpPriceEntry> = {};
  for (const hash of hashes) {
    const s = steam.get(hash);
    const b = buff.get(hash);
    if (s == null && b == null) continue;
    prices[hash] = {
      steam: typeof s === "number" ? s : null,
      buff: typeof b === "number" ? b : null,
    };
  }

  const goodsIds: Record<string, number> = {};
  try {
    const goodsMap = await getBuffGoodsIdMap();
    for (const hash of hashes) {
      const id = buffGoodsIdFor(goodsMap, hash);
      if (id != null && id > 0) goodsIds[hash] = id;
    }
  } catch (err) {
    console.warn("Trade-up Buff goods ids unavailable:", err);
  }

  return {
    skins,
    collections,
    crates,
    prices,
    goodsIds,
    currency,
  };
}
