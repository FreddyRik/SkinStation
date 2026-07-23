"use client";

import { useEffect, useMemo, useState } from "react";
import { formatFloat, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/currency";
import type { ComputeTradeUpResult, TradeUpOutcome } from "@/lib/tradeup/types";
import { SteamMarketLink } from "@/components/SteamMarketLink";
import { BuffMarketLink } from "@/components/BuffMarketLink";
import { formatPhaseShort, phaseAccent } from "@/lib/cs-catalog/phase";

type OutcomeSort =
  | "by_collection"
  | "best_profit"
  | "biggest_loss"
  | "highest_probability"
  | "lowest_probability";

type OutcomeView = "list" | "grid";

const OUTCOME_VIEW_STORAGE_KEY = "inventory-tracker-tradeup-outcome-view";

const SORT_OPTIONS: Array<{ value: OutcomeSort; label: string }> = [
  { value: "by_collection", label: "Separated by collection" },
  { value: "best_profit", label: "Best profit" },
  { value: "biggest_loss", label: "Biggest loss" },
  { value: "highest_probability", label: "Highest probability" },
  { value: "lowest_probability", label: "Lowest probability" },
];

function outcomeDelta(o: TradeUpOutcome, totalCost: number): number | null {
  if (o.price == null || !Number.isFinite(o.price)) return null;
  return o.price - totalCost;
}

function sortOutcomes(
  outcomes: TradeUpOutcome[],
  sort: OutcomeSort,
  totalCost: number,
): TradeUpOutcome[] {
  const list = [...outcomes];
  const byName = (a: TradeUpOutcome, b: TradeUpOutcome) =>
    a.name.localeCompare(b.name) ||
    (a.phase ?? "").localeCompare(b.phase ?? "");

  switch (sort) {
    case "best_profit":
      return list.sort((a, b) => {
        const da = outcomeDelta(a, totalCost);
        const db = outcomeDelta(b, totalCost);
        if (da == null && db == null) return byName(a, b);
        if (da == null) return 1;
        if (db == null) return -1;
        return db - da || byName(a, b);
      });
    case "biggest_loss":
      return list.sort((a, b) => {
        const da = outcomeDelta(a, totalCost);
        const db = outcomeDelta(b, totalCost);
        if (da == null && db == null) return byName(a, b);
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db || byName(a, b);
      });
    case "highest_probability":
      return list.sort(
        (a, b) => b.probability - a.probability || byName(a, b),
      );
    case "lowest_probability":
      return list.sort(
        (a, b) => a.probability - b.probability || byName(a, b),
      );
    case "by_collection":
    default:
      return list.sort(
        (a, b) =>
          a.groupName.localeCompare(b.groupName) ||
          b.probability - a.probability ||
          byName(a, b),
      );
  }
}

function groupByCollection(
  outcomes: TradeUpOutcome[],
): Array<{ groupId: string; groupName: string; items: TradeUpOutcome[] }> {
  const map = new Map<
    string,
    { groupId: string; groupName: string; items: TradeUpOutcome[] }
  >();
  for (const o of outcomes) {
    let bucket = map.get(o.groupId);
    if (!bucket) {
      bucket = { groupId: o.groupId, groupName: o.groupName, items: [] };
      map.set(o.groupId, bucket);
    }
    bucket.items.push(o);
  }
  return [...map.values()].sort((a, b) =>
    a.groupName.localeCompare(b.groupName),
  );
}

function readStoredOutcomeView(): OutcomeView {
  if (typeof window === "undefined") return "list";
  try {
    const v = window.localStorage.getItem(OUTCOME_VIEW_STORAGE_KEY);
    return v === "grid" || v === "list" ? v : "list";
  } catch {
    return "list";
  }
}

function writeStoredOutcomeView(view: OutcomeView) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTCOME_VIEW_STORAGE_KEY, view);
  } catch {
    // ignore
  }
}

function OutcomePhaseBadge({ phase }: { phase: string | null }) {
  if (!phase) return null;
  const short = formatPhaseShort(phase) ?? phase;
  const accent = phaseAccent(phase);
  return (
    <span
      className="inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color: accent, background: `${accent}22` }}
      title={phase}
    >
      {short}
    </span>
  );
}

function OutcomeTitle({
  outcome: o,
  className = "",
}: {
  outcome: TradeUpOutcome;
  className?: string;
}) {
  return (
    <p className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      <span className="min-w-0 truncate font-medium text-[var(--text)]">
        {o.variant === "stattrak" ? "StatTrak™ " : ""}
        {o.name}
      </span>
      <OutcomePhaseBadge phase={o.phase} />
    </p>
  );
}

