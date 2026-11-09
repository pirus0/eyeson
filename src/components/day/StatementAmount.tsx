"use client";

import { useState } from "react";
import type { Occurrence } from "@/lib/occurrences";
import { formatAmount, INPUT_CLASS } from "@/lib/itemMeta";
import { useStore } from "@/lib/store";
import { CheckIcon } from "../Icons";

/** Under a credit card's statement row once its day has come: type what the
 * statement came to and tick — the due row of the same cycle then shows it.
 * Ticked, it shows the amount; tapping the tick again lets you correct it. */
export function StatementAmount({ occ }: { occ: Occurrence }) {
  const { setDone, data } = useStore();
  const saved = data.completions[occ.key]?.amount;
  const [value, setValue] = useState(saved !== undefined ? String(saved) : "");
  const n = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(n) && n >= 0;

  return (
    <div className="flex items-center gap-2 px-3 pb-2.5 pl-[52px]">
      {occ.done ? (
        <span className="tabular flex min-h-11 flex-1 items-center text-[15px] font-semibold text-ink">
          {formatAmount(occ.cardAmount)}
        </span>
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) setDone(occ.key, true, n);
          }}
          placeholder="Tutar gir"
          aria-label="Kesim tutarı"
          className={`${INPUT_CLASS} !min-h-11 flex-1`}
        />
      )}
      <button
        type="button"
        onClick={() => {
          if (occ.done) setDone(occ.key, false);
          else if (valid) setDone(occ.key, true, n);
        }}
        disabled={!occ.done && !valid}
        aria-label={occ.done ? "Tutarı düzelt" : "Tutarı kaydet"}
        aria-pressed={occ.done}
        className={[
          "press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] transition-colors duration-200",
          occ.done
            ? "border-ink bg-ink text-paper"
            : valid
              ? "border-ink text-ink"
              : "border-line text-ink-faint/50",
        ].join(" ")}
      >
        <CheckIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
