"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { computeReminders, occurrenceAmount, type Reminder } from "@/lib/occurrences";
import { formatShort } from "@/lib/date";
import { formatAmount, itemTitle, IMPORTANCE_DOT_CLASS } from "@/lib/itemMeta";
import type { Importance } from "@/lib/types";
import { BellIcon, CheckIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";

type Props = {
  today: Date;
  onSelectDate: (date: Date) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SWIPE_DISMISS_MIN = 88;

function ReminderRow({
  reminder,
  onOpen,
  onDismiss,
}: {
  reminder: Reminder;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startXRef = useRef(0);
  const movedRef = useRef(false);
  const widthRef = useRef(280);
  const rowRef = useRef<HTMLLIElement>(null);

  function handlePointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    movedRef.current = false;
    widthRef.current = rowRef.current?.offsetWidth ?? 280;
    setDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Some browsers reject capture for synthetic/edge-case pointers; the
      // swipe still works via document-level move/up, just without capture.
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 6) movedRef.current = true;
    setDragX(delta);
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(dragX) > SWIPE_DISMISS_MIN) {
      setExiting(true);
      setDragX(dragX > 0 ? widthRef.current + 60 : -(widthRef.current + 60));
    } else {
      setDragX(0);
    }
  }

  function handleClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    onOpen();
  }

  const revealClass = dragX !== 0 ? "opacity-100" : "opacity-0";
  const amount = occurrenceAmount(reminder);
  const importance = reminder.item.importance as Importance;

  return (
    <li
      ref={rowRef}
      className="relative overflow-hidden rounded-2xl"
      onTransitionEnd={() => {
        if (exiting) onDismiss();
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-between rounded-2xl bg-ink px-5 text-paper transition-opacity ${revealClass}`}
        aria-hidden
      >
        <CheckIcon className="h-4 w-4" />
        <CheckIcon className="h-4 w-4" />
      </div>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
          touchAction: "pan-y",
        }}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left hover:bg-paper"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${IMPORTANCE_DOT_CLASS[importance]}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">{itemTitle(reminder.item)}</p>
          <p className="tabular text-[12px] text-ink-faint">
            {formatShort(reminder.date)}
            {amount !== undefined ? ` · ${formatAmount(amount)}` : ""}
          </p>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold",
            reminder.overdue
              ? "bg-iris text-on-iris"
              : reminder.daysUntilDue === 0
                ? "bg-iris-soft text-iris"
                : "bg-ink/5 text-ink-soft",
          ].join(" ")}
        >
          {reminder.overdue
            ? `${Math.abs(reminder.daysUntilDue)} gün gecikti`
            : reminder.daysUntilDue === 0
              ? "Bugün"
              : `${reminder.daysUntilDue} gün kaldı`}
        </span>
      </button>
    </li>
  );
}

export function BellMenu({ today, onSelectDate, open, onOpenChange }: Props) {
  const { data, setDone } = useStore();
  useBodyScrollLock(open);

  const reminders = useMemo(
    () => computeReminders(data, data.completions, today),
    [data, today]
  );

  return (
    <>
      <IconButton onClick={() => onOpenChange(true)} ariaLabel="Hatırlatıcılar" className="text-ink">
        <motion.span
          className="flex"
          animate={reminders.length > 0 ? { rotate: [0, -14, 12, -8, 5, 0] } : { rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          style={{ transformOrigin: "50% 15%" }}
        >
          <BellIcon className="h-[22px] w-[22px]" />
        </motion.span>
        <AnimatePresence>
          {reminders.length > 0 && (
            <motion.span
              key={reminders.length}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              className="tabular absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-iris px-1 text-[10px] font-bold text-on-iris"
            >
              {reminders.length}
            </motion.span>
          )}
        </AnimatePresence>
      </IconButton>

      <Sheet
        open={open}
        onClose={() => onOpenChange(false)}
        title="Yaklaşan ödemeler"
        subtitle={reminders.length > 0 ? "Hallettiysen kaydırarak işaretleyebilirsin." : undefined}
      >
        {reminders.length === 0 ? (
          <p className="py-8 text-center text-[15px] text-ink-faint">Yaklaşan ödeme yok.</p>
        ) : (
          <>
            <ul className="-mx-2 flex flex-col gap-0.5">
              {reminders.map((r) => (
                <ReminderRow
                  key={r.key}
                  reminder={r}
                  onOpen={() => {
                    onSelectDate(r.date);
                    onOpenChange(false);
                  }}
                  onDismiss={() => setDone(r.key, true)}
                />
              ))}
            </ul>
          </>
        )}
      </Sheet>
    </>
  );
}
