"use client";

import {
  PRICE_SOURCES,
  PRICE_SOURCE_LABELS,
  type PriceSource,
  writeStoredPriceSource,
} from "@/lib/price-source";

export function PriceSourceToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: PriceSource;
  onChange: (source: PriceSource) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-0.5"
      role="group"
      aria-label="Price source"
    >
      {PRICE_SOURCES.map((source) => {
        const active = value === source;
        return (
          <button
            key={source}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={PRICE_SOURCE_LABELS[source]}
            onClick={() => {
              writeStoredPriceSource(source);
              onChange(source);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition disabled:opacity-50 ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {source === "buff" ? "Buff" : "Steam"}
          </button>
        );
      })}
    </div>
  );
}
