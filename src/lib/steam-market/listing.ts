import { isKnownUnlistableItem } from "@/lib/item-flags";

const CS2_APP_ID = 730;

/** Steam Community Market listing URL for a CS2 item. */
export function steamMarketListingUrl(marketHashName: string): string {
  return `https://steamcommunity.com/market/listings/${CS2_APP_ID}/${encodeURIComponent(marketHashName)}`;
}

/** Buff163 goods page for a known goods_id. */
export function buffMarketListingUrl(goodsId: number): string {
  return `https://buff.163.com/goods/${goodsId}`;
}

type LinkableItem = {
  steamPrice?: number | null;
  buffPrice?: number | null;
  buffGoodsId?: number | null;
  type?: string | null;
  marketHashName?: string | null;
  name?: string | null;
};

function isLinkBlockedItem(item: LinkableItem): boolean {
  const t = (item.type ?? "").toLowerCase();
  if (t.includes("collectible")) return true;
  return isKnownUnlistableItem(item.type, item.marketHashName, item.name);
}

/**
 * Show a Steam Market link when we have a Steam price and the item isn't a
 * collectible / other known unlistable type.
 */
export function canLinkSteamMarket(item: LinkableItem): boolean {
  if (item.steamPrice == null) return false;
  if (isLinkBlockedItem(item)) return false;
  return Boolean(item.marketHashName?.trim());
}

/**
 * Show a Buff163 link when we have a Buff price and a resolved goods id.
 */
export function canLinkBuffMarket(item: LinkableItem): boolean {
  if (item.buffPrice == null) return false;
  if (item.buffGoodsId == null || item.buffGoodsId <= 0) return false;
  if (isLinkBlockedItem(item)) return false;
  return true;
}
