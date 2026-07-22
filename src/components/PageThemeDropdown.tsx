"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PAGE_THEMES,
  PAGE_THEME_LABELS,
  PAGE_THEME_STYLES,
  type PageTheme,
  writeStoredPageTheme,
} from "@/lib/page-theme";

export function PageThemeDropdown({
  value,
  onChange,
  disabled = false,
}: {
  value: PageTheme;
  onChange: (theme: PageTheme) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
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

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first =
      listRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitemradio"][aria-checked="true"]',
      ) ??
      listRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitemradio"]',
      );
    first?.focus();
  }, [open]);

  function selectTheme(theme: PageTheme) {
    writeStoredPageTheme(theme);
    onChange(theme);
    setOpen(false);
  }

  const accent = PAGE_THEME_STYLES[value].vars["--accent"];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={buttonId}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={`Theme: ${PAGE_THEME_LABELS[value]}`}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--text-muted)] transition hover:text-[var(--text)] disabled:opacity-50"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        <span className="hidden sm:inline">{PAGE_THEME_LABELS[value]}</span>
        <span className="sm:hidden">Theme</span>
        <span className="text-[10px] opacity-70" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute right-0 z-50 mt-2 min-w-[10.5rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-1 shadow-xl shadow-black/40"
        >
          {PAGE_THEMES.map((theme) => {
            const active = value === theme;
            const swatch = PAGE_THEME_STYLES[theme].vars["--accent"];
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
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: swatch }}
                    aria-hidden
                  />
                  {PAGE_THEME_LABELS[theme]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
