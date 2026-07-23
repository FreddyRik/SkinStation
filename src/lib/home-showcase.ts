import { getCatalogItems } from "@/lib/cs-catalog/catalog";

export type HomeShowcaseImage = {
  id: string;
  name: string;
  image: string;
};

export type HomeShowcase = {
  constellation: HomeShowcaseImage[];
  databasePreviews: HomeShowcaseImage[];
  tradeupPreviews: HomeShowcaseImage[];
};

function takeUnique(
  items: Array<{ id: string; name: string; image: string | null }>,
  limit: number,
): HomeShowcaseImage[] {
  const out: HomeShowcaseImage[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.image || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({ id: item.id, name: item.name, image: item.image });
    if (out.length >= limit) break;
  }
  return out;
}

type SkinRow = {
  id: string;
  name: string;
  image: string | null;
  weaponName: string | null;
  rarity: { id: string; name: string } | null;
};

const RARITY_RANK: Record<string, number> = {
  rarity_ancient_weapon: 6,
  rarity_legendary_weapon: 5,
  rarity_mythical_weapon: 4,
  rarity_rare_weapon: 3,
  rarity_uncommon_weapon: 2,
  rarity_common_weapon: 1,
};

function rarityRank(skin: SkinRow): number {
  const id = skin.rarity?.id ?? "";
  if (RARITY_RANK[id] != null) return RARITY_RANK[id]!;
  const name = skin.rarity?.name?.toLowerCase() ?? "";
  if (name.includes("covert")) return 6;
  if (name.includes("classified")) return 5;
  if (name.includes("restricted")) return 4;
  return 0;
}

/** Prefer exact name match, else best-looking finish for that weapon. */
function pickWeaponSkin(
  skins: SkinRow[],
  weapon: string,
  preferredNameIncludes?: string,
): SkinRow | null {
  const weaponLower = weapon.toLowerCase();
  const pool = skins.filter((s) => {
    if (!s.image) return false;
    if (s.weaponName?.toLowerCase() === weaponLower) return true;
    const name = s.name.toLowerCase();
    // Knives often use "★ Bayonet | …"
    return (
      name.startsWith(`${weaponLower} |`) ||
      name.startsWith(`★ ${weaponLower} |`) ||
      name.includes(` ${weaponLower} |`)
    );
  });
  if (pool.length === 0) return null;
  if (preferredNameIncludes) {
    const needle = preferredNameIncludes.toLowerCase();
    const exact = pool.find((s) => s.name.toLowerCase().includes(needle));
    if (exact) return exact;
  }
  return (
    [...pool].sort(
      (a, b) => rarityRank(b) - rarityRank(a) || a.name.localeCompare(b.name),
    )[0] ?? null
  );
}

