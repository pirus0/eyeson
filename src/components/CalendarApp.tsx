"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { addMonths, isSameDay, monthGrid, toKey } from "@/lib/date";
import { occurrencesForRange, occurrencesForDay, computeOverdue } from "@/lib/occurrences";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { useTheme } from "@/lib/useTheme";
import { CalendarGrid } from "./CalendarGrid";
import { DayPanel } from "./DayPanel";
import { AddItemSheet } from "./AddItemSheet";
import { BellMenu } from "./BellMenu";
import { SettingsSheet } from "./SettingsSheet";
import { ImportFromLink } from "./ImportFromLink";
import { EmptyImportCard } from "./EmptyImportCard";
import { countItems } from "@/lib/backup";
import { UnscheduledButton, UnscheduledPanel } from "./UnscheduledSheet";
import { BrandEye } from "./Icons";

/** A tap-tap within this window counts as a double-tap — more reliable than
 * the native `dblclick` event, which mobile Safari doesn't always fire
 * consistently for a standalone PWA. */
const DOUBLE_TAP_MS = 300;
const BLINK_MS = 240;

export function CalendarApp() {
  const { data, ready } = useStore();
  const today = useToday();
  const { toggle: toggleTheme } = useTheme();
  const [blinking, setBlinking] = useState(false);
  const lastTitleTapRef = useRef(0);

  const blink = useCallback(() => {
    setBlinking(true);
    window.setTimeout(() => setBlinking(false), BLINK_MS);
  }, []);

  // The header eye blinks on its own every few seconds — irregularly, like
  // a real one — so the mark reads as watching rather than as a static logo.
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        blink();
        schedule();
      }, 4000 + Math.random() * 5000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [blink]);

  const handleTitleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTitleTapRef.current < DOUBLE_TAP_MS) {
      lastTitleTapRef.current = 0;
      toggleTheme();
      blink();
    } else {
      lastTitleTapRef.current = now;
    }
  }, [toggleTheme, blink]);
  // Month plus which way the last change went, kept in one state so the
  // grid always slides the matching direction.
  const [month, setMonth] = useState({ anchor: today, direction: 1 });
  const monthAnchor = month.anchor;
  const direction = month.direction;
  const setMonthAnchor = useCallback((next: Date | ((m: Date) => Date)) => {
    setMonth((prev) => {
      const value = typeof next === "function" ? next(prev.anchor) : next;
      const diff =
        (value.getFullYear() - prev.anchor.getFullYear()) * 12 +
        (value.getMonth() - prev.anchor.getMonth());
      return { anchor: value, direction: diff === 0 ? prev.direction : diff > 0 ? 1 : -1 };
    });
  }, []);
  const [selected, setSelected] = useState(today);
  // The three overlay panels (settings, reminders, add-item) share one slot
  // so opening one always closes whichever other was already open, instead
  // of each tracking its own boolean and letting two stack at once.
  const [activeSheet, setActiveSheet] = useState<
    "settings" | "bell" | "add" | "unscheduled" | "add-unscheduled" | null
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
  }, [today, setMonthAnchor]);

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

  // Tapping a day on the calendar while the "zamanı belirsiz" panel is open
  // exits back to the normal day view for that date — the calendar stays
  // interactive underneath the panel, so a tap there should feel like
  // navigation, not a no-op.
  const handleSelectDay = useCallback((date: Date) => {
    setSelected(date);
    setActiveSheet((s) => (s === "unscheduled" ? null : s));
  }, []);

  const handlePrevMonth = useCallback(() => setMonthAnchor((m) => addMonths(m, -1)), [setMonthAnchor]);
  const handleNextMonth = useCallback(() => setMonthAnchor((m) => addMonths(m, 1)), [setMonthAnchor]);
  const handleToday = useCallback(() => {
    setMonthAnchor(today);
    setSelected(today);
    setActiveSheet((s) => (s === "unscheduled" ? null : s));
  }, [today, setMonthAnchor]);

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
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex items-center justify-between px-2 pb-3">
        <h1
          onClick={handleTitleTap}
          className="flex select-none items-center gap-2.5 font-display text-[26px] font-bold tracking-tight text-ink"
        >
          <BrandEye className="h-6 w-10" blinking={blinking} />
          Eyes On
        </h1>
        <div className="flex items-center gap-0.5 rounded-full bg-surface p-1 shadow-[0_1px_0_var(--line)]">
          <UnscheduledButton
            active={activeSheet === "unscheduled"}
            onClick={() =>
              setActiveSheet((s) => (s === "unscheduled" ? null : "unscheduled"))
            }
          />
          <SettingsSheet
            open={activeSheet === "settings"}
            onOpenChange={(v) => setActiveSheet(v ? "settings" : null)}
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

      {countItems(data) === 0 && <EmptyImportCard />}

      <CalendarGrid
        monthAnchor={monthAnchor}
        direction={direction}
        days={days}
        nextMonthDays={nextMonthDays}
        selected={selected}
        today={today}
        occurrencesByDay={occurrencesByDay}
        onSelect={handleSelectDay}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      <AnimatePresence mode="wait" initial={false}>
        {activeSheet === "unscheduled" || activeSheet === "add-unscheduled" ? (
          <motion.div
            key="unscheduled"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <UnscheduledPanel
              onSelectDate={(date) => {
                setSelected(date);
                setMonthAnchor(date);
                setActiveSheet(null);
              }}
              onAdd={() => setActiveSheet("add-unscheduled")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="day"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <DayPanel
              day={selected}
              occurrences={selectedOccurrences}
              onAdd={() => setActiveSheet("add")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSheet === "add" && (
          <AddItemSheet key="add" defaultDate={selected} onClose={() => setActiveSheet(null)} />
        )}
        {activeSheet === "add-unscheduled" && (
          <AddItemSheet
            key="add-unscheduled"
            defaultDate={selected}
            unscheduled
            onClose={() => setActiveSheet("unscheduled")}
          />
        )}
      </AnimatePresence>

      <ImportFromLink />
    </div>
  );
}
