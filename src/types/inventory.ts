import type { Currency } from "@/lib/currency";

export type InventoryStickerView = {
  slot?: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
  steamPrice?: number | null;
  buffPrice?: number | null;
};

export type InventoryItemView = {
  id: string;
  assetId: string;
  marketHashName: string;
  name: string;
  iconUrl: string | null;
  exterior: string | null;
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  stickers: InventoryStickerView[];
  steamPrice: number | null;
  buffPrice: number | null;
  /** Buff163 goods id when resolved from the community ID map. */
  buffGoodsId?: number | null;
  rarity: string | null;
  type: string | null;
  tradable: boolean;
  marketable: boolean;
};

export type SnapshotView = {
  id: string;
  currency: Currency;
  itemCount: number;
  totalSteam: number;
  totalBuff: number;
  createdAt: string;
};

export type ProfileView = {
  id: string;
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
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
  lastSyncedAt: string | null;
  lastError: string | null;
  syncing: boolean;
};

/** Subset of inventory fields needed for trade-up eligibility and costs. */
export type InventoryItemRow = Pick<
  InventoryItemView,
  | "id"
  | "assetId"
  | "marketHashName"
  | "name"
  | "iconUrl"
  | "exterior"
  | "floatValue"
  | "paintIndex"
  | "steamPrice"
  | "buffPrice"
  | "rarity"
  | "type"
  | "marketable"
>;
