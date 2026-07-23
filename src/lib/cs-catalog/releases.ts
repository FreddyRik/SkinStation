import type { NavFilter } from "@/lib/cs-catalog/nav";
import type { SlimCatalogItem, SlimCollection } from "@/lib/cs-catalog/types";

export type LatestReleaseCard = {
  id: string;
  image: string | null;
  title: string;
  subtitle: string;
  href: string | null;
  filter: NavFilter | null;
};

type FeaturedDef =
  | {
      id: string;
      title: string;
      subtitle: "SKINS" | "STICKERS" | "CASES";
      source: "collection";
    }
  | {
      id: string;
      title: string;
      subtitle: "SKINS" | "STICKERS" | "CASES";
      source: "crate";
    }
  | {
      id: string;
      title: string;
      subtitle: "STICKERS";
      source: "tournament";
      tournamentLabel: string;
      imageFromCrateId: string;
    };

/**
 * Curated “latest releases” row (marketplace-style frontpage).
 * IDs resolve against live ByMykel catalog; missing entries are skipped.
 */
export const FEATURED_RELEASES: FeaturedDef[] = [
  {
    id: "collection-set-spy-tech",
    title: "SPY TECH",
    subtitle: "SKINS",
    source: "collection",
  },
  {
    id: "collection-set-arabesque",
    title: "ARABESQUE",
    subtitle: "SKINS",
    source: "collection",
  },
  {
    id: "collection-set-fruits-veggies",
    title: "FRUIT & VEGGIE",
    subtitle: "STICKERS",
    source: "collection",
  },
  {
    id: "collection-set-auto-racing",
    title: "AUTO RACING",
    subtitle: "STICKERS",
    source: "collection",
  },
  {
    id: "crate-7041",
    title: "JACKASS",
    subtitle: "STICKERS",
    source: "crate",
  },
  {
    id: "featured-cologne-2026",
    title: "COLOGNE",
    subtitle: "STICKERS",
    source: "tournament",
    tournamentLabel: "2026 Cologne",
    imageFromCrateId: "crate-5317",
  },
];

function parseSaleDate(raw: string | null | undefined): number {
  if (!raw) return 0;
  // ByMykel mixes 2026-07-03 and 2024/01/24
  const normalized = raw.replace(/\//g, "-");
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

function crateSubtitle(crateType: string | null): "SKINS" | "STICKERS" | "CASES" {
  if (crateType === "Case") return "CASES";
  if (
    crateType === "Sticker Capsule" ||
    crateType === "Autograph Capsule"
  ) {
    return "STICKERS";
  }
  return "CASES";
}

function shortCrateTitle(name: string): string {
  return name
    .replace(/\s+Sticker Capsule$/i, "")
    .replace(/\s+Autograph Capsule$/i, "")
    .replace(/\s+Team Sticker Capsule$/i, "")
    .replace(/\s+Case$/i, "")
    .replace(/^StatTrak™\s+/i, "")
    .trim()
    .toUpperCase();
}

/** Build frontpage release cards from live catalog data. */
export function buildLatestReleaseCards(
  items: SlimCatalogItem[],
  collections: SlimCollection[],
  limit = 6,
): LatestReleaseCard[] {
  const byItemId = new Map(items.map((i) => [i.id, i]));
  const byCollectionId = new Map(collections.map((c) => [c.id, c]));
  const cards: LatestReleaseCard[] = [];
  const used = new Set<string>();

  for (const feat of FEATURED_RELEASES) {
    if (cards.length >= limit) break;
    if (feat.source === "collection") {
      const col = byCollectionId.get(feat.id);
      if (!col) continue;
      used.add(feat.id);
      cards.push({
        id: feat.id,
        image: col.image,
        title: feat.title,
        subtitle: feat.subtitle,
        href: `/collections/${encodeURIComponent(feat.id)}`,
        filter: null,
      });
      continue;
    }
    if (feat.source === "crate") {
      const crate = byItemId.get(feat.id);
      if (!crate) continue;
      used.add(feat.id);
      cards.push({
        id: feat.id,
        image: crate.image,
        title: feat.title,
        subtitle: feat.subtitle,
        href: `/database/${encodeURIComponent(feat.id)}`,
        filter: null,
      });
      continue;
    }
    // tournament
    const imgCrate = byItemId.get(feat.imageFromCrateId);
    used.add(feat.imageFromCrateId);
    cards.push({
      id: feat.id,
      image: imgCrate?.image ?? null,
      title: feat.title,
      subtitle: feat.subtitle,
      href: null,
      filter: {
        section: "stickers",
        sticker: { tournament: feat.tournamentLabel },
      },
    });
  }

  // Fill remaining slots from newest dated crates (cases / sticker capsules).
  if (cards.length < limit) {
    const dated = items
      .filter(
        (i) =>
          i.kind === "crate" &&
          i.firstSaleDate &&
          (i.crateType === "Case" || i.crateType === "Sticker Capsule") &&
          !used.has(i.id) &&
          !/^StatTrak/i.test(i.name),
      )
      .sort(
        (a, b) =>
          parseSaleDate(b.firstSaleDate) - parseSaleDate(a.firstSaleDate),
      );

    for (const crate of dated) {
      if (cards.length >= limit) break;
      used.add(crate.id);
      cards.push({
        id: crate.id,
        image: crate.image,
        title: shortCrateTitle(crate.name),
        subtitle: crateSubtitle(crate.crateType),
        href: `/database/${encodeURIComponent(crate.id)}`,
        filter: null,
      });
    }
  }

  return cards;
}
