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
