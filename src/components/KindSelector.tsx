"use client";

import { useState } from "react";
import { KIND_LABELS, type ItemKind } from "@/lib/itemMeta";
import { ChevronUpIcon } from "./Icons";

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

/** Collapsed to a single row showing the current pick — tapping it opens the
 * 2-column grid below, and picking an option closes it back. Six options
 * sitting open above the rest of the form was more chrome than the field
 * needed (ported from the iOS app's kindField, see project memory). */
export function KindSelector({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="sketch-box flex min-h-11 items-center justify-between px-3 text-sm font-medium text-ink"
      >
        {KIND_LABELS[value]}
        <ChevronUpIcon
          className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "" : "rotate-180"}`}
        />
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-2">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k);
                setExpanded(false);
              }}
              className={[
                "sketch-box min-h-11 px-2 text-sm font-medium",
                value === k ? "bg-ink text-paper" : "text-ink-soft",
              ].join(" ")}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
