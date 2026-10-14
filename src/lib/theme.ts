export type Theme = "light" | "dark";

const STORAGE_KEY = "eyeson-theme";

export function getStoredTheme(): Theme | null {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  // Keep the browser/status bar tint in step with the in-app toggle, not
  // just the OS preference the static <meta> tags describe.
  const color = theme === "dark" ? "#11100e" : "#efebe2";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

export function storeTheme(theme: Theme): void {
  window.localStorage.setItem(STORAGE_KEY, theme);
}
