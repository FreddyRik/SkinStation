import { stripStickerPrefix } from "@/lib/stickers/normalize";

export type SteamDescription = {
  classid: string;
  instanceid: string;
  market_hash_name?: string;
  name?: string;
  market_name?: string;
  icon_url?: string;
  icon_url_large?: string;
  tradable?: number;
  type?: string;
  marketable?: number;
  descriptions?: Array<{ type?: string; value?: string; color?: string }>;
  tags?: Array<{
    category?: string;
    internal_name?: string;
    localized_category_name?: string;
    localized_tag_name?: string;
  }>;
  actions?: Array<{ link?: string; name?: string }>;
  market_actions?: Array<{ link?: string; name?: string }>;
};

export type SteamAsset = {
  appid: number | string;
  contextid: string;
  assetid: string;
  classid: string;
  instanceid: string;
  amount?: string;
};

export type SteamInventoryResponse = {
  success?: number | boolean;
  assets?: SteamAsset[];
  descriptions?: SteamDescription[];
  total_inventory_count?: number;
  more_items?: number;
  last_assetid?: string;
  rwgrsn?: number;
};

export type ParsedSticker = {
  slot: number;
  stickerId: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
};

export type ParsedInventoryItem = {
  assetId: string;
  classId: string;
  instanceId: string;
  marketHashName: string;
  name: string;
  iconUrl: string | null;
  exterior: string | null;
  inspectLink: string | null;
  stickersFromDescription: ParsedSticker[];
  tradable: boolean;
  rarity: string | null;
  type: string | null;
};

const APP_ID = 730;
const CONTEXT_ID = 2;
const PAGE_SIZE = 2000;
const INVENTORY_CACHE_TTL_MS = 15 * 60 * 1000;

type InventoryCacheEntry = {
  fetchedAt: number;
  items: ParsedInventoryItem[];
};

const inventoryCache = new Map<string, InventoryCacheEntry>();
const inventoryInflight = new Map<string, Promise<ParsedInventoryItem[]>>();

export function getInventoryCacheTtlMs(): number {
  return INVENTORY_CACHE_TTL_MS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function descriptionKey(classId: string, instanceId: string) {
  return `${classId}_${instanceId}`;
}

function buildIconUrl(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://community.cloudflare.steamstatic.com/economy/image/${path}`;
}

function extractExterior(desc: SteamDescription): string | null {
  const tag = desc.tags?.find((t) => t.category === "Exterior");
  if (tag?.localized_tag_name) return tag.localized_tag_name;

  const fromName = (desc.market_hash_name ?? desc.name ?? "").match(
    /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/,
  );
  return fromName?.[1] ?? null;
}

function extractRarity(desc: SteamDescription): string | null {
  return (
    desc.tags?.find((t) => t.category === "Rarity")?.localized_tag_name ?? null
  );
}

function extractType(desc: SteamDescription): string | null {
  return (
    desc.tags?.find((t) => t.category === "Type")?.localized_tag_name ??
    desc.type ??
    null
  );
}

function extractInspectLink(
  desc: SteamDescription,
  assetId: string,
  steamId: string,
): string | null {
  const action =
    desc.actions?.find((a) => a.link?.includes("csgo_econ_action_preview")) ??
    desc.market_actions?.find((a) =>
      a.link?.includes("csgo_econ_action_preview"),
    );

  if (!action?.link) return null;

  const link = action.link
    .replace("%owner_steamid%", steamId)
    .replace("%assetid%", assetId);

  // Steam often returns unresolved placeholders for public inventories — unusable for float decode
  if (/%propid:\d+%/i.test(link)) {
    return null;
  }

  return link;
}

function extractStickersFromDescriptions(
  desc: SteamDescription,
): ParsedSticker[] {
  const found: ParsedSticker[] = [];
  const seen = new Set<string>();

  for (const block of desc.descriptions ?? []) {
    const value = block.value ?? "";
    if (!value) continue;

    // Prefer paired <img src="..." title="Sticker: Name">
    const imgRe =
      /<img[^>]*?\bsrc=["']([^"']+)["'][^>]*?\btitle=["']Sticker:\s*([^"']+)["'][^>]*>|<img[^>]*?\btitle=["']Sticker:\s*([^"']+)["'][^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(value)) !== null) {
      const iconUrl = (m[1] || m[4] || "").trim() || null;
      const name = stripStickerPrefix(m[2] || m[3] || "");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      found.push({ slot: found.length, stickerId: 0, name, iconUrl });
    }

    // Fallback: title-only
    const titleRe = /title\s*=\s*["']Sticker:\s*([^"']+)["']/gi;
    while ((m = titleRe.exec(value)) !== null) {
      const name = stripStickerPrefix(m[1]);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      found.push({ slot: found.length, stickerId: 0, name, iconUrl: null });
    }

    // Plain text list (no icons)
    const plain = value.match(/Sticker:\s*([^<]+)/i);
    if (plain?.[1] && !/title\s*=/i.test(value) && !/<img/i.test(value)) {
      for (const part of plain[1].split(/,\s*/)) {
        const name = stripStickerPrefix(part);
        if (!name || seen.has(name)) continue;
        seen.add(name);
        found.push({
          slot: found.length,
          stickerId: 0,
          name,
          iconUrl: null,
        });
      }
    }
  }

  return found;
}

