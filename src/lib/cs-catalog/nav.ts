import type { CatalogKind, SlimCatalogItem } from "@/lib/cs-catalog/types";
import { isZeusWeapon } from "@/lib/cs-catalog/flags";

/** Top-level nav sections matching marketplace-style DB chrome. */
export type NavSection =
  | "pistols"
  | "mid_tier"
  | "rifles"
  | "knives"
  | "gloves"
  | "cases"
  | "collections"
  | "stickers"
  | "other";

export type StickerNavKey =
  | "explore"
  | "all"
  | "sticker_capsules"
  | "autograph_capsules"
  | { tournament: string };

export type OtherNavKey =
  | "keys"
  | "keychains"
  | "agents"
  | "patches"
  | "graffiti"
  | "music_kits"
  | "collectibles"
  | "highlights"
  | "base_weapons"
  | "equipment"
  | "souvenir_packages"
  | "music_kit_boxes"
  | "patch_capsules"
  | "pins";

export type NavFilter =
  | { section: "home" }
  | { section: "pistols"; weapon: string | null }
  | { section: "mid_tier"; weapon: string | null }
  | { section: "rifles"; weapon: string | null }
  | { section: "knives"; weapon: string | null }
  | { section: "gloves"; weapon: string | null }
  | { section: "cases"; crateId: string | null }
  | { section: "collections" }
  | { section: "stickers"; sticker: StickerNavKey }
  | { section: "other"; other: OtherNavKey };

export const DEFAULT_NAV_FILTER: NavFilter = {
  section: "home",
};

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  pistols: "Pistols",
  mid_tier: "Mid-Tier",
  rifles: "Rifles",
  knives: "Knives",
  gloves: "Gloves",
  cases: "Cases",
  collections: "Collections",
  stickers: "Stickers",
  other: "Other",
};

export const NAV_SECTION_ORDER: NavSection[] = [
  "pistols",
  "mid_tier",
  "rifles",
  "knives",
  "gloves",
  "cases",
  "collections",
  "stickers",
  "other",
];

/** ByMykel weaponCategory values that belong under each skin section. */
export const SKIN_SECTION_CATEGORIES: Record<
  "pistols" | "mid_tier" | "rifles" | "knives" | "gloves",
  readonly string[]
> = {
  pistols: ["Pistols"],
  // SMGs + Heavy (shotguns / LMGs) — marketplace Mid-Tier grouping.
  mid_tier: ["SMGs", "Heavy"],
  rifles: ["Rifles"],
  knives: ["Knives"],
  gloves: ["Gloves"],
};

/**
 * Display label → ByMykel `tournament.name` values to match.
 * Matching is case-insensitive equality against the mapped API name.
 */
export const STICKER_TOURNAMENTS: {
  label: string;
  apiNames: readonly string[];
}[] = [
  { label: "2026 Cologne", apiNames: ["IEM Cologne 2026"] },
  { label: "2025 Budapest", apiNames: ["StarLadder Budapest 2025"] },
  { label: "2025 Austin", apiNames: ["BLAST.tv Austin 2025"] },
  { label: "2024 Shanghai", apiNames: ["Perfect World Shanghai 2024"] },
  { label: "2024 Copenhagen", apiNames: ["PGL Copenhagen 2024"] },
  { label: "2023 Paris", apiNames: ["BLAST.tv Paris 2023"] },
  { label: "2022 Rio", apiNames: ["IEM Rio 2022"] },
  { label: "2022 Antwerp", apiNames: ["2022 PGL Antwerp"] },
  { label: "2021 Stockholm", apiNames: ["2021 PGL Stockholm"] },
  { label: "2020 RMR", apiNames: ["2020 RMR"] },
  { label: "2019 Berlin", apiNames: ["2019 StarLadder Berlin"] },
  { label: "2019 Katowice", apiNames: ["2019 IEM Katowice"] },
  { label: "2018 London", apiNames: ["2018 FACEIT London"] },
  { label: "2018 Boston", apiNames: ["2018 ELEAGUE Boston"] },
  { label: "2017 Krakow", apiNames: ["2017 PGL Krakow"] },
  { label: "2017 Atlanta", apiNames: ["2017 ELEAGUE Atlanta"] },
  { label: "2016 Cologne", apiNames: ["2016 ESL One Cologne"] },
  { label: "2016 Columbus", apiNames: ["2016 MLG Columbus"] },
  { label: "2015 Cluj-Napoca", apiNames: ["2015 DreamHack Cluj-Napoca"] },
  { label: "2015 Cologne", apiNames: ["2015 ESL One Cologne"] },
  { label: "2015 Katowice", apiNames: ["2015 ESL One Katowice"] },
  // DreamHack Winter 2014 was held in Jönköping.
  { label: "2014 Jönköping", apiNames: ["2014 DreamHack Winter"] },
  { label: "2014 Cologne", apiNames: ["2014 ESL One Cologne"] },
  { label: "2014 Katowice", apiNames: ["2014 EMS One Katowice"] },
];

