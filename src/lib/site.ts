import type { Metadata } from "next";
import type { SiteNavLink } from "@/types/nav";

export const SITE_GITHUB_URL = "https://github.com/FreddyRik/SkinStation";

export const SITE_NAME = "SkinStation";
export const VALVE_DISCLAIMER =
  "Not affiliated with Valve or Steam. CS2 trademarks and assets belong to Valve Corporation.";

export const SITE_TAGLINE =
  "Your one-stop for CS2 inventory tracking, the skin catalog, and trade-up odds.";

export const SITE_DESCRIPTION =
  "CS2 inventory tracker, skin database, and trade-up calculator. Track Steam inventory with floats, Buff163 and Steam Market prices, and trade-up odds.";

export const SITE_HOME_TITLE =
  "SkinStation — CS2 Inventory Tracker & Trade-up Calculator";

/** Outbound HTTP User-Agent for server-side fetches. */
export const SITE_USER_AGENT = "SkinStation/1.0";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3001";
}

export const SITE_URL = resolveSiteUrl();

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function sitePageTitle(page: string): string {
  return `${page} · ${SITE_NAME}`;
}

type BuildPageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noIndex,
}: BuildPageMetadataOptions): Metadata {
  const canonical = path ? absoluteUrl(path) : undefined;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : absoluteUrl(image)
    : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      title: SITE_HOME_TITLE,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_HOME_TITLE,
      description: SITE_DESCRIPTION,
    },
  };
}

export const PRIMARY_NAV_LINKS: readonly SiteNavLink[] = [
  {
    href: "/inventory",
    label: "Inventory",
    code: "INV",
    match: (pathname) =>
      pathname === "/inventory" || pathname.startsWith("/inventory/"),
  },
  {
    href: "/database",
    label: "Database",
    code: "DB",
    match: (pathname) =>
      pathname.startsWith("/database") || pathname.startsWith("/collections"),
  },
  {
    href: "/tradeup",
    label: "Trade-up",
    code: "TU",
    match: (pathname) => pathname.startsWith("/tradeup"),
  },
];

export const FOOTER_LEGAL_LINKS = [
  { href: "/status", label: "Roadmap & Limitations" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;
