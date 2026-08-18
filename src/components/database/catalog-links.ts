import { DEFAULT_CATALOG_SORT } from "@/lib/cs-catalog/sort";
import type { NavFilter } from "@/lib/cs-catalog/nav";
import type { SlimCatalogItem } from "@/lib/cs-catalog/types";
import type { CatalogSort } from "@/types/catalog";

export function collectionHref(id: string): string {
  return `/collections/${encodeURIComponent(id)}`;
}

export function itemHref(item: SlimCatalogItem): string {
  if (item.kind === "collection") return collectionHref(item.id);
  return `/database/${encodeURIComponent(item.id)}`;
}

/** Shareable /database URL for the current nav filter + catalog sort. */
export function databaseHref(
  filter: NavFilter,
  sort: CatalogSort = DEFAULT_CATALOG_SORT,
): string {
  const params = new URLSearchParams();

  if (filter.section !== "home") {
    params.set("section", filter.section);
    if (
      (filter.section === "pistols" ||
        filter.section === "mid_tier" ||
        filter.section === "rifles" ||
        filter.section === "knives" ||
        filter.section === "gloves") &&
      filter.weapon
    ) {
      params.set("weapon", filter.weapon);
    }
    if (filter.section === "cases" && filter.crateId) {
      params.set("crate", filter.crateId);
    }
    if (filter.section === "other") {
      params.set("other", filter.other);
    }
  }

  if (sort !== DEFAULT_CATALOG_SORT) {
    params.set("sort", sort);
  }

  const qs = params.toString();
  return qs ? `/database?${qs}` : "/database";
}
