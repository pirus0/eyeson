"use client";

import { useState } from "react";
import { getDate, toKey } from "@/lib/date";
import type { Importance } from "@/lib/types";
import { IMPORTANCE_LABELS } from "@/lib/types";
import { KIND_LABELS, type ItemKind } from "@/lib/itemMeta";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { CloseIcon } from "./Icons";

type Props = {
  defaultDate: Date;
  onClose: () => void;
};

const KIND_ORDER: ItemKind[] = [
  "bill",
  "installment",
  "creditCard",
  "recurringTodo",
  "weeklyTodo",
  "oneOff",
];
const TITLE_ONLY_KINDS: ItemKind[] = ["recurringTodo", "weeklyTodo", "oneOff"];

const inputClass =
  "min-h-11 border-0 border-b-[1.5px] border-ink-faint/70 bg-transparent px-1 text-base text-ink placeholder:text-ink-faint/70 focus:border-ink focus:outline-none";

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

export function AddItemSheet({ defaultDate, onClose }: Props) {
  const { addBill, addInstallment, addCreditCard, addRecurringTodo, addWeeklyTodo, addOneOff } =
    useStore();
  useBodyScrollLock(true);
  const [kind, setKind] = useState<ItemKind>("bill");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState(getDate(defaultDate));
  const [importance, setImportance] = useState<Importance>("orta");
  const [startDate, setStartDate] = useState(toKey(defaultDate));
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
      addOneOff({ title: name.trim(), date: startDate });
    }
    onClose();
  }

  const isPayment = kind === "bill" || kind === "installment" || kind === "creditCard";
  const isTitleOnly = TITLE_ONLY_KINDS.includes(kind);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/20 sm:items-center">
      <div className="sketch-box max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain bg-paper p-4 pb-8 shadow-[0_2px_0_var(--pencil)] sm:rounded-none">
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-hand text-2xl text-ink">Yeni kayıt</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft active:bg-graphite-wash"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-4">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={[
                "sketch-box min-h-11 px-3 py-2 text-sm font-medium",
                kind === k ? "bg-ink text-paper" : "text-ink-soft",
              ].join(" ")}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {isTitleOnly ? "Başlık" : "Ad"}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
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
                className={inputClass}
                placeholder="TL"
              />
            </label>
          )}

          {kind === "bill" && (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              Ayın kaçında
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                required
                className={inputClass}
              />
            </label>
          )}

          {kind === "creditCard" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Hesap kesim günü
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={statementDay}
                  onChange={(e) => setStatementDay(Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Son ödeme günü
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </label>
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
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Taksit sayısı
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </label>
            </>
          )}

          {(kind === "recurringTodo" || kind === "weeklyTodo" || kind === "oneOff") && (
            <label className="flex flex-col gap-1 text-sm text-ink-soft">
              {kind === "oneOff" ? "Tarih" : "Başlangıç tarihi"}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={inputClass}
              />
            </label>
          )}

          {isPayment && (
            <div className="flex flex-col gap-1 text-sm text-ink-soft">
              Önem
              <div className="grid grid-cols-3 gap-2">
                {(["yuksek", "orta", "dusuk"] as Importance[]).map((imp) => (
                  <button
                    key={imp}
                    type="button"
                    onClick={() => setImportance(imp)}
                    className={[
                      "sketch-box min-h-11 text-sm font-medium",
                      importance === imp ? "bg-ink text-paper" : "text-ink-soft",
                    ].join(" ")}
                  >
                    {IMPORTANCE_LABELS[imp]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="sketch-box sketch-rotate-r mt-2 min-h-11 bg-ink font-hand text-xl text-paper active:bg-pencil"
          >
            Ekle
          </button>
        </form>
      </div>
    </div>
  );
}
