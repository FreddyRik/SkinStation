/** Classic FACEIT level badge colors (1–10). */
export function faceitLevelColor(level: number): string {
  const colors: Record<number, string> = {
    1: "#eeeeee",
    2: "#1ce400",
    3: "#1ce400",
    4: "#ffc800",
    5: "#ffc800",
    6: "#ffc800",
    7: "#ff6300",
    8: "#ff6300",
    9: "#ff6300",
    10: "#fe1f00",
  };
  return colors[level] ?? "#8fa399";
}

export function faceitLevelTextColor(level: number): string {
  return level <= 1 ? "#1a1a1a" : "#0c0c0c";
}

/** Local FACEIT skill-level icon (vendored from public FACEIT-style assets). */
export function faceitLevelImageSrc(level: number): string | null {
  if (!Number.isInteger(level) || level < 1 || level > 10) return null;
  return `/faceit/level-${level}.png`;
}
