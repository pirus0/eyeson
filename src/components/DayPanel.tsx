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

const KIND_ORDER = {
  bill: 0,
  installment: 1,
  recurringTodo: 2,
  weeklyTodo: 3,
  oneOff: 4,
} as const;

export function DayPanel({ day, occurrences, onAdd }: Props) {
  const { setDone, removeItem } = useStore();

  const sorted = [...occurrences].sort(
    (a, b) => KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind]
  );

  return (
    <div className="mt-2 border-t border-dashed border-ink-faint/60 pt-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="font-hand text-2xl capitalize text-ink-soft">{formatDayTitle(day)}</h3>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Ekle"
          className="sketch-box sketch-rotate flex h-11 w-11 items-center justify-center text-ink active:bg-graphite-wash"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="px-1 py-6 text-center font-hand text-xl text-ink-faint">
          Bu günde bir şey yok.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((occ) => {
            const { item } = occ;
            const amount = item.kind === "bill" || item.kind === "installment" ? item.amount : undefined;
            const importance = item.kind === "bill" || item.kind === "installment" ? item.importance : undefined;
            return (
              <li
                key={occ.key}
                className="flex items-center gap-3 border-b border-dashed border-ink-faint/40 py-3 px-1 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setDone(occ.key, !occ.done)}
                  aria-label={occ.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
                  className={[
                    "sketch-box flex h-11 w-11 shrink-0 items-center justify-center",
                    occ.done ? "bg-ink/90 text-paper" : "text-transparent",
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
                        "truncate text-[15px] font-medium",
                        occ.done ? "text-ink-faint line-through" : "text-ink",
                      ].join(" ")}
                    >
                      {itemTitle(item)}
                    </p>
                  </div>
                  <p className="text-xs text-ink-faint">
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint active:bg-graphite-wash active:text-ink-soft"
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
