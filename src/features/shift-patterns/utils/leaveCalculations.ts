/**
 * CarePoint 365 - Leave Calculation Utilities
 * 
 * Calculates annual leave entitlement based on pattern assignments,
 * supporting UK statutory requirements (5.6 weeks) and pro-rata
 * calculations for part-time workers and mid-year pattern changes.
 */

import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  differenceInDays,
  isBefore,
  isAfter,
  isWithinInterval,
  getYear,
  addDays,
  startOfWeek,
} from 'date-fns';
import type {
  StaffPatternAssignment,
  ShiftPatternTemplate,
  ShiftPatternDay,
} from '../types';
import { DayOfWeek, DayOfWeekLabels, AssignmentStatus } from '../types';
import type { StaffAbsenceLog, Contract } from '../../../api/dataverse/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** UK statutory annual leave weeks */
export const UK_STATUTORY_LEAVE_WEEKS = 5.6;

/** Standard full-time weekly hours */
export const STANDARD_WEEKLY_HOURS = 37.5;

/** UK Bank Holidays (approximate - would need to be fetched from a service) */
export const UK_BANK_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-05', // Early May Bank Holiday
  '2025-05-26', // Spring Bank Holiday
  '2025-08-25', // Summer Bank Holiday
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
];

// =============================================================================
// TYPES
// =============================================================================

export interface LeaveEntitlement {
  /** Total annual leave hours entitlement */
  totalHours: number;
  /** Total annual leave days (based on average shift length) */
  totalDays: number;
  /** Hours of leave already taken */
  usedHours: number;
  /** Days of leave already taken */
  usedDays: number;
  /** Remaining leave hours */
  remainingHours: number;
  /** Remaining leave days */
  remainingDays: number;
  /** Average shift length used for day calculations */
  averageShiftHours: number;
  /** Method used to calculate entitlement */
  calculationMethod: 'pattern' | 'contract' | 'actual';
  /** Breakdown by period if pattern changed */
  periodBreakdown?: LeaveEntitlementPeriod[];
}

export interface LeaveEntitlementPeriod {
  /** Period start date */
  startDate: string;
  /** Period end date */
  endDate: string;
  /** Weekly hours for this period */
  weeklyHours: number;
  /** Pro-rata leave hours for this period */
  leaveHours: number;
  /** Pattern name (if from pattern) */
  patternName?: string;
  /** Source of hours data */
  source: 'pattern' | 'contract' | 'default';
}

export interface PublicHolidayEntitlement {
  /** Hours owed for public holidays */
  entitlementHours: number;
  /** Number of public holidays falling on working days */
  holidaysOnWorkingDays: number;
  /** Number worked (not taking leave) */
  workedOnHolidays: number;
  /** Additional days owed for working holidays */
  additionalDaysOwed: number;
  /** Breakdown by holiday */
  holidayBreakdown: Array<{
    date: string;
    name: string;
    isWorkingDay: boolean;
    shiftHours?: number;
  }>;
}

export interface LeaveRequestValidation {
  /** Whether the request is valid */
  valid: boolean;
  /** Hours of leave required */
  hoursRequired: number;
  /** Hours of leave available */
  hoursAvailable: number;
  /** Number of working days covered */
  workingDaysCovered: number;
  /** Number of rest days in range (no deduction) */
  restDays: number;
  /** Validation warnings */
  warnings: string[];
  /** Breakdown by day */
  dayBreakdown: Array<{
    date: string;
    dayName: string;
    isWorkingDay: boolean;
    hoursDeducted: number;
    shiftTime?: string;
  }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the day of week from a Date (Mon=1, Sun=7)
 */
function getDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DayOfWeek;
}

/**
 * Get rotation week for a specific date
 */
