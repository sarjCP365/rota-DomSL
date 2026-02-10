/**
 * Staff API Operations
 * ===================
 *
 * This module provides standardised functions for fetching staff data from Dataverse.
 *
 * CRITICAL: UNDERSTANDING STAFF-SUBLOCATION RELATIONSHIPS
 * ========================================================
 *
 * Staff members are NOT directly linked to sublocations via a field on the staff entity.
 * Instead, they are assigned through the `cp365_sublocationstaffs` JUNCTION TABLE.
 *
 * Schema:
 *   cp365_staffmembers <--> cp365_sublocationstaffs <--> cp365_sublocations
 *
 * The `_cp365_defaultlocation_value` field on StaffMember is the staff's DEFAULT/PRIMARY
 * location, but a staff member can work at MULTIPLE sublocations via the junction table.
 *
 * ALWAYS use the junction table when filtering staff by sublocation!
 *
 * Usage Examples:
 * ```typescript
 * // Get all staff for a sublocation (for dropdowns, assignments, etc.)
 * const staff = await getStaffForSublocation(sublocationId);
 *
 * // Get staff with full view data (for rota grids)
 * const staffViewData = await getStaffViewDataForSublocation(sublocationId);
 *
 * // Get a single staff member by ID
 * const staffMember = await getStaffMemberById(staffId);
 * ```
 *
 * @module staff
 */

import { getDataverseClient, isDataverseClientInitialised } from './client';
import type { StaffMember, SublocationStaff, SublocationStaffViewData } from './types';
import { StaffStatus } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const STAFF_ENTITY_SET = 'cp365_staffmembers';
const SUBLOCATION_STAFF_ENTITY_SET = 'cp365_sublocationstaffs';

/** Default fields to select when querying staff members */
const STAFF_BASE_FIELDS = [
  'cp365_staffmemberid',
  'cp365_staffmembername',
  'cp365_forename',
  'cp365_surname',
  'cp365_staffnumber',
  'cp365_workemail',
  'cp365_staffstatus',
  '_cp365_defaultlocation_value',
] as const;

/** Extended fields for detailed staff queries */
const STAFF_EXTENDED_FIELDS = [
  ...STAFF_BASE_FIELDS,
  'cp365_personalemail',
  'cp365_personalmobile',
  'cp365_workmobile',
  'cp365_dateofbirth',
  '_cp365_linemanager_value',
  '_cp365_jobtitle_value',
] as const;

// =============================================================================
// PRIMARY FUNCTIONS - USE THESE FOR STAFF QUERIES
// =============================================================================

/**
 * Get staff members for a sublocation.
 *
 * This is the PRIMARY function for fetching staff by location.
 * Uses the cp365_sublocationstaffs junction table to get correctly assigned staff.
 *
 * @param sublocationId - The sublocation GUID to get staff for
 * @param options - Optional configuration
 * @param options.activeOnly - If true, only return active staff (default: false)
 * @returns Array of StaffMember entities
 *
 * @example
 * ```typescript
 * // Get all staff for a sublocation
 * const staff = await getStaffForSublocation('guid-here');
 *
 * // Get only active staff
 * const activeStaff = await getStaffForSublocation('guid-here', { activeOnly: true });
 * ```
 */
export async function getStaffForSublocation(
  sublocationId: string,
  options: { activeOnly?: boolean } = {}
): Promise<StaffMember[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Staff] Dataverse client not initialised');
    return [];
  }

  if (!sublocationId) {
    console.warn('[Staff] No sublocationId provided to getStaffForSublocation');
    return [];
  }

  const client = getDataverseClient();

  try {
    // Query the junction table with expanded staff member data
    const sublocationStaff = await client.get<SublocationStaff>(SUBLOCATION_STAFF_ENTITY_SET, {
      filter: `_cp365_sublocation_value eq '${sublocationId}' and statecode eq 0`,
      select: [
        'cp365_sublocationstaffid',
        '_cp365_staffmember_value',
        'cp365_visiblefrom',
        'cp365_visibleto',
      ],
      // NOTE: Navigation property names vary by entity - this one uses the type alias format
      expand: [`cp365_StaffMember($select=${STAFF_BASE_FIELDS.join(',')})`],
      orderby: 'cp365_sublocationstaffname asc',
      top: 500,
    });

    // Extract staff members from the junction records
    const staffMembers: StaffMember[] = [];
    for (const ss of sublocationStaff) {
      // Access expanded staff member (property name matches $expand clause)
      const ssAny = ss as unknown as Record<string, unknown>;
      const staffMember = ssAny.cp365_StaffMember as StaffMember | undefined;

      if (staffMember) {
        // Apply active filter if requested
        if (options.activeOnly && staffMember.cp365_staffstatus !== StaffStatus.Active) {
          continue;
        }
        staffMembers.push(staffMember);
      }
    }

    return staffMembers;
  } catch (error) {
    console.error('[Staff] Error fetching staff for sublocation:', error);
    throw error;
  }
}

