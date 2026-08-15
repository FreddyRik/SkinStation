"use client";

import type { CSSProperties } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { SearchField } from "@/components/ui/SearchField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SegmentedOption } from "@/types/ui";
import type {
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpTier,
  TradeUpVariant,
} from "@/lib/tradeup/types";
import { isTradeUpInputTier } from "@/lib/tradeup/rarity";
import { skinGroupLabel, skinGroupLabels } from "@/components/tradeup/helpers";

const TIER_LABELS: Record<TradeUpTier, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  extraordinary: "Extraordinary",
};

const VARIANT_OPTIONS: readonly SegmentedOption<TradeUpVariant>[] = [
  { value: "normal", label: "Normal" },
  { value: "stattrak", label: "StatTrak™" },
];

export function TradeUpSandboxPicker({
  skins,
  collectionsById,
  cratesById,
  lockedTier,
  lockedVariant,
  remainingSlots,
  onPick,
  onClose,
}: {
  skins: TradeUpCatalogSkin[];
  collectionsById: Map<string, TradeUpCollectionRow>;
  cratesById: Map<string, TradeUpCrateRow>;
  lockedTier: TradeUpTier | null;
  lockedVariant: TradeUpVariant | null;
  remainingSlots: number;
  onPick: (skin: TradeUpCatalogSkin, asVariant: TradeUpVariant) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [variant, setVariant] = useState<TradeUpVariant>(
    lockedVariant ?? "normal",
  );
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const eligible = useMemo(() => {
    return skins.filter((skin) => {
      if (!isTradeUpInputTier(skin.rarityTier)) return false;
      if (skin.isKnife || skin.isGlove) return false;
      if (lockedTier && skin.rarityTier !== lockedTier) return false;
      if (variant === "stattrak" && !skin.stattrak) return false;
      if (skin.rarityTier === "covert") {
        const ok = skin.crateIds.some((id) => {
          const c = cratesById.get(id);
          return Boolean(c && c.containsRare.length > 0);
        });
        if (!ok) return false;
      } else if (skin.collectionIds.length === 0) {
        return false;
      }
      if (deferred) {
        const haystack = [
          skin.name,
          ...skinGroupLabels(skin, collectionsById, cratesById),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(deferred)) return false;
      }
      return true;
    });
  }, [
    skins,
    collectionsById,
    cratesById,
    lockedTier,
    variant,
    deferred,
  ]);

  const visible = eligible.slice(0, 80);

  const subtitle = `${remainingSlots} slot${
    remainingSlots === 1 ? "" : "s"
  } remaining${lockedTier ? ` · locked ${TIER_LABELS[lockedTier]}` : ""}`;

  return (
    <Drawer
      open
      title="Sandbox picker"
      subtitle={subtitle}
      onClose={onClose}
      footer={
        eligible.length > visible.length ? (
          <p className="type-overline text-center">
            Showing {visible.length} of {eligible.length} — refine search to
            narrow
          </p>
        ) : null
      }
    >
      <div className="flex flex-none flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          ariaLabel="Search skins"
          placeholder="Search skins or collections…"
          className="min-w-[12rem]"
        />
        <SegmentedControl
          ariaLabel="Variant"
          size="sm"
          options={VARIANT_OPTIONS}
          value={variant}
          disabled={lockedVariant != null}
          onChange={setVariant}
        />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((skin) => {
          const groupLabel = skinGroupLabel(skin, collectionsById, cratesById);
          return (
            <li key={skin.id}>
              <button
                type="button"
                onClick={() => onPick(skin, variant)}
                style={
                  {
                    "--rarity": skin.rarityColor ?? "var(--accent)",
                  } as CSSProperties
                }
                className="rarity-frame flex w-full items-center gap-2 rounded-xl border bg-[var(--bg-elevated)]/40 px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--bg)]">
                  {skin.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={skin.image}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[var(--text)]">
                    {skin.name}
                  </p>
                  <p
                    className="type-overline"
                    style={{ color: skin.rarityColor ?? "var(--text-muted)" }}
                  >
                    {TIER_LABELS[skin.rarityTier]}
                    {skin.stattrak ? " · ST" : ""}
                  </p>
                  <p
                    className="truncate text-[10px] text-[var(--text-muted)]"
                    title={groupLabel}
                  >
                    {groupLabel}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="col-span-full py-8 text-center text-sm text-[var(--text-muted)]">
            No matching eligible skins.
          </li>
        ) : null}
      </ul>
    </Drawer>
  );
}
