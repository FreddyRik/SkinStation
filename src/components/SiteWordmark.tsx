import type { ReactNode } from "react";

type SiteWordmarkProps = {
  className?: string;
  accentClassName?: string;
  children?: ReactNode;
};

/** SkinStation wordmark: Skin + accent Station */
export function SiteWordmark({
  className = "text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl",
  accentClassName = "text-[var(--accent)]",
}: SiteWordmarkProps) {
  return (
    <span className={className}>
      Skin<span className={accentClassName}>Station</span>
    </span>
  );
}
