import { SiteWordmark } from "@/components/SiteWordmark";

type SiteMarkSize = "sm" | "lg";

const MARK_SIZE: Record<SiteMarkSize, string> = {
  sm: "h-8 w-8",
  lg: "h-10 w-10",
};

const HEX_SIZE: Record<SiteMarkSize, string> = {
  sm: "h-[18px] w-[18px]",
  lg: "h-[22px] w-[22px]",
};

const CORE_SIZE: Record<SiteMarkSize, string> = {
  sm: "h-1.5 w-1.5",
  lg: "h-2 w-2",
};

export function SiteMark({ size = "sm" }: { size?: SiteMarkSize }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${MARK_SIZE[size]}`}
      aria-hidden
    >
      <span className="site-mark-ring absolute inset-0" />
      <svg
        className={`relative text-[var(--accent)] ${HEX_SIZE[size]}`}
        viewBox="0 0 32 32"
        fill="none"
      >
        <polygon
          points="16,3 28,10.5 28,21.5 16,29 4,21.5 4,10.5"
          fill="color-mix(in srgb, var(--bg-panel) 82%, transparent)"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`site-mark-core absolute rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] ${CORE_SIZE[size]}`}
      />
    </span>
  );
}

export function SiteBrand({ size = "sm" }: { size?: SiteMarkSize }) {
  const wordmarkClass =
    size === "lg"
      ? "text-xl font-semibold tracking-tight text-[var(--text)]"
      : "text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl";

  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <SiteMark size={size} />
      <SiteWordmark className={wordmarkClass} />
    </span>
  );
}
