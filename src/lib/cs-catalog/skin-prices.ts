import type { CatalogItemDetail } from "@/lib/cs-catalog/types";
import {
  skinMarketHashName,
  wearBandForName,
  wearRangeForSkin,
  type SkinVariant,
} from "@/lib/cs-catalog/wears";

export type SkinWearPriceRow = {
  wearName: string;
  abbr: string;
  color: string;
  floatMin: number;
  floatMax: number;
  steamUsd: number | null;
  buffUsd: number | null;
  marketHashName: string;
};

export type SkinDetailPrices = {
  normal: SkinWearPriceRow[];
  stattrak: SkinWearPriceRow[];
  souvenir: SkinWearPriceRow[];
};

export type SkinPriceRange = {
  min: number;
  max: number;
};

/** Min/max Steam USD across available wears for a variant. */
export function skinVariantPriceRange(
  baseName: string,
  wearNames: string[],
  minFloat: number | null,
  maxFloat: number | null,
  variant: SkinVariant,
  prices: Map<string, number>,
): SkinPriceRange | null {
  const values: number[] = [];
  for (const wearName of wearNames) {
    const band = wearBandForName(wearName);
    if (!band) continue;
    if (!wearRangeForSkin(band, minFloat, maxFloat)) continue;
    const hash = skinMarketHashName(baseName, wearName, variant);
    const p = prices.get(hash);
    if (typeof p === "number" && Number.isFinite(p)) values.push(p);
  }
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Build price rows for a skin + catalogs (USD). Safe for server + client. */
export function buildSkinDetailPrices(
  item: CatalogItemDetail,
  steamUsd: Map<string, number>,
  buffUsd: Map<string, number>,
): SkinDetailPrices {
  function rowsFor(variant: SkinVariant): SkinWearPriceRow[] {
    if (variant === "stattrak" && !item.stattrak) return [];
    if (variant === "souvenir" && !item.souvenir) return [];
    const out: SkinWearPriceRow[] = [];
    for (const wear of item.wears) {
      const band = wearBandForName(wear.name);
      if (!band) continue;
      const range = wearRangeForSkin(band, item.minFloat, item.maxFloat);
      if (!range) continue;
      const hash = skinMarketHashName(item.name, wear.name, variant);
      out.push({
        wearName: wear.name,
        abbr: band.abbr,
        color: band.color,
        floatMin: range.min,
        floatMax: range.max,
        steamUsd: steamUsd.get(hash) ?? null,
        buffUsd: buffUsd.get(hash) ?? null,
        marketHashName: hash,
      });
    }
    return out;
  }

  return {
    normal: rowsFor("normal"),
    stattrak: rowsFor("stattrak"),
    souvenir: rowsFor("souvenir"),
  };
}
