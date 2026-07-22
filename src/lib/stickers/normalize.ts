/** Normalize sticker display / market names coming from Steam HTML or Steamwebapi. */

export function stripStickerPrefix(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .replace(/^Sticker\s*:\s*/i, "")
    .replace(/^Sticker\s*\|\s*/i, "")
    .trim();
}

/** Canonical market hash name used for price lookups. */
export function toStickerMarketHashName(
  name: string | null | undefined,
): string | null {
  const cleaned = stripStickerPrefix(name);
  if (!cleaned) return null;
  return `Sticker | ${cleaned}`;
}

/** Wear fraction 0..1 → scratch percentage label (0% = pristine). */
export function formatStickerWear(wear: number | null | undefined): string | null {
  if (wear == null || !Number.isFinite(wear)) return null;
  const scratch = Math.max(0, Math.min(100, Math.round(wear * 100)));
  if (scratch === 0) return "0% worn";
  return `${scratch}% worn`;
}
