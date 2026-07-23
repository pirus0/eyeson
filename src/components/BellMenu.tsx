"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { computeReminders, type Reminder } from "@/lib/occurrences";
import { formatShort } from "@/lib/date";
import { formatAmount, itemTitle, IMPORTANCE_DOT_CLASS } from "@/lib/itemMeta";
import { BellIcon, CheckIcon, CloseIcon } from "./Icons";

type Props = {
  today: Date;
  onSelectDate: (date: Date) => void;
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

  return (
    <li
      ref={rowRef}
      className="relative overflow-hidden border-b border-dashed border-ink-faint/40 last:border-b-0"
      onTransitionEnd={() => {
        if (exiting) onDismiss();
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-between px-4 text-ink-soft transition-opacity ${revealClass}`}
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
        className="flex w-full items-center gap-3 bg-paper py-3 text-left"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${IMPORTANCE_DOT_CLASS[reminder.item.importance]}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{itemTitle(reminder.item)}</p>
          <p className="text-xs text-ink-faint">
            {formatShort(reminder.date)}
            {reminder.item.amount !== undefined ? ` · ${formatAmount(reminder.item.amount)}` : ""}
          </p>
        </div>
        <span
          className={[
            "sketch-box shrink-0 px-2 py-1 text-xs font-medium",
            reminder.overdue ? "text-red-pen" : "text-ink-soft",
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

export function BellMenu({ today, onSelectDate }: Props) {
  const { data, setDone } = useStore();
  const [open, setOpen] = useState(false);

  const reminders = useMemo(
    () => computeReminders(data, data.completions, today),
    [data, today]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hatırlatıcılar"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-graphite-wash"
      >
        <BellIcon className="h-6 w-6" />
        {reminders.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-pen px-1 text-[10px] font-semibold text-paper">
            {reminders.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/20 sm:items-center">
          <div className="sketch-box max-h-[85vh] w-full max-w-md overflow-y-auto bg-paper p-4 pb-8 shadow-[0_2px_0_var(--pencil)] sm:rounded-none">
            <div className="flex items-center justify-between pb-2">
              <h2 className="font-hand text-2xl text-ink">Yaklaşan ödemeler</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="py-6 text-center font-hand text-xl text-ink-faint">Yaklaşan ödeme yok.</p>
            ) : (
              <>
                <p className="px-1 pb-2 text-xs text-ink-faint">
                  Hallettiysen kaydırarak işaretleyebilirsin.
                </p>
                <ul className="flex flex-col">
                  {reminders.map((r) => (
                    <ReminderRow
                      key={r.key}
                      reminder={r}
                      onOpen={() => {
                        onSelectDate(r.date);
                        setOpen(false);
                      }}
                      onDismiss={() => setDone(r.key, true)}
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
