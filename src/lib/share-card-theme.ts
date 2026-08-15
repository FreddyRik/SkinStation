export const SHARE_CARD_THEMES = ["classic", "midsummer"] as const;

export type ShareCardTheme = (typeof SHARE_CARD_THEMES)[number];

export const DEFAULT_SHARE_CARD_THEME: ShareCardTheme = "classic";

export const SHARE_CARD_THEME_STORAGE_KEY = "inventory-tracker-share-theme";

export const SHARE_CARD_THEME_LABELS: Record<ShareCardTheme, string> = {
  classic: "Classic",
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
      "radial-gradient(ellipse 90% 70% at 50% 8%, rgba(255,107,53,0.22), transparent 52%), linear-gradient(165deg, #161a22 0%, #0b0d12 48%, #10141c 100%)",
    boxShadow:
      "0 0 0 1px rgba(255,107,53,0.22), 0 28px 60px rgba(0,0,0,0.45)",
    gridOverlay:
      "linear-gradient(rgba(238,241,245,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,245,0.04) 1px, transparent 1px)",
    avatarRing: "0 0 0 2px rgba(255,107,53,0.4)",
    panelBg: "rgba(0,0,0,0.25)",
    panelBorder: "rgba(255,255,255,0.1)",
    rowBg: "rgba(255,255,255,0.04)",
    rowBorder: "rgba(255,255,255,0.08)",
    iconBg: "rgba(0,0,0,0.4)",
    badgeText: "#1a0e08",
    vars: {
      "--share-text": "#eef1f5",
      "--share-text-muted": "#8b93a3",
      "--share-accent": "#ff6b35",
      "--share-accent-dim": "#e85d2a",
      "--share-border": "#2a3140",
    },
  },
  midsummer: {
    background:
      "radial-gradient(ellipse 100% 75% at 92% 4%, rgba(255, 226, 102, 0.52), transparent 42%), radial-gradient(ellipse 95% 85% at 4% 12%, rgba(56, 217, 240, 0.42), transparent 48%), radial-gradient(ellipse 85% 65% at 48% 98%, rgba(244, 114, 182, 0.38), transparent 52%), linear-gradient(165deg, #1a1040 0%, #160e38 42%, #1c1248 100%)",
    boxShadow:
      "0 0 0 2px rgba(255, 226, 102, 0.42), 0 0 48px rgba(255, 210, 74, 0.22), 0 28px 60px rgba(22, 14, 56, 0.68)",
    gridOverlay:
      "linear-gradient(rgba(224, 242, 254, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(224, 242, 254, 0.06) 1px, transparent 1px)",
    avatarRing: "0 0 0 2px rgba(255, 226, 102, 0.55)",
    panelBg: "rgba(26, 16, 64, 0.45)",
    panelBorder: "rgba(56, 217, 240, 0.28)",
    rowBg: "rgba(255, 255, 255, 0.07)",
    rowBorder: "rgba(56, 217, 240, 0.18)",
    iconBg: "rgba(22, 14, 56, 0.6)",
    badgeText: "#160e38",
    vars: {
      "--share-text": "#faf5eb",
      "--share-text-muted": "#b8a8d8",
      "--share-accent": "#ffe566",
      "--share-accent-dim": "#38d9f0",
      "--share-border": "#5a4588",
    },
  },
};

export function isShareCardTheme(value: unknown): value is ShareCardTheme {
  return value === "classic" || value === "midsummer";
}

export function parseShareCardTheme(
  value: unknown,
  fallback: ShareCardTheme = DEFAULT_SHARE_CARD_THEME,
): ShareCardTheme {
  if (value === "dark") return "classic";
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
