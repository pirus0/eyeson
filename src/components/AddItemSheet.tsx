"use client";

import { useState } from "react";
import { getDate, toKey } from "@/lib/date";
import type { Importance } from "@/lib/types";
import { INPUT_CLASS, type ItemKind } from "@/lib/itemMeta";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { HorizontalNumberPicker } from "./HorizontalNumberPicker";
import { ImportanceSelector } from "./ImportanceSelector";
import { KindSelector } from "./KindSelector";
import { Sheet } from "./Sheet";

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
      addWeeklyTodo({ title: name.trim(), startDate });
    } else {
      addOneOff({ title: name.trim(), date: hasDate ? startDate || undefined : undefined });
    }
    onClose();
  }

  const isPayment = kind === "bill" || kind === "installment" || kind === "creditCard";
  const isTitleOnly = TITLE_ONLY_KINDS.includes(kind);

  return (
    <Sheet open title="Yeni kayıt" onClose={onClose} maxHeightClassName="max-h-[90vh]">
        <div className="flex flex-col gap-1 pb-4 text-sm text-ink-soft">
          Tür
          <KindSelector value={kind} onChange={setKind} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {isTitleOnly ? "Başlık" : "Ad"}
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

          {isPayment && (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Tutar {kind === "bill" || kind === "creditCard" ? "(opsiyonel)" : ""}
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
            <div className="flex flex-col gap-1 text-sm text-ink-soft">
              Ayın kaçında
              <HorizontalNumberPicker min={1} max={31} value={dayOfMonth} onChange={setDayOfMonth} />
            </div>
          )}

          {kind === "creditCard" && (
            <>
              <div className="flex flex-col gap-1 text-sm text-ink-soft">
                Hesap kesim günü
                <HorizontalNumberPicker
                  min={1}
                  max={31}
                  value={statementDay}
                  onChange={setStatementDay}
                />
              </div>
              <div className="flex flex-col gap-1 text-sm text-ink-soft">
                Son ödeme günü
                <HorizontalNumberPicker min={1} max={31} value={dueDay} onChange={setDueDay} />
              </div>
              <p className="text-xs text-ink-faint">
                Takvimde iki gün de görünür; alev ve hatırlatıcı sadece son ödeme gününde olur.
              </p>
            </>
          )}

          {kind === "installment" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                İlk taksit tarihi
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </label>
              <div className="flex flex-col gap-1 text-sm text-ink-soft">
                Taksit sayısı
                <HorizontalNumberPicker min={1} max={60} value={count} onChange={setCount} />
              </div>
            </>
          )}

          {(kind === "recurringTodo" || kind === "weeklyTodo") && (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Başlangıç tarihi
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </label>
          )}

          {kind === "oneOff" && (
            <div className="flex flex-col gap-2 text-sm text-ink-soft">
              <div className="flex items-center justify-between">
                Tarih
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
                    "sketch-box relative h-7 w-12 shrink-0",
                    hasDate ? "bg-ink" : "bg-transparent",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[left]",
                      hasDate ? "left-6 bg-paper" : "left-1 bg-ink-soft",
                    ].join(" ")}
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
                <span className="text-xs text-ink-faint">
                  &quot;Zamanı belirsiz&quot; olarak eklenir, soru işaretinden sonra atarsın.
                </span>
              )}
            </div>
          )}

          {isPayment && (
            <div className="flex flex-col gap-1 text-sm text-ink-soft">
              Önem
              <ImportanceSelector value={importance} onChange={setImportance} />
            </div>
          )}

          <button
            type="submit"
            className="sketch-box sketch-rotate-r mt-2 min-h-11 bg-ink font-hand text-xl text-paper active:bg-pencil"
          >
            Ekle
          </button>
        </form>
    </Sheet>
  );
}
