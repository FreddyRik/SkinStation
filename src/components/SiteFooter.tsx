import Link from "next/link";
import { SiteBrand } from "@/components/site/SiteMark";
import {
  FOOTER_LEGAL_LINKS,
  PRIMARY_NAV_LINKS,
  SITE_GITHUB_URL,
  SITE_NAME,
  SITE_TAGLINE,
  VALVE_DISCLAIMER,
} from "@/lib/site";

function FooterLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "footer-link text-sm text-[var(--text-muted)] transition hover:text-[var(--text)] focus-visible:outline-none focus-visible:text-[var(--text)]";
  const content = (
    <>
      {label}
      <span className="footer-link-arrow" aria-hidden>
        →
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-4 overflow-hidden border-t border-[var(--border)]/70 bg-[var(--bg-elevated)]/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/55 to-transparent"
      />
      <div
        aria-hidden
        className="hud-grid hud-grid-fade pointer-events-none absolute inset-0 opacity-50"
      />
      <p aria-hidden className="footer-watermark absolute -bottom-3 left-0 sm:-bottom-5">
        {SITE_NAME.toUpperCase()}
      </p>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
            >
              <SiteBrand size="lg" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
              {SITE_TAGLINE}
            </p>
            <p className="max-w-sm text-[0.6875rem] leading-relaxed text-[var(--text-muted)]/80">
              {VALVE_DISCLAIMER}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Tools
            </h2>
            <ul className="space-y-2.5">
              {PRIMARY_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Community
            </h2>
            <ul className="space-y-2.5">
              <li>
                <FooterLink href={SITE_GITHUB_URL} label="GitHub" external />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--border)]/60 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Live
          </span>
          <span>v0.1 BETA</span>
          <span>© {year}</span>
          {FOOTER_LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-[var(--text)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
