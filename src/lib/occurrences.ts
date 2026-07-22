import {
  clampToMonth,
  differenceInCalendarDays,
  fromKey,
  getDate,
  isSameDay,
  toKey,
  weekStart,
} from "./date";
import type { AnyItem, CompletionMap, Importance, PaymentItem, StoreData } from "./types";
import { IMPORTANCE_THRESHOLD_DAYS, completionKey } from "./types";

export type Occurrence = {
  key: string; // completionKey(item.id, dateKey)
  dateKey: string;
  date: Date;
  item: AnyItem;
  done: boolean;
  /** 1-based index and total count, only set for installments */
  installmentProgress?: { index: number; total: number };
};

function isPaymentDay(item: AnyItem, date: Date): boolean {
  const y = date.getFullYear();
  const m = date.getMonth();

  if (item.kind === "bill") {
    if (!item.active) return false;
    const created = fromKey(item.createdAt.slice(0, 10));
    if (date < startOfDay(created)) return false;
    const clamped = clampToMonth(y, m, item.dayOfMonth);
    return isSameDay(date, clamped);
  }

  if (item.kind === "installment") {
    const start = fromKey(item.startDate);
    const dayOfMonth = getDate(start);
    const monthDiff = (y - start.getFullYear()) * 12 + (m - start.getMonth());
    if (monthDiff < 0 || monthDiff >= item.count) return false;
    const clamped = clampToMonth(y, m, dayOfMonth);
    return isSameDay(date, clamped);
  }

  if (item.kind === "recurringTodo" || item.kind === "weeklyTodo") {
    if (!item.active) return false;
    const start = fromKey(item.startDate);
    return date >= startOfDay(start);
  }

  // oneOff
  return isSameDay(date, fromKey(item.date));
}

/** Weekly todos share one completion across their whole Mon-Sun week (so checking
 * it off on any day marks the week done, and it resets automatically next week). */
function occurrenceKeyFor(item: AnyItem, date: Date, dateKey: string): string {
  if (item.kind === "weeklyTodo") {
    return completionKey(item.id, toKey(weekStart(date)));
  }
  return completionKey(item.id, dateKey);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function installmentProgressFor(item: AnyItem, date: Date) {
  if (item.kind !== "installment") return undefined;
  const start = fromKey(item.startDate);
  const monthDiff =
    (date.getFullYear() - start.getFullYear()) * 12 +
    (date.getMonth() - start.getMonth());
  return { index: monthDiff + 1, total: item.count };
}

export function occurrencesForRange(
  data: StoreData,
  completions: CompletionMap,
  rangeStart: Date,
  rangeEnd: Date
): Occurrence[] {
  const items: AnyItem[] = [
    ...data.bills,
    ...data.installments,
    ...data.recurringTodos,
    ...data.weeklyTodos,
    ...data.oneOffs,
  ];
  const result: Occurrence[] = [];
  const dayCount = differenceInCalendarDays(rangeEnd, rangeStart) + 1;

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i);
    const dateKey = toKey(date);
    for (const item of items) {
      if (!isPaymentDay(item, date)) continue;
      const key = occurrenceKeyFor(item, date, dateKey);
      result.push({
        key,
        dateKey,
        date,
        item,
        done: completions[key]?.done ?? false,
        installmentProgress: installmentProgressFor(item, date),
      });
    }
  }

  return result;
}

export function occurrencesForDay(
  data: StoreData,
  completions: CompletionMap,
  day: Date
): Occurrence[] {
  return occurrencesForRange(data, completions, day, day);
}

export type Reminder = Omit<Occurrence, "item"> & {
  item: PaymentItem;
  daysUntilDue: number;
  overdue: boolean;
};

/** Payment-type occurrences (bills/installments) that are unpaid and within their
 * importance threshold window, or overdue. Sorted overdue-first, then soonest-first. */
export function computeReminders(
  data: StoreData,
  completions: CompletionMap,
  today: Date
): Reminder[] {
  const rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 45);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 31);
  const occurrences = occurrencesForRange(data, completions, rangeStart, rangeEnd);
  const todayStart = startOfDay(today);

  const reminders: Reminder[] = [];
  for (const occ of occurrences) {
    const item = occ.item;
    if (item.kind !== "bill" && item.kind !== "installment") continue;
    if (occ.done) continue;
    const daysUntilDue = differenceInCalendarDays(occ.date, todayStart);
    const overdue = daysUntilDue < 0;
    const importance: Importance = item.importance;
    const threshold = IMPORTANCE_THRESHOLD_DAYS[importance];
    if (!overdue && daysUntilDue > threshold) continue;
    reminders.push({ ...occ, item, daysUntilDue, overdue });
  }

  reminders.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.daysUntilDue - b.daysUntilDue;
  });

  return reminders;
}
