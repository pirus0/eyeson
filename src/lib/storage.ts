import type { StoreData } from "./types";

const STORAGE_KEY = "eyeson-data-v1";

export function emptyData(): StoreData {
  return {
    bills: [],
    installments: [],
    recurringTodos: [],
    weeklyTodos: [],
    oneOffs: [],
    creditCards: [],
    completions: {},
  };
}

export function loadData(): StoreData {
  if (typeof window === "undefined") return emptyData();
  // Leftovers from the old GitHub Gist backup, which needed a token.
  window.localStorage.removeItem("eyeson-gh-token");
  window.localStorage.removeItem("eyeson-gist-id");
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      bills: parsed.bills ?? [],
      installments: parsed.installments ?? [],
      recurringTodos: parsed.recurringTodos ?? [],
      weeklyTodos: parsed.weeklyTodos ?? [],
      oneOffs: parsed.oneOffs ?? [],
      creditCards: parsed.creditCards ?? [],
      completions: parsed.completions ?? {},
    };
  } catch {
    // Unreadable data is set aside before starting empty: the next save
    // would otherwise overwrite the only copy.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) window.localStorage.setItem(`${STORAGE_KEY}-bozuk-${Date.now()}`, raw);
    } catch {}
    return emptyData();
  }
}

/** False when the phone refused the write (storage full or blocked). */
export function saveData(data: StoreData): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
