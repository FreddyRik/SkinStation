/**
 * Authenticated Steam Community fetch proxy for SkinStation.
 * Vercel (or local Next) calls this Worker; the Worker calls Steam.
 * Not a public CORS proxy — Bearer secret required; no ACAO: *.
 */

const STEAM_ID64_RE = /^\d{17}$/;
const VANITY_RE = /^[a-zA-Z0-9_-]{2,64}$/;
const APP_ID = "730";
const CONTEXT_ID = "2";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type Env = {
  STEAM_PROXY_SECRET: string;
};

/** Best-effort in-isolate rate limit (resets per isolate). */
const rateHits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_KEY = 30;

function isSteamId64(value: string): boolean {
  if (!STEAM_ID64_RE.test(value)) return false;
  try {
    const n = BigInt(value);
    const universe = n >> 56n;
    const accountType = (n >> 52n) & 0xfn;
    const instance = (n >> 32n) & 0xfffffn;
    return (
      universe === 1n &&
      accountType === 1n &&
      (instance === 0n || instance === 1n) &&
      n >= 76561197960265728n &&
      n <= 76561202255233023n
    );
  } catch {
    return false;
  }
}

function jsonError(
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Steam-Proxy-Error": code,
    },
  });
}

function secretsEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const len = Math.max(a.byteLength, b.byteLength, 1);
  const xa = new Uint8Array(len);
  const xb = new Uint8Array(len);
  xa.set(a);
  xb.set(b);
  let mismatch = a.byteLength === b.byteLength ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= xa[i] ^ xb[i];
  }
  return mismatch === 0;
}

function checkAuth(req: Request, env: Env): Response | null {
  const secret = env.STEAM_PROXY_SECRET?.trim();
  if (!secret) {
    return jsonError(
      503,
      "misconfigured",
      "Steam proxy is not configured.",
    );
  }
  const header = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim() ?? "";
  if (!token || !secretsEqual(token, secret)) {
    return jsonError(401, "unauthorized", "Unauthorized.");
  }
  return null;
}

function clientKey(req: Request): string {
  const cf = req.headers.get("CF-Connecting-IP")?.trim();
  if (cf) return cf;
  const forwarded = req.headers.get("X-Forwarded-For");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  return "unknown";
}

function rateLimit(key: string): Response | null {
  const now = Date.now();
  let entry = rateHits.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateHits.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_PER_KEY) {
    return jsonError(
      429,
      "proxy_rate_limited",
      "Steam proxy rate limit exceeded. Try again shortly.",
    );
  }
  return null;
}

async function passthroughSteam(
  steamUrl: string,
  headers: Record<string, string>,
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(steamUrl, {
      headers,
      redirect: "follow",
    });
  } catch {
    return jsonError(
      502,
      "upstream",
      "Could not reach Steam Community from the proxy.",
    );
  }

  const body = await upstream.arrayBuffer();
  const outHeaders = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) outHeaders.set("Content-Type", contentType);
  outHeaders.set("Cache-Control", "no-store");
  outHeaders.set("X-Steam-Proxy", "1");

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

function inventoryHeaders(steamId: string): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    Accept: "application/json, text/javascript, */*;q=0.01",
    Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
  };
}

function xmlHeaders(): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    Accept: "application/xml, text/xml, */*;q=0.01",
  };
}

function marketHeaders(): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://steamcommunity.com/market/",
  };
}

