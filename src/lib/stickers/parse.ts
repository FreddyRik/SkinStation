import type { InventorySticker } from "@/types/inventory";
import { isRecord, readNumber, readString } from "@/types/json";

/** Safely parse sticker JSON stored on inventory items. */
export function parseStickersJson(
  raw: string | null | undefined,
): InventorySticker[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry): InventorySticker => {
      if (!isRecord(entry)) return {};
      const buffPrice =
        typeof entry.buffPrice === "number"
          ? entry.buffPrice
          : typeof entry.skinportPrice === "number"
            ? entry.skinportPrice
            : entry.buffPrice === null || entry.skinportPrice === null
              ? null
              : undefined;
      const iconRaw = entry.iconUrl;
      return {
        slot: readNumber(entry.slot),
        name: readString(entry.name),
        wear: readNumber(entry.wear),
        iconUrl:
          typeof iconRaw === "string"
            ? iconRaw
            : iconRaw === null
              ? null
              : undefined,
        steamPrice:
          typeof entry.steamPrice === "number"
            ? entry.steamPrice
            : entry.steamPrice === null
              ? null
              : undefined,
        buffPrice,
      };
    });
  } catch {
    return [];
  }
}
