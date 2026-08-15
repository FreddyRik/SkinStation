import type { PanelProps, PanelVariant } from "@/types/ui";

const VARIANT_CLASS: Record<PanelVariant, string> = {
  solid: "hud-panel",
  quiet: "hud-panel-quiet",
  inset: "rounded-xl border border-[var(--border)]/60 bg-[var(--bg)]/45",
};

export function Panel({
  children,
  variant = "solid",
  lit = false,
  corners = false,
  className = "",
}: PanelProps) {
  return (
    <div
      className={`${VARIANT_CLASS[variant]} ${lit ? "hud-panel-lit" : ""} ${
        corners ? "hud-corners" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