function toShowcase(picks: SkinRow[]): HomeShowcaseImage[] {
  return picks
    .filter((s): s is SkinRow & { image: string } => Boolean(s.image))
    .map((s) => ({ id: s.id, name: s.name, image: s.image }));
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function weaponKey(skin: SkinRow): string {
  if (skin.weaponName?.trim()) return skin.weaponName.trim().toLowerCase();
  const base = skin.name.split("|")[0]?.trim().toLowerCase() ?? skin.id;
  return base.replace(/^★\s*/, "");
}

/** Random sample that prefers distinct weapons for a nicer card collage. */
function pickDiverseRandom(pool: SkinRow[], limit: number): SkinRow[] {
  const shuffled = shuffle(pool.filter((s) => s.image));
  const out: SkinRow[] = [];
  const usedWeapons = new Set<string>();

  for (const skin of shuffled) {
    if (out.length >= limit) break;
    const key = weaponKey(skin);
    if (usedWeapons.has(key)) continue;
    usedWeapons.add(key);
    out.push(skin);
  }
  for (const skin of shuffled) {
    if (out.length >= limit) break;
    if (out.some((s) => s.id === skin.id)) continue;
    out.push(skin);
  }
  return out;
}

/** Skin Database card — random high-tier gun skins each page load. */
function databaseWeaponPreviews(
  coverts: SkinRow[],
  classified: SkinRow[],
): HomeShowcaseImage[] {
  const pool = [...coverts, ...classified];
  return toShowcase(pickDiverseRandom(pool, 4));
}

/** Trade-up card — random knife + guns + gloves each page load. */
function tradeupShowcasePreviews(
  knives: SkinRow[],
  gloves: SkinRow[],
  coverts: SkinRow[],
): HomeShowcaseImage[] {
  const knife = pickDiverseRandom(knives, 1)[0];
  const glove = pickDiverseRandom(gloves, 1)[0];
  const guns = pickDiverseRandom(coverts, 2);
  const picks = [knife, ...guns, glove].filter((s): s is SkinRow => s != null);
  if (picks.length >= 4) return toShowcase(picks.slice(0, 4));

  const filler = pickDiverseRandom(
    [...coverts, ...knives, ...gloves].filter(
      (s) => !picks.some((p) => p.id === s.id),
    ),
    4 - picks.length,
  );
  return toShowcase([...picks, ...filler]);
}

/**
 * Mix knives and gun skins for the hero atmosphere.
 * (A knives-first pool was starving guns out of the 10-slot limit.)
 */
function constellationShowcase(
  allSkins: SkinRow[],
  knives: SkinRow[],
  coverts: SkinRow[],
  classified: SkinRow[],
): HomeShowcaseImage[] {
  const gunFallback = [...coverts, ...classified];
  const picks: SkinRow[] = [
    pickWeaponSkin(allSkins, "Karambit") ?? knives[0],
    pickWeaponSkin(allSkins, "AK-47", "Vulcan") ??
      pickWeaponSkin(allSkins, "AK-47") ??
      gunFallback[0],
    pickWeaponSkin(allSkins, "Butterfly Knife") ?? knives[1],
    pickWeaponSkin(allSkins, "AWP", "Dragon Lore") ??
      pickWeaponSkin(allSkins, "AWP") ??
      gunFallback[1],
    pickWeaponSkin(allSkins, "M4A4", "Howl") ??
      pickWeaponSkin(allSkins, "M4A1-S") ??
      pickWeaponSkin(allSkins, "M4A4") ??
      gunFallback[2],
    pickWeaponSkin(allSkins, "Bayonet") ?? knives[2],
    pickWeaponSkin(allSkins, "Desert Eagle", "Blaze") ??
      pickWeaponSkin(allSkins, "Desert Eagle") ??
      gunFallback[3],
    pickWeaponSkin(allSkins, "Glock-18", "Fade") ??
      pickWeaponSkin(allSkins, "USP-S") ??
      gunFallback[4],
    pickWeaponSkin(allSkins, "Talon Knife") ?? knives[3],
    pickWeaponSkin(allSkins, "AWP", "Asiimov") ??
      pickWeaponSkin(allSkins, "AK-47", "Fire Serpent") ??
      gunFallback[5],
  ].filter((s): s is SkinRow => s != null);

  return takeUnique(picks, 10);
}

/** Curate catalog images for the home hub atmosphere + tool cards. */
export async function getHomeShowcase(): Promise<HomeShowcase> {
  try {
    const items = await getCatalogItems();
    const skins = items.filter((i) => i.kind === "skin" && i.image);

    const knives = skins.filter((s) => s.isKnife);
    const gloves = skins.filter((s) => s.isGlove);
    const weaponSkins = skins.filter((s) => !s.isKnife && !s.isGlove);
    const coverts = weaponSkins.filter(
      (s) =>
        s.rarity?.name?.toLowerCase().includes("covert") ||
        s.rarity?.id === "rarity_ancient_weapon",
    );
    const classified = weaponSkins.filter(
      (s) =>
        s.rarity?.name?.toLowerCase().includes("classified") ||
        s.rarity?.id === "rarity_legendary_weapon",
    );

    const allForPicks = skins as SkinRow[];
    const knifeRows = knives as SkinRow[];
    const gloveRows = gloves as SkinRow[];
    const covertRows = coverts as SkinRow[];
    const classifiedRows = classified as SkinRow[];

    const databasePreviews = databaseWeaponPreviews(covertRows, classifiedRows);
    const tradeupPreviews = tradeupShowcasePreviews(
      knifeRows,
      gloveRows,
      covertRows,
    );

    return {
      constellation: constellationShowcase(
        allForPicks,
        knifeRows,
        covertRows,
        classifiedRows,
      ),
      databasePreviews:
        databasePreviews.length >= 4
          ? databasePreviews
          : takeUnique(shuffle([...coverts, ...classified]), 4),
      tradeupPreviews:
        tradeupPreviews.length >= 4
          ? tradeupPreviews
          : takeUnique(
              shuffle([...knives, ...gloves, ...coverts]),
              4,
            ),
    };
  } catch (err) {
    console.warn("Home showcase catalog unavailable:", err);
    return {
      constellation: [],
      databasePreviews: [],
      tradeupPreviews: [],
    };
  }
}
