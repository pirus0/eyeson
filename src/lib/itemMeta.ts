import type { AnyItem, Importance } from "./types";

export type ItemKind = AnyItem["kind"];

export const KIND_LABELS: Record<ItemKind, string> = {
  bill: "Fatura / Abonelik",
  installment: "Taksit",
  creditCard: "Kredi Kartı",
  recurringTodo: "Günlük Görev",
  weeklyTodo: "Haftalık Görev",
  oneOff: "Tek Seferlik",
};

export const IMPORTANCE_DOT_CLASS: Record<Importance, string> = {
  yuksek: "bg-iris",
  orta: "bg-amber",
  dusuk: "bg-ink-faint",
};

/** Short kind label shown as a chip on each row. */
export const KIND_SHORT: Record<ItemKind, string> = {
  bill: "Fatura",
  installment: "Taksit",
  creditCard: "Kart",
  recurringTodo: "Günlük",
  weeklyTodo: "Haftalık",
  oneOff: "Görev",
};

export function itemTitle(item: AnyItem): string {
  if (item.kind === "bill" || item.kind === "installment" || item.kind === "creditCard") {
    return item.name;
  }
  return item.title;
}

export function formatAmount(amount?: number): string {
  if (amount === undefined) return "";
  return amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " TL";
}

/** Shared text-input look for every add/assign form field. */
export const INPUT_CLASS =
  "min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-200 focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5";

/** Small uppercase label above each form field. */
export const FIELD_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint";
