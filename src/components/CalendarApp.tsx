"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, isSameDay, monthGrid, toKey } from "@/lib/date";
import { occurrencesForRange, occurrencesForDay, computeOverdue } from "@/lib/occurrences";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { useTheme } from "@/lib/useTheme";
import { CalendarGrid } from "./CalendarGrid";
import { DayPanel } from "./DayPanel";
import { AddItemSheet } from "./AddItemSheet";
import { BellMenu } from "./BellMenu";
import { UnscheduledSheet } from "./UnscheduledSheet";

/** A tap-tap within this window counts as a double-tap — more reliable than
 * the native `dblclick` event, which mobile Safari doesn't always fire
 * consistently for a standalone PWA. */
const DOUBLE_TAP_MS = 300;
const BOUNCE_MS = 320;

export function CalendarApp() {
  const { data, ready } = useStore();
  const today = useToday();
  const { toggle: toggleTheme } = useTheme();
  const [titleBouncing, setTitleBouncing] = useState(false);
  const lastTitleTapRef = useRef(0);

  const handleTitleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTitleTapRef.current < DOUBLE_TAP_MS) {
      lastTitleTapRef.current = 0;
      toggleTheme();
      setTitleBouncing(true);
      setTimeout(() => setTitleBouncing(false), BOUNCE_MS);
    } else {
      lastTitleTapRef.current = now;
    }
  }, [toggleTheme]);
  const [monthAnchor, setMonthAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  // The three overlay panels (settings, reminders, add-item) share one slot
  // so opening one always closes whichever other was already open, instead
  // of each tracking its own boolean and letting two stack at once.
  const [activeSheet, setActiveSheet] = useState<
    "settings" | "bell" | "add" | "unscheduled" | null
  >(null);

  // If the day rolls over while the app is open, follow along — but only
  // for whichever of these was still parked on the old "today"; a month or
  // day the user deliberately navigated to is left alone.
  const prevTodayRef = useRef(today);
  useEffect(() => {
    const prevToday = prevTodayRef.current;
    if (!isSameDay(prevToday, today)) {
      setMonthAnchor((m) => (isSameDay(m, prevToday) ? today : m));
      setSelected((s) => (isSameDay(s, prevToday) ? today : s));
      prevTodayRef.current = today;
    }
  }, [today]);

  // Computed once here and passed down to CalendarGrid (which also needs
  // both months' days to render) instead of each side independently
  // rebuilding the same ~35-42-Date-object arrays via monthGrid.
  const days = useMemo(() => monthGrid(monthAnchor), [monthAnchor]);
  const nextMonthAnchor = useMemo(() => addMonths(monthAnchor, 1), [monthAnchor]);
  const nextMonthDays = useMemo(() => monthGrid(nextMonthAnchor), [nextMonthAnchor]);
  const rangeStart = days[0];
  // Extends through the end of next month's grid so CalendarGrid's
  // pull-up peek (which now shows the whole next month) has real
  // occurrence data too, not just bare numbers.
  const rangeEnd = nextMonthDays[nextMonthDays.length - 1];

  const handlePrevMonth = useCallback(() => setMonthAnchor((m) => addMonths(m, -1)), []);
  const handleNextMonth = useCallback(() => setMonthAnchor((m) => addMonths(m, 1)), []);

  const overdue = useMemo(
    () => computeOverdue(data, data.completions, today),
    [data, today]
  );

  const occurrencesByDay = useMemo(() => {
    const occs = occurrencesForRange(data, data.completions, rangeStart, rangeEnd);
    const map = new Map<string, ReturnType<typeof occurrencesForRange>>();
    for (const occ of occs) {
      const list = map.get(occ.dateKey);
      if (list) list.push(occ);
      else map.set(occ.dateKey, [occ]);
    }
    // Carried-over overdue items always land on today's cell, regardless of
    // which day they were originally due on.
    if (overdue.length > 0) {
      const todayKey = toKey(today);
      const list = map.get(todayKey);
      if (list) list.push(...overdue);
      else map.set(todayKey, [...overdue]);
    }
    return map;
  }, [data, rangeStart, rangeEnd, overdue, today]);

  const selectedOccurrences = useMemo(() => {
    const own = occurrencesForDay(data, data.completions, selected);
    return isSameDay(selected, today) ? [...overdue, ...own] : own;
  }, [data, selected, today, overdue]);

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between pb-2">
        <h1
          onClick={handleTitleTap}
          className={`select-none font-hand text-4xl text-ink ${titleBouncing ? "eyes-on-bounce" : ""}`}
        >
          Eyes On
        </h1>
        <div className="flex items-center gap-1">
          <UnscheduledSheet
            onSelectDate={(date) => {
              setSelected(date);
              setMonthAnchor(date);
            }}
            open={activeSheet === "unscheduled"}
            onOpenChange={(v) => setActiveSheet(v ? "unscheduled" : null)}
          />
          <BellMenu
            today={today}
            onSelectDate={(date) => {
              setSelected(date);
              setMonthAnchor(date);
            }}
            open={activeSheet === "bell"}
            onOpenChange={(v) => setActiveSheet(v ? "bell" : null)}
          />
        </div>
      </header>

      <CalendarGrid
        monthAnchor={monthAnchor}
        days={days}
        nextMonthDays={nextMonthDays}
        selected={selected}
        today={today}
        occurrencesByDay={occurrencesByDay}
        onSelect={setSelected}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />

      <DayPanel
        day={selected}
        occurrences={selectedOccurrences}
        onAdd={() => setActiveSheet("add")}
      />

      {activeSheet === "add" && (
        <AddItemSheet defaultDate={selected} onClose={() => setActiveSheet(null)} />
      )}
    </div>
  );
}
