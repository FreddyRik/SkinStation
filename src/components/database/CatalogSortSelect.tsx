"use client";

import {
  CATALOG_SORT_LABELS,
  parseCatalogSort,
} from "@/lib/cs-catalog/sort";
import { CATALOG_SORTS } from "@/types/catalog";
import type { CatalogSortSelectProps } from "@/types/catalog-ui";

export function CatalogSortSelect({
  value,
  onChange,
  className = "",
  disabled = false,
}: CatalogSortSelectProps) {
  return (
    <select
      aria-label="Sort weapons and skins"
      value={value}
      disabled={disabled}
      onChange={(event) => {
        onChange(parseCatalogSort(event.target.value));
      }}
      className={`shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/50 disabled:opacity-50 ${className}`}
    >
      {CATALOG_SORTS.map((key) => (
        <option key={key} value={key}>
          {CATALOG_SORT_LABELS[key]}
        </option>
      ))}
    </select>
  );
}
