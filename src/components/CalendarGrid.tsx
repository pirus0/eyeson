"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue } from "motion/react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { addMonths, isSameDay, formatMonthTitle, toKey, WEEKDAY_SHORT } from "@/lib/date";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeMediumIcon,
  EyeOutlineIcon,
  EyeUrgentDoneIcon,
  EyeUrgentIcon,
} from "./Icons";
import { IconButton } from "./IconButton";
import { occurrenceImportance, type Occurrence } from "@/lib/occurrences";

/** Stable reference for "no occurrences that day" so DayCell's memo doesn't
 * see a "changed" prop on every render just because `?? []` made a new
 * empty array. */
const EMPTY_OCC: Occurrence[] = [];

/** Horizontal travel (px) that turns a grid drag into a month change. */
const SWIPE_MONTH_MIN = 56;

type Props = {
  monthAnchor: Date;
  /** +1 when the last month change went forward, -1 backward — picks which
   * side the new month slides in from. */
  direction: number;
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
  onToday: () => void;
};

type DayCellProps = {
  day: Date;
  occ: Occurrence[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** Only the live grid animates the selection pill between cells — the
   * peeked next-month copy can show the same day, and two elements sharing
   * one layoutId at once would fight. */
  sharedPill: boolean;
};

/** One calendar day — used both by the live month grid and by the peeked
 * next-month preview, so the two always look identical. Taps are resolved
 * by the grid's own pointer handling (see endGesture), so this is a plain
 * hit target carrying data-day-key. Memoized: during a drag only the grid's
 * transform changes, none of these props do. */
const DayCell = memo(function DayCell({
  day,
  occ,
  inMonth,
  isToday,
  isSelected,
  sharedPill,
}: DayCellProps) {
  const urgentOccs = occ.filter((o) => occurrenceImportance(o) === "yuksek");
  const hasUrgent = urgentOccs.length > 0;
  // Lit while any urgent payment that day is still unpaid; once they're all
  // settled the eye closes (EyeUrgentDoneIcon) instead of disappearing.
  const urgentPending = urgentOccs.some((o) => !o.done);
  // Medium importance gets its own plain eye only when no urgent one already
  // claims the day's single eye slot, and disappears outright once settled.
  const mediumPending =
    !hasUrgent && occ.some((o) => occurrenceImportance(o) === "orta" && !o.done);
  // Carried-over overdue items only ever land on today's cell.
  const hasOverdueCarry = occ.some((o) => o.carriedOverdue);
  const isRed = urgentPending || hasOverdueCarry;

  // A pending eye covers the whole day, number drawn inside it (as in the
  // original design). The number then needs a colour that contrasts with
  // the eye's FILL, not the page: on-iris on the red eye, paper on the ink
  // eye (paper is ink's inverse in both themes).
  const hasEye = urgentPending || mediumPending;
  const numberColor = urgentPending
    ? "text-on-iris"
    : mediumPending
      ? "text-paper"
      : isRed || isToday
        ? "text-iris"
        : !inMonth
          ? "text-ink-faint/45"
          : "text-ink";

  // Selection is an eye outline, the same almond as the importance eyes.
  // Red only on a high-importance eye; every other day (medium, or one that
  // just carries overdue items) gets the ink frame.
  // On an eye day it sits exactly on that eye's edge with a thin gap, like
  // a lens ring; on a plain day it is where an eye would be. Same layoutId
  // either way, so the selection still slides between cells.
  const frameClass = `pointer-events-none absolute inset-0 ${urgentPending ? "text-iris" : "text-ink"}`;
  const frame = (
    <EyeOutlineIcon
      className="h-full w-full scale-[1.1]"
      variant={urgentPending ? "urgent" : "plain"}
      gap={hasEye}
    />
  );

  return (
    <div
      data-day-key={toKey(day)}
      role="button"
      aria-label={format(day, "d MMMM EEEE", { locale: tr })}
      aria-pressed={isSelected}
      tabIndex={0}
      className="flex h-[52px] items-center justify-center"
    >
      <span className="relative flex h-11 w-11 items-center justify-center">
        {hasUrgent &&
          (urgentPending ? (
            <EyeUrgentIcon className="pointer-events-none absolute inset-0 h-full w-full scale-[1.1] text-iris" />
          ) : (
            <EyeUrgentDoneIcon className="pointer-events-none absolute inset-x-0 bottom-1.5 mx-auto h-3 w-full scale-110 text-ink-faint/50" />
          ))}
        {mediumPending && (
          <EyeMediumIcon className="pointer-events-none absolute inset-0 h-full w-full scale-[1.1] text-ink" />
        )}
        {isSelected &&
          (sharedPill ? (
            <motion.span
              layoutId="selected-day"
              className={frameClass}
              transition={{ type: "spring", stiffness: 520, damping: 36 }}
            >
              {frame}
            </motion.span>
          ) : (
            <span className={frameClass}>{frame}</span>
          ))}
        {!isSelected && isToday && !hasEye && (
          // Today is the same full almond as the selection frame, in red.
          <EyeOutlineIcon className="pointer-events-none absolute inset-0 h-full w-full scale-[1.1] text-iris/70" />
        )}
        <span
          className={`tabular relative transition-colors duration-200 ${
            // The lashed eye's almond is smaller than the plain one, so its
            // number steps down to stay clear of the selection lens ring.
            urgentPending ? "text-[13px]" : "text-[15px]"
          } ${numberColor} ${
            isSelected || isToday || hasEye ? "font-semibold" : "font-medium"
          }`}
        >
          {day.getDate()}
        </span>
      </span>
    </div>
  );
});

function useDayCells(
  days: Date[],
  month: number,
  today: Date,
  selected: Date,
  occurrencesByDay: Map<string, Occurrence[]>,
  sharedPill: boolean
) {
  return useMemo(
    () =>
      days.map((day) => {
        const key = toKey(day);
        return (
          <DayCell
            key={key}
            day={day}
            occ={occurrencesByDay.get(key) ?? EMPTY_OCC}
            inMonth={day.getMonth() === month}
            isToday={isSameDay(day, today)}
            isSelected={isSameDay(day, selected)}
            sharedPill={sharedPill}
          />
        );
      }),
    [days, month, today, selected, occurrencesByDay, sharedPill]
  );
}

const monthVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 72 : -72, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -72 : 72, opacity: 0 }),
};

