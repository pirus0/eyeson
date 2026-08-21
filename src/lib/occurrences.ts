import {
  clampToMonth,
  differenceInCalendarDays,
  fromKey,
  getDate,
  isSameDay,
  toKey,
  weekStart,
} from "./date";
import type {
  AnyItem,
  CompletionMap,
  CreditCard,
  Importance,
  OneOff,
  PaymentItem,
  StoreData,
} from "./types";
import { IMPORTANCE_THRESHOLD_DAYS, completionKey } from "./types";

export type Occurrence = {
  key: string; // completionKey(item.id, dateKey)
  dateKey: string;
  date: Date;
  item: AnyItem;
  done: boolean;
  /** 1-based index and total count, only set for installments */
  installmentProgress?: { index: number; total: number };
  /** Only set for credit card occurrences: which half of the cycle this is. */
  role?: "statement" | "due";
  /** Set when this occurrence is being surfaced on a later day than its own
   * date because it was never marked done — see computeOverdue. */
  carriedOverdue?: boolean;
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

  if (item.kind === "oneOff") {
    // Unscheduled — waiting to be assigned a day, never occupies one on its own.
    if (!item.date) return false;
    return isSameDay(date, fromKey(item.date));
  }

  // creditCard is generated separately in occurrencesForRange (two dates a
  // month, tracked with their own completion keys) — never reaches here.
  return false;
}

function isCreditCardDay(item: CreditCard, day: number, date: Date): boolean {
  if (!item.active) return false;
  const created = fromKey(item.createdAt.slice(0, 10));
  if (date < startOfDay(created)) return false;
  const clamped = clampToMonth(date.getFullYear(), date.getMonth(), day);
  return isSameDay(date, clamped);
}

/** The other date in a credit card's cycle relative to a given occurrence —
 * e.g. from the due-date row, which statement date produced it. Rolls into
 * the neighboring month when the day numbers wrap (statement late in the
 * month, due date early in the next one, the common case). */
export function creditCardCompanionDate(
  item: CreditCard,
  occDate: Date,
  role: "statement" | "due"
): Date {
  const y = occDate.getFullYear();
  const m = occDate.getMonth();
  if (role === "statement") {
    const targetMonth = item.dueDay >= item.statementDay ? m : m + 1;
    return clampToMonth(y, targetMonth, item.dueDay);
  }
  const targetMonth = item.statementDay <= item.dueDay ? m : m - 1;
  return clampToMonth(y, targetMonth, item.statementDay);
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
    ...data.creditCards,
  ];
  const result: Occurrence[] = [];
  const dayCount = differenceInCalendarDays(rangeEnd, rangeStart) + 1;

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i);
    const dateKey = toKey(date);
    for (const item of items) {
      if (item.kind === "creditCard") {
        // Two independent monthly recurrences (statement, due), tracked with
        // their own completion keys so marking one doesn't affect the other.
        if (isCreditCardDay(item, item.statementDay, date)) {
          const key = completionKey(`${item.id}:statement`, dateKey);
          result.push({
            key,
            dateKey,
            date,
            item,
            done: completions[key]?.done ?? false,
            role: "statement",
          });
        }
        if (isCreditCardDay(item, item.dueDay, date)) {
          const key = completionKey(`${item.id}:due`, dateKey);
          result.push({
            key,
            dateKey,
            date,
            item,
            done: completions[key]?.done ?? false,
            role: "due",
          });
        }
        continue;
      }
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

/** One-off tasks with no day yet — created via the question-mark panel (or
 * left blank in the add sheet) and waiting to be assigned one. */
export function unscheduledOneOffs(data: StoreData): OneOff[] {
  return data.oneOffs.filter((o) => !o.date);
}

export type Reminder = Omit<Occurrence, "item"> & {
  item: PaymentItem | OneOff;
  daysUntilDue: number;
  overdue: boolean;
};

/** Payment-type occurrences (bills/installments) that are unpaid and within their
 * importance threshold window, or overdue — plus assigned one-off tasks that
 * were given an importance (via "Ata"), which follow the exact same rule.
 * Sorted overdue-first, then soonest-first. */
export function computeReminders(
  data: StoreData,
  completions: CompletionMap,
  today: Date
): Reminder[] {
  // 400 days back so a bill that's been forgotten for months still surfaces
  // as overdue instead of silently aging out of the reminder list.
  const rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 400);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 31);
  const occurrences = occurrencesForRange(data, completions, rangeStart, rangeEnd);
  const todayStart = startOfDay(today);

  const reminders: Reminder[] = [];
  for (const occ of occurrences) {
    const item = occ.item;
    const isPayment = item.kind === "bill" || item.kind === "installment" || item.kind === "creditCard";
    const isImportantOneOff = item.kind === "oneOff" && item.importance !== undefined;
    if (!isPayment && !isImportantOneOff) continue;
    // The statement date is informational (nothing to pay yet) — only the
    // due date carries urgency, so only it becomes a reminder.
    if (item.kind === "creditCard" && occ.role !== "due") continue;
    if (occ.done) continue;
    const daysUntilDue = differenceInCalendarDays(occ.date, todayStart);
    const overdue = daysUntilDue < 0;
    const importance = item.importance as Importance;
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

/** Every kind except the daily recurring todo (which reappears fresh each day
 * on its own) can be left undone and silently slide off the calendar once
 * its day passes. This surfaces anything still unfinished — one-off tasks,
 * whole unfinished weeks, unpaid bills/installments/card due-dates — so it
 * follows the user into "today" instead of disappearing. Marking one done
 * uses its original occurrence key, so it settles on the day it was actually
 * due rather than spawning a new completion on today's date. */
export function computeOverdue(
  data: StoreData,
  completions: CompletionMap,
  today: Date
): Occurrence[] {
  const todayStart = startOfDay(today);
  const rangeStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - 400);
  const rangeEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - 1);
  const occurrences = occurrencesForRange(data, completions, rangeStart, rangeEnd);
  const currentWeekStart = weekStart(todayStart);

  const seen = new Set<string>();
  const result: Occurrence[] = [];
  for (const occ of occurrences) {
    if (occ.done) continue;
    if (occ.item.kind === "recurringTodo") continue;
    // The statement date is informational only, never overdue.
    if (occ.item.kind === "creditCard" && occ.role !== "due") continue;
    // A weekly todo is only overdue once its whole week (Mon-Sun) has
    // passed — days already gone by within the current week don't count.
    if (occ.item.kind === "weeklyTodo" && weekStart(occ.date) >= currentWeekStart) continue;
    // Weekly todos share one key across the whole week (several days in the
    // range map to the same key) — keep only the first (earliest) hit.
    if (seen.has(occ.key)) continue;
    seen.add(occ.key);
    result.push({ ...occ, carriedOverdue: true });
  }

  return result;
}
