"use client";

import { useDeferredValue, useMemo, useState } from "react";
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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3
            className="text-lg text-[var(--text)]"
            style={{ fontFamily: "var(--font-share-display), Georgia, serif" }}
          >
            Sandbox picker
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
            {lockedTier ? ` · locked ${TIER_LABELS[lockedTier]}` : ""}
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

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skins or collections…"
          className="min-w-[12rem] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          {(["normal", "stattrak"] as const).map((v) => (
            <button
              key={v}
              type="button"
              disabled={lockedVariant != null && lockedVariant !== v}
              onClick={() => setVariant(v)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                variant === v
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
              }`}
            >
              {v === "stattrak" ? "StatTrak™" : "Normal"}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((skin) => {
          const groupLabel = skinGroupLabel(skin, collectionsById, cratesById);
          return (
            <li key={skin.id}>
              <button
                type="button"
                onClick={() => onPick(skin, variant)}
                className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-2 py-2 text-left transition hover:border-[var(--accent)]/40"
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
                    className="text-[10px]"
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
      {eligible.length > visible.length ? (
        <p className="text-center text-[11px] text-[var(--text-muted)]">
          Showing {visible.length} of {eligible.length} — refine search to narrow.
        </p>
      ) : null}
    </div>
  );
}
