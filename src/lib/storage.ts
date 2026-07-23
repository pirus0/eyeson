import type { StoreData } from "./types";

const STORAGE_KEY = "eyeson-data-v1";
const UPDATED_AT_KEY = "eyeson-data-updated-at";

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
    return emptyData();
  }
}

export function saveData(data: StoreData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.localStorage.setItem(UPDATED_AT_KEY, String(Date.now()));
}

/** Timestamp of the last local write, used to decide whether a pulled Gist
 * backup is actually newer than what's already on this device. */
export function getLocalUpdatedAt(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(UPDATED_AT_KEY)) || 0;
}
