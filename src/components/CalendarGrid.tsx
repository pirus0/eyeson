"use client";

import { useMemo, useRef, useState } from "react";
import { addMonths, isSameDay, monthGrid, formatMonthTitle, toKey } from "@/lib/date";
import { ChevronLeftIcon, ChevronRightIcon, FlameIcon } from "./Icons";
import type { Occurrence } from "@/lib/occurrences";
import { KIND_DOT_CLASS } from "@/lib/itemMeta";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/** How far (px) pulling down on the grid reveals next month's first two
 * weeks — roughly the height of two day rows. */
const MAX_PEEK = 128;

type Props = {
  monthAnchor: Date;
  selected: Date;
  today: Date;
  occurrencesByDay: Map<string, Occurrence[]>;
  onSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

/** A circle drawn two or three times with a slight mismatch each pass, like a
 * pen retracing a line unevenly on paper. */
function SketchRing({ color, faint = false }: { color: string; faint?: boolean }) {
  return (
    <svg viewBox="0 0 44 44" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <ellipse
        cx="22" cy="21" rx="17.5" ry="17"
        fill="none" stroke={color} strokeWidth={faint ? 1.3 : 2}
        strokeDasharray={faint ? "3 3" : undefined}
        opacity={faint ? 0.55 : 0.9}
        transform="rotate(-4 22 21)"
      />
      {!faint && (
        <>
          <ellipse
            cx="21.3" cy="22.4" rx="16.8" ry="17.6"
            fill="none" stroke={color} strokeWidth={1.4} opacity={0.6}
            transform="rotate(6 21.3 22.4)"
          />
          <ellipse
            cx="22.6" cy="20.2" rx="17.2" ry="16.5"
            fill="none" stroke={color} strokeWidth={1.1} opacity={0.4}
            transform="rotate(-9 22.6 20.2)"
          />
        </>
      )}
    </svg>
  );
}

export function CalendarGrid({
  monthAnchor,
  selected,
  today,
  occurrencesByDay,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const days = useMemo(() => monthGrid(monthAnchor), [monthAnchor]);
  const currentMonth = monthAnchor.getMonth();

  const nextMonthAnchor = useMemo(() => addMonths(monthAnchor, 1), [monthAnchor]);
  const nextMonthPeekDays = useMemo(() => monthGrid(nextMonthAnchor).slice(0, 14), [nextMonthAnchor]);

  // Pulling down on the grid peeks at next month without actually navigating;
  // it always springs back on release (or as soon as the drag heads back up).
  const [peek, setPeek] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const startYRef = useRef(0);

  function handlePeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startYRef.current = e.clientY;
    setPeeking(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is best-effort — without it the drag still mostly works as
      // long as the finger stays over the grid, just less robust once it
      // strays past the grid's bottom edge into the peek area below.
    }
  }

  function handlePeekPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!peeking) return;
    const delta = e.clientY - startYRef.current;
    setPeek(Math.max(0, Math.min(MAX_PEEK, delta)));
  }

  function endPeek() {
    setPeeking(false);
    setPeek(0);
  }

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Önceki ay"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="font-hand text-3xl capitalize leading-none text-ink">
          {formatMonthTitle(monthAnchor)}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Sonraki ay"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center font-hand text-lg text-ink-faint">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-y-1"
        style={{ touchAction: "none" }}
        onPointerDown={handlePeekPointerDown}
        onPointerMove={handlePeekPointerMove}
        onPointerUp={endPeek}
        onPointerCancel={endPeek}
      >
        {days.map((day) => {
          const key = toKey(day);
          const occ = occurrencesByDay.get(key) ?? [];
          const inMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selected);
          const kinds = Array.from(new Set(occ.map((o) => o.item.kind)));
          const urgentOccs = occ.filter(
            (o) =>
              (o.item.kind === "bill" || o.item.kind === "installment") &&
              o.item.importance === "yuksek"
          );
          const hasUrgentPayment = urgentOccs.length > 0;
          // Lit while any urgent payment that day is still unpaid; once they're
          // all settled the flame goes out instead of disappearing outright.
          const urgentPending = urgentOccs.some((o) => !o.done);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              className="flex flex-col items-center justify-start gap-1 py-1"
            >
              <span
                className={[
                  "relative flex h-11 w-11 items-center justify-center text-sm",
                  urgentPending
                    ? "text-ink-invert"
                    : !inMonth
                      ? "text-ink-faint/50"
                      : "text-ink",
                  isSelected ? "font-semibold" : "",
                ].join(" ")}
              >
                {hasUrgentPayment && (
                  <FlameIcon
                    className={[
                      "pointer-events-none absolute inset-0 h-full w-full scale-125",
                      urgentPending ? "text-red-pen" : "text-ink-faint/60",
                    ].join(" ")}
                  />
                )}
                {isSelected && (
                  <SketchRing color={urgentPending ? "var(--ink-invert)" : "var(--ink)"} />
                )}
                {!isSelected && isToday && (
                  <SketchRing color={urgentPending ? "var(--ink-invert)" : "var(--pencil)"} faint />
                )}
                <span className="relative">{day.getDate()}</span>
              </span>
              <span className="flex h-1.5 gap-0.5">
                {kinds.slice(0, 4).map((k) => (
                  <span key={k} className={`h-1.5 w-1.5 rounded-full ${KIND_DOT_CLASS[k]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="overflow-hidden"
        style={{
          height: peek,
          transition: peeking ? "none" : "height 200ms ease",
        }}
      >
        <p className="pt-2 text-center font-hand text-lg capitalize text-ink-faint/70">
          {formatMonthTitle(nextMonthAnchor)}
        </p>
        <div className="pointer-events-none grid grid-cols-7 gap-y-1 opacity-60">
          {nextMonthPeekDays.map((day) => (
            <span
              key={toKey(day)}
              className="flex h-11 w-11 items-center justify-center text-sm text-ink-faint"
            >
              {day.getDate()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
