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
    body: "We price items on Buff163 and the Steam Market, and fill floats when inspect data is available.",
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
        className="et-card et-card-hover group flex h-full flex-col overflow-hidden"
      >
        <div className="relative flex h-28 items-end justify-center gap-1 overflow-hidden bg-[var(--bg)]/80 px-3 pt-4 sm:h-32">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(200,121,65,0.16), transparent 70%)",
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
            <div className="et-slot relative mb-3 h-16 w-full" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
          <h3
            className="text-xl font-semibold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)]"
            style={{
              fontFamily: "var(--font-ui), Inter, system-ui, sans-serif",
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

/** Home hub: cinematic vault hero, then supporting tools. */
export function HomeHub({ showcase }: { showcase: HomeShowcase }) {
  return (
    <div>
      <section className="relative left-1/2 w-screen min-h-[100dvh] -translate-x-1/2 -mt-6 sm:-mt-8">
        {/* Layer 1 — The Asset (video / 3D canvas placeholder) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[100dvh] overflow-hidden"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#0A0F1D",
              backgroundImage: `
                radial-gradient(circle at 18% 22%, rgba(200,121,65,0.07) 0 1px, transparent 1.6px),
                radial-gradient(circle at 78% 38%, rgba(255,255,255,0.035) 0 1px, transparent 1.6px),
                linear-gradient(165deg, #121a2e 0%, #0A0F1D 42%, #070b16 100%)
              `,
              backgroundSize: "42px 42px, 28px 28px, 100% 100%",
            }}
          />
          <HomeAtmosphere images={showcase.constellation} />
        </div>

        {/* Layer 2 — Studio lighting: copper spotlight + indigo vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[100dvh]"
          style={{
            background: `
              radial-gradient(ellipse 46% 40% at 50% 44%, rgba(200,121,65,0.28) 0%, rgba(200,121,65,0.08) 34%, transparent 62%),
              radial-gradient(ellipse 100% 90% at 50% 50%, transparent 18%, rgba(10,15,29,0.72) 58%, #0A0F1D 82%)
            `,
          }}
        />

        {/* Layer 3 — Interface */}
        <div className="relative z-20">
          <p className="pointer-events-auto absolute left-1/2 top-6 z-30 w-[min(42rem,calc(100%-2rem))] -translate-x-1/2 text-center text-xs leading-relaxed text-[#8B95A5] sm:top-8 sm:text-sm">
            <span className="font-medium text-white">Early Access Beta</span>
            <span className="mx-1.5 text-[#C87941]/50" aria-hidden>
              —
            </span>
            We&apos;re actively building new features and improving float sync.{" "}
            <Link
              href="/status"
              className="font-medium text-[#C87941] transition-all duration-[400ms] ease-in-out hover:underline"
            >
              View Roadmap &amp; Limitations →
            </Link>
          </p>
          <ProfileLookup recentProfiles={[]} accentGlow />
        </div>
      </section>

      <div className="relative z-20 space-y-10 pt-6 sm:space-y-14 sm:pt-10">
        <section className="mx-auto max-w-4xl space-y-5">
          <h2 className="text-center text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <li
                key={item.step}
                className="et-card px-4 py-5 text-center sm:px-5"
              >
                <p className="font-data text-xs text-[var(--accent)]">
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
    </div>
  );
}
