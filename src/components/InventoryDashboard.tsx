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
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { FaceitLevelBadge } from "@/components/FaceitLevelBadge";
import { ItemHoverCard } from "@/components/ItemHoverCard";
import { PriceSourceToggle } from "@/components/PriceSourceToggle";
import { ReputationBadges } from "@/components/ReputationBadges";
import { ShareCardDialog } from "@/components/ShareCardDialog";
import type { Currency } from "@/lib/currency";
import { parseCurrency, writeStoredCurrency } from "@/lib/currency";
import { formatDate, formatFloat, formatMoney } from "@/lib/format";
import {
  hasStickers,
  isKnifeOrGlove,
  isSouvenir,
  isStatTrak,
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
    skinportPrice?: number | null;
  }>;
  steamPrice: number | null;
  skinportPrice: number | null;
  rarity: string | null;
  type: string | null;
  tradable: boolean;
};

export type SnapshotView = {
  id: string;
  currency: Currency;
  itemCount: number;
  totalSteam: number;
  totalSkinport: number;
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
  totals: { itemCount: number; totalSteam: number; totalSkinport: number };
  cooldownMs: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [filters, setFilters] = useState<InventoryFilters>(FILTER_DEFAULTS);
  const [currency, setCurrency] = useState<Currency>(profile.currency);
  const [priceSource, setPriceSource] =
    useState<PriceSource>(DEFAULT_PRICE_SOURCE);
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
  }, []);

  useEffect(() => {
    setSyncing(profile.syncing);
    setCurrency(profile.currency);
    if (isSteamwebapiLimitMessage(profile.lastError)) {
      setWarning(profile.lastError);
      setError(null);
    } else {
      setError(profile.lastError);
      if (!profile.lastError) setWarning(null);
    }
  }, [profile.syncing, profile.currency, profile.lastError]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
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
  }, [items, query, sort, filters, priceSource]);

  const chartData = snapshots
    .filter((s) => s.currency === currency)
    .map((s) => ({
      time: new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(s.createdAt)),
      Steam: Number(s.totalSteam.toFixed(2)),
      Skinport: Number(s.totalSkinport.toFixed(2)),
    }));

  async function refresh(force = false, nextCurrency: Currency = currency) {
    setSyncing(true);
    setError(null);
    setWarning(null);
    setNote(
      force || nextCurrency !== profile.currency
        ? `Refreshing prices in ${nextCurrency}…`
        : "Refreshing inventory…",
    );
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          force,
          currency: nextCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Refresh failed");
      }
      const syncedCurrency = parseCurrency(data.currency, nextCurrency);
      setCurrency(syncedCurrency);
      writeStoredCurrency(syncedCurrency);
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
          source === "skinport" ? data.totalSkinport : data.totalSteam;
        setNote(
          `Synced ${data.itemCount} items · ${PRICE_SOURCE_LABELS[source]} ${formatMoney(total, syncedCurrency)}`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setSyncing(false);
    }
  }

  function onCurrencyChange(next: Currency) {
    if (next === currency || syncing) return;
    void refresh(true, next);
  }

  function onPriceSourceChange(next: PriceSource) {
    writeStoredPriceSource(next);
    setPriceSource(next);
  }

  function toggleFilter(key: keyof InventoryFilters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const portfolioTotal = portfolioTotalFromItems(items, priceSource);
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
              <CurrencyToggle
                value={currency}
                onChange={onCurrencyChange}
                disabled={syncing}
              />
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
        items={items}
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
                    dataKey="Skinport"
                    stroke="#ff6b35"
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
          <div className="flex flex-col gap-2 sm:flex-row">
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
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const price = itemPrice(item, priceSource);
              return (
                <li key={item.id}>
                  <ItemHoverCard
                    item={item}
                    currency={currency}
                    floatProviderWarning={warning ?? profile.lastError}
                  >
                    <div className="flex cursor-default gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 transition hover:border-[var(--accent)]/35 hover:bg-[var(--bg-panel)]/80">
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
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className="truncate text-sm font-medium"
                          title={item.marketHashName}
                        >
                          {item.marketHashName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.exterior ?? item.type ?? "—"}
                          {item.rarity ? ` · ${item.rarity}` : ""}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Float {formatFloat(item.floatValue)}
                          {item.paintSeed != null
                            ? ` · Pattern ${item.paintSeed}`
                            : ""}
                        </p>
                        <p
                          className="text-xs font-medium"
                          style={{ color: portfolioAccent }}
                        >
                          {PRICE_SOURCE_LABELS[priceSource]}{" "}
                          {formatMoney(price, currency)}
                        </p>
                        {item.stickers?.length > 0 && (
                          <p className="truncate text-[11px] text-[var(--text-muted)]">
                            {item.stickers.length} sticker
                            {item.stickers.length === 1 ? "" : "s"} — hover for
                            detail
                          </p>
                        )}
                      </div>
                    </div>
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
