import type { Metadata } from "next";
import { LegalArticle } from "@/components/LegalArticle";
import { SITE_GITHUB_URL, SITE_NAME, VALVE_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE_NAME}`,
  description: `Terms of Service for ${SITE_NAME}, a hosted CS2 inventory and market value tool.`,
};

export default function TermsPage() {
  return (
    <LegalArticle title="Terms of Service" lastUpdated="July 28, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of {SITE_NAME}
        (&quot;the app&quot;, &quot;we&quot;, &quot;us&quot;). By using the app, you agree to these Terms.
        This is starter legal text provided for convenience and does not constitute legal advice.
      </p>

      <section>
        <h2>Not affiliated with Valve or Steam</h2>
        <p>{VALVE_DISCLAIMER}</p>
        <p>
          {SITE_NAME} is an independent third-party tool. Valve Corporation, Steam, and
          Counter-Strike are not sponsors of, affiliated with, or responsible for this app.
        </p>
      </section>

      <section>
        <h2>Hosted service, no accounts</h2>
        <p>
          {SITE_NAME} may be operated as a hosted web app. The app does not provide user
          accounts or subscriptions. You look up Steam profiles by ID or URL; inventory snapshots
          and pricing data are stored in a hosted PostgreSQL database. Inventory and share pages
          for a profile are reachable by link after a sync.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to misuse the app or the third-party services it contacts. In particular:</p>
        <ul>
          <li>Do not use the app to harass, impersonate, or violate the rights of others.</li>
          <li>
            Do not attempt to circumvent rate limits, access controls, or terms imposed by Steam,
            Valve, or other data providers.
          </li>
          <li>
            Do not run automated scraping or sync jobs at a volume that could harm third-party
            APIs or this service.
          </li>
          <li>
            You are responsible for complying with Steam&apos;s Subscriber Agreement and the terms
            of any optional API keys the operator configures.
          </li>
        </ul>
      </section>

      <section>
        <h2>Data, pricing, and estimates</h2>
        <p>
          Market prices, float values, trade-up outcomes, and portfolio totals are estimates based
          on third-party sources and cached data. They may be incomplete, delayed, or incorrect.
          {SITE_NAME} does not guarantee accuracy and does not provide financial, investment,
          or trading advice. You use pricing and analytics information at your own risk.
        </p>
      </section>

      <section>
        <h2>Optional third-party API keys</h2>
        <p>
          Some features can be enabled with optional environment variables, such as{" "}
          <code className="text-[var(--text)]">STEAMWEBAPI_KEY</code>,{" "}
          <code className="text-[var(--text)]">FACEIT_API_KEY</code>, or a self-hosted inspect API
          (<code className="text-[var(--text)]">INSPECT_API_URL</code>). The operator is
          responsible for their use, billing, quotas, and compliance with each provider&apos;s
          terms.
        </p>
      </section>

      <section>
        <h2>Disclaimer of warranties</h2>
        <p>
          The app is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
          whether express or implied, including merchantability, fitness for a particular purpose,
          and non-infringement. We do not warrant that the app will be uninterrupted, error-free,
          or secure.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, the authors and contributors of {SITE_NAME}
          will not be liable for any indirect, incidental, special, consequential, or punitive
          damages, or any loss of profits, data, goodwill, or inventory value arising from your
          use of the app or reliance on its output.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these Terms from time to time. Continued use of the app after changes are
          posted constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these Terms can be directed via{" "}
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
