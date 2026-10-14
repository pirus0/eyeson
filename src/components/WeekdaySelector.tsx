"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { WEEKDAY_SHORT } from "@/lib/date";

type Props = {
  value: number;
  onChange: (weekday: number) => void;
};

/** Seven two-letter day cells side by side, Monday first — picks which day
 * of the week a weekly todo lands on. */
export function WeekdaySelector({ value, onChange }: Props) {
  const id = useId();
  return (
    <div className="grid grid-cols-7 gap-1 rounded-2xl bg-ink/5 p-1">
      {WEEKDAY_SHORT.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(i)}
          aria-pressed={value === i}
          className="relative min-h-11 rounded-xl text-[14px] font-medium"
        >
          {value === i && (
            <motion.span
              layoutId={`wd-${id}`}
              className="absolute inset-0 rounded-xl bg-ink"
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            />
          )}
          <span className={`relative ${value === i ? "text-paper" : "text-ink-soft"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}
