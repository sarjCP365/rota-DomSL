/**
 * Open Shift Types
 *
 * Type definitions for open shift functionality.
 * Supports both residential shifts and domiciliary visits.
 */

import type { AssignmentType, SwappableAssignment } from './assignment';
import type { MatchResult } from '../services/staffMatching';

// =============================================================================
// OPEN SHIFT STATUS
// =============================================================================

/**
 * Status values for an open shift offer
 */
export const OpenShiftOfferStatus = {
  /** Offer has been sent, awaiting response */
  Pending: 1,
  /** Staff member accepted the offer */
  Accepted: 2,
  /** Staff member declined the offer */
  Declined: 3,
  /** Offer expired without response */
  Expired: 4,
  /** Offer was cancelled (assignment filled another way) */
  Cancelled: 5,
} as const;
export type OpenShiftOfferStatus = (typeof OpenShiftOfferStatus)[keyof typeof OpenShiftOfferStatus];

/**
 * Status for the open shift itself
 */
export const OpenShiftStatus = {
  /** Shift is open and notifications are active */
  Open: 1,
  /** Shift has been filled (accepted by someone) */
  Filled: 2,
  /** Open shift was closed without being filled */
  Closed: 3,
  /** All offers expired */
  Expired: 4,
} as const;
export type OpenShiftStatus = (typeof OpenShiftStatus)[keyof typeof OpenShiftStatus];

// =============================================================================
// OPEN SHIFT CONFIGURATION
// =============================================================================

/**
 * Scope of notifications for an open shift
 */
export type NotificationScope = 'sublocation' | 'location' | 'all';

/**
 * Configuration for an open shift
 */
export interface OpenShiftConfig {
  /** Scope of staff to notify */
  notificationScope: NotificationScope;
  /** Minimum match score (0-100) required to be notified */
  minimumMatchScore: number;
  /** Hours until offers expire */
  expiresInHours: number;
  /** Whether to include staff currently on leave */
  includeStaffOnLeave: boolean;
}

// =============================================================================
// OPEN SHIFT OFFER
// =============================================================================

/**
 * An offer to a specific staff member for an open shift
 */
export interface OpenShiftOffer {
  /** Unique identifier */
  cp365_openshiftofferid: string;

  /** Reference to the open shift record */
  _cp365_openshift_value: string;

  /** Staff member who received the offer */
  _cp365_staffmember_value: string;
  staffMemberName?: string;
  staffMemberJobTitle?: string;

  /** Match score at time of offer */
  cp365_matchscore: number;

  /** Score breakdown */
  cp365_scorebreakdown?: string; // JSON string of MatchScoreBreakdown

  /** Current status of this offer */
  cp365_offerstatus: OpenShiftOfferStatus;

  /** When the offer was sent */
  cp365_offereddate: string;

  /** When the staff member responded */
  cp365_respondeddate?: string;

  /** Response notes from staff member */
  cp365_responsenotes?: string;

  /** Whether offer has expired */
  cp365_isexpired: boolean;

  /** Record state */
  statecode: number;
}

/**
 * Open shift offer with parsed score breakdown
 */
export interface OpenShiftOfferWithDetails extends OpenShiftOffer {
  /** Parsed score breakdown */
  scoreBreakdown?: MatchResult['breakdown'];
}

// =============================================================================
// OPEN SHIFT RECORD
// =============================================================================

/**
 * An open shift record (the parent of offers)
 */
export interface OpenShift {
  /** Unique identifier */
  cp365_openshiftid: string;

  /** Reference to the assignment (shift or visit) */
  assignmentType: AssignmentType;
  _cp365_shift_value?: string;
  _cp365_visit_value?: string;

  /** Assignment details (populated) */
  assignmentDetails?: SwappableAssignment;

  /** Current status */
  cp365_status: OpenShiftStatus;

  /** Configuration used */
  cp365_notificationscope: NotificationScope;
  cp365_minimummatchscore: number;
  cp365_expiresat: string;

  /** Timestamps */
  cp365_createddate: string;
  cp365_filleddate?: string;
  cp365_closeddate?: string;

  /** Who filled it (if filled) */
  _cp365_filledby_value?: string;
  filledByName?: string;

  /** Statistics */
  cp365_offercount: number;
  cp365_acceptedcount: number;
  cp365_declinedcount: number;
  cp365_pendingcount: number;

  /** Related offers */
  offers?: OpenShiftOfferWithDetails[];

  /** Location for filtering */
  _cp365_location_value?: string;
  locationName?: string;

  /** Record state */
  statecode: number;
}

// =============================================================================
// REQUESTS & RESPONSES
// =============================================================================

/**
 * Request to mark a shift/visit as open
 */
export interface MarkAsOpenRequest {
  /** Assignment to mark as open */
  assignmentId: string;
  assignmentType: AssignmentType;

  /** Configuration */
  config: OpenShiftConfig;
}

/**
 * Result of marking a shift as open
 */
export interface MarkAsOpenResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** The created open shift record */
  openShift?: OpenShift;

  /** Number of staff notified */
  notifiedCount: number;

  /** Summary of candidates */
  candidates: CandidateSummary[];
}

