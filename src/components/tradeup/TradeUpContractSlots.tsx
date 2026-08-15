"use client";

import type { CSSProperties } from "react";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/currency";
import type {
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpInput,
} from "@/lib/tradeup/types";
import { skinGroupLabel } from "@/components/tradeup/helpers";
import { TradeUpFloatControl } from "@/components/tradeup/TradeUpFloatControl";

export type SlotDraft = TradeUpInput | null;

export function TradeUpContractSlots({
  slots,
  currency,
  skinsById,
  collectionsById,
  cratesById,
  onRemove,
  onFloatChange,
  onWearSelect,
  onCostChange,
  onPickSlot,
}: {
  slots: SlotDraft[];
  currency: Currency;
  skinsById: Map<string, TradeUpCatalogSkin>;
  collectionsById: Map<string, TradeUpCollectionRow>;
  cratesById: Map<string, TradeUpCrateRow>;
  onRemove: (index: number) => void;
  onFloatChange: (index: number, floatValue: number) => void;
  onWearSelect: (index: number, floatValue: number) => void;
  onCostChange: (index: number, cost: number) => void;
  onPickSlot: (index: number) => void;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {slots.map((slot, index) => {
        const skin = slot ? skinsById.get(slot.skinId) : null;
        const groupLabel = skin
          ? skinGroupLabel(skin, collectionsById, cratesById)
          : null;
        return (
          <li key={slot?.key ?? `empty-${index}`}>
            {slot ? (
              <div
                className="rarity-frame flex h-full flex-col gap-2 rounded-xl border bg-[var(--bg-panel)]/70 p-2.5"
                style={
                  {
                    "--rarity": skin?.rarityColor ?? "var(--accent)",
                  } as CSSProperties
                }
              >
                <div className="flex items-start gap-2">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elevated)]">
                    {slot.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slot.image}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="type-overline">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-[var(--text)]">
                      {slot.displayName ?? "Skin"}
                    </p>
                    {groupLabel ? (
                      <p
                        className="truncate text-[10px] text-[var(--text-muted)]"
                        title={groupLabel}
                      >
                        {groupLabel}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded-md px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/40"
                    aria-label={`Remove slot ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
                <TradeUpFloatControl
                  floatValue={slot.floatValue}
                  minFloat={skin?.minFloat ?? 0}
                  maxFloat={skin?.maxFloat ?? 1}
                  onFloatChange={(floatValue) =>
                    onFloatChange(index, floatValue)
                  }
                  onWearSelect={(floatValue) =>
                    onWearSelect(index, floatValue)
                  }
                />
                <label className="flex flex-col gap-1">
                  <span className="type-overline">Cost ({currency})</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={slot.cost}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v))
                        onCostChange(index, Math.max(0, v));
                    }}
                    className="type-metric rounded-md border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-1 text-xs outline-none transition focus:border-[var(--accent)]/50"
                  />
                  <span className="type-metric text-[10px] font-normal text-[var(--text-muted)]">
                    {formatMoney(slot.cost, currency)}
                  </span>
                </label>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onPickSlot(index)}
                className="hud-corners group relative flex h-full min-h-[10.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-elevated)]/25 px-3 py-4 text-center transition hover:border-[var(--accent)]/45 hover:bg-[var(--bg-panel)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                <span className="type-overline">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-2xl leading-none text-[var(--text-muted)] transition group-hover:text-[var(--accent)]">
                  +
                </span>
                <span className="type-overline transition group-hover:text-[var(--accent)]">
                  Add skin
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
