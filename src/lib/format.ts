import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { convertMoney } from "@/lib/fx";

const LOCALE_FOR_CURRENCY: Record<Currency, string> = {
  USD: "en-US",
  EUR: "de-DE",
};

export function formatMoney(
  value: number | null | undefined,
  currency: Currency = DEFAULT_CURRENCY,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(LOCALE_FOR_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

/** Format a value stored in `from` currency as `to` currency using FX. */
export function formatMoneyConverted(
  value: number | null | undefined,
  from: Currency,
  to: Currency,
  usdToEur: number,
): string {
  return formatMoney(convertMoney(value, from, to, usdToEur), to);
}

/** @deprecated Prefer formatMoney with an explicit currency */
export function formatUsd(value: number | null | undefined): string {
  return formatMoney(value, "USD");
}

/** Coerce API/DB values to a finite float, or null. */
export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatFloat(value: number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n == null) return "—";
  return n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "Never";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d);
}

/** Catalog first-sale / release date (date only, UTC). */
export function formatSaleDate(value: string | null | undefined): string {
  if (!value) return "—";
  const normalized = value.replace(/\//g, "-");
  const d = new Date(normalized);
  if (!Number.isFinite(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}
