/**
 * CarePoint 365 - Shift Generation Algorithm
 * 
 * This is the core logic for converting pattern assignments into actual shifts.
 * It handles rotation week calculations, conflict detection, and shift creation.
 */

import {
  addDays,
  differenceInWeeks,
  format,
  parseISO,
  startOfWeek,
  isWithinInterval,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
} from 'date-fns';
import type {
  StaffPatternAssignment,
  ShiftPatternTemplate,
  ShiftPatternDay,
  PatternConflict,
  GenerationResult,
  ShiftGenerationLog,
} from '../types';
import {
  DayOfWeek,
  DayOfWeekLabels,
  PatternPublishStatus,
  AssignmentStatus,
  GenerationType,
} from '../types';
import type { Shift, StaffAbsenceLog } from '../../../api/dataverse/types';
import { ShiftStatus } from '../../../api/dataverse/types';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate if a value is a valid GUID
 */
function isValidGuid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  // GUID regex pattern
  const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidPattern.test(trimmed);
}

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateShiftsOptions {
  /** The assignment ID to generate shifts for */
  assignmentId: string;
  /** The assignment object (if already loaded) */
  assignment?: StaffPatternAssignment;
  /** The pattern template (if already loaded) */
  template?: ShiftPatternTemplate;
  /** The pattern days (if already loaded) */
  patternDays?: ShiftPatternDay[];
  /** Start date for generation (inclusive) */
  startDate: Date;
  /** End date for generation (inclusive) */
  endDate: Date;
  /** Conflict resolutions - map of date string to resolution action */
  conflictResolutions?: Map<string, 'keep' | 'override' | 'skip'>;
  /** Existing shifts in the date range (pre-fetched for efficiency) */
  existingShifts?: Shift[];
  /** Existing leave records in the date range (pre-fetched for efficiency) */
  existingLeave?: StaffAbsenceLog[];
  /** If true, return what would be created without actually creating */
  dryRun?: boolean;
  /** Rota ID to associate shifts with */
  rotaId?: string;
  /** Sublocation ID for the shifts */
  sublocationId?: string;
}

export interface GenerateShiftsResult {
  /** Shifts that were created (or would be created in dry run) */
  shiftsCreated: Partial<Shift>[];
  /** Dates that were skipped and why */
  shiftsSkipped: { date: string; reason: string }[];
  /** Conflicts that were detected */
  conflicts: PatternConflict[];
  /** Errors that occurred during generation */
  errors: string[];
  /** Period start date */
  periodStart: string;
  /** Period end date */
  periodEnd: string;
}

export interface ShiftCreateData {
  cp365_shiftdate: string;
  cp365_shiftstarttime: string;
  cp365_shiftendtime: string;
  cp365_shiftstatus: number;
  cp365_shifttype: number;
  cp365_overtimeshift: boolean;
  cr1e2_shiftbreakduration?: number;
  cp365_sleepin: boolean;
  cp365_shiftleader: boolean;
  cp365_actup: boolean;
  cp365_communityhours: number;
  // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
  'cp365_staffmember@odata.bind'?: string;
  'cp365_rota@odata.bind'?: string;
  'cp365_shiftreference@odata.bind'?: string;
  'cp365_shiftactivity@odata.bind'?: string;
  'cp365_staffpatternassignment@odata.bind'?: string;
  // NOTE: These columns use 'cr482_sp_' prefix in Dataverse, not 'cp365_sp_'
  cr482_sp_isgeneratedfrompattern: boolean;
  cr482_sp_patternweek: number;
  cr482_sp_patterndayofweek: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the day of week (1-7, Monday-Sunday) from a Date
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DayOfWeek;
}

/**
 * Get the day name from a DayOfWeek value
 */
export function getDayName(dayOfWeek: DayOfWeek): string {
  return DayOfWeekLabels[dayOfWeek];
}

