/**
 * Attendance Status Utilities
 *
 * Calculates and displays staff attendance status using real clock-in/out data
 * from the cp365_timesheetclocks Dataverse table.
 *
 * Status logic:
 *  - Absent:    Shift explicitly marked as absent (status code)
 *  - Worked:    Has clock-in AND clock-out (shift completed)
 *  - Present:   Has clock-in but no clock-out (currently working)
 *  - Late:      Shift is currently active, no clock-in recorded
 *  - Scheduled: Shift hasn't started yet, OR shift has ended with no clock data
 *
 * Early/late arrival annotations are computed in AttendanceDetails (minutesEarly /
 * minutesLate) and displayed as secondary info alongside the clock-in time.
 */

import type { ShiftViewData } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Attendance status for a shift
 */
export type AttendanceStatus = 'present' | 'scheduled' | 'worked' | 'absent' | 'late';

/**
 * Extended shift data with clock-in/out times.
 * These fields are populated by mergeClockDataIntoShifts() in the Daily View.
 */
export interface ShiftWithAttendance extends ShiftViewData {
  'Clocked In'?: string | null;
  'Clocked Out'?: string | null;
  'Shift Status Code'?: number;
}

/**
 * Attendance status details for display
 */
export interface AttendanceDetails {
  status: AttendanceStatus;
  clockedInTime: Date | null;
  clockedOutTime: Date | null;
  shiftStartTime: Date;
  shiftEndTime: Date;
  /** Minutes the staff member clocked in after the shift start (> 0 = late arrival) */
  minutesLate: number;
  /** Minutes the staff member clocked in before the shift start (> 0 = early arrival) */
  minutesEarly: number;
  isOvernight: boolean;
  /** Whether the shift has ended (past its end time) */
  hasEnded: boolean;
}

// =============================================================================
// Status Codes
// =============================================================================

export const ShiftStatusCodes = {
  Published: 1001,
  Unpublished: 1009,
  Absent: 1002, // Placeholder — update with actual absent status code
} as const;

/** Grace period in minutes before a shift is considered "late" */
const LATE_GRACE_MINUTES = 5;

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Calculate the effective end time for a shift, handling overnight shifts.
 */
function getEffectiveEndTime(shiftStart: Date | null, shiftEnd: Date | null): Date | null {
  if (!shiftEnd) return null;
  if (shiftStart && shiftEnd < shiftStart) {
    const adjusted = new Date(shiftEnd);
    adjusted.setDate(adjusted.getDate() + 1);
    return adjusted;
  }
  return shiftEnd;
}

/**
 * Calculate the attendance status for a shift.
 *
 * Requires real clock-in/out data from cp365_timesheetclocks to produce
 * accurate results. Without clock data, past shifts show as "Scheduled"
 * rather than incorrectly showing "Late".
 */
export function getAttendanceStatus(
  shift: ShiftWithAttendance,
  referenceTime: Date = new Date()
): AttendanceStatus {
  const shiftStart = parseShiftTime(shift['Shift Start Time']);
  const shiftEnd = parseShiftTime(shift['Shift End Time']);
  const clockedIn = shift['Clocked In'] ? new Date(shift['Clocked In']) : null;
  const clockedOut = shift['Clocked Out'] ? new Date(shift['Clocked Out']) : null;
  const effectiveEnd = getEffectiveEndTime(shiftStart, shiftEnd);

  // Check for explicit absent status
  const statusCode = shift['Shift Status Code'] ?? shift['Shift Status'];
  if (statusCode === ShiftStatusCodes.Absent) {
    return 'absent';
  }

  // Worked: has both clock-in and clock-out
  if (clockedIn && clockedOut) {
    return 'worked';
  }

  // Present: clocked in but not out (currently working)
  if (clockedIn && !clockedOut) {
    return 'present';
  }

  // No clock-in recorded — determine status based on shift timing
  if (!clockedIn) {
    const hasStarted = shiftStart && shiftStart <= referenceTime;
    const hasEnded = effectiveEnd && effectiveEnd <= referenceTime;

    if (hasStarted && !hasEnded) {
      // Shift is currently active with no clock-in — Late (after grace period)
      const minutesSinceStart = shiftStart
        ? Math.floor((referenceTime.getTime() - shiftStart.getTime()) / (1000 * 60))
        : 0;
      if (minutesSinceStart > LATE_GRACE_MINUTES) {
        return 'late';
      }
    }

    // Shift hasn't started yet, or has already ended with no clock data
    // In both cases, "Scheduled" is the safest — we don't have attendance evidence
    return 'scheduled';
  }

  return 'scheduled';
}

/**
 * Get full attendance details for a shift
 */
