import type { Currency } from "@/lib/currency";
import { fxResponseSchema } from "@/lib/api/schemas";

export const FALLBACK_USD_TO_EUR = 0.92;

const MIN_USD_TO_EUR = 0.5;
const MAX_USD_TO_EUR = 2;

let fxRateCache: { rate: number; fetchedAt: number } | null = null;

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

export function rememberUsdToEurRate(rate: number): void {
  const parsed = parseUsdToEurRate(rate);
  if (parsed == null) return;
  fxRateCache = { rate: parsed, fetchedAt: Date.now() };
}

export function getCachedUsdToEurRate(): number {
  return fxRateCache?.rate ?? FALLBACK_USD_TO_EUR;
}

export function getMemoryUsdToEurRate(): {
  rate: number;
  fetchedAt: number;
} | null {
  return fxRateCache;
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
