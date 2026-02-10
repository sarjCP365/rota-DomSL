/**
 * Shift Swap Types
 *
 * Type definitions for the shift swap management feature.
 * Supports both residential shifts and domiciliary visits.
 */

import type { AssignmentType, SwappableAssignment } from './assignment';

// =============================================================================
// SWAP STATUS
// =============================================================================

/**
 * Status values for a shift swap request
 * Mapped to Dataverse option set codes
 */
export const ShiftSwapStatus = {
  /** Staff initiated, waiting for colleague to respond */
  AwaitingRecipient: 100000000,
  /** Colleague accepted, needs manager approval */
  AwaitingManagerApproval: 100000001,
  /** Manager approved, swap completed */
  Approved: 100000002,
  /** Colleague declined the swap */
  RejectedByRecipient: 100000003,
  /** Manager declined the swap */
  RejectedByManager: 100000004,
  /** Initiator cancelled the request */
  Cancelled: 100000005,
  /** Request timed out without response */
  Expired: 100000006,
} as const;
export type ShiftSwapStatus = (typeof ShiftSwapStatus)[keyof typeof ShiftSwapStatus];

/**
 * String labels for swap status (for display)
 */
export type ShiftSwapStatusLabel =
  | 'AwaitingRecipient'
  | 'AwaitingManagerApproval'
  | 'Approved'
  | 'RejectedByRecipient'
  | 'RejectedByManager'
  | 'Cancelled'
  | 'Expired';

// =============================================================================
// SHIFT SWAP RECORD
// =============================================================================

/**
 * Summary of a shift or visit being swapped
 */
export interface SwapAssignmentSummary {
  /** Assignment ID (shift or visit) */
  id: string;
  /** Type of assignment */
  type: AssignmentType;
  /** Date of the assignment */
  date: string;
  /** Start time (HH:mm) */
  startTime: string;
  /** End time (HH:mm) */
  endTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Shift reference or visit type name */
  activityName?: string;
  /** Staff member currently assigned (before swap) */
  staffMemberName?: string;
  /** Location name */
  locationName?: string;
  /** Service user name (visits only) */
  serviceUserName?: string;
}

/**
 * Full swap request record from Dataverse
 * 
 * Note: Uses cp365_swaprequest table (NOT cp365_shiftswap which is used by legacy app)
 */
export interface ShiftSwap {
  /** Primary key - maps to cp365_swaprequestid in Dataverse */
  cp365_swaprequestid: string;

  /** Auto-generated name (SR-000001 format) */
  cp365_name: string;

  // === Staff Involved ===

  /** ID of staff member requesting the swap (initiator) */
  _cp365_requestfrom_value: string;
  /** Name of initiator (expanded) */
  requestFromName?: string;
  /** Job title of initiator */
  requestFromJobTitle?: string;
  /** Photo URL of initiator */
  requestFromPhoto?: string;

  /** ID of staff member being asked to swap (recipient) */
  _cp365_requestto_value: string;
  /** Name of recipient (expanded) */
  requestToName?: string;
  /** Job title of recipient */
  requestToJobTitle?: string;
  /** Photo URL of recipient */
  requestToPhoto?: string;

  // === Assignments Involved ===

  /** Type of assignments being swapped */
  assignmentType: AssignmentType;

  /** Original shift ID (if shift swap) */
  _cp365_originalshift_value?: string;
  /** Original shift details (expanded) */
  originalShiftDetails?: SwapAssignmentSummary;

  /** Original visit ID (if visit swap) */
  _cp365_originalvisit_value?: string;
  /** Original visit details (expanded) */
  originalVisitDetails?: SwapAssignmentSummary;

  /** Requested shift ID (if shift swap) */
  _cp365_requestedshift_value?: string;
  /** Requested shift details (expanded) */
  requestedShiftDetails?: SwapAssignmentSummary;

  /** Requested visit ID (if visit swap) */
  _cp365_requestedvisit_value?: string;
  /** Requested visit details (expanded) */
  requestedVisitDetails?: SwapAssignmentSummary;

  // === Status ===

  /** Current status (option set value) - maps to cp365_requeststatus in Dataverse */
  cp365_requeststatus: ShiftSwapStatus;
  /** Status as label (for display) */
  swapStatusLabel?: ShiftSwapStatusLabel;

  // === Flags ===

