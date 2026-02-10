/**
 * Configuration Types
 *
 * Type definitions for system configuration that should be loaded from
 * Dataverse rather than hard-coded. This includes swap limits, matching
 * weights, notification settings, and other configurable parameters.
 */

import type { CareType, MatchScoreWeights } from '../services/careContext';

// =============================================================================
// SWAP CONFIGURATION
// =============================================================================

/**
 * Configuration for shift swap functionality
 */
export interface SwapConfiguration {
  /** Maximum number of swaps a staff member can make per month */
  monthlyLimitPerStaff: number;

  /** Minimum days notice required for a swap request */
  advanceNoticeDays: number;

  /** Whether to block swaps within the advance notice period (vs just warning) */
  blockWithinNoticePeriod: boolean;

  /** Whether swaps require manager approval */
  requiresManagerApproval: boolean;

  /** Whether to notify L1 (direct) manager on approval */
  notifyL1Manager: boolean;

  /** Whether to notify L2 manager on approval */
  notifyL2Manager: boolean;

  /** Whether to notify L3 manager on approval */
  notifyL3Manager: boolean;

  /** Whether to auto-approve swaps between same-level staff */
  autoApproveSameLevelSwaps: boolean;

  /** Hours until a swap request expires if not responded to */
  requestExpiryHours: number;
}

/**
 * Default swap configuration values
 */
export const DEFAULT_SWAP_CONFIGURATION: SwapConfiguration = {
  monthlyLimitPerStaff: 5,
  advanceNoticeDays: 7,
  blockWithinNoticePeriod: false,
  requiresManagerApproval: true,
  notifyL1Manager: true,
  notifyL2Manager: true,
  notifyL3Manager: true,
  autoApproveSameLevelSwaps: false,
  requestExpiryHours: 72,
};

// =============================================================================
// OPEN SHIFT CONFIGURATION
// =============================================================================

/**
 * Configuration for open shift functionality
 */
export interface OpenShiftConfiguration {
  /** Default hours until an open shift offer expires */
  defaultExpiryHours: number;

  /** Minimum match score (0-100) to notify a staff member */
  minimumMatchScore: number;

  /** Working Time Directive warning threshold (hours per week) */
  wtdWarningThresholdHours: number;

  /** Whether to include staff on annual leave in notifications */
  includeStaffOnLeave: boolean;

  /** Default notification scope */
  defaultNotificationScope: 'sublocation' | 'location' | 'all';

  /** Whether to auto-assign if only one suitable candidate */
  autoAssignSingleCandidate: boolean;
}

/**
 * Default open shift configuration values
 */
export const DEFAULT_OPEN_SHIFT_CONFIGURATION: OpenShiftConfiguration = {
  defaultExpiryHours: 24,
  minimumMatchScore: 70,
  wtdWarningThresholdHours: 44,
  includeStaffOnLeave: false,
  defaultNotificationScope: 'location',
  autoAssignSingleCandidate: false,
};

// =============================================================================
// MATCHING CONFIGURATION
// =============================================================================

/**
 * Travel distance thresholds for scoring
 */
export interface TravelThresholds {
  /** Distance in miles for excellent score (e.g., 10 points) */
  excellent: number;
  /** Distance in miles for good score (e.g., 7 points) */
  good: number;
  /** Distance in miles for acceptable score (e.g., 4 points) */
  acceptable: number;
  /** Beyond this distance, score is 0 */
  maximum: number;
}

/**
 * Score point values for matching criteria
 */
export interface MatchingScorePoints {
  // Availability points
  availabilityPreferred: number;
  availabilityAvailable: number;
  availabilityOvertime: number;
  availabilityEmergencyOnly: number;

  // Continuity points
  continuityPreferred: number;
  continuityRegular: number; // 5+ visits
  continuityVisitedBefore: number; // 1-4 visits
  continuitySameTeam: number;

  // Skills points
  skillsAllRequired: number;
  skillsMostRequired: number;
  skillsBonusAdditional: number;

  // Preference points
  preferenceExplicit: number;
  preferenceGenderMatch: number;
  preferenceLanguageMatch: number;
  preferenceExcludedPenalty: number;

  // Travel points (only for domiciliary)
  travelExcellent: number;
  travelGood: number;
  travelAcceptable: number;
}

/**
 * Full matching configuration
 */
export interface MatchingConfiguration {
  /** Score weights by care type */
  weightsByCareType: Record<CareType, MatchScoreWeights>;

  /** Travel distance thresholds */
  travelThresholds: TravelThresholds;

  /** Point values for each matching criterion */
  scorePoints: MatchingScorePoints;

  /** Whether to show detailed score breakdown in UI */
  showDetailedBreakdown: boolean;
}

