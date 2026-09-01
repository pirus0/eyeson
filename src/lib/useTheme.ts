"use client";

import { useCallback, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, getSystemTheme, storeTheme, type Theme } from "./theme";

/** Current theme plus a toggle — the single source both the (now removed)
 * standalone theme button and the "Eyes On" double-tap gesture drive. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current =
      (document.documentElement.dataset.theme as Theme | undefined) ??
      getStoredTheme() ??
      getSystemTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
