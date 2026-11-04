"use client";

import { useState } from "react";
import { addDays, getDate, mondayIndex, toKey } from "@/lib/date";
import type { AnyItem, Importance } from "@/lib/types";
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
  /** Opens the same form pre-filled for an existing item; the kind is fixed
   * and saving replaces the item instead of adding one. */
  editing?: AnyItem;
};

/** The first date on or after `from` that falls on `weekday` (0 = Pzt). */
function nextWeekday(from: Date, weekday: number): string {
  return toKey(addDays(from, (weekday - mondayIndex(from) + 7) % 7));
}

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

export function AddItemSheet({ defaultDate, onClose, unscheduled = false, editing }: Props) {
  const {
    addBill,
    addInstallment,
    addCreditCard,
    addRecurringTodo,
    addWeeklyTodo,
    addOneOff,
    updateItem,
  } = useStore();
  useBodyScrollLock(true);
  const e = editing;
  const [kind, setKind] = useState<ItemKind>(e?.kind ?? "oneOff");

  const [name, setName] = useState(
    e ? (e.kind === "bill" || e.kind === "installment" || e.kind === "creditCard" ? e.name : e.title) : ""
  );
  const [amount, setAmount] = useState(
    e && (e.kind === "bill" || e.kind === "installment") && e.amount !== undefined ? String(e.amount) : ""
  );
  const [dayOfMonth, setDayOfMonth] = useState(e?.kind === "bill" ? e.dayOfMonth : getDate(defaultDate));
  const [importance, setImportance] = useState<Importance>(
    (e && "importance" in e ? e.importance : undefined) ?? "orta"
  );
  const [startDate, setStartDate] = useState(() => {
    if (e?.kind === "installment" || e?.kind === "recurringTodo") return e.startDate;
    if (e?.kind === "oneOff") return e.date ?? "";
    return unscheduled ? "" : toKey(defaultDate);
  });
  // Only meaningful for kind === "oneOff" — every other kind always has a
  // date. Starts off when opened from the "Zamanı belirsiz" panel's + button.
  const [hasDate, setHasDate] = useState(e?.kind === "oneOff" ? !!e.date : !unscheduled);
  const [count, setCount] = useState(e?.kind === "installment" ? e.count : 3);
  const [weekday, setWeekday] = useState(
    e?.kind === "weeklyTodo" && e.weekday !== undefined ? e.weekday : mondayIndex(defaultDate)
  );
  const [statementDay, setStatementDay] = useState(
    e?.kind === "creditCard" ? e.statementDay : getDate(defaultDate)
  );
  // Just a starting suggestion (typical ~10 day gap) — the user adjusts to
  // match their actual card.
  const [dueDay, setDueDay] = useState(() =>
    e?.kind === "creditCard" ? e.dueDay : Math.min(31, getDate(defaultDate) + 10)
  );

  function save(): boolean {
    if (!e) return false;
    const title = name.trim();
    const safeAmount = parseAmount(amount);
    if (e.kind === "bill") {
      updateItem({ ...e, name: title, amount: safeAmount, dayOfMonth: clampInt(dayOfMonth, 1, 31), importance });
    } else if (e.kind === "installment") {
      if (safeAmount === undefined || !startDate) return true;
      updateItem({ ...e, name: title, amount: safeAmount, startDate, count: clampInt(count, 1, 60), importance });
    } else if (e.kind === "creditCard") {
      updateItem({
        ...e,
        name: title,
        statementDay: clampInt(statementDay, 1, 31),
        dueDay: clampInt(dueDay, 1, 31),
        importance,
      });
    } else if (e.kind === "recurringTodo") {
      if (!startDate) return true;
      updateItem({ ...e, title, startDate });
    } else if (e.kind === "weeklyTodo") {
      const wd = clampInt(weekday, 0, 6);
      // A start still ahead moves with the day; one already passed stays,
      // so past weeks keep their ticks.
      const today = toKey(new Date());
      const start =
        wd !== e.weekday && e.startDate >= today ? nextWeekday(new Date(), wd) : e.startDate;
      updateItem({ ...e, title, weekday: wd, startDate: start });
    } else {
      const date = hasDate ? startDate || undefined : undefined;
      updateItem({ ...e, title, date, importance: date ? importance : undefined });
    }
    onClose();
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (save()) return;

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
        statementDay: clampInt(statementDay, 1, 31),
        dueDay: clampInt(dueDay, 1, 31),
        importance,
      });
    } else if (kind === "recurringTodo") {
      addRecurringTodo({ title: name.trim(), startDate });
    } else if (kind === "weeklyTodo") {
      const wd = clampInt(weekday, 0, 6);
      addWeeklyTodo({ title: name.trim(), startDate: nextWeekday(new Date(), wd), weekday: wd });
    } else {
      const date = hasDate ? startDate || undefined : undefined;
      // A dated task carries an importance (its eye and reminder), as on iOS.
      addOneOff({ title: name.trim(), date, importance: date ? importance : undefined });
    }
    onClose();
  }

  const isPayment = kind === "bill" || kind === "installment" || kind === "creditCard";
  // A card's amount changes every month — it's entered on the statement row.
  const hasAmount = kind === "bill" || kind === "installment";
  // A dated one-off carries an importance, like an assigned one.
  const showImportance = isPayment || (kind === "oneOff" && hasDate);
  const isTitleOnly = TITLE_ONLY_KINDS.includes(kind);

  return (
    <Sheet open title={e ? "Düzenle" : "Yeni kayıt"} onClose={onClose} maxHeightClassName="max-h-[92vh]">
        {!e && (
          <div className="flex flex-col gap-1.5 pb-4">
            <span className={FIELD_LABEL_CLASS}>Tür</span>
            <KindSelector value={kind} onChange={setKind} />
          </div>
        )}

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
          {hasAmount && (
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Tutar {kind === "bill" ? "(opsiyonel)" : ""}</span>
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

          {kind === "recurringTodo" && (
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

          {showImportance && (
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
            {e ? "Kaydet" : "Ekle"}
          </motion.button>
        </form>
    </Sheet>
  );
}
