"use client";

import { useMemo, useState } from "react";
import { addMonths, monthGrid } from "@/lib/date";
import { occurrencesForRange, occurrencesForDay } from "@/lib/occurrences";
import { useStore } from "@/lib/store";
import { CalendarGrid } from "./CalendarGrid";
import { DayPanel } from "./DayPanel";
import { AddItemSheet } from "./AddItemSheet";
import { BellMenu } from "./BellMenu";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function CalendarApp() {
  const { data, ready } = useStore();
  const today = useMemo(() => startOfToday(), []);
  const [monthAnchor, setMonthAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [addOpen, setAddOpen] = useState(false);

  const days = useMemo(() => monthGrid(monthAnchor), [monthAnchor]);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between pb-2">
        <h1 className="text-lg font-semibold text-zinc-900">Eyes On</h1>
        <BellMenu
          today={today}
          onSelectDate={(date) => {
            setSelected(date);
            setMonthAnchor(date);
          }}
        />
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
