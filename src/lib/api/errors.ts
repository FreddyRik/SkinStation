/**
 * Shared helpers for mapping internal errors to safe API responses.
 */

export function publicApiError(
  err: unknown,
  fallback: string,
): { message: string; logMessage: string } {
  const logMessage = err instanceof Error ? err.message : String(err);
  return { message: fallback, logMessage };
}

/** Map known sync / Steam / inventory errors to stable client-facing text. */
export function sanitizeSyncClientError(err: unknown): {
  status: number;
  error: string;
} {
  const raw = err instanceof Error ? err.message : "Sync failed";
  const lower = raw.toLowerCase();

  if (lower.includes("already in progress")) {
    return {
      status: 409,
      error: "A sync is already in progress for this profile.",
    };
  }
  if (
    lower.includes("private") ||
    lower.includes("hidden") ||
    lower.includes("ensure the profile and cs2 inventory are public")
  ) {
    return {
      status: 403,
      error:
        "This Steam inventory is private or hidden. Set CS2 inventory to Public and try again.",
    };
  }
  if (lower.includes("rate-limited") || lower.includes("rate limited")) {
    return {
      status: 429,
      error: "Steam or an upstream API rate-limited this request. Try again shortly.",
    };
  }
  if (
    lower.includes("steam proxy unauthorized") ||
    lower.includes("steam proxy is misconfigured") ||
    lower.includes("proxy authentication failed")
  ) {
    return {
      status: 502,
      error:
        "Steam fetch proxy is misconfigured. Check STEAM_PROXY_URL and STEAM_PROXY_SECRET.",
    };
  }
  if (
    lower.includes("could not resolve") ||
    lower.includes("invalid steam") ||
    lower.includes("vanity") ||
    lower.includes("required")
  ) {
    return {
      status: 400,
      error: "Could not resolve that Steam profile. Check the URL or SteamID64.",
    };
  }
  if (lower.includes("profile not found")) {
    return { status: 404, error: "Profile not found." };
  }
  if (
    lower.includes("steam inventory") ||
    lower.includes("steam returned") ||
    lower.includes("could not load inventory")
  ) {
    return {
      status: 502,
      error: "Steam inventory could not be loaded. Try again later.",
    };
  }
  if (lower.includes("force sync is not authorized")) {
    return { status: 403, error: "Force sync is not authorized." };
  }

  return { status: 500, error: "Sync failed. Please try again later." };
}

export function sanitizeProfileCreateError(err: unknown): {
  status: number;
  error: string;
} {
  const raw = err instanceof Error ? err.message : "Failed to create profile";
  const lower = raw.toLowerCase();

  if (
    lower.includes("could not resolve") ||
    lower.includes("invalid steam") ||
    lower.includes("vanity") ||
    lower.includes("required")
  ) {
    return {
      status: 400,
      error: "Could not resolve that Steam profile. Check the URL or SteamID64.",
    };
  }
  if (lower.includes("rate-limited") || lower.includes("rate limited")) {
    return {
      status: 429,
      error: "Steam rate-limited this request. Try again shortly.",
    };
  }
  if (
    lower.includes("steam") ||
    lower.includes("fetch") ||
    lower.includes("network")
  ) {
    return {
      status: 502,
      error: "Could not reach Steam. Try again later.",
    };
  }

  return { status: 500, error: "Failed to create profile. Please try again." };
}

/** Allow force sync only when SYNC_FORCE_SECRET is set and header matches. */
export function isForceSyncAuthorized(req: Request, wantsForce: boolean): boolean {
  if (!wantsForce) return false;
  const secret = process.env.SYNC_FORCE_SECRET?.trim();
  if (!secret) return false;
  const provided =
    req.headers.get("x-sync-force-secret")?.trim() ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(provided && provided === secret);
}
