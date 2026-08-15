import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LatestReleasesProps } from "@/types/catalog-ui";

const CARD_CLASS =
  "hud-panel-quiet flex h-full flex-col gap-3 p-4 transition hover:border-[var(--accent)]/45 hover:bg-[var(--bg-panel)]/70 hover:shadow-[0_0_26px_-10px_color-mix(in_srgb,var(--accent)_60%,transparent)]";

export function LatestReleases({ cards, onActivate }: LatestReleasesProps) {
  if (cards.length === 0) {
    return (
      <EmptyState
        title="No featured releases"
        description="Pick a category above to start browsing the catalog."
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[var(--accent)]" aria-hidden>
          ◆
        </span>
        <h2 className="type-section-title">Latest item releases</h2>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_45%,transparent)] to-transparent"
        />
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const inner = (
            <>
              <div className="flex h-28 items-center justify-center sm:h-32">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>
              <div className="space-y-1 text-center">
                <p className="type-card-title text-xs sm:text-sm">{card.title}</p>
                <p className="type-overline">{card.subtitle}</p>
              </div>
            </>
          );

          return (
            <li key={card.id}>
              {card.href && !card.filter ? (
                <Link href={card.href} className={CARD_CLASS}>
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onActivate(card)}
                  className={`w-full ${CARD_CLASS}`}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
