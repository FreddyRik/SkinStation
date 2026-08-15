"use client";

import { formatFloat, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/currency";
import type {
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpInput,
} from "@/lib/tradeup/types";
import { skinGroupLabel } from "@/components/tradeup/helpers";

export type SlotDraft = TradeUpInput | null;

export function TradeUpContractSlots({
  slots,
  currency,
  skinsById,
  collectionsById,
  cratesById,
  onRemove,
  onFloatChange,
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
              <div className="et-card flex h-full flex-col gap-2 p-2.5">
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
                    <p className="truncate text-xs font-medium text-[var(--text)]">
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
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      Slot {index + 1}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded-md px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--danger)]"
                    aria-label={`Remove slot ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
                <label className="flex flex-col gap-0.5 text-[10px] text-[var(--text-muted)]">
                  Float
                  <input
                    type="number"
                    step="0.000001"
                    min={0}
                    max={1}
                    value={slot.floatValue}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v)) onFloatChange(index, v);
                    }}
                    className="et-field px-2 py-1 font-data text-xs text-[var(--text)]"
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={Math.min(1, Math.max(0, slot.floatValue))}
                    onChange={(e) =>
                      onFloatChange(index, Number(e.target.value))
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                  <span className="font-data text-[var(--text-muted)]">
                    {formatFloat(slot.floatValue)}
                  </span>
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] text-[var(--text-muted)]">
                  Cost ({currency})
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
                    className="et-field px-2 py-1 font-data text-xs text-[var(--text)]"
                  />
                  <span className="font-data text-[var(--text-muted)]">
                    {formatMoney(slot.cost, currency)}
                  </span>
                </label>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onPickSlot(index)}
                className="et-slot flex h-full min-h-[10.5rem] w-full flex-col items-center justify-center gap-1 px-3 py-4 text-center hover:bg-[var(--bg-elevated)]"
              >
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Slot {index + 1}
                </span>
                <span className="text-[11px] text-[var(--accent)]">
                  + Add skin
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
