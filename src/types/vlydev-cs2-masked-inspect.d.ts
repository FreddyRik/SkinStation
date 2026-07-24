declare module "@vlydev/cs2-masked-inspect" {
  export class Sticker {
    slot: number;
    stickerId: number;
    wear: number | null;
    scale: number | null;
    rotation: number | null;
    tintId: number;
    offsetX: number | null;
    offsetY: number | null;
    offsetZ: number | null;
    pattern: number;
    highlightReel: number | null;
    paintKit: number | null;
  }

  export class ItemPreviewData {
    accountId: number;
    itemId: number;
    defIndex: number;
    paintIndex: number;
    rarity: number;
    quality: number;
    paintWear: number | null;
    paintSeed: number;
    killEaterScoreType: number;
    killEaterValue: number;
    customName: string;
    stickers: Sticker[];
    inventory: number;
    origin: number;
    questId: number;
    dropReason: number;
    musicIndex: number;
    entIndex: number;
    petIndex: number;
    keychains: Sticker[];
  }

  export class InspectLink {
    static serialize(data: ItemPreviewData): string;
    static deserialize(input: string): ItemPreviewData;
    /** True when the link has an offline-decodable protobuf payload (pure hex or hybrid). */
    static isMasked(link: string): boolean;
    /** True for classic S/A/D with a decimal D (requires Game Coordinator). */
    static isClassic(link: string): boolean;
  }

  export class MalformedInspectLinkError extends Error {}

  export function toGenCode(item: ItemPreviewData, prefix?: string): string;
  export function generate(
    defIndex: number,
    paintIndex: number,
    paintSeed: number,
    paintWear: number,
  ): string;
  export function parseGenCode(code: string): ItemPreviewData;
  export function genCodeFromLink(link: string, prefix?: string): string;
  export const INSPECT_BASE: string;
}
