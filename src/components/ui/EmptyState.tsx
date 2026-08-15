import type { EmptyStateProps } from "@/types/ui";

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`hud-panel hud-corners flex flex-col items-center gap-2 px-6 py-10 text-center ${className}`}
    >
      <p className="type-overline">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
