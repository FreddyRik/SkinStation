"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaceitLevelBadge } from "@/components/FaceitLevelBadge";
import { ItemHoverCard } from "@/components/ItemHoverCard";
import { InventoryExportButton } from "@/components/InventoryExportButton";
import { InventoryViewToggle } from "@/components/InventoryViewToggle";
import { PriceSourceToggle } from "@/components/PriceSourceToggle";
import { ReputationBadges } from "@/components/ReputationBadges";
import { ShareCardDialog } from "@/components/ShareCardDialog";
import { SteamMarketLink } from "@/components/SteamMarketLink";
import { BuffMarketLink } from "@/components/BuffMarketLink";
import type { Currency } from "@/lib/currency";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  INVENTORY_SYNCING_EVENT,
  parseCurrency,
  readStoredCurrency,
} from "@/lib/currency";
import { convertMoney, convertMoneyOrZero } from "@/lib/fx";
import { formatDate, formatFloat, formatMoney } from "@/lib/format";
import { useUsdToEurRate } from "@/hooks/useUsdToEurRate";
import {
  DEFAULT_INVENTORY_VIEW,
  type InventoryView,
  readStoredInventoryView,
  writeStoredInventoryView,
} from "@/lib/inventory-view";
import {
  hasStickers,
  isKnifeOrGlove,
  isSouvenir,
  isStatTrak,
  itemCanListOnMarket,
  itemSupportsFloat,
  itemSupportsStickers,
} from "@/lib/item-flags";
import {
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_LABELS,
  itemPrice,
  itemPriceOrZero,
  parsePriceSource,
  portfolioTotalFromItems,
  priceSourceAccent,
  readStoredPriceSource,
  type PriceSource,
  writeStoredPriceSource,
} from "@/lib/price-source";
import { canLinkBuffMarket, canLinkSteamMarket } from "@/lib/steam-market/listing";
import { isSteamwebapiLimitMessage } from "@/lib/steamwebapi/errors";

export type InventoryItemView = {
  id: string;
  assetId: string;
  marketHashName: string;
  name: string;
  iconUrl: string | null;
  exterior: string | null;
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  stickers: Array<{
    slot?: number;
    name?: string;
    wear?: number;
    iconUrl?: string | null;
    steamPrice?: number | null;
    buffPrice?: number | null;
  }>;
  steamPrice: number | null;
  buffPrice: number | null;
  /** Buff163 goods id when resolved from the community ID map. */
  buffGoodsId?: number | null;
  rarity: string | null;
  type: string | null;
  tradable: boolean;
  marketable: boolean;
};

export type SnapshotView = {
  id: string;
  currency: Currency;
  itemCount: number;
  totalSteam: number;
  totalBuff: number;
  createdAt: string;
};

export type ProfileView = {
  id: string;
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  currency: Currency;
  faceitUrl: string | null;
  faceitLevel: number | null;
  faceitElo: number | null;
  faceitNickname: string | null;
  faceitFound: boolean;
  faceitFetchedAt: string | null;
  leetifyUrl: string | null;
  leetifyName: string | null;
  leetifyRating: number | null;
  leetifyFound: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncing: boolean;
};

type SortKey = "value" | "name" | "float";

type InventoryFilters = {
  onlyStatTrak: boolean;
  onlySouvenir: boolean;
  onlyKnivesGloves: boolean;
  hasStickers: boolean;
};

const FILTER_DEFAULTS: InventoryFilters = {
  onlyStatTrak: false,
  onlySouvenir: false,
  onlyKnivesGloves: false,
  hasStickers: false,
};

