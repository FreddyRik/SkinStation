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
  title: `Privacy Policy — ${SITE_NAME}`,
  description: `How ${SITE_NAME} handles data for inventory lookup, the skin catalog, and trade-up tools.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalArticle title="Privacy Policy" lastUpdated="July 28, 2026">
      <p>
        This Privacy Policy explains what {SITE_NAME} collects and stores when you use the
        hosted site ({SITE_TAGLINE.toLowerCase()}). It is written for clarity about how the
        product works today and is not legal advice.
      </p>

      <section>
        <h2>Summary</h2>
        <ul>
          <li>No accounts, passwords, or Steam login — you never sign in to {SITE_NAME}.</li>
          <li>
            Looking up a public Steam profile caches that inventory and related pricing on our
            servers (PostgreSQL / Supabase).
          </li>
          <li>
            The Skin Database and Trade-up Calculator use public catalog and market data; they do
            not require a profile unless you link inventory to a trade-up.
          </li>
          <li>
            We use Vercel Analytics for basic, privacy-friendly page-view metrics — not ads or
            behavioral marketing pixels.
          </li>
          <li>
            Early Access limitations (for example incomplete floats) are described on{" "}
            <Link href="/status" className="text-[var(--accent)] transition hover:underline">
              Roadmap &amp; Limitations
            </Link>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2>What you submit</h2>
        <p>
          When you use Inventory Search, you may enter a SteamID64, vanity name, or Steam Community
          profile URL. We use that to resolve the profile and fetch its <strong className="font-medium text-[var(--text)]">public</strong>{" "}
          CS2 inventory. We never ask for Steam credentials.
        </p>
        <p>
          Share and inventory URLs use opaque profile IDs. Anyone with the link can open that
          cached snapshot.
        </p>
      </section>

      <section>
        <h2>What we store on our servers</h2>
        <p>For profiles that have been looked up or synced, we may persist:</p>
        <ul>
          <li>Steam identifiers, persona name, and avatar URL</li>
          <li>
            Inventory items (names, images, floats/paint seed when available, stickers, market
            flags) and last sync metadata
          </li>
          <li>Cached Buff163 / Steam Market prices used for totals and the catalog</li>
          <li>Portfolio value snapshots from successful syncs (for the history chart)</li>
          <li>Optional FACEIT / Leetify reputation fields when enrichment succeeds</li>
        </ul>
        <p>
          Catalog browsing caches item metadata from public CS2 item APIs. We do not publish a
          full browsable directory of every tracked Steam account via the API; limited “recent”
          lists may appear in the UI.
        </p>
      </section>

      <section>
        <h2>Public Steam data and removal</h2>
        <p>
          {SITE_NAME} only works with inventories set to Public on Steam. Looking up a profile
          causes that public inventory (and derived prices / share cards) to be stored for display
          and Refresh. If you want a stored profile deleted, open an issue or contact us via{" "}
          <a
            href={SITE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition hover:underline"
          >
            GitHub
          </a>
          ; we will remove the cached row when reasonably able to do so.
        </p>
      </section>

      <section>
        <h2>Browser storage</h2>
        <p>
          Preferences such as display currency (USD/EUR), page theme, and similar UI choices may be
          saved in your browser&apos;s local storage. They stay on your device and are not used for
          advertising or cross-site tracking.
        </p>
      </section>

      <section>
        <h2>Third parties we contact</h2>
        <p>
          Server-side requests may go to (depending on feature and configuration):
        </p>
        <ul>
          <li>Steam — community profiles, inventory, and Market priceoverview</li>
          <li>CSGOTrader / Buff163 pricing feeds</li>
          <li>Public CS2 catalogs (for example ByMykel CSGO-API on GitHub)</li>
          <li>
            Optional enrichers: Steamwebapi, FACEIT, Leetify, or a self-hosted inspect/float service
          </li>
          <li>
            Infrastructure: hosting (e.g. Vercel), database (Supabase), and optional Upstash Redis
            for rate limiting
          </li>
        </ul>
        <p>
          Those providers process data under their own policies. Optional API keys live only in the
          server environment and are not shipped to the browser.
        </p>
      </section>

      <section>
        <h2>Logs, rate limits, and security</h2>
        <p>
          Hosting and edge layers may retain standard operational logs (IP address, user agent,
          request path, timestamps) to operate the service and enforce rate limits. We do not sell
          this data.
        </p>
      </section>

      <section>
        <h2>Analytics and advertising</h2>
        <p>
          {SITE_NAME} uses{" "}
          <a
            href="https://vercel.com/docs/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition hover:underline"
          >
            Vercel Analytics
          </a>{" "}
          on the hosted site to understand aggregate traffic (for example which pages are visited).
          It is not used for advertising, retargeting, or selling data. Vercel processes this
          information under its own{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition hover:underline"
          >
            privacy policy
          </a>
          .
        </p>
        <p>
          We do not embed advertising networks, social tracking pixels, or other behavioral
          marketing SDKs in the app.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The service is not directed at children under 13. We do not knowingly collect personal
          information from children.
        </p>
      </section>

      <section>
        <h2>Valve and Steam</h2>
        <p>{VALVE_DISCLAIMER}</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update this policy as the product evolves. The &quot;Last updated&quot; date at the top
          will change when we do.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy questions:{" "}
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
