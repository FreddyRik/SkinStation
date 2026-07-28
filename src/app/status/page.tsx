import type { Metadata } from "next";
import { LegalArticle } from "@/components/LegalArticle";
import { buildPageMetadata, SITE_NAME, sitePageTitle } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: sitePageTitle("Roadmap & Limitations"),
  description: `Early Access status for ${SITE_NAME} — known limitations and what's coming next.`,
  path: "/status",
});

export default function StatusPage() {
  return (
    <LegalArticle title="Roadmap & Limitations" lastUpdated="July 28, 2026">
      <p>
        {SITE_NAME} is in Early Access. The core tools work today — inventory tracking, the
        skin catalog, and trade-up odds — while we keep shipping improvements and polishing
        rough edges.
      </p>

      <section>
        <h2>Early Access</h2>
        <p>
          Expect incomplete float coverage on many weapons, occasional slow Steam Market
          gap-fills, and UI that will keep evolving. Feedback and bug reports help us
          prioritize.
        </p>
      </section>

      <section>
        <h2>Known limitations</h2>
        <ul>
          <li>
            <strong className="font-medium text-[var(--text)]">Floats</strong> — Steam’s
            public inventory often lacks decodable inspect data. Without a self-hosted
            inspect bot (or optional Steamwebapi), many weapon floats stay empty. Stickers
            are still parsed from Steam descriptions when present.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Steam Market prices</strong> —
            Gap-fill uses Steam’s rate-limited{" "}
            <code className="text-[var(--text)]">priceoverview</code> API. Large inventories
            may need a second Refresh after throttling. Missing prices show as — and never
            hard-fail a sync.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Portfolio chart</strong> —
            Shows your sync snapshots over time (7D / 30D / 90D / 1Y / All). It does not
            backfill market history from before you started tracking.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Public inventories only</strong> —
            No Steam login. Profiles must have a public CS2 inventory to load.
          </li>
        </ul>
      </section>

      <section>
        <h2>What’s next</h2>
        <ul>
          <li>Faster and more reliable float sync (better inspect coverage)</li>
          <li>Catalog and trade-up calculator polish</li>
          <li>Share-card and inventory UX improvements</li>
        </ul>
        <p>
          This list will change as we ship — no fixed dates yet.
        </p>
      </section>
    </LegalArticle>
  );
}
