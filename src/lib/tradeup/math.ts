import { WEAR_BANDS, type WearBand } from "@/lib/cs-catalog/wears";
import type { TradeUpOutcome, TradeUpPriceEntry, TradeUpVariant } from "@/lib/tradeup/types";
import { skinMarketHashName } from "@/lib/cs-catalog/wears";

/** CS exterior for a float value (standard half-open bands; BS includes 1). */
export function wearBandForFloat(floatValue: number): WearBand {
  if (!Number.isFinite(floatValue)) return WEAR_BANDS[0]!;
  const f = Math.min(1, Math.max(0, floatValue));
  for (let i = 0; i < WEAR_BANDS.length; i++) {
    const band = WEAR_BANDS[i]!;
    const isLast = i === WEAR_BANDS.length - 1;
    if (f >= band.min && (isLast ? f <= band.max : f < band.max)) {
      return band;
    }
  }
  return WEAR_BANDS[WEAR_BANDS.length - 1]!;
}

export function clampFloat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (max <= min) return min;
  return Math.min(max, Math.max(min, value));
}

/** Normalize float into [0,1] relative to the skin's own float caps. */
export function normalizeInputFloat(
  floatValue: number,
  minFloat: number,
  maxFloat: number,
): number {
  const lo = minFloat;
  const hi = maxFloat;
  if (!(hi > lo)) return 0;
  const clamped = clampFloat(floatValue, lo, hi);
  return (clamped - lo) / (hi - lo);
}

export function averageNormalized(normalized: number[]): number {
  if (normalized.length === 0) return 0;
  return normalized.reduce((a, b) => a + b, 0) / normalized.length;
}

export function outputFloatFromNormalized(
  avgNormalized: number,
  outMin: number,
  outMax: number,
): number {
  const n = clampFloat(avgNormalized, 0, 1);
  if (!(outMax > outMin)) return outMin;
  return outMin + n * (outMax - outMin);
}

export function pickPrice(
  entry: TradeUpPriceEntry | undefined,
  source: "buff" | "steam",
): number | null {
  if (!entry) return null;
  if (source === "buff") {
    return entry.buff ?? entry.steam ?? null;
  }
  return entry.steam ?? entry.buff ?? null;
}

export function buildOutcomeMarketHash(
  baseName: string,
  wearName: string,
  variant: TradeUpVariant,
  isKnifeOrGlove: boolean,
): string {
  // Gloves never have StatTrak.
  const effective: TradeUpVariant =
    isKnifeOrGlove && variant === "stattrak" && !baseName.includes("★")
      ? "stattrak"
      : variant;
  // Knife names already include ★ in catalog base name.
  return skinMarketHashName(baseName, wearName, effective);
}

export function financialSummary(
  outcomes: Pick<TradeUpOutcome, "probability" | "price">[],
  totalCost: number,
): { expectedValue: number; profit: number; roi: number | null } {
  const expectedValue = outcomes.reduce((sum, o) => {
    const p = o.price;
    if (p == null || !Number.isFinite(p)) return sum;
    return sum + o.probability * p;
  }, 0);
  const profit = expectedValue - totalCost;
  const roi = totalCost > 0 ? profit / totalCost : null;
  return { expectedValue, profit, roi };
}
