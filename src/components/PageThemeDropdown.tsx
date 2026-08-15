"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PAGE_THEMES,
  PAGE_THEME_LABELS,
  PAGE_THEME_STYLES,
  type PageTheme,
  writeStoredPageTheme,
} from "@/lib/page-theme";

type MenuPosition = {
  top: number;
  left: number;
  openUp: boolean;
};

export function PageThemeDropdown({
  value,
  onChange,
  disabled = false,
  /** Full-width chip row for mobile drawers — avoids clipped popovers. */
  variant = "dropdown",
}: {
  value: PageTheme;
  onChange: (theme: PageTheme) => void;
  disabled?: boolean;
  variant?: "dropdown" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonId = useId();
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || variant !== "dropdown") return;

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = 168;
      const estimatedHeight = 12 + PAGE_THEMES.length * 36;
      const gutter = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gutter;
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      const left = Math.min(
        Math.max(gutter, rect.right - menuWidth),
        window.innerWidth - menuWidth - gutter,
      );
      const top = openUp
        ? Math.max(gutter, rect.top - estimatedHeight - 8)
        : rect.bottom + 8;
      setMenuPos({ top, left, openUp });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, variant]);

  useEffect(() => {
    if (!open || variant !== "dropdown") return;

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (!listRef.current) return;
      const items = Array.from(
        listRef.current.querySelectorAll<HTMLButtonElement>(
          '[role="menuitemradio"]',
        ),
      );
      if (items.length === 0) return;
      const currentIndex = items.findIndex(
        (el) => el === document.activeElement,
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[(currentIndex + 1 + items.length) % items.length];
        next?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev =
          items[(currentIndex - 1 + items.length) % items.length];
        prev?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    }

    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, variant]);

  useEffect(() => {
    if (!open || variant !== "dropdown") return;
    const first =
      listRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitemradio"][aria-checked="true"]',
      ) ??
      listRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitemradio"]',
      );
    first?.focus();
  }, [open, variant, menuPos]);

  function selectTheme(theme: PageTheme) {
    writeStoredPageTheme(theme);
    onChange(theme);
    setOpen(false);
  }

  if (variant === "inline") {
    return (
      <div className="w-full space-y-2" role="group" aria-label="Theme">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Theme
        </p>
        <div className="flex flex-wrap gap-2">
          {PAGE_THEMES.map((theme) => {
            const active = value === theme;
            const swatches = PAGE_THEME_STYLES[theme].swatches;
            return (
              <button
                key={theme}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => selectTheme(theme)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold tracking-wide transition disabled:opacity-50 ${
                  active
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden>
                  {swatches.map((color) => (
                    <span
                      key={color}
                      className="h-2 w-2 rounded-full"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                {PAGE_THEME_LABELS[theme]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const menu =
    mounted && open && menuPos
      ? createPortal(
          <ul
            ref={listRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            className="fixed z-[120] min-w-[10.5rem] overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-[var(--bg-panel)]/85 py-1.5 shadow-xl shadow-black/50 backdrop-blur-xl"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {PAGE_THEMES.map((theme) => {
              const active = value === theme;
              const swatches = PAGE_THEME_STYLES[theme].swatches;
              return (
                <li key={theme} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => selectTheme(theme)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold tracking-wide transition disabled:opacity-50 ${
                      active
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden>
                      {swatches.map((color) => (
                        <span
                          key={color}
                          className="h-2 w-2 rounded-full"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    {PAGE_THEME_LABELS[theme]}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={`Theme: ${PAGE_THEME_LABELS[value]}`}
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]/60 transition hover:border-[var(--accent)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-50"
      >
        <span className="sr-only">{`Theme: ${PAGE_THEME_LABELS[value]}`}</span>
        <span
          className="h-5 w-5 rounded-full shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
          style={{
            background: `conic-gradient(from 210deg, ${PAGE_THEME_STYLES[value].swatches[0]}, ${PAGE_THEME_STYLES[value].swatches[1]}, ${PAGE_THEME_STYLES[value].swatches[2]}, ${PAGE_THEME_STYLES[value].swatches[0]})`,
          }}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
