"use client";

import {
  SHARE_CARD_THEMES,
  SHARE_CARD_THEME_LABELS,
  type ShareCardTheme,
  writeStoredShareCardTheme,
} from "@/lib/share-card-theme";

export function ShareCardThemeToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: ShareCardTheme;
  onChange: (theme: ShareCardTheme) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="et-seg flex-wrap"
      role="group"
      aria-label="Share card theme"
    >
      {SHARE_CARD_THEMES.map((theme) => {
        const active = value === theme;
        return (
          <button
            key={theme}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={SHARE_CARD_THEME_LABELS[theme]}
            onClick={() => {
              writeStoredShareCardTheme(theme);
              onChange(theme);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition disabled:opacity-50 ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {SHARE_CARD_THEME_LABELS[theme]}
          </button>
        );
      })}
    </div>
  );
}
