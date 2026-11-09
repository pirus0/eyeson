"use client";

import type { Occurrence } from "@/lib/occurrences";
import { occurrenceAmount } from "@/lib/occurrences";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { AnyItem } from "@/lib/types";
import { formatAmount } from "@/lib/itemMeta";
import { EyeMediumIcon, PlusIcon } from "./Icons";
import { useStore } from "@/lib/store";
import { sortOccurrences } from "./day/order";
import { OccurrenceRow, type OpenSwipe, type SwipeSide } from "./day/OccurrenceRow";

type Props = {
  day: Date;
  occurrences: Occurrence[];
  onAdd: () => void;
  onEdit: (item: AnyItem) => void;
};

export function DayPanel({ day, occurrences, onAdd, onEdit }: Props) {
  const { setDone, removeItem, data } = useStore();
  const [openSwipe, setOpenSwipe] = useState<OpenSwipe>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  // Stable across renders so unchanged rows can skip re-rendering.
  const onSwipeChange = useCallback(
    (key: string, side: SwipeSide | null) => setOpenSwipe(side ? { key, side } : null),
    []
  );
  const onEditOpenChange = useCallback(
    (key: string, open: boolean) => setEditKey((k) => (open ? key : k === key ? null : k)),
    []
  );
  const onEditRef = useRef(onEdit);
  useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);
  const editItem = useCallback((item: AnyItem) => onEditRef.current(item), []);
  const swipeProps = (key: string) => ({
    swipe: openSwipe?.key === key ? openSwipe.side : null,
    onSwipeChange,
    editOpen: editKey === key,
    onEditOpenChange,
    onEdit: editItem,
  });

  const overdue = occurrences.filter((occ) => occ.carriedOverdue);
  const own = occurrences.filter((occ) => !occ.carriedOverdue);

  const sorted = sortOccurrences(own, data.completions);
  const openCount = own.filter((o) => !o.done && o.role !== "statement").length;
  const openTotal = own.reduce((sum, o) => {
    if (o.done || o.role === "statement") return sum;
    return sum + (occurrenceAmount(o) ?? 0);
  }, 0);
  const dayKey = format(day, "yyyy-MM-dd");

  return (
    <section className="mt-3 rounded-[28px] bg-surface px-2 pt-4 pb-3 shadow-[0_1px_0_var(--line),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="tabular font-display text-[40px] leading-none font-semibold tracking-tight text-ink">
              {day.getDate()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] font-semibold text-ink capitalize">
                {format(day, "EEEE", { locale: tr })}
              </p>
              <p className="truncate text-[13px] text-ink-faint">
                {format(day, "LLLL yyyy", { locale: tr })}
                {openCount > 0 && ` · ${openCount} açık`}
                {openTotal > 0 && ` · ${formatAmount(openTotal)}`}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
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

      <AnimatePresence initial={false}>
        {overdue.length > 0 && (
          <motion.div
            key="overdue"
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            // Clipping is only for the height animation — once open, the
            // first row's "Düzenle" bubble may stick out above the box.
            animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="mx-1 mb-2 rounded-[22px] bg-iris-soft pt-2.5 pb-1">
              <p className="flex items-center gap-1.5 px-3 pb-0.5 text-[11px] font-semibold tracking-[0.08em] text-iris uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-iris" />
                Gecikmiş
              </p>
              <ul className="flex flex-col">
                <AnimatePresence initial={false}>
                  {overdue.map((occ) => (
                    <OccurrenceRow
                      key={occ.key}
                      occ={occ}
                      overdue
                      {...swipeProps(occ.key)}
                      onToggleDone={setDone}
                      onRemove={removeItem}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sorted.length === 0 ? (
        overdue.length === 0 && (
          <motion.div
            key={`empty-${dayKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 px-3 pt-4 pb-6 text-center"
          >
            <EyeMediumIcon className="h-5 w-9 text-ink-faint/30" />
            <p className="text-[14px] text-ink-faint">Bu günde bir şey yok.</p>
          </motion.div>
        )
      ) : (
        <ul key={dayKey} className="flex flex-col">
          <AnimatePresence>
            {sorted.map((occ, i) => (
              <OccurrenceRow
                key={occ.key}
                occ={occ}
                index={i}
                {...swipeProps(occ.key)}
                onToggleDone={setDone}
                onRemove={removeItem}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
