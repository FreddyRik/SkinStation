export const CURRENCIES = ["USD", "EUR"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export const CURRENCY_STORAGE_KEY = "inventory-tracker-currency";
export const CURRENCY_CHANGE_EVENT = "inventory-tracker:currency";
/** Broadcast while an inventory page is syncing (disables header CurrencyToggle). */
export const INVENTORY_SYNCING_EVENT = "inventory-tracker:syncing";

/** Steam Market priceoverview currency codes */
export const STEAM_CURRENCY_CODES: Record<Currency, string> = {
  USD: "1",
  EUR: "3",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
};

export function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "EUR";
}

export function parseCurrency(
  value: unknown,
  fallback: Currency = DEFAULT_CURRENCY,
): Currency {
  return isCurrency(value) ? value : fallback;
}

export function readStoredCurrency(): Currency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  try {
    return parseCurrency(window.localStorage.getItem(CURRENCY_STORAGE_KEY));
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function writeStoredCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    window.dispatchEvent(
      new CustomEvent<Currency>(CURRENCY_CHANGE_EVENT, { detail: currency }),
    );
  } catch {
    // ignore quota / private mode
  }
}
