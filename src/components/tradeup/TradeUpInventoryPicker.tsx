"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/currency";
import type { PriceSource } from "@/lib/price-source";
import type {
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpTier,
  TradeUpVariant,
} from "@/lib/tradeup/types";
import {
  inventoryCost,
  inventoryItemEligibility,
  skinGroupLabel,
  skinGroupLabels,
  type InventoryItemRow,
} from "@/components/tradeup/helpers";
import type { buildSkinIndex } from "@/lib/tradeup/resolve";

const TIER_LABELS: Record<TradeUpTier, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  extraordinary: "Extraordinary",
};

export function TradeUpInventoryPicker({
  items,
  index,
  collectionsById,
  cratesById,
  lockedTier,
  lockedVariant,
  selectedKeys,
  remainingSlots,
  currency,
  priceSource,
  onToggle,
  onClose,
}: {
  items: InventoryItemRow[];
  index: ReturnType<typeof buildSkinIndex>;
  collectionsById: Map<string, TradeUpCollectionRow>;
  cratesById: Map<string, TradeUpCrateRow>;
  lockedTier: TradeUpTier | null;
  lockedVariant: TradeUpVariant | null;
  selectedKeys: Set<string>;
  remainingSlots: number;
  currency: Currency;
  priceSource: PriceSource;
  onToggle: (item: InventoryItemRow) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const rows = useMemo(() => {
    const out: Array<{
      item: InventoryItemRow;
      tier: TradeUpTier;
      variant: TradeUpVariant;
      groupLabel: string;
    }> = [];
    for (const item of items) {
      const el = inventoryItemEligibility(item, index, cratesById);
      if (!el.ok || !el.tier || !el.skin) continue;
      if (lockedTier && el.tier !== lockedTier) continue;
      if (lockedVariant && el.variant !== lockedVariant) continue;
      const groupLabel = skinGroupLabel(el.skin, collectionsById, cratesById);
      if (deferred) {
        const haystack = [
          item.marketHashName,
          groupLabel,
          ...skinGroupLabels(el.skin, collectionsById, cratesById),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(deferred)) continue;
      }
      out.push({
        item,
        tier: el.tier,
        variant: el.variant,
        groupLabel,
      });
    }
    return out;
  }, [
    items,
    index,
    collectionsById,
    cratesById,
    lockedTier,
    lockedVariant,
    deferred,
  ]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3
            className="text-lg text-[var(--text)]"
            style={{ fontFamily: "var(--font-share-display), Georgia, serif" }}
          >
            Inventory picker
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
            {lockedTier ? ` · locked ${TIER_LABELS[lockedTier]}` : ""}
            {lockedVariant === "stattrak" ? " · StatTrak™" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          Close
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search inventory or collections…"
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]"
      />

      <ul className="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ item, tier, variant, groupLabel }) => {
          const selected = selectedKeys.has(item.assetId);
          const disabled = !selected && remainingSlots <= 0;
          const cost = inventoryCost(item, priceSource);
          return (
            <li key={item.assetId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(item)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)]/60 hover:border-[var(--accent)]/40 disabled:opacity-40"
                }`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--bg)]">
                  {item.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        item.iconUrl.startsWith("http")
                          ? item.iconUrl
                          : `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`
                      }
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--text)]">
                    {item.marketHashName}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {TIER_LABELS[tier]}
                    {variant === "stattrak" ? " · ST" : ""} ·{" "}
                    {formatMoney(cost || null, currency)}
                  </p>
                  <p
                    className="truncate text-[10px] text-[var(--text-muted)]"
                    title={groupLabel}
                  >
                    {groupLabel}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--accent)]">
                  {selected ? "In" : "+"}
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="col-span-full py-8 text-center text-sm text-[var(--text-muted)]">
            {items.length === 0 ? (
              <>
                No inventory items loaded. Select a profile and click{" "}
                <span className="text-[var(--text)]">Sync</span>, or Load a Steam
                URL.
              </>
            ) : (
              <>
                No eligible skins
                {lockedTier ? ` for ${TIER_LABELS[lockedTier]}` : ""} out of{" "}
                {items.length} loaded. Needs a collection match (or knife/glove
                case for Covert). Missing floats are estimated from wear.
              </>
            )}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
