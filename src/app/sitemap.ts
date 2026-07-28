import type { MetadataRoute } from "next";
import { getCatalogPayload } from "@/lib/cs-catalog";
import { absoluteUrl } from "@/lib/site";

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/inventory", priority: 0.9, changeFrequency: "weekly" },
  { path: "/database", priority: 0.9, changeFrequency: "weekly" },
  { path: "/tradeup", priority: 0.9, changeFrequency: "weekly" },
  { path: "/status", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, changeFrequency }) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency,
      priority,
    }),
  );

  const { items, collections } = await getCatalogPayload();

  for (const item of items) {
    if (item.kind === "collection") continue;
    entries.push({
      url: absoluteUrl(`/database/${encodeURIComponent(item.id)}`),
      lastModified,
      changeFrequency: "weekly",
      priority: item.kind === "skin" ? 0.8 : 0.6,
    });
  }

  for (const collection of collections) {
    entries.push({
      url: absoluteUrl(`/collections/${encodeURIComponent(collection.id)}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
