export const SITE_GITHUB_URL = "https://github.com/FreddyRik";

export const SITE_NAME = "SkinStation";
export const VALVE_DISCLAIMER =
  "Not affiliated with Valve or Steam. CS2 trademarks and assets belong to Valve Corporation.";

export const SITE_TAGLINE =
  "Your one-stop for CS2 inventory tracking, the skin catalog, and trade-up odds.";

export const SITE_DESCRIPTION =
  "Track your CS2 inventory, browse the skin catalog, and run trade-up odds — all in one place.";

/** Outbound HTTP User-Agent for server-side fetches. */
export const SITE_USER_AGENT = "SkinStation/1.0";

export function sitePageTitle(page: string): string {
  return `${page} · ${SITE_NAME}`;
}

export const FOOTER_TOOL_LINKS = [
  { href: "/inventory", label: "Inventory Search" },
  { href: "/database", label: "Skin Database" },
  { href: "/tradeup", label: "Trade-Up Calculator" },
] as const;

export const FOOTER_LEGAL_LINKS = [
  { href: "/status", label: "Roadmap & Limitations" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;
