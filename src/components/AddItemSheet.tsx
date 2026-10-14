"use client";

import { useState } from "react";
import { getDate, mondayIndex, toKey } from "@/lib/date";
import type { Importance } from "@/lib/types";
import { FIELD_LABEL_CLASS, INPUT_CLASS, type ItemKind } from "@/lib/itemMeta";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { HorizontalNumberPicker } from "./HorizontalNumberPicker";
import { ImportanceSelector } from "./ImportanceSelector";
import { KindSelector } from "./KindSelector";
import { Sheet } from "./Sheet";
import { WeekdaySelector } from "./WeekdaySelector";

type Props = {
  defaultDate: Date;
  onClose: () => void;
  /** Opened from the "Zamanı belirsiz" panel's + button — the date field
   * starts empty (instead of pre-filled with defaultDate) since the point
   * is to add a one-off task with no day yet. */
  unscheduled?: boolean;
};

const TITLE_ONLY_KINDS: ItemKind[] = ["recurringTodo", "weeklyTodo", "oneOff"];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Empty/garbage input becomes "no amount" for optional fields rather than
 * silently submitting NaN or a negative number. */
function parseAmount(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function AddItemSheet({ defaultDate, onClose, unscheduled = false }: Props) {
  const { addBill, addInstallment, addCreditCard, addRecurringTodo, addWeeklyTodo, addOneOff } =
    useStore();
  useBodyScrollLock(true);
  const [kind, setKind] = useState<ItemKind>("oneOff");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState(getDate(defaultDate));
  const [importance, setImportance] = useState<Importance>("orta");
  const [startDate, setStartDate] = useState(unscheduled ? "" : toKey(defaultDate));
  // Only meaningful for kind === "oneOff" — every other kind always has a
  // date. Starts off when opened from the "Zamanı belirsiz" panel's + button.
  const [hasDate, setHasDate] = useState(!unscheduled);
  const [count, setCount] = useState(3);
  const [weekday, setWeekday] = useState(mondayIndex(defaultDate));
  const [statementDay, setStatementDay] = useState(getDate(defaultDate));
  // Just a starting suggestion (typical ~10 day gap) — the user adjusts to
  // match their actual card.
  const [dueDay, setDueDay] = useState(() => Math.min(31, getDate(defaultDate) + 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const safeAmount = parseAmount(amount);

    if (kind === "bill") {
      addBill({
        name: name.trim(),
        amount: safeAmount,
        dayOfMonth: clampInt(dayOfMonth, 1, 31),
        importance,
      });
    } else if (kind === "installment") {
      if (safeAmount === undefined || count < 1) return;
      addInstallment({
        name: name.trim(),
        amount: safeAmount,
        startDate,
        count: clampInt(count, 1, 60),
        importance,
      });
    } else if (kind === "creditCard") {
      addCreditCard({
        name: name.trim(),
        amount: safeAmount,
        statementDay: clampInt(statementDay, 1, 31),
        dueDay: clampInt(dueDay, 1, 31),
        importance,
      });
    } else if (kind === "recurringTodo") {
      addRecurringTodo({ title: name.trim(), startDate });
    } else if (kind === "weeklyTodo") {
      addWeeklyTodo({ title: name.trim(), startDate, weekday: clampInt(weekday, 0, 6) });
    } else {
      addOneOff({ title: name.trim(), date: hasDate ? startDate || undefined : undefined });
    }
    onClose();
  }

  const isPayment = kind === "bill" || kind === "installment" || kind === "creditCard";
  const isTitleOnly = TITLE_ONLY_KINDS.includes(kind);

  return (
    <Sheet open title="Yeni kayıt" onClose={onClose} maxHeightClassName="max-h-[92vh]">
        <div className="flex flex-col gap-1.5 pb-4">
          <span className={FIELD_LABEL_CLASS}>Tür</span>
          <KindSelector value={kind} onChange={setKind} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>{isTitleOnly ? "Başlık" : "Ad"}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={INPUT_CLASS}
              placeholder={
                kind === "bill"
                  ? "Örn. İnternet"
                  : kind === "installment"
                    ? "Örn. Telefon taksiti"
                    : kind === "creditCard"
                      ? "Örn. Bonus Kart"
                      : "Örn. İlaç al"
              }
            />
          </label>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={kind}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
          {isPayment && (
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Tutar {kind === "bill" || kind === "creditCard" ? "(opsiyonel)" : ""}</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required={kind === "installment"}
                className={INPUT_CLASS}
                placeholder="TL"
              />
            </label>
          )}

          {kind === "bill" && (
            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Ayın kaçında</span>
              <HorizontalNumberPicker min={1} max={31} value={dayOfMonth} onChange={setDayOfMonth} />
            </div>
          )}

          {kind === "creditCard" && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Hesap kesim günü</span>
                <HorizontalNumberPicker
                  min={1}
                  max={31}
                  value={statementDay}
                  onChange={setStatementDay}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Son ödeme günü</span>
                <HorizontalNumberPicker min={1} max={31} value={dueDay} onChange={setDueDay} />
              </div>
              <p className="text-[12px] text-ink-faint">
                Takvimde iki gün de görünür; göz ve hatırlatıcı sadece son ödeme gününde olur.
              </p>
            </>
          )}

          {kind === "installment" && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>İlk taksit tarihi</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Taksit sayısı</span>
                <HorizontalNumberPicker min={1} max={60} value={count} onChange={setCount} />
              </div>
            </>
          )}

          {(kind === "recurringTodo" || kind === "weeklyTodo") && (
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Başlangıç tarihi</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </label>
          )}

          {kind === "weeklyTodo" && (
            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Hangi gün</span>
              <WeekdaySelector value={weekday} onChange={setWeekday} />
            </div>
          )}

          {kind === "oneOff" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={FIELD_LABEL_CLASS}>Tarih</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasDate}
                  aria-label="Tarih belirle"
                  onClick={() =>
                    setHasDate((prev) => {
                      const next = !prev;
                      if (next && !startDate) setStartDate(toKey(defaultDate));
                      if (!next) setStartDate("");
                      return next;
                    })
                  }
                  className={[
                    "relative flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200",
                    hasDate ? "justify-end bg-iris" : "justify-start bg-ink/15",
                  ].join(" ")}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 600, damping: 34 }}
                    className="h-[26px] w-[26px] rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
                  />
                </button>
              </div>
              {hasDate ? (
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              ) : (
                <span className="text-[12px] text-ink-faint">
                  &quot;Zamanı belirsiz&quot; olarak eklenir, soru işaretinden sonra atarsın.
                </span>
              )}
            </div>
          )}

          {isPayment && (
            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Önem</span>
              <ImportanceSelector value={importance} onChange={setImportance} />
            </div>
          )}

            </motion.div>
          </AnimatePresence>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            className="mt-2 min-h-[52px] rounded-full bg-ink text-[16px] font-semibold text-paper"
          >
            Ekle
          </motion.button>
        </form>
    </Sheet>
  );
}
