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
    <LegalArticle title="Roadmap & Limitations" lastUpdated="August 15, 2026">
      <p>
        {SITE_NAME} is in Early Access. Inventory tracking, the skin catalog, and trade-up
        odds work today — while we keep shipping improvements and polishing rough edges.
      </p>

      <section>
        <h2>What you can do today</h2>
        <ul>
          <li>
            Look up a <strong className="font-medium text-[var(--text)]">public</strong> Steam
            CS2 inventory — Buff163 and Steam Market prices, USD/EUR, search and filters, a
            portfolio chart, CSV/JSON export, and FACEIT / Leetify badges when they&apos;re
            available
          </li>
          <li>
            Browse the{" "}
            <strong className="font-medium text-[var(--text)]">skin database</strong> (items,
            cases, collections) with market context
          </li>
          <li>
            Run{" "}
            <strong className="font-medium text-[var(--text)]">trade-up</strong> odds — 10-slot
            contracts and 5-Covert knife/glove contracts, including from a linked inventory
          </li>
          <li>
            Export a{" "}
            <strong className="font-medium text-[var(--text)]">Wrapped</strong> share card as a
            PNG
          </li>
        </ul>
      </section>

      <section>
        <h2>Known limitations</h2>
        <ul>
          <li>
            <strong className="font-medium text-[var(--text)]">Floats</strong> — many weapons
            have no float. Stickers still show when Steam lists them. Trade-up can estimate a
            float from wear (you can edit it); the inventory list does not invent floats.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Lookups can stall</strong> —
            Steam sometimes throttles. We keep the last successful inventory and you can retry
            later.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Prices</strong> — some items stay
            as —. Large inventories may need a second Refresh.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Portfolio chart</strong> —
            starts when you first track the profile; no history from before that.
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Public inventories only</strong>{" "}
            — no Steam login; the CS2 inventory must be public.
          </li>
        </ul>
      </section>

      <section>
        <h2>What&apos;s next</h2>
        <ul>
          <li>More complete weapon floats</li>
          <li>Fewer failed or delayed lookups when Steam is busy</li>
          <li>Ongoing polish from feedback</li>
        </ul>
        <p>This list will change as we ship — no fixed dates yet.</p>
      </section>
    </LegalArticle>
  );
}
