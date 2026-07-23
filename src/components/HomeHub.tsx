import Link from "next/link";
import { ProfileLookup } from "@/components/ProfileLookup";
import { HomeAtmosphere } from "@/components/HomeAtmosphere";
import type { HomeShowcase, HomeShowcaseImage } from "@/lib/home-showcase";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Paste a Steam URL",
    body: "Drop in a profile link or SteamID64 with a public CS2 inventory.",
  },
  {
    step: "2",
    title: "Sync floats & prices",
    body: "We enrich floats and price items on Buff163 and the Steam Market.",
  },
  {
    step: "3",
    title: "Browse, share, trade up",
    body: "Explore the catalog, export a share card, or run trade-up odds.",
  },
] as const;

function ToolCard({
  href,
  title,
  description,
  cta,
  previews,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
  previews: HomeShowcaseImage[];
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 transition hover:border-[var(--accent)]/45 hover:bg-[var(--bg-panel)]/80"
      >
        <div className="relative flex h-28 items-end justify-center gap-1 overflow-hidden bg-[var(--bg)]/80 px-3 pt-4 sm:h-32">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(94,234,212,0.14), transparent 70%)",
            }}
          />
          {previews.length > 0 ? (
            previews.map((img, i) => {
              const tilt = (i - (previews.length - 1) / 2) * 6;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.image}
                  alt=""
                  className="relative h-20 w-20 object-contain transition duration-300 group-hover:-translate-y-1 sm:h-24 sm:w-24"
                  style={{
                    rotate: `${tilt}deg`,
                    zIndex: previews.length - i,
                  }}
                  loading="lazy"
                  draggable={false}
                />
              );
            })
          ) : (
            <div className="relative mb-3 h-16 w-full rounded-lg border border-dashed border-[var(--border)]" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
          <h3
            className="text-xl font-semibold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)]"
            style={{
              fontFamily: "var(--font-share-display), Georgia, serif",
            }}
          >
            {title}
          </h3>
          <p className="flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
            {description}
          </p>
          <span className="text-sm font-medium text-[var(--accent)]">
            {cta} →
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Home hub: inventory lookup as the main tool, other features below. */
export function HomeHub({ showcase }: { showcase: HomeShowcase }) {
  return (
    <div className="space-y-10 sm:space-y-14">
      <ProfileLookup
        recentProfiles={[]}
        accentGlow
        atmosphere={<HomeAtmosphere images={showcase.constellation} />}
      />

      <section className="mx-auto max-w-4xl space-y-5">
        <h2 className="text-center text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-[var(--border)]/80 bg-[var(--bg-elevated)]/30 px-4 py-5 text-center sm:px-5"
            >
              <p className="font-mono text-xs text-[var(--accent)]">
                {item.step}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-center text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          More tools
        </h2>
        <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <ToolCard
            href="/database"
            title="Skin Database"
            description="Browse the live CS2 catalog — weapons, cases, collections, and wear-tier market prices."
            cta="Browse catalog"
            previews={showcase.databasePreviews}
          />
          <ToolCard
            href="/tradeup"
            title="Trade-up"
            description="Build 10-slot or 5-Covert contracts, see outcome odds, floats, and expected value."
            cta="Open calculator"
            previews={showcase.tradeupPreviews}
          />
        </ul>
      </section>
    </div>
  );
}
