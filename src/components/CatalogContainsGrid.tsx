"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CatalogPriceText } from "@/components/CatalogPriceText";
import { CatalogSortSelect } from "@/components/database/CatalogSortSelect";
import { KnifeBadge } from "@/components/database/CatalogBadges";
import {
  DEFAULT_CATALOG_SORT,
  collapsePhasedContains,
  containsLooksLikeKnife,
  formatPhaseShort,
  phaseAccent,
  resolveSkinPhase,
  sortCatalogItems,
  type CatalogContainsItem,
  type CatalogNamedRef,
} from "@/lib/cs-catalog";
import type { CatalogSort } from "@/types/catalog";

export type ContainsGridItem = CatalogContainsItem & {
  priceMinUsd?: number | null;
  priceMaxUsd?: number | null;
};

function multiPhaseFamilyNames(items: ContainsGridItem[]): Set<string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const phase = resolveSkinPhase({ paintIndex: item.paint_index });
    if (!phase) continue;
    const key = item.name.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const multi = new Set<string>();
  for (const [name, count] of counts) {
    if (count > 1) multi.add(name);
  }
  return multi;
}

export function CatalogContainsGrid({
  items,
  emptyLabel = "No items listed.",
  leading,
}: {
  items: ContainsGridItem[];
  emptyLabel?: string;
  /** Optional first cell (e.g. rare specials teaser on case pages). */
  leading?: ReactNode;
}) {
  const familyNames = multiPhaseFamilyNames(items);
  const [sort, setSort] = useState<CatalogSort>(DEFAULT_CATALOG_SORT);
  const displayItems = useMemo(
    () => sortCatalogItems(collapsePhasedContains(items), sort),
    [items, sort],
  );

  if (displayItems.length === 0 && !leading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-3">
      {displayItems.length > 1 ? (
        <div className="flex justify-end">
          <CatalogSortSelect value={sort} onChange={setSort} />
        </div>
      ) : null}
      <ul className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {leading ? <li>{leading}</li> : null}
        {displayItems.map((item) => {
          const knife = containsLooksLikeKnife(item.name);
          const isPhaseFamily = familyNames.has(item.name.trim());
          const phase = isPhaseFamily
            ? null
            : resolveSkinPhase({
                paintIndex: item.paint_index,
              });
          const phaseShort = formatPhaseShort(phase);
          const rarityVar = {
            "--rarity": item.rarity?.color?.trim() || "var(--accent)",
          } as CSSProperties;
          return (
            <li key={item.id}>
              <Link
                href={`/database/${encodeURIComponent(item.id)}`}
                style={rarityVar}
                className="rarity-frame group flex h-full flex-col gap-2 rounded-xl border bg-[var(--bg-elevated)]/40 p-3"
              >
                <div className="flex h-24 items-center justify-center rounded-lg bg-[var(--bg)]/70">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </div>
                <div className="flex items-start gap-1.5">
                  {knife ? <KnifeBadge /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-[var(--text)] transition group-hover:text-[var(--accent)]">
                      {item.name}
                      {phaseShort ? (
                        <span
                          className="ml-1 font-mono font-bold"
                          style={{ color: phaseAccent(phase) }}
                        >
                          {phaseShort}
                        </span>
                      ) : null}
                    </p>
                    {isPhaseFamily ? (
                      <p className="type-overline mt-1">Multiple phases</p>
                    ) : null}
                  </div>
                </div>
                {item.rarity ? (
                  <p
                    className="type-overline truncate"
                    style={{ color: item.rarity.color }}
                  >
                    {item.rarity.name}
                  </p>
                ) : null}
                <CatalogPriceText
                  minUsd={item.priceMinUsd ?? null}
                  maxUsd={item.priceMaxUsd ?? null}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CatalogNamedRefList({
  items,
  hrefFor,
}: {
  items: CatalogNamedRef[];
  hrefFor: (id: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((ref) => (
        <li key={ref.id}>
          <Link
            href={hrefFor(ref.id)}
            className="hud-panel-quiet inline-flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)] transition hover:border-[var(--accent)]/45 hover:text-[var(--accent)]"
          >
            {ref.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ref.image}
                alt=""
                className="h-6 w-6 object-contain"
                loading="lazy"
              />
            ) : null}
            {ref.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