function OutcomeMarketLinks({
  marketHashName,
  goodsId,
  className = "",
}: {
  marketHashName: string;
  goodsId: number | null;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}
    >
      <SteamMarketLink
        marketHashName={marketHashName}
        className="text-[10px] font-medium"
      />
      {goodsId != null && goodsId > 0 ? (
        <BuffMarketLink goodsId={goodsId} className="text-[10px] font-medium" />
      ) : null}
    </span>
  );
}

export function TradeUpResultsPanel({
  result,
  currency,
  filledCount,
  slotCount,
  goodsIds = {},
}: {
  result: ComputeTradeUpResult | null;
  currency: Currency;
  filledCount: number;
  slotCount: number;
  goodsIds?: Record<string, number>;
}) {
  const [sort, setSort] = useState<OutcomeSort>("by_collection");
  const [view, setView] = useState<OutcomeView>("list");

  useEffect(() => {
    setView(readStoredOutcomeView());
  }, []);

  const sorted = useMemo(() => {
    if (!result || !result.ok) return [];
    return sortOutcomes(result.outcomes, sort, result.totalCost);
  }, [result, sort]);

  const collectionGroups = useMemo(() => {
    if (sort !== "by_collection") return null;
    return groupByCollection(sorted);
  }, [sorted, sort]);

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
        Select {slotCount} skins to calculate odds and expected value.
        {filledCount > 0 ? (
          <span className="mt-1 block">
            {filledCount}/{slotCount} filled
          </span>
        ) : null}
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-[var(--warn)]/40 bg-[var(--warn)]/5 p-4 text-sm text-[var(--warn)]">
        {result.error}
      </div>
    );
  }

  const profitPositive = result.profit >= 0;
  const isCovert = result.inputTier === "covert";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Average normalized float
          </p>
          <p className="font-mono text-lg text-[var(--text)]">
            {result.avgNormalized.toFixed(6)}
          </p>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {result.outcomes.length} possible outcome
          {result.outcomes.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Total cost" value={formatMoney(result.totalCost, currency)} />
        <SummaryStat
          label="Expected value"
          value={formatMoney(result.expectedValue, currency)}
        />
        <SummaryStat
          label="Profit / loss"
          value={formatMoney(result.profit, currency)}
          accent={profitPositive ? "var(--accent)" : "var(--danger)"}
        />
        <SummaryStat
          label="ROI"
          value={
            result.roi == null
              ? "—"
              : `${(result.roi * 100).toFixed(1)}%`
          }
          accent={profitPositive ? "var(--accent)" : "var(--danger)"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--text)]">Possible outcomes</p>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-0.5"
            role="group"
            aria-label="Outcome layout"
          >
            {(["list", "grid"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    writeStoredOutcomeView(v);
                    setView(v);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {v === "list" ? "List" : "Grid"}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as OutcomeSort)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--text)]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === "by_collection" && isCovert
                    ? "Separated by case"
                    : opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/80 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Float</th>
                <th className="px-3 py-2 font-medium">Wear</th>
                <th className="px-3 py-2 font-medium">Odds</th>
                <th className="px-3 py-2 font-medium text-right">Price</th>
                <th className="px-3 py-2 font-medium text-right">P/L</th>
                <th className="px-3 py-2 font-medium">Market</th>
              </tr>
            </thead>
            <tbody>
              {collectionGroups
                ? collectionGroups.map((group) => (
                    <OutcomeGroupRows
                      key={group.groupId}
                      groupName={group.groupName}
                      outcomes={group.items}
                      totalCost={result.totalCost}
                      currency={currency}
                      goodsIds={goodsIds}
                      colSpan={7}
                    />
                  ))
                : sorted.map((o) => (
                    <OutcomeRow
                      key={o.skinId}
                      outcome={o}
                      totalCost={result.totalCost}
                      currency={currency}
                      goodsIds={goodsIds}
                      showGroup
                    />
                  ))}
            </tbody>
          </table>
        </div>
      ) : collectionGroups ? (
        <div className="flex flex-col gap-5">
          {collectionGroups.map((group) => (
            <div key={group.groupId} className="flex flex-col gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                {group.groupName}
              </h3>
              <OutcomeGrid
                outcomes={group.items}
                totalCost={result.totalCost}
                currency={currency}
                goodsIds={goodsIds}
                showGroup={false}
              />
            </div>
          ))}
        </div>
      ) : (
        <OutcomeGrid
          outcomes={sorted}
          totalCost={result.totalCost}
          currency={currency}
          goodsIds={goodsIds}
          showGroup
        />
      )}
    </div>
  );
}

