import {
  isRecord,
  readBoolean,
  readNumber,
  readOptionalBoolean,
  readString,
  type JsonRecord,
} from "@/types/json";
import type { InventoryItemRow } from "@/types/inventory";

/** Canonical JSON error body for every API route. */
export type ApiErrorBody = {
  error: string;
};

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return isRecord(value) && typeof value.error === "string";
}

export function apiErrorMessage(
  value: unknown,
  fallback: string,
): string {
  return isApiErrorBody(value) ? value.error : fallback;
}

export type SyncRequestBody = {
  profileId?: string;
  input?: string;
  force?: boolean;
  currency?: string;
};

export function parseSyncRequestBody(value: unknown): SyncRequestBody | null {
  if (!isRecord(value)) return null;
  return {
    profileId: readString(value.profileId),
    input: readString(value.input),
    force: readOptionalBoolean(value.force),
    currency: readString(value.currency),
  };
}

export type CreateProfileRequestBody = {
  input?: string;
};

export function parseCreateProfileRequestBody(
  value: unknown,
): CreateProfileRequestBody | null {
  if (!isRecord(value)) return null;
  return { input: readString(value.input) };
}

export type CreateProfileResponse = {
  profile: JsonRecord;
};

export function parseCreateProfileResponse(
  value: unknown,
): { profile: JsonRecord; error?: string } | { profile?: undefined; error?: string } {
  if (!isRecord(value)) return { error: undefined };
  const profile = isRecord(value.profile) ? value.profile : undefined;
  return {
    profile,
    error: readString(value.error),
  };
}

export type SyncApiResponse = {
  error?: string;
  warning?: string;
  itemCount?: number;
  totalSteam?: number;
  totalBuff?: number;
  currency?: string;
  usedCachedInventory?: boolean;
  skippedCooldown?: boolean;
  inspected?: number;
};

export function parseSyncApiResponse(value: unknown): SyncApiResponse {
  if (!isRecord(value)) return {};
  return {
    error: readString(value.error),
    warning: readString(value.warning),
    itemCount: readNumber(value.itemCount),
    totalSteam: readNumber(value.totalSteam),
    totalBuff: readNumber(value.totalBuff),
    currency: readString(value.currency),
    usedCachedInventory: readOptionalBoolean(value.usedCachedInventory),
    skippedCooldown: readOptionalBoolean(value.skippedCooldown),
    inspected: readNumber(value.inspected),
  };
}

export type FxApiResponse = {
  usdToEur: number;
  eurToUsd: number;
};

export function parseFxApiResponse(value: unknown): FxApiResponse | null {
  if (!isRecord(value)) return null;
  const usdToEur = readNumber(value.usdToEur);
  if (usdToEur == null || usdToEur <= 0) return null;
  const eurToUsd = readNumber(value.eurToUsd) ?? Number((1 / usdToEur).toFixed(6));
  return { usdToEur, eurToUsd };
}

export type ProfileListApiResponse = {
  profiles: JsonRecord[];
  error?: string;
};

export function parseProfileListApiResponse(
  value: unknown,
): ProfileListApiResponse {
  if (!isRecord(value)) return { profiles: [] };
  const profiles = Array.isArray(value.profiles)
    ? value.profiles.filter(isRecord)
    : [];
  return {
    profiles,
    error: readString(value.error),
  };
}

export type ProfileDetailApiResponse = {
  items: InventoryItemRow[];
  error?: string;
};

function parseInventoryItemRow(value: unknown): InventoryItemRow | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  const assetId = readString(value.assetId);
  const marketHashName = readString(value.marketHashName);
  const name = readString(value.name);
  if (!id || !assetId || !marketHashName || !name) return null;
  return {
    id,
    assetId,
    marketHashName,
    name,
    iconUrl: readString(value.iconUrl) ?? null,
    exterior: readString(value.exterior) ?? null,
    floatValue: readNumber(value.floatValue) ?? null,
    paintIndex: readNumber(value.paintIndex) ?? null,
    steamPrice: readNumber(value.steamPrice) ?? null,
    buffPrice: readNumber(value.buffPrice) ?? null,
    rarity: readString(value.rarity) ?? null,
    type: readString(value.type) ?? null,
    marketable: readBoolean(value.marketable, false),
  };
}

export function parseProfileDetailApiResponse(
  value: unknown,
): ProfileDetailApiResponse {
  if (!isRecord(value)) return { items: [] };
  const items = Array.isArray(value.items)
    ? value.items
        .map(parseInventoryItemRow)
        .filter((row): row is InventoryItemRow => row != null)
    : [];
  return {
    items,
    error: readString(value.error),
  };
}

export type CsCatalogApiResponse = {
  items: unknown[];
  collections: unknown[];
  error?: string;
};

export function parseCsCatalogApiResponse(
  value: unknown,
): CsCatalogApiResponse {
  if (!isRecord(value)) return { items: [], collections: [] };
  return {
    items: Array.isArray(value.items) ? value.items : [],
    collections: Array.isArray(value.collections) ? value.collections : [],
    error: readString(value.error),
  };
}
