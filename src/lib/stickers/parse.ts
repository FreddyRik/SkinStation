/** Safely parse sticker JSON stored on inventory items. */
export function parseStickersJson(raw: string | null | undefined): Array<{
  slot?: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
  steamPrice?: number | null;
  buffPrice?: number | null;
}> {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      if (!entry || typeof entry !== "object") return {};
      const s = entry as Record<string, unknown>;
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
