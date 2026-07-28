"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CATALOG_KIND_LABELS,
  DEFAULT_NAV_FILTER,
  NAV_SECTION_LABELS,
  NAV_SECTION_ORDER,
  OTHER_NAV_ITEMS,
  STICKER_TOURNAMENTS,
  buildLatestReleaseCards,
  formatPhaseShort,
  groupPhasedSkins,
  itemMatchesNavFilter,
  navFilterForWeapon,
  navFilterLabel,
  phaseAccent,
  uniqueWeaponsForSection,
  weaponCases,
  type BrowseCatalogItem,
  type LatestReleaseCard,
  type NavFilter,
  type NavSection,
  type OtherNavKey,
  type SlimCatalogItem,
  type SlimCollection,
} from "@/lib/cs-catalog";

import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { convertMoney } from "@/lib/fx";
import { formatMoney } from "@/lib/format";

const PAGE_SIZE = 96;

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

function collectionHref(id: string) {
  return `/collections/${encodeURIComponent(id)}`;
}

function itemHref(item: SlimCatalogItem) {
  if (item.kind === "collection") return collectionHref(item.id);
  return `/database/${encodeURIComponent(item.id)}`;
}

function KnifeBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-[var(--accent)]"
      title="Knife"
      aria-label="Knife"
    >
      ★
    </span>
  );
}

function rarityBadgeStyle(color: string | null | undefined): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const bg = color?.trim() || "var(--accent)";
  return {
    backgroundColor: bg,
    color: "#0b1220",
    borderColor: "rgba(0,0,0,0.35)",
  };
}

