"use client";

import { IMPORTANCE_LABELS, type Importance } from "@/lib/types";

type Props = {
  value: Importance;
  onChange: (importance: Importance) => void;
};

const OPTIONS: Importance[] = ["yuksek", "orta", "dusuk"];

/** The 3-button "Önem" grid used by both the add-item form and the
 * assign-a-day form for unscheduled one-offs. */
export function ImportanceSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((imp) => (
        <button
          key={imp}
          type="button"
          onClick={() => onChange(imp)}
          className={[
            "sketch-box min-h-11 text-sm font-medium",
            value === imp ? "bg-ink text-paper" : "text-ink-soft",
          ].join(" ")}
        >
          {IMPORTANCE_LABELS[imp]}
        </button>
      ))}
    </div>
  );
}
