/**
 * Optional remote inspect / float provider.
 *
 * Point `INSPECT_API_URL` at a CSGOFloat-compatible self-hosted service:
 *   GET {INSPECT_API_URL}?url={inspectLink}
 *
 * Compatible responses (any of):
 *   { iteminfo: { floatvalue, paintseed, paintindex, stickers } }
 *   { floatvalue / float / paintwear, paintseed, paintindex }
 *   { item: { ...same fields } }
 *
 * Public CSGOFloat/CSFloat cloud APIs are currently blocked by Valve rate
 * limits — self-hosting (or another GC bot) is the reliable path. Steamwebapi
 * remains an optional last-resort fallback when STEAMWEBAPI_KEY is set.
 */

import {
  isRemoteInspectableLink,
  isWellFormedInspectLink,
  resolveInspectLinkForEnrichment,
} from "@/lib/inspect/links";
import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "@/lib/net/circuit-breaker";
import { backoffDelayMs, fetchWithBackoff, sleep, UPSTREAM_STEP_TIMEOUT_MS } from "@/lib/net/resilient-fetch";
import {
  assertSafeOutboundUrl,
  inspectApiAllowedHosts,
  UnsafeOutboundUrlError,
} from "@/lib/net/ssrf";
import { SITE_USER_AGENT } from "@/lib/site";
import {
  INSPECT_API_LIMIT_MESSAGE,
  INSPECT_API_MISSING_MESSAGE,
} from "@/lib/inspect/warnings";
import {
  jsonObject,
  jsonObjectField,
  parseJsonObject,
  type JsonObject,
} from "@/types/json";

export { INSPECT_API_LIMIT_MESSAGE, INSPECT_API_MISSING_MESSAGE };

export type RemoteFloat = {
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  stickers?: Array<{
    slot: number;
    stickerId: number;
    name?: string;
    wear?: number;
  }>;
  /** Masked/certificate link when the provider returns one. */
  inspectLink?: string | null;
};

export type RemoteFloatEnrichResult = {
  floats: Map<string, RemoteFloat>;
  /** Soft warning for the UI (rate limit / misconfig / provider error). */
  warning: string | null;
  providerConfigured: boolean;
};

const INSPECT_CIRCUIT = "inspect-api";

export function getInspectApiBaseUrl(): string | null {
  const raw = process.env.INSPECT_API_URL?.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\/+$/, "");
  try {
    const parsed = new URL(cleaned);
    const host = parsed.hostname.toLowerCase();
    const loopback =
      host === "127.0.0.1" || host === "localhost" || host === "[::1]";
    if (parsed.protocol === "https:") {
      return cleaned;
    }
    if (
      parsed.protocol === "http:" &&
      loopback &&
      process.env.NODE_ENV !== "production"
    ) {
      return cleaned;
    }
    console.warn("INSPECT_API_URL must be HTTPS (or http://localhost in development); ignoring.");
    return null;
  } catch {
    console.warn("INSPECT_API_URL is not a valid URL; ignoring.");
    return null;
  }
}

