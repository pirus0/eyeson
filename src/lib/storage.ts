import type { StoreData } from "./types";

const STORAGE_KEY = "eyeson-data-v1";

export function emptyData(): StoreData {
  return {
    bills: [],
    installments: [],
    recurringTodos: [],
    oneOffs: [],
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
      oneOffs: parsed.oneOffs ?? [],
      completions: parsed.completions ?? {},
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data: StoreData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
