import type { SkeletonProps } from "@/types/ui";

export function Skeleton({ className = "" }: SkeletonProps) {
  return <span className={`skeleton block ${className}`} />;
}

/** Placeholder matching the catalog card footprint. */
export function SkeletonCard() {
  return (
    <div className="hud-panel-quiet flex h-full flex-col items-center gap-3 px-3 pb-3 pt-4">
      <Skeleton className="h-2.5 w-20 rounded-full" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="my-2 h-36 w-full rounded-lg sm:h-44" />
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="mt-auto h-3 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonCardGrid({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}
