/**
 * Unit API Operations
 * CRUD operations for cp365_unit entity
 * 
 * Units represent organizational groupings within a location (e.g., Dementia Unit, Ward A)
 * Teams can be assigned to units, and shifts can optionally be assigned to units
 */

import { getDataverseClient, isDataverseClientInitialised } from './client';
import type { 
  Unit, 
  StaffTeam, 
  UnitWithStats, 
  TeamWithStats, 
  StaffMemberWithShifts,
  Shift,
  StaffMember,
  StaffAbsenceLog,
  HierarchicalRotaData,
  UnitWithTeams,
  TeamWithStaff,
  StaffWithShifts,
  RotaStats,
  Capability,
} from './types';
import { StateCode, ShiftStatus } from './types';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';

// =============================================================================
// UNIT CRUD OPERATIONS
// =============================================================================

/**
 * Get all active units for a location
 */
export async function getUnitsByLocation(locationId: string): Promise<Unit[]> {
  console.log('[Units] getUnitsByLocation called for locationId:', locationId);
  
  if (!isDataverseClientInitialised()) {
    console.warn('[Units] Dataverse client not initialised - returning empty array');
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[Units] Fetching units from Dataverse...');
    
    const units = await client.get<Unit>('cp365_units', {
      filter: `_cp365_location_value eq '${locationId}' and statecode eq ${StateCode.Active}`,
      select: [
        'cp365_unitid',
        'cp365_unitname',
        'statecode',
        '_cp365_location_value',
      ],
      orderby: 'cp365_unitname asc',
    });
    
    console.log('[Units] Fetched units:', units.length);
    if (units.length > 0) {
      console.log('[Units] First unit:', units[0]);
    }
    
    return units;
  } catch (error) {
    console.error('[Units] Error fetching units:', error);
    throw error;
  }
}

/**
 * Get all active units (across all locations)
 */
export async function getAllUnits(): Promise<Unit[]> {
  console.log('[Units] getAllUnits called');
  
  if (!isDataverseClientInitialised()) {
    console.warn('[Units] Dataverse client not initialised - returning empty array');
    return [];
  }

  try {
    const client = getDataverseClient();
    
    const units = await client.get<Unit>('cp365_units', {
      filter: `statecode eq ${StateCode.Active}`,
      select: [
        'cp365_unitid',
        'cp365_unitname',
        'statecode',
        '_cp365_location_value',
      ],
      orderby: 'cp365_unitname asc',
    });
    
    console.log('[Units] Fetched all units:', units.length);
    return units;
  } catch (error) {
    console.error('[Units] Error fetching all units:', error);
    throw error;
  }
}

/**
 * Get a single unit by ID
 */
export async function getUnitById(unitId: string): Promise<Unit | null> {
  console.log('[Units] getUnitById called for unitId:', unitId);
  
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    return await client.getById<Unit>('cp365_units', unitId, {
      select: [
        'cp365_unitid',
        'cp365_unitname',
        'statecode',
        '_cp365_location_value',
      ],
    });
  } catch (error) {
    console.error('[Units] Failed to fetch unit:', error);
    return null;
  }
}

/**
 * Create a new unit
 */
export async function createUnit(unit: Partial<Unit>): Promise<Unit> {
  console.log('[Units] createUnit called with:', unit);
  
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    
    // Build the payload - only include fields that exist in Dataverse
    const payload: Record<string, unknown> = {
      cp365_unitname: unit.cp365_unitname,
    };

    // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
    if (unit._cp365_location_value) {
      payload['cp365_location@odata.bind'] = `/cp365_locations(${unit._cp365_location_value})`;
    }

    const result = await client.create<Unit>('cp365_units', payload);
    console.log('[Units] Unit created:', result);
    return result;
  } catch (error) {
    console.error('[Units] Error creating unit:', error);
    throw error;
  }
}

/**
 * Update an existing unit
 */
export async function updateUnit(unitId: string, unit: Partial<Unit>): Promise<void> {
  console.log('[Units] updateUnit called for unitId:', unitId);
  
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    
    // Build the payload with only fields that exist in Dataverse
    const payload: Record<string, unknown> = {};
    
    if (unit.cp365_unitname !== undefined) {
      payload.cp365_unitname = unit.cp365_unitname;
    }

    await client.update('cp365_units', unitId, payload);
    console.log('[Units] Unit updated successfully');
  } catch (error) {
    console.error('[Units] Error updating unit:', error);
    throw error;
  }
}

