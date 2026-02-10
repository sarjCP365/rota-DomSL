/**
 * Date Utilities
 * Helper functions for date manipulation
 */

import {
  startOfWeek,
  addDays,
  addWeeks,
  differenceInDays,
  format,
  parse,
  isWithinInterval,
  eachDayOfInterval,
} from 'date-fns';

/**
 * Get Monday of the week containing the given date
 */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get the default rota view date (Monday of current week)
 */
export function getDefaultRotaViewDate(): Date {
  return getWeekStart(new Date());
}

/**
 * Get an array of dates for a given range
 */
export function getDateRange(startDate: Date, days: number): Date[] {
  return eachDayOfInterval({
    start: startDate,
    end: addDays(startDate, days - 1),
  });
}

/**
 * Calculate the zone identifier for a shift (used for grid positioning)
 * Zone format: "{dayIndex}|{staffMemberId}" or "{dayIndex}|unassigned"
 */
export function calculateZone(shiftDate: Date, startDate: Date, staffMemberId?: string): string {
  const dayIndex = differenceInDays(shiftDate, startDate) + 1;
  return staffMemberId ? `${dayIndex}|${staffMemberId}` : `${dayIndex}|unassigned`;
}

/**
 * Parse a zone string into its components
 */
export function parseZone(zone: string): { dayIndex: number; staffMemberId: string | null } {
  const [dayIndexStr, staffMemberId] = zone.split('|');
  return {
    dayIndex: parseInt(dayIndexStr, 10),
    staffMemberId: staffMemberId === 'unassigned' ? null : staffMemberId,
  };
}

/**
 * Format date for display in the UI
 */
export function formatDisplayDate(date: Date, formatStr: string = 'd MMM yyyy'): string {
  return format(date, formatStr);
}

/**
 * Format date for Dataverse API
 */
export function formatDataverseDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format date for Power Automate flows
 */
export function formatFlowDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

/**
 * Parse date from Dataverse format
 */
export function parseDataverseDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Check if a date falls within a range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return isWithinInterval(date, { start: startDate, end: endDate });
}

/**
 * Get the day of week name
 */
export function getDayName(date: Date): string {
  return format(date, 'EEEE');
}

/**
 * Get short day name (Mon, Tue, etc.)
 */
export function getShortDayName(date: Date): string {
  return format(date, 'EEE');
}

/**
 * Navigate to the next period
 */
export function getNextPeriod(currentDate: Date, duration: 7 | 14 | 28): Date {
  const weeks = duration === 28 ? 4 : duration === 14 ? 2 : 1;
  return addWeeks(currentDate, weeks);
}

/**
 * Navigate to the previous period
 */
export function getPreviousPeriod(currentDate: Date, duration: 7 | 14 | 28): Date {
  const weeks = duration === 28 ? 4 : duration === 14 ? 2 : 1;
  return addWeeks(currentDate, -weeks);
}
