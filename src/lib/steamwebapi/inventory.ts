/**
 * Steamwebapi inventory — includes float/pattern/certificate when available.
 * Requires STEAMWEBAPI_KEY in .env
 */

import {
  SteamwebapiLimitError,
  isSteamwebapiLimitResponse,
} from "@/lib/steamwebapi/errors";

export type SteamwebapiSticker = {
  slot?: number;
  stickerId?: number;
  name?: string;
  wear?: number;
  image?: string | null;
  market_hash_name?: string;
};

export type SteamwebapiInventoryItem = {
  assetId: string;
  marketHashName: string;
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  inspectLink: string | null;
  stickers: SteamwebapiSticker[];
};

function getKey(): string | null {
  const key = process.env.STEAMWEBAPI_KEY?.trim();
  return key || null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseStickers(raw: unknown): SteamwebapiSticker[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s, idx) => {
    const row = (s ?? {}) as Record<string, unknown>;
    const nameRaw =
      (typeof row.name === "string" && row.name) ||
      (typeof row.market_hash_name === "string" && row.market_hash_name) ||
      undefined;
    return {
      slot: asNumber(row.slot) ?? idx,
      stickerId:
        asNumber(row.stickerId) ??
        asNumber(row.stickerid) ??
        asNumber(row.sticker_id) ??
        0,
      name: nameRaw,
      wear: asNumber(row.wear) ?? undefined,
      image:
        (typeof row.image === "string" && row.image) ||
        (typeof row.icon === "string" && row.icon) ||
        (typeof row.icon_url === "string" && row.icon_url) ||
        null,
      market_hash_name:
        typeof row.market_hash_name === "string"
          ? row.market_hash_name
          : undefined,
    };
  });
}

export async function fetchSteamwebapiInventory(
  steamId: string,
): Promise<Map<string, SteamwebapiInventoryItem>> {
  const key = getKey();
  const result = new Map<string, SteamwebapiInventoryItem>();
  if (!key) return result;

  const params = new URLSearchParams({
    key,
    steam_id: steamId,
    game: "cs2",
  });

  const res = await fetch(
    `https://www.steamwebapi.com/steam/api/inventory?${params}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "InventoryTracker/1.0",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(45_000),
    },
  );

  const body = await res.text();
  if (!res.ok) {
    if (isSteamwebapiLimitResponse(res.status, body)) {
      throw new SteamwebapiLimitError(res.status, body);
    }
    throw new Error(
      `Steamwebapi inventory failed (HTTP ${res.status}): ${body.slice(0, 180)}`,
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(body) as unknown;
  } catch {
    throw new Error("Steamwebapi inventory returned invalid JSON.");
  }

  // Some plans return 200 with an error payload when credits are gone.
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    ("error" in data || "message" in data)
  ) {
    const msg = String(
      (data as { error?: unknown; message?: unknown }).error ??
        (data as { message?: unknown }).message ??
        "",
    );
    if (isSteamwebapiLimitResponse(200, msg)) {
      throw new SteamwebapiLimitError(200, msg);
    }
  }

  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] }).items)
      ? (data as { items: unknown[] }).items
      : [];

  for (const raw of rows) {
    const row = raw as Record<string, unknown>;
    const assetId = String(row.assetid ?? row.assetId ?? row.id ?? "");
    if (!assetId) continue;

    const floatBlock =
      row.float && typeof row.float === "object"
        ? (row.float as Record<string, unknown>)
        : null;

    const marketHashName = String(
      row.markethashname ??
        row.market_hash_name ??
        row.marketname ??
        row.name ??
        "",
    );

    const floatValue =
      asNumber(floatBlock?.floatvalue) ??
      asNumber(floatBlock?.float) ??
      asNumber(row.floatvalue) ??
      asNumber(row.float);

    const paintSeed =
      asNumber(floatBlock?.paintseed) ??
      asNumber(floatBlock?.paintSeed) ??
      asNumber(row.paintseed);

    const paintIndex =
      asNumber(floatBlock?.paintindex) ??
      asNumber(floatBlock?.paintIndex) ??
      asNumber(row.paintindex);

    const inspectLink =
      (typeof row.inspect === "string" && row.inspect) ||
      (typeof row.inspectlink === "string" && row.inspectlink) ||
      (typeof row.inspect_link === "string" && row.inspect_link) ||
      (typeof floatBlock?.certificate === "string"
        ? `steam://run/730//+csgo_econ_action_preview%20${floatBlock.certificate}`
        : null);

    const stickers = parseStickers(floatBlock?.stickers ?? row.stickers);

    result.set(assetId, {
      assetId,
      marketHashName,
      floatValue,
      paintSeed,
      paintIndex,
      inspectLink,
      stickers,
    });
  }

  return result;
}
