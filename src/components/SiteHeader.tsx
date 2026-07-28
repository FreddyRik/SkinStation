"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { SiteWordmark } from "@/components/SiteWordmark";

const NAV_LINKS = [
  { href: "/inventory", label: "Inventory", match: (p: string) => p === "/inventory" || p.startsWith("/inventory/") },
  { href: "/database", label: "Skin Database", match: (p: string) => p.startsWith("/database") || p.startsWith("/collections") },
  { href: "/tradeup", label: "Trade-up", match: (p: string) => p.startsWith("/tradeup") },
] as const;

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
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
        <Link href="/" className="group">
          <SiteWordmark />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <PageThemeDropdown value={pageTheme} onChange={setPageTheme} />
          <CurrencyToggle
            value={currency}
            onChange={setCurrency}
            disabled={syncing}
          />
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {NAV_LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition ${
                    active
                      ? "text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
