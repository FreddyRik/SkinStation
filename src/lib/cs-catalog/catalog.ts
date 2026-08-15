import {
  effectiveWeaponCategory,
  effectiveWeaponCategoryId,
  isGloveCategory,
  isKnifeCategory,
  isZeusWeapon,
} from "@/lib/cs-catalog/flags";
import { resolveSkinPhase } from "@/lib/cs-catalog/phase";
import { finishStyleFromPatternId } from "@/lib/cs-catalog/wears";
import type {
  CatalogCollectionDetail,
  CatalogContainsItem,
  CatalogItemDetail,
  CatalogKind,
  CatalogLootList,
  CatalogNamedRef,
  CatalogRarity,
  CatalogWear,
  SlimCatalogItem,
  SlimCollection,
} from "@/lib/cs-catalog/types";
import { SITE_USER_AGENT } from "@/lib/site";

const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const API_BASE =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";

const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": SITE_USER_AGENT,
} as const;

type RawRarity = {
  id?: string;
  name?: string;
  color?: string;
};

type RawNamed = {
  id?: string;
  name?: string;
  image?: string;
};

type RawContains = {
  id?: string;
  name?: string;
  image?: string;
  rarity?: RawRarity;
  paint_index?: string;
};

type RawSkin = {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  weapon?: { id?: string; name?: string; weapon_id?: number };
  category?: { id?: string; name?: string };
  pattern?: { id?: string; name?: string };
  rarity?: RawRarity;
  min_float?: number;
  max_float?: number;
  wears?: { id?: string; name?: string }[];
  stattrak?: boolean;
  souvenir?: boolean;
  paint_index?: string;
  collections?: RawNamed[];
  crates?: RawNamed[];
  team?: { id?: string; name?: string };
  market_hash_name?: string;
  legacy_model?: boolean;
  /** Doppler / Gamma Doppler phase label from ByMykel. */
  phase?: string;
};

type RawCollection = {
  id?: string;
  name?: string;
  image?: string;
  crates?: RawNamed[];
  contains?: RawContains[];
};

type RawCrate = {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  type?: string | null;
  first_sale_date?: string;
  rarity?: RawRarity;
  contains?: RawContains[];
  contains_rare?: RawContains[];
  market_hash_name?: string;
  loot_list?: {
    name?: string | null;
    footer?: string | null;
    image?: string | null;
  } | null;
};

type RawSimpleItem = {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  rarity?: RawRarity;
  market_hash_name?: string | null;
  crates?: RawNamed[];
  collections?: RawNamed[];
  effect?: string;
  type?: string | null;
  team?: { id?: string; name?: string };
  category?: { id?: string; name?: string };
  def_index?: string | number;
  tournament?: { id?: number | string; name?: string } | null;
};

type CatalogBundle = {
  fetchedAt: number;
  items: SlimCatalogItem[];
  collections: SlimCollection[];
  byId: Map<string, CatalogItemDetail>;
  collectionsById: Map<string, CatalogCollectionDetail>;
};

let memory: CatalogBundle | null = null;
let inflight: Promise<CatalogBundle> | null = null;

function asRarity(raw?: RawRarity | null): CatalogRarity | null {
  if (!raw?.id || !raw.name) return null;
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color ?? "#ffffff",
  };
}

function asNamedRefs(list?: RawNamed[] | null): CatalogNamedRef[] {
  if (!Array.isArray(list)) return [];
  const out: CatalogNamedRef[] = [];
  for (const row of list) {
    if (!row?.id || !row.name) continue;
    out.push({
      id: row.id,
      name: row.name,
      image: row.image?.trim() || null,
    });
  }
  return out;
}

function asLootList(
  raw?: RawCrate["loot_list"] | null,
): CatalogLootList | null {
  if (!raw || typeof raw !== "object") return null;
  const name = raw.name?.trim() || null;
  const footer = raw.footer?.trim() || null;
  const image = raw.image?.trim() || null;
  if (!name && !footer && !image) return null;
  return { name, footer, image };
}

function asContains(list?: RawContains[] | null): CatalogContainsItem[] {
  if (!Array.isArray(list)) return [];
  const out: CatalogContainsItem[] = [];
  for (const row of list) {
    if (!row?.id || !row.name) continue;
    out.push({
      id: row.id,
      name: row.name,
      image: row.image?.trim() || null,
      rarity: asRarity(row.rarity),
      paint_index: row.paint_index ?? null,
    });
  }
  return out;
}

