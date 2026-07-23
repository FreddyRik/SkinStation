/** ByMykel CSGO-API catalog kinds. */

export type CatalogKind =
  | "skin"
  | "collection"
  | "crate"
  | "key"
  | "keychain"
  | "sticker"
  | "agent"
  | "patch"
  | "graffiti"
  | "music_kit"
  | "collectible"
  | "highlight"
  | "base_weapon";

export type CatalogRarity = {
  id: string;
  name: string;
  color: string;
};

export type CatalogNamedRef = {
  id: string;
  name: string;
  image?: string | null;
};

export type CatalogWear = {
  id: string;
  name: string;
};

export type CatalogContainsItem = {
  id: string;
  name: string;
  image?: string | null;
  rarity?: CatalogRarity | null;
  paint_index?: string | null;
};

/** Slim row for browse/search grids. */
export type SlimCatalogItem = {
  id: string;
  name: string;
  image: string | null;
  kind: CatalogKind;
  rarity: CatalogRarity | null;
  marketHashName: string | null;
  /** Skin weapon category name (Knives, Gloves, Rifles, …). */
  weaponCategory: string | null;
  weaponCategoryId: string | null;
  weaponName: string | null;
  patternName: string | null;
  isKnife: boolean;
  isGlove: boolean;
  crateType: string | null;
  /** Skin: crate ids this finish can drop from. */
  crateIds: string[];
  /** Crate first sale date when available (ISO-ish string). */
  firstSaleDate: string | null;
  /** Sticker tournament name from ByMykel (e.g. "IEM Cologne 2026"). */
  tournamentName: string | null;
  /** Sticker type: Event, Team, Autograph, Other, … */
  stickerType: string | null;
  /** Skin can drop as StatTrak. */
  stattrak: boolean;
  /** Skin can drop as Souvenir. */
  souvenir: boolean;
  /** Primary case/collection label for card footer. */
  sourceName: string | null;
  sourceImage: string | null;
  sourceId: string | null;
  sourceKind: "collection" | "crate" | null;
  /** How many collections this item belongs to (skins/stickers/…). */
  collectionCount: number;
  /** Skin float bounds (for wear price ranges). */
  minFloat: number | null;
  maxFloat: number | null;
  /** Available wear names (Factory New, …). */
  wearNames: string[];
  /**
   * Doppler / Gamma Doppler phase when applicable
   * (Phase 1–4, Ruby, Sapphire, Emerald, Black Pearl).
   */
  phase: string | null;
  /** USD price across wears: cheapest → most expensive (null if unpriced). */
  priceMinUsd: number | null;
  priceMaxUsd: number | null;
  /** StatTrak™ USD range when available. */
  stattrakPriceMinUsd: number | null;
  stattrakPriceMaxUsd: number | null;
};

export type SlimCollection = {
  id: string;
  name: string;
  image: string | null;
  itemCount: number;
  /** True when the collection contains weapon skins (not stickers/charms/agents/…). */
  isSkinCollection: boolean;
};

/** Full item for detail pages (heavy fields omitted). */
export type CatalogItemDetail = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  kind: CatalogKind;
  rarity: CatalogRarity | null;
  marketHashName: string | null;
  weaponCategory: string | null;
  weaponCategoryId: string | null;
  weaponName: string | null;
  patternName: string | null;
  isKnife: boolean;
  isGlove: boolean;
  minFloat: number | null;
  maxFloat: number | null;
  wears: CatalogWear[];
  stattrak: boolean;
  souvenir: boolean;
  paintIndex: string | null;
  collections: CatalogNamedRef[];
  crates: CatalogNamedRef[];
  contains: CatalogContainsItem[];
  containsRare: CatalogContainsItem[];
  team: string | null;
  crateType: string | null;
  firstSaleDate: string | null;
  effect: string | null;
  tournamentName: string | null;
  stickerType: string | null;
  /** Skin pattern id (e.g. gs_train_cz75) for finish-style inference. */
  patternId: string | null;
  finishStyle: string | null;
  legacyModel: boolean | null;
  /**
   * Doppler / Gamma Doppler phase when applicable
   * (Phase 1–4, Ruby, Sapphire, Emerald, Black Pearl).
   */
  phase: string | null;
};

export type CatalogCollectionDetail = {
  id: string;
  name: string;
  image: string | null;
  crates: CatalogNamedRef[];
  contains: CatalogContainsItem[];
};

export const CATALOG_KIND_LABELS: Record<CatalogKind, string> = {
  skin: "Skins",
  collection: "Collections",
  crate: "Cases",
  key: "Keys",
  keychain: "Keychains",
  sticker: "Stickers",
  agent: "Agents",
  patch: "Patches",
  graffiti: "Graffiti",
  music_kit: "Music Kits",
  collectible: "Collectibles",
  highlight: "Highlights",
  base_weapon: "Base Weapons",
};

export const CATALOG_KIND_ORDER: CatalogKind[] = [
  "skin",
  "collection",
  "crate",
  "key",
  "keychain",
  "sticker",
  "agent",
  "patch",
  "graffiti",
  "music_kit",
  "collectible",
  "highlight",
  "base_weapon",
];