/**
 * Get staff view data for a sublocation (for RotaGrid display).
 *
 * Returns staff in the SublocationStaffViewData format with additional
 * display-friendly fields like formatted names, job titles, etc.
 *
 * @param sublocationId - The sublocation GUID to get staff for
 * @returns Array of SublocationStaffViewData for grid display
 *
 * @example
 * ```typescript
 * const staffViewData = await getStaffViewDataForSublocation('guid-here');
 * // Returns: [{ 'Staff Member ID': '...', 'Staff Member Name': 'John Smith', ... }]
 * ```
 */
export async function getStaffViewDataForSublocation(
  sublocationId: string
): Promise<SublocationStaffViewData[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Staff] Dataverse client not initialised');
    return [];
  }

  if (!sublocationId) {
    console.warn('[Staff] No sublocationId provided to getStaffViewDataForSublocation');
    return [];
  }

  const client = getDataverseClient();

  try {
    // Query with expanded staff member data including job title
    const sublocationStaff = await client.get<SublocationStaff>(SUBLOCATION_STAFF_ENTITY_SET, {
      filter: `_cp365_sublocation_value eq '${sublocationId}' and statecode eq 0`,
      select: [
        'cp365_sublocationstaffid',
        'cp365_sublocationstaffname',
        '_cp365_staffmember_value',
        'cp365_visiblefrom',
        'cp365_visibleto',
      ],
      // NOTE: Navigation property names vary by entity - this one uses the type alias format
      expand: [
        'cp365_StaffMember($select=cp365_staffmemberid,cp365_staffmembername,cp365_forename,cp365_surname,cp365_staffstatus,cp365_dateofbirth,_cp365_jobtitle_value;$expand=cp365_JobTitle($select=cp365_jobtitleid,cp365_jobtitlename))',
      ],
      orderby: 'cp365_sublocationstaffname asc',
      top: 200,
    });

    // Map to SublocationStaffViewData format
    return sublocationStaff.map((ss): SublocationStaffViewData => {
      // Access the expanded staff member (property name matches $expand clause)
      const ssAny = ss as unknown as Record<string, unknown>;
      const staffMember = ssAny.cp365_StaffMember as SublocationStaff['cp365_staffmember'];

      // Build staff name - prefer forename + surname
      const staffName = buildStaffDisplayName(staffMember, ss.cp365_sublocationstaffname);

      // Get job title from expanded relationship (property name matches $expand clause)
      const staffMemberExpanded = staffMember as unknown as Record<string, unknown> | undefined;
      const jobTitleObj = staffMemberExpanded?.cp365_JobTitle;
      const jobTitleName =
        (jobTitleObj as { cp365_jobtitlename?: string } | undefined)?.cp365_jobtitlename || null;

      return {
        'Staff Member ID': ss._cp365_staffmember_value,
        'Staff Member Name': staffName,
        'Staff Status': staffMember?.cp365_staffstatus || 0,
        'Contract End Date': null,
        'Job Title Name': jobTitleName,
        'Job Type Name': null,
        'Staff Teams': [],
        Department: null,
        'Date of Birth':
          (staffMember as unknown as { cp365_dateofbirth?: string })?.cp365_dateofbirth || null,
      };
    });
  } catch (error) {
    console.error('[Staff] Error fetching staff view data:', error);
    throw error;
  }
}

// =============================================================================
// SINGLE RECORD FUNCTIONS
// =============================================================================

/**
 * Get a single staff member by ID.
 *
 * @param staffId - The staff member GUID
 * @returns The staff member or null if not found
 */
export async function getStaffMemberById(staffId: string): Promise<StaffMember | null> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Staff] Dataverse client not initialised');
    return null;
  }

  if (!staffId) {
    return null;
  }

  try {
    const client = getDataverseClient();
    return await client.getById<StaffMember>(STAFF_ENTITY_SET, staffId, {
      select: [...STAFF_EXTENDED_FIELDS],
    });
  } catch (error) {
    console.error('[Staff] Error fetching staff member by ID:', error);
    return null;
  }
}

/**
 * Get a staff member by email address.
 *
 * @param email - The work email address to search for
 * @returns The staff member or null if not found
 */