function getRotationWeek(
  targetDate: Date,
  assignmentStartDate: Date,
  rotationStartWeek: number,
  totalRotationWeeks: number
): number {
  const startWeekMonday = startOfWeek(assignmentStartDate, { weekStartsOn: 1 });
  const targetWeekMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weeksSinceStart = Math.floor(
    (targetWeekMonday.getTime() - startWeekMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const adjustedWeek = (weeksSinceStart + rotationStartWeek - 1) % totalRotationWeeks;
  return adjustedWeek + 1;
}

/**
 * Get the pattern day for a specific date
 */
function getPatternDayForDate(
  date: Date,
  patternDays: ShiftPatternDay[],
  assignment: StaffPatternAssignment,
  template: ShiftPatternTemplate
): ShiftPatternDay | undefined {
  const dayOfWeek = getDayOfWeek(date);
  const assignmentStart = parseISO(assignment.cp365_sp_startdate);
  const rotationWeek = getRotationWeek(
    date,
    assignmentStart,
    assignment.cp365_sp_rotationstartweek,
    template.cp365_sp_rotationcycleweeks
  );

  return patternDays.find(
    (pd) =>
      pd.cp365_sp_weeknumber === rotationWeek && pd.cp365_sp_dayofweek === dayOfWeek
  );
}

/**
 * Calculate shift duration in hours
 */
function calculateShiftHours(patternDay: ShiftPatternDay): number {
  if (patternDay.cp365_sp_isrestday) return 0;
  if (!patternDay.cp365_sp_starttime || !patternDay.cp365_sp_endtime) return 0;

  // Extract hours and minutes from time strings
  const startParts = patternDay.cp365_sp_starttime.includes('T')
    ? patternDay.cp365_sp_starttime.split('T')[1].split(':')
    : patternDay.cp365_sp_starttime.split(':');
  const endParts = patternDay.cp365_sp_endtime.includes('T')
    ? patternDay.cp365_sp_endtime.split('T')[1].split(':')
    : patternDay.cp365_sp_endtime.split(':');

  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || '0');
  let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || '0');

  // Handle overnight shifts
  if (patternDay.cp365_sp_isovernight && endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const totalMinutes = endMinutes - startMinutes - (patternDay.cp365_sp_breakminutes || 0);
  return totalMinutes / 60;
}

/**
 * Calculate average shift hours from pattern days
 */
function calculateAverageShiftHours(patternDays: ShiftPatternDay[]): number {
  const workingDays = patternDays.filter((pd) => !pd.cp365_sp_isrestday);
  if (workingDays.length === 0) return 7.5; // Default

  const totalHours = workingDays.reduce(
    (sum, pd) => sum + calculateShiftHours(pd),
    0
  );

  return totalHours / workingDays.length;
}

/**
 * Get active assignment for a date
 */
function getActiveAssignmentForDate(
  date: Date,
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
  }>
): typeof assignments[0] | undefined {
  // Sort by priority (lower = higher priority)
  const sorted = [...assignments].sort(
    (a, b) => a.assignment.cp365_sp_priority - b.assignment.cp365_sp_priority
  );

  for (const item of sorted) {
    const { assignment } = item;

    // Check if active
    if (assignment.cp365_sp_assignmentstatus !== AssignmentStatus.Active) continue;

    // Check date range
    const startDate = parseISO(assignment.cp365_sp_startdate);
    const endDate = assignment.cp365_sp_enddate
      ? parseISO(assignment.cp365_sp_enddate)
      : null;

    if (isBefore(date, startDate)) continue;
    if (endDate && isAfter(date, endDate)) continue;

    return item;
  }

  return undefined;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate annual leave entitlement based on pattern assignments
 * 
 * Uses UK statutory 5.6 weeks formula with pattern-derived weekly hours.
 * Falls back to contract hours, then default if no pattern.
 */
export function calculateAnnualLeaveEntitlement(
  year: number,
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
  }>,
  leaveRecords: StaffAbsenceLog[],
  contract?: Contract
): LeaveEntitlement {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  // Get active assignments for this year
  const relevantAssignments = assignments.filter(({ assignment }) => {
    const startDate = parseISO(assignment.cp365_sp_startdate);
    const endDate = assignment.cp365_sp_enddate
      ? parseISO(assignment.cp365_sp_enddate)
      : yearEnd;

    // Check if assignment overlaps with the year
    return !(isAfter(startDate, yearEnd) || isBefore(endDate, yearStart));
  });

  let calculationMethod: 'pattern' | 'contract' | 'actual' = 'pattern';
  let totalLeaveHours = 0;
  let averageWeeklyHours = 0;
  const periodBreakdown: LeaveEntitlementPeriod[] = [];

  if (relevantAssignments.length === 0) {
    // No pattern - use contract hours
    calculationMethod = 'contract';
    const weeklyHours = contract?.cp365_requiredhours || STANDARD_WEEKLY_HOURS;
    totalLeaveHours = weeklyHours * UK_STATUTORY_LEAVE_WEEKS;
    averageWeeklyHours = weeklyHours;

    periodBreakdown.push({
      startDate: format(yearStart, 'yyyy-MM-dd'),
      endDate: format(yearEnd, 'yyyy-MM-dd'),
      weeklyHours,
      leaveHours: totalLeaveHours,
      source: contract ? 'contract' : 'default',
    });
  } else if (relevantAssignments.length === 1) {
    // Single pattern for the year
    const { assignment, template } = relevantAssignments[0];
    const weeklyHours =
      template.cp365_sp_averageweeklyhours || STANDARD_WEEKLY_HOURS;

    // Calculate pro-rata if assignment doesn't cover full year
    const assignmentStart = parseISO(assignment.cp365_sp_startdate);
    const assignmentEnd = assignment.cp365_sp_enddate
      ? parseISO(assignment.cp365_sp_enddate)
      : yearEnd;

    const effectiveStart = isBefore(assignmentStart, yearStart)
      ? yearStart
      : assignmentStart;
    const effectiveEnd = isAfter(assignmentEnd, yearEnd) ? yearEnd : assignmentEnd;

    const daysInYear = differenceInDays(yearEnd, yearStart) + 1;
    const coveredDays = differenceInDays(effectiveEnd, effectiveStart) + 1;
    const proRataFactor = coveredDays / daysInYear;

    totalLeaveHours = weeklyHours * UK_STATUTORY_LEAVE_WEEKS * proRataFactor;
    averageWeeklyHours = weeklyHours;

    periodBreakdown.push({
      startDate: format(effectiveStart, 'yyyy-MM-dd'),
      endDate: format(effectiveEnd, 'yyyy-MM-dd'),
      weeklyHours,
      leaveHours: totalLeaveHours,
      patternName: template.cp365_name,
      source: 'pattern',
    });
  } else {
    // Multiple patterns - calculate pro-rata for each
    const sortedAssignments = [...relevantAssignments].sort((a, b) =>
      a.assignment.cp365_sp_startdate.localeCompare(b.assignment.cp365_sp_startdate)
    );

    const daysInYear = differenceInDays(yearEnd, yearStart) + 1;
    let totalWeightedHours = 0;
    let totalCoveredDays = 0;

    for (const { assignment, template } of sortedAssignments) {
      const weeklyHours =
        template.cp365_sp_averageweeklyhours || STANDARD_WEEKLY_HOURS;

      const assignmentStart = parseISO(assignment.cp365_sp_startdate);
      const assignmentEnd = assignment.cp365_sp_enddate
        ? parseISO(assignment.cp365_sp_enddate)
        : yearEnd;

      const effectiveStart = isBefore(assignmentStart, yearStart)
        ? yearStart
        : assignmentStart;
      const effectiveEnd = isAfter(assignmentEnd, yearEnd) ? yearEnd : assignmentEnd;

      const coveredDays = differenceInDays(effectiveEnd, effectiveStart) + 1;
      const proRataFactor = coveredDays / daysInYear;
      const periodLeaveHours = weeklyHours * UK_STATUTORY_LEAVE_WEEKS * proRataFactor;

      totalLeaveHours += periodLeaveHours;
      totalWeightedHours += weeklyHours * coveredDays;
      totalCoveredDays += coveredDays;

      periodBreakdown.push({
        startDate: format(effectiveStart, 'yyyy-MM-dd'),
        endDate: format(effectiveEnd, 'yyyy-MM-dd'),
        weeklyHours,
        leaveHours: periodLeaveHours,
        patternName: template.cp365_name,
        source: 'pattern',
      });
    }

    averageWeeklyHours =
      totalCoveredDays > 0 ? totalWeightedHours / totalCoveredDays : STANDARD_WEEKLY_HOURS;
  }

  // Calculate used leave hours
  const yearLeaveRecords = leaveRecords.filter((leave) => {
    const leaveStart = parseISO(leave.cp365_startdate);
    return getYear(leaveStart) === year;
  });

  const usedHours = yearLeaveRecords.reduce((sum, leave) => {
    // If leave record has hours, use that
    // Otherwise estimate based on date range
    const leaveStart = parseISO(leave.cp365_startdate);
    const leaveEnd = parseISO(leave.cp365_enddate);
    const days = differenceInDays(leaveEnd, leaveStart) + 1;
    
    // Rough estimate - average 7.5 hours per day
    return sum + days * 7.5;
  }, 0);

  // Calculate average shift hours
  let avgShiftHours = 7.5;
  if (relevantAssignments.length > 0) {
    const allPatternDays = relevantAssignments.flatMap((a) => a.patternDays);
    avgShiftHours = calculateAverageShiftHours(allPatternDays);
  }

  const usedDays = usedHours / avgShiftHours;
  const remainingHours = Math.max(0, totalLeaveHours - usedHours);
  const remainingDays = remainingHours / avgShiftHours;

  return {
    totalHours: Math.round(totalLeaveHours * 10) / 10,
    totalDays: Math.round((totalLeaveHours / avgShiftHours) * 10) / 10,
    usedHours: Math.round(usedHours * 10) / 10,
    usedDays: Math.round(usedDays * 10) / 10,
    remainingHours: Math.round(remainingHours * 10) / 10,
    remainingDays: Math.round(remainingDays * 10) / 10,
    averageShiftHours: Math.round(avgShiftHours * 10) / 10,
    calculationMethod,
    periodBreakdown: periodBreakdown.length > 1 ? periodBreakdown : undefined,
  };
}