/**
 * Deactivate a unit (soft delete)
 */
export async function deactivateUnit(unitId: string): Promise<void> {
  console.log('[Units] deactivateUnit called for unitId:', unitId);
  
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    await client.update('cp365_units', unitId, {
      statecode: StateCode.Inactive,
    });
    console.log('[Units] Unit deactivated successfully');
  } catch (error) {
    console.error('[Units] Error deactivating unit:', error);
    throw error;
  }
}

// =============================================================================
// TEAM-UNIT OPERATIONS
// =============================================================================

/**
 * Get all teams for a unit
 */
export async function getTeamsForUnit(unitId: string): Promise<StaffTeam[]> {
  console.log('[Units] getTeamsForUnit called for unitId:', unitId);
  
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    
    const teams = await client.get<StaffTeam>('cp365_staffteams', {
      filter: `_cp365_unit_value eq '${unitId}'`,
      select: [
        'cp365_staffteamid',
        'cp365_staffteamname',
        '_cp365_unit_value',
      ],
      orderby: 'cp365_staffteamname asc',
    });
    
    console.log('[Units] Fetched teams for unit:', teams.length);
    return teams;
  } catch (error) {
    console.error('[Units] Error fetching teams for unit:', error);
    throw error;
  }
}

/**
 * Get teams that are not assigned to any unit
 * Note: Since teams don't have a direct location link, this returns ALL teams
 * without a unit assignment. Filter client-side if location context is needed.
 */
export async function getUnassignedTeams(_locationId: string): Promise<StaffTeam[]> {
  console.log('[Units] getUnassignedTeams called');
  
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    
    // Get teams that have no unit assigned
    const teams = await client.get<StaffTeam>('cp365_staffteams', {
      filter: `_cp365_unit_value eq null`,
      select: [
        'cp365_staffteamid',
        'cp365_staffteamname',
        '_cp365_unit_value',
      ],
      orderby: 'cp365_staffteamname asc',
    });
    
    console.log('[Units] Fetched unassigned teams:', teams.length);
    return teams;
  } catch (error) {
    console.error('[Units] Error fetching unassigned teams:', error);
    throw error;
  }
}

/**
 * Assign a team to a unit
 */
export async function assignTeamToUnit(teamId: string, unitId: string | null): Promise<void> {
  console.log('[Units] assignTeamToUnit called - teamId:', teamId, 'unitId:', unitId);
  
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    
    const payload: Record<string, unknown> = {};
    
    if (unitId) {
      // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
      payload['cp365_unit@odata.bind'] = `/cp365_units(${unitId})`;
    } else {
      // Clear the unit assignment
      payload._cp365_unit_value = null;
    }

    await client.update('cp365_staffteams', teamId, payload);
    console.log('[Units] Team assignment updated successfully');
  } catch (error) {
    console.error('[Units] Error assigning team to unit:', error);
    throw error;
  }
}

// =============================================================================
// SHIFT-UNIT OPERATIONS
// =============================================================================

/**
 * Assign a unit to a shift
 */
export async function assignUnitToShift(shiftId: string, unitId: string | null): Promise<void> {
  console.log('[Units] assignUnitToShift called - shiftId:', shiftId, 'unitId:', unitId);
  
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    
    const payload: Record<string, unknown> = {};
    
    if (unitId) {
      // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
      payload['cp365_unit@odata.bind'] = `/cp365_units(${unitId})`;
    } else {
      // Clear the unit assignment
      payload._cp365_unit_value = null;
    }

    await client.update('cp365_shifts', shiftId, payload);
    console.log('[Units] Shift unit assignment updated successfully');
  } catch (error) {
    console.error('[Units] Error assigning unit to shift:', error);
    throw error;
  }
}

// =============================================================================
// HIERARCHICAL DATA FETCHING
// =============================================================================

/**
 * Get units with team and shift statistics for the rota view
 * This is an aggregated query that builds the hierarchical structure
 */