function asWears(list?: { id?: string; name?: string }[] | null): CatalogWear[] {
  if (!Array.isArray(list)) return [];
  const out: CatalogWear[] = [];
  for (const row of list) {
    if (!row?.id || !row.name) continue;
    out.push({ id: row.id, name: row.name });
  }
  return out;
}

async function fetchJsonArray(path: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${API_BASE}/${path}`, {
      headers: FETCH_HEADERS,
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      console.warn(`CS catalog ${path} failed (HTTP ${res.status}).`);
      return [];
    }
    const data: unknown = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`CS catalog ${path} failed:`, err);
    return [];
  }
}

function slimFromDetail(detail: CatalogItemDetail): SlimCatalogItem {
  const collection = detail.collections[0] ?? null;
  const crate = detail.crates[0] ?? null;
  // Prefer collection for skin footers; otherwise first crate.
  const source =
    detail.kind === "skin" ? (collection ?? crate) : (crate ?? collection);
  const sourceKind: "collection" | "crate" | null = !source
    ? null
    : collection && source.id === collection.id
      ? "collection"
      : "crate";
  return {
    id: detail.id,
    name: detail.name,
    image: detail.image,
    kind: detail.kind,
    rarity: detail.rarity,
    marketHashName: detail.marketHashName,
    weaponCategory: detail.weaponCategory,
    weaponCategoryId: detail.weaponCategoryId,
    weaponName: detail.weaponName,
    patternName: detail.patternName,
    isKnife: detail.isKnife,
    isGlove: detail.isGlove,
    crateType: detail.crateType,
    lootListImage: detail.lootList?.image ?? null,
    crateIds: detail.crates.map((c) => c.id),
    firstSaleDate: detail.firstSaleDate,
    tournamentName: detail.tournamentName,
    stickerType: detail.stickerType,
    stattrak: detail.stattrak,
    souvenir: detail.souvenir,
    sourceName: source?.name ?? null,
    sourceImage: source?.image ?? null,
    sourceId: source?.id ?? null,
    sourceKind,
    collectionCount: detail.collections.length,
    minFloat: detail.minFloat,
    maxFloat: detail.maxFloat,
    wearNames: detail.wears.map((w) => w.name),
    phase: detail.phase,
    priceMinUsd: null,
    priceMaxUsd: null,
    stattrakPriceMinUsd: null,
    stattrakPriceMaxUsd: null,
  };
}

/** Parse ByMykel sale dates (`2024-01-16` or `2024/01/16`). */
function parseSaleDateMs(raw: string | null | undefined): number {
  if (!raw) return 0;
  const t = Date.parse(raw.replace(/\//g, "-"));
  return Number.isFinite(t) ? t : 0;
}

function earliestSaleDate(dates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestMs = Infinity;
  for (const d of dates) {
    const ms = parseSaleDateMs(d);
    if (ms > 0 && ms < bestMs) {
      bestMs = ms;
      best = d;
    }
  }
  return best;
}

/**
 * ByMykel's `souvenir` boolean is true for most weapon skins, including case
 * drops that have never had a Souvenir version. Trust souvenir packages:
 * a skin can drop as Souvenir only if it appears in a crate with type Souvenir.
 */
function applySouvenirFlags(byId: Map<string, CatalogItemDetail>): void {
  const souvenirIds = new Set<string>();
  for (const item of byId.values()) {
    if (item.kind !== "crate" || item.crateType !== "Souvenir") continue;
    for (const row of item.contains) souvenirIds.add(row.id);
  }
  for (const [id, detail] of byId) {
    if (detail.kind !== "skin") continue;
    const souvenir = souvenirIds.has(id);
    if (detail.souvenir === souvenir) continue;
    byId.set(id, { ...detail, souvenir });
  }
}

/**
 * Skins/stickers/etc. have no native release field in ByMykel.
 * Derive from linked crates (and crates of linked collections), plus a
 * reverse index of crate contains / contains_rare.
 */
function applyDerivedSaleDates(
  byId: Map<string, CatalogItemDetail>,
  collectionsById: Map<string, CatalogCollectionDetail>,
): void {
  const datesByContentId = new Map<string, string[]>();
  function addContentDate(contentId: string, date: string) {
    const list = datesByContentId.get(contentId);
    if (list) list.push(date);
    else datesByContentId.set(contentId, [date]);
  }

  for (const item of byId.values()) {
    if (item.kind !== "crate" || !item.firstSaleDate) continue;
    for (const row of item.contains) addContentDate(row.id, item.firstSaleDate);
    for (const row of item.containsRare)
      addContentDate(row.id, item.firstSaleDate);
  }

  for (const [id, detail] of byId) {
    // Keep authoritative crate dates; only fill missing elsewhere.
    if (detail.kind === "crate" && detail.firstSaleDate) continue;

    const candidates: string[] = [];
    if (detail.firstSaleDate) candidates.push(detail.firstSaleDate);

    for (const crate of detail.crates) {
      const d = byId.get(crate.id)?.firstSaleDate;
      if (d) candidates.push(d);
    }
    for (const col of detail.collections) {
      const colDetail = collectionsById.get(col.id);
      if (!colDetail) continue;
      for (const crate of colDetail.crates) {
        const d = byId.get(crate.id)?.firstSaleDate;
        if (d) candidates.push(d);
      }
    }
    const reverse = datesByContentId.get(id);
    if (reverse) candidates.push(...reverse);

    const derived = earliestSaleDate(candidates);
    if (derived && derived !== detail.firstSaleDate) {
      byId.set(id, { ...detail, firstSaleDate: derived });
    }
  }

  // Collection detail pages / unified lookup.
  for (const [id, col] of collectionsById) {
    const candidates: string[] = [];
    for (const crate of col.crates) {
      const d = byId.get(crate.id)?.firstSaleDate;
      if (d) candidates.push(d);
    }
    const derived = earliestSaleDate(candidates);
    if (!derived) continue;
    const existing = byId.get(id);
    if (existing && existing.firstSaleDate !== derived) {
      byId.set(id, { ...existing, firstSaleDate: derived });
    }
  }
}

function mapSkin(raw: RawSkin): CatalogItemDetail | null {
  if (!raw.id || !raw.name) return null;
  const categoryId = raw.category?.id ?? null;
  const patternId = raw.pattern?.id ?? null;
  const weaponName = raw.weapon?.name ?? null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description?.trim() || null,
    image: raw.image?.trim() || null,
    kind: "skin",
    rarity: asRarity(raw.rarity),
    marketHashName: raw.market_hash_name?.trim() || null,
    weaponCategory: effectiveWeaponCategory(raw.category?.name, weaponName),
    weaponCategoryId: effectiveWeaponCategoryId(categoryId, weaponName),
    weaponName,
    patternName: raw.pattern?.name ?? null,
    isKnife: isKnifeCategory(categoryId) && !isZeusWeapon(weaponName),
    isGlove: isGloveCategory(categoryId),
    minFloat: typeof raw.min_float === "number" ? raw.min_float : null,
    maxFloat: typeof raw.max_float === "number" ? raw.max_float : null,
    wears: asWears(raw.wears),
    stattrak: Boolean(raw.stattrak),
    souvenir: Boolean(raw.souvenir),
    paintIndex: raw.paint_index ?? null,
    collections: asNamedRefs(raw.collections),
    crates: asNamedRefs(raw.crates),
    contains: [],
    containsRare: [],
    lootList: null,
    team: raw.team?.name ?? null,
    crateType: null,
    firstSaleDate: null,
    effect: null,
    tournamentName: null,
    stickerType: null,
    patternId,
    finishStyle: finishStyleFromPatternId(patternId),
    legacyModel:
      typeof raw.legacy_model === "boolean" ? raw.legacy_model : null,
    phase: resolveSkinPhase({
      phase: raw.phase,
      paintIndex: raw.paint_index,
      patternId,
    }),
  };
}

function mapSimple(
  raw: RawSimpleItem,
  kind: CatalogKind,
): CatalogItemDetail | null {
  if (!raw.id || !raw.name) return null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description?.trim() || null,
    image: raw.image?.trim() || null,
    kind,
    rarity: asRarity(raw.rarity),
    marketHashName: raw.market_hash_name?.trim() || null,
    weaponCategory: raw.category?.name ?? null,
    weaponCategoryId: raw.category?.id ?? null,
    weaponName: null,
    patternName: null,
    isKnife: false,
    isGlove: false,
    minFloat: null,
    maxFloat: null,
    wears: [],
    stattrak: false,
    souvenir: false,
    paintIndex: null,
    collections: asNamedRefs(raw.collections),
    crates: asNamedRefs(raw.crates),
    contains: [],
    containsRare: [],
    lootList: null,
    team: raw.team?.name ?? null,
    crateType: raw.type ?? null,
    firstSaleDate: null,
    effect: raw.effect?.trim() || null,
    tournamentName:
      kind === "sticker" ? raw.tournament?.name?.trim() || null : null,
    stickerType: kind === "sticker" ? raw.type?.trim() || null : null,
    patternId: null,
    finishStyle: null,
    legacyModel: null,
    phase: null,
  };
}

function mapCrate(raw: RawCrate): CatalogItemDetail | null {
  if (!raw.id || !raw.name) return null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description?.trim() || null,
    image: raw.image?.trim() || null,
    kind: "crate",
    rarity: asRarity(raw.rarity),
    marketHashName: raw.market_hash_name?.trim() || null,
    weaponCategory: null,
    weaponCategoryId: null,
    weaponName: null,
    patternName: null,
    isKnife: false,
    isGlove: false,
    minFloat: null,
    maxFloat: null,
    wears: [],
    stattrak: false,
    souvenir: false,
    paintIndex: null,
    collections: [],
    crates: [],
    contains: asContains(raw.contains),
    containsRare: asContains(raw.contains_rare),
    lootList: asLootList(raw.loot_list),
    team: null,
    crateType: raw.type ?? null,
    firstSaleDate: raw.first_sale_date ?? null,
    effect: null,
    tournamentName: null,
    stickerType: null,
    patternId: null,
    finishStyle: null,
    legacyModel: null,
    phase: null,
  };
}

function mapCollection(raw: RawCollection): CatalogCollectionDetail | null {
  if (!raw.id || !raw.name) return null;
  return {
    id: raw.id,
    name: raw.name,
    image: raw.image?.trim() || null,
    crates: asNamedRefs(raw.crates),
    contains: asContains(raw.contains),
  };
}

/** Weapon skin sets only — exclude sticker/charm/agent/graffiti collections. */
function isSkinCollectionContains(contains: CatalogContainsItem[]): boolean {
  return contains.some((item) => item.id.startsWith("skin-"));
}

function collectionToSlim(detail: CatalogCollectionDetail): SlimCollection {
  return {
    id: detail.id,
    name: detail.name,
    image: detail.image,
    itemCount: detail.contains.length,
    isSkinCollection: isSkinCollectionContains(detail.contains),
  };
}

function collectionAsItem(detail: CatalogCollectionDetail): CatalogItemDetail {
  return {
    id: detail.id,
    name: detail.name,
    description: null,
    image: detail.image,
    kind: "collection",
    rarity: null,
    marketHashName: null,
    weaponCategory: null,
    weaponCategoryId: null,
    weaponName: null,
    patternName: null,
    isKnife: false,
    isGlove: false,
    minFloat: null,
    maxFloat: null,
    wears: [],
    stattrak: false,
    souvenir: false,
    paintIndex: null,
    collections: [],
    crates: detail.crates,
    contains: detail.contains,
    containsRare: [],
    lootList: null,
    team: null,
    crateType: null,
    firstSaleDate: null,
    effect: null,
    tournamentName: null,
    stickerType: null,
    patternId: null,
    finishStyle: null,
    legacyModel: null,
    phase: null,
  };
}

async function loadBundle(): Promise<CatalogBundle> {
  const [
    skins,
    collections,
    crates,
    keys,
    keychains,
    stickers,
    agents,
    patches,
    graffiti,
    musicKits,
    collectibles,
    highlights,
    baseWeapons,
  ] = await Promise.all([
    fetchJsonArray("skins.json"),
    fetchJsonArray("collections.json"),
    fetchJsonArray("crates.json"),
    fetchJsonArray("keys.json"),
    fetchJsonArray("keychains.json"),
    fetchJsonArray("stickers.json"),
    fetchJsonArray("agents.json"),
    fetchJsonArray("patches.json"),
    fetchJsonArray("graffiti.json"),
    fetchJsonArray("music_kits.json"),
    fetchJsonArray("collectibles.json"),
    fetchJsonArray("highlights.json"),
    fetchJsonArray("base_weapons.json"),
  ]);

  const byId = new Map<string, CatalogItemDetail>();
  const collectionsById = new Map<string, CatalogCollectionDetail>();
  const slimCollections: SlimCollection[] = [];

  const pushItem = (detail: CatalogItemDetail | null) => {
    if (!detail) return;
    byId.set(detail.id, detail);
  };

  for (const row of skins as RawSkin[]) pushItem(mapSkin(row));
  for (const row of crates as RawCrate[]) pushItem(mapCrate(row));
  for (const row of keys as RawSimpleItem[]) pushItem(mapSimple(row, "key"));
  for (const row of keychains as RawSimpleItem[])
    pushItem(mapSimple(row, "keychain"));
  for (const row of stickers as RawSimpleItem[])
    pushItem(mapSimple(row, "sticker"));
  for (const row of agents as RawSimpleItem[])
    pushItem(mapSimple(row, "agent"));
  for (const row of patches as RawSimpleItem[])
    pushItem(mapSimple(row, "patch"));
  for (const row of graffiti as RawSimpleItem[])
    pushItem(mapSimple(row, "graffiti"));
  for (const row of musicKits as RawSimpleItem[])
    pushItem(mapSimple(row, "music_kit"));
  for (const row of collectibles as RawSimpleItem[])
    pushItem(mapSimple(row, "collectible"));
  for (const row of highlights as RawSimpleItem[])
    pushItem(mapSimple(row, "highlight"));
  for (const row of baseWeapons as RawSimpleItem[])
    pushItem(mapSimple(row, "base_weapon"));

  for (const row of collections as RawCollection[]) {
    const detail = mapCollection(row);
    if (!detail) continue;
    collectionsById.set(detail.id, detail);
    slimCollections.push(collectionToSlim(detail));
    // Also index collections in byId for unified /database/[id] lookup.
    byId.set(detail.id, collectionAsItem(detail));
  }

  applyDerivedSaleDates(byId, collectionsById);
  applySouvenirFlags(byId);

  const items: SlimCatalogItem[] = [];
  for (const detail of byId.values()) {
    if (detail.kind === "collection") continue;
    items.push(slimFromDetail(detail));
  }

  return {
    fetchedAt: Date.now(),
    items,
    collections: slimCollections,
    byId,
    collectionsById,
  };
}

async function getBundle(force = false): Promise<CatalogBundle> {
  if (!force && memory && Date.now() - memory.fetchedAt < CATALOG_TTL_MS) {
    return memory;
  }
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const bundle = await loadBundle();
      // Keep previous memory if everything came back empty (transient failure).
      if (
        bundle.items.length === 0 &&
        bundle.collections.length === 0 &&
        memory
      ) {
        return memory;
      }
      memory = bundle;
      return bundle;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function getCatalogItems(
  force = false,
): Promise<SlimCatalogItem[]> {
  const bundle = await getBundle(force);
  return bundle.items;
}

export async function getCollectionsCatalog(
  force = false,
): Promise<SlimCollection[]> {
  const bundle = await getBundle(force);
  return bundle.collections;
}

export async function getCatalogPayload(force = false): Promise<{
  items: SlimCatalogItem[];
  collections: SlimCollection[];
}> {
  const bundle = await getBundle(force);
  return { items: bundle.items, collections: bundle.collections };
}

/** Full in-memory maps for features that need contains / containsRare. */
export async function getCatalogMaps(force = false): Promise<{
  items: SlimCatalogItem[];
  collections: SlimCollection[];
  byId: Map<string, CatalogItemDetail>;
  collectionsById: Map<string, CatalogCollectionDetail>;
}> {
  const bundle = await getBundle(force);
  return {
    items: bundle.items,
    collections: bundle.collections,
    byId: bundle.byId,
    collectionsById: bundle.collectionsById,
  };
}

export async function getItemById(
  id: string,
  force = false,
): Promise<CatalogItemDetail | null> {
  const bundle = await getBundle(force);
  return bundle.byId.get(id) ?? null;
}

export async function getCollectionById(
  id: string,
  force = false,
): Promise<CatalogCollectionDetail | null> {
  const bundle = await getBundle(force);
  return bundle.collectionsById.get(id) ?? null;
}
