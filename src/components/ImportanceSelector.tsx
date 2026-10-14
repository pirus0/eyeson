"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { IMPORTANCE_LABELS, type Importance } from "@/lib/types";
import { IMPORTANCE_DOT_CLASS } from "@/lib/itemMeta";

type Props = {
  value: Importance;
  onChange: (importance: Importance) => void;
};

const OPTIONS: Importance[] = ["yuksek", "orta", "dusuk"];

/** The 3-way "Önem" segmented control used by both the add-item form and the
 * assign-a-day forms. The selected pill slides between options. */
export function ImportanceSelector({ value, onChange }: Props) {
  const id = useId();
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-ink/5 p-1">
      {OPTIONS.map((imp) => (
        <button
          key={imp}
          type="button"
          onClick={() => onChange(imp)}
          aria-pressed={value === imp}
          className="relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-medium"
        >
          {value === imp && (
            <motion.span
              layoutId={`imp-${id}`}
              className="absolute inset-0 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            />
          )}
          <span className={`relative h-2 w-2 rounded-full ${IMPORTANCE_DOT_CLASS[imp]}`} />
          <span className={`relative ${value === imp ? "text-ink" : "text-ink-soft"}`}>
            {IMPORTANCE_LABELS[imp]}
          </span>
        </button>
      ))}
    </div>
  );
}
