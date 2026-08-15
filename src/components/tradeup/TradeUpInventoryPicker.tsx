"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { SearchField } from "@/components/ui/SearchField";
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

  const subtitle = `${remainingSlots} slot${
    remainingSlots === 1 ? "" : "s"
  } remaining${lockedTier ? ` · locked ${TIER_LABELS[lockedTier]}` : ""}${
    lockedVariant === "stattrak" ? " · StatTrak™" : ""
  }`;

  return (
    <Drawer open title="Inventory picker" subtitle={subtitle} onClose={onClose}>
      <SearchField
        value={query}
        onChange={setQuery}
        ariaLabel="Search inventory"
        placeholder="Search inventory or collections…"
        className="flex-none"
      />

      <ul className="grid gap-2 sm:grid-cols-2">
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
                className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)]/70 bg-[var(--bg-elevated)]/40 hover:border-[var(--accent)]/45 disabled:opacity-40"
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
                  <p className="type-metric text-[10px] font-normal text-[var(--text-muted)]">
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
                <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--accent)]">
                  {selected ? "IN" : "+"}
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
    </Drawer>
  );
}
