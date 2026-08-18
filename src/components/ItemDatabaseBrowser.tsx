"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CATALOG_SORT,
  DEFAULT_NAV_FILTER,
  buildLatestReleaseCards,
  groupPhasedSkins,
  inferRareSpecialCategory,
  isGoldDropSkin,
  itemMatchesNavFilter,
  navFilterForWeapon,
  navFilterLabel,
  parseCatalogSort,
  sortCatalogItems,
  toContainsItem,
  weaponCases,
  type BrowseCatalogItem,
  type LatestReleaseCard,
  type NavFilter,
  type OtherNavKey,
  type SlimCatalogItem,
  type SlimCollection,
} from "@/lib/cs-catalog";
import { CatalogCard } from "@/components/database/CatalogCard";
import { CatalogNavRail } from "@/components/database/CatalogNavRail";
import { CatalogSortSelect } from "@/components/database/CatalogSortSelect";
import { CollectionCard } from "@/components/database/CollectionCard";
import { LatestReleases } from "@/components/database/LatestReleases";
import { RareSpecialItemsCard } from "@/components/RareSpecialItemsCard";
import {
  collectionHref,
  databaseHref,
} from "@/components/database/catalog-links";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import type { CatalogSort } from "@/types/catalog";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";

const PAGE_SIZE = 96;

type PageRow =
  | { type: "collection"; data: SlimCollection }
  | { type: "item"; data: BrowseCatalogItem };

function matchesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

function itemSearchBlob(item: BrowseCatalogItem): string {
  return [
    item.name,
    item.marketHashName,
    item.weaponName,
    item.patternName,
    item.phase,
    ...item.phaseSearchLabels,
    item.weaponCategory,
    item.rarity?.name,
    item.tournamentName,
    item.stickerType,
  ]
    .filter(Boolean)
    .join(" ");
}

