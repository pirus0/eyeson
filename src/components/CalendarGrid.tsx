"use client";

import { useMemo } from "react";
import { isSameDay, monthGrid, formatMonthTitle, toKey } from "@/lib/date";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import type { Occurrence } from "@/lib/occurrences";
import { KIND_DOT_CLASS } from "@/lib/itemMeta";

const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

type Props = {
  monthAnchor: Date;
  selected: Date;
  today: Date;
  occurrencesByDay: Map<string, Occurrence[]>;
  onSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

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

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Önceki ay"
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-base font-medium capitalize text-zinc-900">
          {formatMonthTitle(monthAnchor)}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Sonraki ay"
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 active:bg-zinc-200"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-zinc-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const key = toKey(day);
          const occ = occurrencesByDay.get(key) ?? [];
          const inMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selected);
          const kinds = Array.from(new Set(occ.map((o) => o.item.kind)));

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              className="flex flex-col items-center justify-start gap-1 py-1"
            >
              <span
                className={[
                  "flex h-11 w-11 items-center justify-center rounded-full text-sm",
                  !inMonth ? "text-zinc-300" : "text-zinc-800",
                  isSelected
                    ? "bg-zinc-900 text-white"
                    : isToday
                      ? "border border-zinc-900 font-semibold"
                      : "",
                ].join(" ")}
              >
                {day.getDate()}
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
    </div>
  );
}
