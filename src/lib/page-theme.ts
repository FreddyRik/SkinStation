import {
  DEFAULT_SHARE_CARD_THEME,
  SHARE_CARD_THEME_LABELS,
  SHARE_CARD_THEMES,
  isShareCardTheme,
  parseShareCardTheme,
  type ShareCardTheme,
} from "@/lib/share-card-theme";

/** Page themes reuse the share-card theme ids and labels. */
export const PAGE_THEMES = SHARE_CARD_THEMES;
export type PageTheme = ShareCardTheme;

export const DEFAULT_PAGE_THEME: PageTheme = DEFAULT_SHARE_CARD_THEME;

export const PAGE_THEME_STORAGE_KEY = "inventory-tracker-page-theme";
export const PAGE_THEME_CHANGE_EVENT = "inventory-tracker:page-theme";

export const PAGE_THEME_LABELS = SHARE_CARD_THEME_LABELS;

export type PageThemeCssVars = {
  "--bg": string;
  "--bg-elevated": string;
  "--bg-panel": string;
  "--bg-recessed": string;
  "--border": string;
  "--text": string;
  "--text-muted": string;
  "--accent": string;
  "--accent-dim": string;
  "--accent-fg": string;
  "--page-bg": string;
};

export type PageThemeStyle = {
  vars: PageThemeCssVars;
};

/**
 * Site palettes aligned with share-card themes.
 * Classic = Executive Terminal (indigo + copper).
 */
export const PAGE_THEME_STYLES: Record<PageTheme, PageThemeStyle> = {
  classic: {
    vars: {
      "--bg": "#0a0f1d",
      "--bg-elevated": "#131a2a",
      "--bg-panel": "#1a2236",
      "--bg-recessed": "#060910",
      "--border": "rgba(200, 121, 65, 0.14)",
      "--text": "#ffffff",
      "--text-muted": "#8b95a5",
      "--accent": "#c87941",
      "--accent-dim": "#e09a62",
      "--accent-fg": "#0a0f1d",
      "--page-bg":
        "radial-gradient(ellipse 90% 60% at 12% -8%, rgba(200, 121, 65, 0.16), transparent 55%), radial-gradient(ellipse 70% 50% at 92% 0%, rgba(74, 98, 168, 0.14), transparent 50%), linear-gradient(180deg, #0d1424 0%, #0a0f1d 42%, #080c18 100%)",
    },
  },
  dark: {
    vars: {
      "--bg": "#070b16",
      "--bg-elevated": "#101726",
      "--bg-panel": "#172033",
      "--bg-recessed": "#04060c",
      "--border": "rgba(200, 121, 65, 0.12)",
      "--text": "#ffffff",
      "--text-muted": "#8b95a5",
      "--accent": "#c87941",
      "--accent-dim": "#d4925c",
      "--accent-fg": "#070b16",
      "--page-bg":
        "radial-gradient(ellipse 100% 70% at 50% -10%, rgba(200, 121, 65, 0.1), transparent 55%), linear-gradient(180deg, #0a1020 0%, #070b16 40%, #05080f 100%)",
    },
  },
  midsummer: {
    vars: {
      "--bg": "#10243a",
      "--bg-elevated": "#17304a",
      "--bg-panel": "#1d3b58",
      "--bg-recessed": "#0b1828",
      "--border": "rgba(251, 191, 36, 0.18)",
      "--text": "#ffffff",
      "--text-muted": "#a5c4d8",
      "--accent": "#c87941",
      "--accent-dim": "#fbbf24",
      "--accent-fg": "#10243a",
      "--page-bg":
        "radial-gradient(ellipse 90% 60% at 85% -5%, rgba(200, 121, 65, 0.22), transparent 50%), radial-gradient(ellipse 110% 80% at 10% -10%, rgba(125, 211, 252, 0.14), transparent 55%), linear-gradient(180deg, #16324a 0%, #10243a 45%, #0e1e30 100%)",
    },
  },
};

export const isPageTheme = isShareCardTheme;
export const parsePageTheme = parseShareCardTheme;

export function applyPageTheme(theme: PageTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { vars } = PAGE_THEME_STYLES[theme];
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.pageTheme = theme;

  const themeColor = vars["--bg"];
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", themeColor);
}

export function readStoredPageTheme(): PageTheme {
  if (typeof window === "undefined") return DEFAULT_PAGE_THEME;
  try {
    return parsePageTheme(
      window.localStorage.getItem(PAGE_THEME_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_PAGE_THEME;
  }
}

export function writeStoredPageTheme(theme: PageTheme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAGE_THEME_STORAGE_KEY, theme);
    applyPageTheme(theme);
    window.dispatchEvent(
      new CustomEvent<PageTheme>(PAGE_THEME_CHANGE_EVENT, { detail: theme }),
    );
  } catch {
    // ignore quota / private mode
  }
}
