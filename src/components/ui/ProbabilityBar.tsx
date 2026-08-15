import type { CSSProperties } from "react";
import type { ProbabilityBarProps } from "@/types/ui";

export function ProbabilityBar({
  value,
  color,
  className = "",
}: ProbabilityBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const style = color
    ? ({ "--prob": color } as CSSProperties)
    : undefined;

  return (
    <span
      aria-hidden
      className={`prob-bar block h-1 w-full ${className}`}
      style={style}
    >
      <span className="prob-bar-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
