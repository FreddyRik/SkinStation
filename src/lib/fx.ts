import type { Currency } from "@/lib/currency";
import { fxResponseSchema } from "@/lib/api/schemas";

const FX_TTL_MS = 24 * 60 * 60 * 1000;
export const FALLBACK_USD_TO_EUR = 0.92;

const MIN_USD_TO_EUR = 0.5;
const MAX_USD_TO_EUR = 2;

/** Accept only a plausible USD→EUR mid-market rate. */
export function parseUsdToEurRate(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= MIN_USD_TO_EUR || value >= MAX_USD_TO_EUR) return null;
  return value;
}

export function usdToEurFromUnknown(data: unknown): number | null {
  const parsed = fxResponseSchema.safeParse(data);
  return parsed.success ? parsed.data.usdToEur : null;
}

function frankfurterUsdToEur(data: unknown): number | null {
  if (!data || typeof data !== "object" || !("rates" in data)) return null;
  const rates = data.rates;
  if (!rates || typeof rates !== "object" || !("EUR" in rates)) return null;
  return parseUsdToEurRate(rates.EUR);
}

let fxRateCache: { rate: number; fetchedAt: number } | null = null;
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
      const data: unknown = await res.json();
      const rate = frankfurterUsdToEur(data);
      if (rate != null) {
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
  const parsedRate = parseUsdToEurRate(usdToEur);
  const rate = parsedRate ?? FALLBACK_USD_TO_EUR;
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
