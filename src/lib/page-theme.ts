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
  swatches: [string, string, string];
};

/**
 * Site palettes aligned with share-card themes (classic = current default look).
 */
export const PAGE_THEME_STYLES: Record<PageTheme, PageThemeStyle> = {
  classic: {
    swatches: ["#ff6b35", "#0b0d12", "#ff8a5c"],
    vars: {
      "--bg": "#0b0d12",
      "--bg-elevated": "#12151c",
      "--bg-panel": "#161a22",
      "--border": "#2a3140",
      "--text": "#eef1f5",
      "--text-muted": "#8b93a3",
      "--accent": "#ff6b35",
      "--accent-dim": "#e85d2a",
      "--accent-fg": "#1a0e08",
      "--page-bg":
        "radial-gradient(ellipse 70% 55% at 50% 28%, rgba(255, 107, 53, 0.18), transparent 58%), linear-gradient(180deg, #10141c 0%, #0b0d12 42%, #090b10 100%)",
    },
  },
  midsummer: {
    swatches: ["#ffe566", "#38d9f0", "#f472b6"],
    vars: {
      "--bg": "#160e38",
      "--bg-elevated": "#1e1448",
      "--bg-panel": "#261a58",
      "--border": "#5a4588",
      "--text": "#faf5eb",
      "--text-muted": "#b8a8d8",
      "--accent": "#ffe566",
      "--accent-dim": "#38d9f0",
      "--accent-fg": "#1a1040",
      "--page-bg":
        "radial-gradient(ellipse 95% 70% at 88% -8%, rgba(255, 229, 102, 0.38), transparent 48%), radial-gradient(ellipse 100% 85% at 6% 5%, rgba(56, 217, 240, 0.32), transparent 52%), radial-gradient(ellipse 80% 60% at 50% 102%, rgba(244, 114, 182, 0.28), transparent 55%), linear-gradient(180deg, #1a1040 0%, #160e38 42%, #1c1248 100%)",
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
