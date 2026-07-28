/** Client-side backoff after Steam rate limits — avoids hammering a hot IP. */

export const STEAM_BACKOFF_STORAGE_KEY = "skinstation-steam-backoff-until";
/** Default pause after a Steam 429 / rate-limit soft cache response. */
export const STEAM_BACKOFF_MS = 5 * 60 * 1000;

export function readSteamBackoffUntil(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STEAM_BACKOFF_STORAGE_KEY);
    if (!raw) return 0;
    const until = Number.parseInt(raw, 10);
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}

export function steamBackoffRemainingMs(now = Date.now()): number {
  return Math.max(0, readSteamBackoffUntil() - now);
}

export function isSteamBackoffActive(now = Date.now()): boolean {
  return steamBackoffRemainingMs(now) > 0;
}

export function markSteamBackoff(durationMs = STEAM_BACKOFF_MS): number {
  if (typeof window === "undefined") return 0;
  const until = Date.now() + durationMs;
  try {
    window.localStorage.setItem(STEAM_BACKOFF_STORAGE_KEY, String(until));
  } catch {
    // ignore quota / private mode
  }
  return until;
}

export function clearSteamBackoff(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STEAM_BACKOFF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function looksLikeSteamRateLimitMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("rate-limited") || lower.includes("rate limited");
}

export function formatBackoffCountdown(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}
