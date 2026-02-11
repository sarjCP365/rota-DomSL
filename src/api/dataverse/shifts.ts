/**
 * Shift API Operations
 * CRUD operations for cp365_shift entity
 */

import { getDataverseClient, isDataverseClientInitialised } from './client';
import type {
  Shift,
  ShiftReference,
  ShiftActivity,
  ShiftViewData,
  SublocationStaffViewData,
  StaffAbsenceLog,
  AbsenceType,
  TimesheetClock,
} from './types';
import { format, addDays } from 'date-fns';
import { ShiftStatus } from './types';
import { fetchStaffContracts, fetchLeaveForDateRange } from './units';
import { getStaffViewDataForSublocation } from './staff';

/**
 * Helper to get expanded ShiftActivity from a shift
 * Dataverse returns expanded properties using SchemaName casing (PascalCase for cp365_shift table)
 */
function getExpandedActivity(shift: Shift): ShiftActivity | null {
  // Dataverse returns expanded navigation properties using SchemaName casing
  // For cp365_shift, this is PascalCase: cp365_ShiftActivity
  const activity = (shift as Record<string, unknown>)['cp365_ShiftActivity'] as
    | ShiftActivity
    | undefined;
  return activity || null;
}

/**
 * Combined rota data - using proper types expected by RotaGrid
 */
export interface RotaGridData {
  shifts: ShiftViewData[];
  staff: SublocationStaffViewData[];
  stats: {
    totalHours: number;
    publishedHours: number;
    agencyHours: number;
    unassignedCount: number;
    publishedCount: number;
    unpublishedCount: number;
  };
  /** Absence types lookup map - key is absence type ID */
  absenceTypes?: Map<string, AbsenceType>;
  /** Shifts from other rotas for staff who work at multiple locations */
  otherRotaShifts?: ShiftViewData[];
}

/**
 * Get shifts for a rota within a date range
 * Returns data in ShiftViewData format expected by RotaGrid
 */
export async function getShiftsForRota(
  rotaId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<ShiftViewData[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Shifts] Dataverse client not initialised');
    return [];
  }

  // If no rotaId, return empty array
  if (!rotaId) {
    return [];
  }

  try {
    const client = getDataverseClient();

    // Format dates for OData filter
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Build the OData filter
    // Only include shifts with status Published (1001) or Unpublished (1009)
    // This excludes other statuses like draft, cancelled, deleted, etc.
    const filterStr = `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr} and (cp365_shiftstatus eq ${ShiftStatus.Published} or cp365_shiftstatus eq ${ShiftStatus.Unpublished})`;

    // Query shift fields needed for the grid display
    // Note: Only include fields that exist on the cp365_shift entity
    // The _cp365_sublocation_value field does NOT exist on cp365_shift
    const shifts = await client.get<Shift>('cp365_shifts', {
      filter: filterStr,
      select: [
        'cp365_shiftid',
        'cp365_shiftname',
        'cp365_shiftdate',
        'cp365_shiftstarttime',
        'cp365_shiftendtime',
        'cp365_shiftstatus',
        '_cp365_staffmember_value',
        '_cp365_rota_value',
        '_cp365_shiftreference_value',
        '_cp365_shiftactivity_value',
        // Role fields for badges
        'cp365_shiftleader',
        'cp365_actup',
        'cp365_overtimeshift',
        'cp365_sleepin',
      ],
      // Expand ShiftActivity to get the activity name and care type for display
      expand: [
        'cp365_ShiftActivity($select=cp365_shiftactivityname,cp365_shiftactivitycaretype,cp365_countstowardscare)',
      ],
      orderby: 'cp365_shiftdate asc,cp365_shiftstarttime asc',
      top: 500,
    });

    // Map to ShiftViewData format expected by RotaGrid
    // Note: Fields that don't exist on the entity are set to default values
    return shifts.map(
      (shift): ShiftViewData => ({
        'Shift ID': shift.cp365_shiftid,
        'Shift Name': shift.cp365_shiftname || '',
        'Shift Date': shift.cp365_shiftdate,
        'Shift Start Time': shift.cp365_shiftstarttime,
        'Shift End Time': shift.cp365_shiftendtime,
        'Shift Status': shift.cp365_shiftstatus || 0,
        'Shift Type': '', // Will be determined by the grid based on time
        'Staff Member ID': shift._cp365_staffmember_value || null,
        'Staff Member Name': '', // Will be populated by getRotaGridData
        'Staff Status': null,
        'Job Title': null,
        'Staff Teams': [],
        'Rota ID': shift._cp365_rota_value || '',
        'Rota Name': '',
        'Rota Start Date': null,
        'Sublocation ID': '', // Not directly on shift entity
        'Sublocation Name': '',
        'Sublocation Visible From': null,
        'Sublocation Visible To': null,
        'Shift Reference': shift._cp365_shiftreference_value || null,
        'Shift Reference Name': null,
        'Shift Reference Start Hour': null,
        'Shift Reference Start Minute': null,
        'Shift Reference End Hour': null,
        'Shift Reference End Minute': null,
        'Shift Reference Sleep In': false,
        'Shift Reference End On Next Day': false,
        'Shift Reference Sleep In Start Hour': null,
        'Shift Reference Sleep In Start Minute': null,
        'Shift Reference Sleep In End Hour': null,
        'Shift Reference Sleep In End Minute': null,
        // Shift Activity - populated from expanded cp365_ShiftActivity
        // Note: Dataverse returns expanded properties using SchemaName casing (PascalCase for cp365_shift)
        'Shift Activity': getExpandedActivity(shift)?.cp365_shiftactivityname || null,
        'Shift Activity Care Type': getExpandedActivity(shift)?.cp365_shiftactivitycaretype || null,
        'Counts Towards Care': getExpandedActivity(shift)?.cp365_countstowardscare === 1,
        'Shift Pattern ID': null,
        'Shift Pattern Name': null,
        'Shift Pattern Type': null,
        'Shift Pattern Working Days': null,
        'Shift Pattern Resting Days': null,
        'Shift Pattern Daily Skip': null,
        'Shift Pattern Weekly Skip': null,
        'Pattern Day Selected Monday': false,
        'Pattern Day Selected Tuesday': false,
        'Pattern Day Selected Wednesday': false,
        'Pattern Day Selected Thursday': false,
        'Pattern Day Selected Friday': false,
        'Pattern Day Selected Saturday': false,
        'Pattern Day Selected Sunday': false,
        'Bulk Pattern': false,
        'Bulk Pattern Start Time': null,
        'Bulk Pattern End Time': null,
        'Shift Pattern Activity': null,
        'Overtime Shift': shift.cp365_overtimeshift || false,
        'Community Hours': 0,
        'Community Hours Note': null,
        'Community Hours Owner': null,
        'Community Hours Last Edit': null,
        'Shift Break Duration': shift.cr1e2_shiftbreakduration || 0,
        'Sleep In': shift.cp365_sleepin || false,
        'Sleep In Start Hour': null,
        'Sleep In Start Minute': null,
        'Sleep In End Hour': null,
        'Sleep In End Minute': null,
        'Shift Leader': shift.cp365_shiftleader || false,
        'Act Up': shift.cp365_actup || false,
        Senior: false,
        'Allow Shift Clashes': false,
        'Contract End Date': null,
        'End on the following day': false,
        Department: null,
        'Shift Setup Type': null,
      })
    );
  } catch (error) {
    console.error('[Shifts] Error fetching shifts:', error);
    throw error;
  }
}