export function ItemDatabaseBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SlimCatalogItem[]>([]);
  const [collections, setCollections] = useState<SlimCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NavFilter>(DEFAULT_NAV_FILTER);
  const [sort, setSort] = useState<CatalogSort>(DEFAULT_CATALOG_SORT);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [usdToEur, setUsdToEur] = useState(0.92);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

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

  function formatUsdRange(min: number | null, max: number | null): string | null {
    if (min == null && max == null) return null;
    const lo = convertMoney(min ?? max, "USD", currency, usdToEur);
    const hi = convertMoney(max ?? min, "USD", currency, usdToEur);
    if (lo == null && hi == null) return null;
    if (lo != null && hi != null && Math.abs(lo - hi) < 0.005) {
      return formatMoney(lo, currency);
    }
    return `${formatMoney(lo, currency)} - ${formatMoney(hi, currency)}`;
  }

  useEffect(() => {
    if (urlHydrated) return;
    const section = searchParams.get("section");
    const weapon = searchParams.get("weapon");
    const other = searchParams.get("other") as OtherNavKey | null;
    const crateId = searchParams.get("crate");
    setSort(parseCatalogSort(searchParams.get("sort")));

    if (
      (section === "pistols" ||
        section === "mid_tier" ||
        section === "rifles" ||
        section === "knives" ||
        section === "gloves") &&
      weapon
    ) {
      setFilter({ section, weapon });
      setUrlHydrated(true);
      return;
    }
    if (
      section === "pistols" ||
      section === "mid_tier" ||
      section === "rifles" ||
      section === "knives" ||
      section === "gloves"
    ) {
      setFilter({ section, weapon: null });
      setUrlHydrated(true);
      return;
    }
    if (section === "collections") {
      setFilter({ section: "collections" });
      setUrlHydrated(true);
      return;
    }
    if (section === "cases") {
      setFilter({ section: "cases", crateId });
      setUrlHydrated(true);
      return;
    }
    if (section === "other" && other) {
      setFilter({ section: "other", other });
      setUrlHydrated(true);
      return;
    }
    if (section === "stickers") {
      setFilter({ section: "stickers", sticker: "all" });
      setUrlHydrated(true);
      return;
    }
    if (!weapon) {
      setUrlHydrated(true);
    }
  }, [searchParams, urlHydrated]);

  // Weapon-only deep link — infer section after catalog loads.
  useEffect(() => {
    if (urlHydrated || items.length === 0) return;
    const section = searchParams.get("section");
    const weapon = searchParams.get("weapon");
    if (!weapon || section) {
      setUrlHydrated(true);
      return;
    }
    const cat = items.find(
      (i) => i.kind === "skin" && i.weaponName === weapon,
    )?.weaponCategory;
    const next = navFilterForWeapon(cat, weapon);
    if (next) setFilter(next);
    setUrlHydrated(true);
  }, [items, searchParams, urlHydrated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cs-catalog");
        const data = (await res.json()) as {
          items?: SlimCatalogItem[];
          collections?: SlimCollection[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Failed to load catalog.");
        }
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setCollections(Array.isArray(data.collections) ? data.collections : []);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load catalog.");
        setItems([]);
        setCollections([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [deferredQuery, filter, sort]);

  const caseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of weaponCases(items)) map.set(c.id, c.name);
    return map;
  }, [items]);

  const skinCollections = useMemo(
    () => collections.filter((c) => c.isSkinCollection),
    [collections],
  );

  const latestReleases = useMemo(
    () => buildLatestReleaseCards(items, collections, 6),
    [items, collections],
  );

  const browseItems = useMemo(() => groupPhasedSkins(items), [items]);

  const isHome = filter.section === "home";
  const showHomeLanding = isHome && !deferredQuery;

  const filteredItems = useMemo(() => {
    if (filter.section === "collections") return [];
    if (showHomeLanding) return [];
    const matched = browseItems.filter((item) => {
      if (!isHome && !itemMatchesNavFilter(item, filter)) return false;
      return matchesQuery(itemSearchBlob(item), deferredQuery);
    });
    return sortCatalogItems(matched, sort);
  }, [browseItems, filter, deferredQuery, isHome, showHomeLanding, sort]);

  const caseContents = useMemo(() => {
    if (filter.section !== "cases" || !filter.crateId || deferredQuery) {
      return null;
    }
    const crateId = filter.crateId;
    const gold: BrowseCatalogItem[] = [];
    const regular: BrowseCatalogItem[] = [];
    let crate: BrowseCatalogItem | null = null;
    for (const item of filteredItems) {
      if (item.id === crateId) {
        crate = item;
        continue;
      }
      if (isGoldDropSkin(item)) gold.push(item);
      else regular.push(item);
    }
    if (!crate) {
      crate = browseItems.find((item) => item.id === crateId) ?? null;
    }
    const rareCategory = inferRareSpecialCategory(gold);
    const showGoldCard = gold.length > 0 && rareCategory !== "items";
    return {
      crateId,
      crate,
      gold: showGoldCard ? gold : [],
      items: sortCatalogItems(
        showGoldCard ? regular : [...regular, ...gold],
        sort,
      ),
      showGoldCard,
    };
  }, [filter, filteredItems, deferredQuery, browseItems, sort]);

  const displayItems = caseContents ? caseContents.items : filteredItems;

  const filteredCollections = useMemo(() => {
    if (showHomeLanding) return [];
    if (filter.section === "collections") {
      return skinCollections.filter((c) => matchesQuery(c.name, deferredQuery));
    }
    // Global search from home also includes weapon skin collections.
    if (isHome && deferredQuery) {
      return skinCollections.filter((c) => matchesQuery(c.name, deferredQuery));
    }
    return [];
  }, [skinCollections, filter, deferredQuery, isHome, showHomeLanding]);

  const goldCardCount = caseContents?.showGoldCard ? 1 : 0;
  const pageableCount =
    filter.section === "collections" || (isHome && deferredQuery)
      ? displayItems.length + filteredCollections.length
      : displayItems.length;
  const combinedCount = pageableCount + goldCardCount;

  const pageRows = useMemo<PageRow[]>(() => {
    const rows: PageRow[] = [];
    for (const c of filteredCollections) rows.push({ type: "collection", data: c });
    for (const item of displayItems) rows.push({ type: "item", data: item });
    return rows.slice(0, visible);
  }, [filteredCollections, displayItems, visible]);

  const canShowMore = visible < pageableCount;

  function applyFilter(next: NavFilter) {
    setFilter(next);
    router.replace(databaseHref(next, sort), { scroll: false });
  }

  function applySort(next: CatalogSort) {
    setSort(next);
    router.replace(databaseHref(filter, next), { scroll: false });
  }

  const showSort =
    !showHomeLanding && filter.section !== "collections";

  function onReleaseActivate(card: LatestReleaseCard) {
    if (card.filter) applyFilter(card.filter);
  }

  const resultsLabel = loading
    ? "Loading"
    : showHomeLanding
      ? "Latest releases"
      : `${navFilterLabel(filter, caseNameById)} · ${combinedCount.toLocaleString(
          "en-US",
        )} result${combinedCount === 1 ? "" : "s"}`;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="type-overline">Counter-Strike 2 · Catalog</p>
        <button
          type="button"
          onClick={() => applyFilter({ section: "home" })}
          className="block text-left"
        >
          <h1 className="type-page-title transition hover:text-[var(--accent)]">
            Skin Database
          </h1>
        </button>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
          Browse the live CS2 item catalog — skins, cases, keys, stickers,
          agents, and more. Data from ByMykel CSGO-API.
        </p>
      </header>

      <CatalogNavRail
        filter={filter}
        items={items}
        collections={collections}
        onApplyFilter={applyFilter}
        onNavigateCollection={(id) => router.push(collectionHref(id))}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          value={query}
          onChange={setQuery}
          ariaLabel="Search catalog"
          placeholder="Search by name, weapon, pattern…"
        />
        {showSort ? (
          <CatalogSortSelect value={sort} onChange={applySort} />
        ) : null}
        <p className="type-overline shrink-0 sm:text-right">{resultsLabel}</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--warn)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <SkeletonCardGrid count={8} />
      ) : showHomeLanding ? (
        <LatestReleases cards={latestReleases} onActivate={onReleaseActivate} />
      ) : pageRows.length === 0 && !caseContents?.showGoldCard ? (
        <EmptyState
          title="No results"
          description="Nothing matches this search. Try a different term or pick another category."
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {caseContents?.showGoldCard ? (
              <li>
                <RareSpecialItemsCard
                  crateName={
                    caseContents.crate?.name ??
                    caseNameById.get(caseContents.crateId) ??
                    "Case"
                  }
                  crateId={caseContents.crateId}
                  items={caseContents.gold.map(toContainsItem)}
                  lootImage={caseContents.crate?.lootListImage ?? null}
                />
              </li>
            ) : null}
            {pageRows.map((row) =>
              row.type === "collection" ? (
                <CollectionCard
                  key={`collection:${row.data.id}`}
                  id={row.data.id}
                  image={row.data.image}
                  name={row.data.name}
                  itemCount={row.data.itemCount}
                />
              ) : (
                <CatalogCard
                  key={`${row.data.kind}:${row.data.id}`}
                  item={row.data}
                  formatUsdRange={formatUsdRange}
                  onWeaponClick={(weaponName, weaponCategory) => {
                    const next = navFilterForWeapon(weaponCategory, weaponName);
                    if (next) {
                      setQuery("");
                      applyFilter(next);
                    }
                  }}
                />
              ),
            )}
          </ul>

          {canShowMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((n) => n + PAGE_SIZE)}
                className="hud-panel-quiet px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]/45 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                Show more
                <span className="type-overline ml-2">
                  {(combinedCount - visible).toLocaleString("en-US")} left
                </span>
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
