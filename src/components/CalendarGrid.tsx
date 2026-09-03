"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addMonths, isSameDay, formatMonthTitle, toKey } from "@/lib/date";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  EyeMediumIcon,
  EyeUrgentDoneIcon,
  EyeUrgentIcon,
} from "./Icons";
import { IconButton } from "./IconButton";
import { occurrenceImportance, type Occurrence } from "@/lib/occurrences";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/** Stable reference for "no occurrences that day" so DayCell's memo doesn't
 * see a "changed" prop on every render just because `?? []` made a new
 * empty array — most cells have no occurrences, so this matters a lot. */
const EMPTY_OCC: Occurrence[] = [];

type Props = {
  monthAnchor: Date;
  /** Both computed once by the parent (which also needs them to derive its
   * occurrence-fetch range) instead of being independently rebuilt here. */
  days: Date[];
  nextMonthDays: Date[];
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
            cx="19.5" cy="23.5" rx="16" ry="18.6"
            fill="none" stroke={color} strokeWidth={1.3} opacity={0.55}
            transform="rotate(11 19.5 23.5)"
          />
          <ellipse
            cx="24.5" cy="18.5" rx="18.6" ry="15.5"
            fill="none" stroke={color} strokeWidth={1} opacity={0.35}
            transform="rotate(-14 24.5 18.5)"
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
  const urgentOccs = occ.filter((o) => occurrenceImportance(o) === "yuksek");
  const hasUrgentPayment = urgentOccs.length > 0;
  // Lit (red) while any urgent payment that day is still unpaid; once
  // they're all settled the eye fades instead of disappearing outright.
  const urgentPending = urgentOccs.some((o) => !o.done);
  // Medium importance only gets its own (plain, unlashed) eye when there's
  // no urgent one already claiming the day's single icon slot, and — unlike
  // the urgent eye, which fades to EyeUrgentDoneIcon — it disappears
  // outright once settled instead of sticking around faded.
  const mediumOccs = occ.filter((o) => occurrenceImportance(o) === "orta");
  const mediumPending = mediumOccs.some((o) => !o.done);
  const hasMediumPayment = !hasUrgentPayment && mediumPending;
  // Carried-over overdue items only ever land on today's cell (see
  // computeOverdue) — this just needs to turn that day's number red too.
  const hasOverdueCarry = occ.some((o) => o.carriedOverdue);
  const isRed = urgentPending || hasOverdueCarry;

  // Both eyes fill their whole slot solidly while pending, so the number
  // drawn on top needs a color that contrasts with THAT fill, not with the
  // page background — same reasoning as the done-checkbox's bg-ink/text-paper
  // pairing elsewhere in DayPanel. Using the eye's own color here (e.g.
  // text-red-pen on a red-pen fill) would repeat the red-on-red /
  // black-on-black bug this codebase has hit before. ink-invert stays pale
  // in both themes and red-pen stays reddish in both, so it reads on the
  // urgent eye either way; the medium eye is filled with `ink` itself, which
  // flips light/dark with the theme, so its contrast color must flip too —
  // `paper` does exactly that (paper is ink's inverse in both themes).
  const numberColorClass =
    hasUrgentPayment && urgentPending
      ? "text-ink-invert"
      : hasMediumPayment
        ? "text-paper"
        : hasOverdueCarry
          ? "text-red-pen"
          : !inMonth
            ? "text-ink-faint/50"
            : "text-ink";

  return (
    <button
      type="button"
      data-day-key={toKey(day)}
      onClick={() => onSelect(day)}
      className="flex flex-col items-center justify-start gap-1 py-1"
    >
      <span
        className={[
          "relative flex h-11 w-11 items-center justify-center text-sm",
          numberColorClass,
          isSelected ? "font-semibold" : "",
        ].join(" ")}
      >
        {hasUrgentPayment &&
          (urgentPending ? (
            <EyeUrgentIcon
              className="pointer-events-none absolute inset-0 h-full w-full scale-125 text-red-pen"
            />
          ) : (
            <EyeUrgentDoneIcon
              className="pointer-events-none absolute inset-0 h-full w-full scale-125 text-ink-faint/40"
            />
          ))}
        {hasMediumPayment && (
          <EyeMediumIcon className="pointer-events-none absolute inset-0 h-full w-full scale-125 text-ink" />
        )}
        {isSelected && (
          <SketchRing color={isRed ? "var(--red-pen)" : "var(--ink)"} />
        )}
        {!isSelected && isToday && (
          <SketchRing color={isRed ? "var(--red-pen)" : "var(--pencil)"} faint />
        )}
        <span className="relative">{day.getDate()}</span>
      </span>
    </button>
  );
});

export const CalendarGrid = memo(function CalendarGrid({
  monthAnchor,
  days,
  nextMonthDays,
  selected,
  today,
  occurrencesByDay,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const currentMonth = monthAnchor.getMonth();
  const dayByKey = useMemo(() => {
    const m = new Map<string, Date>();
    for (const d of days) m.set(toKey(d), d);
    return m;
  }, [days]);

  const nextMonthAnchor = useMemo(() => addMonths(monthAnchor, 1), [monthAnchor]);
  const nextMonth = nextMonthAnchor.getMonth();

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

  function endPeek(e: React.PointerEvent<HTMLDivElement>) {
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

    // A press that barely moved is a tap, not a peek drag — mouse pointers
    // routinely shift a couple of pixels between down and up even on a
    // deliberate click. Once this element has pointer capture, Chrome and
    // Firefox retarget the resulting compatibility click event to the
    // capturing element (this grid) instead of the day button underneath,
    // so a mouse click here can silently never reach onSelect. Resolve taps
    // ourselves via hit-testing instead of depending on that native click —
    // this works the same for mouse and touch.
    const totalMove = Math.abs(startYRef.current - e.clientY);
    if (totalMove < 6 && finalPeek <= peekCommitThreshold) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const key = (el as HTMLElement | null)?.closest<HTMLElement>("[data-day-key]")?.dataset
        .dayKey;
      const day = key ? dayByKey.get(key) : undefined;
      if (day) onSelect(day);
    }
  }

  const handleSelectFromPeek = useCallback(
    (day: Date) => {
      onSelect(day);
      setPeeking(false);
      setPeek(0);
    },
    [onSelect]
  );

  // Hoisted out of the render body so a peek-only re-render (height changes
  // ~60x/sec while dragging) reuses these element arrays instead of
  // recomputing toKey/isSameDay for all ~84 cells on every frame.
  const dayGrid = useMemo(
    () =>
      days.map((day) => {
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
      }),
    [days, currentMonth, today, selected, occurrencesByDay, onSelect]
  );

  const nextMonthGrid = useMemo(
    () =>
      nextMonthDays.map((day) => {
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
      }),
    [nextMonthDays, nextMonth, today, selected, occurrencesByDay, handleSelectFromPeek]
  );

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <IconButton onClick={onPrevMonth} ariaLabel="Önceki ay">
          <ChevronLeftIcon className="h-5 w-5" />
        </IconButton>
        <h2 className="font-hand text-3xl capitalize leading-none text-ink">
          {formatMonthTitle(monthAnchor)}
        </h2>
        <IconButton onClick={onNextMonth} ariaLabel="Sonraki ay">
          <ChevronRightIcon className="h-5 w-5" />
        </IconButton>
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
        {dayGrid}
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
            {nextMonthGrid}
          </div>
        </div>
      </div>
    </div>
  );
});