/**
 * Calculate public holiday entitlement based on pattern
 * 
 * Checks which public holidays fall on pattern working days
 * to determine additional leave owed.
 */
export function calculatePublicHolidayEntitlement(
  year: number,
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
  }>,
  bankHolidays: string[] = UK_BANK_HOLIDAYS_2025
): PublicHolidayEntitlement {
  const holidayBreakdown: PublicHolidayEntitlement['holidayBreakdown'] = [];
  let holidaysOnWorkingDays = 0;
  let totalHolidayHours = 0;

  for (const dateStr of bankHolidays) {
    const date = parseISO(dateStr);

    if (getYear(date) !== year) continue;

    const activeAssignment = getActiveAssignmentForDate(date, assignments);

    if (activeAssignment) {
      const { assignment, template, patternDays } = activeAssignment;
      const patternDay = getPatternDayForDate(
        date,
        patternDays,
        assignment,
        template
      );

      const isWorkingDay = patternDay && !patternDay.cp365_sp_isrestday;
      const shiftHours = patternDay ? calculateShiftHours(patternDay) : 0;

      holidayBreakdown.push({
        date: dateStr,
        name: getHolidayName(dateStr),
        isWorkingDay: isWorkingDay || false,
        shiftHours: isWorkingDay ? shiftHours : undefined,
      });

      if (isWorkingDay) {
        holidaysOnWorkingDays++;
        totalHolidayHours += shiftHours;
      }
    } else {
      // No pattern - assume standard working week
      const dayOfWeek = getDayOfWeek(date);
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      holidayBreakdown.push({
        date: dateStr,
        name: getHolidayName(dateStr),
        isWorkingDay: isWeekday,
        shiftHours: isWeekday ? 7.5 : undefined,
      });

      if (isWeekday) {
        holidaysOnWorkingDays++;
        totalHolidayHours += 7.5;
      }
    }
  }

  return {
    entitlementHours: totalHolidayHours,
    holidaysOnWorkingDays,
    workedOnHolidays: 0, // Would need actual shift data to calculate
    additionalDaysOwed: 0, // Calculated when holiday is worked
    holidayBreakdown,
  };
}

