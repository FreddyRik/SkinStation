import { collapsePhasedContains } from "@/lib/cs-catalog/phase-family";
import type {
  CatalogContainsItem,
  SlimCatalogItem,
} from "@/lib/cs-catalog/types";

export type RareSpecialCategory = "knives" | "gloves" | "items";

export function containsLooksLikeGlove(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("gloves") ||
    lower.includes("hand wraps") ||
    lower.includes("wraps |")
  );
}

/** Heuristic for contains rows that lack category ids (gloves also use ★). */
export function containsLooksLikeKnife(name: string): boolean {
  const n = name.trim();
  if (!n.startsWith("★") && !n.startsWith("\u2605")) return false;
  return !containsLooksLikeGlove(n);
}

function weaponKey(name: string): string {
  const base = name.split("|")[0]?.trim() ?? name.trim();
  return base.replace(/^[★\u2605]\s*/, "").toLowerCase();
}

export function uniqueRareItems<T extends CatalogContainsItem>(items: T[]): T[] {
  return collapsePhasedContains(items);
}

export function isGoldDropSkin(item: {
  isKnife?: boolean | null;
  isGlove?: boolean | null;
  name: string;
}): boolean {
  if (item.isKnife || item.isGlove) return true;
  return containsLooksLikeKnife(item.name) || containsLooksLikeGlove(item.name);
}

/**
 * Split a crate's loot into regular skins vs gold (knives/gloves / contains_rare).
 * Golds that also appear in `contains` are removed from the regular list.
 */
export function partitionCrateDrops<T extends CatalogContainsItem>(
  contains: T[],
  containsRare: T[],
  slimById?: Map<string, Pick<SlimCatalogItem, "isKnife" | "isGlove">> | null,
): { regular: T[]; gold: T[] } {
  const goldIds = new Set<string>();
  const gold: T[] = [];

  function addGold(row: T) {
    if (goldIds.has(row.id)) return;
    goldIds.add(row.id);
    gold.push(row);
  }

  for (const row of containsRare) addGold(row);

  const regular: T[] = [];
  for (const row of contains) {
    const slim = slimById?.get(row.id);
    if (
      goldIds.has(row.id) ||
      isGoldDropSkin({
        isKnife: slim?.isKnife,
        isGlove: slim?.isGlove,
        name: row.name,
      })
    ) {
      addGold(row);
      continue;
    }
    regular.push(row);
  }

  return { regular, gold };
}

export function toContainsItem(item: {
  id: string;
  name: string;
  image?: string | null;
  rarity?: CatalogContainsItem["rarity"];
  paintIndex?: string | null;
}): CatalogContainsItem {
  return {
    id: item.id,
    name: item.name,
    image: item.image ?? null,
    rarity: item.rarity ?? null,
    paint_index: item.paintIndex ?? null,
  };
}

export function inferRareSpecialCategory(
  items: Array<{
    name: string;
    isKnife?: boolean | null;
    isGlove?: boolean | null;
  }>,
): RareSpecialCategory {
  let knives = 0;
  let gloves = 0;
  for (const item of items) {
    if (item.isGlove || containsLooksLikeGlove(item.name)) gloves += 1;
    else if (item.isKnife || containsLooksLikeKnife(item.name)) knives += 1;
  }
  if (gloves > 0 && knives === 0) return "gloves";
  if (knives > 0 && gloves === 0) return "knives";
  return "items";
}

export function rareSpecialCategoryLabel(
  category: RareSpecialCategory,
): string {
  if (category === "knives") return "Knives";
  if (category === "gloves") return "Gloves";
  return "Items";
}

/** Round-robin across weapon types so the 2×2 teaser is not four of the same knife. */
export function pickRarePreviews<T extends CatalogContainsItem>(
  items: T[],
  count = 4,
): T[] {
  const unique = uniqueRareItems(items).filter((item) => Boolean(item.image));
  if (unique.length <= count) return unique.slice(0, count);

  const groups = new Map<string, T[]>();
  for (const item of unique) {
    const key = weaponKey(item.name) || item.id;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const keys = [...groups.keys()];
  const out: T[] = [];
  let i = 0;
  while (out.length < count && keys.length > 0) {
    const idx = i % keys.length;
    const key = keys[idx]!;
    const list = groups.get(key);
    const next = list?.shift();
    if (next) out.push(next);
    if (!list || list.length === 0) {
      keys.splice(idx, 1);
    } else {
      i += 1;
    }
  }
  return out;
}
