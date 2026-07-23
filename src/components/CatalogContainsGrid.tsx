import Link from "next/link";
import { CatalogPriceText } from "@/components/CatalogPriceText";
import type { CatalogContainsItem, CatalogNamedRef } from "@/lib/cs-catalog";

/** Heuristic for contains rows that lack category ids (gloves also use ★). */
export function containsLooksLikeKnife(name: string): boolean {
  const n = name.trim();
  if (!n.startsWith("★") && !n.startsWith("\u2605")) return false;
  const lower = n.toLowerCase();
  if (
    lower.includes("gloves") ||
    lower.includes("hand wraps") ||
    lower.includes("wraps |")
  ) {
    return false;
  }
  return true;
}

function KnifeBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--accent)]"
      title="Knife"
      aria-label="Knife"
    >
      ★
    </span>
  );
}

export type ContainsGridItem = CatalogContainsItem & {
  priceMinUsd?: number | null;
  priceMaxUsd?: number | null;
};

export function CatalogContainsGrid({
  items,
  emptyLabel = "No items listed.",
}: {
  items: ContainsGridItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => {
        const knife = containsLooksLikeKnife(item.name);
        return (
          <li key={item.id}>
            <Link
              href={`/database/${encodeURIComponent(item.id)}`}
              className="flex h-full flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 transition hover:border-[var(--accent)]/35 hover:bg-[var(--bg-panel)]/80"
            >
              <div className="flex h-24 items-center justify-center rounded-lg bg-[var(--bg)]">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
              <div className="flex items-start gap-1.5">
                {knife ? <KnifeBadge /> : null}
                <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-[var(--text)]">
                  {item.name}
                </p>
              </div>
              {item.rarity ? (
                <p
                  className="truncate text-[11px]"
                  style={{ color: item.rarity.color }}
                >
                  {item.rarity.name}
                </p>
              ) : null}
              <CatalogPriceText
                minUsd={item.priceMinUsd ?? null}
                maxUsd={item.priceMaxUsd ?? null}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CatalogNamedRefList({
  items,
  hrefFor,
}: {
  items: CatalogNamedRef[];
  hrefFor: (id: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((ref) => (
        <li key={ref.id}>
          <Link
            href={hrefFor(ref.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 px-2.5 py-1.5 text-xs text-[var(--text)] transition hover:border-[var(--accent)]/40"
          >
            {ref.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ref.image}
                alt=""
                className="h-6 w-6 object-contain"
                loading="lazy"
              />
            ) : null}
            {ref.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