function OutcomeGrid({
  outcomes,
  totalCost,
  currency,
  goodsIds,
  showGroup,
}: {
  outcomes: TradeUpOutcome[];
  totalCost: number;
  currency: Currency;
  goodsIds: Record<string, number>;
  showGroup: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {outcomes.map((o) => {
        const delta = outcomeDelta(o, totalCost);
        const goodsId = goodsIds[o.marketHashName] ?? null;
        return (
          <li key={o.skinId}>
            <article className="flex h-full flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3">
              <div className="flex h-24 items-center justify-center rounded-lg bg-[var(--bg)]">
                {o.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.image}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <OutcomeTitle
                  outcome={o}
                  className="text-xs leading-snug"
                />
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                  {o.isKnife ? "Knife" : o.isGlove ? "Gloves" : "Skin"}
                  {showGroup ? ` · ${o.groupName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: o.wearColor,
                    background: `${o.wearColor}22`,
                  }}
                >
                  {o.wearAbbr}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {formatFloat(o.outputFloat)}
                </span>
              </div>
              <div className="mt-auto flex flex-col gap-0.5 border-t border-[var(--border)]/60 pt-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)]">Odds</span>
                  <span className="font-mono text-[var(--text)]">
                    {(o.probability * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)]">Price</span>
                  <span className="font-mono text-[var(--text)]">
                    {formatMoney(o.price, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)]">P/L</span>
                  <span
                    className="font-mono"
                    style={{
                      color:
                        delta == null
                          ? "var(--text-muted)"
                          : delta >= 0
                            ? "var(--accent)"
                            : "var(--danger)",
                    }}
                  >
                    {delta == null
                      ? "—"
                      : `${delta >= 0 ? "+" : ""}${formatMoney(delta, currency)}`}
                  </span>
                </div>
                <div className="pt-1">
                  <OutcomeMarketLinks
                    marketHashName={o.marketHashName}
                    goodsId={goodsId}
                  />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function OutcomeGroupRows({
  groupName,
  outcomes,
  totalCost,
  currency,
  goodsIds,
  colSpan,
}: {
  groupName: string;
  outcomes: TradeUpOutcome[];
  totalCost: number;
  currency: Currency;
  goodsIds: Record<string, number>;
  colSpan: number;
}) {
  return (
    <>
      <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
        <td
          colSpan={colSpan}
          className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
        >
          {groupName}
        </td>
      </tr>
      {outcomes.map((o) => (
        <OutcomeRow
          key={o.skinId}
          outcome={o}
          totalCost={totalCost}
          currency={currency}
          goodsIds={goodsIds}
          showGroup={false}
        />
      ))}
    </>
  );
}

function OutcomeRow({
  outcome: o,
  totalCost,
  currency,
  goodsIds,
  showGroup,
}: {
  outcome: TradeUpOutcome;
  totalCost: number;
  currency: Currency;
  goodsIds: Record<string, number>;
  showGroup: boolean;
}) {
  const delta = outcomeDelta(o, totalCost);
  const goodsId = goodsIds[o.marketHashName] ?? null;
  return (
    <tr className="border-b border-[var(--border)]/70 last:border-0">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--bg-elevated)]">
            {o.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={o.image}
                alt=""
                className="h-full w-full object-contain p-0.5"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <OutcomeTitle outcome={o} className="text-sm" />
            <p className="truncate text-[10px] text-[var(--text-muted)]">
              {o.isKnife ? "Knife" : o.isGlove ? "Gloves" : "Skin"}
              {showGroup ? ` · ${o.groupName}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-[var(--text-muted)]">
        {formatFloat(o.outputFloat)}
      </td>
      <td className="px-3 py-2">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            color: o.wearColor,
            background: `${o.wearColor}22`,
          }}
        >
          {o.wearAbbr}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs">
        {(o.probability * 100).toFixed(2)}%
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {formatMoney(o.price, currency)}
      </td>
      <td
        className="px-3 py-2 text-right font-mono text-xs"
        style={{
          color:
            delta == null
              ? "var(--text-muted)"
              : delta >= 0
                ? "var(--accent)"
                : "var(--danger)",
        }}
      >
        {delta == null
          ? "—"
          : `${delta >= 0 ? "+" : ""}${formatMoney(delta, currency)}`}
      </td>
      <td className="px-3 py-2">
        <OutcomeMarketLinks
          marketHashName={o.marketHashName}
          goodsId={goodsId}
        />
      </td>
    </tr>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]/70 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-lg font-semibold text-[var(--text)]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
