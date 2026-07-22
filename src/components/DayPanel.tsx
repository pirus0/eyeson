"use client";

import type { Occurrence } from "@/lib/occurrences";
import { formatDayTitle } from "@/lib/date";
import { formatAmount, itemTitle, IMPORTANCE_DOT_CLASS } from "@/lib/itemMeta";
import { CheckIcon, PlusIcon, TrashIcon } from "./Icons";
import { useStore } from "@/lib/store";

type Props = {
  day: Date;
  occurrences: Occurrence[];
  onAdd: () => void;
};

export function DayPanel({ day, occurrences, onAdd }: Props) {
  const { setDone, removeItem } = useStore();

  const sorted = [...occurrences].sort((a, b) => {
    const order = { bill: 0, installment: 1, recurringTodo: 2, oneOff: 3 } as const;
    return order[a.item.kind] - order[b.item.kind];
  });

  return (
    <div className="border-t border-zinc-200 pt-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-sm font-medium capitalize text-zinc-700">{formatDayTitle(day)}</h3>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Ekle"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white active:bg-zinc-700"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-zinc-400">Bu günde bir şey yok.</p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((occ) => {
            const { item } = occ;
            const amount = item.kind === "bill" || item.kind === "installment" ? item.amount : undefined;
            const importance = item.kind === "bill" || item.kind === "installment" ? item.importance : undefined;
            return (
              <li
                key={occ.key}
                className="flex items-center gap-3 border-b border-zinc-100 py-3 px-1 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setDone(item.id, occ.dateKey, !occ.done)}
                  aria-label={occ.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                    occ.done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-300 text-transparent",
                  ].join(" ")}
                >
                  <CheckIcon className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {importance && (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${IMPORTANCE_DOT_CLASS[importance]}`}
                        title="Önem"
                      />
                    )}
                    <p
                      className={[
                        "truncate text-sm font-medium",
                        occ.done ? "text-zinc-400 line-through" : "text-zinc-900",
                      ].join(" ")}
                    >
                      {itemTitle(item)}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {amount !== undefined ? formatAmount(amount) : null}
                    {occ.installmentProgress
                      ? `${amount !== undefined ? " · " : ""}${occ.installmentProgress.index}/${occ.installmentProgress.total}. taksit`
                      : null}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.kind, item.id)}
                  aria-label="Sil"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-300 active:bg-zinc-100 active:text-zinc-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
