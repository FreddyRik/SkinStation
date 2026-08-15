/**
 * Server-only FX refresh: Redis + Postgres KvCache + Frankfurter.
 * Do not import from client components — use `@/lib/fx` converters instead.
 */

import { fxResponseSchema } from "@/lib/api/schemas";
import { cacheGetJson, cacheSetJson } from "@/lib/cache/two-tier";
import {
  FALLBACK_USD_TO_EUR,
  getMemoryUsdToEurRate,
  parseUsdToEurRate,
  rememberUsdToEurRate,
} from "@/lib/fx";
import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "@/lib/net/circuit-breaker";
import { fetchWithTimeout, UPSTREAM_STEP_TIMEOUT_MS } from "@/lib/net/resilient-fetch";

const FX_TTL_MS = 24 * 60 * 60 * 1000;
const FX_REDIS_TTL_SEC = 60 * 60;
const FX_CACHE_KEY = "fx:usd-eur";
const FX_CIRCUIT = "frankfurter";
const fxRateSchema = fxResponseSchema.pick({ usdToEur: true });

function frankfurterUsdToEur(data: unknown): number | null {
  if (!data || typeof data !== "object" || !("rates" in data)) return null;
  const rates = data.rates;
  if (!rates || typeof rates !== "object" || !("EUR" in rates)) return null;
  return parseUsdToEurRate(rates.EUR);
}

async function readTieredRate(): Promise<{ rate: number; stale: boolean } | null> {
  const memory = getMemoryUsdToEurRate();
  if (memory && Date.now() - memory.fetchedAt < FX_REDIS_TTL_SEC * 1000) {
    return { rate: memory.rate, stale: false };
  }

  const cached = await cacheGetJson(FX_CACHE_KEY, fxRateSchema, {
    freshMs: FX_REDIS_TTL_SEC * 1000,
  });
  if (!cached) return null;
  rememberUsdToEurRate(cached.value.usdToEur);
  return { rate: cached.value.usdToEur, stale: cached.stale };
}

async function persistRate(rate: number): Promise<void> {
  rememberUsdToEurRate(rate);
  await cacheSetJson(FX_CACHE_KEY, { usdToEur: rate }, { redisTtlSec: FX_REDIS_TTL_SEC });
}

export async function getUsdToEurRate(force = false): Promise<number> {
  if (!force) {
    const cached = await readTieredRate();
    if (cached && !cached.stale) return cached.rate;
  }

  if (await isCircuitOpen(FX_CIRCUIT)) {
    const cached = await readTieredRate();
    return cached?.rate ?? getMemoryUsdToEurRate()?.rate ?? FALLBACK_USD_TO_EUR;
  }

  try {
    const res = await fetchWithTimeout(
      "https://api.frankfurter.app/latest?from=USD&to=EUR",
      { cache: "no-store" },
      UPSTREAM_STEP_TIMEOUT_MS,
    );
    if (res.ok) {
      const data: unknown = await res.json();
      const rate = frankfurterUsdToEur(data);
      if (rate != null) {
        await recordCircuitSuccess(FX_CIRCUIT);
        await persistRate(rate);
        return rate;
      }
    }
    await recordCircuitFailure(FX_CIRCUIT);
  } catch {
    await recordCircuitFailure(FX_CIRCUIT);
  }

  const stale = await readTieredRate();
  if (stale) return stale.rate;
  const memory = getMemoryUsdToEurRate();
  if (memory && Date.now() - memory.fetchedAt < FX_TTL_MS) {
    return memory.rate;
  }
  return memory?.rate ?? FALLBACK_USD_TO_EUR;
}
