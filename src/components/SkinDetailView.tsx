"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BuyFromOffers } from "@/components/BuyFromOffers";
import {
  WEAR_BANDS,
  formatFloatShort,
  formatPhaseShort,
  navFilterForWeapon,
  phaseAccent,
  type CatalogItemDetail,
  type CatalogNamedRef,
  type PhaseSibling,
  type SkinDetailPrices,
  type SkinVariant,
  type SkinWearPriceRow,
} from "@/lib/cs-catalog";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney, formatSaleDate } from "@/lib/format";

type CollectionCard = CatalogNamedRef & { itemCount: number };

export function SkinDetailView({
  item,
  prices,
  collections,
  buffGoodsByHash,
  phaseSiblings = [],
}: {
  item: CatalogItemDetail;
  prices: SkinDetailPrices;
  collections: CollectionCard[];
  /** market_hash_name → Buff163 goods_id */
  buffGoodsByHash: Record<string, number>;
  phaseSiblings?: PhaseSibling[];
}) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [usdToEur, setUsdToEur] = useState(0.92);
  const [variant, setVariant] = useState<SkinVariant>(() => {
    if (item.souvenir && !item.stattrak) return "souvenir";
    return "normal";
  });

  useEffect(() => {
    setCurrency(readStoredCurrency());
    function onCurrency(e: Event) {
      const next = (e as CustomEvent<Currency>).detail;
      if (next) setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fx");
        if (!res.ok) return;
        const data = (await res.json()) as { usdToEur?: number };
        if (!cancelled && typeof data.usdToEur === "number") {
          setUsdToEur(data.usdToEur);
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = prices[variant] ?? [];
  const weaponHref = useMemo(() => {
    const filter = navFilterForWeapon(item.weaponCategory, item.weaponName);
    if (!filter || filter.section === "home") return "/database";
    if (
      filter.section === "pistols" ||
      filter.section === "mid_tier" ||
      filter.section === "rifles" ||
      filter.section === "knives" ||
      filter.section === "gloves"
    ) {
      const params = new URLSearchParams({
        section: filter.section,
        ...(filter.weapon ? { weapon: filter.weapon } : {}),
      });
      return `/database?${params.toString()}`;
    }
    if (filter.section === "other") {
      return `/database?section=other&other=${filter.other}`;
    }
    return "/database";
  }, [item.weaponCategory, item.weaponName]);

  function money(usd: number | null): string {
    if (usd == null) return "—";
    const value = convertMoney(usd, "USD", currency, usdToEur);
    return formatMoney(value, currency);
  }

  const cleanDescription = item.description
    ?.replace(/\\n/g, "\n")
    .replace(/<\/?i>/gi, "")
    .trim();

  const skinMin = item.minFloat ?? 0;
  const skinMax = item.maxFloat ?? 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/database"
        className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
      >
        ← Skin Database
      </Link>

      <header className="space-y-1 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {item.isKnife ? "★ " : ""}
          {item.weaponName ?? "Skin"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
          {item.patternName ?? item.name}
          {item.phase ? (
            <span
              className="ml-2 align-middle text-xl font-bold tracking-wide"
              style={{ color: phaseAccent(item.phase) }}
            >
              {formatPhaseShort(item.phase) ?? item.phase}
            </span>
          ) : null}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {item.name}
          {item.phase ? ` · ${item.phase}` : ""}
        </p>
      </header>

      <section className="et-card p-5 sm:p-6">
        <div className="flex justify-center">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className="max-h-72 w-full object-contain drop-shadow-lg"
            />
          ) : (
            <span className="text-sm text-[var(--text-muted)]">No image</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <VariantChip
            active={variant === "normal"}
            onClick={() => setVariant("normal")}
            label="Normal"
          />
          {item.stattrak ? (
            <VariantChip
              active={variant === "stattrak"}
              onClick={() => setVariant("stattrak")}
              label="StatTrak™"
              tone="buff"
            />
          ) : null}
          {item.souvenir ? (
            <VariantChip
              active={variant === "souvenir"}
              onClick={() => setVariant("souvenir")}
              label="Souvenir"
              tone="warn"
            />
          ) : null}
        </div>
      </section>

      {phaseSiblings.length > 1 ? (
        <section className="et-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">
            Phases
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {phaseSiblings.map((sib) => {
              const active = sib.id === item.id;
              const short = formatPhaseShort(sib.phase) ?? sib.phase;
              const accent = phaseAccent(sib.phase);
              return (
                <li key={sib.id}>
                  <Link
                    href={`/database/${encodeURIComponent(sib.id)}`}
                    className={`et-card flex flex-col overflow-hidden ${
                      active
                        ? "ring-1 ring-[var(--accent)]/50"
                        : "et-card-hover"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className="h-1 w-full shrink-0"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <div className="flex h-20 items-center justify-center bg-[var(--bg)]/60 px-2 py-2">
                      {sib.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sib.image}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                    <p
                      className="truncate px-2 py-1.5 text-center text-xs font-semibold"
                      style={{ color: accent }}
                    >
                      {short}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <BuyFromSection rows={rows} buffGoodsByHash={buffGoodsByHash} />

      {rows.length > 0 ? (
        <section className="et-card overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[inset_0_-1px_0_rgba(200,121,65,0.12)]">
            Market prices
          </h2>
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <li
                key={row.wearName}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
              >
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-[#0b1220]"
                  style={{ backgroundColor: row.color }}
                >
                  {row.abbr}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {row.wearName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatFloatShort(row.floatMin)} –{" "}
                    {formatFloatShort(row.floatMax)}
                  </p>
                </div>
                <div className="flex w-full flex-col items-end gap-0.5 sm:w-auto">
                  <p className="font-data text-sm font-semibold text-[var(--steam)]">
                    Steam {money(row.steamUsd)}
                  </p>
                  <p className="font-data text-xs font-medium text-[var(--buff)]">
                    Buff {money(row.buffUsd)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cleanDescription ? (
        <section className="et-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
            {cleanDescription}
          </p>
        </section>
      ) : null}

      <section className="et-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Summary</h2>
        <dl className="divide-y divide-[var(--border)]">
          <SummaryRow label="Category" value="Skin" />
          {item.weaponCategory ? (
            <SummaryRow label="Type" value={item.weaponCategory} />
          ) : null}
          {item.weaponName ? (
            <SummaryRow
              label="Weapon"
              value={item.weaponName}
              href={weaponHref}
            />
          ) : null}
          {item.patternName ? (
            <SummaryRow label="Finish" value={item.patternName} />
          ) : null}
          {item.phase ? (
            <SummaryRow label="Phase" value={item.phase} />
          ) : null}
          {item.finishStyle ? (
            <SummaryRow label="Finish style" value={item.finishStyle} />
          ) : null}
          {item.paintIndex ? (
            <SummaryRow label="Paint index" value={item.paintIndex} />
          ) : null}
          {item.team ? <SummaryRow label="Team" value={item.team} /> : null}
          {item.firstSaleDate ? (
            <SummaryRow
              label="Released"
              value={formatSaleDate(item.firstSaleDate)}
            />
          ) : null}
          {item.legacyModel != null ? (
            <SummaryRow
              label="Model"
              value={item.legacyModel ? "CS:GO (legacy)" : "CS2"}
            />
          ) : null}
          <SummaryRow
            label="StatTrak™"
            value={item.stattrak ? "Available" : "No"}
          />
          <SummaryRow
            label="Souvenir"
            value={item.souvenir ? "Available" : "No"}
          />
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {item.rarity ? (
          <div
            className="et-card p-4"
            style={{ borderLeft: `2px solid ${item.rarity.color}` }}
          >
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              Rarity
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--text)]">
              {item.rarity.name}
            </p>
          </div>
        ) : null}
        <div className="et-card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Quality
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--text)]">
            {variant === "stattrak"
              ? "StatTrak™"
              : variant === "souvenir"
                ? "Souvenir"
                : "Normal"}
          </p>
        </div>
      </section>

      <section className="et-card p-5">
        <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          Wear Range
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-medium text-[var(--text-muted)]"
            title="Possible float values this skin can roll (0.00–1.00). Colored stripes mark wear tiers."
            aria-label="About wear range"
          >
            i
          </span>
        </h2>
        <FloatRangeBar min={skinMin} max={skinMax} />
      </section>

      {collections.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Collection
          </h2>
          <ul className="space-y-2">
            {collections.map((col) => (
              <li key={col.id}>
                <Link
                  href={`/collections/${encodeURIComponent(col.id)}`}
                  className="et-card et-card-hover flex items-center gap-3 p-3"
                >
                  {col.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={col.image}
                      alt=""
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-[var(--border)]" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {col.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Contains {col.itemCount.toLocaleString("en-US")} items
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.crates.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Cases</h2>
          <ul className="space-y-2">
            {item.crates.map((crate) => (
              <li key={crate.id}>
                <Link
                  href={`/database/${encodeURIComponent(crate.id)}`}
                  className="et-card et-card-hover flex items-center gap-3 p-3"
                >
                  {crate.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={crate.image}
                      alt=""
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-[var(--border)]" />
                  )}
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {crate.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function BuyFromSection({
  rows,
  buffGoodsByHash,
}: {
  rows: SkinWearPriceRow[];
  buffGoodsByHash: Record<string, number>;
}) {
  const steamOffer = bestSteamOffer(rows);
  const buffOffer = bestBuffOffer(rows, buffGoodsByHash);
  return <BuyFromOffers steam={steamOffer} buff={buffOffer} />;
}

function bestSteamOffer(
  rows: SkinWearPriceRow[],
): { priceUsd: number; marketHashName: string } | null {
  let best: { priceUsd: number; marketHashName: string } | null = null;
  for (const row of rows) {
    if (row.steamUsd == null) continue;
    if (!best || row.steamUsd < best.priceUsd) {
      best = { priceUsd: row.steamUsd, marketHashName: row.marketHashName };
    }
  }
  return best;
}

function bestBuffOffer(
  rows: SkinWearPriceRow[],
  buffGoodsByHash: Record<string, number>,
): { priceUsd: number; goodsId: number } | null {
  let best: { priceUsd: number; goodsId: number } | null = null;
  for (const row of rows) {
    if (row.buffUsd == null) continue;
    const goodsId = buffGoodsByHash[row.marketHashName];
    if (!goodsId) continue;
    if (!best || row.buffUsd < best.priceUsd) {
      best = { priceUsd: row.buffUsd, goodsId };
    }
  }
  return best;
}

function VariantChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "buff" | "warn";
}) {
  const activeClass =
    tone === "buff"
      ? "bg-[var(--buff)] text-[#0b1220]"
      : tone === "warn"
        ? "bg-[var(--warn)] text-[#0b1220]"
        : "bg-[var(--accent)] text-[var(--accent-fg)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[4px] px-4 py-1.5 text-sm font-semibold ${
        active
          ? activeClass
          : "bg-[var(--bg-elevated)] text-[var(--text-muted)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right text-sm font-medium text-[var(--text)]">
        {href ? (
          <Link
            href={href}
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function FloatRangeBar({ min, max }: { min: number; max: number }) {
  const lo = Math.min(Math.max(min, 0), 1);
  const hi = Math.min(Math.max(max, 0), 1);
  const leftPct = lo * 100;
  const widthPct = Math.max((hi - lo) * 100, 0.4);
  const endLabelLeft = Math.min(leftPct + widthPct, 100);
  const endBadgeLeft =
    endLabelLeft > 94 ? 100 : Math.max(endLabelLeft, 6);

  return (
    <div className="relative pt-9">
      <div
        className="pointer-events-none absolute top-0 z-10 flex flex-col items-center"
        style={{
          left: `${leftPct}%`,
          transform: leftPct < 3 ? "none" : "translateX(-50%)",
        }}
      >
        <span className="rounded-[4px] bg-[var(--bg-recessed)] px-2 py-0.5 font-data text-[11px] font-semibold text-[var(--text)]">
          {formatFloatShort(lo)}
        </span>
        <span
          className="mt-[-1px] h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#1c2420]"
          aria-hidden
        />
      </div>
      <div
        className="pointer-events-none absolute top-0 z-10 flex flex-col items-center"
        style={{
          left: `${endBadgeLeft}%`,
          transform: endLabelLeft > 94 ? "translateX(-100%)" : "translateX(-50%)",
        }}
      >
        <span className="rounded-[4px] bg-[var(--bg-recessed)] px-2 py-0.5 font-data text-[11px] font-semibold text-[var(--text)]">
          {formatFloatShort(hi)}
        </span>
        <span
          className="mt-[-1px] h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#1c2420]"
          aria-hidden
        />
      </div>

      <div
        className="relative flex h-11 w-full overflow-hidden rounded-lg bg-[#141a17]"
        title={`Float ${formatFloatShort(lo)} – ${formatFloatShort(hi)}`}
      >
        {WEAR_BANDS.map((band, i) => (
          <div
            key={band.key}
            className="relative flex h-full items-center justify-center"
            style={{
              width: `${(band.max - band.min) * 100}%`,
              borderRight:
                i < WEAR_BANDS.length - 1
                  ? "1px solid rgba(255,255,255,0.06)"
                  : undefined,
            }}
          >
            <span
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ backgroundColor: band.color }}
              aria-hidden
            />
            <span className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
              {band.abbr}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
