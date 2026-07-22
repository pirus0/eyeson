"use client";

import { useState } from "react";
import { getDate, toKey } from "@/lib/date";
import type { Importance } from "@/lib/types";
import { IMPORTANCE_LABELS } from "@/lib/types";
import { KIND_LABELS, type ItemKind } from "@/lib/itemMeta";
import { useStore } from "@/lib/store";
import { CloseIcon } from "./Icons";

type Props = {
  defaultDate: Date;
  onClose: () => void;
};

const KIND_ORDER: ItemKind[] = ["bill", "installment", "recurringTodo", "oneOff"];

export function AddItemSheet({ defaultDate, onClose }: Props) {
  const { addBill, addInstallment, addRecurringTodo, addOneOff } = useStore();
  const [kind, setKind] = useState<ItemKind>("bill");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState(getDate(defaultDate));
  const [importance, setImportance] = useState<Importance>("orta");
  const [startDate, setStartDate] = useState(toKey(defaultDate));
  const [count, setCount] = useState(3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (kind === "bill") {
      addBill({
        name: name.trim(),
        amount: amount ? Number(amount) : undefined,
        dayOfMonth,
        importance,
      });
    } else if (kind === "installment") {
      if (!amount || count < 1) return;
      addInstallment({
        name: name.trim(),
        amount: Number(amount),
        startDate,
        count,
        importance,
      });
    } else if (kind === "recurringTodo") {
      addRecurringTodo({ title: name.trim(), startDate });
    } else {
      addOneOff({ title: name.trim(), date: startDate });
    }
    onClose();
  }

  const isPayment = kind === "bill" || kind === "installment";

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 sm:rounded-2xl">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-base font-medium text-zinc-900">Yeni kayıt</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100"
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
                "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium",
                kind === k
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-600",
              ].join(" ")}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            {kind === "recurringTodo" || kind === "oneOff" ? "Başlık" : "Ad"}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="min-h-11 rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
              placeholder={kind === "bill" ? "Örn. İnternet" : kind === "installment" ? "Örn. Telefon taksiti" : "Örn. İlaç al"}
            />
          </label>

          {isPayment && (
            <label className="flex flex-col gap-1 text-sm text-zinc-600">
              Tutar {kind === "bill" ? "(opsiyonel)" : ""}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required={kind === "installment"}
                className="min-h-11 rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
                placeholder="TL"
              />
            </label>
          )}

          {kind === "bill" && (
            <label className="flex flex-col gap-1 text-sm text-zinc-600">
              Ayın kaçında
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                required
                className="min-h-11 rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
              />
            </label>
          )}

          {kind === "installment" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-zinc-600">
                İlk taksit tarihi
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="min-h-11 rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-zinc-600">
                Taksit sayısı
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  required
                  className="min-h-11 rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
                />
              </label>
            </>
          )}

          {(kind === "recurringTodo" || kind === "oneOff") && (
            <label className="flex flex-col gap-1 text-sm text-zinc-600">
              {kind === "recurringTodo" ? "Başlangıç tarihi" : "Tarih"}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="min-h-11 rounded-lg border border-zinc-200 px-3 text-base text-zinc-900"
              />
            </label>
          )}

          {isPayment && (
            <div className="flex flex-col gap-1 text-sm text-zinc-600">
              Önem
              <div className="grid grid-cols-3 gap-2">
                {(["yuksek", "orta", "dusuk"] as Importance[]).map((imp) => (
                  <button
                    key={imp}
                    type="button"
                    onClick={() => setImportance(imp)}
                    className={[
                      "min-h-11 rounded-lg border text-sm font-medium",
                      importance === imp
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 text-zinc-600",
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
            className="mt-2 min-h-11 rounded-xl bg-zinc-900 text-sm font-medium text-white active:bg-zinc-700"
          >
            Ekle
          </button>
        </form>
      </div>
    </div>
  );
}