function CatalogCard({
  item,
  onWeaponClick,
  formatUsdRange,
}: {
  item: BrowseCatalogItem;
  onWeaponClick?: (weaponName: string, weaponCategory: string | null) => void;
  formatUsdRange: (min: number | null, max: number | null) => string | null;
}) {
  const href = itemHref(item);
  const isSkin = item.kind === "skin";
  const eyebrow = isSkin
    ? item.weaponName
    : CATALOG_KIND_LABELS[item.kind];
  const title = isSkin
    ? item.patternName || item.name
    : item.name;
  const isPhaseFamily = isSkin && item.phaseFamilySize > 1;
  const phaseShort =
    isSkin && !isPhaseFamily ? formatPhaseShort(item.phase) : null;
  const rarityLabel = item.rarity
    ? [item.rarity.name, isSkin ? item.weaponCategory : null]
        .filter(Boolean)
        .join(" ")
    : null;
  const showFlags = isSkin && (item.stattrak || item.souvenir);
  const weaponFilter =
    isSkin && item.weaponName
      ? navFilterForWeapon(item.weaponCategory, item.weaponName)
      : null;
  const sourceHref =
    item.sourceId && item.sourceKind === "collection"
      ? collectionHref(item.sourceId)
      : item.sourceId && item.sourceKind === "crate"
        ? `/database/${encodeURIComponent(item.sourceId)}`
        : null;
  const normalRange = formatUsdRange(item.priceMinUsd, item.priceMaxUsd);
  const stRange =
    item.kind === "skin" && item.stattrak
      ? formatUsdRange(item.stattrakPriceMinUsd, item.stattrakPriceMaxUsd)
      : null;

  const extraCollections =
    item.sourceKind === "collection" && item.collectionCount > 1
      ? item.collectionCount - 1
      : 0;
  const sourceLabel =
    extraCollections > 0
      ? `${item.sourceName} +${extraCollections}`
      : item.sourceName;
  const sourceTitle =
    extraCollections > 0
      ? `${item.sourceName} and ${extraCollections} more collection${
          extraCollections === 1 ? "" : "s"
        }`
      : item.sourceName
        ? `Open ${item.sourceName}`
        : undefined;

  return (
    <li>
      <article className="flex h-full flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/45 px-3 pb-3 pt-4 text-center transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-panel)]/85">
        <div className="flex w-full flex-col items-center gap-1 px-1">
          {eyebrow ? (
            weaponFilter && onWeaponClick ? (
              <button
                type="button"
                onClick={() =>
                  onWeaponClick(item.weaponName!, item.weaponCategory)
                }
                className="flex max-w-full items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)] transition hover:text-[var(--accent)]"
                title={`Browse all ${eyebrow} skins`}
              >
                {item.isKnife ? <KnifeBadge /> : null}
                <span className="truncate underline-offset-2 hover:underline">
                  {eyebrow}
                </span>
              </button>
            ) : (
              <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {item.isKnife ? <KnifeBadge /> : null}
                <span className="truncate">{eyebrow}</span>
              </p>
            )
          ) : null}
          <Link
            href={href}
            className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug text-[var(--text)] transition hover:text-[var(--accent)] sm:text-lg"
            title={
              isPhaseFamily
                ? `${item.name} · ${item.phaseFamilySize} phases`
                : phaseShort
                  ? `${item.name} · ${item.phase}`
                  : item.name
            }
          >
            {title}
            {phaseShort ? (
              <span
                className="ml-1.5 inline-block align-middle text-[11px] font-bold tracking-wide sm:text-xs"
                style={{ color: phaseAccent(item.phase) }}
              >
                {phaseShort}
              </span>
            ) : null}
          </Link>
          {isPhaseFamily ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              {item.phaseFamilySize} phases
            </p>
          ) : null}
        </div>

        <Link href={href} className="mt-2 flex w-full flex-col items-center gap-1.5">
          {rarityLabel ? (
            <span
              className="inline-flex max-w-full truncate rounded-full border px-3 py-1 text-[11px] font-semibold leading-none sm:text-xs"
              style={rarityBadgeStyle(item.rarity?.color)}
            >
              {rarityLabel}
            </span>
          ) : null}

          {showFlags ? (
            <div className="inline-flex overflow-hidden rounded-full border border-black/40 text-[11px] font-semibold leading-none sm:text-xs">
              {item.stattrak ? (
                <span
                  className="px-2.5 py-1"
                  style={{ backgroundColor: "var(--buff)", color: "#0b1220" }}
                >
                  StatTrak
                </span>
              ) : null}
              {item.stattrak && item.souvenir ? (
                <span className="w-px bg-black/40" aria-hidden />
              ) : null}
              {item.souvenir ? (
                <span
                  className="px-2.5 py-1"
                  style={{ backgroundColor: "var(--warn)", color: "#0b1220" }}
                >
                  Souvenir
                </span>
              ) : null}
            </div>
          ) : null}
        </Link>

        <Link
          href={href}
          className="my-3 flex h-36 w-full items-center justify-center sm:h-44"
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-md"
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No image</span>
          )}
        </Link>

        {normalRange || stRange ? (
          <Link href={href} className="mb-2 flex w-full flex-col items-center gap-0.5">
            {normalRange ? (
              <p className="text-sm font-semibold tabular-nums text-[var(--steam)]">
                {normalRange}
              </p>
            ) : null}
            {stRange ? (
              <p className="text-sm font-semibold tabular-nums text-[var(--buff)]">
                {stRange}
              </p>
            ) : null}
          </Link>
        ) : null}

        {item.sourceName && sourceHref ? (
          <Link
            href={sourceHref}
            className="mt-auto flex w-full items-center justify-center gap-2 border-t border-[var(--border)]/70 pt-2.5 transition hover:text-[var(--accent)]"
            title={sourceTitle}
          >
            {item.sourceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.sourceImage}
                alt=""
                className="h-5 w-5 object-contain opacity-90"
                loading="lazy"
              />
            ) : null}
            <p className="truncate text-[11px] text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline sm:text-xs">
              {sourceLabel}
            </p>
          </Link>
        ) : item.sourceName ? (
          <div
            className="mt-auto flex w-full items-center justify-center gap-2 border-t border-[var(--border)]/70 pt-2.5"
            title={sourceTitle}
          >
            {item.sourceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.sourceImage}
                alt=""
                className="h-5 w-5 object-contain opacity-90"
                loading="lazy"
              />
            ) : null}
            <p className="truncate text-[11px] text-[var(--text-muted)] sm:text-xs">
              {sourceLabel}
            </p>
          </div>
        ) : (
          <div className="mt-auto pt-2.5" aria-hidden />
        )}
      </article>
    </li>
  );
}