// Keep the old function name for backwards compatibility but delegate to the new one
export async function getShiftsForSublocation(
  _sublocationId: string, // Unused - shifts are linked to rota, not sublocation
  startDate: Date,
  endDate: Date,
  rotaId?: string
): Promise<ShiftViewData[]> {
  // Shifts are actually linked to Rota, not Sublocation
  // If no rotaId, return empty (we need a rota to get shifts)
  return getShiftsForRota(rotaId, startDate, endDate);
}

/**
 * Get shifts from OTHER rotas for specified staff members
 * This is used to show "dual home" shifts - where staff work at multiple locations
 *
 * @param excludeRotaId - The current rota ID to EXCLUDE from results
 * @param staffMemberIds - Array of staff member IDs to fetch shifts for
 * @param startDate - Start date for the date range
 * @param endDate - End date for the date range
 * @returns Array of shifts from other rotas, with isFromOtherRota flag set
 */
export async function getShiftsFromOtherRotas(
  excludeRotaId: string,
  staffMemberIds: string[],
  startDate: Date,
  endDate: Date
): Promise<ShiftViewData[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Shifts] Dataverse client not initialised');
    return [];
  }

  // If no staff IDs, return empty array
  if (!staffMemberIds || staffMemberIds.length === 0) {
    return [];
  }

  try {
    const client = getDataverseClient();

    // Format dates for OData filter
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Build staff member OR clause instead of IN clause
    // NOTE: Dataverse OData does NOT support the 'in' operator!
    // We must use multiple 'or' conditions: (_cp365_staffmember_value eq 'guid1' or _cp365_staffmember_value eq 'guid2' ...)
    const BATCH_SIZE = 30; // Limit batch size to avoid overly long filter strings
    const allShifts: Array<
      Shift & { cp365_Rota?: { cp365_rotaname?: string; cp365_rotaid?: string } }
    > = [];

    // Process staff IDs in batches to avoid filter length limits
    for (let i = 0; i < staffMemberIds.length; i += BATCH_SIZE) {
      const batchIds = staffMemberIds.slice(i, i + BATCH_SIZE);
      const staffOrClause = batchIds
        .map((id) => `_cp365_staffmember_value eq '${id}'`)
        .join(' or ');

      // Build the OData filter:
      // - Exclude the current rota (ne = not equal)
      // - Date range filter
      // - Staff member must be in our list (using OR clauses)
      // - Only published/unpublished shifts
      const filterStr = `_cp365_rota_value ne '${excludeRotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr} and (${staffOrClause}) and (cp365_shiftstatus eq ${ShiftStatus.Published} or cp365_shiftstatus eq ${ShiftStatus.Unpublished})`;

      // Query shifts with rota expansion to get the rota name
      // Using PascalCase for expand as per schema: cp365_Rota
      const batchShifts = await client.get<
        Shift & { cp365_Rota?: { cp365_rotaname?: string; cp365_rotaid?: string } }
      >('cp365_shifts', {
        filter: filterStr,
        select: [
          'cp365_shiftid',
          'cp365_shiftname',
          'cp365_shiftdate',
          'cp365_shiftstarttime',
          'cp365_shiftendtime',
          'cp365_shiftstatus',
          '_cp365_staffmember_value',
          '_cp365_rota_value',
          '_cp365_shiftreference_value',
          'cp365_shiftleader',
          'cp365_actup',
          'cp365_overtimeshift',
          'cp365_sleepin',
        ],
        expand: ['cp365_Rota($select=cp365_rotaid,cp365_rotaname)'],
        orderby: 'cp365_shiftdate asc,cp365_shiftstarttime asc',
        top: 500,
      });

      allShifts.push(...batchShifts);
    }

    const shifts = allShifts;

    // Map to ShiftViewData format with isFromOtherRota flag
    return shifts.map(
      (shift): ShiftViewData => ({
        'Shift ID': shift.cp365_shiftid,
        'Shift Name': shift.cp365_shiftname || '',
        'Shift Date': shift.cp365_shiftdate,
        'Shift Start Time': shift.cp365_shiftstarttime,
        'Shift End Time': shift.cp365_shiftendtime,
        'Shift Status': shift.cp365_shiftstatus || 0,
        'Shift Type': '',
        'Staff Member ID': shift._cp365_staffmember_value || null,
        'Staff Member Name': '',
        'Staff Status': null,
        'Job Title': null,
        'Staff Teams': [],
        'Rota ID': shift._cp365_rota_value || '',
        'Rota Name': shift.cp365_Rota?.cp365_rotaname || 'Other Rota',
        'Rota Start Date': null,
        'Sublocation ID': '',
        'Sublocation Name': '',
        'Sublocation Visible From': null,
        'Sublocation Visible To': null,
        'Shift Reference': shift._cp365_shiftreference_value || null,
        'Shift Reference Name': null,
        'Shift Reference Start Hour': null,
        'Shift Reference Start Minute': null,
        'Shift Reference End Hour': null,
        'Shift Reference End Minute': null,
        'Shift Reference Sleep In': false,
        'Shift Reference End On Next Day': false,
        'Shift Reference Sleep In Start Hour': null,
        'Shift Reference Sleep In Start Minute': null,
        'Shift Reference Sleep In End Hour': null,
        'Shift Reference Sleep In End Minute': null,
        'Shift Activity': null,
        'Shift Activity Care Type': null,
        'Counts Towards Care': false,
        'Shift Pattern ID': null,
        'Shift Pattern Name': null,
        'Shift Pattern Type': null,
        'Shift Pattern Working Days': null,
        'Shift Pattern Resting Days': null,
        'Shift Pattern Daily Skip': null,
        'Shift Pattern Weekly Skip': null,
        'Pattern Day Selected Monday': false,
        'Pattern Day Selected Tuesday': false,
        'Pattern Day Selected Wednesday': false,
        'Pattern Day Selected Thursday': false,
        'Pattern Day Selected Friday': false,
        'Pattern Day Selected Saturday': false,
        'Pattern Day Selected Sunday': false,
        'Bulk Pattern': false,
        'Bulk Pattern Start Time': null,
        'Bulk Pattern End Time': null,
        'Shift Pattern Activity': null,
        'Overtime Shift': shift.cp365_overtimeshift || false,
        'Community Hours': 0,
        'Community Hours Note': null,
        'Community Hours Owner': null,
        'Community Hours Last Edit': null,
        'Shift Break Duration': 0,
        'Sleep In': shift.cp365_sleepin || false,
        'Sleep In Start Hour': null,
        'Sleep In Start Minute': null,
        'Sleep In End Hour': null,
        'Sleep In End Minute': null,
        'Shift Leader': shift.cp365_shiftleader || false,
        'Act Up': shift.cp365_actup || false,
        Senior: false,
        'Allow Shift Clashes': false,
        'Contract End Date': null,
        'End on the following day': false,
        Department: null,
        'Shift Setup Type': null,
        // Mark as from another rota for visual differentiation
        isFromOtherRota: true,
      })
    );
  } catch (error) {
    console.error('[Shifts] Error fetching shifts from other rotas:', error);
    // Don't throw - just return empty array so main rota still works
    return [];
  }
}

