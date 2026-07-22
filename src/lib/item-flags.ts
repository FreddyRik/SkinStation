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

const WEAPON_TYPE_MARKERS = [
  "rifle",
  "pistol",
  "smg",
  "shotgun",
  "sniper",
  "machinegun",
  "knife",
  "glove",
] as const;

const WEAR_IN_NAME_RE =
  /\((factory new|minimal wear|field-tested|well-worn|battle-scarred)\)/i;

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
    type.includes("case") ||
    type.includes("equipment")
  );
}

function isNonWeaponConsumableName(name: string): boolean {
  return (
    name.startsWith("sticker |") ||
    name.startsWith("stattrak™ sticker |") ||
    name.startsWith("stattrak sticker |") ||
    name.startsWith("graffiti |") ||
    name.startsWith("sealed graffiti |") ||
    name.startsWith("sealed graffiti") ||
    name.startsWith("patch |") ||
    name.startsWith("music kit |") ||
    name.includes("capsule") ||
    name.includes("case key") ||
    name.endsWith(" case")
  );
}

/** Agents, stickers, music kits, cases, etc. — never float / applied stickers. */
export function isNonWeaponConsumable(
  type: string | null | undefined,
  marketHashName?: string | null,
): boolean {
  const t = (type ?? "").toLowerCase();
  if (t && isNonWeaponConsumableType(t)) return true;
  const n = (marketHashName ?? "").toLowerCase();
  return Boolean(n && isNonWeaponConsumableName(n));
}

/**
 * Guns, knives, and gloves can have float (and pattern).
 * Show "Float —" when supported but value missing; hide the line entirely otherwise.
 */
export function itemSupportsFloat(
  type: string | null | undefined,
  marketHashName?: string | null,
): boolean {
  if (isNonWeaponConsumable(type, marketHashName)) return false;

  const t = (type ?? "").toLowerCase();
  if (WEAPON_TYPE_MARKERS.some((marker) => t.includes(marker))) {
    return true;
  }

  if (isKnifeOrGlove(type, marketHashName)) return true;

  const n = (marketHashName ?? "").toLowerCase();
  if (!n) return false;

  // Skins usually include a wear suffix; agents also use "|" so require wear or ★.
  if (WEAR_IN_NAME_RE.test(n)) return true;
  if (n.startsWith("★") || n.startsWith("\u2605")) return true;

  // Typed non-consumable with a skin-style name (Weapon | Finish).
  if (t && n.includes("|")) return true;

  return false;
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

/**
 * Items Steam never lists on the Community Market (or that we treat as such
 * when the persisted `marketable` flag is still the pre-sync default).
 * Prefer the real Steam flag when present; these heuristics cover common gaps.
 */
export function isKnownUnlistableItem(
  type?: string | null,
  marketHashName?: string | null,
  name?: string | null,
): boolean {
  const n = (marketHashName || name || "").toLowerCase().trim();
  const t = (type || "").toLowerCase();

  // All Collectibles (medals, pins, operation coins, trophies, etc.).
  if (t.includes("collectible")) {
    return true;
  }

  if (
    n.includes("service medal") ||
    n.includes("loyalty badge") ||
    n.includes("veteran coin") ||
    /\b\d+\s*year\s+veteran\b/i.test(n) ||
    n.includes("challenge coin") ||
    /\boperation\b.*\bcoin\b/i.test(n) ||
    n.startsWith("pin |") ||
    n.endsWith(" pin")
  ) {
    return true;
  }

  // Stock / default C4 — not a skinned market listing.
  if (
    n === "c4 explosive" ||
    n === "c4" ||
    (t.includes("c4") && !n.includes("|"))
  ) {
    return true;
  }

  // Used graffiti (opened, uses remaining) — sealed graffiti stays listable.
  // Steam names: "Graffiti | …" vs "Sealed Graffiti | …".
  const isSealedGraffiti = n.startsWith("sealed graffiti");
  if (!isSealedGraffiti) {
    if (
      n.startsWith("graffiti |") ||
      /\buses?\s+remaining\b/i.test(n) ||
      (t.includes("graffiti") && Boolean(n))
    ) {
      return true;
    }
  }

  // Free / default music kit (no "Music Kit | Artist" market listing name).
  const isMusicKit =
    t.includes("music kit") ||
    n === "music kit" ||
    n.startsWith("music kit |") ||
    n.startsWith("stattrak™ music kit |") ||
    n.startsWith("stattrak music kit |");
  if (isMusicKit) {
    if (n.includes("default")) return true;
    // Stock Valve kit included with CS:GO/CS2 — not a real marketplace listing.
    if (
      n === "music kit | valve, cs:go" ||
      n === "music kit | valve, cs2" ||
      n === "music kit | valve" ||
      n.includes("valve, cs:go") ||
      n.includes("valve, cs2")
    ) {
      return true;
    }
    // Bare "Music Kit" with no artist suffix — not a store listing.
    if (!n.includes("|")) return true;
  }

  return false;
}

/** Whether the item can be listed/sold on the Steam Community Market. */
export function itemCanListOnMarket(item: {
  marketable?: boolean | null;
  type?: string | null;
  marketHashName?: string | null;
  name?: string | null;
}): boolean {
  if (isKnownUnlistableItem(item.type, item.marketHashName, item.name)) {
    return false;
  }
  if (item.marketable === false) return false;
  return true;
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

/**
 * Only weapon skins can have stickers applied.
 * Knives, gloves, agents, stickers themselves, music kits, cases, etc. cannot.
 */
export function itemSupportsStickers(
  type: string | null | undefined,
  marketHashName?: string | null,
): boolean {
  if (isKnifeOrGlove(type, marketHashName)) {
    return false;
  }
  if (isNonWeaponConsumable(type, marketHashName)) {
    return false;
  }
  return true;
}
