export const PRICE_SOURCES = ["skinport", "steam"] as const;

export type PriceSource = (typeof PRICE_SOURCES)[number];

export const DEFAULT_PRICE_SOURCE: PriceSource = "skinport";

export const PRICE_SOURCE_STORAGE_KEY = "inventory-tracker-price-source";

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  skinport: "Skinport",
  steam: "Steam Market",
};

export function isPriceSource(value: unknown): value is PriceSource {
  return value === "skinport" || value === "steam";
}

export function parsePriceSource(
  value: unknown,
  fallback: PriceSource = DEFAULT_PRICE_SOURCE,
): PriceSource {
  return isPriceSource(value) ? value : fallback;
}

export function readStoredPriceSource(): PriceSource {
  if (typeof window === "undefined") return DEFAULT_PRICE_SOURCE;
  try {
    return parsePriceSource(
      window.localStorage.getItem(PRICE_SOURCE_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_PRICE_SOURCE;
  }
}

export function writeStoredPriceSource(source: PriceSource): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRICE_SOURCE_STORAGE_KEY, source);
  } catch {
    // ignore quota / private mode
  }
}

export type PricedItem = {
  steamPrice: number | null;
  skinportPrice: number | null;
};

/** Selected market price, falling back to the other when missing. */
export function itemPrice(
  item: PricedItem,
  source: PriceSource,
): number | null {
  if (source === "skinport") {
    return item.skinportPrice ?? item.steamPrice ?? null;
  }
  return item.steamPrice ?? item.skinportPrice ?? null;
}

export function itemPriceOrZero(item: PricedItem, source: PriceSource): number {
  return itemPrice(item, source) ?? 0;
}

export function primaryTotal(
  totals: { totalSteam: number; totalSkinport: number },
  source: PriceSource,
): number {
  return source === "skinport" ? totals.totalSkinport : totals.totalSteam;
}

/** Portfolio total using the same per-item fallback rules as the grid. */
export function portfolioTotalFromItems(
  items: PricedItem[],
  source: PriceSource,
): number {
  return items.reduce((sum, item) => sum + itemPriceOrZero(item, source), 0);
}

export function priceSourceAccent(source: PriceSource): string {
  return source === "skinport" ? "var(--skinport)" : "var(--steam)";
}
