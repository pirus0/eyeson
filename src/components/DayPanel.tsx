"use client";

import type { Occurrence } from "@/lib/occurrences";
import { creditCardCompanionDate, occurrenceAmount, occurrenceImportance } from "@/lib/occurrences";
import { useState } from "react";
import type { CompletionMap, Importance } from "@/lib/types";
import { formatDayTitle, formatShort, todayKey } from "@/lib/date";
import { formatAmount, itemTitle, IMPORTANCE_DOT_CLASS, INPUT_CLASS } from "@/lib/itemMeta";
import { CheckIcon, PlusIcon, ReassignIcon, TrashIcon } from "./Icons";
import { ImportanceSelector } from "./ImportanceSelector";
import { useStore } from "@/lib/store";

type Props = {
  day: Date;
  occurrences: Occurrence[];
  onAdd: () => void;
};

const IMPORTANCE_RANK: Record<string, number> = {
  yuksek: 0,
  orta: 1,
  dusuk: 2,
};

function importanceRank(occ: Occurrence): number {
  const importance = occurrenceImportance(occ);
  return importance ? IMPORTANCE_RANK[importance] : 2;
}

/** Moment the item should be considered "ticked" for ordering purposes: when
 * it was checked off if done, else when it was created — so ties don't
 * reshuffle on every toggle. */
function tickOrder(occ: Occurrence, completions: CompletionMap): string {
  if (occ.done) return completions[occ.key]?.doneAt ?? occ.item.createdAt;
  return occ.item.createdAt;
}

/** Three-level sort: not-done before done (a done item never stays up top
 * just because it's high-importance — it always sinks below every pending
 * item); within each of those groups, importance order (yüksek > orta >
 * düşük/none); within a matching importance tier, tick order. */
function sortOccurrences(occs: Occurrence[], completions: CompletionMap): Occurrence[] {
  return [...occs].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ra = importanceRank(a);
    const rb = importanceRank(b);
    if (ra !== rb) return ra - rb;
    return tickOrder(a, completions).localeCompare(tickOrder(b, completions));
  });
}

type RowProps = {
  occ: Occurrence;
  overdue?: boolean;
  onToggleDone: (key: string, done: boolean) => void;
  onRemove: (kind: Occurrence["item"]["kind"], id: string) => void;
};

/** Inline "move to another day" form under an overdue one-off task —
 * payments can't be reassigned (their due date is fixed), recurring todos
 * come back on their own. */
function ReassignForm({
  id,
  initialImportance,
  onClose,
}: {
  id: string;
  initialImportance?: Importance;
  onClose: () => void;
}) {
  const { assignOneOff } = useStore();
  const [date, setDate] = useState(todayKey());
  const [importance, setImportance] = useState<Importance>(initialImportance ?? "orta");

  return (
    <div className="flex flex-col gap-3 px-1 pb-3">
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Yeni tarih
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-ink-soft">
        Önem
        <ImportanceSelector value={importance} onChange={setImportance} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!date) return;
            assignOneOff(id, { date, importance });
            onClose();
          }}
          disabled={!date}
          className="sketch-box min-h-11 flex-1 bg-ink font-hand text-lg text-paper disabled:opacity-50 active:bg-pencil"
        >
          Kaydet
        </button>
        <button
          type="button"
          onClick={onClose}
          className="sketch-box min-h-11 px-4 text-sm text-ink-soft"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function OccurrenceRow({ occ, overdue = false, onToggleDone, onRemove }: RowProps) {
  const [reassigning, setReassigning] = useState(false);
  const { item } = occ;
  const canReassign = overdue && item.kind === "oneOff";
  const isCreditCard = item.kind === "creditCard";
  const isStatementRow = isCreditCard && occ.role === "statement";
  const amount = occurrenceAmount(occ);
  const importance = occurrenceImportance(occ);
  const companionLabel = isCreditCard
    ? `${occ.role === "due" ? "Kesim" : "Son ödeme"}: ${formatShort(
        creditCardCompanionDate(item, occ.date, occ.role!)
      )}`
    : null;

  return (
    <li className="border-b border-dashed border-ink-faint/40 last:border-b-0">
      <div className="flex items-center gap-3 py-3 px-1">
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
                "text-[15px] font-medium",
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

        {canReassign && (
          <button
            type="button"
            onClick={() => setReassigning((v) => !v)}
            aria-label="Yeniden ata"
            aria-expanded={reassigning}
            className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-red-pen/80 active:bg-graphite-wash"
          >
            <ReassignIcon className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemove(item.kind, item.id)}
          aria-label="Sil"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint active:bg-graphite-wash active:text-ink-soft"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      {reassigning && item.kind === "oneOff" && (
        <ReassignForm
          id={item.id}
          initialImportance={item.importance}
          onClose={() => setReassigning(false)}
        />
      )}
    </li>
  );
}

export function DayPanel({ day, occurrences, onAdd }: Props) {
  const { setDone, removeItem, data } = useStore();

  const overdue = occurrences.filter((occ) => occ.carriedOverdue);
  const own = occurrences.filter((occ) => !occ.carriedOverdue);

  const sorted = sortOccurrences(own, data.completions);

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
