import type { TradeUpTier } from "@/lib/tradeup/rarity";
import type { SkinVariant } from "@/lib/cs-catalog/wears";

export type { TradeUpTier };
/** Contract input variant after souvenir stripping. */
export type TradeUpVariant = Extract<SkinVariant, "normal" | "stattrak">;

export type TradeUpSkinRef = {
  id: string;
  name: string;
  image: string | null;
  rarityTier: TradeUpTier;
  minFloat: number;
  maxFloat: number;
  wearNames: string[];
  /** Weapon skin collections (regular trade-ups). */
  collectionIds: string[];
  /** Cases this finish drops from (Covert → rare). */
  crateIds: string[];
  isKnife: boolean;
  isGlove: boolean;
  stattrak: boolean;
  paintIndex: string | null;
  /** Base market name without wear / StatTrak / Souvenir. */
  baseName: string;
  /** Doppler / Gamma Doppler phase when applicable (Phase 1–4, Ruby, …). */
  phase: string | null;
};

export type TradeUpInput = {
  /** Stable slot key (inventory assetId or sandbox uid). */
  key: string;
  skinId: string;
  floatValue: number;
  /** Purchase / opportunity cost in active currency. */
  cost: number;
  /** Original market hash when from inventory (optional). */
  marketHashName?: string | null;
  image?: string | null;
  displayName?: string | null;
};

export type TradeUpOutcome = {
  skinId: string;
  name: string;
  image: string | null;
  probability: number;
  outputFloat: number;
  wearName: string;
  wearAbbr: string;
  wearColor: string;
  marketHashName: string;
  price: number | null;
  isKnife: boolean;
  isGlove: boolean;
  variant: TradeUpVariant;
  /** Primary collection (regular) or case (Covert) id. */
  groupId: string;
  /** Primary collection or case display name. */
  groupName: string;
  /** Doppler / Gamma Doppler phase when applicable. */
  phase: string | null;
};

export type TradeUpResult = {
  ok: true;
  inputTier: TradeUpTier;
  outputTier: TradeUpTier;
  slotCount: number;
  variant: TradeUpVariant;
  avgNormalized: number;
  outcomes: TradeUpOutcome[];
  totalCost: number;
  expectedValue: number;
  profit: number;
  roi: number | null;
};

export type TradeUpValidationError = {
  ok: false;
  error: string;
};

export type ComputeTradeUpResult = TradeUpResult | TradeUpValidationError;

export type TradeUpCatalogSkin = TradeUpSkinRef & {
  rarityId: string | null;
  rarityName: string | null;
  rarityColor: string | null;
};

export type TradeUpCollectionRow = {
  id: string;
  name: string;
  contains: Array<{
    id: string;
    rarityTier: TradeUpTier | null;
  }>;
};

export type TradeUpCrateRow = {
  id: string;
  name: string;
  image: string | null;
  containsRare: Array<{
    id: string;
    name: string;
    image: string | null;
    isKnife: boolean;
    isGlove: boolean;
  }>;
};

export type TradeUpPriceEntry = {
  steam: number | null;
  buff: number | null;
};

export type TradeUpCatalogPayload = {
  skins: TradeUpCatalogSkin[];
  collections: TradeUpCollectionRow[];
  crates: TradeUpCrateRow[];
  /** Market hash → prices in the requested currency. */
  prices: Record<string, TradeUpPriceEntry>;
  /** Market hash → Buff163 goods id when known. */
  goodsIds: Record<string, number>;
  currency: string;
};
