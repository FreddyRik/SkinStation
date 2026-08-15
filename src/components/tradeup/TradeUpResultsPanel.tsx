"use client";

import { useEffect, useMemo, useState } from "react";
import { formatFloat, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/currency";
import type { ComputeTradeUpResult, TradeUpOutcome } from "@/lib/tradeup/types";
import { SteamMarketLink } from "@/components/SteamMarketLink";
import { BuffMarketLink } from "@/components/BuffMarketLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import type { SegmentedOption, StatTone } from "@/types/ui";
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

const VIEW_OPTIONS: readonly SegmentedOption<OutcomeView>[] = [
  { value: "list", label: "List" },
  { value: "grid", label: "Grid" },
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

  const maxProbability = useMemo(
    () =>
      sorted.reduce((max, o) => (o.probability > max ? o.probability : max), 0),
    [sorted],
  );

  if (!result) {
    return (
      <EmptyState
        title="Awaiting contract"
        description={`Select ${slotCount} skins to calculate odds and expected value.${
          filledCount > 0 ? ` ${filledCount}/${slotCount} filled.` : ""
        }`}
      />
    );
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 p-4 text-sm text-[var(--warn)]">
        {result.error}
      </div>
    );
  }

  const profitTone: StatTone = result.profit >= 0 ? "positive" : "negative";
  const isCovert = result.inputTier === "covert";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total cost"
          value={formatMoney(result.totalCost, currency)}
        />
        <StatCard
          label="Expected value"
          value={formatMoney(result.expectedValue, currency)}
        />
        <StatCard
          label="Profit / loss"
          value={formatMoney(result.profit, currency)}
          tone={profitTone}
        />
        <StatCard
          label="ROI"
          value={result.roi == null ? "—" : `${(result.roi * 100).toFixed(1)}%`}
          tone={profitTone}
          hint={`Avg float ${result.avgNormalized.toFixed(6)}`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-overline">
          {result.outcomes.length} possible outcome
          {result.outcomes.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Outcome layout"
            size="sm"
            options={VIEW_OPTIONS}
            value={view}
            onChange={(next) => {
              writeStoredOutcomeView(next);
              setView(next);
            }}
          />
          <label className="type-overline flex items-center gap-2">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as OutcomeSort)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/60 px-2.5 py-1.5 text-xs normal-case tracking-normal text-[var(--text)] outline-none transition focus:border-[var(--accent)]/50"
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
        <div className="hud-panel max-h-[36rem] overflow-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[var(--border)] bg-[var(--bg-panel)]/95 backdrop-blur-md">
                <th className="type-overline px-3 py-2.5 text-left">Outcome</th>
                <th className="type-overline px-3 py-2.5 text-left">Float</th>
                <th className="type-overline px-3 py-2.5 text-left">Wear</th>
                <th className="type-overline w-32 px-3 py-2.5 text-left">Odds</th>
                <th className="type-overline px-3 py-2.5 text-right">Price</th>
                <th className="type-overline px-3 py-2.5 text-right">P/L</th>
                <th className="type-overline px-3 py-2.5 text-left">Market</th>
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
                      maxProbability={maxProbability}
                      colSpan={7}
                    />
                  ))
                : sorted.map((o, i) => (
                    <OutcomeRow
                      key={o.skinId}
                      outcome={o}
                      totalCost={result.totalCost}
                      currency={currency}
                      goodsIds={goodsIds}
                      maxProbability={maxProbability}
                      zebra={i % 2 === 1}
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
              <h3 className="type-overline text-[var(--accent)]">
                {group.groupName}
              </h3>
              <OutcomeGrid
                outcomes={group.items}
                totalCost={result.totalCost}
                currency={currency}
                goodsIds={goodsIds}
                maxProbability={maxProbability}
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
          maxProbability={maxProbability}
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
  maxProbability,
  showGroup,
}: {
  outcomes: TradeUpOutcome[];
  totalCost: number;
  currency: Currency;
  goodsIds: Record<string, number>;
  maxProbability: number;
  showGroup: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {outcomes.map((o) => {
        const delta = outcomeDelta(o, totalCost);
        const goodsId = goodsIds[o.marketHashName] ?? null;
        return (
          <li key={o.skinId}>
            <article className="hud-panel-quiet flex h-full flex-col gap-2 p-3 transition hover:border-[var(--accent)]/40">
              <div className="flex h-24 items-center justify-center rounded-lg bg-[var(--bg)]/70">
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
                <p className="type-overline mt-1">
                  {o.isKnife ? "Knife" : o.isGlove ? "Gloves" : "Skin"}
                  {showGroup ? ` · ${o.groupName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                  style={{
                    color: o.wearColor,
                    background: `${o.wearColor}22`,
                  }}
                >
                  {o.wearAbbr}
                </span>
                <span className="type-metric text-[10px] font-normal text-[var(--text-muted)]">
                  {formatFloat(o.outputFloat)}
                </span>
              </div>
              <div className="mt-auto flex flex-col gap-1 border-t border-[var(--border)]/60 pt-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="type-overline">Odds</span>
                  <span className="type-metric text-[11px]">
                    {(o.probability * 100).toFixed(2)}%
                  </span>
                </div>
                <ProbabilityBar
                  value={maxProbability > 0 ? o.probability / maxProbability : 0}
                />
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="type-overline">Price</span>
                  <span className="type-metric text-[11px]">
                    {formatMoney(o.price, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="type-overline">P/L</span>
                  <span
                    className="type-metric text-[11px]"
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
  maxProbability,
  colSpan,
}: {
  groupName: string;
  outcomes: TradeUpOutcome[];
  totalCost: number;
  currency: Currency;
  goodsIds: Record<string, number>;
  maxProbability: number;
  colSpan: number;
}) {
  return (
    <>
      <tr className="border-y border-[var(--border)] bg-[var(--bg-elevated)]/50">
        <td colSpan={colSpan} className="type-overline px-3 py-2 text-[var(--accent)]">
          {groupName}
        </td>
      </tr>
      {outcomes.map((o, i) => (
        <OutcomeRow
          key={o.skinId}
          outcome={o}
          totalCost={totalCost}
          currency={currency}
          goodsIds={goodsIds}
          maxProbability={maxProbability}
          zebra={i % 2 === 1}
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
  maxProbability,
  zebra,
  showGroup,
}: {
  outcome: TradeUpOutcome;
  totalCost: number;
  currency: Currency;
  goodsIds: Record<string, number>;
  maxProbability: number;
  zebra: boolean;
  showGroup: boolean;
}) {
  const delta = outcomeDelta(o, totalCost);
  const goodsId = goodsIds[o.marketHashName] ?? null;
  return (
    <tr
      className={`border-b border-[var(--border)]/50 transition last:border-0 hover:bg-[var(--accent)]/[0.06] ${
        zebra ? "bg-[var(--bg-elevated)]/25" : ""
      }`}
    >
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
      <td className="type-metric px-3 py-2 text-xs font-normal text-[var(--text-muted)]">
        {formatFloat(o.outputFloat)}
      </td>
      <td className="px-3 py-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
          style={{
            color: o.wearColor,
            background: `${o.wearColor}22`,
          }}
        >
          {o.wearAbbr}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="type-metric text-xs">
          {(o.probability * 100).toFixed(2)}%
        </span>
        <ProbabilityBar
          className="mt-1"
          value={maxProbability > 0 ? o.probability / maxProbability : 0}
        />
      </td>
      <td className="type-metric px-3 py-2 text-right text-xs">
        {formatMoney(o.price, currency)}
      </td>
      <td
        className="type-metric px-3 py-2 text-right text-xs"
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