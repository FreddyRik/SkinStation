"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { PageThemeDropdown } from "@/components/PageThemeDropdown";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  INVENTORY_SYNCING_EVENT,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import {
  applyPageTheme,
  DEFAULT_PAGE_THEME,
  PAGE_THEME_CHANGE_EVENT,
  readStoredPageTheme,
  type PageTheme,
} from "@/lib/page-theme";

export function SiteHeader() {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [pageTheme, setPageTheme] = useState<PageTheme>(DEFAULT_PAGE_THEME);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setCurrency(readStoredCurrency());
    const storedTheme = readStoredPageTheme();
    setPageTheme(storedTheme);
    applyPageTheme(storedTheme);

    function onCurrency(e: Event) {
      const next = (e as CustomEvent<Currency>).detail;
      if (next) setCurrency(next);
    }
    function onPageTheme(e: Event) {
      const next = (e as CustomEvent<PageTheme>).detail;
      if (next) {
        setPageTheme(next);
        applyPageTheme(next);
      }
    }
    function onSyncing(e: Event) {
      setSyncing(Boolean((e as CustomEvent<boolean>).detail));
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    window.addEventListener(PAGE_THEME_CHANGE_EVENT, onPageTheme);
    window.addEventListener(INVENTORY_SYNCING_EVENT, onSyncing);
    return () => {
      window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
      window.removeEventListener(PAGE_THEME_CHANGE_EVENT, onPageTheme);
      window.removeEventListener(INVENTORY_SYNCING_EVENT, onSyncing);
    };
  }, []);

  return (
    <header className="relative z-40 border-b border-[var(--border)]/80 bg-[var(--bg-elevated)]/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
            Inventory<span className="text-[var(--accent)]">Tracker</span>
          </span>
          <span className="hidden text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] sm:inline">
            CS2
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <PageThemeDropdown value={pageTheme} onChange={setPageTheme} />
          <CurrencyToggle
            value={currency}
            onChange={setCurrency}
            disabled={syncing}
          />
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/"
              className="text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              Home
            </Link>
            <span className="hidden text-[var(--text-muted)] sm:inline" aria-hidden>
              ·
            </span>
            <p className="hidden text-xs text-[var(--text-muted)] sm:block sm:text-sm">
              Local · Steam + Buff
            </p>
          </nav>
        </div>
      </div>
    </header>
  );
}
