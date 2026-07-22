/** Knife / glove detection shared by inventory filters and sticker eligibility. */

/** Fallback name markers — prefer type tag or ★ prefix when available. */
const KNIFE_OR_GLOVE_NAME_MARKERS = [
  " gloves",
  "hand wraps",
  "knife",
  "bayonet",
  "karambit",
  "butterfly knife",
  "shadow daggers",
  "talon knife",
  "ursus knife",
  "navaja knife",
  "stiletto knife",
  "skeleton knife",
  "nomad knife",
  "survival knife",
  "paracord knife",
  "classic knife",
  "kukri knife",
  "gut knife",
  "flip knife",
  "huntsman knife",
  "falchion knife",
  "bowie knife",
  "m9 bayonet",
] as const;

function isNonWeaponConsumableType(type: string): boolean {
  return (
    type.includes("sticker") ||
    type.includes("graffiti") ||
    type.includes("patch") ||
    type.includes("container") ||
    type.includes("music kit") ||
    type.includes("agent") ||
    type.includes("collectible") ||
    type.includes("tool") ||
    type.includes("pass") ||
    type.includes("gift") ||
    type.includes("tag") ||
    type.includes("key") ||
    type.includes("case")
  );
}

function isNonWeaponConsumableName(name: string): boolean {
  return (
    name.startsWith("sticker |") ||
    name.startsWith("graffiti |") ||
    name.startsWith("sealed graffiti |") ||
    name.startsWith("patch |") ||
    name.startsWith("music kit |") ||
    name.includes("capsule") ||
    name.includes("case key") ||
    name.endsWith(" case")
  );
}

export function isKnifeOrGlove(
  type: string | null | undefined,
  marketHashName?: string | null,
): boolean {
  const t = (type ?? "").toLowerCase();
  if (t && isNonWeaponConsumableType(t)) {
    return false;
  }
  if (t.includes("knife") || t.includes("glove")) {
    return true;
  }

  const n = (marketHashName ?? "").toLowerCase();
  if (!n || isNonWeaponConsumableName(n)) {
    return false;
  }

  // CS2 knives and gloves use the ★ prefix in market_hash_name.
  if (n.startsWith("★") || n.startsWith("\u2605")) {
    return true;
  }

  return KNIFE_OR_GLOVE_NAME_MARKERS.some((marker) => n.includes(marker));
}

export function isStatTrak(marketHashName: string): boolean {
  return /stattrak/i.test(marketHashName);
}

export function isSouvenir(marketHashName: string): boolean {
  // Prefer actual Souvenir skins, not "Souvenir Package" containers.
  const n = marketHashName.toLowerCase();
  if (n.includes("package") || n.startsWith("sticker |")) {
    return false;
  }
  return /souvenir/i.test(marketHashName);
}

export function hasStickers(
  stickers: unknown[] | null | undefined,
): boolean {
  return Array.isArray(stickers) && stickers.length > 0;
}