export function getInspectApiKey(): string | null {
  const key = process.env.INSPECT_API_KEY?.trim();
  return key || null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseStickers(
  raw: unknown,
): RemoteFloat["stickers"] {
  if (!Array.isArray(raw)) return undefined;
  const out: NonNullable<RemoteFloat["stickers"]> = [];
  for (let i = 0; i < raw.length; i++) {
    const s = jsonObject(raw[i]);
    if (!s) continue;
    const stickerId =
      parseNumber(s.stickerId ?? s.sticker_id ?? s.stickerid) ?? 0;
    out.push({
      slot: parseNumber(s.slot) ?? i,
      stickerId: Math.trunc(stickerId),
      name: typeof s.name === "string" ? s.name : undefined,
      wear: parseNumber(s.wear) ?? undefined,
    });
  }
  return out.length ? out : undefined;
}

function pickItemBlock(data: JsonObject): JsonObject {
  return (
    jsonObjectField(data, "iteminfo") ??
    jsonObjectField(data, "item") ??
    jsonObjectField(data, "result") ??
    data
  );
}

export function parseRemoteFloatResponse(body: string): RemoteFloat | null {
  const data = parseJsonObject(body);
  if (!data) return null;

  const errText = String(data.error ?? data.message ?? "").toLowerCase();
  if (
    errText.includes("rate") ||
    errText.includes("limit") ||
    errText.includes("bots are temporarily") ||
    errText.includes("quota")
  ) {
    throw new InspectApiLimitError(errText || "rate limited");
  }

  const block = pickItemBlock(data);
  const floatValue =
    parseNumber(block.floatvalue) ??
    parseNumber(block.floatValue) ??
    parseNumber(block.float) ??
    parseNumber(block.paintwear) ??
    parseNumber(block.paintWear);
  const paintSeed =
    parseNumber(block.paintseed) ?? parseNumber(block.paintSeed);
  const paintIndex =
    parseNumber(block.paintindex) ?? parseNumber(block.paintIndex);

  const stickers = parseStickers(block.stickers);

  const inspectLink =
    (typeof block.inspectlink === "string" ? block.inspectlink : null) ??
    (typeof block.inspect_link === "string" ? block.inspect_link : null) ??
    (typeof block.certificate === "string"
      ? `steam://run/730//+csgo_econ_action_preview%20${block.certificate}`
      : null);

  if (floatValue == null && paintSeed == null && paintIndex == null) {
    return null;
  }

  return {
    floatValue,
    paintSeed: paintSeed != null ? Math.trunc(paintSeed) : null,
    paintIndex: paintIndex != null ? Math.trunc(paintIndex) : null,
    stickers,
    inspectLink,
  };
}

export class InspectApiLimitError extends Error {
  constructor(detail?: string) {
    super(
      detail
        ? `${INSPECT_API_LIMIT_MESSAGE} (${detail.slice(0, 120)})`
        : INSPECT_API_LIMIT_MESSAGE,
    );
    this.name = "InspectApiLimitError";
  }
}

async function fetchFloatFromInspectApi(
  baseUrl: string,
  inspectLink: string,
  apiKey: string | null,
): Promise<RemoteFloat | null> {
  if (!isWellFormedInspectLink(inspectLink) && !isRemoteInspectableLink(inspectLink)) {
    return null;
  }

  const allowedHosts = inspectApiAllowedHosts(baseUrl);
  let safeBase: URL;
  try {
    safeBase = await assertSafeOutboundUrl(baseUrl, { allowedHosts });
  } catch (err) {
    if (
      process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/i.test(baseUrl)
    ) {
      safeBase = new URL(baseUrl);
    } else {
      throw err;
    }
  }
  const url = new URL(safeBase.toString());
  url.searchParams.set("url", inspectLink);
  if (apiKey && !url.searchParams.has("key")) {
    url.searchParams.set("key", apiKey);
  }
  if (url.hostname !== safeBase.hostname) {
    throw new UnsafeOutboundUrlError("Inspect API host drifted off the allowlist.");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": SITE_USER_AGENT,
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetchWithBackoff(
    url.toString(),
    {
      headers,
      redirect: "manual",
      cache: "no-store",
    },
    { timeoutMs: UPSTREAM_STEP_TIMEOUT_MS, retries: 1 },
  );

  if (res.status >= 300 && res.status < 400) {
    throw new UnsafeOutboundUrlError("Inspect API redirects are not followed.");
  }

  const body = await res.text();
  if (res.status === 429 || res.status === 402) {
    throw new InspectApiLimitError(body.slice(0, 160));
  }
  if (!res.ok) {
    try {
      parseRemoteFloatResponse(body);
    } catch (err) {
      if (err instanceof InspectApiLimitError) throw err;
    }
    return null;
  }

  return parseRemoteFloatResponse(body);
}

function isWeaponLike(asset: {
  marketHashName: string;
  type: string | null;
}): boolean {
  const name = asset.marketHashName;
  if (name.startsWith("Sticker |")) return false;
  if (name.startsWith("Patch |")) return false;
  if (name.startsWith("Sealed Graffiti")) return false;
  if (name.startsWith("Charm |")) return false;
  const type = (asset.type ?? "").toLowerCase();
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
}

/** Enrich missing floats via optional self-hosted inspect API. */
export async function enrichFloatsViaInspectApi(
  steamId: string,
  assets: Array<{
    assetId: string;
    marketHashName: string;
    type: string | null;
    inspectLink: string | null;
  }>,
  options?: { maxFetches?: number; delayMs?: number },
): Promise<RemoteFloatEnrichResult> {
  const baseUrl = getInspectApiBaseUrl();
  const floats = new Map<string, RemoteFloat>();
  if (!baseUrl) {
    return {
      floats,
      warning: null,
      providerConfigured: false,
    };
  }

  if (await isCircuitOpen(INSPECT_CIRCUIT)) {
    return {
      floats,
      warning: INSPECT_API_LIMIT_MESSAGE,
      providerConfigured: true,
    };
  }

  const apiKey = getInspectApiKey();
  const maxFetchesRaw = Number.parseInt(
    process.env.INSPECT_API_MAX_FETCHES ?? "120",
    10,
  );
  const delayMsRaw = Number.parseInt(
    process.env.INSPECT_API_DELAY_MS ?? "1100",
    10,
  );
  const maxFetches = options?.maxFetches ??
    (Number.isFinite(maxFetchesRaw) && maxFetchesRaw > 0 ? maxFetchesRaw : 120);
  const delayMs = options?.delayMs ??
    (Number.isFinite(delayMsRaw) && delayMsRaw >= 0 ? delayMsRaw : 1100);

  const targets = assets.filter(isWeaponLike);
  let fetched = 0;
  let warning: string | null = null;

  for (const target of targets) {
    if (fetched >= maxFetches) break;

    const link = resolveInspectLinkForEnrichment({
      steamId,
      assetId: target.assetId,
      inspectLink: target.inspectLink,
    });
    if (!link || !isRemoteInspectableLink(link)) continue;

    try {
      const value = await fetchFloatFromInspectApi(baseUrl, link, apiKey);
      fetched += 1;
      await recordCircuitSuccess(INSPECT_CIRCUIT);
      if (value) floats.set(target.assetId, value);
    } catch (err) {
      fetched += 1;
      if (err instanceof InspectApiLimitError) {
        await recordCircuitFailure(INSPECT_CIRCUIT);
        warning = err.message;
        break;
      }
      if (err instanceof UnsafeOutboundUrlError) {
        await recordCircuitFailure(INSPECT_CIRCUIT);
        warning = INSPECT_API_LIMIT_MESSAGE;
        console.warn("Inspect API URL rejected:", err.message);
        break;
      }
      await recordCircuitFailure(INSPECT_CIRCUIT);
      console.warn("Inspect API float failed:", target.assetId, err);
      await sleep(backoffDelayMs(fetched, delayMs, 8_000));
      continue;
    }

    await sleep(delayMs);
  }

  return { floats, warning, providerConfigured: true };
}