export function InventoryDashboard({
  profile,
  items,
  snapshots,
  totals,
  cooldownMs,
}: {
  profile: ProfileView;
  items: InventoryItemView[];
  snapshots: SnapshotView[];
  totals: { itemCount: number; totalSteam: number; totalBuff: number };
  cooldownMs: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [filters, setFilters] = useState<InventoryFilters>(FILTER_DEFAULTS);
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const storageCurrency = profile.currency;
  const usdToEur = useUsdToEurRate();
  const [priceSource, setPriceSource] =
    useState<PriceSource>(DEFAULT_PRICE_SOURCE);
  const [inventoryView, setInventoryView] = useState<InventoryView>(
    DEFAULT_INVENTORY_VIEW,
  );
  const [syncing, setSyncing] = useState(profile.syncing);
  const [error, setError] = useState<string | null>(
    profile.lastError && !isSteamwebapiLimitMessage(profile.lastError)
      ? profile.lastError
      : null,
  );
  const [note, setNote] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(
    isSteamwebapiLimitMessage(profile.lastError) ? profile.lastError : null,
  );
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setPriceSource(readStoredPriceSource());
    setInventoryView(readStoredInventoryView());
    setCurrency(readStoredCurrency());
  }, []);

  useEffect(() => {
    setSyncing(profile.syncing);
    if (isSteamwebapiLimitMessage(profile.lastError)) {
      setWarning(profile.lastError);
      setError(null);
    } else {
      setError(profile.lastError);
      if (!profile.lastError) setWarning(null);
    }
  }, [profile.syncing, profile.lastError]);

  useEffect(() => {
    function onCurrency(e: Event) {
      const next = (e as CustomEvent<Currency>).detail;
      if (!next || next === currency) return;
      // Display-only FX conversion — no inventory re-sync.
      setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, [currency]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<boolean>(INVENTORY_SYNCING_EVENT, { detail: syncing }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent<boolean>(INVENTORY_SYNCING_EVENT, { detail: false }),
      );
    };
  }, [syncing]);

  const displayItems = useMemo(() => {
    if (storageCurrency === currency) return items;
    return items.map((item) => ({
      ...item,
      steamPrice: convertMoney(
        item.steamPrice,
        storageCurrency,
        currency,
        usdToEur,
      ),
      buffPrice: convertMoney(
        item.buffPrice,
        storageCurrency,
        currency,
        usdToEur,
      ),
      stickers: item.stickers.map((s) => ({
        ...s,
        steamPrice: convertMoney(
          s.steamPrice,
          storageCurrency,
          currency,
          usdToEur,
        ),
        buffPrice: convertMoney(
          s.buffPrice,
          storageCurrency,
          currency,
          usdToEur,
        ),
      })),
    }));
  }, [items, storageCurrency, currency, usdToEur]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = displayItems;
    if (q) {
      list = list.filter(
        (i) =>
          i.marketHashName.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.type ?? "").toLowerCase().includes(q),
      );
    }
    if (filters.onlyStatTrak) {
      list = list.filter((i) => isStatTrak(i.marketHashName));
    }
    if (filters.onlySouvenir) {
      list = list.filter((i) => isSouvenir(i.marketHashName));
    }
    if (filters.onlyKnivesGloves) {
      list = list.filter((i) => isKnifeOrGlove(i.type, i.marketHashName));
    }
    if (filters.hasStickers) {
      list = list.filter((i) => hasStickers(i.stickers));
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "name") {
        return a.marketHashName.localeCompare(b.marketHashName);
      }
      if (sort === "float") {
        return (a.floatValue ?? 2) - (b.floatValue ?? 2);
      }
      return (
        itemPriceOrZero(b, priceSource) - itemPriceOrZero(a, priceSource)
      );
    });
    return sorted;
  }, [displayItems, query, sort, filters, priceSource]);

  const chartData = snapshots.map((s) => {
    const from = s.currency;
    return {
      time: new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(s.createdAt)),
      Steam: convertMoneyOrZero(s.totalSteam, from, currency, usdToEur),
      Buff: convertMoneyOrZero(s.totalBuff, from, currency, usdToEur),
    };
  });

  async function refresh(force = false) {
    setSyncing(true);
    setError(null);
    setWarning(null);
    setNote(force ? "Force refreshing…" : "Refreshing inventory…");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          force,
          // Keep storing prices in the profile's storage currency; display converts.
          currency: storageCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Refresh failed");
      }
      if (typeof data.warning === "string" && data.warning) {
        setWarning(data.warning);
      }
      if (data.skippedCooldown) {
        setNote(
          `Cooldown active (${Math.round(cooldownMs / 1000)}s). Showing cached inventory.`,
        );
      } else {
        const source = parsePriceSource(priceSource);
        const total =
          source === "buff" ? data.totalBuff : data.totalSteam;
        const syncedCurrency = parseCurrency(data.currency, storageCurrency);
        setNote(
          `Synced ${data.itemCount} items · ${PRICE_SOURCE_LABELS[source]} ${formatMoney(
            convertMoney(total, syncedCurrency, currency, usdToEur),
            currency,
          )}`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setSyncing(false);
    }
  }

  function onPriceSourceChange(next: PriceSource) {
    writeStoredPriceSource(next);
    setPriceSource(next);
  }

  function onInventoryViewChange(next: InventoryView) {
    writeStoredInventoryView(next);
    setInventoryView(next);
  }

  function toggleFilter(key: keyof InventoryFilters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const portfolioTotal = portfolioTotalFromItems(displayItems, priceSource);
  const portfolioAccent = priceSourceAccent(priceSource);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)]/70 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--border)]">
                  CS
                </div>
              )}
              {profile.faceitFound && profile.faceitLevel != null ? (
                <div className="absolute -bottom-1.5 -right-1.5">
                  <FaceitLevelBadge
                    level={profile.faceitLevel}
                    href={profile.faceitUrl}
                    size="sm"
                  />
                </div>
              ) : profile.faceitFetchedAt && !profile.faceitFound ? (
                <div
                  className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-[var(--warn)]/20 text-sm"
                  title="No FACEIT profile found"
                >
                  🤨
                </div>
              ) : null}
            </div>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.personaName ?? profile.steamId}
              </h1>
              <ReputationBadges
                reputation={{
                  steamUrl: profile.profileUrl,
                  faceitUrl: profile.faceitUrl,
                  faceitLevel: profile.faceitLevel,
                  faceitElo: profile.faceitElo,
                  faceitNickname: profile.faceitNickname,
                  faceitFound: profile.faceitFound,
                  faceitFetchedAt: profile.faceitFetchedAt,
                  leetifyUrl: profile.leetifyUrl,
                  leetifyName: profile.leetifyName,
                  leetifyRating: profile.leetifyRating,
                  leetifyFound: profile.leetifyFound,
                }}
              />
              <p className="text-sm text-[var(--text-muted)]">
                Last synced {formatDate(profile.lastSyncedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <PriceSourceToggle
                value={priceSource}
                onChange={onPriceSourceChange}
                disabled={syncing}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => refresh(false)}
                disabled={syncing}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#042f2e] hover:bg-[var(--accent-dim)] disabled:opacity-50"
              >
                {syncing ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => refresh(true)}
                disabled={syncing && !profile.syncing}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:border-[var(--warn)]/50 hover:text-[var(--warn)] disabled:opacity-50"
                title="Bypass cooldown / clear a stuck sync"
              >
                Force
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                disabled={items.length === 0}
                className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20 disabled:opacity-50"
                title="Generate a downloadable inventory Wrapped card"
              >
                Share card
              </button>
            </div>
          </div>
        </div>
      </section>

      <ShareCardDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        profile={profile}
        items={displayItems}
        currency={currency}
        priceSource={priceSource}
      />

      {(error || note || warning) && (
        <div className="space-y-1 text-sm">
          {note && <p className="text-[var(--steam)]">{note}</p>}
          {warning && <p className="text-[var(--warn)]">{warning}</p>}
          {error && <p className="text-[var(--danger)]">{error}</p>}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Items" value={String(totals.itemCount)} />
        <StatCard
          label={PRICE_SOURCE_LABELS[priceSource]}
          value={formatMoney(portfolioTotal, currency)}
          accent={portfolioAccent}
        />
      </section>

      {chartData.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-medium">Portfolio value over time</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(36,51,44,0.8)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#8fa399", fontSize: 11 }}
                  hide={chartData.length > 8}
                />
                <YAxis tick={{ fill: "#8fa399", fontSize: 11 }} width={56} />
                <Tooltip
                  contentStyle={{
                    background: "#121a17",
                    border: "1px solid #24332c",
                    borderRadius: 8,
                  }}
                  formatter={(value) =>
                    formatMoney(
                      typeof value === "number" ? value : Number(value),
                      currency,
                    )
                  }
                />
                <Legend />
                {priceSource === "steam" ? (
                  <Line
                    type="monotone"
                    dataKey="Steam"
                    stroke="#66c0f4"
                    strokeWidth={2}
                    dot={false}
                  />
                ) : (
                  <Line
                    type="monotone"
                    dataKey="Buff"
                    stroke="var(--buff)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">
            Inventory{" "}
            <span className="text-[var(--text-muted)]">({filtered.length})</span>
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <InventoryExportButton
              items={displayItems}
              disabled={syncing}
              meta={{
                steamId: profile.steamId,
                personaName: profile.personaName,
                currency,
                priceSource,
                lastSyncedAt: profile.lastSyncedAt,
                filtered: false,
              }}
            />
            <InventoryViewToggle
              value={inventoryView}
              onChange={onInventoryViewChange}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name…"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="value">Sort by value</option>
              <option value="name">Sort by name</option>
              <option value="float">Sort by float</option>
            </select>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Inventory filters"
        >
          <FilterToggle
            label="Only StatTrak™"
            active={filters.onlyStatTrak}
            onClick={() => toggleFilter("onlyStatTrak")}
          />
          <FilterToggle
            label="Only Souvenir"
            active={filters.onlySouvenir}
            onClick={() => toggleFilter("onlySouvenir")}
          />
          <FilterToggle
            label="Only Knives/Gloves"
            active={filters.onlyKnivesGloves}
            onClick={() => toggleFilter("onlyKnivesGloves")}
          />
          <FilterToggle
            label="Has Stickers"
            active={filters.hasStickers}
            onClick={() => toggleFilter("hasStickers")}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
            {items.length === 0
              ? "No items yet. Hit Refresh to sync from Steam."
              : "No items match these filters."}
          </p>
        ) : (
          <ul
            className={
              inventoryView === "list"
                ? "flex flex-col gap-1.5"
                : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {filtered.map((item) => {
              const showPrice = itemCanListOnMarket(item);
              const price = showPrice ? itemPrice(item, priceSource) : null;
              const floatProviderWarning = warning ?? profile.lastError;
              return (
                <li
                  key={item.id}
                  className={inventoryView === "grid" ? "h-full" : undefined}
                >
                  <ItemHoverCard
                    item={item}
                    currency={currency}
                    priceSource={priceSource}
                    floatProviderWarning={floatProviderWarning}
                  >
                    {inventoryView === "list" ? (
                      <InventoryListRow
                        item={item}
                        price={price}
                        showPrice={showPrice}
                        currency={currency}
                        priceSource={priceSource}
                        accent={portfolioAccent}
                      />
                    ) : (
                      <InventoryGridCard
                        item={item}
                        price={price}
                        showPrice={showPrice}
                        currency={currency}
                        priceSource={priceSource}
                        accent={portfolioAccent}
                      />
                    )}
                  </ItemHoverCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function InventoryGridCard({
  item,
  price,
  showPrice,
  currency,
  priceSource,
  accent,
}: {
  item: InventoryItemView;
  price: number | null;
  showPrice: boolean;
  currency: Currency;
  priceSource: PriceSource;
  accent: string;
}) {
  const showFloat =
    item.floatValue != null ||
    item.paintSeed != null ||
    itemSupportsFloat(item.type, item.marketHashName);
  const showPaintSeed = showFloat && item.paintSeed != null;
  const appliedStickers =
    itemSupportsStickers(item.type, item.marketHashName) &&
    (item.stickers?.length ?? 0) > 0
      ? item.stickers
      : [];
  const steamMarketLink =
    priceSource === "steam" && canLinkSteamMarket(item);
  const buffMarketLink = priceSource === "buff" && canLinkBuffMarket(item);

  return (
    <div className="flex h-full cursor-default gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 transition hover:border-[var(--accent)]/35 hover:bg-[var(--bg-panel)]/80">
      {item.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.iconUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg bg-[var(--bg)] object-contain"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-lg bg-[var(--border)]" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className="truncate text-sm font-medium leading-snug"
          title={item.marketHashName}
        >
          {item.marketHashName}
        </p>
        <p className="truncate text-xs leading-snug text-[var(--text-muted)]">
          {item.exterior ?? item.type ?? "—"}
          {item.rarity ? ` · ${item.rarity}` : ""}
        </p>
        {/* Reserved meta rows keep every card the same height in a grid row */}
        <p className="min-h-4 truncate text-xs leading-4 text-[var(--text-muted)]">
          {showFloat
            ? `Float ${formatFloat(item.floatValue)}${
                showPaintSeed ? ` · Pattern ${item.paintSeed}` : ""
              }`
            : "\u00A0"}
        </p>
        <div className="mt-auto flex flex-col gap-1">
          <div className="flex min-h-4 items-center justify-between gap-2">
            <p
              className="min-w-0 truncate text-xs font-medium leading-4"
              style={showPrice ? { color: accent } : undefined}
            >
              {showPrice
                ? `${PRICE_SOURCE_LABELS[priceSource]} ${formatMoney(price, currency)}`
                : "\u00A0"}
            </p>
            {steamMarketLink ? (
              <SteamMarketLink
                marketHashName={item.marketHashName}
                className="shrink-0 text-[11px] font-medium"
              />
            ) : buffMarketLink && item.buffGoodsId != null ? (
              <BuffMarketLink
                goodsId={item.buffGoodsId}
                className="shrink-0 text-[11px] font-medium"
              />
            ) : (
              <span className="min-h-4 shrink-0" aria-hidden>
                {"\u00A0"}
              </span>
            )}
          </div>
          <p className="min-h-4 truncate text-[11px] leading-4 text-[var(--text-muted)]">
            {appliedStickers.length > 0
              ? `${appliedStickers.length} sticker${
                  appliedStickers.length === 1 ? "" : "s"
                } — hover for detail`
              : "\u00A0"}
          </p>
        </div>
      </div>
    </div>
  );
}

function InventoryListRow({
  item,
  price,
  showPrice,
  currency,
  priceSource,
  accent,
}: {
  item: InventoryItemView;
  price: number | null;
  showPrice: boolean;
  currency: Currency;
  priceSource: PriceSource;
  accent: string;
}) {
  const showFloat =
    item.floatValue != null ||
    item.paintSeed != null ||
    itemSupportsFloat(item.type, item.marketHashName);
  const appliedStickers = itemSupportsStickers(item.type, item.marketHashName)
    ? (item.stickers ?? [])
    : [];
  const stickerIcons = appliedStickers.filter((s) => s.iconUrl);
  const stickerCount = appliedStickers.length;
  const steamMarketLink =
    priceSource === "steam" && canLinkSteamMarket(item);
  const buffMarketLink = priceSource === "buff" && canLinkBuffMarket(item);

  return (
    <div className="flex cursor-default items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3 py-2 transition hover:border-[var(--accent)]/35 hover:bg-[var(--bg-panel)]/80">
      {item.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.iconUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md bg-[var(--bg)] object-contain"
        />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-md bg-[var(--border)]" />
      )}

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium"
          title={item.marketHashName}
        >
          {item.marketHashName}
        </p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {item.exterior ?? item.type ?? "—"}
          {item.rarity ? ` · ${item.rarity}` : ""}
          {showFloat
            ? ` · Float ${formatFloat(item.floatValue)}`
            : ""}
          {showFloat && item.paintSeed != null
            ? ` · Pattern ${item.paintSeed}`
            : ""}
        </p>
      </div>

      {stickerCount > 0 && (
        <div
          className="hidden shrink-0 items-center gap-1 sm:flex"
          title={`${stickerCount} sticker${stickerCount === 1 ? "" : "s"} — hover for detail`}
        >
          {stickerIcons.length > 0
            ? stickerIcons.slice(0, 4).map((sticker, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`sticker-${idx}-${sticker.slot ?? "x"}-${sticker.name ?? ""}`}
                  src={sticker.iconUrl!}
                  alt=""
                  className="h-5 w-5 rounded-sm bg-[var(--bg)] object-contain"
                />
              ))
            : (
              <span className="text-[11px] text-[var(--text-muted)]">
                {stickerCount} sticker{stickerCount === 1 ? "" : "s"}
              </span>
            )}
          {stickerIcons.length > 4 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              +{stickerIcons.length - 4}
            </span>
          )}
        </div>
      )}

      {steamMarketLink ? (
        <SteamMarketLink
          marketHashName={item.marketHashName}
          className="hidden shrink-0 text-[11px] font-medium sm:inline-flex"
        />
      ) : buffMarketLink && item.buffGoodsId != null ? (
        <BuffMarketLink
          goodsId={item.buffGoodsId}
          className="hidden shrink-0 text-[11px] font-medium sm:inline-flex"
        />
      ) : null}

      {showPrice && (
        <p
          className="shrink-0 text-right text-sm font-medium tabular-nums"
          style={{ color: accent }}
          title={PRICE_SOURCE_LABELS[priceSource]}
        >
          {formatMoney(price, currency)}
        </p>
      )}
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
        active
          ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
