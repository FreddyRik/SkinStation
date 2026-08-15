/**
 * Server-side Steam Community fetch via optional Cloudflare Worker proxy.
 * When STEAM_PROXY_URL + STEAM_PROXY_SECRET are set, all Steam Community
 * inventory / profile XML / priceoverview calls go through the Worker.
 * When unset, calls Steam directly (local/dev). Never falls back to direct
 * Steam while the proxy is configured (avoids reintroducing Vercel egress).
 */

import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "@/lib/net/circuit-breaker";
import { UPSTREAM_STEP_TIMEOUT_MS } from "@/lib/net/resilient-fetch";
import { parseHttpsUrl } from "@/lib/net/ssrf";
import { isSteamAssetId, isSteamId64 } from "@/lib/steam/steamid";
import { jsonObject } from "@/types/json";

export const STEAM_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT_MS = 20_000;
const RETRY_429_BACKOFF_MS = 3_000;

export type SteamProxyErrorCode =
  | "unauthorized"
  | "misconfigured"
  | "bad_request"
  | "upstream"
  | "proxy_rate_limited"
  | "timeout"
  | "network";

export class SteamProxyError extends Error {
  readonly code: SteamProxyErrorCode;

  constructor(message: string, code: SteamProxyErrorCode) {
    super(message);
    this.name = "SteamProxyError";
    this.code = code;
  }
}

const STEAM_PROXY_CIRCUIT = "steam-proxy";

export function isSteamProxyConfigured(): boolean {
  return Boolean(
    process.env.STEAM_PROXY_URL?.trim() &&
      process.env.STEAM_PROXY_SECRET?.trim(),
  );
}

function proxyBaseUrl(): string {
  const base = process.env.STEAM_PROXY_URL?.trim();
  if (!base) {
    throw new SteamProxyError(
      "Steam proxy is misconfigured (STEAM_PROXY_URL missing).",
      "misconfigured",
    );
  }
  const cleaned = base.replace(/\/+$/, "");
  const parsed = parseHttpsUrl(cleaned);
  if (!parsed) {
    throw new SteamProxyError(
      "Steam proxy is misconfigured (STEAM_PROXY_URL must be public HTTPS).",
      "misconfigured",
    );
  }
  return cleaned;
}

function proxySecret(): string {
  const secret = process.env.STEAM_PROXY_SECRET?.trim();
  if (!secret) {
    throw new SteamProxyError(
      "Steam proxy is misconfigured (STEAM_PROXY_SECRET missing).",
      "misconfigured",
    );
  }
  return secret;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function abortErrorMessage(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || /aborted|timeout/i.test(err.message);
}

/**
 * True when the failure is a proxy/config auth problem (hard fail — do not
 * soft-serve inventory cache as if Steam rate-limited).
 */
export function isSteamProxyConfigError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("steam proxy is misconfigured") ||
    lower.includes("steam proxy unauthorized") ||
    lower.includes("proxy authentication failed")
  );
}

/**
 * Transient proxy / network failures suitable for DB cache soft-fail.
 */
export function isSteamProxyTransientError(message: string): boolean {
  if (isSteamProxyConfigError(message)) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("steam proxy") ||
    lower.includes("could not reach steam") ||
    lower.includes("proxy timed out") ||
    lower.includes("proxy rate limit")
  );
}

async function readProxyErrorBody(res: Response): Promise<{
  code: string;
  message: string;
}> {
  const fallbackCode = res.headers.get("X-Steam-Proxy-Error") ?? "upstream";
  try {
    const data: unknown = await res.json();
    const payload = jsonObject(data);
    const error =
      payload && typeof payload.error === "string" ? payload.error : null;
    const code =
      payload && typeof payload.code === "string" ? payload.code : fallbackCode;
    if (error) return { code, message: error };
  } catch {
    // ignore
  }
  return { code: fallbackCode, message: `Steam proxy error (HTTP ${res.status}).` };
}

/**
 * Fetch a Worker path. Throws SteamProxyError on proxy-layer failures.
 * Returns the Response for Steam passthrough (may be 403/429/etc from Steam).
 */
