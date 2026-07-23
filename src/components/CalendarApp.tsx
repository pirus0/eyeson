"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, isSameDay, monthGrid } from "@/lib/date";
import { occurrencesForRange, occurrencesForDay } from "@/lib/occurrences";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { CalendarGrid } from "./CalendarGrid";
import { DayPanel } from "./DayPanel";
import { AddItemSheet } from "./AddItemSheet";
import { BellMenu } from "./BellMenu";
import { ThemeToggle } from "./ThemeToggle";

export function CalendarApp() {
  const { data, ready } = useStore();
  const today = useToday();
  const [monthAnchor, setMonthAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [addOpen, setAddOpen] = useState(false);

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

  const days = useMemo(() => monthGrid(monthAnchor), [monthAnchor]);
  const rangeStart = days[0];
  // Padded 14 days past the visible grid so CalendarGrid's next-month peek
  // (pull-up preview) has real occurrence data too, not just bare numbers.
  const rangeEnd = useMemo(() => addDays(days[days.length - 1], 14), [days]);

  const occurrencesByDay = useMemo(() => {
    const occs = occurrencesForRange(data, data.completions, rangeStart, rangeEnd);
    const map = new Map<string, ReturnType<typeof occurrencesForRange>>();
    for (const occ of occs) {
      const list = map.get(occ.dateKey);
      if (list) list.push(occ);
      else map.set(occ.dateKey, [occ]);
    }
    return map;
  }, [data, rangeStart, rangeEnd]);

  const selectedOccurrences = useMemo(
    () => occurrencesForDay(data, data.completions, selected),
    [data, selected]
  );

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between pb-2">
        <h1 className="font-hand text-4xl text-ink">Eyes On</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <BellMenu
            today={today}
            onSelectDate={(date) => {
              setSelected(date);
              setMonthAnchor(date);
            }}
          />
        </div>
      </header>

      <CalendarGrid
        monthAnchor={monthAnchor}
        selected={selected}
        today={today}
        occurrencesByDay={occurrencesByDay}
        onSelect={setSelected}
        onPrevMonth={() => setMonthAnchor((m) => addMonths(m, -1))}
        onNextMonth={() => setMonthAnchor((m) => addMonths(m, 1))}
      />

      <DayPanel day={selected} occurrences={selectedOccurrences} onAdd={() => setAddOpen(true)} />

      {addOpen && <AddItemSheet defaultDate={selected} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