export async function getStaffMemberByEmail(email: string): Promise<StaffMember | null> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Staff] Dataverse client not initialised');
    return null;
  }

  if (!email) {
    return null;
  }

  try {
    const client = getDataverseClient();
    const results = await client.get<StaffMember>(STAFF_ENTITY_SET, {
      filter: `cp365_workemail eq '${email}'`,
      select: [...STAFF_EXTENDED_FIELDS],
      top: 1,
    });
    return results[0] || null;
  } catch (error) {
    console.error('[Staff] Error fetching staff member by email:', error);
    return null;
  }
}

// =============================================================================
// BULK QUERY FUNCTIONS
// =============================================================================

/**
 * Get all staff members (optionally filtered).
 *
 * Use this when you need ALL staff regardless of sublocation,
 * for example in admin screens or reports.
 *
 * @param options - Optional filters
 * @param options.activeOnly - Only return active staff (default: true)
 * @returns Array of staff members
 */
export async function getAllStaffMembers(
  options: { activeOnly?: boolean } = { activeOnly: true }
): Promise<StaffMember[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Staff] Dataverse client not initialised');
    return [];
  }

  const client = getDataverseClient();

  try {
    const filters: string[] = [];
    if (options.activeOnly) {
      filters.push(`cp365_staffstatus eq ${StaffStatus.Active}`);
    }

    const staff = await client.get<StaffMember>(STAFF_ENTITY_SET, {
      select: [...STAFF_BASE_FIELDS],
      filter: filters.length > 0 ? filters.join(' and ') : undefined,
      orderby: 'cp365_staffmembername asc',
      top: 1000,
    });

    return staff;
  } catch (error) {
    console.error('[Staff] Error fetching all staff members:', error);
    throw error;
  }
}

// =============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// =============================================================================

/**
 * @deprecated Use getStaffForSublocation instead.
 * This function is kept for backwards compatibility with existing hooks.
 */
export async function getStaffMembers(sublocationId?: string): Promise<StaffMember[]> {
  if (sublocationId) {
    return getStaffForSublocation(sublocationId);
  }
  return getAllStaffMembers({ activeOnly: true });
}

/**
 * @deprecated This function is a stub. Use getStaffForSublocation instead.
 */
export async function getSublocationStaff(
  sublocationId: string,
  _startDate: Date,
  _endDate: Date
): Promise<StaffMember[]> {
  // The date parameters were intended for visibility filtering but not yet implemented
  return getStaffForSublocation(sublocationId);
}

// =============================================================================
// MUTATION FUNCTIONS (PLACEHOLDERS)
// =============================================================================

/**
 * Create a new staff member.
 * @todo Implement when staff management features are built
 */
export async function createStaffMember(_staff: Partial<StaffMember>): Promise<StaffMember> {
  throw new Error('createStaffMember not yet implemented');
}

/**
 * Update an existing staff member.
 * @todo Implement when staff management features are built
 */
export async function updateStaffMember(
  _staffId: string,
  _data: Partial<StaffMember>
): Promise<void> {
  throw new Error('updateStaffMember not yet implemented');
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a display-friendly name from staff member data.
 * Prefers forename + surname, falls back to other available fields.
 */
function buildStaffDisplayName(
  staffMember: SublocationStaff['cp365_staffmember'] | undefined,
  fallbackName?: string
): string {
  if (staffMember?.cp365_forename || staffMember?.cp365_surname) {
    return `${staffMember.cp365_forename || ''} ${staffMember.cp365_surname || ''}`.trim();
  }

  if (staffMember?.cp365_staffmembername) {
    // Extract just the name from "Name > Location > Sublocation" format
    const fullName = staffMember.cp365_staffmembername;
    const firstPart = fullName.split(' > ')[0].trim();
    return firstPart || 'Unknown';
  }

  if (fallbackName) {
    // Extract from sublocation staff name
    const firstPart = fallbackName.split(' > ')[0].trim();
    return firstPart || 'Unknown';
  }

  return 'Unknown';
}

/**
 * Get the full name of a staff member.
 * Utility function for formatting staff names consistently.
 */
export function getStaffFullName(staff: StaffMember | null | undefined): string {
  if (!staff) return 'Unknown';
  if (staff.cp365_forename || staff.cp365_surname) {
    return `${staff.cp365_forename || ''} ${staff.cp365_surname || ''}`.trim();
  }
  return staff.cp365_staffmembername?.split(' > ')[0] || 'Unknown';
}

/**
 * Get staff initials for avatar display.
 */
export function getStaffInitials(staff: StaffMember | null | undefined): string {
  if (!staff) return '?';
  const forename = staff.cp365_forename || '';
  const surname = staff.cp365_surname || '';
  return `${forename[0] || ''}${surname[0] || ''}`.toUpperCase() || '?';
}