  /** Whether swap is within advance notice period */
  cp365_advancenoticebreached?: boolean;

  /** Whether initiator has reached monthly swap limit */
  cp365_initiatorlimitreached?: boolean;

  /** Whether recipient has reached monthly swap limit */
  cp365_recipientlimitreached?: boolean;

  // === Notes ===

  /** Notes from the person requesting the swap */
  cp365_notesfrominitiator?: string;

  /** Notes from the recipient when accepting/declining */
  cp365_notesfromrecipient?: string;

  /** Notes from manager when approving/rejecting */
  cp365_managernotes?: string;

  // === Timestamps ===

  /** When the swap request was created */
  createdon: string;

  /** When the recipient responded */
  cp365_recipientrespondeddate?: string;

  /** When the manager approved - maps to cp365_approveddate in Dataverse */
  cp365_approveddate?: string;

  /** When the swap was completed (assignments updated) - maps to cp365_completeddate in Dataverse */
  cp365_completeddate?: string;

  /** When the request expires */
  cp365_expiresdate?: string;

  // === Rota Reference ===

  /** Rota ID for location filtering */
  _cp365_rota_value: string;

  /** Location ID (derived from rota) */
  _cp365_location_value?: string;

  /** Location name (for display) */
  locationName?: string;

  // === State ===

  /** Record state (0=Active, 1=Inactive) */
  statecode: number;
}

// =============================================================================
// SWAP REQUEST CREATION
// =============================================================================

/**
 * Data required to create a new swap request
 */
export interface CreateSwapRequest {
  /** ID of staff member initiating the swap */
  initiatorStaffId: string;

  /** ID of staff member being asked to swap */
  recipientStaffId: string;

  /** Assignment the initiator wants to give away */
  initiatorAssignment: SwappableAssignment;

  /** Assignment the initiator wants (from recipient) */
  recipientAssignment: SwappableAssignment;

  /** Notes from the initiator explaining the request */
  notes?: string;
}

// =============================================================================
// MANAGER APPROVAL
// =============================================================================

/**
 * Request to approve or reject a swap
 */
export interface SwapApprovalRequest {
  /** Swap ID */
  swapId: string;

  /** Whether to approve */
  approved: boolean;

  /** Manager's notes (required for rejection) */
  managerNotes?: string;
}

/**
 * Result of a swap approval/rejection action
 */
export interface SwapApprovalResult {
  /** Whether the action succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** The swap ID that was processed */
  swapId: string;

  /** New status after the action */
  newStatus: ShiftSwapStatus;
}

// =============================================================================
// FILTERING & QUERIES
// =============================================================================

/**
 * Filter options for querying pending swaps
 */
export interface PendingSwapsFilter {
  /** Filter by location */
  locationId?: string;

  /** Filter by sublocation */
  sublocationId?: string;

  /** Filter by status(es) */
  status?: ShiftSwapStatus[];

  /** Filter by date range (swap request date) */
  dateFrom?: string;
  dateTo?: string;

  /** Filter by shift/visit date range */
  assignmentDateFrom?: string;
  assignmentDateTo?: string;

  /** Filter by staff member (as initiator or recipient) */
  staffMemberId?: string;

  /** Only show swaps with advance notice breached */
  advanceNoticeBreachedOnly?: boolean;

  /** Filter by assignment type */
  assignmentType?: AssignmentType;
}

/**
 * Summary statistics for pending swaps
 */
export interface PendingSwapsSummary {
  /** Total awaiting manager approval */
  awaitingApproval: number;

  /** Number with advance notice breached (urgent) */
  advanceNoticeBreached: number;

  /** Swaps affecting this week */
  thisWeek: number;

  /** Swaps affecting this month */
  thisMonth: number;

  /** Breakdown by assignment type */
  byType: {
    shifts: number;
    visits: number;
  };
}

/**
 * Staff member's swap usage for the month
 */
export interface StaffSwapUsage {
  /** Staff member ID */
  staffMemberId: string;

  /** Staff member name */
  staffName: string;

  /** Number of swaps this month (pending + approved) */
  swapsThisMonth: number;

  /** Monthly limit */
  monthlyLimit: number;

