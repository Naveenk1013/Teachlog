import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parseISO,
  isWithinInterval,
  subDays,
  subHours,
  getWeekOfMonth,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const TIMEZONE = "Asia/Kolkata";

/**
 * Returns current Date in Asia/Kolkata timezone
 */
export function getNowInIST(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Calculates the current week number of the respective month (Week 1 to 5)
 * Week starts on Monday (weekStartsOn: 1)
 */
export function getTeachingWeekOfMonth(date: Date | string): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  return getWeekOfMonth(d, { weekStartsOn: 1 });
}

/**
 * Returns the Monday (week_start) for a given date
 */
export function getWeekStart(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn: 1 });
}

/**
 * Returns the 6 teaching days (Monday to Saturday) for a given week start
 */
export function getTeachingWeekDays(weekStart: Date | string): { date: Date; dateString: string; dayName: string }[] {
  const start = typeof weekStart === "string" ? parseISO(weekStart) : weekStart;
  const days = [];
  for (let i = 0; i < 6; i++) {
    const current = addDays(start, i);
    days.push({
      date: current,
      dateString: format(current, "yyyy-MM-dd"),
      dayName: format(current, "EEEE"),
    });
  }
  return days;
}

/**
 * Validates if session date is within CR backdating limit (at most 2 days prior and not in future)
 */
export function isWithinCRDateLimit(sessionDate: Date | string): boolean {
  const now = getNowInIST();
  const date = typeof sessionDate === "string" ? parseISO(sessionDate) : sessionDate;
  const twoDaysAgo = subDays(now, 2);
  return isWithinInterval(date, { start: twoDaysAgo, end: now });
}

/**
 * Validates if an entry is within the 24-hour edit window
 */
export function isWithinCREditWindow(createdAt: Date | string): boolean {
  const created = typeof createdAt === "string" ? parseISO(createdAt) : createdAt;
  const cutoff = subHours(new Date(), 24);
  return created >= cutoff;
}

/**
 * Standard date and time formatters
 */
export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDayAndDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE, dd/MM/yyyy");
}
