import type { Currency } from "@/lib/currency";
import { formatFloat, formatMoney } from "@/lib/format";
import {
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_LABELS,
  itemPriceOrZero,
  parsePriceSource,
  type PriceSource,
} from "@/lib/price-source";
import {
  getStickerIconCatalog,
  itemSupportsStickers,
  resolveStickerIconUrl,
} from "@/lib/stickers/catalog";
import {
  formatStickerWear,
  stripStickerPrefix,
} from "@/lib/stickers/normalize";

export type ShareStickerInput = {
  slot?: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
};

export type ShareItemInput = {
  id: string;
  marketHashName: string;
  name: string;
  iconUrl: string | null;
  exterior: string | null;
  rarity: string | null;
  type?: string | null;
  floatValue?: number | null;
  /** Parsed sticker array, or raw JSON string from Prisma. */
  stickers?: ShareStickerInput[] | string | null;
  steamPrice: number | null;
  skinportPrice: number | null;
};

export type ShareTopSticker = {
  slot: number;
  name: string;
  iconUrl: string | null;
  wearLabel: string | null;
};

export type ShareTopItem = {
  rank: number;
  id: string;
  marketHashName: string;
  displayName: string;
  iconUrl: string | null;
  exterior: string | null;
  rarity: string | null;
  type: string | null;
  supportsStickers: boolean;
  floatValue: number | null;
  floatLabel: string;
  stickers: ShareTopSticker[];
  value: number;
  valueLabel: string;
};

export type ShareCardStats = {
  itemCount: number;
  totalSteam: number;
  totalSkinport: number;
  totalSteamLabel: string;
  totalSkinportLabel: string;
  priceSource: PriceSource;
  headlineTotal: number;
  headlineLabel: string;
  priceSourceLabel: string;
  topItems: ShareTopItem[];
  pricedCount: number;
};

function stickerDisplayName(name: string): string {
  return stripStickerPrefix(name) || name;
}

function parseItemStickers(raw: unknown): ShareStickerInput[] {
  if (Array.isArray(raw)) return raw as ShareStickerInput[];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as ShareStickerInput[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapStickers(
  stickers: ShareStickerInput[] | undefined,
  iconCatalog: Map<string, string>,
): ShareTopSticker[] {
  if (!Array.isArray(stickers) || stickers.length === 0) return [];
  return stickers.map((s, idx) => {
    const slot = s.slot ?? idx;
    const rawName = s.name?.trim() || `Sticker ${slot + 1}`;
    return {
      slot,
      name: stickerDisplayName(rawName),
      iconUrl: resolveStickerIconUrl(iconCatalog, rawName, s.iconUrl),
      wearLabel: formatStickerWear(s.wear),
    };
  });
}

function buildStatsFromCatalog(
  items: ShareItemInput[],
  currency: Currency,
  iconCatalog: Map<string, string>,
  priceSource: PriceSource,
): ShareCardStats {
  const totalSteam = items.reduce((sum, i) => sum + (i.steamPrice ?? 0), 0);
  const totalSkinport = items.reduce(
    (sum, i) => sum + (i.skinportPrice ?? 0),
    0,
  );
  const pricedCount = items.filter(
    (i) => i.skinportPrice != null || i.steamPrice != null,
  ).length;

  const headlineTotal =
    priceSource === "skinport" ? totalSkinport : totalSteam;

  const topItems = [...items]
    .sort(
      (a, b) =>
        itemPriceOrZero(b, priceSource) - itemPriceOrZero(a, priceSource),
    )
    .slice(0, 3)
    .map((item, index) => {
      const value = itemPriceOrZero(item, priceSource);
      const floatValue = item.floatValue ?? null;
      const supportsStickers = itemSupportsStickers(
        item.type,
        item.marketHashName,
      );
      return {
        rank: index + 1,
        id: item.id,
        marketHashName: item.marketHashName,
        displayName: item.marketHashName,
        iconUrl: item.iconUrl,
        exterior: item.exterior,
        rarity: item.rarity,
        type: item.type ?? null,
        supportsStickers,
        floatValue,
        floatLabel: formatFloat(floatValue),
        stickers: supportsStickers
          ? mapStickers(parseItemStickers(item.stickers), iconCatalog)
          : [],
        value,
        valueLabel: formatMoney(value || null, currency),
      };
    });

  return {
    itemCount: items.length,
    totalSteam,
    totalSkinport,
    totalSteamLabel: formatMoney(totalSteam, currency),
    totalSkinportLabel: formatMoney(totalSkinport, currency),
    priceSource,
    headlineTotal,
    headlineLabel: formatMoney(headlineTotal, currency),
    priceSourceLabel: PRICE_SOURCE_LABELS[priceSource],
    topItems,
    pricedCount,
  };
}

/** Sync build without sticker CDN enrichment (metadata / fallback). */
export function buildShareCardStats(
  items: ShareItemInput[],
  currency: Currency,
  priceSource: PriceSource = DEFAULT_PRICE_SOURCE,
): ShareCardStats {
  return buildStatsFromCatalog(
    items,
    currency,
    new Map(),
    parsePriceSource(priceSource),
  );
}

/** Preferred: resolves missing sticker icons from the public sticker catalog. */
export async function buildShareCardStatsAsync(
  items: ShareItemInput[],
  currency: Currency,
  priceSource: PriceSource = DEFAULT_PRICE_SOURCE,
): Promise<ShareCardStats> {
  const iconCatalog = await getStickerIconCatalog();
  return buildStatsFromCatalog(
    items,
    currency,
    iconCatalog,
    parsePriceSource(priceSource),
  );
}

const ALLOWED_IMAGE_HOSTS = new Set([
  "community.cloudflare.steamstatic.com",
  "community.akamai.steamstatic.com",
  "cdn.steamstatic.com",
  "steamcdn-a.akamaihd.net",
  "steamcommunity-a.akamaihd.net",
  "avatars.steamstatic.com",
  "avatars.cloudflare.steamstatic.com",
  "cdn.cloudflare.steamstatic.com",
]);

export function isAllowedImageHost(hostname: string): boolean {
  return ALLOWED_IMAGE_HOSTS.has(hostname);
}

/** Same-origin proxy URL so canvas/html-to-image can export Steam CDN images. */
export function proxiedImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const parsed = new URL(src);
    if (!isAllowedImageHost(parsed.hostname)) return src;
    return `/api/image-proxy?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

export function sharePagePath(
  profileId: string,
  priceSource: PriceSource = DEFAULT_PRICE_SOURCE,
): string {
  const source = parsePriceSource(priceSource);
  return `/share/${profileId}?source=${source}`;
}
