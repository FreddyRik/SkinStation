/**
 * Doppler / Gamma Doppler phase labels.
 * ByMykel skins.json usually includes `phase`; paint-index map is a fallback
 * (shared across knives — same indices for classic Doppler finishes).
 */

const PAINT_INDEX_PHASE: Record<string, string> = {
  // Classic Doppler
  "415": "Ruby",
  "416": "Sapphire",
  "417": "Black Pearl",
  "418": "Phase 1",
  "419": "Phase 2",
  "420": "Phase 3",
  "421": "Phase 4",
  // Gamma Doppler
  "568": "Emerald",
  "569": "Phase 1",
  "570": "Phase 2",
  "571": "Phase 3",
  "572": "Phase 4",
  // Shadow Daggers / other Doppler blocks (CSFloat map)
  "617": "Black Pearl",
  "618": "Phase 2",
  "619": "Sapphire",
  "852": "Phase 1",
  "853": "Phase 2",
  "854": "Phase 3",
  "855": "Phase 4",
  // Glock-18 Gamma Doppler
  "1119": "Emerald",
  "1120": "Phase 1",
  "1121": "Phase 2",
  "1122": "Phase 3",
  "1123": "Phase 4",
};

/** Short label for cards: P1–P4 or gem name. */
export function formatPhaseShort(phase: string | null | undefined): string | null {
  if (!phase) return null;
  const p = phase.trim();
  const m = /^phase\s*([1-4])$/i.exec(p);
  if (m) return `P${m[1]}`;
  return p;
}

/** Resolve display phase from ByMykel field, paint index, or pattern id. */
export function resolveSkinPhase(input: {
  phase?: string | null;
  paintIndex?: string | null;
  patternId?: string | null;
}): string | null {
  const raw = input.phase?.trim();
  if (raw) return normalizePhaseLabel(raw);

  const fromPaint = paintIndexPhase(input.paintIndex);
  if (fromPaint) return fromPaint;

  return phaseFromPatternId(input.patternId);
}

function normalizePhaseLabel(raw: string): string {
  const t = raw.trim();
  const m = /^phase\s*([1-4])$/i.exec(t);
  if (m) return `Phase ${m[1]}`;
  const lower = t.toLowerCase();
  if (lower === "ruby") return "Ruby";
  if (lower === "sapphire") return "Sapphire";
  if (lower === "emerald") return "Emerald";
  if (lower === "black pearl" || lower === "blackpearl") return "Black Pearl";
  return t;
}

function paintIndexPhase(paintIndex: string | null | undefined): string | null {
  if (paintIndex == null || paintIndex === "") return null;
  return PAINT_INDEX_PHASE[String(paintIndex).trim()] ?? null;
}

function phaseFromPatternId(patternId: string | null | undefined): string | null {
  if (!patternId) return null;
  const id = patternId.toLowerCase();
  if (id.includes("ruby")) return "Ruby";
  if (id.includes("sapphire")) return "Sapphire";
  if (id.includes("emerald")) return "Emerald";
  if (id.includes("blackpearl") || id.includes("black_pearl")) return "Black Pearl";
  const m = /phase[_-]?([1-4])/.exec(id);
  if (m) return `Phase ${m[1]}`;
  return null;
}

/** Accent color for phase chips (gems get distinct hues). */
export function phaseAccent(phase: string | null | undefined): string {
  const p = (phase ?? "").toLowerCase();
  if (p.includes("ruby")) return "#ef4444";
  if (p.includes("sapphire")) return "#3b82f6";
  if (p.includes("emerald")) return "#22c55e";
  if (p.includes("black pearl") || p.includes("blackpearl")) return "#a78bfa";
  if (p.includes("phase 1") || p === "p1") return "#c4b5fd";
  if (p.includes("phase 2") || p === "p2") return "#f9a8d4";
  if (p.includes("phase 3") || p === "p3") return "#67e8f9";
  if (p.includes("phase 4") || p === "p4") return "#fda4af";
  return "var(--accent)";
}
