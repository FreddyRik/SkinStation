import type { SlimCatalogItem } from "@/lib/cs-catalog";

export function collectionHref(id: string): string {
  return `/collections/${encodeURIComponent(id)}`;
}

export function itemHref(item: SlimCatalogItem): string {
  if (item.kind === "collection") return collectionHref(item.id);
  return `/database/${encodeURIComponent(item.id)}`;
}
