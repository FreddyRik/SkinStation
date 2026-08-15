export type { TradeUpTier } from "@/lib/tradeup/rarity";
export {
  TRADEUP_TIERS,
  nextTier,
  contractSlotCount,
  isTradeUpInputTier,
  rarityToTier,
  rarityNameToTier,
  detectMarketVariant,
  normalizeBaseSkinName,
  extractWearName,
} from "@/lib/tradeup/rarity";

export type {
  TradeUpVariant,
  TradeUpSkinRef,
  TradeUpInput,
  TradeUpOutcome,
  TradeUpResult,
  TradeUpValidationError,
  ComputeTradeUpResult,
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpPriceEntry,
  TradeUpCatalogPayload,
} from "@/lib/tradeup/types";

export {
  buildSkinIndex,
  resolveSkinById,
  resolveSkinFromMarketHash,
} from "@/lib/tradeup/resolve";

export {
  wearBandForFloat,
  clampFloat,
  normalizeInputFloat,
  averageNormalized,
  outputFloatFromNormalized,
  pickPrice,
  financialSummary,
} from "@/lib/tradeup/math";

export {
  buildWeightedOutcomes,
  groupKeyForInput,
} from "@/lib/tradeup/outcomes";
export type { OutcomeCandidate, TradeUpPoolContext } from "@/lib/tradeup/outcomes";

export {
  validateTradeUpContract,
  validateTradeUpContractWithVariant,
} from "@/lib/tradeup/eligibility";

export { computeTradeUp } from "@/lib/tradeup/compute";
export { buildTradeUpCatalogPayload } from "@/lib/tradeup/catalog";
