/** Standard CS exterior float bands. */

export type WearKey = "FN" | "MW" | "FT" | "WW" | "BS";

export type WearBand = {
  key: WearKey;
  name: string;
  abbr: string;
  min: number;
  max: number;
  /** Accent used on wear chips / float bar segments. */
  color: string;
};

export const WEAR_BANDS: WearBand[] = [
  {
    key: "FN",
    name: "Factory New",
    abbr: "FN",
    min: 0,
    max: 0.07,
    color: "#4ade80",
  },
  {
    key: "MW",
    name: "Minimal Wear",
    abbr: "MW",
    min: 0.07,
    max: 0.15,
    color: "#a3e635",
  },
  {
    key: "FT",
    name: "Field-Tested",
    abbr: "FT",
    min: 0.15,
    max: 0.38,
    color: "#facc15",
  },
  {
    key: "WW",
    name: "Well-Worn",
    abbr: "WW",
    min: 0.38,
    max: 0.45,
    color: "#fb923c",
  },
  {
    key: "BS",
    name: "Battle-Scarred",
    abbr: "BS",
    min: 0.45,
    max: 1,
    color: "#f87171",
  },
];

export function wearBandForName(name: string): WearBand | null {
  const n = name.trim().toLowerCase();
  return WEAR_BANDS.find((w) => w.name.toLowerCase() === n) ?? null;
}

/** Overlap of a wear band with a skin's possible float range. */
export function wearRangeForSkin(
  band: WearBand,
  skinMin: number | null,
  skinMax: number | null,
): { min: number; max: number } | null {
  const lo = skinMin ?? 0;
  const hi = skinMax ?? 1;
  const min = Math.max(band.min, lo);
  const max = Math.min(band.max, hi);
  if (min >= max - 1e-9) return null;
  return { min, max };
}

export type SkinVariant = "normal" | "stattrak" | "souvenir";

/** Build Steam market hash for a skin wear + variant. */
export function skinMarketHashName(
  baseName: string,
  wearName: string,
  variant: SkinVariant,
): string {
  const wearSuffix = ` (${wearName})`;
  if (variant === "normal") {
    return `${baseName}${wearSuffix}`;
  }
  if (variant === "souvenir") {
    return `Souvenir ${baseName}${wearSuffix}`;
  }
  // StatTrak — knives/gloves keep ★ before StatTrak™
  if (baseName.startsWith("★") || baseName.startsWith("\u2605")) {
    const rest = baseName.replace(/^[★\u2605]\s*/, "");
    return `★ StatTrak™ ${rest}${wearSuffix}`;
  }
  return `StatTrak™ ${baseName}${wearSuffix}`;
}

/** Finish style from ByMykel pattern id prefixes (gs_, cu_, …). */
export function finishStyleFromPatternId(
  patternId: string | null | undefined,
): string | null {
  if (!patternId) return null;
  const id = patternId.toLowerCase();
  if (id.startsWith("gs_")) return "Gunsmith";
  if (id.startsWith("cu_")) return "Custom Paint Job";
  if (id.startsWith("hy_")) return "Hydrographic";
  if (id.startsWith("aa_")) return "Anodized Multicolored";
  if (id.startsWith("am_")) return "Anodized Multicolored";
  if (id.startsWith("aq_")) return "Patina";
  if (id.startsWith("so_")) return "Solid Color";
  if (id.startsWith("sp_")) return "Spray Paint";
  return null;
}

export function formatFloatShort(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
