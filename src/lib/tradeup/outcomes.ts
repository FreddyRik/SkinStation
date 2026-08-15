import type {
  TradeUpCatalogSkin,
  TradeUpCollectionRow,
  TradeUpCrateRow,
  TradeUpVariant,
} from "@/lib/tradeup/types";
import {
  nextTier,
  type TradeUpTier,
} from "@/lib/tradeup/rarity";
import { normalizeProbabilities } from "@/lib/tradeup/math";

export type OutcomeCandidate = {
  skinId: string;
  name: string;
  image: string | null;
  minFloat: number;
  maxFloat: number;
  wearNames: string[];
  isKnife: boolean;
  isGlove: boolean;
  baseName: string;
  phase: string | null;
  probability: number;
  /** Collection id (regular) or case id (Covert). */
  groupId: string;
  /** Collection or case display name for UI grouping. */
  groupName: string;
};

export type TradeUpPoolContext = {
  skinsById: Map<string, TradeUpCatalogSkin>;
  collectionsById: Map<string, TradeUpCollectionRow>;
  cratesById: Map<string, TradeUpCrateRow>;
};

/**
 * Build weighted outcomes for a filled contract.
 * Regular: group by collection. Covert: group by case.
 */
export function buildWeightedOutcomes(args: {
  inputTier: TradeUpTier;
  variant: TradeUpVariant;
  /** One group key per input slot (collection id or crate id). */
  groupKeys: string[];
  ctx: TradeUpPoolContext;
}): OutcomeCandidate[] {
  const { inputTier, variant, groupKeys, ctx } = args;
  const n = groupKeys.length;
  if (n === 0) return [];

  const counts = new Map<string, number>();
  for (const key of groupKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const probBySkin = new Map<string, number>();
  const contribBySkin = new Map<string, Map<string, number>>();
  const metaBySkin = new Map<string, Omit<OutcomeCandidate, "probability" | "groupId" | "groupName">>();
  const groupNames = new Map<string, string>();

  function addContrib(skinId: string, groupId: string, amount: number) {
    let map = contribBySkin.get(skinId);
    if (!map) {
      map = new Map();
      contribBySkin.set(skinId, map);
    }
    map.set(groupId, (map.get(groupId) ?? 0) + amount);
  }

  function primaryGroup(skinId: string): { groupId: string; groupName: string } {
    const map = contribBySkin.get(skinId);
    let bestId = "";
    let bestAmt = -1;
    if (map) {
      for (const [gid, amt] of map) {
        if (amt > bestAmt) {
          bestAmt = amt;
          bestId = gid;
        }
      }
    }
    return {
      groupId: bestId || "unknown",
      groupName: groupNames.get(bestId) ?? "Unknown",
    };
  }

  if (inputTier === "covert") {
    for (const [crateId, count] of counts) {
      const crate = ctx.cratesById.get(crateId);
      if (!crate) continue;
      groupNames.set(crateId, crate.name);
      let rares = crate.containsRare;
      if (variant === "stattrak") {
        // StatTrak Covert → StatTrak knives only (no ST gloves).
        rares = rares.filter((r) => r.isKnife && !r.isGlove);
      }
      if (rares.length === 0) continue;
      const groupWeight = count / n;
      const each = groupWeight / rares.length;
      for (const rare of rares) {
        const skin = ctx.skinsById.get(rare.id);
        const minFloat = skin?.minFloat ?? 0.06;
        const maxFloat = skin?.maxFloat ?? 0.8;
        const wearNames = skin?.wearNames?.length
          ? skin.wearNames
          : ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
        const baseName = skin?.baseName ?? rare.name;
        const prev = probBySkin.get(rare.id) ?? 0;
        probBySkin.set(rare.id, prev + each);
        addContrib(rare.id, crateId, each);
        if (!metaBySkin.has(rare.id)) {
          metaBySkin.set(rare.id, {
            skinId: rare.id,
            name: rare.name,
            image: rare.image ?? skin?.image ?? null,
            minFloat,
            maxFloat,
            wearNames,
            isKnife: rare.isKnife,
            isGlove: rare.isGlove,
            baseName,
            phase: skin?.phase ?? null,
          });
        }
      }
    }
  } else {
    const target = nextTier(inputTier);
    if (!target) return [];

    for (const [collectionId, count] of counts) {
      const collection = ctx.collectionsById.get(collectionId);
      if (!collection) continue;
      groupNames.set(collectionId, collection.name);
      const poolIds = collection.contains
        .filter((c) => c.rarityTier === target)
        .map((c) => c.id);
      // Deduplicate within collection
      const uniqueIds = [...new Set(poolIds)];
      const pool: TradeUpCatalogSkin[] = [];
      for (const id of uniqueIds) {
        const skin = ctx.skinsById.get(id);
        if (skin && !skin.isKnife && !skin.isGlove) pool.push(skin);
      }
      if (pool.length === 0) continue;
      const groupWeight = count / n;
      const each = groupWeight / pool.length;
      for (const skin of pool) {
        const prev = probBySkin.get(skin.id) ?? 0;
        probBySkin.set(skin.id, prev + each);
        addContrib(skin.id, collectionId, each);
        if (!metaBySkin.has(skin.id)) {
          metaBySkin.set(skin.id, {
            skinId: skin.id,
            name: skin.name,
            image: skin.image,
            minFloat: skin.minFloat,
            maxFloat: skin.maxFloat,
            wearNames: skin.wearNames,
            isKnife: skin.isKnife,
            isGlove: skin.isGlove,
            baseName: skin.baseName,
            phase: skin.phase,
          });
        }
      }
    }
  }

  const out: OutcomeCandidate[] = [];
  for (const [id, prob] of probBySkin) {
    const meta = metaBySkin.get(id);
    if (!meta || prob <= 0) continue;
    const { groupId, groupName } = primaryGroup(id);
    out.push({ ...meta, probability: prob, groupId, groupName });
  }

  const normalized = normalizeProbabilities(out.map((o) => o.probability));
  for (let i = 0; i < out.length; i++) {
    out[i] = { ...out[i]!, probability: normalized[i] ?? 0 };
  }

  out.sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
  return out;
}

/** Pick the group key for one input skin (collection or primary rare-capable case). */
export function groupKeyForInput(
  inputTier: TradeUpTier,
  skin: TradeUpCatalogSkin,
  ctx: TradeUpPoolContext,
): string | null {
  if (inputTier === "covert") {
    for (const crateId of skin.crateIds) {
      const crate = ctx.cratesById.get(crateId);
      if (crate && crate.containsRare.length > 0) return crateId;
    }
    return null;
  }
  // Prefer first collection that exists in our trade-up map AND has a next-tier pool.
  for (const collectionId of skin.collectionIds) {
    if (!ctx.collectionsById.has(collectionId)) continue;
    if (groupHasOutcomePool(inputTier, "normal", collectionId, ctx)) return collectionId;
  }
  return null;
}

/** True when this collection/crate can produce at least one outcome at the next tier. */
export function groupHasOutcomePool(
  inputTier: TradeUpTier,
  variant: TradeUpVariant,
  groupKey: string,
  ctx: TradeUpPoolContext,
): boolean {
  if (inputTier === "covert") {
    const crate = ctx.cratesById.get(groupKey);
    if (!crate) return false;
    let rares = crate.containsRare;
    if (variant === "stattrak") {
      rares = rares.filter((r) => r.isKnife && !r.isGlove);
    }
    return rares.length > 0;
  }
  const target = nextTier(inputTier);
  if (!target) return false;
  const collection = ctx.collectionsById.get(groupKey);
  if (!collection) return false;
  return collection.contains.some((c) => {
    if (c.rarityTier !== target) return false;
    const skin = ctx.skinsById.get(c.id);
    return Boolean(skin && !skin.isKnife && !skin.isGlove);
  });
}
