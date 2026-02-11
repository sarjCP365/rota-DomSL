/**
 * CarePoint 365 - Pattern Assignments API Functions
 * CRUD operations for Staff Pattern Assignments
 */

import { getDataverseClient, isDataverseClientInitialised } from '@/api/dataverse/client';
import type {
  StaffPatternAssignment,
  AssignmentFormData,
  BulkAssignmentOptions,
  ShiftPatternTemplate,
} from '../types';
import { AssignmentStatus as AssignmentStatusEnum } from '../types';
import { format } from 'date-fns';

/**
 * Entity set name for pattern assignments
 */
const ENTITY_SET = 'cp365_staffpatternassignments';

/**
 * Select columns for pattern assignment queries
 */
const ASSIGNMENT_SELECT = [
  'cp365_staffpatternassignmentid',
  'cp365_name',
  '_cp365_staffmember_value',
  '_cp365_shiftpatterntemplate_value',
  'cp365_sp_startdate',
  'cp365_sp_enddate',
  'cp365_sp_rotationstartweek',
  'cp365_sp_priority',
  'cp365_sp_appliestodays',
  'cp365_sp_overridepublishstatus',
  'cp365_sp_publishstatus',
  'cp365_sp_lastgenerateddate',
  'cp365_sp_assignmentstatus',
  'statecode',
  'statuscode',
];

/**
 * Expand options for pattern assignment queries
 * NOTE: Dataverse navigation property names are ALWAYS lowercase (schema name)
 * This applies to both @odata.bind AND $expand clauses
 */
const ASSIGNMENT_EXPAND = [
  'cp365_staffmember($select=cp365_staffmemberid,cp365_staffmembername,cp365_forename,cp365_surname)',
  'cp365_shiftpatterntemplate($select=cp365_shiftpatterntemplatenewid,cp365_name,cp365_sp_rotationcycleweeks,cp365_sp_averageweeklyhours)',
];

/**
 * Fetch all assignments for a staff member
 */
export async function fetchStaffAssignments(
  staffMemberId: string,
  includeEnded: boolean = false
): Promise<StaffPatternAssignment[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();

    const filterParts = [`_cp365_staffmember_value eq '${staffMemberId}'`, 'statecode eq 0'];

    if (!includeEnded) {
      filterParts.push(`cp365_sp_assignmentstatus eq ${AssignmentStatusEnum.Active}`);
    }

    const assignments = await client.get<StaffPatternAssignment>(ENTITY_SET, {
      filter: filterParts.join(' and '),
      select: ASSIGNMENT_SELECT,
      expand: ASSIGNMENT_EXPAND,
      orderby: 'cp365_sp_priority asc, cp365_sp_startdate desc',
    });

    return assignments;
  } catch (error) {
    console.error('[PatternAssignments] Error fetching staff assignments:', error);
    throw error;
  }
}

/**
 * Fetch all assignments for a pattern template
 */
export async function fetchAssignmentsByPattern(
  patternTemplateId: string,
  activeOnly: boolean = true
): Promise<StaffPatternAssignment[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();

    const filterParts = [
      `_cp365_shiftpatterntemplate_value eq '${patternTemplateId}'`,
      'statecode eq 0',
    ];

    if (activeOnly) {
      filterParts.push(`cp365_sp_assignmentstatus eq ${AssignmentStatusEnum.Active}`);
    }

    const assignments = await client.get<StaffPatternAssignment>(ENTITY_SET, {
      filter: filterParts.join(' and '),
      select: ASSIGNMENT_SELECT,
      expand: ASSIGNMENT_EXPAND,
      orderby: 'cp365_sp_startdate desc',
    });

    return assignments;
  } catch (error) {
    console.error('[PatternAssignments] Error fetching pattern assignments:', error);
    throw error;
  }
}

/**
 * Fetch a single assignment by ID
 */
export async function fetchAssignmentById(id: string): Promise<StaffPatternAssignment | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();

    const assignment = await client.getById<StaffPatternAssignment>(ENTITY_SET, id, {
      select: ASSIGNMENT_SELECT,
      expand: ASSIGNMENT_EXPAND,
    });

    return assignment;
  } catch (error) {
    console.error('[PatternAssignments] Error fetching assignment:', error);
    throw error;
  }
}

