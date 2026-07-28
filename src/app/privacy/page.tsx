import type { Metadata } from "next";
import { LegalArticle } from "@/components/LegalArticle";
import { SITE_GITHUB_URL, SITE_NAME, VALVE_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_NAME}`,
  description: `Privacy Policy for ${SITE_NAME}, a hosted CS2 inventory and market value tool.`,
};

export default function PrivacyPage() {
  return (
    <LegalArticle title="Privacy Policy" lastUpdated="July 28, 2026">
      <p>
        This Privacy Policy describes how {SITE_NAME} handles information when you use the
        hosted app. This is starter legal text provided for convenience and does not constitute
        legal advice.
      </p>

      <section>
        <h2>Summary</h2>
        <ul>
          <li>No user accounts or sign-in system.</li>
          <li>
            Inventory and pricing data for looked-up Steam profiles are stored in a hosted
            PostgreSQL database (Supabase).
          </li>
          <li>Optional API keys stay in the server environment and are not sent to the browser.</li>
          <li>We do not run advertising SDKs or third-party analytics in the app.</li>
        </ul>
      </section>

      <section>
        <h2>Information you provide</h2>
        <p>
          When you search for a profile, you enter a Steam ID, vanity URL, or Steam Community
          profile link. The app uses that identifier to fetch public inventory and related data
          from Steam and optional enrichment providers. We do not collect passwords or Steam
          login credentials.
        </p>
      </section>

      <section>
        <h2>Data we store</h2>
        <p>
          The app persists data in PostgreSQL. Stored data may include:
        </p>
        <ul>
          <li>Steam profile identifiers and display names</li>
          <li>Inventory item metadata, prices, floats, stickers, and sync timestamps</li>
          <li>Cached market pricing and catalog references used by the UI</li>
          <li>Optional reputation fields (FACEIT / Leetify) when enrichment succeeds</li>
        </ul>
        <p>
          Anyone who knows a profile&apos;s inventory or share link can view that snapshot. We do
          not publish a full public directory of every tracked profile via the API; recent
          profiles may appear on limited in-app lists.
        </p>
      </section>

      <section>
        <h2>Public Steam data and share links</h2>
        <p>
          {SITE_NAME} only works with Steam inventories set to Public. By looking up a
          profile you cause that public inventory to be cached on our servers for display,
          pricing, and share cards. Share pages are reachable by link (unguessable IDs). If you
          want data removed, contact us via GitHub; we may delete stored profile rows on request.
        </p>
      </section>

      <section>
        <h2>Browser storage</h2>
        <p>
          The app may store small UI preferences in your browser, such as display currency and page
          theme. These preferences are not used for tracking and remain on your device.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          To sync inventories and show market context, the app may contact third parties including:
        </p>
        <ul>
          <li>Steam (inventory, community profile, and market price overview APIs)</li>
          <li>CSGOTrader / Buff163 pricing sources</li>
          <li>
            Optional enrichers when configured: Steamwebapi, FACEIT, Leetify, or a self-hosted
            inspect API
          </li>
          <li>Public CS2 item catalog data hosted on GitHub (ByMykel CSGO-API and related sources)</li>
          <li>Hosting and database providers (for example Vercel and Supabase)</li>
        </ul>
        <p>
          Each provider has its own privacy practices. Requests for Steam and pricing data are made
          from our servers.
        </p>
      </section>

      <section>
        <h2>API keys and secrets</h2>
        <p>
          Optional API keys (for example{" "}
          <code className="text-[var(--text)]">STEAMWEBAPI_KEY</code> or{" "}
          <code className="text-[var(--text)]">FACEIT_API_KEY</code>) are read from the server
          environment at runtime. They are not embedded in the client bundle.
        </p>
      </section>

      <section>
        <h2>Analytics and advertising</h2>
        <p>
          {SITE_NAME} does not include advertising networks, behavioral analytics, or social
          tracking pixels. Hosting platforms may keep operational logs (for example request logs)
          under their own policies.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The app is not directed at children under 13. We do not knowingly collect personal
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
          We may update this Privacy Policy from time to time. Material changes will be reflected
          by updating the &quot;Last updated&quot; date above.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy questions can be directed via{" "}
          <a
            href={SITE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition hover:text-[var(--accent-dim)]"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </LegalArticle>
  );
}