function parsePage(
  data: SteamInventoryResponse,
  steamId: string,
): ParsedInventoryItem[] {
  const descriptions = new Map<string, SteamDescription>();
  for (const d of data.descriptions ?? []) {
    descriptions.set(descriptionKey(d.classid, d.instanceid), d);
  }

  const items: ParsedInventoryItem[] = [];
  for (const asset of data.assets ?? []) {
    const desc =
      descriptions.get(descriptionKey(asset.classid, asset.instanceid)) ??
      descriptions.get(descriptionKey(asset.classid, "0"));

    if (!desc) continue;

    const marketHashName =
      desc.market_hash_name ?? desc.market_name ?? desc.name;
    if (!marketHashName) continue;

    items.push({
      assetId: asset.assetid,
      classId: asset.classid,
      instanceId: asset.instanceid,
      marketHashName,
      name: desc.name ?? marketHashName,
      iconUrl: buildIconUrl(desc.icon_url_large ?? desc.icon_url),
      exterior: extractExterior(desc),
      inspectLink: extractInspectLink(desc, asset.assetid, steamId),
      stickersFromDescription: extractStickersFromDescriptions(desc),
      tradable: desc.tradable === 1,
      rarity: extractRarity(desc),
      type: extractType(desc),
    });
  }

  return items;
}

export async function fetchSteamInventory(
  steamId: string,
  options?: { force?: boolean },
): Promise<ParsedInventoryItem[]> {
  const force = Boolean(options?.force);

  if (!force) {
    const cached = inventoryCache.get(steamId);
    if (cached && Date.now() - cached.fetchedAt < INVENTORY_CACHE_TTL_MS) {
      return cached.items;
    }

    const pending = inventoryInflight.get(steamId);
    if (pending) {
      return pending;
    }
  }

  const promise = fetchSteamInventoryFromSteam(steamId)
    .then((items) => {
      inventoryCache.set(steamId, { fetchedAt: Date.now(), items });
      return items;
    })
    .finally(() => {
      if (inventoryInflight.get(steamId) === promise) {
        inventoryInflight.delete(steamId);
      }
    });

  inventoryInflight.set(steamId, promise);
  return promise;
}

async function fetchSteamInventoryFromSteam(
  steamId: string,
): Promise<ParsedInventoryItem[]> {
  const all: ParsedInventoryItem[] = [];
  let startAssetId: string | undefined;

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      l: "english",
      count: String(PAGE_SIZE),
    });
    if (startAssetId) {
      params.set("start_assetid", startAssetId);
    }

    const url = `https://steamcommunity.com/inventory/${steamId}/${APP_ID}/${CONTEXT_ID}?${params}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*;q=0.01",
        Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
      },
      next: { revalidate: 0 },
    });

    if (res.status === 403) {
      throw new Error(
        "Inventory is private or hidden. Set CS2 inventory to Public on Steam.",
      );
    }
    if (res.status === 429) {
      throw new Error(
        "Steam rate-limited this IP. Wait a few minutes and try again.",
      );
    }
    if (!res.ok) {
      throw new Error(`Steam inventory request failed (HTTP ${res.status}).`);
    }

    const text = await res.text();
    if (!text || text === "null") {
      throw new Error(
        "Steam returned an empty inventory response. Profile may be private or rate-limited.",
      );
    }

    let data: SteamInventoryResponse;
    try {
      data = JSON.parse(text) as SteamInventoryResponse;
    } catch {
      throw new Error("Steam returned invalid JSON for inventory.");
    }

    if (data.success === false || data.success === 0) {
      throw new Error(
        "Could not load inventory. Ensure the profile and CS2 inventory are public.",
      );
    }

    all.push(...parsePage(data, steamId));

    if (!data.more_items || !data.last_assetid) {
      break;
    }

    startAssetId = data.last_assetid;
    await sleep(1500);
  }

  return all;
}
