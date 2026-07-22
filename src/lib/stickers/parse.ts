/** Safely parse sticker JSON stored on inventory items. */
export function parseStickersJson(raw: string | null | undefined): Array<{
  slot?: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
  steamPrice?: number | null;
  skinportPrice?: number | null;
}> {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
