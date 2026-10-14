"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { unscheduledOneOffs } from "@/lib/occurrences";
import { fromKey, todayKey } from "@/lib/date";
import { type Importance } from "@/lib/types";
import { FIELD_LABEL_CLASS, INPUT_CLASS } from "@/lib/itemMeta";
import { AnimatePresence, motion } from "motion/react";
import { PlusIcon, QuestionIcon, TrashIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { ImportanceSelector } from "./ImportanceSelector";

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
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="rounded-2xl px-3 py-2.5"
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[15px] font-medium text-ink">{title}</p>
        {!assigning && (
          <>
            <button
              type="button"
              onClick={() => setAssigning(true)}
              className="press h-9 shrink-0 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper"
            >
              Ata
            </button>
            <button
              type="button"
              onClick={() => removeItem("oneOff", id)}
              aria-label="Sil"
              className="press -mr-2 flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint/70 hover:text-ink-soft active:text-iris"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
      {assigning && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
        <div className="flex flex-col gap-3 pt-3">
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>Tarih</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>Önem</span>
            <ImportanceSelector value={importance} onChange={setImportance} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!date}
              className="press min-h-11 flex-1 rounded-full bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setAssigning(false)}
              className="press min-h-11 rounded-full px-4 text-[15px] font-medium text-ink-soft hover:bg-ink/5"
            >
              Vazgeç
            </button>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.li>
  );
}

type ButtonProps = {
  active: boolean;
  onClick: () => void;
};

/** Header trigger — toggles the inline panel below the calendar (see
 * UnscheduledPanel) instead of opening a full-screen sheet, so the calendar
 * stays visible while browsing undated tasks. */
export function UnscheduledButton({ active, onClick }: ButtonProps) {
  const { data } = useStore();
  const count = useMemo(() => unscheduledOneOffs(data).length, [data]);

  return (
    <IconButton
      onClick={onClick}
      ariaLabel="Zamanı belirsiz görevler"
      className={active ? "bg-ink text-paper" : "text-ink"}
    >
      <QuestionIcon className="h-[22px] w-[22px]" />
      {count > 0 && (
        <span className="tabular absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-soft px-1 text-[10px] font-bold text-paper">
          {count}
        </span>
      )}
    </IconButton>
  );
}

type PanelProps = {
  onSelectDate: (date: Date) => void;
  onAdd: () => void;
};

/** Replaces DayPanel in the same slot below the calendar while active — it
 * intentionally does NOT cover the calendar or header, just the space a
 * selected day's list would otherwise take. */
export function UnscheduledPanel({ onSelectDate, onAdd }: PanelProps) {
  const { data } = useStore();
  const items = useMemo(() => unscheduledOneOffs(data), [data]);

  return (
    <section className="mt-3 rounded-[28px] bg-surface px-2 pt-4 pb-3 shadow-[0_1px_0_var(--line),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 text-ink">
            <QuestionIcon className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <h3 className="font-display text-[20px] font-semibold tracking-tight text-ink">
              Zamanı belirsiz
            </h3>
            <p className="text-[13px] text-ink-faint">
              {items.length > 0 ? `${items.length} görev bekliyor` : "Günü belli olmayanlar"}
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onAdd}
          aria-label="Ekle"
          whileTap={{ scale: 0.9, rotate: 90 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-iris text-on-iris shadow-[0_8px_20px_-8px_var(--iris)]"
        >
          <PlusIcon className="h-[22px] w-[22px]" />
        </motion.button>
      </div>

      {items.length === 0 ? (
        <p className="px-3 pt-4 pb-6 text-center text-[14px] text-ink-faint">
          Günü belirsiz görev yok.
        </p>
      ) : (
        <>
          <p className="px-3 pb-2 text-[12px] text-ink-faint">
            Günü ve zamanı henüz belirlenmemiş görevler. Hazır olduğunda ata.
          </p>
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {items.map((o) => (
                <AssignRow key={o.id} id={o.id} title={o.title} onDone={onSelectDate} />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </section>
  );
}
