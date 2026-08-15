"use client";

import type { SearchFieldProps } from "@/types/ui";

export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = "",
  autoFocus = false,
}: SearchFieldProps) {
  return (
    <div className={`group relative flex-1 ${className}`}>
      <svg
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition group-focus-within:text-[var(--accent)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 py-2 pl-9 pr-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 focus:bg-[var(--bg)]/80 focus:shadow-[0_0_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)]"
      />
    </div>
  );
}
