import { WEAR_BANDS, type WearBand } from "@/lib/cs-catalog/wears";
import type { TradeUpOutcome, TradeUpPriceEntry, TradeUpVariant } from "@/lib/tradeup/types";
import { skinMarketHashName } from "@/lib/cs-catalog/wears";

const FLOAT_SCALE = BigInt(1_000_000_000);
const ZERO = BigInt(0);
const TWO = BigInt(2);

function toScaled(value: number): bigint {
  if (!Number.isFinite(value)) return ZERO;
  return BigInt(Math.round(value * 1e9));
}

function fromScaled(value: bigint): number {
  return Number(value) / 1e9;
}

/** Round a CS2 float to 9 decimal places (uint32 wear precision). */
export function roundFloat(value: number, decimals = 9): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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
  const scaled = toScaled(clamped) - toScaled(lo);
  const span = toScaled(hi) - toScaled(lo);
  if (span <= ZERO) return 0;
  return fromScaled((scaled * FLOAT_SCALE) / span);
}

export function averageNormalized(normalized: number[]): number {
  if (normalized.length === 0) return 0;
  let sum = ZERO;
  for (const n of normalized) {
    sum += toScaled(clampFloat(n, 0, 1));
  }
  const len = BigInt(normalized.length);
  return fromScaled((sum + len / TWO) / len);
}

export function outputFloatFromNormalized(
  avgNormalized: number,
  outMin: number,
  outMax: number,
): number {
  const n = clampFloat(avgNormalized, 0, 1);
  if (!(outMax > outMin)) return roundFloat(outMin);
  const span = toScaled(outMax) - toScaled(outMin);
  const offset = (toScaled(n) * span) / FLOAT_SCALE;
  return roundFloat(fromScaled(toScaled(outMin) + offset));
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
  let evScaled = ZERO;
  for (const o of outcomes) {
    const p = o.price;
    if (p == null || !Number.isFinite(p) || !Number.isFinite(o.probability)) continue;
    evScaled += toScaled(o.probability) * toScaled(p) / FLOAT_SCALE;
  }
  const expectedValue = roundMoney(fromScaled(evScaled));
  const cost = roundMoney(Number.isFinite(totalCost) ? totalCost : 0);
  const profit = roundMoney(expectedValue - cost);
  const roi = cost > 0 ? profit / cost : null;
  return { expectedValue, profit, roi };
}

/** Force probabilities to sum to 1 using integer millionths, adjusting the largest bin. */
export function normalizeProbabilities(probabilities: number[]): number[] {
  if (probabilities.length === 0) return probabilities;
  const scaled = probabilities.map((p) => {
    if (!Number.isFinite(p) || p <= 0) return ZERO;
    return toScaled(p);
  });
  const sum = scaled.reduce((a, b) => a + b, ZERO);
  if (sum === ZERO) return probabilities.map(() => 0);
  const normalized = scaled.map((s) => (s * FLOAT_SCALE) / sum);
  const normSum = normalized.reduce((a, b) => a + b, ZERO);
  const drift = FLOAT_SCALE - normSum;
  let maxI = 0;
  for (let i = 1; i < normalized.length; i++) {
    if (normalized[i]! > normalized[maxI]!) maxI = i;
  }
  normalized[maxI] = (normalized[maxI] ?? ZERO) + drift;
  return normalized.map((s) => fromScaled(s));
}
