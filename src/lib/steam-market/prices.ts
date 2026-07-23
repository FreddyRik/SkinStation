import { prisma } from "@/lib/db";
import type { Currency } from "@/lib/currency";
import {
  DEFAULT_CURRENCY,
  STEAM_CURRENCY_CODES,
} from "@/lib/currency";

const STEAM_PRICE_TTL_MS = 60 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse Steam price strings for USD ($1.23 / $1,234.56) and EUR (1,23€ / 1.234,56€). */
export function parseSteamPrice(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts[parts.length - 1].length <= 2) {
      normalized = cleaned.replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

type PriceOverviewResponse = {
  success?: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
};

async function fetchSteamPriceOnce(
  marketHashName: string,
  currency: Currency,
  attempt = 0,
): Promise<number | null> {
  const params = new URLSearchParams({
    appid: "730",
    currency: STEAM_CURRENCY_CODES[currency],
    market_hash_name: marketHashName,
  });

  try {
    const res = await fetch(
      `https://steamcommunity.com/market/priceoverview/?${params}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://steamcommunity.com/market/",
        },
        next: { revalidate: 0 },
      },
    );

    if (res.status === 429) {
      if (attempt >= 4) return null;
      await sleep(4000 * (attempt + 1));
      return fetchSteamPriceOnce(marketHashName, currency, attempt + 1);
    }

    if (!res.ok) {
      return null;
    }

    const text = await res.text();
    if (!text || text === "null") return null;

    let data: PriceOverviewResponse;
    try {
      data = JSON.parse(text) as PriceOverviewResponse;
    } catch {
      return null;
    }

    if (!data.success) return null;
    return (
      parseSteamPrice(data.lowest_price) ?? parseSteamPrice(data.median_price)
    );
  } catch (err) {
    console.warn("Steam priceoverview failed:", marketHashName, err);
    return null;
  }
}

/** Fetch Steam market prices for names missing from cache or expired. */
export async function resolveSteamPrices(
  marketHashNames: string[],
  options?: {
    maxFetches?: number;
    delayMs?: number;
    currency?: Currency;
    priorityNames?: string[];
  },
): Promise<Map<string, number | null>> {
  const unique = [...new Set(marketHashNames)];
  const result = new Map<string, number | null>();
  const maxFetches = options?.maxFetches ?? unique.length;
  const delayMs = options?.delayMs ?? 900;
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const now = Date.now();

  const cached = await prisma.priceCache.findMany({
    where: { marketHashName: { in: unique }, currency },
  });
  const cacheMap = new Map(cached.map((c) => [c.marketHashName, c]));

  const needsFetch: string[] = [];

  for (const name of unique) {
    const row = cacheMap.get(name);
    if (
      row?.steamPrice != null &&
      row.steamFetchedAt &&
      now - row.steamFetchedAt.getTime() < STEAM_PRICE_TTL_MS
    ) {
      result.set(name, row.steamPrice);
    } else {
      needsFetch.push(name);
      if (row?.steamPrice != null) {
        result.set(name, row.steamPrice);
      }
    }
  }

  const priority = new Set(options?.priorityNames ?? []);
  needsFetch.sort((a, b) => {
    const ap = priority.has(a) ? 0 : 1;
    const bp = priority.has(b) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.localeCompare(b);
  });

  let fetched = 0;
  let consecutiveFails = 0;

  for (const name of needsFetch) {
    if (fetched >= maxFetches) break;

    const price = await fetchSteamPriceOnce(name, currency);
    fetched += 1;

    if (price != null) {
      result.set(name, price);
      consecutiveFails = 0;
    } else {
      consecutiveFails += 1;
    }

    await prisma.priceCache.upsert({
      where: {
        marketHashName_currency: { marketHashName: name, currency },
      },
      create: {
        marketHashName: name,
        currency,
        steamPrice: price,
        steamFetchedAt: new Date(),
      },
      update: {
        ...(price != null ? { steamPrice: price } : {}),
        steamFetchedAt: new Date(),
      },
    });

    const pause = consecutiveFails >= 3 ? delayMs * 3 : delayMs;
    await sleep(pause);

    if (consecutiveFails >= 8) {
      break;
    }
  }

  return result;
}
