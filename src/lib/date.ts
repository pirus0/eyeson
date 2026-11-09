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

/** Same output as format(date, DATE_FMT), built by hand — this runs thousands
 * of times per tick in the occurrence engine and date-fns' format is slow. */
export function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${String(y).padStart(4, "0")}-${m < 10 ? "0" : ""}${m}-${d < 10 ? "0" : ""}${d}`;
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

/** Two-letter weekday labels, Monday first (matches the calendar grid). */
export const WEEKDAY_SHORT = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/** 0 = Monday … 6 = Sunday. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
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

export function formatShort(date: Date): string {
  return format(date, "d MMM", { locale: tr });
}

export { addDays, addMonths, differenceInCalendarDays, getDate, isSameDay, setDate };
