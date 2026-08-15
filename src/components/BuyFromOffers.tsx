"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SteamBrandIcon } from "@/components/BrandIcons";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";
import { useUsdToEurRate } from "@/hooks/useUsdToEurRate";
import {
  buffMarketListingUrl,
  steamMarketListingUrl,
} from "@/lib/steam-market/listing";

export type BuyFromSteamOffer = {
  priceUsd: number;
  marketHashName: string;
};

export type BuyFromBuffOffer = {
  priceUsd: number;
  goodsId: number;
};

/** Marketplace “Buy from” rows (Buff + Steam) with currency conversion. */
export function BuyFromOffers({
  steam,
  buff,
  title = "Buy from",
}: {
  steam: BuyFromSteamOffer | null;
  buff: BuyFromBuffOffer | null;
  title?: string;
}) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const usdToEur = useUsdToEurRate();

  useEffect(() => {
    setCurrency(readStoredCurrency());
    function onCurrency(e: Event) {
      const next = (e as CustomEvent<Currency>).detail;
      if (next) setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, []);

  if (!steam && !buff) return null;

  function money(usd: number): string {
    const value = convertMoney(usd, "USD", currency, usdToEur);
    return formatMoney(value, currency);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      <ul className="space-y-2">
        {buff ? (
          <BuyFromRow
            name="BUFF163"
            icon={<BuffMark />}
            fromLabel={money(buff.priceUsd)}
            href={buffMarketListingUrl(buff.goodsId)}
            accent="buff"
          />
        ) : null}
        {steam ? (
          <BuyFromRow
            name="Steam"
            icon={
              <SteamBrandIcon
                className="h-5 w-5 text-[var(--steam)]"
                title="Steam"
              />
            }
            fromLabel={money(steam.priceUsd)}
            href={steamMarketListingUrl(steam.marketHashName)}
            accent="steam"
          />
        ) : null}
      </ul>
    </section>
  );
}

function BuyFromRow({
  name,
  icon,
  fromLabel,
  href,
  accent,
}: {
  name: string;
  icon: ReactNode;
  fromLabel: string;
  href: string;
  accent: "steam" | "buff";
}) {
  return (
    <li>
      <div className="et-card flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center">
            {icon}
          </span>
          <p className="truncate text-sm font-semibold text-[var(--text)]">
            {name}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              from
            </p>
            <p
              className={`font-data text-base font-semibold ${
                accent === "buff" ? "text-[var(--buff)]" : "text-[var(--steam)]"
              }`}
            >
              {fromLabel}
            </p>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-fg)] transition hover:bg-[var(--accent-dim)]"
          >
            View offer
            <span className="ml-1" aria-hidden>
              ›
            </span>
          </a>
        </div>
      </div>
    </li>
  );
}

function BuffMark() {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--buff)] text-[10px] font-black text-[#0b1220]"
      title="BUFF163"
    >
      B
    </span>
  );
}
