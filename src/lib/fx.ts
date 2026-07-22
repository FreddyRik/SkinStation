import type { Currency } from "@/lib/currency";

const FX_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_USD_TO_EUR = 0.92;

let fxRateCache: { rate: number; fetchedAt: number } | null = null;

/** USD → EUR mid-market rate (Frankfurter), cached ~24h in-process. */
export async function getUsdToEurRate(force = false): Promise<number> {
  if (
    !force &&
    fxRateCache &&
    Date.now() - fxRateCache.fetchedAt < FX_TTL_MS
  ) {
    return fxRateCache.rate;
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR",
      { next: { revalidate: 0 } },
    );
    if (res.ok) {
      const data = (await res.json()) as { rates?: { EUR?: number } };
      const rate = data.rates?.EUR;
      if (typeof rate === "number" && rate > 0) {
        fxRateCache = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch {
    // fall through
  }

  return fxRateCache?.rate ?? FALLBACK_USD_TO_EUR;
}

export function getCachedUsdToEurRate(): number {
  return fxRateCache?.rate ?? FALLBACK_USD_TO_EUR;
}

/**
 * Convert a money amount between USD and EUR using a USD→EUR rate.
 * Same-currency is a no-op.
 */
export function convertMoney(
  value: number | null | undefined,
  from: Currency,
  to: Currency,
  usdToEur: number = getCachedUsdToEurRate(),
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (from === to) return value;
  const rate = usdToEur > 0 ? usdToEur : FALLBACK_USD_TO_EUR;
  if (from === "USD" && to === "EUR") {
    return Number((value * rate).toFixed(2));
  }
  if (from === "EUR" && to === "USD") {
    return Number((value / rate).toFixed(2));
  }
  return value;
}

export function convertMoneyOrZero(
  value: number | null | undefined,
  from: Currency,
  to: Currency,
  usdToEur?: number,
): number {
  return convertMoney(value, from, to, usdToEur) ?? 0;
}