/**
 * Calculate which week of the rotation pattern applies to a target date
 * 
 * @param assignmentStartDate - When the assignment started (cp365_sp_startdate)
 * @param rotationStartWeek - Which week to start from (cp365_sp_rotationstartweek), 1-based
 * @param totalRotationWeeks - Total weeks in the pattern rotation (cp365_sp_rotationcycleweeks)
 * @param targetDate - The date to calculate the rotation week for
 * @returns The rotation week number (1-based)
 */
export function getRotationWeek(
  assignmentStartDate: Date,
  rotationStartWeek: number,
  totalRotationWeeks: number,
  targetDate: Date
): number {
  // Get the Monday of the week containing assignment start
  const startWeekMonday = startOfWeek(assignmentStartDate, { weekStartsOn: 1 });
  
  // Get the Monday of the week containing target date
  const targetWeekMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
  
  // Calculate weeks since start
  const weeksSinceStart = differenceInWeeks(targetWeekMonday, startWeekMonday);
  
  // Apply rotation calculation
  // rotationStartWeek is 1-based, we need to adjust for 0-based modulo
  const adjustedWeek = (weeksSinceStart + rotationStartWeek - 1) % totalRotationWeeks;
  
  // Return 1-based week number
  return adjustedWeek + 1;
}

/**
 * Parse the appliestodays JSON field
 * Returns an array of day names (e.g., ["Monday", "Tuesday", "Wednesday"])
 */
