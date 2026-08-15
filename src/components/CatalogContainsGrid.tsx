import Link from "next/link";
import { CatalogPriceText } from "@/components/CatalogPriceText";
import {
  collapsePhasedContains,
  formatPhaseShort,
  phaseAccent,
  resolveSkinPhase,
  type CatalogContainsItem,
  type CatalogNamedRef,
} from "@/lib/cs-catalog";

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

function multiPhaseFamilyNames(items: ContainsGridItem[]): Set<string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const phase = resolveSkinPhase({ paintIndex: item.paint_index });
    if (!phase) continue;
    const key = item.name.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const multi = new Set<string>();
  for (const [name, count] of counts) {
    if (count > 1) multi.add(name);
  }
  return multi;
}

export function CatalogContainsGrid({
  items,
  emptyLabel = "No items listed.",
}: {
  items: ContainsGridItem[];
  emptyLabel?: string;
}) {
  const familyNames = multiPhaseFamilyNames(items);
  const displayItems = collapsePhasedContains(items);

  if (displayItems.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {displayItems.map((item) => {
        const knife = containsLooksLikeKnife(item.name);
        const isPhaseFamily = familyNames.has(item.name.trim());
        const phase = isPhaseFamily
          ? null
          : resolveSkinPhase({
              paintIndex: item.paint_index,
            });
        const phaseShort = formatPhaseShort(phase);
        return (
          <li key={item.id}>
            <Link
              href={`/database/${encodeURIComponent(item.id)}`}
              className="et-card et-card-hover flex h-full flex-col gap-2 p-3"
              style={
                item.rarity
                  ? { borderLeft: `2px solid ${item.rarity.color}` }
                  : undefined
              }
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
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug text-[var(--text)]">
                    {item.name}
                    {phaseShort ? (
                      <span
                        className="ml-1 font-bold"
                        style={{ color: phaseAccent(phase) }}
                      >
                        {phaseShort}
                      </span>
                    ) : null}
                  </p>
                  {isPhaseFamily ? (
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      Multiple phases
                    </p>
                  ) : null}
                </div>
              </div>
              {item.rarity ? (
                <p className="truncate text-[11px] text-[var(--text-muted)]">
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
            className="et-card et-card-hover inline-flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text)]"
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
