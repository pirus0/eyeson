"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Importance } from "@/lib/types";
import { todayKey } from "@/lib/date";
import { FIELD_LABEL_CLASS, INPUT_CLASS } from "@/lib/itemMeta";
import { useStore } from "@/lib/store";
import { ImportanceSelector } from "../ImportanceSelector";

/** Inline "move to another day" form under a one-off task — payments can't
 * be reassigned (their due date is fixed), recurring todos come back on
 * their own. */
export function ReassignForm({
  id,
  initialImportance,
  onClose,
}: {
  id: string;
  initialImportance?: Importance;
  onClose: () => void;
}) {
  const { assignOneOff } = useStore();
  const [date, setDate] = useState(todayKey());
  const [importance, setImportance] = useState<Importance>(initialImportance ?? "orta");

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-3 px-3 pb-3">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASS}>Yeni tarih</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASS}>Önem</span>
          <ImportanceSelector value={importance} onChange={setImportance} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!date) return;
              assignOneOff(id, { date, importance });
              onClose();
            }}
            disabled={!date}
            className="press min-h-11 flex-1 rounded-full bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press min-h-11 rounded-full px-4 text-[15px] font-medium text-ink-soft hover:bg-ink/5"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </motion.div>
  );
}
