/**
 * CarePoint 365 - Shift Generation Service
 * 
 * Handles scheduling, batch processing, and management of shift generation
 * from pattern assignments.
 */

import {
  addDays,
  addWeeks,
  format,
  parseISO,
  startOfDay,
  differenceInDays,
  isBefore,
  max as dateMax,
} from 'date-fns';
import {
  generateShiftsFromPattern,
  validateGenerationData,
  type GenerateShiftsResult,
} from './shiftGeneration';
import type {
  StaffPatternAssignment,
  ShiftPatternTemplate,
  ShiftPatternDay,
  ShiftGenerationLog,
} from '../types';
import {
  GenerationWindow,
  GenerationType,
  AssignmentStatus,
} from '../types';
import type { Shift, StaffAbsenceLog } from '../../../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationWindow {
  startDate: Date;
  endDate: Date;
  daysToGenerate: number;
}

export interface BatchGenerationResult {
  assignmentsProcessed: number;
  assignmentsSkipped: number;
  totalShiftsGenerated: number;
  totalConflictsDetected: number;
  errors: string[];
  results: Map<string, GenerateShiftsResult>;
}

export interface GenerationLogData {
  cp365_name: string;
  cp365_sp_generationdate: string;
  cp365_sp_periodstart: string;
  cp365_sp_periodend: string;
  cp365_sp_shiftsgenerated: number;
  cp365_sp_conflictsdetected: number;
  cp365_sp_conflictdetails: string;
  cp365_sp_generationtype: number;
  // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
  'cp365_staffpatternassignment@odata.bind': string;
}

// =============================================================================
// GENERATION WINDOW CALCULATIONS
// =============================================================================

/**
 * Calculate the generation window for an assignment
 * 
 * Determines the start and end dates for shift generation based on:
 * - Last generated date (or assignment start if never generated)
 * - Generation window setting from the template (1, 2, or 4 weeks)
 */
export function calculateGenerationWindow(
  assignment: StaffPatternAssignment,
  template: ShiftPatternTemplate
): GenerationWindow {
  const today = startOfDay(new Date());
  
  // Determine start date
  let startDate: Date;
  
  if (assignment.cp365_sp_lastgenerateddate) {
    // Start from day after last generated
    startDate = addDays(parseISO(assignment.cp365_sp_lastgenerateddate), 1);
  } else {
    // Start from assignment start date or today, whichever is later
    const assignmentStart = parseISO(assignment.cp365_sp_startdate);
    startDate = dateMax([assignmentStart, today]);
  }

  // Ensure start is not in the past
  if (isBefore(startDate, today)) {
    startDate = today;
  }

  // Calculate end date based on generation window
  const windowWeeks = template.cp365_sp_generationwindowweeks;
  const endDate = addWeeks(today, windowWeeks);

  // Cap at assignment end date if set
  let effectiveEndDate = endDate;
  if (assignment.cp365_sp_enddate) {
    const assignmentEnd = parseISO(assignment.cp365_sp_enddate);
    if (isBefore(assignmentEnd, effectiveEndDate)) {
      effectiveEndDate = assignmentEnd;
    }
  }

  return {
    startDate,
    endDate: effectiveEndDate,
    daysToGenerate: Math.max(0, differenceInDays(effectiveEndDate, startDate) + 1),
  };
}

/**
 * Check if an assignment needs shift generation
 * 
 * Returns true if:
 * - Never generated (cp365_sp_lastgenerateddate is null)
 * - Last generated date + threshold is approaching (within 2 days of window end)
 */
export function isGenerationNeeded(
  assignment: StaffPatternAssignment,
  template: ShiftPatternTemplate
): boolean {
  // Skip inactive assignments
  if (assignment.cp365_sp_assignmentstatus !== AssignmentStatus.Active) {
    return false;
  }

  // Check if assignment has ended
  if (assignment.cp365_sp_enddate) {
    const endDate = parseISO(assignment.cp365_sp_enddate);
    if (isBefore(endDate, new Date())) {
      return false;
    }
  }

  // Never generated - needs generation
  if (!assignment.cp365_sp_lastgenerateddate) {
    return true;
  }

  const today = startOfDay(new Date());
  const lastGenerated = parseISO(assignment.cp365_sp_lastgenerateddate);
  const windowWeeks = template.cp365_sp_generationwindowweeks;
  
  // Calculate when we would run out of generated shifts
  const runOutDate = addWeeks(lastGenerated, windowWeeks);
  
  // Generate if we're within 2 days of running out
  const threshold = addDays(today, 2);
  
  return isBefore(runOutDate, threshold);
}

