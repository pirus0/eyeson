import type { AnyItem, Importance } from "./types";

export type ItemKind = AnyItem["kind"];

export const KIND_LABELS: Record<ItemKind, string> = {
  bill: "Fatura / Abonelik",
  installment: "Taksit",
  recurringTodo: "Günlük Görev",
  weeklyTodo: "Haftalık Görev",
  oneOff: "Tek Seferlik",
};

// Muted, colored-pencil-style dots rather than bright saturated UI colors.
export const KIND_DOT_CLASS: Record<ItemKind, string> = {
  bill: "bg-[#a8442c]", // red pen
  installment: "bg-[#3d6b8a]", // blue pencil
  recurringTodo: "bg-[#5c7a4a]", // green pencil
  weeklyTodo: "bg-[#8a6d3b]", // ochre pencil
  oneOff: "bg-[#6b5b8a]", // violet pencil
};

export const IMPORTANCE_DOT_CLASS: Record<Importance, string> = {
  yuksek: "bg-[#a8442c]",
  orta: "bg-[#b8873f]",
  dusuk: "bg-ink-faint",
};

export function itemTitle(item: AnyItem): string {
  if (item.kind === "bill" || item.kind === "installment") return item.name;
  return item.title;
}

export function formatAmount(amount?: number): string {
  if (amount === undefined) return "";
  return amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " TL";
}
