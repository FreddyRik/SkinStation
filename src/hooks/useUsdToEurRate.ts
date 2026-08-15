"use client";

import { useEffect, useState } from "react";
import { jsonErrorMessage, readResponseJson } from "@/lib/api/client";
import {
  FALLBACK_USD_TO_EUR,
  usdToEurFromUnknown,
} from "@/lib/fx";

const CLIENT_TTL_MS = 10 * 60 * 1000;

let cachedRate: { rate: number; fetchedAt: number } | null = null;
let inflight: Promise<number> | null = null;

async function loadUsdToEurRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CLIENT_TTL_MS) {
    return cachedRate.rate;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/fx");
      const data = await readResponseJson(res);
      if (!res.ok) {
        throw new Error(jsonErrorMessage(data, "FX rate unavailable."));
      }
      const rate = usdToEurFromUnknown(data);
      if (rate == null) throw new Error("FX rate unavailable.");
      cachedRate = { rate, fetchedAt: Date.now() };
      return rate;
    } catch {
      return cachedRate?.rate ?? FALLBACK_USD_TO_EUR;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Loads the USD→EUR rate once (shared in-module) via /api/fx.
 * Invalid or failed upstream responses keep the last good / fallback rate.
 */
export function useUsdToEurRate(): number {
  const [rate, setRate] = useState(
    cachedRate?.rate ?? FALLBACK_USD_TO_EUR,
  );

  useEffect(() => {
    let cancelled = false;
    void loadUsdToEurRate().then((next) => {
      if (!cancelled) setRate(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}
