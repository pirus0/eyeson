// The morning notification must say what the bell says.
import test from "node:test";
import assert from "node:assert/strict";
import { message } from "../scripts/notify";
import { computeReminders } from "../src/lib/occurrences";
import { emptyData } from "../src/lib/storage";
import type { StoreData } from "../src/lib/types";

const stamp = "2026-11-01T10:00:00.000Z";
const today = new Date(2026, 10, 20);

test("bildirim: zildeki kayıtları gecikmiş önce, durumuyla yazar", () => {
  const data: StoreData = { ...emptyData(),
    bills: [
      { id: "b1", kind: "bill", name: "Kira", dayOfMonth: 18, importance: "yuksek", createdAt: stamp, active: true },
      { id: "b2", kind: "bill", name: "Elektrik", dayOfMonth: 21, importance: "orta", createdAt: stamp, active: true },
      { id: "b3", kind: "bill", name: "Su", dayOfMonth: 28, importance: "dusuk", createdAt: stamp, active: true },
    ] };
  const reminders = computeReminders(data, data.completions, today);
  const msg = message(reminders);
  // Su 8 gün sonra, düşük önem (1 gün eşiği) → zilde yok, bildirimde de yok.
  assert.equal(msg?.count, reminders.length);
  assert.equal(msg?.title, "1 gecikmiş · 1 yaklaşan");
  assert.equal(msg?.body, "Kira — 2 gün gecikti\nElektrik — yarın");
});

test("bildirim: hatırlatılacak kayıt yoksa gönderilmez", () => {
  assert.equal(message([]), null);
});
