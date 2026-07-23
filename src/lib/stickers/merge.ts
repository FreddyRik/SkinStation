import { stripStickerPrefix } from "@/lib/stickers/normalize";

/** Loose sticker shape from Steam descriptions, Steamwebapi, or local inspect. */
export type StickerSource = {
  slot?: number;
  stickerId?: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
  image?: string | null;
  market_hash_name?: string;
};

export type MergedSticker = {
  slot: number;
  stickerId: number;
  name: string | undefined;
  wear: number | undefined;
  iconUrl: string | null;
};

function stickerNameOf(s: StickerSource): string | undefined {
  if (s.name?.trim()) return stripStickerPrefix(s.name);
  if (s.market_hash_name?.trim()) return stripStickerPrefix(s.market_hash_name);
  return undefined;
}

function stickerIconOf(s: StickerSource): string | null {
  return (s.iconUrl || s.image || null)?.trim() || null;
}

/**
 * Merge sticker lists by slot. Earlier sources win for each field when present.
 * Typical order: description HTML → local inspect → remote inspect → optional Steamwebapi.
 */
export function mergeStickersBySlot(
  ...sources: Array<StickerSource[] | null | undefined>
): MergedSticker[] {
  const bySlot = new Map<number, MergedSticker>();

  for (const source of sources) {
    if (!source?.length) continue;
    for (const [idx, raw] of source.entries()) {
      const slot = raw.slot ?? idx;
      const prev = bySlot.get(slot);
      const name = stickerNameOf(raw);
      const iconUrl = stickerIconOf(raw);
      if (!prev) {
        bySlot.set(slot, {
          slot,
          stickerId: raw.stickerId ?? 0,
          name,
          wear: raw.wear,
          iconUrl,
        });
        continue;
      }
      bySlot.set(slot, {
        slot,
        stickerId: prev.stickerId || raw.stickerId || 0,
        name: prev.name || name,
        wear: prev.wear ?? raw.wear,
        iconUrl: prev.iconUrl || iconUrl,
      });
    }
  }

  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}
