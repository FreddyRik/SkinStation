import type { CatalogRarity } from "@/lib/cs-catalog/types";

/**
 * Higher = rarer. Gold/extraordinary sits above Covert so case grids can
 * fall back to name/id ranking when a rare special is mixed into `contains`.
 */
const RARITY_ID_RANK: Record<string, number> = {
  rarity_common: 1,
  rarity_common_weapon: 1,
  rarity_uncommon: 2,
  rarity_uncommon_weapon: 2,
  rarity_rare: 3,
  rarity_rare_weapon: 3,
  rarity_mythical: 4,
  rarity_mythical_weapon: 4,
  rarity_legendary: 5,
  rarity_legendary_weapon: 5,
  rarity_legendary_character: 5,
  rarity_ancient_weapon: 6,
  rarity_ancient: 7,
  rarity_ancient_character: 7,
  rarity_contraband: 8,
};

const NAME_RANK: Array<{ match: string; rank: number }> = [
  { match: "contraband", rank: 8 },
  { match: "extraordinary", rank: 7 },
  { match: "exceedingly rare", rank: 7 },
  { match: "covert", rank: 6 },
  { match: "master", rank: 6 },
  { match: "classified", rank: 5 },
  { match: "superior", rank: 5 },
  { match: "restricted", rank: 4 },
  { match: "exceptional", rank: 4 },
  { match: "exotic", rank: 4 },
  { match: "mil-spec", rank: 3 },
  { match: "distinguished", rank: 3 },
  { match: "remarkable", rank: 3 },
  { match: "industrial", rank: 2 },
  { match: "high grade", rank: 2 },
  { match: "consumer", rank: 1 },
];

export function rarityRank(
  rarity: CatalogRarity | null | undefined,
): number {
  const id = rarity?.id?.trim().toLowerCase() ?? "";
  if (id && RARITY_ID_RANK[id] != null) return RARITY_ID_RANK[id]!;

  const name = rarity?.name?.trim().toLowerCase() ?? "";
  if (!name) return 0;
  for (const row of NAME_RANK) {
    if (name.includes(row.match)) return row.rank;
  }
  return 0;
}

/** Rarest first, then name for a stable grid. */
export function sortByRarityDesc<T extends { name: string; rarity?: CatalogRarity | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const diff = rarityRank(b.rarity) - rarityRank(a.rarity);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "en");
  });
}
