"use client";

import { useMemo } from "react";
import { isSameDay, monthGrid, formatMonthTitle, toKey } from "@/lib/date";
import { ChevronLeftIcon, ChevronRightIcon, FlameIcon } from "./Icons";
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

      <div className="grid grid-cols-7 gap-y-1">
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
    </div>
  );
}