/**
 * Get staff view data for a sublocation (for rota grid).
 *
 * @deprecated This function is now a thin wrapper around getStaffViewDataForSublocation
 * from the staff module. Use that function directly for new code.
 *
 * @see {@link import('./staff').getStaffViewDataForSublocation}
 */
async function getStaffForSublocationInternal(
  sublocationId: string
): Promise<SublocationStaffViewData[]> {
  return getStaffViewDataForSublocation(sublocationId);
}

/**
 * Fetch all absence types for lookup
 */
export async function fetchAbsenceTypes(): Promise<Map<string, AbsenceType>> {
  if (!isDataverseClientInitialised()) {
    return new Map();
  }

  try {
    const client = getDataverseClient();
    const types = await client.get<AbsenceType>('cp365_absencetypes', {
      select: ['cp365_absencetypeid', 'cp365_absencetypename'],
      orderby: 'cp365_absencetypename asc',
    });

    const map = new Map<string, AbsenceType>();
    for (const t of types) {
      map.set(t.cp365_absencetypeid, t);
    }
    return map;
  } catch (error) {
    console.error('[Shifts] Error fetching absence types:', error);
    return new Map();
  }
}

/**
 * Get complete rota data for the grid
 * @param sublocationId - The sublocation to fetch data for
 * @param startDate - Start date for the date range
 * @param duration - Number of days to fetch
 * @param rotaId - Optional rota ID to filter shifts
 * @param showExternalStaff - When true, include shifts for staff from other sublocations (marked as external)
 * @param showOtherRotaShifts - When true, also fetch shifts from other rotas for the same staff (dual home)
 */