/**
 * Get the number of days until generation is needed
 * Returns negative if generation is overdue
 */
export function getDaysUntilGenerationNeeded(
  assignment: StaffPatternAssignment,
  template: ShiftPatternTemplate
): number {
  if (!assignment.cp365_sp_lastgenerateddate) {
    return -1; // Immediate generation needed
  }

  const today = startOfDay(new Date());
  const lastGenerated = parseISO(assignment.cp365_sp_lastgenerateddate);
  const windowWeeks = template.cp365_sp_generationwindowweeks;
  
  const runOutDate = addWeeks(lastGenerated, windowWeeks);
  
  return differenceInDays(runOutDate, today);
}

// =============================================================================
// GENERATION OPERATIONS
// =============================================================================

/**
 * Generate shifts for a single assignment
 * 
 * This is the main entry point for generating shifts for one assignment.
 * It fetches required data, calculates the window, and generates shifts.
 */
export async function generateForAssignment(
  assignment: StaffPatternAssignment,
  template: ShiftPatternTemplate,
  patternDays: ShiftPatternDay[],
  options?: {
    existingShifts?: Shift[];
    existingLeave?: StaffAbsenceLog[];
    conflictResolutions?: Map<string, 'keep' | 'override' | 'skip'>;
    dryRun?: boolean;
    rotaId?: string;
  }
): Promise<GenerateShiftsResult> {
  // Validate data
  const validation = validateGenerationData(assignment, template, patternDays);
  if (!validation.valid) {
    return {
      shiftsCreated: [],
      shiftsSkipped: [],
      conflicts: [],
      errors: validation.errors,
      periodStart: '',
      periodEnd: '',
    };
  }

  // Calculate window
  const window = calculateGenerationWindow(assignment, template);

  if (window.daysToGenerate <= 0) {
    return {
      shiftsCreated: [],
      shiftsSkipped: [],
      conflicts: [],
      errors: ['No days to generate - generation window is empty'],
      periodStart: format(window.startDate, 'yyyy-MM-dd'),
      periodEnd: format(window.endDate, 'yyyy-MM-dd'),
    };
  }

  // Generate shifts
  return generateShiftsFromPattern({
    assignmentId: assignment.cp365_staffpatternassignmentid,
    assignment,
    template,
    patternDays,
    startDate: window.startDate,
    endDate: window.endDate,
    existingShifts: options?.existingShifts,
    existingLeave: options?.existingLeave,
    conflictResolutions: options?.conflictResolutions,
    dryRun: options?.dryRun,
    rotaId: options?.rotaId,
  });
}

/**
 * Process multiple assignments in batch
 * 
 * Generates shifts for all assignments that need generation,
 * with rate limiting to avoid API throttling.
 */