/**
 * Validate a leave request against pattern
 * 
 * Calculates hours required based on pattern working days
 * and available leave balance.
 */
export function validateLeaveRequest(
  startDate: Date,
  endDate: Date,
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
  }>,
  availableHours: number
): LeaveRequestValidation {
  const warnings: string[] = [];
  const dayBreakdown: LeaveRequestValidation['dayBreakdown'] = [];
  let hoursRequired = 0;
  let workingDaysCovered = 0;
  let restDays = 0;

  const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });

  for (const date of daysInRange) {
    const dayOfWeek = getDayOfWeek(date);
    const dayName = DayOfWeekLabels[dayOfWeek];

    const activeAssignment = getActiveAssignmentForDate(date, assignments);

    if (activeAssignment) {
      const { assignment, template, patternDays } = activeAssignment;
      const patternDay = getPatternDayForDate(
        date,
        patternDays,
        assignment,
        template
      );

      if (patternDay && !patternDay.cp365_sp_isrestday) {
        const shiftHours = calculateShiftHours(patternDay);
        const startTime = patternDay.cp365_sp_starttime
          ? patternDay.cp365_sp_starttime.includes('T')
            ? patternDay.cp365_sp_starttime.split('T')[1].substring(0, 5)
            : patternDay.cp365_sp_starttime.substring(0, 5)
          : '09:00';
        const endTime = patternDay.cp365_sp_endtime
          ? patternDay.cp365_sp_endtime.includes('T')
            ? patternDay.cp365_sp_endtime.split('T')[1].substring(0, 5)
            : patternDay.cp365_sp_endtime.substring(0, 5)
          : '17:00';

        hoursRequired += shiftHours;
        workingDaysCovered++;

        dayBreakdown.push({
          date: format(date, 'yyyy-MM-dd'),
          dayName,
          isWorkingDay: true,
          hoursDeducted: shiftHours,
          shiftTime: `${startTime}-${endTime}`,
        });
      } else {
        restDays++;
        dayBreakdown.push({
          date: format(date, 'yyyy-MM-dd'),
          dayName,
          isWorkingDay: false,
          hoursDeducted: 0,
        });
      }
    } else {
      // No pattern - use default working week
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      if (isWeekday) {
        hoursRequired += 7.5;
        workingDaysCovered++;
        dayBreakdown.push({
          date: format(date, 'yyyy-MM-dd'),
          dayName,
          isWorkingDay: true,
          hoursDeducted: 7.5,
        });
      } else {
        restDays++;
        dayBreakdown.push({
          date: format(date, 'yyyy-MM-dd'),
          dayName,
          isWorkingDay: false,
          hoursDeducted: 0,
        });
      }
    }
  }

  // Generate warnings
  if (hoursRequired > availableHours) {
    warnings.push(
      `Insufficient leave balance: ${hoursRequired} hours required, ${availableHours} available`
    );
  }

  if (restDays > 0 && workingDaysCovered > 0) {
    warnings.push(`${restDays} day(s) in this range are rest days and won't be deducted`);
  }

  if (restDays === daysInRange.length) {
    warnings.push('All selected days are rest days - no leave will be deducted');
  }

  return {
    valid: hoursRequired <= availableHours && hoursRequired > 0,
    hoursRequired: Math.round(hoursRequired * 10) / 10,
    hoursAvailable: Math.round(availableHours * 10) / 10,
    workingDaysCovered,
    restDays,
    warnings,
    dayBreakdown,
  };
}

/**
 * Convert hours to days based on average shift length
 */
export function hoursToDays(hours: number, averageShiftHours: number): number {
  if (averageShiftHours <= 0) return 0;
  return Math.round((hours / averageShiftHours) * 10) / 10;
}

/**
 * Convert days to hours based on average shift length
 */
export function daysToHours(days: number, averageShiftHours: number): number {
  return Math.round(days * averageShiftHours * 10) / 10;
}

// =============================================================================
// HELPER - HOLIDAY NAMES
// =============================================================================

function getHolidayName(dateStr: string): string {
  const holidayNames: Record<string, string> = {
    '2025-01-01': "New Year's Day",
    '2025-04-18': 'Good Friday',
    '2025-04-21': 'Easter Monday',
    '2025-05-05': 'Early May Bank Holiday',
    '2025-05-26': 'Spring Bank Holiday',
    '2025-08-25': 'Summer Bank Holiday',
    '2025-12-25': 'Christmas Day',
    '2025-12-26': 'Boxing Day',
  };
  return holidayNames[dateStr] || 'Bank Holiday';
}