export async function getRotaGridData(
  sublocationId: string,
  startDate: Date,
  duration: number,
  rotaId?: string,
  showExternalStaff: boolean = false,
  showOtherRotaShifts: boolean = false
): Promise<RotaGridData> {
  const endDate = addDays(startDate, duration - 1);

  // Fetch shifts, staff, and absence types in parallel
  // Note: Shifts require a rotaId - if no rota exists, we'll get 0 shifts
  const [allShifts, staffWithoutContracts, absenceTypes] = await Promise.all([
    getShiftsForRota(rotaId, startDate, endDate),
    getStaffForSublocationInternal(sublocationId),
    fetchAbsenceTypes(),
  ]);

  // Get staff IDs for subsequent queries
  const staffIds = staffWithoutContracts
    .map((s) => s['Staff Member ID'])
    .filter((id): id is string => !!id);

  // Fetch contracted hours and leave data for staff members
  const [contractedHoursMap, leaveData] = await Promise.all([
    fetchStaffContracts(staffIds),
    fetchLeaveForDateRange(staffIds, startDate, endDate),
  ]);

  // Group leave by staff member
  const leaveByStaff = new Map<string, StaffAbsenceLog[]>();
  for (const leave of leaveData) {
    const staffId = leave._cp365_staffmember_value;
    if (!leaveByStaff.has(staffId)) {
      leaveByStaff.set(staffId, []);
    }
    leaveByStaff.get(staffId)!.push(leave);
  }

  // Merge contracted hours and leave data into staff data
  const staff = staffWithoutContracts.map((s) => ({
    ...s,
    'Contracted Hours': contractedHoursMap.get(s['Staff Member ID']) ?? null,
    Leave: leaveByStaff.get(s['Staff Member ID']) || [],
  }));

  // Create a Set of staff IDs for this sublocation for efficient lookup
  // IMPORTANT: Filter out null/undefined IDs to ensure accurate filtering
  const sublocationStaffIds = new Set(
    staff.map((s) => s['Staff Member ID']).filter((id): id is string => !!id) // Remove null/undefined
  );

  // Create a map of staff names using string keys (only for valid IDs)
  const staffMap = new Map(
    staff
      .filter((s) => !!s['Staff Member ID'])
      .map((s) => [s['Staff Member ID'], s['Staff Member Name']])
  );

  // Process shifts based on showExternalStaff flag
  // When showExternalStaff is true, include all shifts but mark external ones
  // When false, only include shifts for staff in this sublocation or unassigned
  const processedShifts: ShiftViewData[] = [];

  for (const shift of allShifts) {
    const staffMemberId = shift['Staff Member ID'];
    const isUnassigned = !staffMemberId;
    const isInSublocation = staffMemberId ? sublocationStaffIds.has(staffMemberId) : false;
    const isExternal = staffMemberId && !isInSublocation;

    // Include shift if: unassigned OR in sublocation OR (showExternalStaff is true)
    if (isUnassigned || isInSublocation || showExternalStaff) {
      processedShifts.push({
        ...shift,
        'Staff Member Name': staffMemberId
          ? staffMap.get(staffMemberId) || shift['Staff Member Name'] || ''
          : '',
        'Is External Staff': isExternal || undefined, // Only set if true
      });
    }
  }

  const shiftsWithNames = processedShifts;

  // Calculate stats on filtered shifts only
  const stats = calculateShiftStats(shiftsWithNames);

  // Fetch shifts from other rotas if enabled
  let otherRotaShifts: ShiftViewData[] = [];
  if (showOtherRotaShifts && rotaId && staffIds.length > 0) {
    otherRotaShifts = await getShiftsFromOtherRotas(rotaId, staffIds, startDate, endDate);

    // Populate staff names for other rota shifts
    otherRotaShifts = otherRotaShifts.map((shift) => ({
      ...shift,
      'Staff Member Name': shift['Staff Member ID']
        ? staffMap.get(shift['Staff Member ID']) || shift['Staff Member Name'] || ''
        : '',
    }));
  }

  return {
    shifts: shiftsWithNames,
    staff,
    stats,
    absenceTypes,
    otherRotaShifts: otherRotaShifts.length > 0 ? otherRotaShifts : undefined,
  };
}

/**
 * Calculate statistics from shifts
 */
