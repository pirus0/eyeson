import type { AnyItem, Importance } from "./types";

export type ItemKind = AnyItem["kind"];

export const KIND_LABELS: Record<ItemKind, string> = {
  bill: "Fatura / Abonelik",
  installment: "Taksit",
  recurringTodo: "Günlük Görev",
  oneOff: "Tek Seferlik",
};

export const KIND_DOT_CLASS: Record<ItemKind, string> = {
  bill: "bg-amber-400",
  installment: "bg-sky-400",
  recurringTodo: "bg-emerald-400",
  oneOff: "bg-violet-400",
};

export const IMPORTANCE_DOT_CLASS: Record<Importance, string> = {
  yuksek: "bg-red-500",
  orta: "bg-amber-500",
  dusuk: "bg-zinc-400",
};

export function itemTitle(item: AnyItem): string {
  if (item.kind === "bill" || item.kind === "installment") return item.name;
  return item.title;
}

export function formatAmount(amount?: number): string {
  if (amount === undefined) return "";
  return amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " TL";
}
