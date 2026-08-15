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
import {
  jsonObject,
  jsonObjectField,
  jsonRowsFromUnknown,
  parseJsonUnknownSafe,
  type JsonObject,
} from "@/types/json";

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
    const row = jsonObject(s) ?? {};
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

function pickFloatBlock(row: JsonObject): JsonObject | null {
  return jsonObjectField(row, "float") ?? jsonObjectField(row, "iteminfo");
}

function certificateToInspectLink(certificate: string): string {
  const cleaned = certificate.trim().replace(/^%20/, "");
  if (cleaned.startsWith("steam://")) return cleaned;
  return `steam://run/730//+csgo_econ_action_preview%20${cleaned}`;
}

function pickInspectLink(
  row: JsonObject,
  floatBlock: JsonObject | null,
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

  const data = parseJsonUnknownSafe(body);
  if (data == null) {
    throw new Error("Steamwebapi inventory returned invalid JSON.");
  }

  // Some plans return 200 with an error payload when credits are gone.
  const payload = jsonObject(data);
  if (payload && ("error" in payload || "message" in payload)) {
    const msg = String(payload.error ?? payload.message ?? "");
    if (isSteamwebapiLimitResponse(200, msg)) {
      throw new SteamwebapiLimitError(200, msg);
    }
  }

  const rows = jsonRowsFromUnknown(data, ["items", "data"]);

  for (const raw of rows) {
    const row = jsonObject(raw);
    if (!row) continue;
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
