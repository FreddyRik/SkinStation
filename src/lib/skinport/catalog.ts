import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export type SkinportItem = {
  market_hash_name: string;
  currency: string;
  suggested_price: number | null;
  min_price: number | null;
  max_price: number | null;
  mean_price: number | null;
  median_price: number | null;
  quantity: number;
};

const CATALOG_TTL_MS = 5 * 60 * 1000;

type CatalogCache = {
  fetchedAt: number;
  byName: Map<string, SkinportItem>;
};

const memoryCatalogs = new Map<Currency, CatalogCache>();

function catalogMetaId(currency: Currency): string {
  return `skinport-${currency}`;
}

export async function getSkinportCatalog(
  currency: Currency = DEFAULT_CURRENCY,
  force = false,
): Promise<Map<string, SkinportItem>> {
  const memoryCatalog = memoryCatalogs.get(currency);
  if (
    !force &&
    memoryCatalog &&
    Date.now() - memoryCatalog.fetchedAt < CATALOG_TTL_MS
  ) {
    return memoryCatalog.byName;
  }

  const meta = await prisma.catalogMeta.findUnique({
    where: { id: catalogMetaId(currency) },
  });
  if (
    !force &&
    meta &&
    Date.now() - meta.fetchedAt.getTime() < CATALOG_TTL_MS &&
    memoryCatalog
  ) {
    return memoryCatalog.byName;
  }

  const params = new URLSearchParams({
    app_id: "730",
    currency,
    tradable: "0",
  });

  const res = await fetch(`https://api.skinport.com/v1/items?${params}`, {
    method: "GET",
    headers: {
      "Accept-Encoding": "br",
      Accept: "application/json",
      "User-Agent": "InventoryTracker/1.0",
    },
    next: { revalidate: 0 },
  });

  if (res.status === 429) {
    if (memoryCatalog) return memoryCatalog.byName;
    throw new Error("Skinport rate-limited. Try again in a few minutes.");
  }

  if (!res.ok) {
    if (memoryCatalog) return memoryCatalog.byName;
    throw new Error(`Skinport catalog request failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as SkinportItem[];
  const byName = new Map<string, SkinportItem>();
  for (const item of data) {
    byName.set(item.market_hash_name, item);
  }

  memoryCatalogs.set(currency, { fetchedAt: Date.now(), byName });

  await prisma.catalogMeta.upsert({
    where: { id: catalogMetaId(currency) },
    create: {
      id: catalogMetaId(currency),
      fetchedAt: new Date(),
      itemCount: byName.size,
    },
    update: {
      fetchedAt: new Date(),
      itemCount: byName.size,
    },
  });

  return byName;
}

/** Persist Skinport prices for the market hash names present in an inventory. */
export async function cacheSkinportPricesForNames(
  catalog: Map<string, SkinportItem>,
  marketHashNames: string[],
  currency: Currency = DEFAULT_CURRENCY,
): Promise<void> {
  const unique = [...new Set(marketHashNames)];
  const now = new Date();

  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    await Promise.all(
      chunk.map(async (name) => {
        const item = catalog.get(name);
        if (!item) return;
        await prisma.priceCache.upsert({
          where: {
            marketHashName_currency: { marketHashName: name, currency },
          },
          create: {
            marketHashName: name,
            currency,
            skinportMin: item.min_price,
            skinportSuggested: item.suggested_price,
            skinportFetchedAt: now,
          },
          update: {
            skinportMin: item.min_price,
            skinportSuggested: item.suggested_price,
            skinportFetchedAt: now,
          },
        });
      }),
    );
  }
}

export function skinportPriceFor(
  catalog: Map<string, SkinportItem>,
  marketHashName: string,
): number | null {
  const item = catalog.get(marketHashName);
  if (!item) return null;
  return item.min_price ?? item.suggested_price ?? item.median_price ?? null;
}
