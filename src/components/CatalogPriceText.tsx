"use client";

import { useEffect, useState } from "react";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";

/** Compact Steam-colored price / range for catalog cards & contains grids. */
export function CatalogPriceText({
  minUsd,
  maxUsd,
  className = "font-data text-xs font-semibold text-[var(--steam)]",
}: {
  minUsd: number | null;
  maxUsd?: number | null;
  className?: string;
}) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [usdToEur, setUsdToEur] = useState(0.92);

  useEffect(() => {
    setCurrency(readStoredCurrency());
    function onCurrency(e: Event) {
      const next = (e as CustomEvent<Currency>).detail;
      if (next) setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fx");
        if (!res.ok) return;
        const data = (await res.json()) as { usdToEur?: number };
        if (!cancelled && typeof data.usdToEur === "number") {
          setUsdToEur(data.usdToEur);
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (minUsd == null && maxUsd == null) return null;
  const lo = convertMoney(minUsd ?? maxUsd, "USD", currency, usdToEur);
  const hi = convertMoney(maxUsd ?? minUsd, "USD", currency, usdToEur);
  if (lo == null && hi == null) return null;
  const label =
    lo != null && hi != null && Math.abs(lo - hi) >= 0.005
      ? `${formatMoney(lo, currency)} - ${formatMoney(hi, currency)}`
      : formatMoney(lo ?? hi, currency);

  return <p className={className}>{label}</p>;
}
