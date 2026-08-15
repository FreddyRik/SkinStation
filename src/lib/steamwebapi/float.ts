/**
 * Optional Steamwebapi float enrichment (gap-fill after inventory).
 *
 * Free API key from https://www.steamwebapi.com — set STEAMWEBAPI_KEY in .env
 *
 * 2026 reality: Valve discontinued legacy S/A/D and M/A/D inspect links
 * (Steamwebapi returns HTTP 406). Floats come from:
 *   1) /steam/api/inventory certificate + float fields (primary)
 *   2) /steam/api/float/assets?steam_id=&asset_id= (cached asset DB gap-fill)
 *   3) /steam/api/float?url=<certificate> (decode only — never S/A/D0)
 *   4) Local masked decode when a certificate inspect link is already known
 */

import { decodeInspectLocally } from "@/lib/csfloat/inspect";
import {
  isLocallyDecodableInspectLink,
  extractInspectPayload,
  isMaskedInspectPayload,
} from "@/lib/inspect/links";
import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "@/lib/net/circuit-breaker";
import { fetchWithTimeout, sleep, UPSTREAM_STEP_TIMEOUT_MS } from "@/lib/net/resilient-fetch";
import { isSteamwebapiLimitResponse } from "@/lib/steamwebapi/errors";
import { SITE_USER_AGENT } from "@/lib/site";
import {
  jsonObject,
  jsonObjectField,
  jsonRowsFromUnknown,
  parseJsonObject,
  parseJsonUnknownSafe,
  type JsonObject,
} from "@/types/json";

export type SteamwebapiFloat = {
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  inspectLink?: string | null;
};

export type SteamwebapiFloatEnrichResult = {
  floats: Map<string, SteamwebapiFloat>;
  /** True when the API rejected further requests due to plan/rate limits. */
  limitHit: boolean;
  /** How many assets we successfully resolved. */
  resolved: number;
  /** How many gap-fill attempts returned nothing usable. */
  missed: number;
};

const STEAMWEBAPI_CIRCUIT = "steamwebapi";

export function getSteamwebapiKey(): string | null {
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

function pickItemBlock(data: JsonObject): JsonObject {
  return (
    jsonObjectField(data, "iteminfo") ??
    jsonObjectField(data, "item") ??
    jsonObjectField(data, "float") ??
    data
  );
}

function parseFloatPayload(data: JsonObject): SteamwebapiFloat | null {
  const block = pickItemBlock(data);
  const floatValue =
    asNumber(block.floatvalue) ??
    asNumber(block.floatValue) ??
    asNumber(block.float) ??
    asNumber(block.paintwear) ??
    asNumber(block.paintWear) ??
    asNumber(data.floatvalue) ??
    asNumber(data.floatValue);
  const paintSeed =
    asInt(block.paintseed) ??
    asInt(block.paintSeed) ??
    asInt(data.paintseed) ??
    asInt(data.paintSeed);
  const paintIndex =
    asInt(block.paintindex) ??
    asInt(block.paintIndex) ??
    asInt(data.paintindex) ??
    asInt(data.paintIndex);

  const inspectLink =
    (typeof block.inspectlink === "string" && block.inspectlink) ||
    (typeof block.inspect_link === "string" && block.inspect_link) ||
    (typeof data.inspectlink === "string" && data.inspectlink) ||
    (typeof block.certificate === "string"
      ? `steam://run/730//+csgo_econ_action_preview%20${block.certificate}`
      : null) ||
    null;

  if (floatValue == null && paintSeed == null && paintIndex == null) {
    return null;
  }
  return { floatValue, paintSeed, paintIndex, inspectLink };
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || /aborted|timeout/i.test(err.message));
}

type FloatFetchOutcome =
  | { ok: true; value: SteamwebapiFloat | null }
  | { ok: false; limitHit: true };

