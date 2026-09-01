"use client";

import { KIND_LABELS, type ItemKind } from "@/lib/itemMeta";

type Props = {
  value: ItemKind;
  onChange: (kind: ItemKind) => void;
};

const KIND_ORDER: ItemKind[] = [
  "oneOff",
  "bill",
  "installment",
  "creditCard",
  "recurringTodo",
  "weeklyTodo",
];

/** Replaces a native <select> with the app's own sketch-box picker — same
 * pattern as ImportanceSelector, just a 2-column grid since there are 6
 * kinds instead of 3. A native <select>'s open list can't be restyled, so it
 * was the one place left in the app that broke into plain OS chrome. */
export function KindSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {KIND_ORDER.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={[
            "sketch-box min-h-11 px-2 text-sm font-medium",
            value === k ? "bg-ink text-paper" : "text-ink-soft",
          ].join(" ")}
        >
          {KIND_LABELS[k]}
        </button>
      ))}
    </div>
  );
}
