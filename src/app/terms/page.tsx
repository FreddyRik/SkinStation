import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/LegalArticle";
import {
  buildPageMetadata,
  SITE_GITHUB_URL,
  SITE_NAME,
  SITE_TAGLINE,
  VALVE_DISCLAIMER,
} from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: `Terms of Service — ${SITE_NAME}`,
  description: `Terms of Service for ${SITE_NAME} — inventory tracking, skin catalog, and trade-up tools.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalArticle title="Terms of Service" lastUpdated="August 15, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of {SITE_NAME} (the
        &quot;Service&quot;). {SITE_TAGLINE} By accessing or using the Service, you agree to these
        Terms. This text describes how the product is offered today and is not legal advice.
      </p>

      <section>
        <h2>The Service</h2>
        <p>{SITE_NAME} is a free, Early Access web app that currently includes:</p>
        <ul>
          <li>
            <strong className="font-medium text-[var(--text)]">Inventory</strong> — look up a
            public Steam CS2 inventory, see prices and a portfolio chart, export a list, and
            share a Wrapped card
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Skin Database</strong> — browse
            CS2 items, cases, and collections with market context
          </li>
          <li>
            <strong className="font-medium text-[var(--text)]">Trade-up Calculator</strong> —
            estimate contract odds, floats, and expected value from a linked inventory or a
            sandbox
          </li>
        </ul>
        <p>
          Features may change, break, or be incomplete while we are in Early Access. See{" "}
          <Link href="/status" className="text-[var(--accent)] transition hover:underline">
            Roadmap &amp; Limitations
          </Link>{" "}
          for known gaps (including missing floats and occasional slow lookups).
        </p>
      </section>

      <section>
        <h2>Not affiliated with Valve or Steam</h2>
        <p>{VALVE_DISCLAIMER}</p>
        <p>
          {SITE_NAME} is an independent fan-made tool. Valve, Steam, and Counter-Strike are not
          sponsors of, partners with, or responsible for this Service.
        </p>
      </section>

      <section>
        <h2>No accounts</h2>
        <p>
          There are no {SITE_NAME} accounts, paid plans, or Steam login. You browse the catalog
          and trade-up tools freely. Inventory features work by pasting a public Steam profile.
          After a lookup, that inventory page and share card are available to anyone with the
          link.
        </p>
      </section>

      <section>
        <h2>Eligibility and public inventories</h2>
        <p>
          You may only look up Steam inventories that are set to{" "}
          <strong className="font-medium text-[var(--text)]">Public</strong>. You are responsible
          for complying with Steam&apos;s rules and applicable law. Do not use the Service to
          access private inventories or collect data you are not allowed to collect.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Harass, impersonate, or infringe others&apos; rights through the Service</li>
          <li>Overwhelm the Service or Steam with automated lookups or scraping</li>
          <li>Try to break, disrupt, or abuse the Service</li>
        </ul>
        <p>
          We may slow down, block, or refuse requests that threaten stability or violate these
          Terms.
        </p>
      </section>

      <section>
        <h2>Estimates only — not financial advice</h2>
        <p>
          Prices, floats, stickers, trade-up odds, expected value, and portfolio totals are{" "}
          <strong className="font-medium text-[var(--text)]">estimates</strong>. They can be
          missing, delayed, or wrong — especially while float coverage is limited in Early
          Access.
        </p>
        <p>
          {SITE_NAME} does not provide financial, investment, or trading advice. You alone decide
          whether to buy, sell, or trade items, and you accept the risk of relying on any number
          shown in the Service.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          The Service depends on Steam and other public sources for inventories, prices, catalog
          data, and optional rank badges. Those services can go down, throttle, or change their
          rules, and features may degrade without notice.
        </p>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          CS2 item names, images, and related marks belong to Valve and their respective owners.{" "}
          {SITE_NAME} branding and original site code are owned by their authors. You may not
          present the Service as an official Valve or Steam product.
        </p>
      </section>

      <section>
        <h2>Disclaimer of warranties</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind,
          express or implied, including merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant uninterrupted, accurate, or secure operation.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, the authors and operators of {SITE_NAME} are
          not liable for any indirect, incidental, special, consequential, or punitive damages, or
          any loss of profits, data, goodwill, or inventory value arising from your use of the
          Service or reliance on its output — including trading losses based on prices, floats, or
          trade-up calculations.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          How we handle data is described in the{" "}
          <Link href="/privacy" className="text-[var(--accent)] transition hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these Terms as the Service evolves. Continued use after changes are posted
          means you accept the revised Terms. The &quot;Last updated&quot; date will reflect material
          revisions.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a
            href={SITE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </LegalArticle>
  );
}