export function parseAppliesToDays(appliesTo?: string | null): string[] {
  if (!appliesTo) return [];
  try {
    const parsed = JSON.parse(appliesTo);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Check if a day name should be included based on appliestodays filter
 */
export function isDayIncluded(dayName: string, appliesToDays: string[]): boolean {
  // If no restriction, include all days
  if (appliesToDays.length === 0) return true;
  // Check if day is in the list
  return appliesToDays.some(d => d.toLowerCase() === dayName.toLowerCase());
}

/**
 * Extract time from a DateTime string and apply to a target date
 * Pattern days store time as DateTime with dummy date (e.g., 1900-01-01T09:00:00Z)
 */
export function combineDateTime(targetDate: Date, timeString: string): Date {
  const timeParts = timeString.includes('T') 
    ? timeString.split('T')[1] 
    : timeString;
  
  const [hours, minutes] = timeParts.split(':').map(Number);
  
  let result = new Date(targetDate);
  result = setHours(result, hours || 0);
  result = setMinutes(result, minutes || 0);
  result.setSeconds(0);
  result.setMilliseconds(0);
  
  return result;
}

/**
 * Extract just the time portion (HH:mm) from a DateTime string
 */
export function extractTimeString(dateTimeStr: string | undefined): string {
  if (!dateTimeStr) return '09:00';
  
  try {
    const timePart = dateTimeStr.includes('T') 
      ? dateTimeStr.split('T')[1]?.substring(0, 5) 
      : dateTimeStr.substring(0, 5);
    return timePart || '09:00';
  } catch {
    return '09:00';
  }
}

/**
 * Detect conflicts for a specific date
 */
export function detectConflictForDate(
  date: Date,
  staffMemberId: string,
  existingShifts: Shift[],
  existingLeave: StaffAbsenceLog[],
  patternDay: ShiftPatternDay
): PatternConflict | null {
  const dateStr = format(date, 'yyyy-MM-dd');

  // Check for existing shift on this date
  const existingShift = existingShifts.find(shift => {
    const shiftDate = shift.cp365_shiftdate?.split('T')[0];
    return shiftDate === dateStr;
  });

  if (existingShift) {
    const shiftRef = existingShift.cp365_shiftreference?.cp365_shiftreferencename || 'Shift';
    const shiftStart = existingShift.cp365_shiftstarttime
      ? format(parseISO(existingShift.cp365_shiftstarttime), 'HH:mm')
      : '??:??';
    const shiftEnd = existingShift.cp365_shiftendtime
      ? format(parseISO(existingShift.cp365_shiftendtime), 'HH:mm')
      : '??:??';

    // Check if from another pattern
    const isFromPattern = (existingShift as any).cr482_sp_isgeneratedfrompattern;

    return {
      date: dateStr,
      type: isFromPattern ? 'other_pattern' : 'existing_shift',
      description: `${shiftRef} (${shiftStart}-${shiftEnd})${isFromPattern ? ' - Pattern' : ' - Manual'}`,
      existingShiftId: existingShift.cp365_shiftid,
      patternWouldCreate: {
        startTime: extractTimeString(patternDay.cp365_sp_starttime),
        endTime: extractTimeString(patternDay.cp365_sp_endtime),
        shiftReferenceName: patternDay.cp365_shiftreference?.cp365_shiftreferencename,
      },
    };
  }

  // Check for leave on this date
  const leaveRecord = existingLeave.find(leave => {
    const leaveStart = parseISO(leave.cp365_startdate);
    const leaveEnd = parseISO(leave.cp365_enddate);
    return isWithinInterval(date, { start: leaveStart, end: leaveEnd });
  });

  if (leaveRecord) {
    // Check if approved
    const isApproved = (leaveRecord as any).cp365_absencestatus === 3;
    const leaveType = leaveRecord.cp365_absencetype?.cp365_absencetypename || 'Leave';

    return {
      date: dateStr,
      type: isApproved ? 'approved_leave' : 'pending_leave',
      description: `${leaveType}${isApproved ? ' (Approved)' : ' (Pending)'}`,
      existingLeaveId: leaveRecord.cp365_staffabsencelogid,
      patternWouldCreate: {
        startTime: extractTimeString(patternDay.cp365_sp_starttime),
        endTime: extractTimeString(patternDay.cp365_sp_endtime),
      },
    };
  }

  return null;
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate shifts from a pattern assignment
 * 
 * This is the core generation function that converts pattern days into actual shifts.
 */
export async function generateShiftsFromPattern(
  options: GenerateShiftsOptions
): Promise<GenerateShiftsResult> {
  const {
    assignment,
    template,
    patternDays,
    startDate,
    endDate,
    conflictResolutions = new Map(),
    existingShifts = [],
    existingLeave = [],
    dryRun = false,
    rotaId,
    sublocationId,
  } = options;

  // Validate required data
  if (!assignment) {
    return {
      shiftsCreated: [],
      shiftsSkipped: [],
      conflicts: [],
      errors: ['Assignment data is required'],
      periodStart: format(startDate, 'yyyy-MM-dd'),
      periodEnd: format(endDate, 'yyyy-MM-dd'),
    };
  }

  if (!template) {
    return {
      shiftsCreated: [],
      shiftsSkipped: [],
      conflicts: [],
      errors: ['Pattern template data is required'],
      periodStart: format(startDate, 'yyyy-MM-dd'),
      periodEnd: format(endDate, 'yyyy-MM-dd'),
    };
  }

  if (!patternDays || patternDays.length === 0) {
    return {
      shiftsCreated: [],
      shiftsSkipped: [],
      conflicts: [],
      errors: ['Pattern has no defined days'],
      periodStart: format(startDate, 'yyyy-MM-dd'),
      periodEnd: format(endDate, 'yyyy-MM-dd'),
    };
  }

  const result: GenerateShiftsResult = {
    shiftsCreated: [],
    shiftsSkipped: [],
    conflicts: [],
    errors: [],
    periodStart: format(startDate, 'yyyy-MM-dd'),
    periodEnd: format(endDate, 'yyyy-MM-dd'),
  };

  const staffMemberId = assignment._cp365_staffmember_value;
  const assignmentStartDate = parseISO(assignment.cp365_sp_startdate);
  const assignmentEndDate = assignment.cp365_sp_enddate 
    ? parseISO(assignment.cp365_sp_enddate) 
    : null;
  const rotationStartWeek = assignment.cp365_sp_rotationstartweek;
  const totalRotationWeeks = template.cp365_sp_rotationcycleweeks;
  const appliesToDays = parseAppliesToDays(assignment.cp365_sp_appliestodays);

  // Determine publish status
  const publishStatus = assignment.cp365_sp_overridepublishstatus
    ? (assignment.cp365_sp_publishstatus || PatternPublishStatus.Unpublished)
    : template.cp365_sp_defaultpublishstatus;

  // Iterate through each date in the range
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    try {
      // Check if date is before assignment start
      if (isBefore(currentDate, assignmentStartDate)) {
        result.shiftsSkipped.push({
          date: dateStr,
          reason: 'Before assignment start date',
        });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check if date is after assignment end (if set)
      if (assignmentEndDate && isAfter(currentDate, assignmentEndDate)) {
        result.shiftsSkipped.push({
          date: dateStr,
          reason: 'After assignment end date',
        });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Get day of week
      const dayOfWeek = getDayOfWeek(currentDate);
      const dayName = getDayName(dayOfWeek);

      // Check appliestodays filter
      if (!isDayIncluded(dayName, appliesToDays)) {
        result.shiftsSkipped.push({
          date: dateStr,
          reason: `Day ${dayName} not in assignment filter`,
        });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Calculate rotation week
      const rotationWeek = getRotationWeek(
        assignmentStartDate,
        rotationStartWeek,
        totalRotationWeeks,
        currentDate
      );

      // Find the pattern day for this week + day
      const patternDay = patternDays.find(
        pd => pd.cp365_sp_weeknumber === rotationWeek && pd.cp365_sp_dayofweek === dayOfWeek
      );

      if (!patternDay) {
        result.shiftsSkipped.push({
          date: dateStr,
          reason: `No pattern day for Week ${rotationWeek}, ${dayName}`,
        });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check if rest day
      if (patternDay.cp365_sp_isrestday) {
        result.shiftsSkipped.push({
          date: dateStr,
          reason: 'Scheduled rest day',
        });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check for conflicts
      const conflict = detectConflictForDate(
        currentDate,
        staffMemberId,
        existingShifts,
        existingLeave,
        patternDay
      );

      if (conflict) {
        result.conflicts.push(conflict);

        // Check resolution
        const resolution = conflictResolutions.get(dateStr);

        if (!resolution || resolution === 'keep' || resolution === 'skip') {
          result.shiftsSkipped.push({
            date: dateStr,
            reason: `Conflict: ${conflict.description}`,
          });
          currentDate = addDays(currentDate, 1);
          continue;
        }

        // resolution === 'override' - we'll create the shift
        // TODO: In a real implementation, we would also need to delete the existing shift
      }

      // Build shift data
      const shiftStartTime = combineDateTime(
        currentDate,
        patternDay.cp365_sp_starttime || '09:00'
      );
      
      let shiftEndTime = combineDateTime(
        currentDate,
        patternDay.cp365_sp_endtime || '17:00'
      );

      // Handle overnight shifts
      if (patternDay.cp365_sp_isovernight) {
        shiftEndTime = addDays(shiftEndTime, 1);
      }

      const shiftData: ShiftCreateData = {
        cp365_shiftdate: dateStr,
        cp365_shiftstarttime: shiftStartTime.toISOString(),
        cp365_shiftendtime: shiftEndTime.toISOString(),
        cp365_shiftstatus: publishStatus === PatternPublishStatus.Published 
          ? ShiftStatus.Published 
          : ShiftStatus.Unpublished,
        cp365_shifttype: 1, // Day shift by default
        cp365_overtimeshift: false,
        cr1e2_shiftbreakduration: patternDay.cp365_sp_breakminutes || 0,
        cp365_sleepin: false,
        cp365_shiftleader: false,
        cp365_actup: false,
        cp365_communityhours: 0,
        // NOTE: These columns use 'cr482_sp_' prefix in Dataverse
        cr482_sp_isgeneratedfrompattern: true,
        cr482_sp_patternweek: rotationWeek,
        cr482_sp_patterndayofweek: dayOfWeek,
      };

      // Add lookups if we have valid GUIDs
      // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
      if (isValidGuid(staffMemberId)) {
        shiftData['cp365_staffmember@odata.bind'] = `/cp365_staffmembers(${staffMemberId})`;
      }

      if (isValidGuid(rotaId)) {
        shiftData['cp365_rota@odata.bind'] = `/cp365_rotas(${rotaId})`;
      }

      if (isValidGuid(patternDay._cp365_shiftreference_value)) {
        shiftData['cp365_shiftreference@odata.bind'] = 
          `/cp365_shiftreferences(${patternDay._cp365_shiftreference_value})`;
      }

      if (isValidGuid(patternDay._cp365_shiftactivity_value)) {
        shiftData['cp365_shiftactivity@odata.bind'] = 
          `/cp365_shiftactivities(${patternDay._cp365_shiftactivity_value})`;
      }

      if (isValidGuid(options.assignmentId)) {
        shiftData['cp365_staffpatternassignment@odata.bind'] = 
          `/cp365_staffpatternassignments(${options.assignmentId})`;
      }

      result.shiftsCreated.push(shiftData as unknown as Partial<Shift>);

    } catch (error) {
      result.errors.push(
        `Error processing ${dateStr}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    currentDate = addDays(currentDate, 1);
  }

  return result;
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

/**
 * Generate shifts for multiple assignments
 */
export async function generateShiftsForMultipleAssignments(
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
  }>,
  startDate: Date,
  endDate: Date,
  options?: {
    existingShiftsMap?: Map<string, Shift[]>;
    existingLeaveMap?: Map<string, StaffAbsenceLog[]>;
    dryRun?: boolean;
  }
): Promise<Map<string, GenerateShiftsResult>> {
  const results = new Map<string, GenerateShiftsResult>();

  for (const { assignment, template, patternDays } of assignments) {
    const staffId = assignment._cp365_staffmember_value;
    const existingShifts = options?.existingShiftsMap?.get(staffId) || [];
    const existingLeave = options?.existingLeaveMap?.get(staffId) || [];

    const result = await generateShiftsFromPattern({
      assignmentId: assignment.cp365_staffpatternassignmentid,
      assignment,
      template,
      patternDays,
      startDate,
      endDate,
      existingShifts,
      existingLeave,
      dryRun: options?.dryRun ?? false,
    });

    results.set(assignment.cp365_staffpatternassignmentid, result);
  }

  return results;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that all required data is present for generation
 */
export function validateGenerationData(
  assignment: StaffPatternAssignment | undefined,
  template: ShiftPatternTemplate | undefined,
  patternDays: ShiftPatternDay[] | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!assignment) {
    errors.push('Pattern assignment is required');
  } else {
    if (!assignment._cp365_staffmember_value) {
      errors.push('Assignment must have a staff member');
    }
    if (!assignment.cp365_sp_startdate) {
      errors.push('Assignment must have a start date');
    }
    if (assignment.cp365_sp_assignmentstatus !== AssignmentStatus.Active) {
      errors.push('Assignment is not active');
    }
  }

  if (!template) {
    errors.push('Pattern template is required');
  } else {
    if (!template.cp365_sp_rotationcycleweeks || template.cp365_sp_rotationcycleweeks < 1) {
      errors.push('Pattern must have a valid rotation cycle');
    }
  }

  if (!patternDays || patternDays.length === 0) {
    errors.push('Pattern must have at least one day defined');
  } else {
    // Check that we have valid days with times
    const workingDays = patternDays.filter(pd => !pd.cp365_sp_isrestday);
    if (workingDays.length === 0) {
      errors.push('Pattern has no working days defined');
    }
    
    for (const day of workingDays) {
      if (!day.cp365_sp_starttime || !day.cp365_sp_endtime) {
        errors.push(
          `Day ${day.cp365_sp_weeknumber}-${DayOfWeekLabels[day.cp365_sp_dayofweek]} is missing start/end time`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate hours for a shift
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  isOvernight: boolean,
  breakMinutes: number = 0
): number {
  const start = parseISO(startTime);
  let end = parseISO(endTime);
  
  if (isOvernight) {
    end = addDays(end, 1);
  }
  
  const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const workingMinutes = totalMinutes - breakMinutes;
  
  return workingMinutes / 60;
}

