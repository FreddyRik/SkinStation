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
  {
    href: "/inventory",
    label: "Inventory",
    match: (p: string) => p === "/inventory" || p.startsWith("/inventory/"),
  },
  {
    href: "/database",
    label: "Skin Database",
    match: (p: string) =>
      p.startsWith("/database") || p.startsWith("/collections"),
  },
  {
    href: "/tradeup",
    label: "Trade-up",
    match: (p: string) => p.startsWith("/tradeup"),
  },
] as const;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className = "",
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`transition ${className} ${
        active
          ? "text-[var(--text)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [pageTheme, setPageTheme] = useState<PageTheme>(DEFAULT_PAGE_THEME);
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="relative z-40 border-b border-[var(--border)]/80 bg-[var(--bg-elevated)]/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="group min-w-0 shrink">
            <SiteWordmark className="text-lg font-semibold tracking-tight text-[var(--text)] sm:text-2xl" />
          </Link>

          <div className="hidden items-center gap-3 lg:flex lg:gap-4">
            <PageThemeDropdown value={pageTheme} onChange={setPageTheme} />
            <CurrencyToggle
              value={currency}
              onChange={setCurrency}
              disabled={syncing}
            />
            <nav className="flex items-center gap-x-3 text-sm">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={link.match(pathname)}
                />
              ))}
            </nav>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2 text-[var(--text)] transition hover:border-[var(--accent)]/40 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={mobileOpen} />
          </button>
        </div>

        {mobileOpen ? (
          <div
            id="site-mobile-nav"
            className="mt-3 space-y-4 border-t border-[var(--border)]/80 pt-4 lg:hidden"
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={link.match(pathname)}
                  onNavigate={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium"
                />
              ))}
            </nav>
            <div className="space-y-4 border-t border-[var(--border)]/60 pt-4">
              <PageThemeDropdown
                value={pageTheme}
                onChange={setPageTheme}
                variant="inline"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Currency
                </span>
                <CurrencyToggle
                  value={currency}
                  onChange={setCurrency}
                  disabled={syncing}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