  /** Whether limit has been reached */
  limitReached: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert status code to label
 */
export function getSwapStatusLabel(status: ShiftSwapStatus): ShiftSwapStatusLabel {
  const statusMap: Record<ShiftSwapStatus, ShiftSwapStatusLabel> = {
    [ShiftSwapStatus.AwaitingRecipient]: 'AwaitingRecipient',
    [ShiftSwapStatus.AwaitingManagerApproval]: 'AwaitingManagerApproval',
    [ShiftSwapStatus.Approved]: 'Approved',
    [ShiftSwapStatus.RejectedByRecipient]: 'RejectedByRecipient',
    [ShiftSwapStatus.RejectedByManager]: 'RejectedByManager',
    [ShiftSwapStatus.Cancelled]: 'Cancelled',
    [ShiftSwapStatus.Expired]: 'Expired',
  };
  return statusMap[status];
}

/**
 * Get display text for status
 */
export function getSwapStatusDisplayText(status: ShiftSwapStatus): string {
  const displayMap: Record<ShiftSwapStatus, string> = {
    [ShiftSwapStatus.AwaitingRecipient]: 'Awaiting Colleague',
    [ShiftSwapStatus.AwaitingManagerApproval]: 'Awaiting Approval',
    [ShiftSwapStatus.Approved]: 'Approved',
    [ShiftSwapStatus.RejectedByRecipient]: 'Declined by Colleague',
    [ShiftSwapStatus.RejectedByManager]: 'Rejected',
    [ShiftSwapStatus.Cancelled]: 'Cancelled',
    [ShiftSwapStatus.Expired]: 'Expired',
  };
  return displayMap[status];
}

/**
 * Get status colour for UI
 */
export function getSwapStatusColour(status: ShiftSwapStatus): string {
  const colourMap: Record<ShiftSwapStatus, string> = {
    [ShiftSwapStatus.AwaitingRecipient]: 'text-amber-600 bg-amber-50',
    [ShiftSwapStatus.AwaitingManagerApproval]: 'text-blue-600 bg-blue-50',
    [ShiftSwapStatus.Approved]: 'text-green-600 bg-green-50',
    [ShiftSwapStatus.RejectedByRecipient]: 'text-red-600 bg-red-50',
    [ShiftSwapStatus.RejectedByManager]: 'text-red-600 bg-red-50',
    [ShiftSwapStatus.Cancelled]: 'text-gray-600 bg-gray-50',
    [ShiftSwapStatus.Expired]: 'text-gray-600 bg-gray-50',
  };
  return colourMap[status];
}

/**
 * Check if a swap is in a terminal state (no further action possible)
 */
export function isSwapTerminal(status: ShiftSwapStatus): boolean {
  return [
    ShiftSwapStatus.Approved,
    ShiftSwapStatus.RejectedByRecipient,
    ShiftSwapStatus.RejectedByManager,
    ShiftSwapStatus.Cancelled,
    ShiftSwapStatus.Expired,
  ].includes(status);
}

/**
 * Check if a swap requires manager action
 */
export function requiresManagerAction(status: ShiftSwapStatus): boolean {
  return status === ShiftSwapStatus.AwaitingManagerApproval;
}

/**
 * Check if a swap is urgent (advance notice breached)
 */
export function isSwapUrgent(swap: ShiftSwap): boolean {
  return !!swap.cp365_advancenoticebreached;
}

/**
 * Get the "giving" and "receiving" assignments from a swap
 * Returns assignments from the initiator's perspective
 */
export function getSwapAssignments(swap: ShiftSwap): {
  giving: SwapAssignmentSummary | undefined;
  receiving: SwapAssignmentSummary | undefined;
} {
  if (swap.assignmentType === 'shift') {
    return {
      giving: swap.originalShiftDetails,
      receiving: swap.requestedShiftDetails,
    };
  }
  return {
    giving: swap.originalVisitDetails,
    receiving: swap.requestedVisitDetails,
  };
}

/**
 * Type guard for checking if status awaits recipient
 */
export function isAwaitingRecipient(status: ShiftSwapStatus): status is typeof ShiftSwapStatus.AwaitingRecipient {
  return status === ShiftSwapStatus.AwaitingRecipient;
}

/**
 * Type guard for checking if status awaits manager
 */
export function isAwaitingManager(status: ShiftSwapStatus): status is typeof ShiftSwapStatus.AwaitingManagerApproval {
  return status === ShiftSwapStatus.AwaitingManagerApproval;
}
