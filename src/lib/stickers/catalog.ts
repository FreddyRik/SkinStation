import { stickerMarketHashName } from "@/lib/steam-market/csgotrader";
import {
  stripStickerPrefix,
  toStickerMarketHashName,
} from "@/lib/stickers/normalize";

// Re-export for callers that historically imported sticker eligibility from here.
export { itemSupportsStickers } from "@/lib/item-flags";

type ByMykelSticker = {
  name?: string;
  market_hash_name?: string;
  image?: string;
};

const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const STICKERS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json";

let memoryCatalog: { fetchedAt: number; byHash: Map<string, string> } | null =
  null;
let inflight: Promise<Map<string, string>> | null = null;

function indexStickers(list: ByMykelSticker[]): Map<string, string> {
  const byHash = new Map<string, string>();
  for (const row of list) {
    const image = row.image?.trim();
    if (!image) continue;
    const keys = [row.market_hash_name, row.name].filter(
      (v): v is string => Boolean(v?.trim()),
    );
    for (const key of keys) {
      const cleaned = stripStickerPrefix(key);
      byHash.set(key.toLowerCase(), image);
      byHash.set(cleaned.toLowerCase(), image);
      byHash.set(stickerMarketHashName(cleaned).toLowerCase(), image);
      byHash.set(`sticker: ${cleaned}`.toLowerCase(), image);
    }
  }
  return byHash;
}

/** Cached map of sticker market-hash-name → Steam CDN image URL. */
export async function getStickerIconCatalog(
  force = false,
): Promise<Map<string, string>> {
  if (
    !force &&
    memoryCatalog &&
    Date.now() - memoryCatalog.fetchedAt < CATALOG_TTL_MS
  ) {
    return memoryCatalog.byHash;
  }

  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(STICKERS_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "InventoryTracker/1.0",
        },
        next: { revalidate: 86400 },
      });
      if (!res.ok) {
        console.warn(`Sticker icon catalog failed (HTTP ${res.status}).`);
        return memoryCatalog?.byHash ?? new Map();
      }
      const data = (await res.json()) as ByMykelSticker[];
      if (!Array.isArray(data)) {
        return memoryCatalog?.byHash ?? new Map();
      }
      const byHash = indexStickers(data);
      memoryCatalog = { fetchedAt: Date.now(), byHash };
      return byHash;
    } catch (err) {
      console.warn("Sticker icon catalog failed:", err);
      return memoryCatalog?.byHash ?? new Map();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function resolveStickerIconUrl(
  catalog: Map<string, string>,
  stickerName: string | null | undefined,
  existingIcon?: string | null,
): string | null {
  if (existingIcon) return existingIcon;
  if (!stickerName?.trim()) return null;
  const cleaned = stripStickerPrefix(stickerName);
  const hash = toStickerMarketHashName(stickerName);
  return (
    catalog.get(stickerName.trim().toLowerCase()) ??
    catalog.get(cleaned.toLowerCase()) ??
    (hash ? catalog.get(hash.toLowerCase()) : null) ??
    catalog.get(`sticker: ${cleaned}`.toLowerCase()) ??
    null
  );
}