async function fetchViaProxy(
  pathWithQuery: string,
  timeoutMs: number,
): Promise<Response> {
  if (await isCircuitOpen(STEAM_PROXY_CIRCUIT)) {
    throw new SteamProxyError(
      "Steam proxy is temporarily unavailable. Try again shortly.",
      "upstream",
    );
  }

  const url = `${proxyBaseUrl()}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
  const parsed = parseHttpsUrl(url.split("?")[0] ?? url);
  if (!parsed) {
    throw new SteamProxyError(
      "Steam proxy is misconfigured (STEAM_PROXY_URL must be public HTTPS).",
      "misconfigured",
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${proxySecret()}`,
        Accept: "*/*",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const proxyErr = res.headers.get("X-Steam-Proxy-Error");
    if (proxyErr) {
      const { code, message } = await readProxyErrorBody(res);
      if (code === "unauthorized") {
        throw new SteamProxyError(
          "Steam proxy unauthorized — check STEAM_PROXY_SECRET.",
          "unauthorized",
        );
      }
      if (code === "misconfigured") {
        throw new SteamProxyError(
          "Steam proxy is misconfigured on the Worker.",
          "misconfigured",
        );
      }
      if (code === "proxy_rate_limited") {
        throw new SteamProxyError(
          "Steam proxy rate limit exceeded. Try again shortly.",
          "proxy_rate_limited",
        );
      }
      if (code === "bad_request") {
        throw new SteamProxyError(
          `Steam proxy bad request: ${message}`,
          "bad_request",
        );
      }
      throw new SteamProxyError(
        `Steam proxy upstream failure: ${message}`,
        "upstream",
      );
    }

    // Auth failures without our header (e.g. CF Access) — treat as config.
    if (res.status === 401) {
      throw new SteamProxyError(
        "Steam proxy unauthorized — check STEAM_PROXY_SECRET.",
        "unauthorized",
      );
    }

    await recordCircuitSuccess(STEAM_PROXY_CIRCUIT);
    return res;
  } catch (err) {
    if (err instanceof SteamProxyError) {
      if (
        err.code === "timeout" ||
        err.code === "network" ||
        err.code === "upstream" ||
        err.code === "proxy_rate_limited"
      ) {
        await recordCircuitFailure(STEAM_PROXY_CIRCUIT);
      }
      throw err;
    }
    if (abortErrorMessage(err)) {
      await recordCircuitFailure(STEAM_PROXY_CIRCUIT);
      throw new SteamProxyError(
        "Steam proxy timed out waiting for Steam Community.",
        "timeout",
      );
    }
    await recordCircuitFailure(STEAM_PROXY_CIRCUIT);
    throw new SteamProxyError(
      "Could not reach Steam proxy. Try again shortly.",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDirect(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });
  } catch (err) {
    if (abortErrorMessage(err)) {
      throw new SteamProxyError(
        "Steam Community request timed out.",
        "timeout",
      );
    }
    throw new SteamProxyError(
      "Could not reach Steam Community. Try again shortly.",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }
}

export type InventoryPageParams = {
  steamId: string;
  count: number;
  startAssetId?: string;
};

/**
 * One inventory page. Retries once on Steam HTTP 429.
 * When proxy is configured, never falls back to direct Steam.
 */
export async function fetchSteamInventoryPage(
  params: InventoryPageParams,
  options?: { timeoutMs?: number; retryOn429?: boolean },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryOn429 = options?.retryOn429 ?? true;

  if (!isSteamId64(params.steamId)) {
    throw new SteamProxyError("Invalid steamId.", "bad_request");
  }
  if (params.startAssetId && !isSteamAssetId(params.startAssetId)) {
    throw new SteamProxyError("Invalid start_assetid.", "bad_request");
  }

  const run = async (): Promise<Response> => {
    if (isSteamProxyConfigured()) {
      const q = new URLSearchParams({
        steamId: params.steamId,
        count: String(params.count),
      });
      if (params.startAssetId) {
        q.set("start_assetid", params.startAssetId);
      }
      return fetchViaProxy(`/inventory?${q}`, timeoutMs);
    }

    const steamParams = new URLSearchParams({
      l: "english",
      count: String(params.count),
    });
    if (params.startAssetId) {
      steamParams.set("start_assetid", params.startAssetId);
    }
    const url = `https://steamcommunity.com/inventory/${params.steamId}/730/2?${steamParams}`;
    return fetchDirect(
      url,
      {
        "User-Agent": STEAM_BROWSER_UA,
        Accept: "application/json, text/javascript, */*;q=0.01",
        Referer: `https://steamcommunity.com/profiles/${params.steamId}/inventory`,
      },
      timeoutMs,
    );
  };

  let res = await run();
  if (res.status === 429 && retryOn429) {
    await sleep(RETRY_429_BACKOFF_MS);
    res = await run();
  }
  return res;
}

export async function fetchSteamVanityXml(
  vanity: string,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (isSteamProxyConfigured()) {
    const q = new URLSearchParams({ vanity });
    return fetchViaProxy(`/vanity?${q}`, timeoutMs);
  }
  return fetchDirect(
    `https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`,
    {
      "User-Agent": STEAM_BROWSER_UA,
      Accept: "application/xml, text/xml, */*;q=0.01",
    },
    timeoutMs,
  );
}

export async function fetchSteamProfileXml(
  steamId: string,
  options?: { timeoutMs?: number },
): Promise<Response> {
  if (!isSteamId64(steamId)) {
    throw new SteamProxyError("Invalid steamId.", "bad_request");
  }
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (isSteamProxyConfigured()) {
    const q = new URLSearchParams({ steamId });
    return fetchViaProxy(`/profile?${q}`, timeoutMs);
  }
  return fetchDirect(
    `https://steamcommunity.com/profiles/${steamId}/?xml=1`,
    {
      "User-Agent": STEAM_BROWSER_UA,
      Accept: "application/xml, text/xml, */*;q=0.01",
    },
    timeoutMs,
  );
}

export async function fetchSteamPriceOverview(
  params: {
    marketHashName: string;
    currencyCode: string;
    appId?: string;
  },
  options?: { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? UPSTREAM_STEP_TIMEOUT_MS;
  const appId = params.appId ?? "730";

  if (isSteamProxyConfigured()) {
    const q = new URLSearchParams({
      appid: appId,
      currency: params.currencyCode,
      market_hash_name: params.marketHashName,
    });
    return fetchViaProxy(`/priceoverview?${q}`, timeoutMs);
  }

  const steamParams = new URLSearchParams({
    appid: appId,
    currency: params.currencyCode,
    market_hash_name: params.marketHashName,
  });
  return fetchDirect(
    `https://steamcommunity.com/market/priceoverview/?${steamParams}`,
    {
      "User-Agent": STEAM_BROWSER_UA,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://steamcommunity.com/market/",
    },
    timeoutMs,
  );
}
