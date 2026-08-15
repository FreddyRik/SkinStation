import type { CSSProperties } from "react";

/** Single knife marker, shared by the browse grid and the contains grid. */
export function KnifeBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-[var(--accent)]"
      title="Knife"
      aria-label="Knife"
    >
      ★
    </span>
  );
}

/**
 * Tinted rarity chip. Reads as part of the HUD rather than a bright filled
 * block, while still carrying the tier colour.
 */
export function RarityChip({
  label,
  color,
  className = "",
}: {
  label: string;
  color: string | null | undefined;
  className?: string;
}) {
  const rarity = color?.trim() || "var(--accent)";
  const style = {
    "--rarity": rarity,
    color: rarity,
    backgroundColor: `color-mix(in srgb, ${rarity} 16%, transparent)`,
    borderColor: `color-mix(in srgb, ${rarity} 45%, transparent)`,
  } as CSSProperties;

  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${className}`}
      style={style}
    >
      {label}
    </span>
  );
}

export function FlagChips({
  stattrak,
  souvenir,
}: {
  stattrak: boolean;
  souvenir: boolean;
}) {
  if (!stattrak && !souvenir) return null;
  return (
    <div className="inline-flex gap-1 font-mono text-[10px] font-semibold leading-none tracking-[0.08em]">
      {stattrak ? (
        <span
          className="rounded border px-1.5 py-1"
          style={{
            color: "var(--buff)",
            borderColor: "color-mix(in srgb, var(--buff) 45%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--buff) 14%, transparent)",
          }}
        >
          ST
        </span>
      ) : null}
      {souvenir ? (
        <span
          className="rounded border px-1.5 py-1"
          style={{
            color: "var(--warn)",
            borderColor: "color-mix(in srgb, var(--warn) 45%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--warn) 14%, transparent)",
          }}
        >
          SVNR
        </span>
      ) : null}
    </div>
  );
}