function calculateShiftStats(shifts: ShiftViewData[]) {
  let totalHours = 0;
  let publishedHours = 0;
  const agencyHours = 0; // Placeholder - would need additional data for agency tracking
  let unassignedCount = 0;
  let publishedCount = 0;
  let unpublishedCount = 0;

  for (const shift of shifts) {
    // Calculate hours
    const startTime = shift['Shift Start Time'];
    const endTime = shift['Shift End Time'];
    const isPublished = shift['Shift Status'] === ShiftStatus.Published;

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // Handle overnight shifts (negative hours means shift crosses midnight)
      if (hours < 0) {
        hours += 24;
      }

      const breakHours = (shift['Shift Break Duration'] || 0) / 60;
      const shiftHours = Math.max(0, hours - breakHours);

      totalHours += shiftHours;

      // Only count published hours for dashboard display
      if (isPublished) {
        publishedHours += shiftHours;
      }

      // Note: Agency tracking removed as 'Agency Worker' doesn't exist on ShiftViewData
      // agencyHours tracking would require additional data
    }

    // Count unassigned - check for any falsy value (null, undefined, '', 0, false)
    // This matches the logic in RotaSummaryGrid: shift['Staff Member ID'] || 'unassigned'
    const staffId = shift['Staff Member ID'];
    const isUnassigned = !staffId;
    if (isUnassigned) {
      unassignedCount++;
    }

    // Count published/unpublished (1001 = Published, 1009 = Unpublished)
    if (isPublished) {
      publishedCount++;
    } else {
      unpublishedCount++;
    }
  }

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    publishedHours: Math.round(publishedHours * 10) / 10,
    agencyHours: Math.round(agencyHours * 10) / 10,
    unassignedCount,
    publishedCount,
    unpublishedCount,
  };
}

// ============================================
// CRUD Operations (required by useShifts hook)
// ============================================

/**
 * Get shifts for a rota within a date range
 */
export async function getShifts(rotaId: string, startDate: Date, endDate: Date): Promise<Shift[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  const client = getDataverseClient();
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  return client.get<Shift>('cp365_shifts', {
    filter: `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr}`,
    orderby: 'cp365_shiftdate asc,cp365_shiftstarttime asc',
  });
}

/**
 * Get a single shift by ID with all details
 * Note: Only request fields that exist in the actual Dataverse schema
 */
export async function getShiftById(shiftId: string): Promise<Shift | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();

    // Fetch shift with all fields needed for the edit flyout
    // Note: _cp365_unit_value and cp365_senior do NOT exist on cp365_shift entity
    const shift = await client.getById<Shift>('cp365_shifts', shiftId, {
      select: [
        // Core fields
        'cp365_shiftid',
        'cp365_shiftname',
        'cp365_shiftdate',
        'cp365_shiftstarttime',
        'cp365_shiftendtime',
        'cp365_shiftstatus',
        // Lookup references
        '_cp365_staffmember_value',
        '_cp365_rota_value',
        '_cp365_shiftreference_value',
        '_cp365_shiftactivity_value',
        // Break and hours (note: break duration has different publisher prefix)
        'cr1e2_shiftbreakduration',
        'cp365_communityhours',
        // Boolean options (checkboxes)
        'cp365_overtimeshift',
        'cp365_sleepin',
        'cp365_shiftleader',
        'cp365_actup',
      ],
    });

    return shift;
  } catch (error) {
    console.error('[Shifts] Failed to fetch shift:', error);
    return null;
  }
}

/**
 * Create a new shift
 */
export async function createShift(data: Partial<Shift>): Promise<Shift> {
  const client = getDataverseClient();
  return client.create<Shift>('cp365_shifts', data);
}

/**
 * Update an existing shift
 */
export async function updateShift(shiftId: string, data: Partial<Shift>): Promise<void> {
  const client = getDataverseClient();
  await client.update<Shift>('cp365_shifts', shiftId, data);
}

/**
 * Delete a shift
 */
export async function deleteShift(shiftId: string): Promise<void> {
  const client = getDataverseClient();
  await client.delete('cp365_shifts', shiftId);
}

/**
 * Publish multiple shifts
 */
export async function publishShifts(shiftIds: string[]): Promise<void> {
  const client = getDataverseClient();
  for (const shiftId of shiftIds) {
    await client.update<Shift>('cp365_shifts', shiftId, {
      cp365_shiftstatus: ShiftStatus.Published,
    });
  }
}

/**
 * Unpublish multiple shifts
 */
export async function unpublishShifts(shiftIds: string[]): Promise<void> {
  const client = getDataverseClient();
  for (const shiftId of shiftIds) {
    await client.update<Shift>('cp365_shifts', shiftId, {
      cp365_shiftstatus: ShiftStatus.Unpublished,
    });
  }
}

/**
 * Unassign staff from a shift
 */
export async function unassignShift(shiftId: string): Promise<void> {
  const client = getDataverseClient();
  await client.update<Shift>('cp365_shifts', shiftId, {
    _cp365_staffmember_value: null,
  } as Partial<Shift>);
}

/**
 * Get shift references for a location/sublocation
 * If both locationId and sublocationId are provided, it will try sublocation first,
 * then fall back to location, then to all references if nothing found.
 */