export async function getUnitsWithStats(
  locationId: string,
  sublocationId: string,
  startDate: Date,
  endDate: Date
): Promise<UnitWithStats[]> {
  console.log('[Units] getUnitsWithStats called:', { locationId, sublocationId, startDate, endDate });
  
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    // Step 1: Fetch all units for the location
    const units = await getUnitsByLocation(locationId);
    console.log('[Units] Fetched units:', units.length);

    // Step 2: Fetch all teams for the location (via their units)
    const allTeams = await fetchAllTeamsForLocation(locationId);
    console.log('[Units] Fetched all teams:', allTeams.length);

    // Step 3: Build the hierarchical structure
    // Note: In a production implementation, you would also fetch:
    // - Shifts for the date range (to calculate totalShifts, vacantPositions)
    // - Staff absence data (to calculate staffOnLeave, onLeave)
    // - Staff members per team (to calculate staffCount, staffMembers)
    
    const unitsWithStats: UnitWithStats[] = units.map((unit) => {
      // Filter teams belonging to this unit
      const unitTeams = allTeams.filter(
        (team) => team._cp365_unit_value === unit.cp365_unitid
      );

      // Build team stats (placeholder - would need actual shift/staff data)
      const teamsWithStats: TeamWithStats[] = unitTeams.map((team) => ({
        ...team,
        unitId: team._cp365_unit_value,
        staffCount: 0, // TODO: Calculate from actual staff data
        onLeave: 0,    // TODO: Calculate from absence data
        unassigned: 0, // TODO: Calculate from shift data
        staffMembers: [], // TODO: Fetch actual staff with shifts
      }));

      return {
        ...unit,
        totalShifts: 0,      // TODO: Calculate from actual shift data
        staffOnLeave: 0,     // TODO: Calculate from absence data
        vacantPositions: 0,  // TODO: Calculate from unassigned shifts
        teams: teamsWithStats,
      };
    });

    console.log('[Units] Built units with stats:', unitsWithStats.length);
    return unitsWithStats;
  } catch (error) {
    console.error('[Units] Error fetching units with stats:', error);
    throw error;
  }
}

// =============================================================================
// HIERARCHICAL ROTA DATA FETCHING (FULL IMPLEMENTATION)
// =============================================================================

/**
 * Fetch units with their teams for the hierarchical view
 */
export async function fetchUnitsWithTeams(locationId: string): Promise<Unit[]> {
  console.log('[HierarchicalData] fetchUnitsWithTeams for locationId:', locationId);
  return getUnitsByLocation(locationId);
}

/**
 * Fetch all teams that belong to units within a location
 * Since teams are linked to units (not directly to locations), we:
 * 1. First get all unit IDs for this location
 * 2. Then fetch teams that belong to those units
 */
export async function fetchAllTeamsForLocation(locationId: string): Promise<StaffTeam[]> {
  console.log('[HierarchicalData] fetchAllTeamsForLocation for locationId:', locationId);
  
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    // Step 1: Get all units for this location
    const units = await getUnitsByLocation(locationId);
    const unitIds = units.map(u => u.cp365_unitid);
    console.log('[HierarchicalData] Found units:', unitIds.length);
    
    if (unitIds.length === 0) {
      console.log('[HierarchicalData] No units found, returning empty teams list');
      return [];
    }

    // Step 2: Fetch teams that belong to these units
    const client = getDataverseClient();
    
    // Build filter for teams belonging to any of the units
    // Format: _cp365_unit_value eq 'id1' or _cp365_unit_value eq 'id2' ...
    const unitFilters = unitIds.map(id => `_cp365_unit_value eq '${id}'`).join(' or ');
    
    const teams = await client.get<StaffTeam>('cp365_staffteams', {
      filter: unitFilters,
      select: [
        'cp365_staffteamid',
        'cp365_staffteamname',
        '_cp365_unit_value',
      ],
      orderby: 'cp365_staffteamname asc',
    });
    
    console.log('[HierarchicalData] Fetched teams:', teams.length);
    return teams;
  } catch (error) {
    console.error('[HierarchicalData] Error fetching teams:', error);
    throw error;
  }
}

/**
 * Fetch team members for all teams in a location
 */
