"use client";

import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";
import { useUsdToEurRate } from "@/hooks/useUsdToEurRate";

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
  const currency = useDisplayCurrency();
  const usdToEur = useUsdToEurRate();

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
