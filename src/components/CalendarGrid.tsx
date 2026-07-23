"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addMonths, isSameDay, monthGrid, formatMonthTitle, toKey } from "@/lib/date";
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, EyeIcon } from "./Icons";
import type { Occurrence } from "@/lib/occurrences";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/** Stable reference for "no occurrences that day" so DayCell's memo doesn't
 * see a "changed" prop on every render just because `?? []` made a new
 * empty array — most cells have no occurrences, so this matters a lot. */
const EMPTY_OCC: Occurrence[] = [];

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

type DayCellProps = {
  day: Date;
  occ: Occurrence[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
};

/** One calendar day — used both by the live month grid and by the peeked
 * next-month preview, so the two always look and behave identically.
 * Memoized: during the pull-up drag only `peek`'s height changes, none of
 * these props do, so this should skip re-rendering entirely on every
 * pointermove instead of re-computing all ~80 cells per frame. */
const DayCell = memo(function DayCell({ day, occ, inMonth, isToday, isSelected, onSelect }: DayCellProps) {
  const urgentOccs = occ.filter((o) => {
    if (o.item.kind === "bill" || o.item.kind === "installment") {
      return o.item.importance === "yuksek";
    }
    // A credit card's statement date is informational only — the flame is
    // reserved for the due date, so you're not chasing two lit days per card.
    if (o.item.kind === "creditCard") {
      return o.role === "due" && o.item.importance === "yuksek";
    }
    return false;
  });
  const hasUrgentPayment = urgentOccs.length > 0;
  // Lit (solid black) while any urgent payment that day is still unpaid;
  // once they're all settled the eye fades instead of disappearing outright.
  const urgentPending = urgentOccs.some((o) => !o.done);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className="flex flex-col items-center justify-start gap-1 py-1"
    >
      <span
        className={[
          "relative flex h-11 w-11 items-center justify-center text-sm",
          urgentPending
            ? "text-red-pen"
            : !inMonth
              ? "text-ink-faint/50"
              : "text-ink",
          isSelected ? "font-semibold" : "",
        ].join(" ")}
      >
        {hasUrgentPayment && (
          <EyeIcon
            className={[
              "pointer-events-none absolute inset-0 h-full w-full scale-125",
              urgentPending ? "text-ink" : "text-ink-faint/40",
            ].join(" ")}
          />
        )}
        {isSelected && (
          <SketchRing color={urgentPending ? "var(--red-pen)" : "var(--ink)"} />
        )}
        {!isSelected && isToday && (
          <SketchRing color={urgentPending ? "var(--red-pen)" : "var(--pencil)"} faint />
        )}
        <span className="relative">{day.getDate()}</span>
      </span>
    </button>
  );
});

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
  const nextMonth = nextMonthAnchor.getMonth();
  // Full month now (not just a two-week teaser) — the user wants to be able
  // to pull all the way through to the end of next month.
  const nextMonthDays = useMemo(() => monthGrid(nextMonthAnchor), [nextMonthAnchor]);

  // Pushing up on the grid (the same gesture that scrolls a page down to
  // reveal what's further along) peeks at next month without changing
  // monthAnchor. A single touch can't hold the drag open AND tap a day at
  // the same time, so release commits: past the threshold it snaps fully
  // open (so the revealed days become tappable), short of it it springs
  // back closed. Dragging again — in either direction — adjusts from
  // wherever the peek currently sits, so an open peek can be pulled shut.
  const [peek, setPeek] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const startYRef = useRef(0);
  const peekAtStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingPeekRef = useRef<number | null>(null);

  // Measured from the actual rendered content instead of a guessed pixel
  // count, so a 4-week or 6-week month both open to exactly their real
  // height with no cropping or leftover empty space.
  const previewRef = useRef<HTMLDivElement>(null);
  const [maxPeek, setMaxPeek] = useState(0);
  useLayoutEffect(() => {
    if (previewRef.current) setMaxPeek(previewRef.current.scrollHeight);
  }, [nextMonthDays]);

  const peekCommitThreshold = maxPeek * 0.4;

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handlePeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startYRef.current = e.clientY;
    peekAtStartRef.current = peek;
    pendingPeekRef.current = null;
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
    const delta = startYRef.current - e.clientY;
    pendingPeekRef.current = Math.max(0, Math.min(maxPeek, peekAtStartRef.current + delta));
    // Coalesce potentially dozens of pointermove events into one state
    // update per animation frame — this is what was causing the stutter,
    // since every raw event was re-rendering the whole grid.
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingPeekRef.current !== null) setPeek(pendingPeekRef.current);
      });
    }
  }

  function endPeek() {
    setPeeking(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Cancelling the pending frame above would otherwise throw away the
    // freshest drag position on a fast flick (move immediately followed by
    // release, faster than one animation frame) — read it directly instead
    // of trusting committed state, which could still be a frame stale.
    const finalPeek = pendingPeekRef.current ?? peek;
    pendingPeekRef.current = null;
    setPeek(finalPeek > peekCommitThreshold ? maxPeek : 0);
  }

  const handleSelectFromPeek = useCallback(
    (day: Date) => {
      onSelect(day);
      setPeeking(false);
      setPeek(0);
    },
    [onSelect]
  );

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
          return (
            <DayCell
              key={key}
              day={day}
              occ={occurrencesByDay.get(key) ?? EMPTY_OCC}
              inMonth={day.getMonth() === currentMonth}
              isToday={isSameDay(day, today)}
              isSelected={isSameDay(day, selected)}
              onSelect={onSelect}
            />
          );
        })}
      </div>

      {peek === 0 && (
        <div className="flex justify-center pt-0.5 text-ink-faint/40">
          <ChevronUpIcon className="h-3.5 w-3.5" />
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          height: peek,
          transition: peeking ? "none" : "height 200ms ease",
        }}
      >
        <div ref={previewRef}>
          <p className="pt-2 text-center font-hand text-lg capitalize text-ink-faint/70">
            {formatMonthTitle(nextMonthAnchor)}
          </p>
          <div className="grid grid-cols-7 gap-y-1">
            {nextMonthDays.map((day) => {
              const key = toKey(day);
              return (
                <DayCell
                  key={key}
                  day={day}
                  occ={occurrencesByDay.get(key) ?? EMPTY_OCC}
                  inMonth={day.getMonth() === nextMonth}
                  isToday={isSameDay(day, today)}
                  isSelected={isSameDay(day, selected)}
                  onSelect={handleSelectFromPeek}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