export async function fetchTeamMembersForLocation(locationId: string): Promise<Map<string, StaffMember[]>> {
  console.log('[HierarchicalData] fetchTeamMembersForLocation for locationId:', locationId);
  
  if (!isDataverseClientInitialised()) {
    return new Map();
  }

  try {
    const client = getDataverseClient();
    
    // Fetch staff team members (junction table)
    interface StaffTeamMemberWithDetails {
      cp365_staffteammemberid: string;
      _cp365_staffteam_value: string;
      _cp365_staffmember_value: string;
    }
    
    const teamMembers = await client.get<StaffTeamMemberWithDetails>('cp365_staffteammembers', {
      select: [
        'cp365_staffteammemberid',
        '_cp365_staffteam_value',
        '_cp365_staffmember_value',
      ],
    });
    
    // Fetch all active staff members
    const staffMembers = await client.get<StaffMember>('cp365_staffmembers', {
      filter: 'statecode eq 0',
      select: [
        'cp365_staffmemberid',
        'cp365_staffmembername',
        'cp365_forename',
        'cp365_surname',
        'cp365_staffstatus',
        'cp365_agencyworker',
      ],
      orderby: 'cp365_staffmembername asc',
    });
    
    // Create a map of staff by ID
    const staffById = new Map(staffMembers.map(s => [s.cp365_staffmemberid, s]));
    
    // Group staff by team
    const staffByTeam = new Map<string, StaffMember[]>();
    
    for (const tm of teamMembers) {
      const teamId = tm._cp365_staffteam_value;
      const staff = staffById.get(tm._cp365_staffmember_value);
      
      if (teamId && staff) {
        if (!staffByTeam.has(teamId)) {
          staffByTeam.set(teamId, []);
        }
        staffByTeam.get(teamId)!.push(staff);
      }
    }
    
    console.log('[HierarchicalData] Grouped staff into', staffByTeam.size, 'teams');
    return staffByTeam;
  } catch (error) {
    console.error('[HierarchicalData] Error fetching team members:', error);
    return new Map();
  }
}

/**
 * Fetch all shifts for a date range within a rota
 */
export async function fetchShiftsForDateRange(
  rotaId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<Shift[]> {
  console.log('[HierarchicalData] fetchShiftsForDateRange:', { rotaId, startDate, endDate });
  
  if (!isDataverseClientInitialised() || !rotaId) {
    return [];
  }

  try {
    const client = getDataverseClient();
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    const shifts = await client.get<Shift>('cp365_shifts', {
      filter: `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr}`,
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
        '_cp365_unit_value',
      ],
      orderby: 'cp365_shiftdate asc,cp365_shiftstarttime asc',
      top: 1000,
    });
    
    console.log('[HierarchicalData] Fetched shifts:', shifts.length);
    return shifts;
  } catch (error) {
    console.error('[HierarchicalData] Error fetching shifts:', error);
    throw error;
  }
}

/**
 * Fetch staff absences (leave) for a date range
 */
