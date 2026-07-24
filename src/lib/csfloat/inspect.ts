import { decodeLink } from "@csfloat/cs2-inspect-serializer";
import { InspectLink } from "@vlydev/cs2-masked-inspect";
import {
  extractInspectPayload,
  isHybridInspectPayload,
  isLocallyDecodableInspectLink,
  isMaskedInspectPayload,
} from "@/lib/inspect/links";

export type DecodedSticker = {
  slot: number;
  stickerId: number;
  name?: string;
  wear?: number;
  iconUrl?: string | null;
};

export type InspectResult = {
  floatValue: number | null;
  paintSeed: number | null;
  paintIndex: number | null;
  stickers: DecodedSticker[];
  customName: string | null;
  source: "local" | "description";
};

export {
  extractInspectPayload,
  isHybridInspectPayload,
  isLocallyDecodableInspectLink,
  isMaskedInspectPayload,
};

/** @deprecated Prefer isLocallyDecodableInspectLink — classic S/A/D is not local. */
export function isUsableInspectLink(inspectLink: string | null): boolean {
  return isLocallyDecodableInspectLink(inspectLink);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * `@vlydev/cs2-masked-inspect` defaults missing paintSeed to 0. Treat a lone
 * zero seed with no wear/paint as unset (stickers, tools, etc.).
 */
function normalizePaintSeed(
  paintSeed: number | null,
  paintWear: number | null,
  paintIndex: number | null,
): number | null {
  if (paintSeed == null) return null;
  if (
    paintSeed === 0 &&
    paintWear == null &&
    (paintIndex == null || paintIndex === 0)
  ) {
    return null;
  }
  return Math.trunc(paintSeed);
}

function decodeWithVlydev(inspectLink: string): InspectResult | null {
  try {
    const item = InspectLink.deserialize(inspectLink);
    const floatValue = finiteOrNull(item.paintWear);
    const paintIndex = finiteOrNull(item.paintIndex);
    const paintSeed = normalizePaintSeed(
      finiteOrNull(item.paintSeed),
      floatValue,
      paintIndex,
    );

    return {
      floatValue,
      paintSeed,
      paintIndex: paintIndex != null ? Math.trunc(paintIndex) : null,
      stickers: (item.stickers ?? []).map((s, idx) => ({
        slot: finiteOrNull(s.slot) ?? idx,
        stickerId: finiteOrNull(s.stickerId) ?? 0,
        wear: finiteOrNull(s.wear) ?? undefined,
      })),
      customName: item.customName?.trim() ? item.customName : null,
      source: "local",
    };
  } catch {
    return null;
  }
}

function decodeWithCsfloat(inspectLink: string): InspectResult | null {
  try {
    const decoded = decodeLink(inspectLink) as {
      paintwear?: number;
      floatvalue?: number;
      paintseed?: number;
      paintindex?: number;
      stickers?: Array<{
        slot?: number;
        stickerId?: number;
        stickerid?: number;
        wear?: number;
        name?: string;
      }>;
      customname?: string | null;
    };

    const floatValue =
      finiteOrNull(decoded.paintwear) ?? finiteOrNull(decoded.floatvalue);
    const paintIndex = finiteOrNull(decoded.paintindex);
    const paintSeed = normalizePaintSeed(
      finiteOrNull(decoded.paintseed),
      floatValue,
      paintIndex,
    );

    return {
      floatValue,
      paintSeed,
      paintIndex: paintIndex != null ? Math.trunc(paintIndex) : null,
      stickers: (decoded.stickers ?? []).map((s, idx) => ({
        slot: s.slot ?? idx,
        stickerId: s.stickerId ?? s.stickerid ?? 0,
        wear: s.wear,
        name: s.name,
      })),
      customName: decoded.customname ?? null,
      source: "local",
    };
  } catch {
    return null;
  }
}

/**
 * Decode float / pattern / stickers locally from a masked or hybrid CS2
 * inspect link. Prefers `@vlydev/cs2-masked-inspect` (hybrid + XOR native
 * links); falls back to `@csfloat/cs2-inspect-serializer`.
 */
export function decodeInspectLocally(
  inspectLink: string,
): InspectResult | null {
  if (!isLocallyDecodableInspectLink(inspectLink)) return null;
  return decodeWithVlydev(inspectLink) ?? decodeWithCsfloat(inspectLink);
}

/**
 * Parse sticker names from Steam inventory description HTML.
 * Works even when inspect links are broken (%propid placeholders).
 */
export function parseStickersFromDescriptions(
  descriptions?: Array<{ type?: string; value?: string; name?: string }>,
): DecodedSticker[] {
  if (!descriptions?.length) return [];

  const found: DecodedSticker[] = [];

  for (const block of descriptions) {
    const value = block.value ?? "";
    if (!value) continue;

    const before = found.length;

    // title="Sticker: Name" — allow the same sticker name on multiple slots
    const titleRe = /title\s*=\s*["']Sticker:\s*([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = titleRe.exec(value)) !== null) {
      const name = m[1].trim();
      if (!name) continue;
      found.push({ slot: found.length, stickerId: 0, name });
    }

    // Plain text only when this block had no title stickers
    if (found.length === before) {
      const plain = value.match(/Sticker:\s*([^<]+)/i);
      if (plain?.[1] && !/title\s*=/i.test(value)) {
        const parts = plain[1]
          .split(/,\s*/)
          .map((p) => p.trim())
          .filter(Boolean);
        for (const name of parts) {
          found.push({ slot: found.length, stickerId: 0, name });
        }
      }
    }
  }

  return found;
}

export function isInspectableItem(item: {
  inspectLink: string | null;
  type: string | null;
  marketHashName: string;
}): boolean {
  if (!item.inspectLink) return false;
  const type = (item.type ?? "").toLowerCase();
  if (
    type.includes("container") ||
    type.includes("graffiti") ||
    type.includes("music kit") ||
    type.includes("pass") ||
    type.includes("tool")
  ) {
    return false;
  }
  if (item.marketHashName.startsWith("Sticker |")) return false;
  if (item.marketHashName.startsWith("Patch |")) return false;
  if (item.marketHashName.startsWith("Sealed Graffiti")) return false;
  return true;
}

/** Enrich items using local decode + description sticker fallback (no remote float API). */
export function enrichItemsLocally(
  items: Array<{
    assetId: string;
    inspectLink: string | null;
    stickersFromDescription?: DecodedSticker[];
  }>,
): Map<string, InspectResult> {
  const results = new Map<string, InspectResult>();

  for (const item of items) {
    const local = item.inspectLink
      ? decodeInspectLocally(item.inspectLink)
      : null;

    if (local) {
      // Merge description sticker names when decode only has IDs
      if (
        (!local.stickers.length || local.stickers.every((s) => !s.name)) &&
        item.stickersFromDescription?.length
      ) {
        local.stickers = item.stickersFromDescription;
      }
      results.set(item.assetId, local);
      continue;
    }

    if (item.stickersFromDescription?.length) {
      results.set(item.assetId, {
        floatValue: null,
        paintSeed: null,
        paintIndex: null,
        stickers: item.stickersFromDescription,
        customName: null,
        source: "description",
      });
    }
  }

  return results;
}
