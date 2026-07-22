"use client";

import { useEffect, useState } from "react";

const CLIENT_FALLBACK = 0.92;

/**
 * Loads the USD→EUR rate once (via /api/fx) for instant currency display conversion.
 */
export function useUsdToEurRate(): number {
  const [rate, setRate] = useState(CLIENT_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/fx")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { usdToEur?: number } | null) => {
        if (cancelled) return;
        if (typeof data?.usdToEur === "number" && data.usdToEur > 0) {
          setRate(data.usdToEur);
        }
      })
      .catch(() => {
        if (!cancelled) setRate(CLIENT_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}
