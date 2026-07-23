/** CS2 weapon rarity ladder for trade-up contracts. */

export const TRADEUP_TIERS = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "extraordinary",
] as const;

export type TradeUpTier = (typeof TRADEUP_TIERS)[number];

const TIER_INDEX: Record<TradeUpTier, number> = {
  consumer: 0,
  industrial: 1,
  milspec: 2,
  restricted: 3,
  classified: 4,
  covert: 5,
  extraordinary: 6,
};

/** ByMykel rarity.id → tier. */
const RARITY_ID_TO_TIER: Record<string, TradeUpTier> = {
  rarity_common_weapon: "consumer",
  rarity_uncommon_weapon: "industrial",
  rarity_rare_weapon: "milspec",
  rarity_mythical_weapon: "restricted",
  rarity_legendary_weapon: "classified",
  rarity_ancient_weapon: "covert",
  // Knives / gloves (Extraordinary)
  rarity_ancient: "extraordinary",
  rarity_legendary_character: "extraordinary",
  rarity_ancient_character: "extraordinary",
};

/** Localized / display names → tier. */
const RARITY_NAME_TO_TIER: Record<string, TradeUpTier> = {
  "consumer grade": "consumer",
  consumer: "consumer",
  "industrial grade": "industrial",
  industrial: "industrial",
  "mil-spec grade": "milspec",
  "mil-spec": "milspec",
  milspec: "milspec",
  restricted: "restricted",
  classified: "classified",
  covert: "covert",
  extraordinary: "extraordinary",
  "exceedingly rare": "extraordinary",
  "★": "extraordinary",
};

export function tierIndex(tier: TradeUpTier): number {
  return TIER_INDEX[tier];
}

export function nextTier(tier: TradeUpTier): TradeUpTier | null {
  const i = TIER_INDEX[tier];
  if (i >= TRADEUP_TIERS.length - 1) return null;
  return TRADEUP_TIERS[i + 1]!;
}

/** Slot count: 10 for weapon ladder, 5 for Covert → Extraordinary. */
export function contractSlotCount(inputTier: TradeUpTier): number {
  return inputTier === "covert" ? 5 : 10;
}

export function isTradeUpInputTier(tier: TradeUpTier): boolean {
  return tier !== "extraordinary";
}

export function rarityToTier(
  rarity: { id?: string | null; name?: string | null } | null | undefined,
): TradeUpTier | null {
  if (!rarity) return null;
  const id = rarity.id?.trim().toLowerCase();
  if (id && RARITY_ID_TO_TIER[id]) return RARITY_ID_TO_TIER[id]!;
  const name = rarity.name?.trim().toLowerCase();
  if (name && RARITY_NAME_TO_TIER[name]) return RARITY_NAME_TO_TIER[name]!;
  // Partial name match for Steam tags like "Classified"
  if (name) {
    for (const [key, tier] of Object.entries(RARITY_NAME_TO_TIER)) {
      if (name === key || name.includes(key)) return tier;
    }
  }
  return null;
}

export function rarityNameToTier(name: string | null | undefined): TradeUpTier | null {
  if (!name) return null;
  return rarityToTier({ name });
}

export function detectMarketVariant(marketHashName: string): {
  variant: "normal" | "stattrak" | "souvenir";
  baseWithWear: string;
} {
  let rest = marketHashName.trim();
  let variant: "normal" | "stattrak" | "souvenir" = "normal";

  if (/^souvenir\s+/i.test(rest)) {
    variant = "souvenir";
    rest = rest.replace(/^souvenir\s+/i, "");
  } else if (/^★\s*stattrak™\s+/i.test(rest) || /^★\s*stattrak\s+/i.test(rest)) {
    variant = "stattrak";
    rest = rest.replace(/^★\s*stattrak™?\s+/i, "★ ");
  } else if (/^stattrak™\s+/i.test(rest) || /^stattrak\s+/i.test(rest)) {
    variant = "stattrak";
    rest = rest.replace(/^stattrak™?\s+/i, "");
  }

  return { variant, baseWithWear: rest };
}

const WEAR_SUFFIX_RE =
  /\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i;

/** Strip wear suffix and StatTrak/Souvenir prefixes → catalog base name. */
export function normalizeBaseSkinName(marketHashName: string): string {
  const { baseWithWear } = detectMarketVariant(marketHashName);
  return baseWithWear.replace(WEAR_SUFFIX_RE, "").trim();
}

export function extractWearName(marketHashName: string): string | null {
  const m = marketHashName.match(WEAR_SUFFIX_RE);
  return m?.[1] ?? null;
}
