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

export function withDefaults(parsed: Partial<StoreData>): StoreData {
  return {
    bills: parsed.bills ?? [],
    installments: parsed.installments ?? [],
    recurringTodos: parsed.recurringTodos ?? [],
    weeklyTodos: parsed.weeklyTodos ?? [],
    oneOffs: parsed.oneOffs ?? [],
    creditCards: parsed.creditCards ?? [],
    completions: parsed.completions ?? {},
  };
}

export function isEmpty(d: StoreData): boolean {
  return (
    !d.bills.length &&
    !d.installments.length &&
    !d.recurringTodos.length &&
    !d.weeklyTodos.length &&
    !d.oneOffs.length &&
    !d.creditCards.length &&
    !Object.keys(d.completions).length
  );
}

/** Keeps a copy of this device's data before the cloud copy replaces it. */
export function stashLocal(data: StoreData): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY}-onceki-${Date.now()}`, JSON.stringify(data));
  } catch {}
}

export function loadData(): StoreData {
  if (typeof window === "undefined") return emptyData();
  // Leftovers from the old GitHub Gist backup, which needed a token.
  window.localStorage.removeItem("eyeson-gh-token");
  window.localStorage.removeItem("eyeson-gist-id");
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return withDefaults(JSON.parse(raw) as Partial<StoreData>);
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