export async function getShiftReferences(
  sublocationId?: string,
  locationId?: string
): Promise<ShiftReference[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  const client = getDataverseClient();

  // Strategy: Try sublocation first, then location, then all
  // This handles cases where references are linked at different levels

  // Try sublocation filter first (most specific)
  if (sublocationId) {
    try {
      const sublocationResults = await client.get<ShiftReference>('cp365_shiftreferences', {
        filter: `_cp365_sublocation_value eq '${sublocationId}'`,
        orderby: 'cp365_shiftreferencename asc',
      });

      if (sublocationResults.length > 0) {
        return sublocationResults;
      }
    } catch (error) {
      console.error('[ShiftReferences] Error fetching sublocation refs:', error);
    }
  }

  // Try location filter (less specific)
  if (locationId) {
    try {
      const locationResults = await client.get<ShiftReference>('cp365_shiftreferences', {
        filter: `_cp365_location_value eq '${locationId}'`,
        orderby: 'cp365_shiftreferencename asc',
      });

      if (locationResults.length > 0) {
        return locationResults;
      }
    } catch (error) {
      console.error('[ShiftReferences] Error fetching location refs:', error);
    }
  }

  // Fall back to all references (for global/unlinked references)
  try {
    const allResults = await client.get<ShiftReference>('cp365_shiftreferences', {
      orderby: 'cp365_shiftreferencename asc',
    });

    return allResults;
  } catch (error) {
    console.error('[ShiftReferences] Error fetching all refs:', error);
    return [];
  }
}

/**
 * Get all shift activities
 */
export async function getShiftActivities(): Promise<ShiftActivity[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  const client = getDataverseClient();
  return client.get<ShiftActivity>('cp365_shiftactivities', {
    orderby: 'cp365_shiftactivityname asc',
  });
}

/**
 * Get total count of unpublished shifts across ALL rotas (no location/date filter)
 * This is used for dashboard comparison metrics
 */
export async function getTotalUnpublishedCount(): Promise<number> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Shifts] Dataverse client not initialised for total unpublished count');
    return 0;
  }

  try {
    const client = getDataverseClient();

    // Query all unpublished shifts (status = 1009)
    // Only select the ID to minimise data transfer
    const unpublishedShifts = await client.get<Shift>('cp365_shifts', {
      filter: `cp365_shiftstatus eq ${ShiftStatus.Unpublished}`,
      select: ['cp365_shiftid'],
    });

    return unpublishedShifts.length;
  } catch (error) {
    console.error('[Shifts] Error fetching total unpublished count:', error);
    return 0;
  }
}

/**
 * Unpublished shift with expanded details for the management page
 */
export interface UnpublishedShiftDetails {
  cp365_shiftid: string;
  cp365_shiftname: string;
  cp365_shiftdate: string;
  cp365_shiftstarttime: string;
  cp365_shiftendtime: string;
  cp365_shiftstatus: number;
  _cp365_staffmember_value: string | null;
  _cp365_rota_value: string | null;
  _cp365_shiftreference_value: string | null;
  // Expanded navigation properties
  cp365_StaffMember?: {
    cp365_staffmemberid: string;
    cp365_forename: string;
    cp365_surname: string;
  };
  cp365_Rota?: {
    cp365_rotaid: string;
    cp365_rotaname: string;
    cp365_Sublocation?: {
      cp365_sublocationid: string;
      cp365_sublocationname: string;
      cp365_Location?: {
        cp365_locationid: string;
        cp365_locationname: string;
      };
    };
  };
  cp365_ShiftReference?: {
    cp365_shiftreferenceid: string;
    cp365_shiftreferencename: string;
  };
}

/**
 * Filter options for unpublished shifts
 */