export function getAttendanceDetails(
  shift: ShiftWithAttendance,
  referenceTime: Date = new Date()
): AttendanceDetails {
  const shiftStart = parseShiftTime(shift['Shift Start Time']);
  const shiftEnd = parseShiftTime(shift['Shift End Time']);
  const clockedIn = shift['Clocked In'] ? new Date(shift['Clocked In']) : null;
  const clockedOut = shift['Clocked Out'] ? new Date(shift['Clocked Out']) : null;
  const effectiveEnd = getEffectiveEndTime(shiftStart, shiftEnd);

  const status = getAttendanceStatus(shift, referenceTime);

  // Calculate early/late arrival
  let minutesLate = 0;
  let minutesEarly = 0;

  if (clockedIn && shiftStart) {
    const diffMinutes = Math.floor((clockedIn.getTime() - shiftStart.getTime()) / (1000 * 60));
    if (diffMinutes > 0) {
      minutesLate = diffMinutes;
    } else if (diffMinutes < 0) {
      minutesEarly = Math.abs(diffMinutes);
    }
  } else if (status === 'late' && shiftStart) {
    // Currently late — show how long since shift should have started
    minutesLate = Math.floor((referenceTime.getTime() - shiftStart.getTime()) / (1000 * 60));
  }

  // Check if shift has ended
  const hasEnded = effectiveEnd ? effectiveEnd <= referenceTime : false;

  // Check if overnight shift
  const isOvernight = !!(shiftStart && shiftEnd && shiftEnd < shiftStart);

  return {
    status,
    clockedInTime: clockedIn,
    clockedOutTime: clockedOut,
    shiftStartTime: shiftStart || new Date(),
    shiftEndTime: shiftEnd || new Date(),
    minutesLate,
    minutesEarly,
    isOvernight,
    hasEnded,
  };
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Get display configuration for a status
 */
export function getStatusConfig(status: AttendanceStatus): {
  label: string;
  colour: string;
  bgColour: string;
  dotColour: string;
  icon: string;
} {
  const configs: Record<
    AttendanceStatus,
    {
      label: string;
      colour: string;
      bgColour: string;
      dotColour: string;
      icon: string;
    }
  > = {
    present: {
      label: 'Present',
      colour: 'text-green-800',
      bgColour: 'bg-green-100',
      dotColour: 'bg-green-500',
      icon: '●',
    },
    scheduled: {
      label: 'Scheduled',
      colour: 'text-blue-800',
      bgColour: 'bg-blue-100',
      dotColour: 'bg-blue-500',
      icon: '○',
    },
    worked: {
      label: 'Worked',
      colour: 'text-gray-700',
      bgColour: 'bg-gray-100',
      dotColour: 'bg-gray-500',
      icon: '✓',
    },
    absent: {
      label: 'Absent',
      colour: 'text-red-800',
      bgColour: 'bg-red-100',
      dotColour: 'bg-red-500',
      icon: '✗',
    },
    late: {
      label: 'Late',
      colour: 'text-orange-800',
      bgColour: 'bg-orange-100',
      dotColour: 'bg-orange-500',
      icon: '!',
    },
  };

  return configs[status];
}

/**
 * Format minutes late as human-readable string
 */
export function formatLateBy(minutes: number): string {
  if (minutes < 1) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format minutes early as human-readable string
 */
export function formatEarlyBy(minutes: number): string {
  if (minutes < 1) return '';
  if (minutes < 60) return `${minutes} min early`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h early`;
  return `${hours}h ${mins}m early`;
}

/**
 * Format time for display (HH:mm)
 */
export function formatAttendanceTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format clock time with label
 */
export function formatClockTime(label: string, time: Date | null): string {
  if (!time) return '';
  return `${label}: ${formatAttendanceTime(time)}`;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse shift time string to Date
 * Handles various date formats from the API
 */
function parseShiftTime(timeStr: string | null | undefined): Date | null {
  if (!timeStr) return null;
  const date = new Date(timeStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if a shift is currently active (started but not ended)
 */
export function isShiftActive(
  shift: ShiftWithAttendance,
  referenceTime: Date = new Date()
): boolean {
  const shiftStart = parseShiftTime(shift['Shift Start Time']);
  const shiftEnd = parseShiftTime(shift['Shift End Time']);

  if (!shiftStart || !shiftEnd) return false;

  const effectiveEnd = getEffectiveEndTime(shiftStart, shiftEnd) || shiftEnd;

  return referenceTime >= shiftStart && referenceTime <= effectiveEnd;
}

/**
 * Check if a shift has ended
 */
export function hasShiftEnded(
  shift: ShiftWithAttendance,
  referenceTime: Date = new Date()
): boolean {
  const shiftEnd = parseShiftTime(shift['Shift End Time']);
  const shiftStart = parseShiftTime(shift['Shift Start Time']);

  if (!shiftEnd) return false;

  const effectiveEnd = getEffectiveEndTime(shiftStart, shiftEnd) || shiftEnd;

  return referenceTime > effectiveEnd;
}

/**
 * Get count of shifts by status
 */
export function countByStatus(
  shifts: ShiftWithAttendance[],
  referenceTime: Date = new Date()
): Record<AttendanceStatus, number> {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    scheduled: 0,
    worked: 0,
    absent: 0,
    late: 0,
  };

  for (const shift of shifts) {
    const status = getAttendanceStatus(shift, referenceTime);
    counts[status]++;
  }

  return counts;
}

/**
 * Filter shifts by status
 */
export function filterByStatus(
  shifts: ShiftWithAttendance[],
  status: AttendanceStatus | 'all',
  referenceTime: Date = new Date()
): ShiftWithAttendance[] {
  if (status === 'all') return shifts;

  return shifts.filter((shift) => getAttendanceStatus(shift, referenceTime) === status);
}

export default {
  getAttendanceStatus,
  getAttendanceDetails,
  getStatusConfig,
  formatLateBy,
  formatEarlyBy,
  formatAttendanceTime,
  formatClockTime,
  isShiftActive,
  hasShiftEnded,
  countByStatus,
  filterByStatus,
};