export const OTHER_NAV_ITEMS: { key: OtherNavKey; label: string }[] = [
  { key: "keys", label: "Keys" },
  { key: "keychains", label: "Keychains" },
  { key: "agents", label: "Agents" },
  { key: "patches", label: "Patches" },
  { key: "graffiti", label: "Graffiti" },
  { key: "music_kits", label: "Music Kits" },
  { key: "collectibles", label: "Collectibles" },
  { key: "highlights", label: "Highlights" },
  { key: "base_weapons", label: "Base Weapons" },
  { key: "equipment", label: "Equipment" },
  { key: "souvenir_packages", label: "Souvenir Packages" },
  { key: "music_kit_boxes", label: "Music Kit Boxes" },
  { key: "patch_capsules", label: "Patch Capsules" },
  { key: "pins", label: "Pins" },
];

const OTHER_NAV_KEYS = new Set<string>(OTHER_NAV_ITEMS.map((item) => item.key));

export function isOtherNavKey(value: string | null): value is OtherNavKey {
  return value != null && OTHER_NAV_KEYS.has(value);
}

const OTHER_KIND: Partial<Record<OtherNavKey, CatalogKind>> = {
  keys: "key",
  keychains: "keychain",
  agents: "agent",
  patches: "patch",
  graffiti: "graffiti",
  music_kits: "music_kit",
  collectibles: "collectible",
  highlights: "highlight",
  base_weapons: "base_weapon",
};

function tournamentApiNamesForLabel(label: string): readonly string[] {
  return (
    STICKER_TOURNAMENTS.find((t) => t.label === label)?.apiNames ?? [label]
  );
}