/** Look up a known asset in Steamwebapi's float asset database. */
async function fetchFloatFromAssetDb(
  key: string,
  steamId: string,
  assetId: string,
): Promise<FloatFetchOutcome> {
  const params = new URLSearchParams({
    key,
    steam_id: steamId,
    asset_id: assetId,
    limit: "5",
    production: "1",
  });

  try {
    const res = await fetchWithTimeout(
      `https://www.steamwebapi.com/steam/api/float/assets?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": SITE_USER_AGENT,
        },
        cache: "no-store",
      },
      UPSTREAM_STEP_TIMEOUT_MS,
    );
    const body = await res.text();
    if (isSteamwebapiLimitResponse(res.status, body)) {
      return { ok: false, limitHit: true };
    }
    if (!res.ok) return { ok: true, value: null };

    const data = parseJsonUnknownSafe(body);
    if (data == null) return { ok: true, value: null };

    const payload = jsonObject(data);
    if (payload && ("error" in payload || "message" in payload)) {
      const msg = String(payload.error ?? payload.message ?? "");
      if (isSteamwebapiLimitResponse(200, msg)) {
        return { ok: false, limitHit: true };
      }
    }

    const rows = jsonRowsFromUnknown(data, ["assets", "data", "items"]);

    for (const raw of rows) {
      const row = jsonObject(raw);
      if (!row) continue;
      const rowAsset = String(row.assetid ?? row.asset_id ?? row.assetId ?? "");
      if (rowAsset && rowAsset !== String(assetId)) continue;
      const parsed = parseFloatPayload(row);
      if (parsed) return { ok: true, value: parsed };
    }
    return { ok: true, value: null };
  } catch (err) {
    if (isTimeoutError(err)) return { ok: false, limitHit: true };
    return { ok: true, value: null };
  }
}

/**
 * Decode a certificate inspect link via Steamwebapi /float.
 * Never call this with legacy S/A/D links — those return HTTP 406.
 */
async function fetchFloatFromCertificate(
  key: string,
  inspectLink: string,
): Promise<FloatFetchOutcome> {
  const payload = extractInspectPayload(inspectLink);
  if (!payload || !isMaskedInspectPayload(payload)) {
    return { ok: true, value: null };
  }

  const params = new URLSearchParams({
    key,
    url: inspectLink,
    production: "1",
  });

  try {
    const res = await fetchWithTimeout(
      `https://www.steamwebapi.com/steam/api/float?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": SITE_USER_AGENT,
        },
        cache: "no-store",
      },
      UPSTREAM_STEP_TIMEOUT_MS,
    );
    const body = await res.text();
    if (isSteamwebapiLimitResponse(res.status, body)) {
      return { ok: false, limitHit: true };
    }
    // 406 = legacy/unsupported link format — treat as miss, not quota.
    if (res.status === 406 || !res.ok) return { ok: true, value: null };

    const data = parseJsonObject(body);
    if (!data) return { ok: true, value: null };

    const errText = String(data.error ?? data.message ?? "");
    if (errText && isSteamwebapiLimitResponse(200, errText)) {
      return { ok: false, limitHit: true };
    }

    return { ok: true, value: parseFloatPayload(data) };
  } catch (err) {
    if (isTimeoutError(err)) return { ok: false, limitHit: true };
    return { ok: true, value: null };
  }
}

export type SteamwebapiFloatTarget = {
  assetId: string;
  marketHashName: string;
  type: string | null;
  /** Certificate inspect link when already known (from inventory). */
  inspectLink?: string | null;
};

/** Enrich weapon assets with float/pattern via Steamwebapi (optional key). */
export async function enrichFloatsViaSteamwebapi(
  steamId: string,
  assets: SteamwebapiFloatTarget[],
  options?: { maxFetches?: number; delayMs?: number },
): Promise<SteamwebapiFloatEnrichResult> {
  const key = getSteamwebapiKey();
  const floats = new Map<string, SteamwebapiFloat>();
  if (!key) {
    return { floats, limitHit: false, resolved: 0, missed: 0 };
  }

  if (await isCircuitOpen(STEAMWEBAPI_CIRCUIT)) {
    return { floats, limitHit: true, resolved: 0, missed: 0 };
  }

  const maxFetches = options?.maxFetches ?? 80;
  const delayMs = options?.delayMs ?? 250;

  const targets = assets.filter((a) => {
    const name = a.marketHashName;
    if (name.startsWith("Sticker |")) return false;
    if (name.startsWith("Patch |")) return false;
    if (name.startsWith("Sealed Graffiti")) return false;
    if (name.startsWith("Charm |")) return false;
    const type = (a.type ?? "").toLowerCase();
    return (
      type.includes("rifle") ||
      type.includes("pistol") ||
      type.includes("smg") ||
      type.includes("shotgun") ||
      type.includes("sniper") ||
      type.includes("machinegun") ||
      type.includes("knife") ||
      type.includes("gloves") ||
      name.includes("|")
    );
  });

  let fetched = 0;
  let limitHit = false;
  let resolved = 0;
  let missed = 0;

  for (const target of targets) {
    if (fetched >= maxFetches) break;

    // Free path: decode certificate locally when we already have one.
    if (
      target.inspectLink &&
      isLocallyDecodableInspectLink(target.inspectLink)
    ) {
      const local = decodeInspectLocally(target.inspectLink);
      if (local && (local.floatValue != null || local.paintSeed != null)) {
        floats.set(target.assetId, {
          floatValue: local.floatValue,
          paintSeed: local.paintSeed,
          paintIndex: local.paintIndex,
          inspectLink: target.inspectLink,
        });
        resolved += 1;
        continue;
      }
    }

    // Preferred remote gap-fill: asset DB lookup by owner + asset id.
    let outcome = await fetchFloatFromAssetDb(key, steamId, target.assetId);
    fetched += 1;
    if (!outcome.ok) {
      limitHit = true;
      await recordCircuitFailure(STEAMWEBAPI_CIRCUIT);
      break;
    }

    // If we have a certificate link but asset DB missed, decode via /float.
    if (
      !outcome.value &&
      target.inspectLink &&
      isLocallyDecodableInspectLink(target.inspectLink) &&
      fetched < maxFetches
    ) {
      outcome = await fetchFloatFromCertificate(key, target.inspectLink);
      fetched += 1;
      if (!outcome.ok) {
        limitHit = true;
        await recordCircuitFailure(STEAMWEBAPI_CIRCUIT);
        break;
      }
    }

    if (outcome.value) {
      floats.set(target.assetId, outcome.value);
      resolved += 1;
      await recordCircuitSuccess(STEAMWEBAPI_CIRCUIT);
    } else {
      missed += 1;
    }
    await sleep(delayMs);
  }

  return { floats, limitHit, resolved, missed };
}
