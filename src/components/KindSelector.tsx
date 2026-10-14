"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { KIND_LABELS, type ItemKind } from "@/lib/itemMeta";
import { CheckIcon, ChevronUpIcon } from "./Icons";

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

/** Collapsed to a single row showing the current pick — tapping it unfolds
 * the full list below, and picking an option folds it back. */
export function KindSelector({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center justify-between px-4 text-[15px] font-semibold text-ink"
      >
        {KIND_LABELS[value]}
        <motion.span animate={{ rotate: expanded ? 0 : 180 }} transition={{ duration: 0.22 }}>
          <ChevronUpIcon className="h-4 w-4 text-ink-faint" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line py-1">
              {KIND_ORDER.map((k, i) => (
                <motion.button
                  key={k}
                  type="button"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  onClick={() => {
                    onChange(k);
                    setExpanded(false);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-[15px] hover:bg-ink/5 ${
                    value === k ? "font-semibold text-ink" : "text-ink-soft"
                  }`}
                >
                  {KIND_LABELS[k]}
                  {value === k && <CheckIcon className="h-4 w-4 text-iris" />}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
