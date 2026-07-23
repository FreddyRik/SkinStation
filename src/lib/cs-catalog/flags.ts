import type { CatalogKind } from "@/lib/cs-catalog/types";

export const KNIFE_CATEGORY_ID = "sfui_invpanel_filter_melee";
export const GLOVE_CATEGORY_ID = "sfui_invpanel_filter_gloves";

export function isKnifeCategory(
  categoryId: string | null | undefined,
): boolean {
  return categoryId === KNIFE_CATEGORY_ID;
}

export function isGloveCategory(
  categoryId: string | null | undefined,
): boolean {
  return categoryId === GLOVE_CATEGORY_ID;
}

/** Knife ★ badge — melee category only (not gloves). */
export function isKnifeSkin(input: {
  kind?: CatalogKind | null;
  weaponCategoryId?: string | null;
  categoryId?: string | null;
}): boolean {
  if (input.kind != null && input.kind !== "skin") return false;
  return isKnifeCategory(input.weaponCategoryId ?? input.categoryId);
}

export function isGloveSkin(input: {
  kind?: CatalogKind | null;
  weaponCategoryId?: string | null;
  categoryId?: string | null;
}): boolean {
  if (input.kind != null && input.kind !== "skin") return false;
  return isGloveCategory(input.weaponCategoryId ?? input.categoryId);
}

/** ByMykel puts Zeus under Equipment; we treat it as a pistol everywhere. */
export function isZeusWeapon(weaponName: string | null | undefined): boolean {
  if (!weaponName) return false;
  const n = weaponName.trim().toLowerCase();
  return n === "zeus x27" || n.startsWith("zeus");
}

/** Pistols category id used by ByMykel / CS inventory filters. */
export const PISTOLS_CATEGORY_ID = "csgo_inventory_weapon_category_pistols";

/**
 * Effective weapon category for nav + display.
 * Zeus → Pistols; otherwise the upstream category name.
 */
export function effectiveWeaponCategory(
  weaponCategory: string | null | undefined,
  weaponName: string | null | undefined,
): string | null {
  if (isZeusWeapon(weaponName)) return "Pistols";
  return weaponCategory ?? null;
}

export function effectiveWeaponCategoryId(
  weaponCategoryId: string | null | undefined,
  weaponName: string | null | undefined,
): string | null {
  if (isZeusWeapon(weaponName)) return PISTOLS_CATEGORY_ID;
  return weaponCategoryId ?? null;
}