export interface UnpublishedShiftsFilter {
  locationId?: string;
  sublocationId?: string;
  staffMemberId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

/**
 * Get all unpublished shifts with details for the management page
 * Supports filtering by location, sublocation, staff member, and date range
 */
export async function getAllUnpublishedShifts(
  filters?: UnpublishedShiftsFilter
): Promise<UnpublishedShiftDetails[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Shifts] Dataverse client not initialised');
    return [];
  }

  try {
    const client = getDataverseClient();

    // Build filter conditions
    const filterConditions: string[] = [`cp365_shiftstatus eq ${ShiftStatus.Unpublished}`];

    if (filters?.locationId) {
      // Filter by location via rota -> sublocation -> location
      filterConditions.push(
        `cp365_Rota/cp365_Sublocation/_cp365_location_value eq '${filters.locationId}'`
      );
    }

    if (filters?.sublocationId) {
      filterConditions.push(`cp365_Rota/_cp365_sublocation_value eq '${filters.sublocationId}'`);
    }

    if (filters?.staffMemberId) {
      filterConditions.push(`_cp365_staffmember_value eq '${filters.staffMemberId}'`);
    }

    if (filters?.dateFrom) {
      filterConditions.push(`cp365_shiftdate ge ${format(filters.dateFrom, 'yyyy-MM-dd')}`);
    }

    if (filters?.dateTo) {
      filterConditions.push(`cp365_shiftdate le ${format(filters.dateTo, 'yyyy-MM-dd')}`);
    }

    const filterString = filterConditions.join(' and ');

    const shifts = await client.get<UnpublishedShiftDetails>('cp365_shifts', {
      filter: filterString,
      select: [
        'cp365_shiftid',
        'cp365_shiftname',
        'cp365_shiftdate',
        'cp365_shiftstarttime',
        'cp365_shiftendtime',
        'cp365_shiftstatus',
        '_cp365_staffmember_value',
        '_cp365_rota_value',
        '_cp365_shiftreference_value',
      ],
      expand: [
        'cp365_StaffMember($select=cp365_staffmemberid,cp365_forename,cp365_surname)',
        'cp365_Rota($select=cp365_rotaid,cp365_rotaname;$expand=cp365_Sublocation($select=cp365_sublocationid,cp365_sublocationname;$expand=cp365_Location($select=cp365_locationid,cp365_locationname)))',
        'cp365_ShiftReference($select=cp365_shiftreferenceid,cp365_shiftreferencename)',
      ],
      orderby: 'cp365_shiftdate asc, cp365_shiftstarttime asc',
    });

    // Apply search term filter in memory (for staff name search)
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      return shifts.filter((shift) => {
        const staffName = shift.cp365_StaffMember
          ? `${shift.cp365_StaffMember.cp365_forename} ${shift.cp365_StaffMember.cp365_surname}`.toLowerCase()
          : 'unassigned';
        const locationName =
          shift.cp365_Rota?.cp365_Sublocation?.cp365_Location?.cp365_locationname?.toLowerCase() ||
          '';
        const sublocationName =
          shift.cp365_Rota?.cp365_Sublocation?.cp365_sublocationname?.toLowerCase() || '';
        const shiftRefName =
          shift.cp365_ShiftReference?.cp365_shiftreferencename?.toLowerCase() || '';

        return (
          staffName.includes(term) ||
          locationName.includes(term) ||
          sublocationName.includes(term) ||
          shiftRefName.includes(term)
        );
      });
    }

    return shifts;
  } catch (error) {
    console.error('[Shifts] Error fetching unpublished shifts:', error);
    throw error;
  }
}

/**
 * Bulk create multiple shifts with concurrency limiting.
 *
 * Uses parallel creation with a configurable concurrency pool to balance
 * performance against Dataverse API throttling limits.
 * Dataverse allows ~6,000 requests per 5-minute window per user;
 * a concurrency of 5 keeps well within limits while completing quickly.
 *
 * @param shifts - Array of partial Shift objects to create
 * @param options - Concurrency and progress callback options
 * @returns Summary of successes, failures, and error messages
 */
export async function bulkCreateShifts(
  shifts: Array<Partial<Shift>>,
  options?: {
    /** Max parallel requests (default: 5) */
    concurrency?: number;
    /** Progress callback: (completed, total) */
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<{ success: number; failed: number; errors: string[] }> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  const client = getDataverseClient();
  const concurrency = options?.concurrency ?? 5;
  const total = shifts.length;
  let completed = 0;
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process shifts in a concurrency-limited pool
  const queue = [...shifts];

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const shiftData = queue.shift()!;
      try {
        await client.create<Shift>('cp365_shifts', shiftData);
        success++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(message);
        console.error('[Shifts] Failed to create shift in bulk:', error);
      }
      completed++;
      options?.onProgress?.(completed, total);
    }
  }

  // Launch concurrent workers
  const workers = Array.from({ length: Math.min(concurrency, total) }, () => processNext());
  await Promise.all(workers);

  return { success, failed, errors };
}

/**
 * Bulk delete multiple shifts
 */
