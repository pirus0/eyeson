"use client";

import { useEffect, useState } from "react";
import { isSameDay } from "./date";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Re-checks the date whenever the app regains focus/visibility, so a PWA
 * left open overnight (common for a home-screen app) doesn't keep treating
 * yesterday as "today" — stale reminder due-dates, a stuck "today" ring —
 * until the user manually reloads it. */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfToday());

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      const next = startOfToday();
      setToday((prev) => (isSameDay(prev, next) ? prev : next));
    }
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return today;
}
