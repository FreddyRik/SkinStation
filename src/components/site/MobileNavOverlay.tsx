"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { PageThemeDropdown } from "@/components/PageThemeDropdown";
import { PRIMARY_NAV_LINKS } from "@/lib/site";
import type { Currency } from "@/lib/currency";
import type { PageTheme } from "@/lib/page-theme";

export function MobileNavOverlay({
  open,
  pathname,
  currency,
  onCurrencyChange,
  pageTheme,
  onPageThemeChange,
  syncing,
  onClose,
}: {
  open: boolean;
  pathname: string;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  pageTheme: PageTheme;
  onPageThemeChange: (theme: PageTheme) => void;
  syncing: boolean;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(overlayRef, open, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      id="site-mobile-nav"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex flex-col bg-[var(--bg)]/92 outline-none backdrop-blur-xl"
    >
      <div
        aria-hidden
        className="hud-grid hud-grid-fade pointer-events-none absolute inset-0 opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 80% -10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 55%)",
        }}
      />

      <div className="relative flex items-center justify-between px-5 pt-5">
        <p
          id={titleId}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]"
        >
          Navigate
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]/70 text-[var(--text)] transition hover:border-[var(--accent)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
        >
          <span className="sr-only">Close menu</span>
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav className="relative flex flex-1 flex-col justify-center gap-1 px-4 py-8">
        {PRIMARY_NAV_LINKS.map((link, index) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`nav-item-in group flex items-baseline gap-4 rounded-2xl px-4 py-4 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
                active
                  ? "bg-[var(--accent)]/10 text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)]/60 hover:text-[var(--text)]"
              }`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="font-mono text-xs tracking-[0.18em] text-[var(--accent)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="type-card-title text-3xl sm:text-4xl">
                {link.label}
              </span>
              <span className="ml-auto font-mono text-[10px] tracking-[0.18em] text-[var(--text-muted)]/80">
                {link.code}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="relative space-y-4 border-t border-[var(--border)]/70 px-5 py-5">
        <PageThemeDropdown
          value={pageTheme}
          onChange={onPageThemeChange}
          variant="inline"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Currency
          </span>
          <CurrencyToggle
            value={currency}
            onChange={onCurrencyChange}
            disabled={syncing}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
