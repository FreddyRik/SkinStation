import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getUsdToEurRate } from "@/lib/fx";
import { SITE_USER_AGENT } from "@/lib/site";
import { isRecord, readNumber } from "@/types/json";

type CatalogCache = {
  fetchedAt: number;
  byName: Map<string, number>;
};

const CATALOG_TTL_MS = 6 * 60 * 60 * 1000; // 6h — upstream updates ~8h
let steamMemoryCatalog: CatalogCache | null = null;
let buffMemoryCatalog: CatalogCache | null = null;

function pickTraderPrice(entry: unknown): number | null {
  if (!isRecord(entry)) return null;
  const value =
    readNumber(entry.last_24h) ??
    readNumber(entry.last_7d) ??
    readNumber(entry.last_30d) ??
    readNumber(entry.last_90d) ??
    null;
  return value;
}

function pickBuffPrice(entry: unknown): number | null {
  if (!isRecord(entry)) return null;
  const starting = isRecord(entry.starting_at) ? entry.starting_at : null;
  const value = starting ? readNumber(starting.price) : null;
  return value != null && value > 0 ? value : null;
}

async function convertCatalog(
  usdByName: Map<string, number>,
  currency: Currency,
): Promise<Map<string, number>> {
  if (currency === "USD") return usdByName;
  const rate = await getUsdToEurRate();
  const converted = new Map<string, number>();
  for (const [name, price] of usdByName) {
    converted.set(name, Number((price * rate).toFixed(2)));
  }
  return converted;
}

async function loadJsonCatalog(
  url: string,
  metaId: string,
  memory: CatalogCache | null,
  setMemory: (cache: CatalogCache) => void,
  pickPrice: (entry: unknown) => number | null,
  force: boolean,
  label: string,
): Promise<Map<string, number>> {
  if (
    !force &&
    memory &&
    Date.now() - memory.fetchedAt < CATALOG_TTL_MS
  ) {
    return memory.byName;
  }

  const meta = await prisma.catalogMeta.findUnique({ where: { id: metaId } });
  if (
    !force &&
    meta &&
    Date.now() - meta.fetchedAt.getTime() < CATALOG_TTL_MS &&
    memory
  ) {
    return memory.byName;
  }

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": SITE_USER_AGENT,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (memory) return memory.byName;
    throw new Error(`${label} failed (HTTP ${res.status}).`);
  }

  const raw: unknown = await res.json();
  const data = isRecord(raw) ? raw : {};
  const byName = new Map<string, number>();
  for (const [name, entry] of Object.entries(data)) {
    const price = pickPrice(entry);
    if (price != null) byName.set(name, price);
  }

  setMemory({ fetchedAt: Date.now(), byName });

  await prisma.catalogMeta.upsert({
    where: { id: metaId },
    create: {
      id: metaId,
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

/** Bulk Steam Market prices from CSGOTrader (avoids Steam rate limits). */
export async function getCsgoTraderSteamCatalog(
  currency: Currency = DEFAULT_CURRENCY,
  force = false,
): Promise<Map<string, number>> {
  const usd = await loadJsonCatalog(
    "https://prices.csgotrader.app/latest/steam.json",
    "csgotrader-steam",
    steamMemoryCatalog,
    (cache) => {
      steamMemoryCatalog = cache;
    },
    (entry) => pickTraderPrice(entry),
    force,
    "CSGOTrader Steam prices",
  );
  return convertCatalog(usd, currency);
}

/** Bulk Buff163 lowest-ask prices from CSGOTrader. Values in requested currency. */
export async function getCsgoTraderBuffCatalog(
  currency: Currency = DEFAULT_CURRENCY,
  force = false,
): Promise<Map<string, number>> {
  const usd = await loadJsonCatalog(
    "https://prices.csgotrader.app/latest/buff163.json",
    "csgotrader-buff163",
    buffMemoryCatalog,
    (cache) => {
      buffMemoryCatalog = cache;
    },
    (entry) => pickBuffPrice(entry),
    force,
    "CSGOTrader Buff163 prices",
  );
  return convertCatalog(usd, currency);
}

export function traderSteamPriceFor(
  catalog: Map<string, number>,
  marketHashName: string,
): number | null {
  return catalog.get(marketHashName) ?? null;
}

export function buffPriceFor(
  catalog: Map<string, number>,
  marketHashName: string,
): number | null {
  return catalog.get(marketHashName) ?? null;
}

export function stickerMarketHashName(stickerName: string): string {
  let trimmed = stickerName.trim();
  // Descriptions often use "Sticker: Name" instead of market "Sticker | Name".
  trimmed = trimmed.replace(/^Sticker:\s*/i, "");
  trimmed = trimmed.replace(/^Sticker\s*\|\s*/i, "");
  return `Sticker | ${trimmed}`;
}

async function cachePricesForNames(
  catalog: Map<string, number>,
  marketHashNames: string[],
  currency: Currency,
  field: "steamPrice" | "buffPrice",
  fetchedAtField: "steamFetchedAt" | "buffFetchedAt",
): Promise<void> {
  const unique = [...new Set(marketHashNames)];
  const now = new Date();

  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    await Promise.all(
      chunk.map(async (name) => {
        const price = catalog.get(name);
        if (price == null) return;
        await prisma.priceCache.upsert({
          where: {
            marketHashName_currency: { marketHashName: name, currency },
          },
          create: {
            marketHashName: name,
            currency,
            [field]: price,
            [fetchedAtField]: now,
          },
          update: {
            [field]: price,
            [fetchedAtField]: now,
          },
        });
      }),
    );
  }
}

/** Persist Steam prices for inventory (+ sticker) names from the CSGOTrader catalog. */
export async function cacheTraderSteamPricesForNames(
  catalog: Map<string, number>,
  marketHashNames: string[],
  currency: Currency = DEFAULT_CURRENCY,
): Promise<void> {
  await cachePricesForNames(
    catalog,
    marketHashNames,
    currency,
    "steamPrice",
    "steamFetchedAt",
  );
}

/** Persist Buff163 prices for inventory (+ sticker) names. */
export async function cacheBuffPricesForNames(
  catalog: Map<string, number>,
  marketHashNames: string[],
  currency: Currency = DEFAULT_CURRENCY,
): Promise<void> {
  await cachePricesForNames(
    catalog,
    marketHashNames,
    currency,
    "buffPrice",
    "buffFetchedAt",
  );
}
