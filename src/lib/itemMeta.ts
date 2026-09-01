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
  yuksek: "bg-[#a8442c]",
  orta: "bg-[#b8873f]",
  dusuk: "bg-ink-faint",
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
  "min-h-11 border-0 border-b-[1.5px] border-ink-faint/70 bg-transparent px-1 text-base text-ink placeholder:text-ink-faint/70 focus:border-ink focus:outline-none";
