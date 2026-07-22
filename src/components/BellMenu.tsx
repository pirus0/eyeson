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
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 active:bg-zinc-100"
      >
        <BellIcon className="h-6 w-6" />
        {reminders.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {reminders.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 sm:rounded-2xl">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-base font-medium text-zinc-900">Yaklaşan ödemeler</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">Yaklaşan ödeme yok.</p>
            ) : (
              <ul className="flex flex-col">
                {reminders.map((r) => (
                  <li key={r.key} className="border-b border-zinc-100 py-3 last:border-b-0">
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
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {itemTitle(r.item)}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {formatShort(r.date)}
                          {r.item.amount !== undefined ? ` · ${formatAmount(r.item.amount)}` : ""}
                        </p>
                      </div>
                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                          r.overdue
                            ? "bg-red-100 text-red-700"
                            : "bg-zinc-100 text-zinc-600",
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
