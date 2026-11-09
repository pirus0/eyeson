"use client";

import { motion } from "motion/react";

/** Round check that draws its tick in when completed. */
export function CheckCircle({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
      aria-pressed={done}
      className="press -m-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <motion.span
        className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px]"
        initial={false}
        animate={
          done
            ? { backgroundColor: "var(--ink)", borderColor: "var(--ink)", scale: [1, 1.18, 1] }
            : { backgroundColor: "rgba(0,0,0,0)", borderColor: "var(--ink-faint)", scale: 1 }
        }
        transition={{ duration: 0.28 }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="var(--paper)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: 0.26, delay: done ? 0.06 : 0 }}
          />
        </svg>
      </motion.span>
    </button>
  );
}
