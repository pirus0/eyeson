"use client";

import { WEEKDAY_SHORT } from "@/lib/date";

type Props = {
  value: number;
  onChange: (weekday: number) => void;
};

/** Seven two-letter day cells side by side, Monday first — picks which day
 * of the week a weekly todo lands on. */
export function WeekdaySelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAY_SHORT.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(i)}
          aria-pressed={value === i}
          className={[
            "sketch-box min-h-11 text-sm font-medium",
            value === i ? "bg-ink text-paper" : "text-ink-soft",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
