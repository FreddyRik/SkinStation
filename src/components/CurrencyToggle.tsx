"use client";

import {
  CURRENCIES,
  CURRENCY_LABELS,
  type Currency,
  writeStoredCurrency,
} from "@/lib/currency";

export function CurrencyToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-0.5"
      role="group"
      aria-label="Currency"
    >
      {CURRENCIES.map((currency) => {
        const active = value === currency;
        return (
          <button
            key={currency}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={CURRENCY_LABELS[currency]}
            onClick={() => {
              writeStoredCurrency(currency);
              onChange(currency);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition disabled:opacity-50 ${
              active
                ? "bg-[var(--accent)] text-[#042f2e]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {currency}
          </button>
        );
      })}
    </div>
  );
}
