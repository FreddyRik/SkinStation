import type { StatCardProps, StatTone } from "@/types/ui";

const TONE_COLOR: Record<StatTone, string> = {
  neutral: "text-[var(--text)]",
  accent: "text-[var(--accent)]",
  positive: "text-[var(--accent)]",
  negative: "text-[var(--danger)]",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div className="hud-panel-quiet px-4 py-3">
      <p className="type-overline">{label}</p>
      <p className={`type-metric mt-1.5 text-lg ${TONE_COLOR[tone]}`}>{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