/**
 * Summary of a candidate for an open shift
 */
export interface CandidateSummary {
  /** Staff member ID */
  staffMemberId: string;

  /** Staff member name */
  staffName: string;

  /** Job title */
  jobTitle?: string;

  /** Match score */
  matchScore: number;

  /** Whether they are available */
  isAvailable: boolean;

  /** Whether offer was sent */
  offerSent: boolean;

  /** Warnings about this candidate */
  warnings: string[];
}

/**
 * Staff member's response to an open shift offer
 */
export interface OpenShiftResponse {
  /** Offer ID */
  offerId: string;

  /** Whether they accept */
  accept: boolean;

  /** Notes/reason */
  notes?: string;
}

/**
 * Result of responding to an open shift
 */
export interface OpenShiftResponseResult {
  /** Whether the response was processed */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Whether the shift was assigned (only if accepted) */
  assigned?: boolean;

  /** Message to show the user */
  message?: string;
}

// =============================================================================
// FILTERING & QUERIES
// =============================================================================

/**
 * Filter options for open shifts
 */
export interface OpenShiftsFilter {
  /** Filter by status */
  status?: OpenShiftStatus[];

  /** Filter by assignment type */
  assignmentType?: AssignmentType;

  /** Filter by location */
  locationId?: string;

  /** Filter by date range (assignment date) */
  dateFrom?: string;
  dateTo?: string;

  /** Only show expiring soon (within X hours) */
  expiringSoonHours?: number;
}

/**
 * Summary of open shifts for dashboard
 */
export interface OpenShiftsSummary {
  /** Total open */
  open: number;

  /** Filled today */
  filledToday: number;

  /** Expired without being filled */
  expired: number;

  /** By assignment type */
  byType: {
    shifts: number;
    visits: number;
  };

  /** Expiring within 24 hours */
  expiringSoon: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get display text for open shift status
 */
export function getOpenShiftStatusText(status: OpenShiftStatus): string {
  const statusText: Record<OpenShiftStatus, string> = {
    [OpenShiftStatus.Open]: 'Open',
    [OpenShiftStatus.Filled]: 'Filled',
    [OpenShiftStatus.Closed]: 'Closed',
    [OpenShiftStatus.Expired]: 'Expired',
  };
  return statusText[status] || 'Unknown';
}

/**
 * Get colour classes for open shift status
 */
export function getOpenShiftStatusColour(status: OpenShiftStatus): string {
  const colours: Record<OpenShiftStatus, string> = {
    [OpenShiftStatus.Open]: 'text-amber-600 bg-amber-50',
    [OpenShiftStatus.Filled]: 'text-emerald-600 bg-emerald-50',
    [OpenShiftStatus.Closed]: 'text-slate-600 bg-slate-50',
    [OpenShiftStatus.Expired]: 'text-red-600 bg-red-50',
  };
  return colours[status] || 'text-slate-600 bg-slate-50';
}

/**
 * Get display text for offer status
 */
export function getOfferStatusText(status: OpenShiftOfferStatus): string {
  const statusText: Record<OpenShiftOfferStatus, string> = {
    [OpenShiftOfferStatus.Pending]: 'Pending',
    [OpenShiftOfferStatus.Accepted]: 'Accepted',
    [OpenShiftOfferStatus.Declined]: 'Declined',
    [OpenShiftOfferStatus.Expired]: 'Expired',
    [OpenShiftOfferStatus.Cancelled]: 'Cancelled',
  };
  return statusText[status] || 'Unknown';
}

/**
 * Get colour classes for offer status
 */
export function getOfferStatusColour(status: OpenShiftOfferStatus): string {
  const colours: Record<OpenShiftOfferStatus, string> = {
    [OpenShiftOfferStatus.Pending]: 'text-amber-600 bg-amber-50',
    [OpenShiftOfferStatus.Accepted]: 'text-emerald-600 bg-emerald-50',
    [OpenShiftOfferStatus.Declined]: 'text-red-600 bg-red-50',
    [OpenShiftOfferStatus.Expired]: 'text-slate-600 bg-slate-50',
    [OpenShiftOfferStatus.Cancelled]: 'text-slate-600 bg-slate-50',
  };
  return colours[status] || 'text-slate-600 bg-slate-50';
}

/**
 * Check if an open shift is still active (can receive responses)
 */
export function isOpenShiftActive(openShift: OpenShift): boolean {
  return openShift.cp365_status === OpenShiftStatus.Open &&
    openShift.statecode === 0 &&
    new Date(openShift.cp365_expiresat) > new Date();
}

/**
 * Calculate time remaining until open shift expires
 */
export function getTimeRemaining(expiresAt: string): { hours: number; minutes: number } | null {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(expiresAt: string): string {
  const remaining = getTimeRemaining(expiresAt);
  if (!remaining) return 'Expired';

  if (remaining.hours > 24) {
    const days = Math.floor(remaining.hours / 24);
    return `${days}d ${remaining.hours % 24}h`;
  }

  return `${remaining.hours}h ${remaining.minutes}m`;
}