export async function fetchLeaveForDateRange(
  staffIds: string[],
  startDate: Date,
  endDate: Date
): Promise<StaffAbsenceLog[]> {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  console.log('[HierarchicalData] fetchLeaveForDateRange:', { 
    staffCount: staffIds.length, 
    startDateStr,
    endDateStr,
  });
  
  if (!isDataverseClientInitialised() || staffIds.length === 0) {
    console.log('[HierarchicalData] Skipping leave fetch - not initialised or no staff');
    return [];
  }

  try {
    const client = getDataverseClient();
    
    // Query cp365_staffabsencelogs table with correct field names from schema:
    // - cp365_absencestart: Start date/time
    // - cp365_absenceend: End date/time  
    // - cp365_absencestatus: 3 = Approved
    // - _cp365_staffmember_value: Staff member lookup
    // - _cp365_absencetype_value: Absence type lookup
    
    console.log('[HierarchicalData] Fetching leave from cp365_staffabsencelogs...');
    console.log('[HierarchicalData] Date range:', startDateStr, 'to', endDateStr);
    console.log('[HierarchicalData] Staff count:', staffIds.length);
    
    // Build OData filter for approved leave overlapping with date range
    // Leave overlaps if: absencestart <= endDate AND absenceend >= startDate
    const filter = `cp365_absencestatus eq 3 and cp365_absencestart le ${endDateStr} and cp365_absenceend ge ${startDateStr}`;
    
    console.log('[HierarchicalData] Filter:', filter);
    
    const absences = await client.get<any>('cp365_staffabsencelogs', {
      filter,
      select: [
        'cp365_staffabsencelogid',
        'cp365_staffabsencelogname',
        'cp365_absencestart',
        'cp365_absenceend',
        'cp365_absencestatus',
        'cp365_halfdayoption',
        '_cp365_staffmember_value',
        '_cp365_absencetype_value',
      ],
      // NOTE: For $expand clauses, navigation property names should use the schema name (PascalCase)
      // NOTE: Navigation property name matches the relationship schema name
      expand: ['cp365_AbsenceType($select=cp365_absencetypeid,cp365_absencetypename,cp365_sensitive)'],
    });
    
    console.log('[HierarchicalData] Fetched leave records:', absences.length);
    
    if (absences.length > 0) {
      console.log('[HierarchicalData] First leave record:', JSON.stringify(absences[0], null, 2));
    }
    
    // Filter to only staff in the provided list and map to our interface
    const mappedAbsences: StaffAbsenceLog[] = absences
      .filter((a: any) => {
        const staffId = a._cp365_staffmember_value;
        const isInList = staffId && staffIds.includes(staffId);
        if (!isInList && staffId) {
          // Log staff not in list for debugging
          console.log('[HierarchicalData] Leave record for staff not in list:', staffId);
        }
        return isInList;
      })
      .map((a: any) => ({
        cp365_staffabsencelogid: a.cp365_staffabsencelogid,
        cp365_startdate: a.cp365_absencestart || '',
        cp365_enddate: a.cp365_absenceend || '',
        cp365_sensitive: a.cp365_AbsenceType?.cp365_sensitive || false,
        _cp365_staffmember_value: a._cp365_staffmember_value || '',
        _cp365_absencetype_value: a._cp365_absencetype_value || '',
        // Include the expanded absence type for display (property name matches $expand clause)
        cp365_absencetype: a.cp365_AbsenceType ? {
          cp365_absencetypeid: a.cp365_AbsenceType.cp365_absencetypeid,
          cp365_absencetypename: a.cp365_AbsenceType.cp365_absencetypename,
          cp365_sensitive: a.cp365_AbsenceType.cp365_sensitive || false,
        } : undefined,
      }));
    
    console.log('[HierarchicalData] Mapped leave records for staff in sublocation:', mappedAbsences.length);
    
    // Log which staff have leave
    const staffWithLeave = [...new Set(mappedAbsences.map(a => a._cp365_staffmember_value))];
    console.log('[HierarchicalData] Staff with approved leave:', staffWithLeave.length);
    
    return mappedAbsences;
    
  } catch (error) {
    console.error('[HierarchicalData] Error fetching leave:', error);
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('[HierarchicalData] Error message:', error.message);
      console.error('[HierarchicalData] Error stack:', error.stack);
    }
    return [];
  }
}

/**
 * Fetch staff contracts to get contracted hours
 */
export async function fetchStaffContracts(
  staffIds: string[]
): Promise<Map<string, number>> {
  console.log('[HierarchicalData] fetchStaffContracts for', staffIds.length, 'staff');
  
  if (!isDataverseClientInitialised() || staffIds.length === 0) {
    return new Map();
  }

  try {
    const client = getDataverseClient();
    
    interface StaffContractData {
      cp365_staffcontractid: string;
      _cp365_staffmember_value: string;
      _cp365_contract_value: string;
      cp365_active: boolean;
    }
    
    interface ContractData {
      cp365_contractid: string;
      cp365_requiredhours: number | null;
    }
    
    // Fetch active staff contracts
    const staffContracts = await client.get<StaffContractData>('cp365_staffcontracts', {
      filter: 'cp365_active eq true',
      select: [
        'cp365_staffcontractid',
        '_cp365_staffmember_value',
        '_cp365_contract_value',
        'cp365_active',
      ],
    });
    
    // Get unique contract IDs
    const contractIds = [...new Set(staffContracts.map(sc => sc._cp365_contract_value))];
    
    // Fetch contract details
    const contracts = await client.get<ContractData>('cp365_contracts', {
      select: [
        'cp365_contractid',
        'cp365_requiredhours',
      ],
    });
    
    // Create map of contract hours by contract ID
    const contractHours = new Map(
      contracts.map(c => [c.cp365_contractid, c.cp365_requiredhours || 0])
    );
    
    // Create map of contracted hours by staff ID
    const staffContractedHours = new Map<string, number>();
    
    for (const sc of staffContracts) {
      if (staffIds.includes(sc._cp365_staffmember_value)) {
        const hours = contractHours.get(sc._cp365_contract_value) || 0;
        staffContractedHours.set(sc._cp365_staffmember_value, hours);
      }
    }
    
    console.log('[HierarchicalData] Got contracted hours for', staffContractedHours.size, 'staff');
    return staffContractedHours;
  } catch (error) {
    console.error('[HierarchicalData] Error fetching contracts:', error);
    return new Map();
  }
}