export function itemMatchesNavFilter(
  item: SlimCatalogItem,
  filter: NavFilter,
): boolean {
  switch (filter.section) {
    case "home":
      return true;
    case "pistols":
    case "mid_tier":
    case "rifles":
    case "knives":
    case "gloves": {
      if (item.kind !== "skin") return false;
      const cats = SKIN_SECTION_CATEGORIES[filter.section];
      if (!item.weaponCategory || !cats.includes(item.weaponCategory)) {
        return false;
      }
      if (filter.weapon && item.weaponName !== filter.weapon) return false;
      return true;
    }
    case "cases": {
      if (filter.crateId) {
        // Specific case: skins that drop from it (plus the case itself).
        if (item.id === filter.crateId) return true;
        return item.kind === "skin" && item.crateIds.includes(filter.crateId);
      }
      if (item.kind !== "crate") return false;
      if (item.crateType !== "Case") return false;
      return true;
    }
    case "collections":
      return false;
    case "stickers": {
      const s = filter.sticker;
      if (s === "explore" || s === "all") {
        return item.kind === "sticker";
      }
      if (s === "sticker_capsules") {
        return item.kind === "crate" && item.crateType === "Sticker Capsule";
      }
      if (s === "autograph_capsules") {
        return item.kind === "crate" && item.crateType === "Autograph Capsule";
      }
      if (typeof s === "object" && "tournament" in s) {
        if (item.kind !== "sticker" || !item.tournamentName) return false;
        const names = tournamentApiNamesForLabel(s.tournament);
        return names.some(
          (n) => n.toLowerCase() === item.tournamentName!.toLowerCase(),
        );
      }
      return false;
    }
    case "other": {
      const kind = OTHER_KIND[filter.other];
      if (kind) return item.kind === kind;
      if (filter.other === "equipment") {
        // Zeus is remapped to Pistols; keep Equipment empty of Zeus if any slip through.
        return (
          item.kind === "skin" &&
          item.weaponCategory === "Equipment" &&
          !isZeusWeapon(item.weaponName)
        );
      }
      if (filter.other === "souvenir_packages") {
        return item.kind === "crate" && item.crateType === "Souvenir";
      }
      if (filter.other === "music_kit_boxes") {
        return item.kind === "crate" && item.crateType === "Music Kit Box";
      }
      if (filter.other === "patch_capsules") {
        return item.kind === "crate" && item.crateType === "Patch Capsule";
      }
      if (filter.other === "pins") {
        return item.kind === "crate" && item.crateType === "Pins";
      }
      return false;
    }
    default:
      return false;
  }
}

export function uniqueWeaponsForSection(
  items: SlimCatalogItem[],
  section: keyof typeof SKIN_SECTION_CATEGORIES,
): string[] {
  const cats = SKIN_SECTION_CATEGORIES[section];
  const set = new Set<string>();
  for (const item of items) {
    if (
      item.kind === "skin" &&
      item.weaponCategory &&
      cats.includes(item.weaponCategory) &&
      item.weaponName
    ) {
      set.add(item.weaponName);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Map a skin's weapon category + name to a nav filter (e.g. AUG → Rifles/AUG). */
export function navFilterForWeapon(
  weaponCategory: string | null | undefined,
  weaponName: string | null | undefined,
): NavFilter | null {
  if (!weaponName?.trim()) return null;
  if (isZeusWeapon(weaponName)) {
    return { section: "pistols", weapon: weaponName };
  }
  const category = weaponCategory ?? "";
  if (category === "Equipment") {
    return { section: "other", other: "equipment" };
  }
  for (const section of [
    "pistols",
    "mid_tier",
    "rifles",
    "knives",
    "gloves",
  ] as const) {
    if (SKIN_SECTION_CATEGORIES[section].includes(category)) {
      return { section, weapon: weaponName };
    }
  }
  return null;
}

export function weaponCases(items: SlimCatalogItem[]): SlimCatalogItem[] {
  return items
    .filter((i) => i.kind === "crate" && i.crateType === "Case")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function navFilterLabel(
  filter: NavFilter,
  caseNameById?: Map<string, string>,
): string {
  switch (filter.section) {
    case "home":
      return "Explore";
    case "pistols":
    case "mid_tier":
    case "rifles":
    case "knives":
    case "gloves":
      return filter.weapon
        ? filter.weapon
        : `All ${NAV_SECTION_LABELS[filter.section]}`;
    case "cases":
      if (filter.crateId) {
        return caseNameById?.get(filter.crateId) ?? "Case";
      }
      return "All Cases";
    case "collections":
      return "All Collections";
    case "stickers": {
      const s = filter.sticker;
      if (s === "explore") return "Explore Stickers";
      if (s === "all") return "All Stickers";
      if (s === "sticker_capsules") return "All Sticker Capsules";
      if (s === "autograph_capsules") return "All Autograph Capsules";
      if (typeof s === "object") return s.tournament;
      return "Stickers";
    }
    case "other":
      return (
        OTHER_NAV_ITEMS.find((o) => o.key === filter.other)?.label ?? "Other"
      );
  }
}
