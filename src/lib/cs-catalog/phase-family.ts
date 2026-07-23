import type { SlimCatalogItem } from "@/lib/cs-catalog/types";
import { resolveSkinPhase } from "@/lib/cs-catalog/phase";

/** Preferred representative when collapsing a phase family for browse cards. */
const REPRESENTATIVE_ORDER = [
  "Phase 1",
  "Phase 2",
  "Phase 4",
  "Phase 3",
  "Sapphire",
  "Ruby",
  "Emerald",
  "Black Pearl",
] as const;

/** Display order in the detail Phases grid. */
const DISPLAY_ORDER = [
  "Ruby",
  "Sapphire",
  "Black Pearl",
  "Emerald",
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Phase 4",
] as const;

export type PhaseSibling = {
  id: string;
  name: string;
  phase: string;
  image: string | null;
  paintIndex: string | null;
};

export type BrowseCatalogItem = SlimCatalogItem & {
  /** Number of phases in this family (1 for non-phased). */
  phaseFamilySize: number;
  /** All phase labels in the family (for search). */
  phaseSearchLabels: string[];
};

function phaseSortIndex(phase: string, order: readonly string[]): number {
  const i = order.findIndex(
    (p) => p.toLowerCase() === phase.trim().toLowerCase(),
  );
  return i >= 0 ? i : order.length + 1;
}

export function sortPhasesForDisplay<T extends { phase: string }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      phaseSortIndex(a.phase, DISPLAY_ORDER) -
        phaseSortIndex(b.phase, DISPLAY_ORDER) ||
      a.phase.localeCompare(b.phase),
  );
}

/** Family key when item has a phase; otherwise null (do not collapse). */
export function phaseFamilyKey(
  item: Pick<SlimCatalogItem, "name" | "phase" | "kind">,
): string | null {
  if (item.kind !== "skin" || !item.phase) return null;
  const name = item.name?.trim();
  return name || null;
}

function pickRepresentative(siblings: SlimCatalogItem[]): SlimCatalogItem {
  const ranked = [...siblings].sort((a, b) => {
    const pa = a.phase ?? "";
    const pb = b.phase ?? "";
    return (
      phaseSortIndex(pa, REPRESENTATIVE_ORDER) -
        phaseSortIndex(pb, REPRESENTATIVE_ORDER) || a.id.localeCompare(b.id)
    );
  });
  return ranked[0]!;
}

/**
 * Collapse skins that share the same name + have phases into one browse row.
 * Non-phased items pass through unchanged. Relative order of first appearance is kept.
 */
export function groupPhasedSkins(
  items: SlimCatalogItem[],
): BrowseCatalogItem[] {
  const families = new Map<string, SlimCatalogItem[]>();

  for (const item of items) {
    const key = phaseFamilyKey(item);
    if (!key) continue;
    const list = families.get(key);
    if (list) list.push(item);
    else families.set(key, [item]);
  }

  const emitted = new Set<string>();
  const collapsed: BrowseCatalogItem[] = [];

  for (const item of items) {
    const key = phaseFamilyKey(item);
    if (!key) {
      collapsed.push({
        ...item,
        phaseFamilySize: 1,
        phaseSearchLabels: [],
      });
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);

    const siblings = families.get(key)!;
    if (siblings.length === 1) {
      const only = siblings[0]!;
      collapsed.push({
        ...only,
        phaseFamilySize: 1,
        phaseSearchLabels: only.phase ? [only.phase] : [],
      });
      continue;
    }

    const rep = pickRepresentative(siblings);
    collapsed.push({
      ...rep,
      // Clear phase on the card so we don't show P1 badge on the family tile.
      phase: null,
      phaseFamilySize: siblings.length,
      phaseSearchLabels: siblings
        .map((s) => s.phase)
        .filter((p): p is string => Boolean(p)),
    });
  }

  return collapsed;
}

type SiblingSource = {
  id: string;
  name: string;
  kind: string;
  phase: string | null;
  image: string | null;
  paintIndex?: string | null;
};

/** Siblings for a phased skin (same catalog name, all with phase). */
export function findPhaseSiblings(
  allSkins: SiblingSource[],
  item: SiblingSource,
): PhaseSibling[] {
  if (!item.phase || item.kind !== "skin") return [];
  const key = item.name.trim();
  if (!key) return [];

  const siblings: PhaseSibling[] = [];
  for (const s of allSkins) {
    if (s.kind !== "skin") continue;
    if (s.name.trim() !== key) continue;
    const phase =
      s.phase ??
      resolveSkinPhase({
        paintIndex: s.paintIndex,
      });
    if (!phase) continue;
    siblings.push({
      id: s.id,
      name: s.name,
      phase,
      image: s.image,
      paintIndex: s.paintIndex ?? null,
    });
  }

  if (siblings.length <= 1) return siblings;
  return sortPhasesForDisplay(siblings);
}

type ContainsRow = {
  id: string;
  name: string;
  image?: string | null;
  rarity?: { id: string; name: string; color: string } | null;
  paint_index?: string | null;
  priceMinUsd?: number | null;
  priceMaxUsd?: number | null;
};

/**
 * Collapse contains rows that resolve to the same base name + phased finish.
 * Uses paint_index → phase; groups by name when multiple phased variants exist.
 * Relative order of first appearance is kept.
 */
export function collapsePhasedContains<T extends ContainsRow>(items: T[]): T[] {
  const byName = new Map<string, T[]>();

  for (const item of items) {
    const phase = resolveSkinPhase({ paintIndex: item.paint_index });
    if (!phase) continue;
    const key = item.name.trim();
    const list = byName.get(key);
    if (list) list.push(item);
    else byName.set(key, [item]);
  }

  const emitted = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    const phase = resolveSkinPhase({ paintIndex: item.paint_index });
    if (!phase) {
      out.push(item);
      continue;
    }
    const key = item.name.trim();
    if (emitted.has(key)) continue;
    emitted.add(key);

    const group = byName.get(key)!;
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }
    const ranked = [...group].sort((a, b) => {
      const pa = resolveSkinPhase({ paintIndex: a.paint_index }) ?? "";
      const pb = resolveSkinPhase({ paintIndex: b.paint_index }) ?? "";
      return (
        phaseSortIndex(pa, REPRESENTATIVE_ORDER) -
          phaseSortIndex(pb, REPRESENTATIVE_ORDER) ||
        a.id.localeCompare(b.id)
      );
    });
    out.push(ranked[0]!);
  }

  return out;
}
