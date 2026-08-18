export const CATALOG_SORTS = ["rarity", "price_desc", "price_asc"] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];
