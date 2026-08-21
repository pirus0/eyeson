"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { unscheduledOneOffs } from "@/lib/occurrences";
import { fromKey, todayKey } from "@/lib/date";
import { IMPORTANCE_LABELS, type Importance } from "@/lib/types";
import { QuestionIcon, CloseIcon, TrashIcon } from "./Icons";

type Props = {
  onSelectDate: (date: Date) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const inputClass =
  "min-h-11 border-0 border-b-[1.5px] border-ink-faint/70 bg-transparent px-1 text-base text-ink placeholder:text-ink-faint/70 focus:border-ink focus:outline-none";

function AssignRow({
  id,
  title,
  onDone,
}: {
  id: string;
  title: string;
  onDone: (date: Date) => void;
}) {
  const { assignOneOff, removeItem } = useStore();
  const [assigning, setAssigning] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [importance, setImportance] = useState<Importance>("orta");

  function handleSave() {
    if (!date) return;
    assignOneOff(id, { date, importance });
    onDone(fromKey(date));
  }

  return (
    <li className="border-b border-dashed border-ink-faint/40 py-3 px-1 last:border-b-0">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{title}</p>
        {!assigning && (
          <>
            <button
              type="button"
              onClick={() => setAssigning(true)}
              className="sketch-box shrink-0 px-3 py-1.5 text-sm font-medium text-ink"
            >
              Ata
            </button>
            <button
              type="button"
              onClick={() => removeItem("oneOff", id)}
              aria-label="Sil"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint active:bg-graphite-wash active:text-ink-soft"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {assigning && (
        <div className="mt-3 flex flex-col gap-3 pl-1">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Tarih
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <div className="flex flex-col gap-1 text-sm text-ink-soft">
            Önem
            <div className="grid grid-cols-3 gap-2">
              {(["yuksek", "orta", "dusuk"] as Importance[]).map((imp) => (
                <button
                  key={imp}
                  type="button"
                  onClick={() => setImportance(imp)}
                  className={[
                    "sketch-box min-h-11 text-sm font-medium",
                    importance === imp ? "bg-ink text-paper" : "text-ink-soft",
                  ].join(" ")}
                >
                  {IMPORTANCE_LABELS[imp]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!date}
              className="sketch-box min-h-11 flex-1 bg-ink font-hand text-lg text-paper disabled:opacity-50 active:bg-pencil"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setAssigning(false)}
              className="sketch-box min-h-11 px-4 text-sm text-ink-soft"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function UnscheduledSheet({ onSelectDate, open, onOpenChange }: Props) {
  const { data } = useStore();
  useBodyScrollLock(open);

  const items = unscheduledOneOffs(data);

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Zamanı belirsiz görevler"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-graphite-wash"
      >
        <QuestionIcon className="h-5 w-5" />
        {items.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pencil px-1 text-[10px] font-semibold text-paper">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/20 sm:items-center">
          <div className="sketch-box max-h-[85vh] w-full max-w-md overflow-y-auto overscroll-contain bg-paper p-4 pb-8 shadow-[0_2px_0_var(--pencil)] sm:rounded-none">
            <div className="flex items-center justify-between pb-2">
              <h2 className="font-hand text-2xl text-ink">Zamanı belirsiz</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Kapat"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center font-hand text-xl text-ink-faint">
                Günü belirsiz görev yok.
              </p>
            ) : (
              <>
                <p className="px-1 pb-2 text-xs text-ink-faint">
                  Günü ve zamanı henüz belirlenmemiş görevler. Hazır olduğunda ata.
                </p>
                <ul className="flex flex-col">
                  {items.map((o) => (
                    <AssignRow
                      key={o.id}
                      id={o.id}
                      title={o.title}
                      onDone={(date) => {
                        onSelectDate(date);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
