/**
 * CarePoint 365 - Pattern Generation API Functions
 * Shift generation from patterns and conflict detection
 */

import { getDataverseClient, isDataverseClientInitialised } from '../../../api/dataverse/client';
import type {
  StaffPatternAssignment,
  ShiftPatternDay,
  ShiftGenerationLog,
  PatternConflict,
  GenerationResult,
  GenerateShiftsOptions,
  GenerationType,
  DayOfWeek,
} from '../types';
import {
  GenerationType as GenerationTypeEnum,
  PatternPublishStatus,
  DayOfWeek as DayOfWeekEnum,
} from '../types';
import { ShiftStatus, type Shift, type StaffAbsenceLog } from '../../../api/dataverse/types';
import { fetchPatternDays, extractTimeFromDateTime } from './patternDays';
import { fetchAssignmentById, updateLastGeneratedDate, parseAppliesToDays } from './patternAssignments';
import { format, addDays, differenceInWeeks, parseISO, isSameDay } from 'date-fns';

/**
 * Generate shifts from a pattern assignment
 */
export async function generateShiftsFromPattern(
  options: GenerateShiftsOptions
): Promise<GenerationResult> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  const {
    assignmentId,
    startDate,
    endDate,
    rotaId,
    sublocationId,
    conflictResolutions = new Map(),
    dryRun = false,
  } = options;

  console.log('[PatternGeneration] Generating shifts for assignment:', assignmentId);
  console.log('[PatternGeneration] Period:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('[PatternGeneration] Rota ID:', rotaId);
  console.log('[PatternGeneration] Sublocation ID:', sublocationId);
  console.log('[PatternGeneration] Dry run:', dryRun);

  // Validate rotaId - it's required for shifts to appear on the rota
  if (!rotaId) {
    throw new Error('Rota ID is required. Please select a location with an active rota.');
  }

  const result: GenerationResult = {
    assignmentId,
    shiftsCreated: [],
    shiftsSkipped: [],
    conflicts: [],
    errors: [],
    periodStart: format(startDate, 'yyyy-MM-dd'),
    periodEnd: format(endDate, 'yyyy-MM-dd'),
  };

  try {
    // Fetch the assignment with expanded template
    const assignment = await fetchAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Fetch pattern days
    const patternDays = await fetchPatternDays(assignment._cp365_shiftpatterntemplate_value);
    if (patternDays.length === 0) {
      result.errors.push('No pattern days defined');
      return result;
    }

    const template = assignment.cp365_shiftpatterntemplate;
    if (!template) {
      throw new Error('Pattern template not found');
    }

    // Get staff member ID
    const staffMemberId = assignment._cp365_staffmember_value;
    const rotationCycleWeeks = template.cp365_sp_rotationcycleweeks;
    const assignmentStartDate = parseISO(assignment.cp365_sp_startdate);
    const rotationStartWeek = assignment.cp365_sp_rotationstartweek;

    // Detect conflicts
    result.conflicts = await detectConflicts(
      staffMemberId,
      startDate,
      endDate,
      assignmentId
    );

    // Parse appliesToDays if set
    const appliesToDays = parseAppliesToDays(assignment.cp365_sp_appliestodays);

    // Determine publish status
    const publishStatus = assignment.cp365_sp_overridepublishstatus && assignment.cp365_sp_publishstatus
      ? assignment.cp365_sp_publishstatus
      : template.cp365_sp_defaultpublishstatus;

    // Generate shifts for each date in range
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = getDayOfWeekFromDate(currentDate);
      const dayName = format(currentDate, 'EEEE');

      // Check if this day is in appliesToDays (if set)
      if (appliesToDays.length > 0 && !appliesToDays.includes(dayName)) {
        result.shiftsSkipped.push({ date: dateStr, reason: 'Day not in applies-to list' });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check if date is before assignment start
      if (currentDate < assignmentStartDate) {
        result.shiftsSkipped.push({ date: dateStr, reason: 'Before assignment start date' });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check if date is after assignment end
      if (assignment.cp365_sp_enddate) {
        const assignmentEndDate = parseISO(assignment.cp365_sp_enddate);
        if (currentDate > assignmentEndDate) {
          result.shiftsSkipped.push({ date: dateStr, reason: 'After assignment end date' });
          currentDate = addDays(currentDate, 1);
          continue;
        }
      }

      // Calculate which week of the rotation this date falls in
      const rotationWeek = getRotationWeek(
        assignmentStartDate,
        rotationStartWeek,
        rotationCycleWeeks,
        currentDate
      );

      // Find the pattern day for this week and day of week
      const patternDay = patternDays.find(
        (d) => d.cp365_sp_weeknumber === rotationWeek && d.cp365_sp_dayofweek === dayOfWeek
      );

      if (!patternDay) {
        result.shiftsSkipped.push({ date: dateStr, reason: 'No pattern day defined' });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Skip rest days
      if (patternDay.cp365_sp_isrestday) {
        result.shiftsSkipped.push({ date: dateStr, reason: 'Rest day' });
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check for conflicts
      const conflict = result.conflicts.find((c) => c.date === dateStr);
      if (conflict) {
        const resolution = conflictResolutions.get(dateStr) || 'keep';
        
        if (resolution === 'keep' || resolution === 'skip') {
          result.shiftsSkipped.push({ 
            date: dateStr, 
            reason: `Conflict: ${conflict.type} - ${resolution}` 
          });
          currentDate = addDays(currentDate, 1);
          continue;
        }

        // resolution === 'override' - delete existing shift if any
        if (conflict.existingShiftId && !dryRun) {
          try {
            const client = getDataverseClient();
            await client.delete('cp365_shifts', conflict.existingShiftId);
            console.log('[PatternGeneration] Deleted conflicting shift:', conflict.existingShiftId);
          } catch (error) {
            console.warn('[PatternGeneration] Failed to delete conflicting shift:', error);
          }
        }
      }

      // Create the shift
      if (!dryRun) {
        try {
          const shift = await createShiftFromPattern(
            staffMemberId,
            currentDate,
            patternDay,
            assignment,
            rotationWeek,
            publishStatus,
            rotaId  // Pass the rota ID so the shift is linked to the rota
          );
          result.shiftsCreated.push(shift);
        } catch (error) {
          console.error('[PatternGeneration] Error creating shift for', dateStr, error);
          result.errors.push(`${dateStr}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // Dry run - just count as would-be-created
        result.shiftsCreated.push({
          cp365_shiftid: 'dry-run-' + dateStr,
          cp365_shiftdate: dateStr,
        } as Shift);
      }

      currentDate = addDays(currentDate, 1);
    }

    // Update last generated date (if not dry run)
    if (!dryRun && result.shiftsCreated.length > 0) {
      await updateLastGeneratedDate(assignmentId, format(endDate, 'yyyy-MM-dd'));
    }

    // Log generation
    if (!dryRun) {
      await logGeneration(assignmentId, result, GenerationTypeEnum.Manual);
    }

    console.log('[PatternGeneration] Complete:', result.shiftsCreated.length, 'created,', result.shiftsSkipped.length, 'skipped');

    return result;
  } catch (error) {
    console.error('[PatternGeneration] Error:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Detect conflicts for a date range
 */
export async function detectConflicts(
  staffMemberId: string,
  startDate: Date,
  endDate: Date,
  excludePatternAssignmentId?: string
): Promise<PatternConflict[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  const conflicts: PatternConflict[] = [];
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  console.log('[PatternGeneration] Detecting conflicts for', staffMemberId, 'from', startDateStr, 'to', endDateStr);

  try {
    const client = getDataverseClient();

    // Check for existing shifts
    const existingShifts = await client.get<Shift>('cp365_shifts', {
      filter: `_cp365_staffmember_value eq '${staffMemberId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr}`,
      select: ['cp365_shiftid', 'cp365_shiftdate', 'cp365_shiftstarttime', 'cp365_shiftendtime', '_cp365_staffpatternassignment_value'],
    });

    for (const shift of existingShifts) {
      // Skip shifts from the same assignment
      if (excludePatternAssignmentId && 
          (shift as { _cp365_staffpatternassignment_value?: string })._cp365_staffpatternassignment_value === excludePatternAssignmentId) {
        continue;
      }

      conflicts.push({
        date: shift.cp365_shiftdate,
        type: 'existing_shift',
        description: `Existing shift ${format(parseISO(shift.cp365_shiftstarttime), 'HH:mm')} - ${format(parseISO(shift.cp365_shiftendtime), 'HH:mm')}`,
        existingShiftId: shift.cp365_shiftid,
        patternWouldCreate: {
          startTime: '',
          endTime: '',
        },
      });
    }

    // Check for approved leave
    const approvedLeave = await client.get<StaffAbsenceLog>('cp365_staffabsencelogs', {
      filter: `_cp365_staffmember_value eq '${staffMemberId}' and cp365_absencestatus eq 3 and cp365_absencestart le ${endDateStr} and cp365_absenceend ge ${startDateStr}`,
      select: ['cp365_staffabsencelogid', 'cp365_absencestart', 'cp365_absenceend'],
      // NOTE: Navigation property name matches the relationship schema name
      expand: ['cp365_AbsenceType($select=cp365_absencetypename)'],
    });

    for (const leave of approvedLeave) {
      const leaveStart = parseISO(leave.cp365_absencestart || leave.cp365_startdate);
      const leaveEnd = parseISO(leave.cp365_absenceend || leave.cp365_enddate);

      let currentDate = startDate;
      while (currentDate <= endDate) {
        if (currentDate >= leaveStart && currentDate <= leaveEnd) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          // Don't add duplicate conflicts for the same date
          if (!conflicts.find((c) => c.date === dateStr && c.type === 'approved_leave')) {
            conflicts.push({
              date: dateStr,
              type: 'approved_leave',
              description: `Approved leave: ${((leave as unknown as Record<string, unknown>).cp365_AbsenceType as { cp365_absencetypename?: string } | undefined)?.cp365_absencetypename || 'Leave'}`,
              existingLeaveId: leave.cp365_staffabsencelogid,
              patternWouldCreate: {
                startTime: '',
                endTime: '',
              },
            });
          }
        }
        currentDate = addDays(currentDate, 1);
      }
    }

    console.log('[PatternGeneration] Detected', conflicts.length, 'conflicts');
    return conflicts;
  } catch (error) {
    console.error('[PatternGeneration] Error detecting conflicts:', error);
    return [];
  }
}

/**
 * Get generation logs for an assignment
 */
export async function getGenerationLogs(assignmentId: string): Promise<ShiftGenerationLog[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternGeneration] Fetching generation logs for assignment:', assignmentId);

    const logs = await client.get<ShiftGenerationLog>('cp365_shiftgenerationlogs', {
      filter: `_cp365_staffpatternassignment_value eq '${assignmentId}'`,
      select: [
        'cp365_shiftgenerationlogid',
        'cp365_name',
        'cp365_sp_generationdate',
        'cp365_sp_periodstart',
        'cp365_sp_periodend',
        'cp365_sp_shiftsgenerated',
        'cp365_sp_conflictsdetected',
        'cp365_sp_conflictdetails',
        'cp365_sp_generationtype',
      ],
      orderby: 'cp365_sp_generationdate desc',
    });

    console.log('[PatternGeneration] Fetched', logs.length, 'generation logs');
    return logs;
  } catch (error) {
    console.error('[PatternGeneration] Error fetching generation logs:', error);
    throw error;
  }
}

/**
 * Log a generation operation
 */
export async function logGeneration(
  assignmentId: string,
  result: GenerationResult,
  type: GenerationType
): Promise<void> {
  if (!isDataverseClientInitialised()) {
    return;
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternGeneration] Logging generation for assignment:', assignmentId);

    const logData = {
      cp365_name: `Generation ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
      'cp365_staffpatternassignment@odata.bind': `/cp365_staffpatternassignments(${assignmentId})`,
      cp365_sp_generationdate: new Date().toISOString(),
      cp365_sp_periodstart: result.periodStart,
      cp365_sp_periodend: result.periodEnd,
      cp365_sp_shiftsgenerated: result.shiftsCreated.length,
      cp365_sp_conflictsdetected: result.conflicts.length,
      cp365_sp_conflictdetails: result.conflicts.length > 0 
        ? JSON.stringify(result.conflicts) 
        : null,
      cp365_sp_generationtype: type,
    };

    await client.create('cp365_shiftgenerationlogs', logData);
    console.log('[PatternGeneration] Logged generation');
  } catch (error) {
    console.error('[PatternGeneration] Error logging generation:', error);
    // Don't throw - logging failure shouldn't fail the generation
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate which week of the rotation a date falls in
 */
function getRotationWeek(
  assignmentStartDate: Date,
  rotationStartWeek: number,
  totalRotationWeeks: number,
  targetDate: Date
): number {
  const weeksSinceStart = differenceInWeeks(targetDate, assignmentStartDate);
  const adjustedWeek = (weeksSinceStart + rotationStartWeek - 1) % totalRotationWeeks;
  return adjustedWeek + 1; // Return 1-based week number
}

/**
 * Get DayOfWeek enum value from a Date
 */
function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Convert to our enum: 1 = Monday, 7 = Sunday
  return jsDay === 0 ? DayOfWeekEnum.Sunday : (jsDay as DayOfWeek);
}

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

/**
 * Create a shift from a pattern day
 * 
 * Uses a two-step process:
 * 1. Create the shift WITHOUT the staff member (to avoid @odata.bind issues)
 * 2. Associate the staff member using the single-valued navigation property
 */
async function createShiftFromPattern(
  staffMemberId: string,
  shiftDate: Date,
  patternDay: ShiftPatternDay,
  assignment: StaffPatternAssignment,
  rotationWeek: number,
  publishStatus: PatternPublishStatus,
  rotaId: string
): Promise<Shift> {
  const client = getDataverseClient();
  const dateStr = format(shiftDate, 'yyyy-MM-dd');

  // Validate staffMemberId first - it's required
  if (!isValidGuid(staffMemberId)) {
    console.error('[PatternGeneration] Invalid or missing staffMemberId:', staffMemberId);
    throw new Error(`Cannot create shift: Invalid staffMemberId "${staffMemberId}"`);
  }

  // Validate rotaId - required for shifts to appear on the rota
  if (!isValidGuid(rotaId)) {
    console.error('[PatternGeneration] Invalid or missing rotaId:', rotaId);
    throw new Error(`Cannot create shift: Invalid rotaId "${rotaId}"`);
  }

  // Extract times from pattern day
  const startTime = patternDay.cp365_sp_starttime 
    ? extractTimeFromDateTime(patternDay.cp365_sp_starttime) 
    : '09:00';
  const endTime = patternDay.cp365_sp_endtime 
    ? extractTimeFromDateTime(patternDay.cp365_sp_endtime) 
    : '17:00';

  // Build shift start and end datetime
  const shiftStartTime = `${dateStr}T${startTime}:00Z`;
  
  // Handle overnight shifts
  let shiftEndDate = dateStr;
  if (patternDay.cp365_sp_isovernight) {
    shiftEndDate = format(addDays(shiftDate, 1), 'yyyy-MM-dd');
  }
  const shiftEndTime = `${shiftEndDate}T${endTime}:00Z`;

  // Debug logging
  console.log('[PatternGeneration] Creating shift for', dateStr);
  console.log('[PatternGeneration] staffMemberId:', staffMemberId);
  console.log('[PatternGeneration] rotaId:', rotaId);

  // STEP 1: Create the BASIC shift without any lookup bindings
  // We'll associate staff member and rota separately to avoid @odata.bind issues
  const createData: Record<string, unknown> = {
    cp365_shiftname: `Pattern Shift - ${dateStr}`,
    cp365_shiftdate: dateStr,
    cp365_shiftstarttime: shiftStartTime,
    cp365_shiftendtime: shiftEndTime,
    cp365_shiftstatus: publishStatus === PatternPublishStatus.Published
      ? ShiftStatus.Published
      : ShiftStatus.Unpublished,
    // Pattern-specific fields - these columns use 'cr482_sp_' prefix in Dataverse
    cr482_sp_isgeneratedfrompattern: true,
    cr482_sp_patternweek: rotationWeek,
    cr482_sp_patterndayofweek: patternDay.cp365_sp_dayofweek,
    // NOTE: We do NOT include cp365_rota@odata.bind here - we'll associate it separately
  };
  
  // Optional lookups - only add if valid GUID (these seem to work)
  if (isValidGuid(patternDay._cp365_shiftreference_value)) {
    createData['cp365_shiftreference@odata.bind'] = `/cp365_shiftreferences(${patternDay._cp365_shiftreference_value})`;
  }
  
  if (isValidGuid(patternDay._cp365_shiftactivity_value)) {
    createData['cp365_shiftactivity@odata.bind'] = `/cp365_shiftactivities(${patternDay._cp365_shiftactivity_value})`;
  }
  
  // Optional break duration
  if (patternDay.cp365_sp_breakminutes) {
    createData.cr1e2_shiftbreakduration = patternDay.cp365_sp_breakminutes;
  }
  
  // Debug: Log exactly what we're sending
  console.log('[PatternGeneration] STEP 1: Creating basic shift (no lookups)');
  console.log('[PatternGeneration] Payload:', JSON.stringify(createData, null, 2));
  
  const shift = await client.create<Shift>('cp365_shifts', createData);
  console.log('[PatternGeneration] Created shift:', shift.cp365_shiftid);
  
  // STEP 2: Associate the ROTA so the shift appears on the rota grid
  // This is CRITICAL - without this, shifts won't be visible in the rota view
  console.log('[PatternGeneration] STEP 2: Associating rota', rotaId);
  try {
    await client.associate(
      'cp365_shifts',
      shift.cp365_shiftid,
      'cp365_Rota',  // Try PascalCase first
      'cp365_rotas',
      rotaId
    );
    console.log('[PatternGeneration] Rota associated successfully (PascalCase)');
  } catch (rotaError) {
    console.warn('[PatternGeneration] Failed to associate rota with PascalCase, trying lowercase...');
    try {
      await client.associate(
        'cp365_shifts',
        shift.cp365_shiftid,
        'cp365_rota',  // Try lowercase
        'cp365_rotas',
        rotaId
      );
      console.log('[PatternGeneration] Rota associated successfully (lowercase)');
    } catch (rotaError2) {
      console.error('[PatternGeneration] Failed to associate rota:', rotaError2);
      // This is a critical error - delete the shift and re-throw
      console.warn('[PatternGeneration] Deleting orphan shift due to rota association failure');
      try {
        await client.delete('cp365_shifts', shift.cp365_shiftid);
      } catch {
        console.warn('[PatternGeneration] Could not delete orphan shift');
      }
      throw new Error(`Failed to associate shift with rota: ${rotaError2 instanceof Error ? rotaError2.message : 'Unknown error'}`);
    }
  }
  
  // STEP 3: Associate the staff member using the navigation property
  console.log('[PatternGeneration] STEP 3: Associating staff member', staffMemberId);
  try {
    await client.associate(
      'cp365_shifts',
      shift.cp365_shiftid,
      'cp365_StaffMember',  // Try PascalCase first
      'cp365_staffmembers',
      staffMemberId
    );
    console.log('[PatternGeneration] Staff member associated successfully (PascalCase)');
  } catch (assocError) {
    console.warn('[PatternGeneration] Failed to associate staff member with PascalCase, trying lowercase...');
    try {
      await client.associate(
        'cp365_shifts',
        shift.cp365_shiftid,
        'cp365_staffmember',  // Try lowercase
        'cp365_staffmembers',
        staffMemberId
      );
      console.log('[PatternGeneration] Staff member associated successfully (lowercase)');
    } catch (assocError2) {
      console.error('[PatternGeneration] Failed to associate staff member:', assocError2);
      // Don't fail the whole operation - the shift was created with rota link
      // The user can manually assign the staff member later
    }
  }
  
  // STEP 4: Associate the pattern assignment if we have one
  if (isValidGuid(assignment.cp365_staffpatternassignmentid)) {
    console.log('[PatternGeneration] STEP 4: Associating pattern assignment');
    try {
      await client.associate(
        'cp365_shifts',
        shift.cp365_shiftid,
        'cp365_StaffPatternAssignment',
        'cp365_staffpatternassignments',
        assignment.cp365_staffpatternassignmentid
      );
      console.log('[PatternGeneration] Pattern assignment associated successfully');
    } catch (assocError) {
      console.warn('[PatternGeneration] Failed to associate pattern assignment:', assocError);
    }
  }
  
  return { ...shift, _cp365_staffmember_value: staffMemberId } as Shift;
}

