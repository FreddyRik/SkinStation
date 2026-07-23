import {
  validateTradeUpContractWithVariant,
} from "@/lib/tradeup/eligibility";
import {
  averageNormalized,
  buildOutcomeMarketHash,
  financialSummary,
  normalizeInputFloat,
  outputFloatFromNormalized,
  pickPrice,
  wearBandForFloat,
} from "@/lib/tradeup/math";
import { buildWeightedOutcomes } from "@/lib/tradeup/outcomes";
import type { TradeUpPoolContext } from "@/lib/tradeup/outcomes";
import type {
  ComputeTradeUpResult,
  TradeUpCatalogSkin,
  TradeUpInput,
  TradeUpOutcome,
  TradeUpPriceEntry,
  TradeUpVariant,
} from "@/lib/tradeup/types";
import type { PriceSource } from "@/lib/price-source";

export function computeTradeUp(args: {
  inputs: TradeUpInput[];
  skinsById: Map<string, TradeUpCatalogSkin>;
  ctx: TradeUpPoolContext;
  variant: TradeUpVariant;
  prices: Record<string, TradeUpPriceEntry>;
  priceSource: PriceSource;
}): ComputeTradeUpResult {
  const { inputs, skinsById, ctx, variant, prices, priceSource } = args;

  const validated = validateTradeUpContractWithVariant(
    inputs,
    skinsById,
    ctx,
    variant,
  );
  if (!validated.ok) return validated;

  const { contract } = validated;
  // Force contract variant from caller (sandbox lock / inventory detection).
  const effectiveVariant = variant;

  const normalized = contract.resolved.map(({ input, skin }) =>
    normalizeInputFloat(input.floatValue, skin.minFloat, skin.maxFloat),
  );
  const avgNormalized = averageNormalized(normalized);

  const candidates = buildWeightedOutcomes({
    inputTier: contract.inputTier,
    variant: effectiveVariant,
    groupKeys: contract.resolved.map((r) => r.groupKey),
    ctx,
  });

  if (candidates.length === 0) {
    return { ok: false, error: "No possible outcomes for this contract." };
  }

  const outcomes: TradeUpOutcome[] = candidates.map((c) => {
    const outFloat = outputFloatFromNormalized(
      avgNormalized,
      c.minFloat,
      c.maxFloat,
    );
    const band = wearBandForFloat(outFloat);
    // Outcome variant: ST knives keep ST; gloves always normal.
    const outVariant: TradeUpVariant =
      effectiveVariant === "stattrak" && c.isKnife && !c.isGlove
        ? "stattrak"
        : "normal";
    const marketHashName = buildOutcomeMarketHash(
      c.baseName,
      band.name,
      outVariant,
      c.isKnife || c.isGlove,
    );
    const price = pickPrice(prices[marketHashName], priceSource);

    return {
      skinId: c.skinId,
      name: c.name,
      image: c.image,
      probability: c.probability,
      outputFloat: outFloat,
      wearName: band.name,
      wearAbbr: band.abbr,
      wearColor: band.color,
      marketHashName,
      price,
      isKnife: c.isKnife,
      isGlove: c.isGlove,
      variant: outVariant,
      groupId: c.groupId,
      groupName: c.groupName,
      phase: c.phase,
    };
  });

  const totalCost = contract.resolved.reduce(
    (sum, r) => sum + (Number.isFinite(r.input.cost) ? r.input.cost : 0),
    0,
  );
  const { expectedValue, profit, roi } = financialSummary(outcomes, totalCost);

  return {
    ok: true,
    inputTier: contract.inputTier,
    outputTier: contract.outputTier,
    slotCount: contract.slotCount,
    variant: effectiveVariant,
    avgNormalized,
    outcomes,
    totalCost,
    expectedValue,
    profit,
    roi,
  };
}
