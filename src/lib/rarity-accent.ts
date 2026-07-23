/**
 * Resolve CS rarity display names / hex colors for subtle UI accents.
 */

const RARITY_NAME_COLORS: Record<string, string> = {
  "consumer grade": "#b0c3d9",
  consumer: "#b0c3d9",
  "industrial grade": "#5e98d9",
  industrial: "#5e98d9",
  "mil-spec grade": "#4b69ff",
  "mil-spec": "#4b69ff",
  milspec: "#4b69ff",
  restricted: "#8847ff",
  classified: "#d32ce6",
  covert: "#eb4b4b",
  extraordinary: "#e4ae39",
  contraband: "#e4ae39",
  distinguished: "#4b69ff",
  exceptional: "#8847ff",
  superior: "#d32ce6",
  master: "#eb4b4b",
  high: "#5e98d9",
  remarkable: "#4b69ff",
  exotic: "#8847ff",
};

function parseHexColor(raw: string): { r: number; g: number; b: number } | null {
  const hex = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: Number.parseInt(hex[0]! + hex[0]!, 16),
      g: Number.parseInt(hex[1]! + hex[1]!, 16),
      b: Number.parseInt(hex[2]! + hex[2]!, 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

/** Resolve a rarity name or #hex to a canonical #rrggbb color. */
export function resolveRarityColor(
  rarity: string | null | undefined,
): string | null {
  if (!rarity?.trim()) return null;
  const trimmed = rarity.trim();
  if (parseHexColor(trimmed)) {
    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  }
  const key = trimmed.toLowerCase();
  if (RARITY_NAME_COLORS[key]) return RARITY_NAME_COLORS[key]!;
  for (const [name, color] of Object.entries(RARITY_NAME_COLORS)) {
    if (key.includes(name)) return color;
  }
  return null;
}
