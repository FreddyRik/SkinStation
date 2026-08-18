import { CATALOG_SORTS, type CatalogSort } from "@/types/catalog";
import type { CatalogRarity } from "@/lib/cs-catalog/types";
import { sortByRarityDesc } from "@/lib/cs-catalog/rarity-order";

export { CATALOG_SORTS, type CatalogSort };

export const DEFAULT_CATALOG_SORT: CatalogSort = "rarity";

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  rarity: "Sort by rarity",
  price_desc: "Price: High to Low",
  price_asc: "Price: Low to High",
};

export type CatalogPricedItem = {
  name: string;
  rarity?: CatalogRarity | null;
  priceMinUsd?: number | null;
  priceMaxUsd?: number | null;
  stattrakPriceMinUsd?: number | null;
};

export function isCatalogSort(value: unknown): value is CatalogSort {
  return (
    typeof value === "string" &&
    (CATALOG_SORTS as readonly string[]).includes(value)
  );
}

export function parseCatalogSort(
  value: unknown,
  fallback: CatalogSort = DEFAULT_CATALOG_SORT,
): CatalogSort {
  return isCatalogSort(value) ? value : fallback;
}

/** Floor Steam USD used for catalog sort (normal min, else StatTrak min). */
export function catalogItemSortPrice(item: CatalogPricedItem): number | null {
  const min = item.priceMinUsd;
  if (typeof min === "number" && Number.isFinite(min)) return min;
  const st = item.stattrakPriceMinUsd;
  if (typeof st === "number" && Number.isFinite(st)) return st;
  return null;
}

/**
 * Sort weapons/skins for database grids.
 * Unpriced rows always sink to the end when sorting by price.
 */
export function sortCatalogItems<T extends CatalogPricedItem>(
  items: T[],
  sort: CatalogSort,
): T[] {
  if (sort === "rarity") return sortByRarityDesc(items);

  const dir = sort === "price_desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const pa = catalogItemSortPrice(a);
    const pb = catalogItemSortPrice(b);
    if (pa == null && pb == null) {
      return a.name.localeCompare(b.name, "en");
    }
    if (pa == null) return 1;
    if (pb == null) return -1;
    const diff = (pa - pb) * dir;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "en");
  });
}
