import Link from "next/link";
import { HomeAtmosphere } from "@/components/HomeAtmosphere";
import { HomeHeroStage } from "@/components/HomeHeroStage";
import { ProfileLookup } from "@/components/ProfileLookup";
import type { HomeShowcase, HomeShowcaseImage } from "@/lib/home-showcase";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Paste a Steam URL",
    body: "Drop in a profile link or SteamID64 with a public CS2 inventory.",
  },
  {
    step: "02",
    title: "Sync floats & prices",
    body: "We price items on Buff163 and the Steam Market, and fill floats when inspect data is available.",
  },
  {
    step: "03",
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
        className="group flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
      >
        <div className="relative mb-4 flex h-28 items-end justify-center sm:h-32 sm:justify-start">
          {previews.length > 0 ? (
            previews.map((img, i) => {
              const tilt = (i - (previews.length - 1) / 2) * 8;
              const shift = (i - (previews.length - 1) / 2) * 18;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.image}
                  alt=""
                  className="relative h-24 w-24 object-contain opacity-80 drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-2 group-hover:opacity-100 sm:h-28 sm:w-28"
                  style={{
                    rotate: `${tilt}deg`,
                    marginLeft: i === 0 ? 0 : -12,
                    translate: `${shift}px 0`,
                    zIndex: previews.length - i,
                  }}
                  loading="lazy"
                  draggable={false}
                />
              );
            })
          ) : (
            <div className="mb-2 h-16 w-full max-w-[12rem] border-b border-dashed border-[var(--border)]" />
          )}
        </div>
        <h3 className="type-card-title text-xl transition group-hover:text-[var(--accent)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
        <span className="mt-3 text-sm font-medium text-[var(--accent)]">
          {cta} →
        </span>
      </Link>
    </li>
  );
}

/** Home hub: inventory lookup as the main tool, other features below. */
export function HomeHub({ showcase }: { showcase: HomeShowcase }) {
  return (
    <div className="space-y-16 sm:space-y-20">
      <HomeHeroStage
        atmosphere={<HomeAtmosphere images={showcase.constellation} />}
        banner={
          <p className="text-center text-sm leading-relaxed text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">
              Early Access Beta
            </span>
            <span className="mx-1.5 text-[var(--border)]" aria-hidden>
              —
            </span>
            We&apos;re actively building new features and improving float sync.{" "}
            <Link
              href="/status"
              className="font-medium text-[var(--accent)] transition hover:underline"
            >
              View Roadmap &amp; Limitations →
            </Link>
          </p>
        }
      >
        <ProfileLookup recentProfiles={[]} accentGlow />
      </HomeHeroStage>

      <section className="mx-auto max-w-4xl space-y-8">
        <h2 className="type-overline text-center">How it works</h2>
        <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-10">
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent sm:block"
          />
          {HOW_IT_WORKS.map((item) => (
            <li
              key={item.step}
              className="relative border-l border-[var(--accent)]/35 pl-4 sm:border-l-0 sm:pl-0"
            >
              <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent)]">
                {item.step}
              </p>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-8">
        <h2 className="type-overline text-center">More tools</h2>
        <ul className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-2 sm:gap-14">
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