export async function generateBatch(
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
    existingShifts?: Shift[];
    existingLeave?: StaffAbsenceLog[];
  }>,
  options?: {
    dryRun?: boolean;
    delayBetweenAssignments?: number; // ms
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<BatchGenerationResult> {
  const result: BatchGenerationResult = {
    assignmentsProcessed: 0,
    assignmentsSkipped: 0,
    totalShiftsGenerated: 0,
    totalConflictsDetected: 0,
    errors: [],
    results: new Map(),
  };

  const delay = options?.delayBetweenAssignments ?? 100;

  for (let i = 0; i < assignments.length; i++) {
    const { assignment, template, patternDays, existingShifts, existingLeave } = assignments[i];

    // Report progress
    options?.onProgress?.(i + 1, assignments.length);

    // Check if generation is needed
    if (!isGenerationNeeded(assignment, template)) {
      result.assignmentsSkipped++;
      continue;
    }

    try {
      const genResult = await generateForAssignment(
        assignment,
        template,
        patternDays,
        {
          existingShifts,
          existingLeave,
          dryRun: options?.dryRun,
        }
      );

      result.results.set(assignment.cp365_staffpatternassignmentid, genResult);
      result.assignmentsProcessed++;
      result.totalShiftsGenerated += genResult.shiftsCreated.length;
      result.totalConflictsDetected += genResult.conflicts.length;

      if (genResult.errors.length > 0) {
        result.errors.push(
          ...genResult.errors.map(
            (e) => `Assignment ${assignment.cp365_staffpatternassignmentid}: ${e}`
          )
        );
      }
    } catch (error) {
      result.errors.push(
        `Assignment ${assignment.cp365_staffpatternassignmentid}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Rate limiting delay
    if (delay > 0 && i < assignments.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return result;
}

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Create a generation log entry
 * Returns the log data that should be saved to Dataverse
 */
export function createGenerationLogData(
  assignmentId: string,
  result: GenerateShiftsResult,
  type: GenerationType
): GenerationLogData {
  return {
    cp365_name: `Generation ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    cp365_sp_generationdate: new Date().toISOString(),
    cp365_sp_periodstart: result.periodStart,
    cp365_sp_periodend: result.periodEnd,
    cp365_sp_shiftsgenerated: result.shiftsCreated.length,
    cp365_sp_conflictsdetected: result.conflicts.length,
    cp365_sp_conflictdetails: JSON.stringify(result.conflicts.slice(0, 50)), // Limit size
    cp365_sp_generationtype: type,
    // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
    'cp365_staffpatternassignment@odata.bind': `/cp365_staffpatternassignments(${assignmentId})`,
  };
}

/**
 * Get a summary of the generation result
 */
export function summarizeGenerationResult(result: GenerateShiftsResult): string {
  const parts: string[] = [];

  if (result.shiftsCreated.length > 0) {
    parts.push(`${result.shiftsCreated.length} shifts created`);
  }

  if (result.shiftsSkipped.length > 0) {
    parts.push(`${result.shiftsSkipped.length} dates skipped`);
  }

  if (result.conflicts.length > 0) {
    parts.push(`${result.conflicts.length} conflicts`);
  }

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} errors`);
  }

  return parts.join(', ') || 'No changes';
}

// =============================================================================
// PATTERN CHANGE HANDLING
// =============================================================================

/**
 * Calculate which shifts need regeneration after a pattern change
 * 
 * Returns the list of existing pattern-generated shifts that would be affected.
 */
export function getShiftsAffectedByPatternChange(
  patternId: string,
  existingShifts: Shift[],
  effectiveDate: Date
): Shift[] {
  const effectiveDateStr = format(effectiveDate, 'yyyy-MM-dd');
  
  return existingShifts.filter((shift) => {
    // Only pattern-generated shifts (uses cr482_sp_ prefix in Dataverse)
    if (!(shift as any).cr482_sp_isgeneratedfrompattern) return false;
    
    // Only shifts on or after effective date
    const shiftDate = shift.cp365_shiftdate?.split('T')[0];
    if (!shiftDate || shiftDate < effectiveDateStr) return false;
    
    // Only published or unpublished status (not worked, cancelled, etc.)
    // This ensures we don't modify historical shifts
    if (shift.cp365_shiftstatus !== 1001 && shift.cp365_shiftstatus !== 1009) {
      return false;
    }
    
    return true;
  });
}

/**
 * Plan regeneration for all assignments using a pattern
 * 
 * This doesn't execute the regeneration, just calculates what would be affected.
 */
export function planPatternChangeRegeneration(
  assignments: StaffPatternAssignment[],
  affectedShifts: Shift[],
  effectiveDate: Date
): {
  assignmentsToRegenerate: StaffPatternAssignment[];
  shiftsToDelete: Shift[];
  summary: string;
} {
  const activeAssignments = assignments.filter(
    (a) => a.cp365_sp_assignmentstatus === AssignmentStatus.Active
  );

  return {
    assignmentsToRegenerate: activeAssignments,
    shiftsToDelete: affectedShifts,
    summary: `${activeAssignments.length} assignments will be regenerated. ${affectedShifts.length} existing shifts will be replaced.`,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format generation window for display
 */
export function formatGenerationWindow(window: GenerationWindow): string {
  return `${format(window.startDate, 'd MMM')} - ${format(window.endDate, 'd MMM yyyy')} (${window.daysToGenerate} days)`;
}

/**
 * Get human-readable generation type label
 */
export function getGenerationTypeLabel(type: GenerationType): string {
  switch (type) {
    case GenerationType.Manual:
      return 'Manual';
    case GenerationType.Scheduled:
      return 'Scheduled';
    case GenerationType.OnDemand:
      return 'On Demand';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate expected shifts count for a generation window
 * (rough estimate based on pattern working days)
 */
export function estimateShiftsToGenerate(
  patternDays: ShiftPatternDay[],
  rotationCycleWeeks: number,
  daysToGenerate: number
): number {
  const workingDaysPerWeek = patternDays.filter((pd) => !pd.cp365_sp_isrestday).length / rotationCycleWeeks;
  const weeks = daysToGenerate / 7;
  return Math.round(workingDaysPerWeek * weeks);
}

