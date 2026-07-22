"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeReminders } from "@/lib/occurrences";
import { formatShort } from "@/lib/date";
import { formatAmount, itemTitle, IMPORTANCE_DOT_CLASS } from "@/lib/itemMeta";
import { BellIcon, CloseIcon } from "./Icons";

type Props = {
  today: Date;
  onSelectDate: (date: Date) => void;
};

export function BellMenu({ today, onSelectDate }: Props) {
  const { data } = useStore();
  const [open, setOpen] = useState(false);

  const reminders = useMemo(
    () => computeReminders(data, data.completions, today),
    [data, today]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hatırlatıcılar"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-graphite-wash"
      >
        <BellIcon className="h-6 w-6" />
        {reminders.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-pen px-1 text-[10px] font-semibold text-paper">
            {reminders.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/20 sm:items-center">
          <div className="sketch-box max-h-[85vh] w-full max-w-md overflow-y-auto bg-paper p-4 pb-8 shadow-[0_2px_0_var(--pencil)] sm:rounded-none">
            <div className="flex items-center justify-between pb-2">
              <h2 className="font-hand text-2xl text-ink">Yaklaşan ödemeler</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="py-6 text-center font-hand text-xl text-ink-faint">Yaklaşan ödeme yok.</p>
            ) : (
              <ul className="flex flex-col">
                {reminders.map((r) => (
                  <li key={r.key} className="border-b border-dashed border-ink-faint/40 py-3 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate(r.date);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${IMPORTANCE_DOT_CLASS[r.item.importance]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink">
                          {itemTitle(r.item)}
                        </p>
                        <p className="text-xs text-ink-faint">
                          {formatShort(r.date)}
                          {r.item.amount !== undefined ? ` · ${formatAmount(r.item.amount)}` : ""}
                        </p>
                      </div>
                      <span
                        className={[
                          "sketch-box shrink-0 px-2 py-1 text-xs font-medium",
                          r.overdue ? "text-red-pen" : "text-ink-soft",
                        ].join(" ")}
                      >
                        {r.overdue
                          ? `${Math.abs(r.daysUntilDue)} gün gecikti`
                          : r.daysUntilDue === 0
                            ? "Bugün"
                            : `${r.daysUntilDue} gün kaldı`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