export async function bulkDeleteShifts(
  shiftIds: string[]
): Promise<{ success: number; failed: number }> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  const client = getDataverseClient();
  let success = 0;
  let failed = 0;

  for (const shiftId of shiftIds) {
    try {
      await client.delete('cp365_shifts', shiftId);
      success++;
    } catch (error) {
      console.error(`[Shifts] Failed to delete shift ${shiftId}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

// =============================================================================
// TIMESHEET CLOCKS
// =============================================================================

/**
 * Fetch timesheet clock records for a date range.
 *
 * Queries cp365_timesheetclocks filtered by submitted start time falling within
 * the given date range. Returns raw clock records that can be matched to shifts.
 *
 * NOTE: If the logical column names differ in your environment, update the
 * $select and $filter values below. Use the DataverseSchemaExporter
 * (docs/templates/) to verify exact names.
 */
export async function getTimesheetClocks(
  startDate: Date,
  endDate: Date
): Promise<TimesheetClock[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[TimesheetClocks] Dataverse client not initialised');
    return [];
  }

  const client = getDataverseClient();
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  console.warn(`[TimesheetClocks] Fetching clocks for ${startStr} to ${endStr}`);

  // Try with shift lookup first; fall back without it if the column doesn't exist
  const baseSelect = [
    'cp365_timesheetclockid',
    'cp365_submittedstarttime',
    'cp365_submittedendtime',
    '_cp365_staffmember_value',
  ];

  const filter =
    `cp365_submittedstarttime ge ${startStr}T00:00:00Z` +
    ` and cp365_submittedstarttime lt ${endStr}T23:59:59Z`;

  try {
    // First attempt: include shift lookup
    const clocks = await client.get<TimesheetClock>('cp365_timesheetclocks', {
      select: [...baseSelect, '_cp365_shift_value'],
      filter,
      orderby: 'cp365_submittedstarttime asc',
    });

    console.warn(`[TimesheetClocks] Fetched ${clocks.length} clock records (with shift lookup)`);
    return clocks;
  } catch (firstError) {
    console.warn(
      '[TimesheetClocks] Query with _cp365_shift_value failed, retrying without it:',
      firstError instanceof Error ? firstError.message : firstError
    );

    try {
      // Second attempt: without shift lookup (column may not exist)
      const clocks = await client.get<TimesheetClock>('cp365_timesheetclocks', {
        select: baseSelect,
        filter,
        orderby: 'cp365_submittedstarttime asc',
      });

      console.warn(
        `[TimesheetClocks] Fetched ${clocks.length} clock records (without shift lookup)`
      );
      return clocks;
    } catch (secondError) {
      console.error('[TimesheetClocks] Failed to fetch timesheet clocks:', secondError);
      return [];
    }
  }
}

/**
 * Merge timesheet clock data into shift view data.
 *
 * Matching strategy (in priority order):
 *  1. Direct shift lookup (_cp365_shift_value matches Shift ID) — most reliable
 *  2. Staff member + same calendar date — fallback when no shift lookup exists
 *
 * If multiple clock records match a shift, the earliest clock-in is used
 * (guards against duplicate entries).
 */
export function mergeClockDataIntoShifts(
  shifts: ShiftViewData[],
  clocks: TimesheetClock[]
): ShiftViewData[] {
  if (clocks.length === 0) return shifts;

  // Normalise GUID to lowercase for case-insensitive matching
  const norm = (guid: string | null | undefined): string => guid?.toLowerCase().trim() ?? '';

  // Index clocks by shift ID for fast O(1) lookup
  const clockByShiftId = new Map<string, TimesheetClock>();
  // Index clocks by staff+date for fallback matching
  const clockByStaffDate = new Map<string, TimesheetClock>();

  for (const clock of clocks) {
    // Index by shift lookup (priority match)
    const shiftRef = norm(clock._cp365_shift_value);
    if (shiftRef) {
      const existing = clockByShiftId.get(shiftRef);
      if (
        !existing ||
        (clock.cp365_submittedstarttime &&
          (!existing.cp365_submittedstarttime ||
            clock.cp365_submittedstarttime < existing.cp365_submittedstarttime))
      ) {
        clockByShiftId.set(shiftRef, clock);
      }
    }

    // Index by staff member + date (fallback match)
    const staffRef = norm(clock._cp365_staffmember_value);
    if (staffRef && clock.cp365_submittedstarttime) {
      const clockDate = clock.cp365_submittedstarttime.substring(0, 10); // 'yyyy-MM-dd'
      const key = `${staffRef}|${clockDate}`;
      const existing = clockByStaffDate.get(key);
      if (
        !existing ||
        (clock.cp365_submittedstarttime &&
          (!existing.cp365_submittedstarttime ||
            clock.cp365_submittedstarttime < existing.cp365_submittedstarttime))
      ) {
        clockByStaffDate.set(key, clock);
      }
    }
  }

  let matched = 0;
  let unmatched = 0;

  const result = shifts.map((shift) => {
    const shiftId = norm(shift['Shift ID']);
    const staffId = norm(shift['Staff Member ID']);
    const shiftDate = shift['Shift Date']?.substring(0, 10) ?? '';

    // Priority 1: Match by shift lookup
    let matchedClock = clockByShiftId.get(shiftId);

    // Priority 2: Match by staff member + date
    if (!matchedClock && staffId && shiftDate) {
      matchedClock = clockByStaffDate.get(`${staffId}|${shiftDate}`);
    }

    if (!matchedClock) {
      unmatched++;
      return shift;
    }

    matched++;
    return {
      ...shift,
      'Clocked In': matchedClock.cp365_submittedstarttime || null,
      'Clocked Out': matchedClock.cp365_submittedendtime || null,
    };
  });

  console.warn(
    `[TimesheetClocks] Merge complete: ${matched} matched, ${unmatched} unmatched ` +
      `(${clocks.length} clock records, ${shifts.length} shifts, ` +
      `${clockByShiftId.size} indexed by shift, ${clockByStaffDate.size} indexed by staff+date)`
  );

  // Log a sample clock for debugging if no matches occurred
  if (matched === 0 && clocks.length > 0 && shifts.length > 0) {
    const sampleClock = clocks[0];
    const sampleShift = shifts[0];
    console.warn(
      '[TimesheetClocks] No matches found. Sample data for debugging:\n' +
        `  Clock: staff=${sampleClock._cp365_staffmember_value}, ` +
        `shift=${sampleClock._cp365_shift_value}, ` +
        `start=${sampleClock.cp365_submittedstarttime}\n` +
        `  Shift: id=${sampleShift['Shift ID']}, ` +
        `staff=${sampleShift['Staff Member ID']}, ` +
        `date=${sampleShift['Shift Date']}`
    );
  }

  return result;
}
