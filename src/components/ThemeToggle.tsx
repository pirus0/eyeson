"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icons";
import { applyTheme, getStoredTheme, getSystemTheme, storeTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme | undefined)
      ?? getStoredTheme()
      ?? getSystemTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  if (!theme) return null;

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    storeTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Aydınlık moda geç" : "Karanlık moda geç"}
      className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
    >
      {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
