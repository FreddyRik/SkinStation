export type {
  CatalogKind,
  CatalogRarity,
  CatalogNamedRef,
  CatalogWear,
  CatalogContainsItem,
  SlimCatalogItem,
  SlimCollection,
  CatalogItemDetail,
  CatalogCollectionDetail,
} from "@/lib/cs-catalog/types";

export {
  CATALOG_KIND_LABELS,
  CATALOG_KIND_ORDER,
} from "@/lib/cs-catalog/types";

export {
  getCatalogItems,
  getCollectionsCatalog,
  getCatalogPayload,
  getCatalogMaps,
  getItemById,
  getCollectionById,
} from "@/lib/cs-catalog/catalog";

export {
  isKnifeSkin,
  isGloveSkin,
  isKnifeCategory,
  isGloveCategory,
  isZeusWeapon,
  effectiveWeaponCategory,
  KNIFE_CATEGORY_ID,
  GLOVE_CATEGORY_ID,
  PISTOLS_CATEGORY_ID,
} from "@/lib/cs-catalog/flags";

export {
  DEFAULT_NAV_FILTER,
  NAV_SECTION_LABELS,
  NAV_SECTION_ORDER,
  SKIN_SECTION_CATEGORIES,
  STICKER_TOURNAMENTS,
  OTHER_NAV_ITEMS,
  itemMatchesNavFilter,
  uniqueWeaponsForSection,
  weaponCases,
  navFilterLabel,
  navFilterForWeapon,
} from "@/lib/cs-catalog/nav";

export type {
  NavSection,
  NavFilter,
  StickerNavKey,
  OtherNavKey,
} from "@/lib/cs-catalog/nav";

export {
  FEATURED_RELEASES,
  buildLatestReleaseCards,
} from "@/lib/cs-catalog/releases";

export type { LatestReleaseCard } from "@/lib/cs-catalog/releases";

export {
  WEAR_BANDS,
  wearBandForName,
  wearRangeForSkin,
  skinMarketHashName,
  finishStyleFromPatternId,
  formatFloatShort,
} from "@/lib/cs-catalog/wears";

export type { WearKey, WearBand, SkinVariant } from "@/lib/cs-catalog/wears";

export {
  resolveSkinPhase,
  formatPhaseShort,
  phaseAccent,
} from "@/lib/cs-catalog/phase";

export {
  phaseFamilyKey,
  groupPhasedSkins,
  findPhaseSiblings,
  sortPhasesForDisplay,
  collapsePhasedContains,
} from "@/lib/cs-catalog/phase-family";

export type {
  PhaseSibling,
  BrowseCatalogItem,
} from "@/lib/cs-catalog/phase-family";

export {
  buildSkinDetailPrices,
  skinVariantPriceRange,
} from "@/lib/cs-catalog/skin-prices";

export type {
  SkinWearPriceRow,
  SkinDetailPrices,
  SkinPriceRange,
} from "@/lib/cs-catalog/skin-prices";

export {
  catalogItemMarketHash,
  enrichSlimItemsWithPrices,
  buildCatalogBuyOffers,
  enrichContainsWithPrices,
  isSingleHashPricedKind,
} from "@/lib/cs-catalog/catalog-prices";

export type {
  CatalogBuyOffers,
  PricedContainsItem,
} from "@/lib/cs-catalog/catalog-prices";