/**
 * Default travel thresholds
 */
export const DEFAULT_TRAVEL_THRESHOLDS: TravelThresholds = {
  excellent: 1, // < 1 mile
  good: 3, // 1-3 miles
  acceptable: 5, // 3-5 miles
  maximum: 10, // > 10 miles scores 0
};

/**
 * Default matching score points
 */
export const DEFAULT_MATCHING_SCORE_POINTS: MatchingScorePoints = {
  // Availability (max 30 before weighting)
  availabilityPreferred: 30,
  availabilityAvailable: 25,
  availabilityOvertime: 15,
  availabilityEmergencyOnly: 10,

  // Continuity (max 25 before weighting)
  continuityPreferred: 25,
  continuityRegular: 20,
  continuityVisitedBefore: 15,
  continuitySameTeam: 10,

  // Skills (max 20 before weighting)
  skillsAllRequired: 20,
  skillsMostRequired: 10,
  skillsBonusAdditional: 5,

  // Preference (max 15 before weighting, excluding penalty)
  preferenceExplicit: 15,
  preferenceGenderMatch: 10,
  preferenceLanguageMatch: 5,
  preferenceExcludedPenalty: -50,

  // Travel (max 10 before weighting)
  travelExcellent: 10,
  travelGood: 7,
  travelAcceptable: 4,
};

// =============================================================================
// SYSTEM CONFIGURATION
// =============================================================================

/**
 * Combined system configuration
 */
export interface SystemConfiguration {
  /** Swap-related configuration */
  swap: SwapConfiguration;

  /** Open shift configuration */
  openShift: OpenShiftConfiguration;

  /** Matching algorithm configuration */
  matching: MatchingConfiguration;

  /** Configuration last loaded timestamp */
  loadedAt?: string;

  /** Configuration version for cache invalidation */
  version?: string;
}

/**
 * Dataverse configuration record structure
 */
export interface DataverseConfigRecord {
  cp365_cp365configurationid: string;
  cp365_cp365configurationname: string;
  cp365_value: string;
  cp365_description?: string;
  cp365_productcategory?: string;
}

// =============================================================================
// CONFIGURATION KEYS
// =============================================================================

/**
 * Keys used to store configuration in Dataverse
 */
export const CONFIG_KEYS = {
  // Swap configuration
  SWAP_MONTHLY_LIMIT: 'swap.monthlyLimitPerStaff',
  SWAP_ADVANCE_NOTICE_DAYS: 'swap.advanceNoticeDays',
  SWAP_BLOCK_WITHIN_NOTICE: 'swap.blockWithinNoticePeriod',
  SWAP_REQUIRES_APPROVAL: 'swap.requiresManagerApproval',
  SWAP_NOTIFY_L1: 'swap.notifyL1Manager',
  SWAP_NOTIFY_L2: 'swap.notifyL2Manager',
  SWAP_NOTIFY_L3: 'swap.notifyL3Manager',
  SWAP_AUTO_APPROVE_SAME_LEVEL: 'swap.autoApproveSameLevelSwaps',
  SWAP_REQUEST_EXPIRY_HOURS: 'swap.requestExpiryHours',

  // Open shift configuration
  OPEN_SHIFT_DEFAULT_EXPIRY: 'openShift.defaultExpiryHours',
  OPEN_SHIFT_MIN_MATCH_SCORE: 'openShift.minimumMatchScore',
  OPEN_SHIFT_WTD_THRESHOLD: 'openShift.wtdWarningThresholdHours',
  OPEN_SHIFT_INCLUDE_ON_LEAVE: 'openShift.includeStaffOnLeave',
  OPEN_SHIFT_DEFAULT_SCOPE: 'openShift.defaultNotificationScope',

  // Matching configuration
  MATCHING_TRAVEL_EXCELLENT: 'matching.travel.excellent',
  MATCHING_TRAVEL_GOOD: 'matching.travel.good',
  MATCHING_TRAVEL_ACCEPTABLE: 'matching.travel.acceptable',
  MATCHING_TRAVEL_MAXIMUM: 'matching.travel.maximum',
  MATCHING_SHOW_BREAKDOWN: 'matching.showDetailedBreakdown',

  // Matching weights by care type (stored as JSON)
  MATCHING_WEIGHTS_RESIDENTIAL: 'matching.weights.residential',
  MATCHING_WEIGHTS_DOMICILIARY: 'matching.weights.domiciliary',
  MATCHING_WEIGHTS_SUPPORTED_LIVING: 'matching.weights.supported_living',
  MATCHING_WEIGHTS_EXTRA_CARE: 'matching.weights.extra_care',
  MATCHING_WEIGHTS_LIVE_IN: 'matching.weights.live_in',
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];
