import { parseCurrency, type Currency } from "@/lib/currency";
import { jsonObject } from "@/types/json";

export const RECENT_PROFILES_STORAGE_KEY = "skinstation-recent-profiles";
export const RECENT_PROFILES_LIMIT = 8;

/** Slim profile row stored only on this device (localStorage). */
export type RecentProfileEntry = {
  id: string;
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  currency: Currency;
  faceitUrl: string | null;
  faceitLevel: number | null;
  faceitElo: number | null;
  faceitNickname: string | null;
  faceitFound: boolean;
  faceitFetchedAt: string | null;
  leetifyUrl: string | null;
  leetifyName: string | null;
  leetifyRating: number | null;
  leetifyFound: boolean;
  itemCount: number;
  lastSyncedAt: string | null;
  latestSnapshot: {
    currency: Currency;
    totalSteam: number;
    totalBuff: number;
  } | null;
};

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseSnapshot(
  value: unknown,
  fallbackCurrency: Currency,
): RecentProfileEntry["latestSnapshot"] {
  if (!value || typeof value !== "object") return null;
  const row = jsonObject(value);
  if (!row) return null;
  const totalSteam = asNumberOrNull(row.totalSteam);
  const totalBuff = asNumberOrNull(row.totalBuff);
  if (totalSteam == null || totalBuff == null) return null;
  return {
    currency: parseCurrency(row.currency, fallbackCurrency),
    totalSteam,
    totalBuff,
  };
}

export function parseRecentProfileEntry(
  value: unknown,
): RecentProfileEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = jsonObject(value);
  if (!row) return null;
  const id = asStringOrNull(row.id);
  const steamId = asStringOrNull(row.steamId);
  if (!id || !steamId) return null;

  const currency = parseCurrency(row.currency);
  const itemCount = asNumberOrNull(row.itemCount) ?? 0;

  return {
    id,
    steamId,
    personaName: asStringOrNull(row.personaName),
    avatarUrl: asStringOrNull(row.avatarUrl),
    currency,
    faceitUrl: asStringOrNull(row.faceitUrl),
    faceitLevel: asNumberOrNull(row.faceitLevel),
    faceitElo: asNumberOrNull(row.faceitElo),
    faceitNickname: asStringOrNull(row.faceitNickname),
    faceitFound: asBoolean(row.faceitFound),
    faceitFetchedAt: asStringOrNull(row.faceitFetchedAt),
    leetifyUrl: asStringOrNull(row.leetifyUrl),
    leetifyName: asStringOrNull(row.leetifyName),
    leetifyRating: asNumberOrNull(row.leetifyRating),
    leetifyFound: asBoolean(row.leetifyFound),
    itemCount,
    lastSyncedAt: asStringOrNull(row.lastSyncedAt),
    latestSnapshot: parseSnapshot(row.latestSnapshot, currency),
  };
}

export function readRecentProfiles(): RecentProfileEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: RecentProfileEntry[] = [];
    for (const item of parsed) {
      const entry = parseRecentProfileEntry(item);
      if (entry) entries.push(entry);
      if (entries.length >= RECENT_PROFILES_LIMIT) break;
    }
    return entries;
  } catch {
    return [];
  }
}

export function writeRecentProfiles(
  entries: RecentProfileEntry[],
): RecentProfileEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const next = entries.slice(0, RECENT_PROFILES_LIMIT);
    window.localStorage.setItem(
      RECENT_PROFILES_STORAGE_KEY,
      JSON.stringify(next),
    );
    return next;
  } catch {
    return readRecentProfiles();
  }
}

export function rememberRecentProfile(
  entry: RecentProfileEntry,
): RecentProfileEntry[] {
  if (typeof window === "undefined") return [];
  return writeRecentProfiles([
    entry,
    ...readRecentProfiles().filter((p) => p.id !== entry.id),
  ]);
}

export function recentProfileIds(): string[] {
  return readRecentProfiles().map((p) => p.id);
}