export const CalendarGrid = memo(function CalendarGrid({
  monthAnchor,
  direction,
  days,
  nextMonthDays,
  selected,
  today,
  occurrencesByDay,
  onSelect,
  onPrevMonth,
  onNextMonth,
  onToday,
}: Props) {
  const currentMonth = monthAnchor.getMonth();
  const monthKey = `${monthAnchor.getFullYear()}-${currentMonth}`;
  const dayByKey = useMemo(() => {
    const m = new Map<string, Date>();
    for (const d of days) m.set(toKey(d), d);
    for (const d of nextMonthDays) if (!m.has(toKey(d))) m.set(toKey(d), d);
    return m;
  }, [days, nextMonthDays]);

  const nextMonthAnchor = useMemo(() => addMonths(monthAnchor, 1), [monthAnchor]);
  const nextMonth = nextMonthAnchor.getMonth();
  const showingThisMonth =
    monthAnchor.getFullYear() === today.getFullYear() && currentMonth === today.getMonth();

  // One gesture surface, two meanings, decided by whichever axis the finger
  // commits to first:
  //  - vertical (push up) peeks at next month below the grid without
  //    changing monthAnchor; release past 40% snaps it open, else closed.
  //  - horizontal drags the grid sideways; release past SWIPE_MONTH_MIN
  //    flips the month, else it springs back.
  // A press that barely moved is a tap and is resolved by hit-testing.
  const [peek, setPeek] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const swipeX = useMotionValue(0);
  const startRef = useRef({ x: 0, y: 0 });
  const axisRef = useRef<"x" | "y" | null>(null);
  const activeRef = useRef(false);
  const peekAtStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingPeekRef = useRef<number | null>(null);

  // Measured from the rendered preview so 4-, 5- and 6-week months all open
  // to exactly their real height.
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

  // A month change (from any source) closes the peek.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeek(0);
  }, [monthKey]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startRef.current = { x: e.clientX, y: e.clientY };
    axisRef.current = null;
    activeRef.current = true;
    peekAtStartRef.current = peek;
    pendingPeekRef.current = null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Best-effort: without capture the drag still works while the finger
      // stays over the grid.
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = startRef.current.y - e.clientY;
    if (axisRef.current === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisRef.current === "y") setPeeking(true);
    }
    if (axisRef.current === "x") {
      // Rubber-band: the grid follows the finger but lags behind it.
      swipeX.set(dx * 0.55);
      return;
    }
    pendingPeekRef.current = Math.max(0, Math.min(maxPeek, peekAtStartRef.current + dy));
    // Coalesce pointermoves into one state update per frame.
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingPeekRef.current !== null) setPeek(pendingPeekRef.current);
      });
    }
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeRef.current) return;
    activeRef.current = false;
    const axis = axisRef.current;
    axisRef.current = null;
    setPeeking(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (axis === "x") {
      const dx = e.clientX - startRef.current.x;
      if (Math.abs(dx) > SWIPE_MONTH_MIN) {
        if (dx < 0) onNextMonth();
        else onPrevMonth();
        animate(swipeX, 0, { type: "spring", stiffness: 380, damping: 36 });
      } else {
        animate(swipeX, 0, { type: "spring", stiffness: 500, damping: 34 });
      }
      return;
    }

    if (axis === "y") {
      // Read the freshest position directly — the cancelled frame above may
      // have held it on a fast flick.
      const finalPeek = pendingPeekRef.current ?? peek;
      pendingPeekRef.current = null;
      setPeek(finalPeek > peekCommitThreshold ? maxPeek : 0);
      return;
    }

    // Tap. Once this element has pointer capture, browsers retarget the
    // compatibility click to it rather than the cell underneath, so resolve
    // the tap ourselves via hit-testing — same for mouse and touch.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = (el as HTMLElement | null)?.closest<HTMLElement>("[data-day-key]")?.dataset.dayKey;
    const day = key ? dayByKey.get(key) : undefined;
    if (!day) return;
    onSelect(day);
    const inPeek = (el as HTMLElement).closest("[data-peek]") !== null;
    if (inPeek) setPeek(0);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const key = (e.target as HTMLElement).closest<HTMLElement>("[data-day-key]")?.dataset.dayKey;
      const day = key ? dayByKey.get(key) : undefined;
      if (day) {
        e.preventDefault();
        onSelect(day);
      }
    },
    [dayByKey, onSelect]
  );

  const dayGrid = useDayCells(days, currentMonth, today, selected, occurrencesByDay, true);
  const nextMonthGrid = useDayCells(nextMonthDays, nextMonth, today, selected, occurrencesByDay, false);

  const [monthName, year] = formatMonthTitle(monthAnchor).split(" ");

  return (
    <section className="rounded-[28px] bg-surface px-2 pt-4 pb-2 shadow-[0_1px_0_var(--line),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="relative h-9 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.h2
              key={monthKey}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ y: dir >= 0 ? 24 : -24, opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (dir: number) => ({ y: dir >= 0 ? -24 : 24, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 flex items-baseline gap-2 whitespace-nowrap"
            >
              <span className="font-display text-[28px] leading-9 font-semibold tracking-tight text-ink capitalize">
                {monthName}
              </span>
              <span className="tabular font-mono text-sm text-ink-faint">{year}</span>
            </motion.h2>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1">
          <AnimatePresence>
            {!showingThisMonth && (
              <motion.button
                type="button"
                onClick={onToday}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="press mr-1 h-8 rounded-full bg-iris-soft px-3 text-[13px] font-semibold text-iris"
              >
                Bugün
              </motion.button>
            )}
          </AnimatePresence>
          <IconButton onClick={onPrevMonth} ariaLabel="Önceki ay" className="bg-ink/5 text-ink">
            <ChevronLeftIcon className="h-5 w-5" />
          </IconButton>
          <IconButton onClick={onNextMonth} ariaLabel="Sonraki ay" className="bg-ink/5 text-ink">
            <ChevronRightIcon className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 px-1 pb-1 text-center text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
        {WEEKDAY_SHORT.map((w, i) => (
          <div key={w} className={i >= 5 ? "text-ink-faint/70" : undefined}>
            {w}
          </div>
        ))}
      </div>

      <div
        className="relative overflow-hidden px-1 select-none"
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={handleKeyDown}
      >
        {/* The finger-follow offset lives on a wrapper so it never shares a
            motion value with the enter/exit slide of the month inside. */}
        <motion.div style={{ x: swipeX }}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={monthKey}
              custom={direction}
              variants={monthVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <LayoutGroup id={monthKey}>
                <div className="grid grid-cols-7">{dayGrid}</div>
              </LayoutGroup>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div
          className="overflow-hidden"
          style={{
            height: peek,
            transition: peeking ? "none" : "height 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          <div ref={previewRef} data-peek>
            <p className="pt-3 pb-1 text-center text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
              {formatMonthTitle(nextMonthAnchor)}
            </p>
            <div className="grid grid-cols-7 opacity-80">{nextMonthGrid}</div>
          </div>
        </div>

        <div className="flex justify-center pt-1 pb-1">
          <span
            className="h-1 rounded-full bg-ink/15 transition-all duration-300"
            style={{ width: peek > 0 ? 18 : 32 }}
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
});
