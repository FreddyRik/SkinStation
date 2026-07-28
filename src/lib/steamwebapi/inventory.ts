/**
 * Steamwebapi inventory — includes float/pattern/certificate when available.
 * Requires STEAMWEBAPI_KEY in .env
 *
 * Optional last-resort float enricher after local masked decode and
 * INSPECT_API_URL. Public Steam inventory often lacks locally-decodable
 * certificate links; legacy S/A/D GC inspects return HTTP 406.
 */

import {
  SteamwebapiLimitError,
  isSteamwebapiLimitResponse,
} from "@/lib/steamwebapi/errors";
import { isLocallyDecodableInspectLink } from "@/lib/inspect/links";
import { SITE_USER_AGENT } from "@/lib/site";

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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asInt(value: unknown): number | null {
  const n = asNumber(value);
  return n == null ? null : Math.trunc(n);
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
        asInt(row.stickerId) ??
        asInt(row.stickerid) ??
        asInt(row.sticker_id) ??
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

function pickFloatBlock(
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  if (row.float && typeof row.float === "object" && !Array.isArray(row.float)) {
    return row.float as Record<string, unknown>;
  }
  if (
    row.iteminfo &&
    typeof row.iteminfo === "object" &&
    !Array.isArray(row.iteminfo)
  ) {
    return row.iteminfo as Record<string, unknown>;
  }
  return null;
}

function certificateToInspectLink(certificate: string): string {
  const cleaned = certificate.trim().replace(/^%20/, "");
  if (cleaned.startsWith("steam://")) return cleaned;
  return `steam://run/730//+csgo_econ_action_preview%20${cleaned}`;
}

function pickInspectLink(
  row: Record<string, unknown>,
  floatBlock: Record<string, unknown> | null,
): string | null {
  const candidates = [
    row.inspect,
    row.inspectlink,
    row.inspect_link,
    row.inspectLink,
    floatBlock?.inspectlink,
    floatBlock?.inspect_link,
    floatBlock?.inspect,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const link = c.trim();
      // Prefer certificate links; classic S/A/D is useless for float decode.
      if (isLocallyDecodableInspectLink(link) || link.includes("csgo_econ")) {
        return link;
      }
    }
  }
  const cert =
    (typeof floatBlock?.certificate === "string" && floatBlock.certificate) ||
    (typeof row.certificate === "string" && row.certificate) ||
    null;
  if (cert) return certificateToInspectLink(cert);
  return null;
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
    parse: "1",
    production: "1",
    // Match Steam public inventory: include trade-locked / untradable skins.
    with_no_tradable: "1",
    // Large inventories; Steamwebapi paginates via start_assetid when needed.
    limit: "10000",
  });

  const res = await fetch(
    `https://www.steamwebapi.com/steam/api/inventory?${params}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": SITE_USER_AGENT,
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(60_000),
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
      : Array.isArray((data as { data?: unknown[] }).data)
        ? (data as { data: unknown[] }).data
        : [];

  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const assetId = String(row.assetid ?? row.assetId ?? row.id ?? "");
    if (!assetId) continue;

    const floatBlock = pickFloatBlock(row);

    const marketHashName = String(
      row.markethashname ??
        row.market_hash_name ??
        row.marketname ??
        row.name ??
        "",
    );

    const floatValue =
      asNumber(floatBlock?.floatvalue) ??
      asNumber(floatBlock?.floatValue) ??
      asNumber(floatBlock?.float) ??
      asNumber(floatBlock?.paintwear) ??
      asNumber(floatBlock?.paintWear) ??
      asNumber(row.floatvalue) ??
      asNumber(row.floatValue) ??
      // Only treat top-level `float` as the wear when it is a scalar.
      (typeof row.float === "number" || typeof row.float === "string"
        ? asNumber(row.float)
        : null);

    const paintSeed =
      asInt(floatBlock?.paintseed) ??
      asInt(floatBlock?.paintSeed) ??
      asInt(row.paintseed) ??
      asInt(row.paintSeed);

    const paintIndex =
      asInt(floatBlock?.paintindex) ??
      asInt(floatBlock?.paintIndex) ??
      asInt(row.paintindex) ??
      asInt(row.paintIndex);

    const inspectLink = pickInspectLink(row, floatBlock);
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
