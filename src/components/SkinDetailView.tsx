"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BuyFromOffers } from "@/components/BuyFromOffers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentedOption } from "@/types/ui";
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

  const variantOptions = useMemo<SegmentedOption<SkinVariant>[]>(() => {
    const options: SegmentedOption<SkinVariant>[] = [
      { value: "normal", label: "Normal" },
    ];
    if (item.stattrak) options.push({ value: "stattrak", label: "StatTrak™" });
    if (item.souvenir) options.push({ value: "souvenir", label: "Souvenir" });
    return options;
  }, [item.stattrak, item.souvenir]);

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

  const rarityColor = item.rarity?.color?.trim() || "var(--accent)";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/database"
        className="type-overline inline-flex items-center gap-2 transition hover:text-[var(--accent)]"
      >
        <span aria-hidden>←</span> Skin Database
      </Link>

      <header className="space-y-1.5 text-center sm:text-left">
        <p className="type-overline">
          {item.isKnife ? "★ " : ""}
          {item.weaponName ?? "Skin"}
        </p>
        <h1 className="type-page-title">
          {item.patternName ?? item.name}
          {item.phase ? (
            <span
              className="ml-2 align-middle font-mono text-xl font-bold tracking-wide"
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

      <section
        className="hud-panel hud-panel-lit rarity-frame border p-5 sm:p-6"
        style={{ "--rarity": rarityColor } as CSSProperties}
      >
        <div className="flex justify-center">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className="max-h-72 w-full object-contain drop-shadow-lg"
            />
          ) : (
            <span className="type-overline">No image</span>
          )}
        </div>

        {variantOptions.length > 1 ? (
          <div className="mt-5 flex justify-center">
            <SegmentedControl
              ariaLabel="Skin variant"
              options={variantOptions}
              value={variant}
              onChange={setVariant}
            />
          </div>
        ) : null}
      </section>

      {phaseSiblings.length > 1 ? (
        <section className="hud-panel p-5">
          <h2 className="type-overline mb-3">Phases</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {phaseSiblings.map((sib) => {
              const active = sib.id === item.id;
              const short = formatPhaseShort(sib.phase) ?? sib.phase;
              const accent = phaseAccent(sib.phase);
              return (
                <li key={sib.id}>
                  <Link
                    href={`/database/${encodeURIComponent(sib.id)}`}
                    className={`flex flex-col overflow-hidden rounded-xl border transition ${
                      active
                        ? "border-[var(--accent)] bg-[var(--bg-elevated)]/80 ring-1 ring-[var(--accent)]/40"
                        : "border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:border-[var(--accent)]/35"
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
                      className="type-metric truncate px-2 py-1.5 text-center text-xs"
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
        <section className="hud-panel overflow-hidden">
          <h2 className="type-overline border-b border-[var(--border)]/70 px-4 py-3">
            Market prices
          </h2>
          <ul className="divide-y divide-[var(--border)]/60">
            {rows.map((row) => (
              <li
                key={row.wearName}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated)]/40 sm:flex-nowrap"
              >
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold text-[#0b1220]"
                  style={{ backgroundColor: row.color }}
                >
                  {row.abbr}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {row.wearName}
                  </p>
                  <p className="type-metric text-xs font-normal text-[var(--text-muted)]">
                    {formatFloatShort(row.floatMin)} –{" "}
                    {formatFloatShort(row.floatMax)}
                  </p>
                </div>
                <div className="flex w-full flex-col items-end gap-0.5 sm:w-auto">
                  <p className="type-metric text-sm text-[var(--steam)]">
                    <span className="type-overline mr-1.5">Steam</span>
                    {money(row.steamUsd)}
                  </p>
                  <p className="type-metric text-xs text-[var(--buff)]">
                    <span className="type-overline mr-1.5">Buff</span>
                    {money(row.buffUsd)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cleanDescription ? (
        <section className="hud-panel p-5">
          <h2 className="type-overline mb-2">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
            {cleanDescription}
          </p>
        </section>
      ) : null}

      <section className="hud-panel p-5">
        <h2 className="type-overline mb-3">Summary</h2>
        <dl className="divide-y divide-[var(--border)]/60">
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
          <div className="hud-panel p-4">
            <p className="type-overline">Rarity</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="h-8 w-1.5 rounded-full"
                style={{ backgroundColor: item.rarity.color }}
              />
              <p
                className="type-card-title text-lg"
                style={{ color: item.rarity.color }}
              >
                {item.rarity.name}
              </p>
            </div>
          </div>
        ) : null}
        <div className="hud-panel p-4">
          <p className="type-overline">Quality</p>
          <p className="type-card-title mt-2 text-lg">
            {variant === "stattrak"
              ? "StatTrak™"
              : variant === "souvenir"
                ? "Souvenir"
                : "Normal"}
          </p>
        </div>
      </section>

      <section className="hud-panel p-5">
        <h2 className="type-overline mb-5 flex items-center gap-2">
          Wear Range
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] text-[10px] font-medium text-[var(--text-muted)]"
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
          <h2 className="type-overline">Collection</h2>
          <ul className="space-y-2">
            {collections.map((col) => (
              <li key={col.id}>
                <Link
                  href={`/collections/${encodeURIComponent(col.id)}`}
                  className="hud-panel flex items-center gap-3 p-3 transition hover:border-[var(--accent)]/45"
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
                    <p className="type-metric text-xs font-normal text-[var(--text-muted)]">
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
          <h2 className="type-overline">Cases</h2>
          <ul className="space-y-2">
            {item.crates.map((crate) => (
              <li key={crate.id}>
                <Link
                  href={`/database/${encodeURIComponent(crate.id)}`}
                  className="hud-panel flex items-center gap-3 p-3 transition hover:border-[var(--accent)]/45"
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
      <dd className="type-metric text-right text-sm font-medium">
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
  const rightPct = (1 - hi) * 100;
  const rangeLabel = `Float ${formatFloatShort(lo)} – ${formatFloatShort(hi)}`;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="type-metric shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)]/70 px-2 py-0.5 text-[11px]">
          {formatFloatShort(lo)}
        </span>
        <span
          className="min-w-0 flex-1 border-t border-dashed border-[var(--border)]/80"
          aria-hidden
        />
        <span className="type-metric shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)]/70 px-2 py-0.5 text-[11px]">
          {formatFloatShort(hi)}
        </span>
      </div>

      <div
        className="relative h-3 w-full overflow-hidden rounded-md border border-[var(--border)]/70 bg-[var(--bg)]"
        title={rangeLabel}
        aria-label={rangeLabel}
      >
        <div className="flex h-full w-full">
          {WEAR_BANDS.map((band) => (
            <div
              key={band.key}
              className="h-full"
              style={{
                width: `${(band.max - band.min) * 100}%`,
                backgroundColor: band.color,
              }}
            />
          ))}
        </div>
        {leftPct > 0 ? (
          <div
            className="absolute inset-y-0 left-0 bg-[var(--bg)]/72"
            style={{ width: `${leftPct}%` }}
            aria-hidden
          />
        ) : null}
        {rightPct > 0 ? (
          <div
            className="absolute inset-y-0 right-0 bg-[var(--bg)]/72"
            style={{ width: `${rightPct}%` }}
            aria-hidden
          />
        ) : null}
      </div>

      <div className="grid grid-cols-5 gap-1" aria-hidden>
        {WEAR_BANDS.map((band) => (
          <span
            key={band.key}
            className="min-w-0 truncate text-center font-mono text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-[11px]"
            style={{ color: band.color }}
            title={band.name}
          >
            {band.abbr}
          </span>
        ))}
      </div>
    </div>
  );
}
