"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { PageThemeDropdown } from "@/components/PageThemeDropdown";
import { MobileNavOverlay } from "@/components/site/MobileNavOverlay";
import { NavRail } from "@/components/site/NavRail";
import { SiteBrand } from "@/components/site/SiteMark";
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

function MenuIcon() {
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
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [pageTheme, setPageTheme] = useState<PageTheme>(DEFAULT_PAGE_THEME);
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);

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

  useEffect(() => {
    function onScroll() {
      setCondensed(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[var(--bg)] from-30% to-transparent"
      />
      <div className="relative mx-auto max-w-7xl px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
        <div
          className={`site-dock relative overflow-hidden rounded-2xl transition-[padding] duration-300 ${
            condensed ? "px-3 py-1.5 sm:px-4" : "px-3 py-2 sm:px-4 sm:py-2.5"
          }`}
          data-condensed={condensed ? "true" : "false"}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/65 to-transparent"
          />

          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="group min-w-0 shrink rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
            >
              <SiteBrand />
            </Link>

            <div className="hidden items-center gap-3 lg:flex">
              <NavRail pathname={pathname} />
              <div className="flex items-center gap-2">
                <PageThemeDropdown value={pageTheme} onChange={setPageTheme} />
                <CurrencyToggle
                  value={currency}
                  onChange={setCurrency}
                  disabled={syncing}
                />
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 text-[var(--text)] transition hover:border-[var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              onClick={() => setMobileOpen(true)}
            >
              <span className="sr-only">Open menu</span>
              <MenuIcon />
            </button>
          </div>

          {syncing ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 bottom-0 h-px overflow-hidden"
            >
              <span className="dock-beam absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
            </div>
          ) : null}
        </div>
      </div>

      <MobileNavOverlay
        open={mobileOpen}
        pathname={pathname}
        currency={currency}
        onCurrencyChange={setCurrency}
        pageTheme={pageTheme}
        onPageThemeChange={setPageTheme}
        syncing={syncing}
        onClose={() => setMobileOpen(false)}
      />
    </header>
  );
}
