import { describe, expect, it } from "vitest";
import type { InventoryItemView } from "@/components/InventoryDashboard";
import {
  buildInventoryExportDocument,
  formatExportFloat,
  inventoryExportFilename,
  inventoryToCsv,
  inventoryToJson,
} from "@/lib/inventory-export";

const item: InventoryItemView = {
  id: "1",
  assetId: "a1",
  marketHashName: "AK-47 | Redline (Field-Tested)",
  name: "AK-47 | Redline",
  iconUrl: null,
  exterior: "Field-Tested",
  floatValue: 0.25,
  paintSeed: 123,
  paintIndex: 282,
  stickers: [{ slot: 0, name: "titov", wear: 0.1, steamPrice: 1, buffPrice: 2 }],
  steamPrice: 10.126,
  buffPrice: 8.1,
  rarity: "Classified",
  type: "Rifle",
  tradable: true,
  marketable: true,
};

const meta = {
  steamId: "76561198000000000",
  personaName: "Gaben™",
  currency: "USD" as const,
  priceSource: "buff" as const,
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  filtered: false,
};

describe("inventory export", () => {
  it("builds a document with rounded money and applied stickers", () => {
    const doc = buildInventoryExportDocument([item], meta);
    expect(doc.formatVersion).toBe(1);
    expect(doc.itemCount).toBe(1);
    expect(doc.totals.buff).toBe(8.1);
    expect(doc.items[0]?.steamPrice).toBe(10.13);
    expect(doc.items[0]?.stickers).toHaveLength(1);
  });

  it("omits applied stickers on sticker inventory items", () => {
    const stickerItem: InventoryItemView = {
      ...item,
      type: "Sticker",
      marketHashName: "Sticker | titov",
    };
    const doc = buildInventoryExportDocument([stickerItem], meta);
    expect(doc.items[0]?.stickers).toEqual([]);
  });

  it("emits CSV with a UTF-8 BOM and escaped quotes", () => {
    const csv = inventoryToCsv([item], meta);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("market_hash_name");
    expect(csv).toContain("AK-47 | Redline (Field-Tested)");
    expect(csv).toContain("#1 titov 10%");
  });

  it("emits pretty JSON and a safe filename", () => {
    const json = inventoryToJson([item], meta);
    expect(JSON.parse(json).itemCount).toBe(1);
    expect(inventoryExportFilename(meta, "csv")).toMatch(
      /^cs2-inventory-gaben-20\d{2}-\d{2}-\d{2}\.csv$/,
    );
    expect(
      inventoryExportFilename({ ...meta, filtered: true, personaName: null }, "json"),
    ).toMatch(/filtered\.json$/);
  });

  it("formats export floats without trailing zeros", () => {
    expect(formatExportFloat(null)).toBe("");
    expect(formatExportFloat(0.25)).toBe("0.25");
  });
});