function CollectionCard({
  id,
  image,
  name,
  itemCount,
}: {
  id: string;
  image: string | null;
  name: string;
  itemCount: number;
}) {
  return (
    <li>
      <Link
        href={collectionHref(id)}
        className="flex h-full flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/45 px-3 pb-3 pt-4 text-center transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-panel)]/85"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Collection
        </p>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug text-[var(--text)] sm:text-lg">
          {name}
        </p>
        <div className="my-4 flex h-36 w-full items-center justify-center sm:h-44">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No image</span>
          )}
        </div>
        <p className="mt-auto text-[11px] text-[var(--text-muted)] sm:text-xs">
          {itemCount.toLocaleString("en-US")} items
        </p>
      </Link>
    </li>
  );
}

function Chevron() {
  return (
    <svg
      className="h-3 w-3 shrink-0 opacity-70"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropdownItem({
  active,
  onClick,
  children,
  inset = false,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  inset?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full truncate px-3 py-1.5 text-left text-sm transition ${
        inset ? "pl-5" : ""
      } ${
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function NavDropdown({
  section,
  active,
  open,
  onOpen,
  onClose,
  children,
}: {
  section: NavSection;
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="group relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => (open ? onClose() : onOpen())}
        className={`inline-flex items-center gap-1.5 px-2 py-2 text-sm transition sm:px-2.5 ${
          active
            ? "text-[var(--text)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
        }`}
      >
        {NAV_SECTION_LABELS[section]}
        <Chevron />
      </button>
      {/* Invisible hover bridge so the pointer can reach the panel */}
      <div
        role="menu"
        className={`absolute left-0 top-full z-50 pt-1 ${
          open ? "block" : "hidden group-hover:block"
        }`}
      >
        <div className="max-h-[min(70vh,28rem)] min-w-[13rem] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-1.5 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
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
  const [openSection, setOpenSection] = useState<NavSection | null>(null);
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
      } catch (err) {
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
  }, [deferredQuery, filter]);

  const cases = useMemo(() => weaponCases(items), [items]);
  const caseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cases) map.set(c.id, c.name);
    return map;
  }, [cases]);
  const skinCollections = useMemo(
    () => collections.filter((c) => c.isSkinCollection),
    [collections],
  );
  const sortedCollections = useMemo(
    () =>
      [...skinCollections].sort((a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
      ),
    [skinCollections],
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
    return browseItems.filter((item) => {
      if (!isHome && !itemMatchesNavFilter(item, filter)) return false;
      return matchesQuery(itemSearchBlob(item), deferredQuery);
    });
  }, [browseItems, filter, deferredQuery, isHome, showHomeLanding]);

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

  const combinedCount =
    filter.section === "collections" || (isHome && deferredQuery)
      ? filteredItems.length + filteredCollections.length
      : filteredItems.length;

  const pageRows = useMemo(() => {
    type Row =
      | { type: "collection"; data: SlimCollection }
      | { type: "item"; data: BrowseCatalogItem };
    const rows: Row[] = [];
    for (const c of filteredCollections) {
      rows.push({ type: "collection", data: c });
    }
    for (const item of filteredItems) {
      rows.push({ type: "item", data: item });
    }
    return rows.slice(0, visible);
  }, [filteredCollections, filteredItems, visible]);

  const canShowMore = visible < combinedCount;

  function applyFilter(next: NavFilter) {
    setFilter(next);
    setOpenSection(null);
    // Keep shareable URLs for weapon / section deep links.
    if (next.section === "home") {
      router.replace("/database", { scroll: false });
      return;
    }
    const params = new URLSearchParams();
    params.set("section", next.section);
    if (
      (next.section === "pistols" ||
        next.section === "mid_tier" ||
        next.section === "rifles" ||
        next.section === "knives" ||
        next.section === "gloves") &&
      next.weapon
    ) {
      params.set("weapon", next.weapon);
    }
    if (next.section === "cases" && next.crateId) {
      params.set("crate", next.crateId);
    }
    if (next.section === "other") {
      params.set("other", next.other);
    }
    router.replace(`/database?${params.toString()}`, { scroll: false });
  }

  function onReleaseActivate(card: LatestReleaseCard) {
    if (card.filter) applyFilter(card.filter);
  }

  function renderSkinMenu(
    section: "pistols" | "mid_tier" | "rifles" | "knives" | "gloves",
  ) {
    const weapons = uniqueWeaponsForSection(items, section);
    const activeWeapon =
      filter.section === section ? filter.weapon : undefined;
    return (
      <>
        <DropdownItem
          active={filter.section === section && filter.weapon === null}
          onClick={() => applyFilter({ section, weapon: null })}
        >
          All {NAV_SECTION_LABELS[section]}
        </DropdownItem>
        {weapons.length > 0 ? (
          <div className="my-1 border-t border-[var(--border)]" />
        ) : null}
        {weapons.map((weapon) => (
          <DropdownItem
            key={weapon}
            active={activeWeapon === weapon}
            onClick={() => applyFilter({ section, weapon })}
          >
            {weapon}
          </DropdownItem>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => applyFilter({ section: "home" })}
          className="text-left"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] transition hover:text-[var(--accent)] sm:text-3xl">
            Skin Database
          </h1>
        </button>
        <p className="max-w-2xl text-sm text-[var(--text-muted)]">
          Browse the live CS2 item catalog — skins, cases, keys, stickers,
          agents, and more. Data from ByMykel CSGO-API.
        </p>
      </div>

      <nav
        className="relative z-30 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]/70"
        aria-label="Catalog categories"
      >
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="flex min-w-max items-stretch gap-0.5 px-1 py-0.5">
          {NAV_SECTION_ORDER.map((section) => {
            const active = filter.section === section;
            const open = openSection === section;
            return (
              <NavDropdown
                key={section}
                section={section}
                active={active}
                open={open}
                onOpen={() => setOpenSection(section)}
                onClose={() =>
                  setOpenSection((cur) => (cur === section ? null : cur))
                }
              >
                {section === "pistols" ||
                section === "mid_tier" ||
                section === "rifles" ||
                section === "knives" ||
                section === "gloves"
                  ? renderSkinMenu(section)
                  : null}

                {section === "cases" ? (
                  <>
                    <DropdownItem
                      active={
                        filter.section === "cases" && filter.crateId === null
                      }
                      onClick={() =>
                        applyFilter({ section: "cases", crateId: null })
                      }
                    >
                      All Cases
                    </DropdownItem>
                    {cases.length > 0 ? (
                      <div className="my-1 border-t border-[var(--border)]" />
                    ) : null}
                    {cases.map((c) => (
                      <DropdownItem
                        key={c.id}
                        active={
                          filter.section === "cases" && filter.crateId === c.id
                        }
                        onClick={() =>
                          applyFilter({ section: "cases", crateId: c.id })
                        }
                      >
                        {c.name}
                      </DropdownItem>
                    ))}
                  </>
                ) : null}

                {section === "collections" ? (
                  <>
                    <DropdownItem
                      active={filter.section === "collections"}
                      onClick={() => applyFilter({ section: "collections" })}
                    >
                      All Collections
                    </DropdownItem>
                    {sortedCollections.length > 0 ? (
                      <div className="my-1 border-t border-[var(--border)]" />
                    ) : null}
                    {sortedCollections.map((c) => (
                      <DropdownItem
                        key={c.id}
                        active={false}
                        onClick={() => {
                          setOpenSection(null);
                          router.push(collectionHref(c.id));
                        }}
                      >
                        {c.name}
                      </DropdownItem>
                    ))}
                  </>
                ) : null}

                {section === "stickers" ? (
                  <>
                    <DropdownItem
                      active={
                        filter.section === "stickers" &&
                        filter.sticker === "explore"
                      }
                      onClick={() =>
                        applyFilter({
                          section: "stickers",
                          sticker: "explore",
                        })
                      }
                    >
                      Explore Stickers
                    </DropdownItem>
                    <DropdownItem
                      active={
                        filter.section === "stickers" && filter.sticker === "all"
                      }
                      onClick={() =>
                        applyFilter({ section: "stickers", sticker: "all" })
                      }
                    >
                      All Stickers
                    </DropdownItem>
                    <DropdownItem
                      active={
                        filter.section === "stickers" &&
                        filter.sticker === "sticker_capsules"
                      }
                      onClick={() =>
                        applyFilter({
                          section: "stickers",
                          sticker: "sticker_capsules",
                        })
                      }
                    >
                      All Sticker Capsules
                    </DropdownItem>
                    <DropdownItem
                      active={
                        filter.section === "stickers" &&
                        filter.sticker === "autograph_capsules"
                      }
                      onClick={() =>
                        applyFilter({
                          section: "stickers",
                          sticker: "autograph_capsules",
                        })
                      }
                    >
                      All Autograph Capsules
                    </DropdownItem>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Tournament Stickers
                    </p>
                    {STICKER_TOURNAMENTS.map((t) => {
                      const activeTour =
                        filter.section === "stickers" &&
                        typeof filter.sticker === "object" &&
                        filter.sticker.tournament === t.label;
                      return (
                        <DropdownItem
                          key={t.label}
                          inset
                          active={activeTour}
                          onClick={() =>
                            applyFilter({
                              section: "stickers",
                              sticker: { tournament: t.label },
                            })
                          }
                        >
                          {t.label}
                        </DropdownItem>
                      );
                    })}
                  </>
                ) : null}

                {section === "other"
                  ? OTHER_NAV_ITEMS.map((o) => (
                      <DropdownItem
                        key={o.key}
                        active={
                          filter.section === "other" && filter.other === o.key
                        }
                        onClick={() =>
                          applyFilter({ section: "other", other: o.key })
                        }
                      >
                        {o.label}
                      </DropdownItem>
                    ))
                  : null}
              </NavDropdown>
            );
          })}
          </div>
        </div>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, weapon, pattern…"
          className="w-full flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] placeholder:text-[var(--text-muted)] focus:ring-2"
          aria-label="Search catalog"
        />
        <p className="shrink-0 text-xs text-[var(--text-muted)] sm:text-sm">
          {loading
            ? "Loading…"
            : showHomeLanding
              ? "Latest releases"
              : `${navFilterLabel(filter, caseNameById)} · ${combinedCount.toLocaleString("en-US")} result${
                  combinedCount === 1 ? "" : "s"
                }`}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--warn)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
          Loading catalog…
        </p>
      ) : showHomeLanding ? (
        <LatestReleasesSection
          cards={latestReleases}
          onActivate={onReleaseActivate}
        />
      ) : pageRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
          No items match your search.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageRows.map((row) => {
              if (row.type === "collection") {
                const c = row.data;
                return (
                  <CollectionCard
                    key={`collection:${c.id}`}
                    id={c.id}
                    image={c.image}
                    name={c.name}
                    itemCount={c.itemCount}
                  />
                );
              }
              return (
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
              );
            })}
          </ul>
          {canShowMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((n) => n + PAGE_SIZE)}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text)] transition hover:border-[var(--accent)]/40"
              >
                Show more
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function LatestReleasesSection({
  cards,
  onActivate,
}: {
  cards: LatestReleaseCard[];
  onActivate: (card: LatestReleaseCard) => void;
}) {
  if (cards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
        No featured releases yet — pick a category above to browse.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="inline-block rounded-md bg-[var(--accent)]/20 px-3 py-1.5 text-sm font-semibold tracking-wide text-[var(--text)] [font-family:var(--font-share-body),system-ui,sans-serif] sm:text-base">
        <span className="mr-2 text-[var(--accent)]" aria-hidden>
          ◆
        </span>
        Check Out The Latest Item Releases
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const inner = (
            <>
              <div className="flex h-28 items-center justify-center sm:h-32">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
              <div className="space-y-0.5 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text)] sm:text-sm">
                  {card.title}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)] sm:text-[11px]">
                  {card.subtitle}
                </p>
              </div>
            </>
          );

          const className =
            "flex h-full flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-4 transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-panel)]/80";

          return (
            <li key={card.id}>
              {card.href && !card.filter ? (
                <Link href={card.href} className={className}>
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onActivate(card)}
                  className={`w-full ${className}`}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