/**
 * Create a new pattern assignment
 */
export async function createPatternAssignment(
  data: AssignmentFormData
): Promise<StaffPatternAssignment> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();

    // Fetch pattern to get name for assignment name
    const pattern = await client.getById<ShiftPatternTemplate>(
      'cp365_shiftpatterntemplatenews',
      data.patternTemplateId,
      { select: ['cp365_name'] }
    );

    const assignmentData: Record<string, unknown> = {
      cp365_name: `${pattern?.cp365_name || 'Pattern'} - ${format(new Date(data.startDate), 'dd/MM/yyyy')}`,
      // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
      'cp365_staffmember@odata.bind': `/cp365_staffmembers(${data.staffMemberId})`,
      'cp365_shiftpatterntemplate@odata.bind': `/cp365_shiftpatterntemplatenews(${data.patternTemplateId})`,
      cp365_sp_startdate: data.startDate,
      cp365_sp_rotationstartweek: data.rotationStartWeek,
      cp365_sp_priority: data.priority,
      cp365_sp_overridepublishstatus: data.overridePublishStatus,
      cp365_sp_assignmentstatus: AssignmentStatusEnum.Active,
    };

    if (data.endDate) {
      assignmentData.cp365_sp_enddate = data.endDate;
    }

    if (data.appliesToDays && data.appliesToDays.length > 0) {
      assignmentData.cp365_sp_appliestodays = JSON.stringify(data.appliesToDays);
    }

    if (data.overridePublishStatus && data.publishStatus) {
      assignmentData.cp365_sp_publishstatus = data.publishStatus;
    }

    const result = await client.create<StaffPatternAssignment>(ENTITY_SET, assignmentData);

    return result;
  } catch (error) {
    console.error('[PatternAssignments] Error creating assignment:', error);
    throw error;
  }
}

/**
 * Update a pattern assignment
 */
export async function updatePatternAssignment(
  id: string,
  data: Partial<AssignmentFormData>
): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();

    const updateData: Record<string, unknown> = {};

    if (data.startDate !== undefined) {
      updateData.cp365_sp_startdate = data.startDate;
    }

    if (data.endDate !== undefined) {
      updateData.cp365_sp_enddate = data.endDate || null;
    }

    if (data.rotationStartWeek !== undefined) {
      updateData.cp365_sp_rotationstartweek = data.rotationStartWeek;
    }

    if (data.priority !== undefined) {
      updateData.cp365_sp_priority = data.priority;
    }

    if (data.appliesToDays !== undefined) {
      updateData.cp365_sp_appliestodays =
        data.appliesToDays && data.appliesToDays.length > 0
          ? JSON.stringify(data.appliesToDays)
          : null;
    }

    if (data.overridePublishStatus !== undefined) {
      updateData.cp365_sp_overridepublishstatus = data.overridePublishStatus;
    }

    if (data.publishStatus !== undefined) {
      updateData.cp365_sp_publishstatus = data.publishStatus;
    }

    await client.update(ENTITY_SET, id, updateData);
  } catch (error) {
    console.error('[PatternAssignments] Error updating assignment:', error);
    throw error;
  }
}

/**
 * End a pattern assignment
 */
export async function endPatternAssignment(id: string, endDate: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();

    await client.update(ENTITY_SET, id, {
      cp365_sp_enddate: endDate,
      cp365_sp_assignmentstatus: AssignmentStatusEnum.Ended,
    });
  } catch (error) {
    console.error('[PatternAssignments] Error ending assignment:', error);
    throw error;
  }
}

/**
 * Delete a pattern assignment
 */
export async function deletePatternAssignment(id: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();

    await client.delete(ENTITY_SET, id);
  } catch (error) {
    console.error('[PatternAssignments] Error deleting assignment:', error);
    throw error;
  }
}

/**
 * Get the active pattern for a staff member on a specific date
 */
