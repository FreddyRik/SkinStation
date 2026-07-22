import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@/lib/currency";

type TraderSteamEntry = {
  last_24h?: number | null;
  last_7d?: number | null;
  last_30d?: number | null;
  last_90d?: number | null;
};

type CatalogCache = {
  fetchedAt: number;
  byName: Map<string, number>;
};

const CATALOG_TTL_MS = 6 * 60 * 60 * 1000; // 6h — upstream updates ~8h
let memoryCatalog: CatalogCache | null = null;
let fxRateCache: { rate: number; fetchedAt: number } | null = null;

function pickTraderPrice(entry: TraderSteamEntry): number | null {
  const value =
    entry.last_24h ?? entry.last_7d ?? entry.last_30d ?? entry.last_90d ?? null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function getUsdToEurRate(): Promise<number> {
  if (fxRateCache && Date.now() - fxRateCache.fetchedAt < 12 * 60 * 60 * 1000) {
    return fxRateCache.rate;
  }
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR",
      { next: { revalidate: 0 } },
    );
    if (res.ok) {
      const data = (await res.json()) as { rates?: { EUR?: number } };
      const rate = data.rates?.EUR;
      if (typeof rate === "number" && rate > 0) {
        fxRateCache = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch {
    // fall through
  }
  return fxRateCache?.rate ?? 0.92;
}

/** Bulk Steam Market prices from CSGOTrader (avoids Steam rate limits). Values in requested currency. */
export async function getCsgoTraderSteamCatalog(
  currency: Currency = DEFAULT_CURRENCY,
  force = false,
): Promise<Map<string, number>> {
  if (
    !force &&
    memoryCatalog &&
    Date.now() - memoryCatalog.fetchedAt < CATALOG_TTL_MS
  ) {
    return convertCatalog(memoryCatalog.byName, currency);
  }

  const meta = await prisma.catalogMeta.findUnique({
    where: { id: "csgotrader-steam" },
  });
  if (
    !force &&
    meta &&
    Date.now() - meta.fetchedAt.getTime() < CATALOG_TTL_MS &&
    memoryCatalog
  ) {
    return convertCatalog(memoryCatalog.byName, currency);
  }

  const res = await fetch("https://prices.csgotrader.app/latest/steam.json", {
    headers: {
      Accept: "application/json",
      "User-Agent": "InventoryTracker/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (memoryCatalog) return convertCatalog(memoryCatalog.byName, currency);
    throw new Error(`CSGOTrader Steam prices failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as Record<string, TraderSteamEntry>;
  const byName = new Map<string, number>();
  for (const [name, entry] of Object.entries(data)) {
    const price = pickTraderPrice(entry);
    if (price != null) byName.set(name, price);
  }

  memoryCatalog = { fetchedAt: Date.now(), byName };

  await prisma.catalogMeta.upsert({
    where: { id: "csgotrader-steam" },
    create: {
      id: "csgotrader-steam",
      fetchedAt: new Date(),
      itemCount: byName.size,
    },
    update: {
      fetchedAt: new Date(),
      itemCount: byName.size,
    },
  });

  return convertCatalog(byName, currency);
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

export function traderSteamPriceFor(
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

/** Persist Steam prices for inventory (+ sticker) names from the CSGOTrader catalog. */
export async function cacheTraderSteamPricesForNames(
  catalog: Map<string, number>,
  marketHashNames: string[],
  currency: Currency = DEFAULT_CURRENCY,
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
            steamPrice: price,
            steamFetchedAt: now,
          },
          update: {
            steamPrice: price,
            steamFetchedAt: now,
          },
        });
      }),
    );
  }
}
