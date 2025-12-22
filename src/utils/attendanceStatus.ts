/**
 * Attendance Status Utilities
 * Logic for calculating and displaying staff attendance status
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 7
 */

import type { ShiftViewData } from '../api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Attendance status for a shift
 * - present: Staff has clocked in but not out (currently working)
 * - scheduled: Shift hasn't started yet
 * - worked: Staff has clocked in AND out (shift completed)
 * - absent: Shift marked as absent
 * - late: Shift should have started but staff hasn't clocked in
 */
export type AttendanceStatus = 'present' | 'scheduled' | 'worked' | 'absent' | 'late';

/**
 * Extended shift data with clock-in/out times
 * These fields may be added to ShiftViewData in the future
 */
export interface ShiftWithAttendance extends ShiftViewData {
  'Clocked In'?: string | null;
  'Clocked Out'?: string | null;
  'Shift Status Code'?: number; // For absent status - could be a specific status code
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
  minutesLate: number;
  isOvernight: boolean;
}

// =============================================================================
// Status Codes (placeholder - adjust based on actual Dataverse values)
// =============================================================================

export const ShiftStatusCodes = {
  Published: 1001,
  Unpublished: 1009,
  Absent: 1002, // Placeholder - update with actual absent status code
} as const;

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Calculate the attendance status for a shift
 * 
 * Status logic:
 * - Absent: Shift has absent status flag
 * - Worked: Clocked in AND clocked out
 * - Present: Clocked in but NOT clocked out
 * - Late: Shift should have started but no clock-in
 * - Scheduled: Shift hasn't started yet
 */
export function getAttendanceStatus(
  shift: ShiftWithAttendance,
  referenceTime: Date = new Date()
): AttendanceStatus {
  const shiftStart = parseShiftTime(shift['Shift Start Time']);
  const clockedIn = shift['Clocked In'] ? new Date(shift['Clocked In']) : null;
  const clockedOut = shift['Clocked Out'] ? new Date(shift['Clocked Out']) : null;
  
  // Check for absent status (if status code indicates absent)
  const statusCode = shift['Shift Status Code'] ?? shift['Shift Status'];
  if (statusCode === ShiftStatusCodes.Absent) {
    return 'absent';
  }

  // Worked: completed shift (clocked in AND out)
  if (clockedIn && clockedOut) {
    return 'worked';
  }

  // Present: currently working (clocked in, not out)
  if (clockedIn && !clockedOut) {
    return 'present';
  }

  // Late: should have started but hasn't clocked in
  // Allow a small grace period of 5 minutes
  if (!clockedIn && shiftStart && shiftStart <= referenceTime) {
    return 'late';
  }

  // Scheduled: shift hasn't started yet
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
  
  const status = getAttendanceStatus(shift, referenceTime);
  
  // Calculate minutes late
  let minutesLate = 0;
  if (status === 'late' && shiftStart) {
    minutesLate = Math.floor((referenceTime.getTime() - shiftStart.getTime()) / (1000 * 60));
  } else if (status === 'present' && clockedIn && shiftStart) {
    // Staff arrived but was late
    const lateBy = Math.floor((clockedIn.getTime() - shiftStart.getTime()) / (1000 * 60));
    if (lateBy > 0) {
      minutesLate = lateBy;
    }
  }

  // Check if overnight shift
  const isOvernight = shiftStart && shiftEnd && shiftEnd < shiftStart;

  return {
    status,
    clockedInTime: clockedIn,
    clockedOutTime: clockedOut,
    shiftStartTime: shiftStart || new Date(),
    shiftEndTime: shiftEnd || new Date(),
    minutesLate,
    isOvernight: isOvernight || false,
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
  const configs: Record<AttendanceStatus, {
    label: string;
    colour: string;
    bgColour: string;
    dotColour: string;
    icon: string;
  }> = {
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
  
  // Handle overnight shifts
  let effectiveEnd = shiftEnd;
  if (shiftEnd < shiftStart) {
    effectiveEnd = new Date(shiftEnd);
    effectiveEnd.setDate(effectiveEnd.getDate() + 1);
  }
  
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
  
  // Handle overnight shifts
  let effectiveEnd = shiftEnd;
  if (shiftStart && shiftEnd < shiftStart) {
    effectiveEnd = new Date(shiftEnd);
    effectiveEnd.setDate(effectiveEnd.getDate() + 1);
  }
  
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
  
  return shifts.filter(shift => getAttendanceStatus(shift, referenceTime) === status);
}

export default {
  getAttendanceStatus,
  getAttendanceDetails,
  getStatusConfig,
  formatLateBy,
  formatAttendanceTime,
  formatClockTime,
  isShiftActive,
  hasShiftEnded,
  countByStatus,
  filterByStatus,
};

