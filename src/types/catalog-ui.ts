import type {
  BrowseCatalogItem,
  LatestReleaseCard,
  NavFilter,
  SlimCatalogItem,
  SlimCollection,
} from "@/lib/cs-catalog";

export type UsdRangeFormatter = (
  min: number | null,
  max: number | null,
) => string | null;

export type CatalogCardProps = {
  item: BrowseCatalogItem;
  formatUsdRange: UsdRangeFormatter;
  onWeaponClick?: (weaponName: string, weaponCategory: string | null) => void;
};

export type CollectionCardProps = {
  id: string;
  image: string | null;
  name: string;
  itemCount: number;
};

export type LatestReleasesProps = {
  cards: LatestReleaseCard[];
  onActivate: (card: LatestReleaseCard) => void;
};

export type CatalogNavRailProps = {
  filter: NavFilter;
  items: SlimCatalogItem[];
  collections: SlimCollection[];
  onApplyFilter: (next: NavFilter) => void;
  onNavigateCollection: (id: string) => void;
};
