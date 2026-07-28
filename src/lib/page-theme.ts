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
};

/**
 * Site palettes aligned with share-card themes (classic = current default look).
 */
export const PAGE_THEME_STYLES: Record<PageTheme, PageThemeStyle> = {
  classic: {
    vars: {
      "--bg": "#0c1210",
      "--bg-elevated": "#121a17",
      "--bg-panel": "#16211c",
      "--border": "#24332c",
      "--text": "#e8f0eb",
      "--text-muted": "#8fa399",
      "--accent": "#5eead4",
      "--accent-dim": "#2dd4bf",
      "--accent-fg": "#042f2e",
      "--page-bg":
        "radial-gradient(ellipse 90% 60% at 10% -10%, rgba(94, 234, 212, 0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 0%, rgba(255, 107, 53, 0.08), transparent 50%), linear-gradient(180deg, #0e1613 0%, #0c1210 40%, #0a0f0d 100%)",
    },
  },
  dark: {
    vars: {
      "--bg": "#0a0a0b",
      "--bg-elevated": "#111113",
      "--bg-panel": "#151518",
      "--border": "#1e293b",
      "--text": "#f1f5f9",
      "--text-muted": "#94a3b8",
      "--accent": "#e2e8f0",
      "--accent-dim": "#94a3b8",
      "--accent-fg": "#0a0a0b",
      "--page-bg":
        "radial-gradient(ellipse 100% 70% at 50% -10%, rgba(100, 116, 139, 0.16), transparent 55%), linear-gradient(180deg, #0c0c0e 0%, #0a0a0b 40%, #080809 100%)",
    },
  },
  midsummer: {
    vars: {
      "--bg": "#16324a",
      "--bg-elevated": "#1a3a55",
      "--bg-panel": "#1e405c",
      "--border": "#2a4a66",
      "--text": "#f0f9ff",
      "--text-muted": "#a5c4d8",
      "--accent": "#fbbf24",
      "--accent-dim": "#7dd3fc",
      "--accent-fg": "#16324a",
      "--page-bg":
        "radial-gradient(ellipse 90% 60% at 85% -5%, rgba(251, 191, 36, 0.22), transparent 50%), radial-gradient(ellipse 110% 80% at 10% -10%, rgba(125, 211, 252, 0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(52, 211, 153, 0.1), transparent 45%), linear-gradient(180deg, #1e3a5f 0%, #16324a 45%, #1a2e28 100%)",
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
