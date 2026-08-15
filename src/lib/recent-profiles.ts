import { parseCurrency, type Currency } from "@/lib/currency";
import { isRecord, readBoolean, readNumberOrNull, readStringOrNull } from "@/types/json";

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

function parseSnapshot(
  value: unknown,
  fallbackCurrency: Currency,
): RecentProfileEntry["latestSnapshot"] {
  if (!isRecord(value)) return null;
  const totalSteam = readNumberOrNull(value.totalSteam);
  const totalBuff = readNumberOrNull(value.totalBuff);
  if (totalSteam == null || totalBuff == null) return null;
  return {
    currency: parseCurrency(value.currency, fallbackCurrency),
    totalSteam,
    totalBuff,
  };
}

export function parseRecentProfileEntry(
  value: unknown,
): RecentProfileEntry | null {
  if (!isRecord(value)) return null;
  const id = readStringOrNull(value.id);
  const steamId = readStringOrNull(value.steamId);
  if (!id || !steamId) return null;

  const currency = parseCurrency(value.currency);
  const itemCount = readNumberOrNull(value.itemCount) ?? 0;

  return {
    id,
    steamId,
    personaName: readStringOrNull(value.personaName),
    avatarUrl: readStringOrNull(value.avatarUrl),
    currency,
    faceitUrl: readStringOrNull(value.faceitUrl),
    faceitLevel: readNumberOrNull(value.faceitLevel),
    faceitElo: readNumberOrNull(value.faceitElo),
    faceitNickname: readStringOrNull(value.faceitNickname),
    faceitFound: readBoolean(value.faceitFound),
    faceitFetchedAt: readStringOrNull(value.faceitFetchedAt),
    leetifyUrl: readStringOrNull(value.leetifyUrl),
    leetifyName: readStringOrNull(value.leetifyName),
    leetifyRating: readNumberOrNull(value.leetifyRating),
    leetifyFound: readBoolean(value.leetifyFound),
    itemCount,
    lastSyncedAt: readStringOrNull(value.lastSyncedAt),
    latestSnapshot: parseSnapshot(value.latestSnapshot, currency),
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
