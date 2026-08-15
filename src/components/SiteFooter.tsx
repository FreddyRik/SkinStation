import Link from "next/link";
import { SiteWordmark } from "@/components/SiteWordmark";
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_TOOL_LINKS,
  SITE_GITHUB_URL,
  SITE_TAGLINE,
  VALVE_DISCLAIMER,
} from "@/lib/site";

const footerLinkClass =
  "text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]";

const sectionLabelClass =
  "text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]";

export function SiteFooter() {
  return (
    <footer className="bg-[var(--bg-elevated)]/80 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex">
              <SiteWordmark className="text-lg font-semibold tracking-tight text-[var(--text)]" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
              {SITE_TAGLINE}
            </p>
            <p className="max-w-sm text-[0.6875rem] leading-relaxed text-[var(--text-muted)]/80">
              {VALVE_DISCLAIMER}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className={sectionLabelClass}>Tools</h2>
            <ul className="space-y-2">
              {FOOTER_TOOL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className={sectionLabelClass}>Community</h2>
            <ul className="space-y-2">
              <li>
                <a
                  href={SITE_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className={sectionLabelClass}>Data &amp; Legal</h2>
            <ul className="space-y-2">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
