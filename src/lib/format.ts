import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@/lib/currency";

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

/** @deprecated Prefer formatMoney with an explicit currency */
export function formatUsd(value: number | null | undefined): string {
  return formatMoney(value, "USD");
}

export function formatFloat(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "Never";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
