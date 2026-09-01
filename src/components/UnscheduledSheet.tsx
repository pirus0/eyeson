"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { unscheduledOneOffs } from "@/lib/occurrences";
import { fromKey, todayKey } from "@/lib/date";
import { type Importance } from "@/lib/types";
import { INPUT_CLASS } from "@/lib/itemMeta";
import { QuestionIcon, TrashIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { ImportanceSelector } from "./ImportanceSelector";
import { Sheet } from "./Sheet";

type Props = {
  onSelectDate: (date: Date) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

  const items = useMemo(() => unscheduledOneOffs(data), [data]);

  return (
    <>
      <IconButton
        onClick={() => onOpenChange(true)}
        ariaLabel="Zamanı belirsiz görevler"
        className="relative text-ink"
      >
        <QuestionIcon className="h-5 w-5" />
        {items.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pencil px-1 text-[10px] font-semibold text-paper">
            {items.length}
          </span>
        )}
      </IconButton>

      <Sheet open={open} onClose={() => onOpenChange(false)} title="Zamanı belirsiz">
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
      </Sheet>
    </>
  );
}
