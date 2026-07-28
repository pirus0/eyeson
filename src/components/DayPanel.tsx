"use client";

import type { Occurrence } from "@/lib/occurrences";
import { creditCardCompanionDate } from "@/lib/occurrences";
import { formatDayTitle, formatShort } from "@/lib/date";
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
  creditCard: 2,
  recurringTodo: 3,
  weeklyTodo: 4,
  oneOff: 5,
} as const;

/** A very-important payment that's been handled sinks to the bottom of the
 * day's list instead of staying up top where the flame drew attention to it. */
function isSettledUrgent(occ: Occurrence): boolean {
  const { item } = occ;
  if (item.kind === "creditCard") {
    return occ.role === "due" && item.importance === "yuksek" && occ.done;
  }
  return (
    (item.kind === "bill" || item.kind === "installment") &&
    item.importance === "yuksek" &&
    occ.done
  );
}

type RowProps = {
  occ: Occurrence;
  overdue?: boolean;
  onToggleDone: (key: string, done: boolean) => void;
  onRemove: (kind: Occurrence["item"]["kind"], id: string) => void;
};

function OccurrenceRow({ occ, overdue = false, onToggleDone, onRemove }: RowProps) {
  const { item } = occ;
  const isCreditCard = item.kind === "creditCard";
  const isStatementRow = isCreditCard && occ.role === "statement";
  const amount =
    item.kind === "bill" || item.kind === "installment" || isCreditCard ? item.amount : undefined;
  const importance =
    item.kind === "bill" || item.kind === "installment" || (isCreditCard && occ.role === "due")
      ? item.importance
      : undefined;
  const companionLabel = isCreditCard
    ? `${occ.role === "due" ? "Kesim" : "Son ödeme"}: ${formatShort(
        creditCardCompanionDate(item, occ.date, occ.role!)
      )}`
    : null;

  return (
    <li className="flex items-center gap-3 border-b border-dashed border-ink-faint/40 py-3 px-1 last:border-b-0">
      {isStatementRow ? (
        <span className="h-11 w-11 shrink-0" aria-hidden />
      ) : (
        <button
          type="button"
          onClick={() => onToggleDone(occ.key, !occ.done)}
          aria-label={occ.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
          className={[
            "sketch-box flex h-11 w-11 shrink-0 items-center justify-center",
            occ.done ? "bg-ink/90 text-paper" : "text-transparent",
          ].join(" ")}
        >
          <CheckIcon className="h-4 w-4" />
        </button>
      )}

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
              occ.done ? "text-ink-faint line-through" : overdue ? "text-red-pen" : "text-ink",
            ].join(" ")}
          >
            {itemTitle(item)}
            {isStatementRow && " · kesim"}
          </p>
        </div>
        <p className={["text-xs", overdue ? "text-red-pen/80" : "text-ink-faint"].join(" ")}>
          {overdue ? formatShort(occ.date) : null}
          {amount !== undefined ? `${overdue ? " · " : ""}${formatAmount(amount)}` : null}
          {occ.installmentProgress
            ? `${amount !== undefined || overdue ? " · " : ""}${occ.installmentProgress.index}/${occ.installmentProgress.total}. taksit`
            : null}
          {companionLabel ? `${amount !== undefined ? " · " : ""}${companionLabel}` : null}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.kind, item.id)}
        aria-label="Sil"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint active:bg-graphite-wash active:text-ink-soft"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

export function DayPanel({ day, occurrences, onAdd }: Props) {
  const { setDone, removeItem } = useStore();

  const overdue = occurrences.filter((occ) => occ.carriedOverdue);
  const own = occurrences.filter((occ) => !occ.carriedOverdue);

  const sorted = [...own].sort((a, b) => {
    const aSettled = isSettledUrgent(a);
    const bSettled = isSettledUrgent(b);
    if (aSettled !== bSettled) return aSettled ? 1 : -1;
    return KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind];
  });

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

      {overdue.length > 0 && (
        <div className="mb-3">
          <p className="px-1 pb-1 font-hand text-lg text-red-pen">Gecikmiş</p>
          <ul className="flex flex-col rounded-md border border-dashed border-red-pen/40">
            {overdue.map((occ) => (
              <OccurrenceRow
                key={occ.key}
                occ={occ}
                overdue
                onToggleDone={setDone}
                onRemove={removeItem}
              />
            ))}
          </ul>
        </div>
      )}

      {sorted.length === 0 ? (
        overdue.length === 0 && (
          <p className="px-1 py-6 text-center font-hand text-xl text-ink-faint">
            Bu günde bir şey yok.
          </p>
        )
      ) : (
        <ul className="flex flex-col">
          {sorted.map((occ) => (
            <OccurrenceRow key={occ.key} occ={occ} onToggleDone={setDone} onRemove={removeItem} />
          ))}
        </ul>
      )}
    </div>
  );
}