export async function getActivePatternForDate(
  staffMemberId: string,
  date: Date
): Promise<StaffPatternAssignment | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    const dateStr = format(date, 'yyyy-MM-dd');

    const assignments = await client.get<StaffPatternAssignment>(ENTITY_SET, {
      filter: `_cp365_staffmember_value eq '${staffMemberId}' and cp365_sp_assignmentstatus eq ${AssignmentStatusEnum.Active} and cp365_sp_startdate le ${dateStr} and (cp365_sp_enddate eq null or cp365_sp_enddate ge ${dateStr})`,
      select: ASSIGNMENT_SELECT,
      expand: ASSIGNMENT_EXPAND,
      orderby: 'cp365_sp_priority asc',
      top: 1,
    });

    if (assignments.length === 0) {
      return null;
    }

    // Check appliesToDays if set
    const assignment = assignments[0];
    if (assignment.cp365_sp_appliestodays) {
      try {
        const allowedDays = JSON.parse(assignment.cp365_sp_appliestodays) as string[];
        const dayName = format(date, 'EEEE'); // Full day name
        if (!allowedDays.includes(dayName)) {
          // This pattern doesn't apply to this day
          // Try to find next matching pattern
          return getActivePatternForDate(staffMemberId, date);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return assignment;
  } catch (error) {
    console.error('[PatternAssignments] Error getting active pattern:', error);
    throw error;
  }
}

/**
 * Bulk assign a pattern to multiple staff members
 */
export async function bulkAssignPattern(options: BulkAssignmentOptions): Promise<{
  created: StaffPatternAssignment[];
  errors: Array<{ staffMemberId: string; error: string }>;
}> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  const created: StaffPatternAssignment[] = [];
  const errors: Array<{ staffMemberId: string; error: string }> = [];

  // Determine rotation start week for each staff member
  const getRotationStartWeek = (index: number): number => {
    if (options.staggerType === 'same') {
      return 1;
    }
    if (options.staggerType === 'custom' && options.staggerSettings) {
      return options.staggerSettings.get(options.staffMemberIds[index]) || 1;
    }
    if (options.staggerType === 'stagger') {
      // Fetch pattern to get rotation cycle weeks
      // For now, just alternate 1 and 2
      return (index % 2) + 1;
    }
    return 1;
  };

  for (let i = 0; i < options.staffMemberIds.length; i++) {
    const staffMemberId = options.staffMemberIds[i];

    try {
      const assignment = await createPatternAssignment({
        staffMemberId,
        patternTemplateId: options.patternTemplateId,
        startDate: options.startDate,
        endDate: options.endDate,
        rotationStartWeek: getRotationStartWeek(i),
        priority: 1,
        overridePublishStatus: options.overridePublishStatus,
        publishStatus: options.publishStatus,
      });

      created.push(assignment);
    } catch (error) {
      errors.push({
        staffMemberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { created, errors };
}

/**
 * Update the last generated date for an assignment
 */
export async function updateLastGeneratedDate(id: string, date: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();

    await client.update(ENTITY_SET, id, {
      cp365_sp_lastgenerateddate: date,
    });
  } catch (error) {
    console.error('[PatternAssignments] Error updating last generated date:', error);
    throw error;
  }
}

/**
 * Get all active assignments that need generation
 */
export async function getAssignmentsNeedingGeneration(): Promise<StaffPatternAssignment[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all active assignments
    const assignments = await client.get<StaffPatternAssignment>(ENTITY_SET, {
      filter: `cp365_sp_assignmentstatus eq ${AssignmentStatusEnum.Active} and statecode eq 0 and cp365_sp_startdate le ${today} and (cp365_sp_enddate eq null or cp365_sp_enddate ge ${today})`,
      select: ASSIGNMENT_SELECT,
      expand: ASSIGNMENT_EXPAND,
    });

    // Filter to those that need generation
    // This would need more sophisticated logic based on lastgenerateddate and generationwindow
    // For now, return all active assignments

    return assignments;
  } catch (error) {
    console.error('[PatternAssignments] Error fetching assignments needing generation:', error);
    throw error;
  }
}

/**
 * Parse appliesToDays JSON field
 */
export function parseAppliesToDays(json: string | null | undefined): string[] {
  if (!json) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return (parsed as unknown[]).filter((day): day is string => typeof day === 'string');
    }
    return [];
  } catch {
    return [];
  }
}
