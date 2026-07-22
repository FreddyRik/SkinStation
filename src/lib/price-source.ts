import { itemCanListOnMarket } from "@/lib/item-flags";

export const PRICE_SOURCES = ["buff", "steam"] as const;

export type PriceSource = (typeof PRICE_SOURCES)[number];

export const DEFAULT_PRICE_SOURCE: PriceSource = "buff";

export const PRICE_SOURCE_STORAGE_KEY = "inventory-tracker-price-source";

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  buff: "Buff163",
  steam: "Steam Market",
};

export function isPriceSource(value: unknown): value is PriceSource {
  return value === "buff" || value === "steam";
}

export function parsePriceSource(
  value: unknown,
  fallback: PriceSource = DEFAULT_PRICE_SOURCE,
): PriceSource {
  // Legacy Skinport preference → Buff
  if (value === "skinport") return "buff";
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
  buffPrice: number | null;
  /** Steam Community Market listable flag when known. */
  marketable?: boolean | null;
  type?: string | null;
  marketHashName?: string | null;
  name?: string | null;
};

/** Selected market price, falling back to the other when missing. */
export function itemPrice(
  item: PricedItem,
  source: PriceSource,
): number | null {
  if (!itemCanListOnMarket(item)) return null;
  if (source === "buff") {
    return item.buffPrice ?? item.steamPrice ?? null;
  }
  return item.steamPrice ?? item.buffPrice ?? null;
}

export function itemPriceOrZero(item: PricedItem, source: PriceSource): number {
  return itemPrice(item, source) ?? 0;
}

export function primaryTotal(
  totals: { totalSteam: number; totalBuff: number },
  source: PriceSource,
): number {
  return source === "buff" ? totals.totalBuff : totals.totalSteam;
}

/** Portfolio total using the same per-item fallback rules as the grid. */
export function portfolioTotalFromItems(
  items: PricedItem[],
  source: PriceSource,
): number {
  return items.reduce((sum, item) => sum + itemPriceOrZero(item, source), 0);
}

export function priceSourceAccent(source: PriceSource): string {
  return source === "buff" ? "var(--buff)" : "var(--steam)";
}
