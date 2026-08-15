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
    <LegalArticle title="Privacy Policy" lastUpdated="August 15, 2026">
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
            Looking up a public Steam profile caches that inventory and related prices on our
            servers.
          </li>
          <li>
            The Skin Database and Trade-up Calculator use public catalog and market data. They
            do not need a profile unless you link an inventory to a trade-up.
          </li>
          <li>
            We use privacy-friendly page-view analytics on the hosted site — not ads or tracking
            pixels.
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
          For inventory lookup you may enter a Steam profile URL or ID. We use that to fetch the
          profile&apos;s <strong className="font-medium text-[var(--text)]">public</strong> CS2
          inventory. We never ask for Steam credentials.
        </p>
        <p>
          Inventory and share links use an opaque ID. Anyone with the link can open that cached
          snapshot.
        </p>
      </section>

      <section>
        <h2>What we store</h2>
        <p>For profiles that have been looked up, we may keep:</p>
        <ul>
          <li>Public Steam name, avatar, and identifiers needed to refresh the inventory</li>
          <li>Inventory items (names, images, floats and stickers when available)</li>
          <li>Cached market prices used for totals and the catalog</li>
          <li>Portfolio snapshots from successful refreshes (for the history chart)</li>
          <li>Optional FACEIT / Leetify rank badges when they are available</li>
        </ul>
        <p>
          Catalog browsing uses public CS2 item data. We do not publish a directory of tracked
          Steam accounts. Recent profiles in the UI stay on this device only and are not shared
          with other visitors.
        </p>
      </section>

      <section>
        <h2>Public Steam data and removal</h2>
        <p>
          {SITE_NAME} only works with inventories set to Public on Steam. Looking up a profile
          stores that public inventory (and derived prices / share cards) so we can display and
          refresh it. If you want a stored profile deleted, open an issue or contact us via{" "}
          <a
            href={SITE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition hover:underline"
          >
            GitHub
          </a>
          ; we will remove the cached data when reasonably able to do so.
        </p>
      </section>

      <section>
        <h2>Browser storage</h2>
        <p>
          Preferences such as display currency, theme, and recent profiles on this device may be
          saved in your browser. They stay on your device and are not used for advertising or
          cross-site tracking.
        </p>
      </section>

      <section>
        <h2>Third parties</h2>
        <p>Depending on the feature, we may contact:</p>
        <ul>
          <li>Steam — public profiles, inventories, and market prices</li>
          <li>Public market and catalog sources (including Buff163 prices)</li>
          <li>FACEIT and Leetify for optional rank badges</li>
          <li>Our hosting and database providers, to run the site</li>
        </ul>
        <p>Those providers handle data under their own policies.</p>
      </section>

      <section>
        <h2>Logs and security</h2>
        <p>
          Standard web logs (such as IP address) may be kept to operate the site, prevent abuse,
          and enforce rate limits. We do not sell this data.
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
          We do not embed advertising networks, social tracking pixels, or other marketing trackers
          in the app.
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
