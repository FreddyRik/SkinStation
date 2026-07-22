export const SHARE_CARD_THEMES = ["classic", "dark", "midsummer"] as const;

export type ShareCardTheme = (typeof SHARE_CARD_THEMES)[number];

export const DEFAULT_SHARE_CARD_THEME: ShareCardTheme = "classic";

export const SHARE_CARD_THEME_STORAGE_KEY = "inventory-tracker-share-theme";

export const SHARE_CARD_THEME_LABELS: Record<ShareCardTheme, string> = {
  classic: "Classic",
  dark: "Dark",
  midsummer: "Midsummer",
};

export type ShareCardThemeStyle = {
  background: string;
  boxShadow: string;
  gridOverlay: string;
  avatarRing: string;
  panelBg: string;
  panelBorder: string;
  rowBg: string;
  rowBorder: string;
  iconBg: string;
  badgeText: string;
  /** CSS variables scoped to the card */
  vars: {
    "--share-text": string;
    "--share-text-muted": string;
    "--share-accent": string;
    "--share-accent-dim": string;
    "--share-border": string;
  };
};

export const SHARE_CARD_THEME_STYLES: Record<
  ShareCardTheme,
  ShareCardThemeStyle
> = {
  classic: {
    background:
      "radial-gradient(ellipse 120% 80% at 0% 0%, rgba(94,234,212,0.22), transparent 55%), radial-gradient(ellipse 90% 70% at 100% 10%, rgba(255,107,53,0.18), transparent 50%), linear-gradient(165deg, #14201b 0%, #0c1210 48%, #101816 100%)",
    boxShadow:
      "0 0 0 1px rgba(94,234,212,0.18), 0 28px 60px rgba(0,0,0,0.45)",
    gridOverlay:
      "linear-gradient(rgba(232,240,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,240,235,0.04) 1px, transparent 1px)",
    avatarRing: "0 0 0 2px rgba(94,234,212,0.35)",
    panelBg: "rgba(0,0,0,0.25)",
    panelBorder: "rgba(255,255,255,0.1)",
    rowBg: "rgba(255,255,255,0.04)",
    rowBorder: "rgba(255,255,255,0.08)",
    iconBg: "rgba(0,0,0,0.4)",
    badgeText: "#0c1210",
    vars: {
      "--share-text": "#e8f0eb",
      "--share-text-muted": "#8fa399",
      "--share-accent": "#5eead4",
      "--share-accent-dim": "#2dd4bf",
      "--share-border": "#24332c",
    },
  },
  dark: {
    background:
      "radial-gradient(ellipse 100% 70% at 50% 0%, rgba(100,116,139,0.18), transparent 55%), linear-gradient(180deg, #0a0a0b 0%, #111113 45%, #080809 100%)",
    boxShadow:
      "0 0 0 1px rgba(148,163,184,0.16), 0 28px 60px rgba(0,0,0,0.65)",
    gridOverlay:
      "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
    avatarRing: "0 0 0 2px rgba(148,163,184,0.35)",
    panelBg: "rgba(255,255,255,0.04)",
    panelBorder: "rgba(148,163,184,0.16)",
    rowBg: "rgba(255,255,255,0.035)",
    rowBorder: "rgba(148,163,184,0.12)",
    iconBg: "rgba(0,0,0,0.55)",
    badgeText: "#0a0a0b",
    vars: {
      "--share-text": "#f1f5f9",
      "--share-text-muted": "#94a3b8",
      "--share-accent": "#e2e8f0",
      "--share-accent-dim": "#94a3b8",
      "--share-border": "#1e293b",
    },
  },
  midsummer: {
    background:
      "radial-gradient(ellipse 90% 60% at 85% 8%, rgba(251,191,36,0.32), transparent 50%), radial-gradient(ellipse 110% 80% at 10% 0%, rgba(125,211,252,0.28), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(52,211,153,0.14), transparent 45%), linear-gradient(165deg, #1e3a5f 0%, #16324a 40%, #1a2e28 100%)",
    boxShadow:
      "0 0 0 1px rgba(251,191,36,0.22), 0 28px 60px rgba(15,40,60,0.5)",
    gridOverlay:
      "linear-gradient(rgba(224,242,254,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(224,242,254,0.05) 1px, transparent 1px)",
    avatarRing: "0 0 0 2px rgba(251,191,36,0.45)",
    panelBg: "rgba(15,40,60,0.35)",
    panelBorder: "rgba(125,211,252,0.22)",
    rowBg: "rgba(255,255,255,0.06)",
    rowBorder: "rgba(125,211,252,0.14)",
    iconBg: "rgba(15,40,60,0.55)",
    badgeText: "#16324a",
    vars: {
      "--share-text": "#f0f9ff",
      "--share-text-muted": "#a5c4d8",
      "--share-accent": "#fbbf24",
      "--share-accent-dim": "#7dd3fc",
      "--share-border": "#2a4a66",
    },
  },
};

export function isShareCardTheme(value: unknown): value is ShareCardTheme {
  return (
    value === "classic" || value === "dark" || value === "midsummer"
  );
}

export function parseShareCardTheme(
  value: unknown,
  fallback: ShareCardTheme = DEFAULT_SHARE_CARD_THEME,
): ShareCardTheme {
  return isShareCardTheme(value) ? value : fallback;
}

export function readStoredShareCardTheme(): ShareCardTheme {
  if (typeof window === "undefined") return DEFAULT_SHARE_CARD_THEME;
  try {
    return parseShareCardTheme(
      window.localStorage.getItem(SHARE_CARD_THEME_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_SHARE_CARD_THEME;
  }
}

export function writeStoredShareCardTheme(theme: ShareCardTheme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SHARE_CARD_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
}
