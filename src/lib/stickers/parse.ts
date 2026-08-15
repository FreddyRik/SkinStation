import type { InventoryStickerView } from "@/types/inventory";
import { jsonObject } from "@/types/json";

/** Safely parse sticker JSON stored on inventory items. */

export function parseStickersJson(
  raw: string | null | undefined,
): InventoryStickerView[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      const s = jsonObject(entry);
      if (!s) return {};
      const buffPrice =
        typeof s.buffPrice === "number"
          ? s.buffPrice
          : typeof s.skinportPrice === "number"
            ? s.skinportPrice
            : s.buffPrice === null || s.skinportPrice === null
              ? null
              : undefined;
      return {
        slot: typeof s.slot === "number" ? s.slot : undefined,
        name: typeof s.name === "string" ? s.name : undefined,
        wear: typeof s.wear === "number" ? s.wear : undefined,
        iconUrl:
          typeof s.iconUrl === "string"
            ? s.iconUrl
            : s.iconUrl === null
              ? null
              : undefined,
        steamPrice:
          typeof s.steamPrice === "number"
            ? s.steamPrice
            : s.steamPrice === null
              ? null
              : undefined,
        buffPrice,
      };
    });
  } catch {
    return [];
  }
}
