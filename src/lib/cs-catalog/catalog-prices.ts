import type {
  CatalogContainsItem,
  CatalogItemDetail,
  CatalogKind,
  SlimCatalogItem,
} from "@/lib/cs-catalog/types";
import { buffGoodsIdFor } from "@/lib/buff/goods-ids";
import { canLinkBuffMarket, canLinkSteamMarket } from "@/lib/steam-market/listing";
import { stickerMarketHashName } from "@/lib/steam-market/csgotrader";
import {
  skinVariantPriceRange,
  type SkinPriceRange,
} from "@/lib/cs-catalog/skin-prices";

/** Kinds that use a single market-hash lookup (not wear-split skins). */
const SINGLE_HASH_KINDS = new Set<CatalogKind>([
  "crate",
  "key",
  "keychain",
  "sticker",
  "agent",
  "patch",
  "graffiti",
  "music_kit",
  "collectible",
  "highlight",
]);

export type CatalogBuyOffers = {
  steam: { priceUsd: number; marketHashName: string } | null;
  buff: { priceUsd: number; goodsId: number } | null;
};

export type PricedContainsItem = CatalogContainsItem & {
  priceMinUsd: number | null;
  priceMaxUsd: number | null;
};

/** Resolve the Steam/Buff market hash for a catalog item. */
export function catalogItemMarketHash(item: {
  kind: CatalogKind;
  name: string;
  marketHashName?: string | null;
}): string | null {
  const hash = item.marketHashName?.trim();
  if (hash) return hash;

  if (item.kind === "sticker") {
    return stickerMarketHashName(item.name);
  }

  const name = item.name.trim();
  if (!name) return null;

  // Agents, charms, sealed graffiti, crates, etc. often use `name` as the hash.
  if (
    name.includes("|") ||
    item.kind === "crate" ||
    item.kind === "key" ||
    item.kind === "agent" ||
    item.kind === "keychain" ||
    item.kind === "graffiti" ||
    item.kind === "music_kit" ||
    item.kind === "patch"
  ) {
    return name;
  }

  return null;
}

export function isSingleHashPricedKind(kind: CatalogKind): boolean {
  return SINGLE_HASH_KINDS.has(kind);
}

/** Steam USD min/max for a non-skin catalog item (single listing). */
export function singleHashPriceRange(
  hash: string | null,
  steamUsd: Map<string, number>,
): SkinPriceRange | null {
  if (!hash) return null;
  const p = steamUsd.get(hash);
  if (typeof p !== "number" || !Number.isFinite(p)) return null;
  return { min: p, max: p };
}

/** Attach Steam USD prices onto slim catalog rows (skins + other marketable kinds). */
export function enrichSlimItemsWithPrices(
  items: SlimCatalogItem[],
  steamUsd: Map<string, number>,
): SlimCatalogItem[] {
  return items.map((item) => {
    if (item.kind === "skin" && item.wearNames.length > 0) {
      const normal = skinVariantPriceRange(
        item.name,
        item.wearNames,
        item.minFloat,
        item.maxFloat,
        "normal",
        steamUsd,
      );
      const st = item.stattrak
        ? skinVariantPriceRange(
            item.name,
            item.wearNames,
            item.minFloat,
            item.maxFloat,
            "stattrak",
            steamUsd,
          )
        : null;
      return {
        ...item,
        priceMinUsd: normal?.min ?? null,
        priceMaxUsd: normal?.max ?? null,
        stattrakPriceMinUsd: st?.min ?? null,
        stattrakPriceMaxUsd: st?.max ?? null,
      };
    }

    if (!isSingleHashPricedKind(item.kind)) return item;
    const range = singleHashPriceRange(
      catalogItemMarketHash(item),
      steamUsd,
    );
    if (!range) return item;
    return {
      ...item,
      priceMinUsd: range.min,
      priceMaxUsd: range.max,
    };
  });
}

/** Build Buff + Steam “Buy from” offers for a non-skin (or any single-hash) item. */
export function buildCatalogBuyOffers(
  item: Pick<CatalogItemDetail, "kind" | "name" | "marketHashName">,
  steamUsd: Map<string, number>,
  buffUsd: Map<string, number>,
  goodsMap: Map<string, number>,
): CatalogBuyOffers {
  const marketHashName = catalogItemMarketHash(item);
  if (!marketHashName) {
    return { steam: null, buff: null };
  }

  const steamPrice = steamUsd.get(marketHashName) ?? null;
  const buffPrice = buffUsd.get(marketHashName) ?? null;
  const goodsId = buffGoodsIdFor(goodsMap, marketHashName);

  const steam =
    steamPrice != null &&
    canLinkSteamMarket({
      steamPrice,
      marketHashName,
      name: item.name,
      type: item.kind,
    })
      ? { priceUsd: steamPrice, marketHashName }
      : null;

  const buff =
    buffPrice != null &&
    goodsId != null &&
    canLinkBuffMarket({
      buffPrice,
      buffGoodsId: goodsId,
      marketHashName,
      name: item.name,
      type: item.kind,
    })
      ? { priceUsd: buffPrice, goodsId }
      : null;

  // Still surface Steam price when CSGOTrader has it but link heuristics block
  // (rare); View offer stays available via market hash.
  return {
    steam:
      steam ??
      (steamPrice != null ? { priceUsd: steamPrice, marketHashName } : null),
    buff,
  };
}

/** Attach browse prices onto case/collection contains rows via slim catalog map. */
export function enrichContainsWithPrices(
  contains: CatalogContainsItem[],
  pricedById: Map<string, SlimCatalogItem>,
): PricedContainsItem[] {
  return contains.map((row) => {
    const slim = pricedById.get(row.id);
    return {
      ...row,
      priceMinUsd: slim?.priceMinUsd ?? null,
      priceMaxUsd: slim?.priceMaxUsd ?? null,
    };
  });
}
