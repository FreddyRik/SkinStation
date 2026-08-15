"use client";

import { formatFloat } from "@/lib/format";
import {
  WEAR_BANDS,
  formatFloatShort,
  wearRangeForSkin,
} from "@/lib/cs-catalog/wears";
import { clampFloat, wearBandForFloat } from "@/lib/tradeup/math";

export function TradeUpFloatControl({
  floatValue,
  minFloat,
  maxFloat,
  onFloatChange,
  onWearSelect,
}: {
  floatValue: number;
  minFloat: number;
  maxFloat: number;
  onFloatChange: (floatValue: number) => void;
  onWearSelect: (floatValue: number) => void;
}) {
  const lo = clampFloat(minFloat, 0, 1);
  const hi = Math.max(lo, clampFloat(maxFloat, 0, 1));
  const value = clampFloat(floatValue, lo, hi);
  const currentWear = wearBandForFloat(value);
  const leftPct = lo * 100;
  const widthPct = Math.max((hi - lo) * 100, 0.4);
  const rightPct = Math.max(0, 100 - leftPct - widthPct);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-col gap-1">
        <span className="type-overline">Float</span>
        <input
          type="number"
          step="0.000001"
          min={lo}
          max={hi}
          value={floatValue}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onFloatChange(v);
          }}
          className="type-metric rounded-md border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-1 text-xs outline-none transition focus:border-[var(--accent)]/50"
        />
      </label>

      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-md border border-[var(--border)]/60 bg-[var(--bg)]">
          <div className="flex h-full w-full opacity-25" aria-hidden>
            {WEAR_BANDS.map((band) => (
              <div
                key={band.key}
                className="h-full"
                style={{
                  width: `${(band.max - band.min) * 100}%`,
                  backgroundColor: band.color,
                }}
              />
            ))}
          </div>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: `inset(0 ${rightPct}% 0 ${leftPct}%)`,
            }}
            aria-hidden
          >
            <div className="flex h-full w-full">
              {WEAR_BANDS.map((band) => (
                <div
                  key={band.key}
                  className="h-full"
                  style={{
                    width: `${(band.max - band.min) * 100}%`,
                    backgroundColor: band.color,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <input
          type="range"
          min={lo}
          max={hi}
          step={0.001}
          value={value}
          aria-label="Float"
          onChange={(e) => onFloatChange(Number(e.target.value))}
          className="tradeup-float-slider absolute top-0 h-5 cursor-pointer appearance-none bg-transparent p-0"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
      </div>

      <div className="type-metric flex items-center justify-between gap-2 text-[10px] font-normal text-[var(--text-muted)]">
        <span className="min-w-0 truncate">{formatFloatShort(lo)}</span>
        <span className="min-w-0 truncate text-[var(--text)]">
          {formatFloatShort(value)}
        </span>
        <span className="min-w-0 truncate text-right">{formatFloatShort(hi)}</span>
      </div>

      <div className="grid grid-cols-5 gap-0.5" role="group" aria-label="Wear">
        {WEAR_BANDS.map((band) => {
          const overlap = wearRangeForSkin(band, lo, hi);
          const active = currentWear.key === band.key;
          return (
            <button
              key={band.key}
              type="button"
              disabled={!overlap}
              title={
                overlap
                  ? `${band.name} ${formatFloat(overlap.min)}–${formatFloat(overlap.max)}`
                  : `${band.name} not available for this skin`
              }
              aria-pressed={active}
              onClick={() => {
                if (!overlap) return;
                onWearSelect((overlap.min + overlap.max) / 2);
              }}
              className="min-w-0 truncate rounded px-0.5 py-1 font-mono text-[9px] font-semibold tracking-[0.04em] transition disabled:cursor-not-allowed disabled:opacity-30 sm:text-[10px]"
              style={{
                color: band.color,
                background: active ? `${band.color}22` : "transparent",
                boxShadow: active ? `inset 0 0 0 1px ${band.color}66` : undefined,
              }}
            >
              {band.abbr}
            </button>
          );
        })}
      </div>
    </div>
  );
}
