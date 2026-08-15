"use client";

import type { SegmentedControlProps } from "@/types/ui";

/**
 * Sliding-indicator toggle shared by currency, price source, view mode and
 * variant pickers. Equal-width columns let the thumb be positioned with a
 * simple percentage translate rather than measuring each item.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  ariaLabel,
  className = "",
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";
  const text = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`relative inline-grid rounded-xl border border-[var(--border)] bg-[var(--bg)]/55 p-0.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0.5 overflow-hidden rounded-[10px]"
      >
        <span
          className="nav-indicator absolute top-0 left-0 h-full rounded-lg bg-[var(--accent)] shadow-[0_0_16px_-2px_color-mix(in_srgb,var(--accent)_50%,transparent)]"
          style={{
            width: `${100 / options.length}%`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
      </span>

      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={option.title ?? option.label}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex flex-col items-center justify-center rounded-lg font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-50 ${pad} ${text} ${
              active
                ? "text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {option.code ? (
              <span
                className={`font-mono text-[9px] leading-none tracking-[0.18em] ${
                  active ? "opacity-70" : "opacity-60"
                }`}
              >
                {option.code}
              </span>
            ) : null}
            <span className={option.code ? "mt-0.5 leading-none" : "leading-none"}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