function handleHealth(): Response {
  return new Response(JSON.stringify({ ok: true, service: "steam-proxy" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleInventory(
  url: URL,
  req: Request,
  env: Env,
): Promise<Response> {
  const authErr = checkAuth(req, env);
  if (authErr) return authErr;
  const rl = rateLimit(`${clientKey(req)}:inventory`);
  if (rl) return rl;

  const steamId = url.searchParams.get("steamId")?.trim() ?? "";
  if (!isSteamId64(steamId)) {
    return jsonError(400, "bad_request", "Invalid or missing steamId.");
  }

  const countRaw = url.searchParams.get("count") ?? "2000";
  const count = Number.parseInt(countRaw, 10);
  if (!Number.isFinite(count) || count < 1 || count > 2000) {
    return jsonError(400, "bad_request", "Invalid count (1–2000).");
  }

  const startAssetId = url.searchParams.get("start_assetid")?.trim();
  const params = new URLSearchParams({
    l: "english",
    count: String(count),
  });
  if (startAssetId) {
    if (!/^\d+$/.test(startAssetId)) {
      return jsonError(400, "bad_request", "Invalid start_assetid.");
    }
    params.set("start_assetid", startAssetId);
  }

  const steamUrl = `https://steamcommunity.com/inventory/${steamId}/${APP_ID}/${CONTEXT_ID}?${params}`;
  return passthroughSteam(steamUrl, inventoryHeaders(steamId));
}

async function handleVanity(
  url: URL,
  req: Request,
  env: Env,
): Promise<Response> {
  const authErr = checkAuth(req, env);
  if (authErr) return authErr;
  const rl = rateLimit(`${clientKey(req)}:vanity`);
  if (rl) return rl;

  const vanity = url.searchParams.get("vanity")?.trim() ?? "";
  if (!VANITY_RE.test(vanity)) {
    return jsonError(400, "bad_request", "Invalid or missing vanity.");
  }

  const steamUrl = `https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`;
  return passthroughSteam(steamUrl, xmlHeaders());
}

async function handleProfile(
  url: URL,
  req: Request,
  env: Env,
): Promise<Response> {
  const authErr = checkAuth(req, env);
  if (authErr) return authErr;
  const rl = rateLimit(`${clientKey(req)}:profile`);
  if (rl) return rl;

  const steamId = url.searchParams.get("steamId")?.trim() ?? "";
  if (!isSteamId64(steamId)) {
    return jsonError(400, "bad_request", "Invalid or missing steamId.");
  }

  const steamUrl = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
  return passthroughSteam(steamUrl, xmlHeaders());
}

async function handlePriceOverview(
  url: URL,
  req: Request,
  env: Env,
): Promise<Response> {
  const authErr = checkAuth(req, env);
  if (authErr) return authErr;
  const rl = rateLimit(`${clientKey(req)}:priceoverview`);
  if (rl) return rl;

  const appid = url.searchParams.get("appid")?.trim() ?? APP_ID;
  const currency = url.searchParams.get("currency")?.trim() ?? "";
  const marketHashName = url.searchParams.get("market_hash_name")?.trim() ?? "";

  if (appid !== APP_ID) {
    return jsonError(400, "bad_request", "Only appid 730 (CS2) is allowed.");
  }
  if (!/^\d{1,3}$/.test(currency)) {
    return jsonError(400, "bad_request", "Invalid currency.");
  }
  if (!marketHashName || marketHashName.length > 256) {
    return jsonError(400, "bad_request", "Invalid market_hash_name.");
  }

  const params = new URLSearchParams({
    appid: APP_ID,
    currency,
    market_hash_name: marketHashName,
  });
  const steamUrl = `https://steamcommunity.com/market/priceoverview/?${params}`;
  return passthroughSteam(steamUrl, marketHeaders());
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      // No public browser CORS — reject preflight.
      return new Response(null, { status: 405 });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return jsonError(405, "bad_request", "Method not allowed.");
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/health") return handleHealth();
      if (path === "/inventory") return handleInventory(url, req, env);
      if (path === "/vanity") return handleVanity(url, req, env);
      if (path === "/profile") return handleProfile(url, req, env);
      if (path === "/priceoverview") return handlePriceOverview(url, req, env);
      return jsonError(404, "bad_request", "Not found.");
    } catch {
      return jsonError(500, "upstream", "Steam proxy internal error.");
    }
  },
};
