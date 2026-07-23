import type { Currency } from "@/lib/currency";
import type { InventoryItemView } from "@/components/InventoryDashboard";
import { itemSupportsStickers } from "@/lib/item-flags";
import {
  portfolioTotalFromItems,
  type PriceSource,
} from "@/lib/price-source";

export type InventoryExportMeta = {
  steamId: string;
  personaName: string | null;
  currency: Currency;
  priceSource: PriceSource;
  lastSyncedAt: string | null;
  /** True when search/filters narrowed the list vs full inventory. */
  filtered: boolean;
};

type ExportSticker = {
  slot: number | null;
  name: string | null;
  wear: number | null;
  steamPrice: number | null;
  buffPrice: number | null;
};

type ExportItem = {
  assetId: string;
  marketHashName: string;
  name: string;
  exterior: string | null;
  rarity: string | null;
  type: string | null;
  float: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  steamPrice: number | null;
  buffPrice: number | null;
  stickers: ExportSticker[];
};

export type InventoryExportDocument = {
  exportedAt: string;
  formatVersion: 1;
  profile: {
    steamId: string;
    personaName: string | null;
  };
  currency: Currency;
  priceSource: PriceSource;
  lastSyncedAt: string | null;
  filtered: boolean;
  itemCount: number;
  totals: {
    steam: number;
    buff: number;
  };
  items: ExportItem[];
};

function roundMoney(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

/** Standalone sticker inventory items — never have applied stickers. */
function isStickerInventoryItem(item: InventoryItemView): boolean {
  const type = (item.type ?? "").toLowerCase().trim();
  if (type === "sticker" || /\bsticker\b/.test(type)) return true;

  const hash = (item.marketHashName ?? "").toLowerCase().trim();
  return (
    /^sticker\s*\|/.test(hash) ||
    /^stattrak™?\s+sticker\s*\|/.test(hash)
  );
}

function appliedStickersForExport(item: InventoryItemView): ExportSticker[] {
  // Keep sticker *items* as CSV rows; only clear the applied-stickers column.
  if (isStickerInventoryItem(item)) return [];
  if (!itemSupportsStickers(item.type, item.marketHashName)) return [];

  return (item.stickers ?? [])
    .filter((s) => Boolean(s.name?.trim()))
    .map((s) => ({
      slot: s.slot ?? null,
      name: s.name?.trim() || null,
      wear: s.wear ?? null,
      steamPrice: roundMoney(s.steamPrice),
      buffPrice: roundMoney(s.buffPrice),
    }));
}

function toExportItem(item: InventoryItemView): ExportItem {
  return {
    assetId: item.assetId,
    marketHashName: item.marketHashName,
    name: item.name,
    exterior: item.exterior,
    rarity: item.rarity,
    type: item.type,
    float: item.floatValue,
    paintSeed: item.paintSeed,
    paintIndex: item.paintIndex,
    steamPrice: roundMoney(item.steamPrice),
    buffPrice: roundMoney(item.buffPrice),
    stickers: appliedStickersForExport(item),
  };
}

export function buildInventoryExportDocument(
  items: InventoryItemView[],
  meta: InventoryExportMeta,
): InventoryExportDocument {
  const exported = items.map(toExportItem);
  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    profile: {
      steamId: meta.steamId,
      personaName: meta.personaName,
    },
    currency: meta.currency,
    priceSource: meta.priceSource,
    lastSyncedAt: meta.lastSyncedAt,
    filtered: meta.filtered,
    itemCount: exported.length,
    totals: {
      // Match on-screen portfolio totals (selected source with cross-fallback).
      steam: roundMoney(portfolioTotalFromItems(items, "steam")) ?? 0,
      buff: roundMoney(portfolioTotalFromItems(items, "buff")) ?? 0,
    },
    items: exported,
  };
}

/** Float for CSV/spreadsheets: full useful precision, no trailing zeros noise. */
export function formatExportFloat(value: number | null): string {
  if (value == null) return "";
  return value.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
}

function formatStickerCell(stickers: ExportSticker[]): string {
  if (stickers.length === 0) return "";
  return stickers
    .filter((s) => Boolean(s.name?.trim()))
    .map((s) => {
      const slot = s.slot != null ? `#${s.slot + 1}` : "#?";
      const name = s.name!.trim();
      const wear =
        s.wear != null && Number.isFinite(s.wear)
          ? ` ${Math.round(s.wear * 1000) / 10}%`
          : "";
      return `${slot} ${name}${wear}`;
    })
    .join(" | ");
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  "asset_id",
  "market_hash_name",
  "name",
  "exterior",
  "rarity",
  "type",
  "float",
  "paint_seed",
  "paint_index",
  "steam_price",
  "buff_price",
  "currency",
  "sticker_count",
  "stickers",
] as const;

export function inventoryToCsv(
  items: InventoryItemView[],
  meta: InventoryExportMeta,
): string {
  const rows = items.map((item) => {
    const exported = toExportItem(item);
    return [
      exported.assetId,
      exported.marketHashName,
      exported.name,
      exported.exterior,
      exported.rarity,
      exported.type,
      formatExportFloat(exported.float),
      exported.paintSeed,
      exported.paintIndex,
      exported.steamPrice,
      exported.buffPrice,
      meta.currency,
      exported.stickers.length,
      formatStickerCell(exported.stickers),
    ]
      .map(csvEscape)
      .join(",");
  });

  // BOM helps Excel recognize UTF-8 (skin names with ™ etc.)
  return `\uFEFF${CSV_HEADERS.join(",")}\n${rows.join("\n")}\n`;
}

export function inventoryToJson(
  items: InventoryItemView[],
  meta: InventoryExportMeta,
): string {
  return `${JSON.stringify(buildInventoryExportDocument(items, meta), null, 2)}\n`;
}

export function inventoryExportFilename(
  meta: InventoryExportMeta,
  extension: "csv" | "json",
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const label = (meta.personaName?.trim() || meta.steamId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = meta.filtered ? "-filtered" : "";
  return `cs2-inventory-${label || "export"}-${stamp}${suffix}.${extension}`;
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime: string,
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
