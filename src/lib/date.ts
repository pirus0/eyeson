import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDate,
  getDaysInMonth,
  isSameDay,
  parseISO,
  setDate,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";

export const DATE_FMT = "yyyy-MM-dd";

export function toKey(date: Date): string {
  return format(date, DATE_FMT);
}

export function fromKey(key: string): Date {
  return parseISO(key);
}

export function todayKey(): string {
  return toKey(new Date());
}

/** Clamp a target day-of-month into a given month (e.g. 31 -> 28/29/30 when short). */
export function clampToMonth(year: number, monthIndex: number, day: number): Date {
  const last = getDaysInMonth(new Date(year, monthIndex, 1));
  return new Date(year, monthIndex, Math.min(day, last));
}

/** Monday of the week containing `date` (weeks run Mon-Sun, matching the calendar grid). */
export function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function monthGrid(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const startWeekday = (start.getDay() + 6) % 7; // Monday = 0
  const endWeekday = (end.getDay() + 6) % 7;
  const gridStart = addDays(start, -startWeekday);
  const gridEnd = addDays(end, 6 - endWeekday);
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function formatMonthTitle(date: Date): string {
  return format(date, "LLLL yyyy", { locale: tr });
}

export function formatDayTitle(date: Date): string {
  return format(date, "d LLLL yyyy, EEEE", { locale: tr });
}

export function formatShort(date: Date): string {
  return format(date, "d MMM", { locale: tr });
}

export { addDays, addMonths, differenceInCalendarDays, getDate, isSameDay, setDate };
