import {
  clampToMonth,
  differenceInCalendarDays,
  fromKey,
  getDate,
  mondayIndex,
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
  /** Credit cards only: the amount entered for this cycle's statement. */
  cardAmount?: number;
};

/** yyyymmdd as one integer — compares like the date it stands for. */
function dayNum(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** The per-day facts every item check needs, worked out once per day instead
 * of once per item per day. */
type DayInfo = {
  date: Date;
  dateKey: string;
  num: number;
  y: number;
  m: number;
  d: number;
  daysInMonth: number;
  weekday: number; // 0 = Monday
  weekKey: string | null; // filled in on first use
};

/** Each item's dates parsed once per range call — parsing them inside the
 * day loop (hundreds of days × every item) is what made each tick slow. */
type Prepared = { item: AnyItem; from: number; aux: number };

function prepare(item: AnyItem): Prepared {
  switch (item.kind) {
    case "bill":
    case "creditCard":
      return { item, from: dayNum(fromKey(item.createdAt.slice(0, 10))), aux: 0 };
    case "installment": {
      const start = fromKey(item.startDate);
      return {
        item,
        from: start.getFullYear() * 12 + start.getMonth(),
        aux: getDate(start),
      };
    }
    case "recurringTodo":
    case "weeklyTodo":
      return { item, from: dayNum(fromKey(item.startDate)), aux: 0 };
    case "oneOff":
      // aux = the assigned day's number, 0 = unscheduled.
      return { item, from: 0, aux: item.date ? dayNum(fromKey(item.date)) : 0 };
  }
}

function hitsDay(p: Prepared, day: DayInfo): boolean {
  const item = p.item;
  switch (item.kind) {
    case "bill":
      if (!item.active || day.num < p.from) return false;
      return day.d === Math.min(item.dayOfMonth, day.daysInMonth);
    case "installment": {
      const monthDiff = day.y * 12 + day.m - p.from;
      if (monthDiff < 0 || monthDiff >= item.count) return false;
      return day.d === Math.min(p.aux, day.daysInMonth);
    }
    case "recurringTodo":
    case "weeklyTodo":
      if (!item.active || day.num < p.from) return false;
      if (item.kind === "weeklyTodo" && item.weekday !== undefined) {
        return day.weekday === item.weekday;
      }
      return true;
    case "oneOff":
      // Unscheduled — waiting to be assigned a day, never occupies one on its own.
      return p.aux !== 0 && day.num === p.aux;
    default:
      // creditCard is generated separately (two dates a month, own keys).
      return false;
  }
}

function isCreditCardDay(item: CreditCard, from: number, dom: number, day: DayInfo): boolean {
  if (!item.active || day.num < from) return false;
  return day.d === Math.min(dom, day.daysInMonth);
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
function occurrenceKeyFor(item: AnyItem, day: DayInfo): string {
  if (item.kind === "weeklyTodo") {
    day.weekKey ??= toKey(new Date(day.y, day.m, day.d - day.weekday));
    return completionKey(item.id, day.weekKey);
  }
  return completionKey(item.id, day.dateKey);
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
  const prepared = items.map(prepare);
  const result: Occurrence[] = [];
  const dayCount = differenceInCalendarDays(rangeEnd, rangeStart) + 1;

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i);
    const y = date.getFullYear();
    const m = date.getMonth();
    const day: DayInfo = {
      date,
      dateKey: toKey(date),
      num: dayNum(date),
      y,
      m,
      d: date.getDate(),
      daysInMonth: new Date(y, m + 1, 0).getDate(),
      weekday: mondayIndex(date),
      weekKey: null,
    };
    const dateKey = day.dateKey;
    for (const p of prepared) {
      const item = p.item;
      if (item.kind === "creditCard") {
        // Two independent monthly recurrences (statement, due), tracked with
        // their own completion keys so marking one doesn't affect the other.
        if (isCreditCardDay(item, p.from, item.statementDay, day)) {
          const key = completionKey(`${item.id}:statement`, dateKey);
          const c = completions[key];
          result.push({
            key,
            dateKey,
            date,
            item,
            done: c?.done ?? false,
            role: "statement",
            cardAmount: c?.done ? c.amount : undefined,
          });
        }
        if (isCreditCardDay(item, p.from, item.dueDay, day)) {
          const key = completionKey(`${item.id}:due`, dateKey);
          const statementKey = completionKey(
            `${item.id}:statement`,
            toKey(creditCardCompanionDate(item, date, "due"))
          );
          const s = completions[statementKey];
          result.push({
            key,
            dateKey,
            date,
            item,
            done: completions[key]?.done ?? false,
            role: "due",
            cardAmount: s?.done ? s.amount : undefined,
          });
        }
        continue;
      }
      if (!hitsDay(p, day)) continue;
      const key = occurrenceKeyFor(item, day);
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

/** The one place that decides which occurrence kinds carry an importance
 * level, and which one — the calendar's urgent-day marker, the day panel's
 * importance dot/sink-to-bottom rule, and the reminders list all read this
 * instead of each re-deriving their own kind list (which had already drifted:
 * an assigned one-off with high importance lit up everywhere except the
 * calendar day cell, because that filter alone forgot to include "oneOff"). */
export function occurrenceImportance(occ: {
  item: AnyItem;
  role?: Occurrence["role"];
}): Importance | undefined {
  const { item } = occ;
  if (item.kind === "bill" || item.kind === "installment" || item.kind === "oneOff") {
    return item.importance;
  }
  // A credit card's statement date is informational only — urgency belongs
  // to the due date alone, so you're not chasing two lit days per card.
  if (item.kind === "creditCard" && occ.role === "due") {
    return item.importance;
  }
  return undefined;
}

/** The amount to show for an occurrence, if any — bills/installments/cards
 * carry one, everything else (todos, unassigned one-offs) doesn't. */
export function occurrenceAmount(occ: {
  item: AnyItem;
  role?: Occurrence["role"];
  cardAmount?: number;
}): number | undefined {
  const { item } = occ;
  if (item.kind === "creditCard") {
    if (occ.cardAmount !== undefined) return occ.cardAmount;
    // The old fixed amount belongs on the due date only.
    return occ.role === "due" ? item.amount : undefined;
  }
  if (item.kind === "bill" || item.kind === "installment") {
    return item.amount;
  }
  return undefined;
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
  // recurringTodo/weeklyTodo are never reminders (filtered out below anyway) but
  // their occurrence predicate is true almost every day — excluding them here
  // stops occurrencesForRange from materializing ~430 throwaway entries each.
  const relevantData: StoreData = { ...data, recurringTodos: [], weeklyTodos: [] };
  const occurrences = occurrencesForRange(relevantData, completions, rangeStart, rangeEnd);
  const todayStart = startOfDay(today);

  const reminders: Reminder[] = [];
  for (const occ of occurrences) {
    const item = occ.item;
    if (occ.done) continue;
    const importance = occurrenceImportance(occ);
    if (importance === undefined) continue;
    const daysUntilDue = differenceInCalendarDays(occ.date, todayStart);
    const overdue = daysUntilDue < 0;
    const threshold = IMPORTANCE_THRESHOLD_DAYS[importance];
    if (!overdue && daysUntilDue > threshold) continue;
    reminders.push({ ...occ, item: item as PaymentItem | OneOff, daysUntilDue, overdue });
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
  // recurringTodo is filtered out below anyway (it resets fresh each day, never
  // "overdue") — excluding it here stops occurrencesForRange from materializing
  // ~400 throwaway entries per item.
  const relevantData: StoreData = { ...data, recurringTodos: [] };
  const occurrences = occurrencesForRange(relevantData, completions, rangeStart, rangeEnd);
  const currentWeekStart = weekStart(todayStart);

  const seen = new Set<string>();
  const result: Occurrence[] = [];
  for (const occ of occurrences) {
    if (occ.done) continue;
    if (occ.item.kind === "recurringTodo") continue;
    // The statement date is informational only, never overdue.
    if (occ.item.kind === "creditCard" && occ.role !== "due") continue;
    // A weekly todo pinned to a day is overdue once that day passes, like
    // any dated task. An old any-day-of-the-week one only once its whole
    // week (Mon-Sun) has passed — days gone by within the current week
    // don't count.
    if (
      occ.item.kind === "weeklyTodo" &&
      occ.item.weekday === undefined &&
      weekStart(occ.date) >= currentWeekStart
    )
      continue;
    // Weekly todos share one key across the whole week (several days in the
    // range map to the same key) — keep only the first (earliest) hit.
    if (seen.has(occ.key)) continue;
    seen.add(occ.key);
    result.push({ ...occ, carriedOverdue: true });
  }

  return result;
}
