/**
 * Unified Assignment Types
 *
 * Provides a common interface for both residential Shifts and domiciliary Visits,
 * enabling the shift swap and open shift features to work across all care types.
 */

import type { Shift, StaffMember, Location, Sublocation } from '../api/dataverse/types';
import type { Visit, DomiciliaryServiceUser } from './domiciliary';

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Type of assignment - determines which entity is being referenced
 */
export type AssignmentType = 'shift' | 'visit';

/**
 * Status of an assignment - unified across both types
 */
export const AssignmentStatus = {
  /** Scheduled but no staff assigned */
  Unassigned: 1,
  /** Staff member has been assigned */
  Assigned: 2,
  /** Work is in progress */
  InProgress: 3,
  /** Work completed */
  Completed: 4,
  /** Assignment was cancelled */
  Cancelled: 5,
  /** Assignment was missed (not completed) */
  Missed: 6,
  /** Marked as open for pickup */
  Open: 7,
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

// =============================================================================
// SWAPPABLE ASSIGNMENT INTERFACE
// =============================================================================

/**
 * Unified interface that abstracts both Shift and Visit entities
 * for use in swap requests and open shift management.
 *
 * This allows the UI to work with a single type while the underlying
 * data source handles the entity-specific operations.
 */
export interface SwappableAssignment {
  /** Unique identifier */
  id: string;

  /** Type of assignment (shift or visit) */
  type: AssignmentType;

  /** Date of the assignment (ISO format: YYYY-MM-DD) */
  date: string;

  /** Start time (HH:mm format) */
  startTime: string;

  /** End time (HH:mm format) */
  endTime: string;

  /** Duration in minutes */
  durationMinutes: number;

  /** Currently assigned staff member ID (null if unassigned) */
  staffMemberId: string | null;

  /** Staff member name for display */
  staffMemberName?: string;

  /** Staff member job title */
  staffMemberJobTitle?: string;

  /** Location ID */
  locationId: string;

  /** Location name for display */
  locationName: string;

  /** Sublocation ID (for residential care) */
  sublocationId?: string;

  /** Sublocation name for display */
  sublocationName?: string;

  /** Activity/reference name (shift reference or visit type) */
  activityName?: string;

  /** Current status */
  status: AssignmentStatus;

  // Visit-specific fields (only populated for visits)

  /** Service user ID (visits only) */
  serviceUserId?: string;

  /** Service user name (visits only) */
  serviceUserName?: string;

  /** Service user address (visits only) */
  serviceUserAddress?: string;

  /** Service user latitude for travel calculations (visits only) */
  serviceUserLatitude?: number;

  /** Service user longitude for travel calculations (visits only) */
  serviceUserLongitude?: number;

  // Original entity reference for operations

  /**
   * Reference to the original Shift entity (if type === 'shift')
   * Used when performing actual data operations
   */
  _sourceShift?: Shift;

  /**
   * Reference to the original Visit entity (if type === 'visit')
   * Used when performing actual data operations
   */
  _sourceVisit?: Visit;
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert a Shift entity to a SwappableAssignment
 */
export function shiftToAssignment(
  shift: Shift,
  staffMember?: StaffMember | null,
  location?: Location | null,
  sublocation?: Sublocation | null
): SwappableAssignment {
  // Parse times from shift
  const startTime = shift.cp365_shiftstarttime
    ? new Date(shift.cp365_shiftstarttime).toTimeString().slice(0, 5)
    : '00:00';
  const endTime = shift.cp365_shiftendtime
    ? new Date(shift.cp365_shiftendtime).toTimeString().slice(0, 5)
    : '00:00';

  // Calculate duration
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const durationMinutes = endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : (24 * 60 - startMinutes) + endMinutes; // Handle overnight shifts

  // Map shift status to unified status
  let status: AssignmentStatus = AssignmentStatus.Unassigned;
  if (shift._cp365_staffmember_value) {
    status = AssignmentStatus.Assigned;
  }
  // Check for open shift status (1005 in specification)
  if (shift.cp365_shiftstatus === 1005) {
    status = AssignmentStatus.Open;
  }

  return {
    id: shift.cp365_shiftid,
    type: 'shift',
    date: shift.cp365_shiftdate,
    startTime,
    endTime,
    durationMinutes,
    staffMemberId: shift._cp365_staffmember_value,
    staffMemberName: staffMember?.cp365_staffmembername || shift._staffMemberName || undefined,
    staffMemberJobTitle: staffMember?.cp365_jobtitle || undefined,
    locationId: location?.cp365_locationid || '',
    locationName: location?.cp365_locationname || '',
    sublocationId: sublocation?.cp365_sublocationid,
    sublocationName: sublocation?.cp365_sublocationname,
    activityName: shift.cp365_shiftreference?.cp365_shiftreferencename || shift.cp365_shiftactivity?.cp365_shiftactivityname,
    status,
    _sourceShift: shift,
  };
}

/**
 * Convert a Visit entity to a SwappableAssignment
 */
export function visitToAssignment(
  visit: Visit,
  staffMember?: StaffMember | null,
  serviceUser?: DomiciliaryServiceUser | null,
  location?: Location | null
): SwappableAssignment {
  // Map visit status to unified status
  let status: AssignmentStatus;
  switch (visit.cp365_visitstatus) {
    case 1: // Scheduled
      status = AssignmentStatus.Unassigned;
      break;
    case 2: // Assigned
      status = AssignmentStatus.Assigned;
      break;
    case 3: // InProgress
      status = AssignmentStatus.InProgress;
      break;
    case 4: // Completed
      status = AssignmentStatus.Completed;
      break;
    case 5: // Cancelled
      status = AssignmentStatus.Cancelled;
      break;
    case 6: // Missed
      status = AssignmentStatus.Missed;
      break;
    default:
      status = AssignmentStatus.Unassigned;
  }

  return {
    id: visit.cp365_visitid,
    type: 'visit',
    date: visit.cp365_visitdate.split('T')[0],
    startTime: visit.cp365_scheduledstarttime,
    endTime: visit.cp365_scheduledendtime,
    durationMinutes: visit.cp365_durationminutes,
    staffMemberId: visit.cp365_staffmemberid || null,
    staffMemberName: staffMember?.cp365_staffmembername || visit.cp365_staffmember?.cp365_staffmembername,
    staffMemberJobTitle: staffMember?.cp365_jobtitle || visit.cp365_staffmember?.cp365_jobtitle,
    locationId: location?.cp365_locationid || serviceUser?._cp365_location_value || '',
    locationName: location?.cp365_locationname || '',
    activityName: getVisitTypeName(visit.cp365_visittypecode),
    status,
    serviceUserId: visit.cp365_serviceuserid,
    serviceUserName: serviceUser?.cp365_fullname || visit.cp365_serviceuser?.cp365_fullname,
    serviceUserAddress: serviceUser?.cp365_currentaddress || visit.cp365_serviceuser?.cp365_currentaddress,
    serviceUserLatitude: serviceUser?.cp365_latitude || visit.cp365_serviceuser?.cp365_latitude,
    serviceUserLongitude: serviceUser?.cp365_longitude || visit.cp365_serviceuser?.cp365_longitude,
    _sourceVisit: visit,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse a time string (HH:mm) to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get display name for visit type code
 */
function getVisitTypeName(code: number): string {
  const visitTypeNames: Record<number, string> = {
    1: 'Morning',
    2: 'Lunch',
    3: 'Afternoon',
    4: 'Tea',
    5: 'Evening',
    6: 'Bedtime',
    7: 'Night',
    8: 'Waking Night',
    9: 'Sleep In',
    10: 'Emergency',
    11: 'Assessment',
    12: 'Review',
  };
  return visitTypeNames[code] || 'Visit';
}

/**
 * Check if an assignment is from residential care (shift-based)
 */
export function isResidentialAssignment(assignment: SwappableAssignment): boolean {
  return assignment.type === 'shift';
}

/**
 * Check if an assignment is from domiciliary care (visit-based)
 */
export function isDomiciliaryAssignment(assignment: SwappableAssignment): boolean {
  return assignment.type === 'visit';
}

/**
 * Get a display label for the assignment type
 */
export function getAssignmentTypeLabel(type: AssignmentType): string {
  return type === 'shift' ? 'Shift' : 'Visit';
}

/**
 * Get a display label for the assignment status
 */
export function getAssignmentStatusLabel(status: AssignmentStatus): string {
  const statusLabels: Record<AssignmentStatus, string> = {
    [AssignmentStatus.Unassigned]: 'Unassigned',
    [AssignmentStatus.Assigned]: 'Assigned',
    [AssignmentStatus.InProgress]: 'In Progress',
    [AssignmentStatus.Completed]: 'Completed',
    [AssignmentStatus.Cancelled]: 'Cancelled',
    [AssignmentStatus.Missed]: 'Missed',
    [AssignmentStatus.Open]: 'Open',
  };
  return statusLabels[status] || 'Unknown';
}

/**
 * Format assignment time range for display
 */
export function formatAssignmentTimeRange(assignment: SwappableAssignment): string {
  const hours = Math.floor(assignment.durationMinutes / 60);
  const minutes = assignment.durationMinutes % 60;
  const durationStr = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${assignment.startTime} - ${assignment.endTime} (${durationStr})`;
}

/**
 * Format assignment date for display
 */
export function formatAssignmentDate(assignment: SwappableAssignment): string {
  const date = new Date(assignment.date);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
