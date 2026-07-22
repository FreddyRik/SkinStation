/** Shared Steamwebapi quota / rate-limit detection. */

export const STEAMWEBAPI_LIMIT_MESSAGE =
  "Steamwebapi request limit reached — float/pattern data may be incomplete. Wait for your plan to reset or upgrade at steamwebapi.com.";

export class SteamwebapiLimitError extends Error {
  readonly status: number;

  constructor(status: number, detail?: string) {
    super(
      detail?.trim()
        ? `${STEAMWEBAPI_LIMIT_MESSAGE} (${detail.trim().slice(0, 120)})`
        : STEAMWEBAPI_LIMIT_MESSAGE,
    );
    this.name = "SteamwebapiLimitError";
    this.status = status;
  }
}

export function isSteamwebapiLimitResponse(
  status: number,
  body: string,
): boolean {
  if (status === 429 || status === 402) return true;
  const t = body.toLowerCase();
  return (
    t.includes("rate limit") ||
    t.includes("ratelimit") ||
    t.includes("too many requests") ||
    t.includes("quota") ||
    t.includes("out of credit") ||
    t.includes("no credit") ||
    t.includes("credits exhausted") ||
    t.includes("request limit") ||
    t.includes("limit exceeded") ||
    t.includes("plan limit") ||
    t.includes("upgrade your plan") ||
    t.includes("monthly limit")
  );
}

export function isSteamwebapiLimitMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  const t = message.toLowerCase();
  return (
    t.includes("steamwebapi request limit") ||
    (t.includes("steamwebapi") && t.includes("limit"))
  );
}