/**
 * Fetch staff capabilities/qualifications
 */
export async function fetchStaffCapabilities(
  staffIds: string[]
): Promise<Map<string, Capability[]>> {
  console.log('[HierarchicalData] fetchStaffCapabilities for', staffIds.length, 'staff');
  
  if (!isDataverseClientInitialised() || staffIds.length === 0) {
    return new Map();
  }

  try {
    const client = getDataverseClient();
    
    interface StaffCapabilityData {
      cp365_staffcapabilityid: string;
      _cp365_staffmember_value: string;
      _cp365_capability_value: string;
    }
    
    // Fetch staff capabilities
    const staffCapabilities = await client.get<StaffCapabilityData>('cp365_staffcapabilities', {
      select: [
        'cp365_staffcapabilityid',
        '_cp365_staffmember_value',
        '_cp365_capability_value',
      ],
    });
    
    // Fetch all capabilities
    const capabilities = await client.get<Capability>('cp365_capabilities', {
      select: [
        'cp365_capabilityid',
        'cp365_capabilityname',
        'cp365_drivercapability',
      ],
    });
    
    // Create map of capabilities by ID
    const capabilityById = new Map(
      capabilities.map(c => [c.cp365_capabilityid, c])
    );
    
    // Group capabilities by staff
    const staffCaps = new Map<string, Capability[]>();
    
    for (const sc of staffCapabilities) {
      if (staffIds.includes(sc._cp365_staffmember_value)) {
        const cap = capabilityById.get(sc._cp365_capability_value);
        if (cap) {
          if (!staffCaps.has(sc._cp365_staffmember_value)) {
            staffCaps.set(sc._cp365_staffmember_value, []);
          }
          staffCaps.get(sc._cp365_staffmember_value)!.push(cap);
        }
      }
    }
    
    console.log('[HierarchicalData] Got capabilities for', staffCaps.size, 'staff');
    return staffCaps;
  } catch (error) {
    console.error('[HierarchicalData] Error fetching capabilities:', error);
    return new Map();
  }
}

/**
 * Build the complete hierarchical data structure
 * This function orchestrates all the data fetching and builds the hierarchy client-side
 */
