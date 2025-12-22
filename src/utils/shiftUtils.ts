/**
 * Shift Utilities
 * Helper functions for shift operations
 */

import { format, parse, differenceInMinutes } from 'date-fns';
import type { Shift, ShiftReference } from '../api/dataverse/types';
import { ShiftStatus } from '../api/dataverse/types';

/**
 * Determine shift type based on start time
 */
export function getShiftType(startHour: number): 'day' | 'night' | 'sleepIn' {
  if (startHour >= 6 && startHour < 14) return 'day';
  if (startHour >= 14 && startHour < 22) return 'night';
  return 'sleepIn';
}

/**
 * Check if a shift is published
 */
export function isShiftPublished(shift: Shift): boolean {
  return shift.cp365_shiftstatus === ShiftStatus.Published;
}

/**
 * Format time for display (HH:mm)
 */
export function formatTime(dateTimeStr: string): string {
  try {
    const date = new Date(dateTimeStr);
    return format(date, 'HH:mm');
  } catch {
    return '--:--';
  }
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): number {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalMinutes = differenceInMinutes(end, start);
    return Math.max(0, (totalMinutes - breakMinutes) / 60);
  } catch {
    return 0;
  }
}

/**
 * Build time string from shift reference
 */
export function buildTimeFromReference(
  ref: ShiftReference,
  type: 'start' | 'end'
): string {
  const hour = type === 'start' ? ref.cp365_shiftreferencestarthour : ref.cp365_shiftreferenceendhour;
  const minute = type === 'start' ? ref.cp365_shiftreferencestartminute : ref.cp365_shiftreferenceendminute;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Get shift display name
 */
export function getShiftDisplayName(shift: Shift): string {
  const startTime = formatTime(shift.cp365_shiftstarttime);
  const endTime = formatTime(shift.cp365_shiftendtime);
  return `${startTime} - ${endTime}`;
}

/**
 * Get shift colour based on type and flags
 */
export function getShiftColour(shift: {
  shiftType: 'day' | 'night' | 'sleepIn';
  isOvertime?: boolean;
}): string {
  if (shift.isOvertime) return 'bg-shift-overtime';
  
  const colours = {
    day: 'bg-shift-day',
    night: 'bg-shift-night',
    sleepIn: 'bg-shift-sleepin',
  };
  
  return colours[shift.shiftType] || colours.day;
}

/**
 * Check for shift time clash
 */
export function hasTimeClash(
  shift1: { startTime: Date; endTime: Date },
  shift2: { startTime: Date; endTime: Date }
): boolean {
  return (
    shift1.startTime < shift2.endTime && shift1.endTime > shift2.startTime
  );
}

/**
 * Group shifts by staff member
 */
export function groupShiftsByStaff(
  shifts: Shift[]
): Map<string | null, Shift[]> {
  const grouped = new Map<string | null, Shift[]>();

  for (const shift of shifts) {
    const staffId = shift._cp365_staffmember_value || null;
    const existing = grouped.get(staffId) || [];
    existing.push(shift);
    grouped.set(staffId, existing);
  }

  return grouped;
}

/**
 * Sort shifts by start time
 */
export function sortShiftsByTime(shifts: Shift[]): Shift[] {
  return [...shifts].sort((a, b) => {
    const timeA = new Date(a.cp365_shiftstarttime).getTime();
    const timeB = new Date(b.cp365_shiftstarttime).getTime();
    return timeA - timeB;
  });
}

/**
 * Calculate total hours for a collection of shifts
 */
export function calculateTotalHours(
  shifts: Shift[],
  includeBreaks: boolean = false
): number {
  return shifts.reduce((total, shift) => {
    const duration = calculateShiftDuration(
      shift.cp365_shiftstarttime,
      shift.cp365_shiftendtime,
      includeBreaks ? 0 : (shift as any).cr1e2_shiftbreakduration
    );
    return total + duration;
  }, 0);
}

