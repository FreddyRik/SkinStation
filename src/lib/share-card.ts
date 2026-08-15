import type { Currency } from "@/lib/currency";
import { formatFloat, formatMoney } from "@/lib/format";
import { itemSupportsFloat, itemSupportsStickers } from "@/lib/item-flags";
import {
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_LABELS,
  itemPrice,
  itemPriceOrZero,
  parsePriceSource,
  type PriceSource,
} from "@/lib/price-source";
import {
  DEFAULT_SHARE_CARD_THEME,
  parseShareCardTheme,
  type ShareCardTheme,
} from "@/lib/share-card-theme";
import {
  getStickerIconCatalog,
  resolveStickerIconUrl,
} from "@/lib/stickers/catalog";
import {
  formatStickerWear,
  stripStickerPrefix,
} from "@/lib/stickers/normalize";
import { parseStickersJson } from "@/lib/stickers/parse";
import type { InventorySticker } from "@/types/inventory";

export type ShareStickerInput = InventorySticker;

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
  buffPrice: number | null;
  marketable?: boolean | null;
};

export type ShareTopSticker = {
  slot: number;
  name: string;
  iconUrl: string | null;
  wearLabel: string | null;
  value: number | null;
  valueLabel: string;
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
  supportsFloat: boolean;
  supportsStickers: boolean;
  floatValue: number | null;
  floatLabel: string | null;
  stickers: ShareTopSticker[];
  stickerTotal: number;
  stickerTotalLabel: string;
  value: number;
  valueLabel: string;
};

export type ShareCardStats = {
  itemCount: number;
  totalSteam: number;
  totalBuff: number;
  totalSteamLabel: string;
  totalBuffLabel: string;
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
  if (Array.isArray(raw)) {
    // Reuse the same defensive parser used for Prisma JSON strings.
    return parseStickersJson(JSON.stringify(raw));
  }
  if (typeof raw === "string") {
    return parseStickersJson(raw);
  }
  return [];
}

function mapStickers(
  stickers: ShareStickerInput[] | undefined,
  iconCatalog: Map<string, string>,
  currency: Currency,
  priceSource: PriceSource,
): ShareTopSticker[] {
  if (!Array.isArray(stickers) || stickers.length === 0) return [];
  return stickers.map((s, idx) => {
    const slot = s.slot ?? idx;
    const rawName = s.name?.trim() || `Sticker ${slot + 1}`;
    const value = itemPrice(
      {
        steamPrice: s.steamPrice ?? null,
        buffPrice: s.buffPrice ?? null,
      },
      priceSource,
    );
    return {
      slot,
      name: stickerDisplayName(rawName),
      iconUrl: resolveStickerIconUrl(iconCatalog, rawName, s.iconUrl),
      wearLabel: formatStickerWear(s.wear),
      value,
      valueLabel: formatMoney(value, currency),
    };
  });
}

function buildStatsFromCatalog(
  items: ShareItemInput[],
  currency: Currency,
  iconCatalog: Map<string, string>,
  priceSource: PriceSource,
): ShareCardStats {
  const totalSteam = items.reduce(
    (sum, i) => sum + (itemPrice(i, "steam") ?? 0),
    0,
  );
  const totalBuff = items.reduce(
    (sum, i) => sum + (itemPrice(i, "buff") ?? 0),
    0,
  );
  const pricedCount = items.filter(
    (i) => itemPrice(i, priceSource) != null,
  ).length;

  const headlineTotal =
    priceSource === "buff" ? totalBuff : totalSteam;

  const topItems = [...items]
    .sort(
      (a, b) =>
        itemPriceOrZero(b, priceSource) - itemPriceOrZero(a, priceSource),
    )
    .filter((item) => itemPriceOrZero(item, priceSource) > 0)
    .slice(0, 3)
    .map((item, index) => {
      const value = itemPriceOrZero(item, priceSource);
      const floatValue = item.floatValue ?? null;
      const supportsFloat =
        floatValue != null ||
        itemSupportsFloat(item.type, item.marketHashName);
      const supportsStickers = itemSupportsStickers(
        item.type,
        item.marketHashName,
      );
      const stickers = supportsStickers
        ? mapStickers(
            parseItemStickers(item.stickers),
            iconCatalog,
            currency,
            priceSource,
          )
        : [];
      const stickerTotal = stickers.reduce(
        (sum, s) => sum + (s.value ?? 0),
        0,
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
        supportsFloat,
        supportsStickers,
        floatValue,
        floatLabel: supportsFloat
          ? floatValue != null
            ? formatFloat(floatValue)
            : "-"
          : null,
        stickers,
        stickerTotal,
        stickerTotalLabel: formatMoney(
          stickerTotal > 0 ? stickerTotal : null,
          currency,
        ),
        value,
        valueLabel: formatMoney(value || null, currency),
      };
    });

  return {
    itemCount: items.length,
    totalSteam,
    totalBuff,
    totalSteamLabel: formatMoney(totalSteam, currency),
    totalBuffLabel: formatMoney(totalBuff, currency),
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

const ALLOWED_IMAGE_HOST_EXACT = new Set([
  "steamcdn-a.akamaihd.net",
  "steamcommunity-a.akamaihd.net",
]);

/** Steam CDN hostnames (incl. redirect targets like *.fastly.steamstatic.com). */
export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (ALLOWED_IMAGE_HOST_EXACT.has(host)) return true;
  // community / avatars / cdn / clan / *.cloudflare / *.akamai / *.fastly
  return host === "steamstatic.com" || host.endsWith(".steamstatic.com");
}

/**
 * Same-origin proxy URL so canvas/html-to-image can export Steam CDN images.
 * Also normalizes bare economy image hashes to the Steam CDN base URL.
 */
export function proxiedImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  let absolute = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    // Relative Steam economy path / hash stored without a host.
    const path = trimmed.replace(/^\/+/, "");
    absolute = path.includes("/")
      ? `https://community.cloudflare.steamstatic.com/${path}`
      : `https://community.cloudflare.steamstatic.com/economy/image/${path}`;
  }

  try {
    const parsed = new URL(absolute);
    if (!isAllowedImageHost(parsed.hostname)) return absolute;
    return `/api/image-proxy?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return absolute;
  }
}

export function sharePagePath(
  profileId: string,
  priceSource: PriceSource = DEFAULT_PRICE_SOURCE,
  theme: ShareCardTheme = DEFAULT_SHARE_CARD_THEME,
): string {
  const source = parsePriceSource(priceSource);
  const shareTheme = parseShareCardTheme(theme);
  return `/share/${profileId}?source=${source}&theme=${shareTheme}`;
}