export async function fetchHierarchicalRotaData(
  locationId: string,
  sublocationId: string,
  rotaId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<HierarchicalRotaData> {
  console.log('[HierarchicalData] fetchHierarchicalRotaData:', {
    locationId,
    sublocationId,
    rotaId,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  });

  if (!isDataverseClientInitialised()) {
    console.warn('[HierarchicalData] Dataverse client not initialised');
    return {
      units: [],
      unassignedTeams: [],
      unassignedShifts: [],
      leaveData: [],
      stats: createEmptyStats(),
    };
  }

  try {
    // Step 1: Fetch base data in parallel
    const [units, teams, shifts] = await Promise.all([
      fetchUnitsWithTeams(locationId),
      fetchAllTeamsForLocation(locationId),
      fetchShiftsForDateRange(rotaId, startDate, endDate),
    ]);

    console.log('[HierarchicalData] Base data fetched:', {
      units: units.length,
      teams: teams.length,
      shifts: shifts.length,
    });

    // Step 2: Fetch staff data in parallel
    const staffByTeam = await fetchTeamMembersForLocation(locationId);
    
    // Get all unique staff IDs
    const allStaffIds: string[] = [];
    staffByTeam.forEach((staffList) => {
      staffList.forEach(s => allStaffIds.push(s.cp365_staffmemberid));
    });
    const uniqueStaffIds = [...new Set(allStaffIds)];

    // Step 3: Fetch staff-related data in parallel
    const [leaveData, contractedHours, capabilities] = await Promise.all([
      fetchLeaveForDateRange(uniqueStaffIds, startDate, endDate),
      fetchStaffContracts(uniqueStaffIds),
      fetchStaffCapabilities(uniqueStaffIds),
    ]);

    // Step 4: Build the hierarchy
    const hierarchy = buildHierarchy(
      units,
      teams,
      shifts,
      staffByTeam,
      leaveData,
      contractedHours,
      capabilities,
      startDate,
      endDate
    );

    console.log('[HierarchicalData] Hierarchy built:', {
      units: hierarchy.units.length,
      unassignedTeams: hierarchy.unassignedTeams.length,
      unassignedShifts: hierarchy.unassignedShifts.length,
    });

    return hierarchy;
  } catch (error) {
    console.error('[HierarchicalData] Error fetching hierarchical data:', error);
    throw error;
  }
}

/**
 * Build the hierarchical data structure from fetched data
 */
function buildHierarchy(
  units: Unit[],
  teams: StaffTeam[],
  shifts: Shift[],
  staffByTeam: Map<string, StaffMember[]>,
  leaveData: StaffAbsenceLog[],
  contractedHours: Map<string, number>,
  capabilities: Map<string, Capability[]>,
  startDate: Date,
  endDate: Date
): HierarchicalRotaData {
  // Group shifts by staff member
  const shiftsByStaff = new Map<string | null, Shift[]>();
  for (const shift of shifts) {
    const staffId = shift._cp365_staffmember_value;
    if (!shiftsByStaff.has(staffId)) {
      shiftsByStaff.set(staffId, []);
    }
    shiftsByStaff.get(staffId)!.push(shift);
  }

  // Group leave by staff member
  const leaveByStaff = new Map<string, StaffAbsenceLog[]>();
  for (const leave of leaveData) {
    const staffId = leave._cp365_staffmember_value;
    if (!leaveByStaff.has(staffId)) {
      leaveByStaff.set(staffId, []);
    }
    leaveByStaff.get(staffId)!.push(leave);
  }

  // Helper to calculate scheduled hours for a staff member
  const calculateScheduledHours = (staffShifts: Shift[]): number => {
    let hours = 0;
    for (const shift of staffShifts) {
      if (shift.cp365_shiftstarttime && shift.cp365_shiftendtime) {
        const start = parseISO(shift.cp365_shiftstarttime);
        const end = parseISO(shift.cp365_shiftendtime);
        hours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    }
    return Math.round(hours * 10) / 10;
  };

  // Helper to check if staff is on leave during the period
  const isStaffOnLeave = (staffId: string): boolean => {
    const staffLeave = leaveByStaff.get(staffId) || [];
    return staffLeave.some(leave => {
      const leaveStart = parseISO(leave.cp365_startdate);
      const leaveEnd = parseISO(leave.cp365_enddate);
      return isWithinInterval(new Date(), { start: leaveStart, end: leaveEnd });
    });
  };

  // Build staff with shifts for a team
  const buildStaffWithShifts = (teamStaff: StaffMember[]): StaffWithShifts[] => {
    return teamStaff.map(staff => {
      const staffShifts = shiftsByStaff.get(staff.cp365_staffmemberid) || [];
      const staffLeave = leaveByStaff.get(staff.cp365_staffmemberid) || [];
      
      return {
        ...staff,
        shifts: staffShifts,
        leave: staffLeave,
        contractedHours: contractedHours.get(staff.cp365_staffmemberid) || 0,
        scheduledHours: calculateScheduledHours(staffShifts),
        qualifications: capabilities.get(staff.cp365_staffmemberid) || [],
      };
    });
  };

  // Group teams by unit
  const teamsByUnit = new Map<string | null, StaffTeam[]>();
  for (const team of teams) {
    const unitId = team._cp365_unit_value;
    if (!teamsByUnit.has(unitId)) {
      teamsByUnit.set(unitId, []);
    }
    teamsByUnit.get(unitId)!.push(team);
  }

  // Build teams with staff
  const buildTeamWithStaff = (team: StaffTeam): TeamWithStaff => {
    const teamStaff = staffByTeam.get(team.cp365_staffteamid) || [];
    const staffWithShifts = buildStaffWithShifts(teamStaff);
    
    // Find unassigned shifts for this team
    // (In a real implementation, you might link shifts to teams via the staff member's team)
    const teamStaffIds = new Set(teamStaff.map(s => s.cp365_staffmemberid));
    const unassignedShifts: Shift[] = []; // Would need team-shift linking
    
    // Count staff on leave
    const onLeaveCount = teamStaff.filter(s => isStaffOnLeave(s.cp365_staffmemberid)).length;
    
    return {
      ...team,
      staffMembers: staffWithShifts,
      unassignedShifts,
      stats: {
        onLeave: onLeaveCount,
        unassigned: unassignedShifts.length,
      },
    };
  };

  // Build units with teams
  const unitsWithTeams: UnitWithTeams[] = units.map(unit => {
    const unitTeams = teamsByUnit.get(unit.cp365_unitid) || [];
    const teamsWithStaff = unitTeams.map(buildTeamWithStaff);
    
    // Calculate unit stats
    const totalShifts = teamsWithStaff.reduce(
      (sum, team) => sum + team.staffMembers.reduce((s, staff) => s + staff.shifts.length, 0),
      0
    );
    const staffOnLeave = teamsWithStaff.reduce((sum, team) => sum + team.stats.onLeave, 0);
    const vacancies = teamsWithStaff.reduce((sum, team) => sum + team.stats.unassigned, 0);
    
    return {
      ...unit,
      teams: teamsWithStaff,
      stats: {
        totalShifts,
        staffOnLeave,
        vacancies,
      },
    };
  });

  // Unassigned teams (not linked to any unit)
  const unassignedTeamsList = teamsByUnit.get(null) || [];
  const unassignedTeams: TeamWithStaff[] = unassignedTeamsList.map(buildTeamWithStaff);

  // Unassigned shifts (no staff member assigned)
  const unassignedShifts = shiftsByStaff.get(null) || [];

  // Calculate overall stats
  const stats = calculateRotaStats(shifts, uniqueStaffFromTeams(staffByTeam), leaveData);

  return {
    units: unitsWithTeams,
    unassignedTeams,
    unassignedShifts,
    leaveData,
    stats,
  };
}

/**
 * Get unique staff from the team-staff map
 */
function uniqueStaffFromTeams(staffByTeam: Map<string, StaffMember[]>): StaffMember[] {
  const seen = new Set<string>();
  const result: StaffMember[] = [];
  
  staffByTeam.forEach((staffList) => {
    for (const staff of staffList) {
      if (!seen.has(staff.cp365_staffmemberid)) {
        seen.add(staff.cp365_staffmemberid);
        result.push(staff);
      }
    }
  });
  
  return result;
}

/**
 * Calculate rota-level statistics
 */
function calculateRotaStats(
  shifts: Shift[],
  staff: StaffMember[],
  leave: StaffAbsenceLog[]
): RotaStats {
  let totalHours = 0;
  let assignedShifts = 0;
  let unassignedShifts = 0;
  let publishedShifts = 0;
  let unpublishedShifts = 0;

  for (const shift of shifts) {
    // Calculate hours
    if (shift.cp365_shiftstarttime && shift.cp365_shiftendtime) {
      const start = parseISO(shift.cp365_shiftstarttime);
      const end = parseISO(shift.cp365_shiftendtime);
      totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    // Count assigned/unassigned
    if (shift._cp365_staffmember_value) {
      assignedShifts++;
    } else {
      unassignedShifts++;
    }

    // Count published/unpublished
    if (shift.cp365_shiftstatus === ShiftStatus.Published) {
      publishedShifts++;
    } else {
      unpublishedShifts++;
    }
  }

  const totalShifts = shifts.length;
  const coveragePercentage = totalShifts > 0 
    ? Math.round((assignedShifts / totalShifts) * 100) 
    : 100;

  return {
    totalShifts,
    totalHours: Math.round(totalHours * 10) / 10,
    assignedShifts,
    unassignedShifts,
    publishedShifts,
    unpublishedShifts,
    staffOnLeave: leave.length,
    totalStaff: staff.length,
    coveragePercentage,
  };
}

/**
 * Create empty stats object
 */
function createEmptyStats(): RotaStats {
  return {
    totalShifts: 0,
    totalHours: 0,
    assignedShifts: 0,
    unassignedShifts: 0,
    publishedShifts: 0,
    unpublishedShifts: 0,
    staffOnLeave: 0,
    totalStaff: 0,
    coveragePercentage: 100,
  };
}

