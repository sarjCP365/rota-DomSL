/**
 * Care Context Service
 *
 * Determines the care type from location/entity and provides
 * appropriate matching weights and configuration for each care setting.
 *
 * This service ensures that features like staff matching, shift swaps,
 * and open shifts behave appropriately for different care contexts:
 * - Residential: No travel scoring, on-site staff
 * - Domiciliary: Travel scoring important, multiple locations
 * - Supported Living: Mixed, depends on setting
 */

import type { AssignmentType, SwappableAssignment } from '@/types/assignment';
import type { Location } from '@/api/dataverse/types';
import { CarePackageType } from '@/types/domiciliary';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Types of care settings
 */
export type CareType = 'residential' | 'domiciliary' | 'supported_living' | 'extra_care' | 'live_in';

/**
 * Score weights for the matching algorithm
 * Weights should sum to 100 for normalisation
 */
export interface MatchScoreWeights {
  /** Weight for availability score (max points available) */
  availability: number;
  /** Weight for continuity/relationship score */
  continuity: number;
  /** Weight for skills/capabilities match */
  skills: number;
  /** Weight for service user/staff preferences */
  preference: number;
  /** Weight for travel/proximity (0 for on-site care) */
  travel: number;
}

/**
 * Full context for care-aware operations
 */
export interface CareContext {
  /** The type of care being provided */
  careType: CareType;

  /** Location ID for context */
  locationId: string;

  /** Location name for display */
  locationName?: string;

  /** Whether travel scoring should be applied */
  requiresTravelScoring: boolean;

  /** Score weights for this care type */
  matchingWeights: MatchScoreWeights;

  /** Whether this is a multi-site operation (e.g., domiciliary rounds) */
  isMultiSite: boolean;

  /** Whether service user preferences should be considered */
  hasServiceUserPreferences: boolean;
}

// =============================================================================
// DEFAULT WEIGHTS BY CARE TYPE
// =============================================================================

/**
 * Default matching weights for each care type
 *
 * These are fallback values - production should load from Dataverse configuration.
 * Weights are designed so that the maximum total score is 100.
 */
export const DEFAULT_MATCHING_WEIGHTS: Record<CareType, MatchScoreWeights> = {
  /**
   * Residential Care (Care Homes)
   * - No travel (on-site)
   * - Higher availability weight since it's primary factor
   * - Continuity important for resident relationships
   */
  residential: {
    availability: 35,
    continuity: 30,
    skills: 25,
    preference: 10,
    travel: 0, // NOT APPLICABLE
  },

  /**
   * Domiciliary Care
   * - Travel is critical for efficiency
   * - Service user preferences important
   * - Multiple visits per day
   */
  domiciliary: {
    availability: 30,
    continuity: 25,
    skills: 20,
    preference: 15,
    travel: 10, // APPLICABLE
  },

  /**
   * Supported Living
   * - High continuity (relationship consistency crucial)
   * - Usually on-site or nearby
   * - Service user preferences very important
   */
  supported_living: {
    availability: 30,
    continuity: 35, // Highest - relationship consistency crucial
    skills: 20,
    preference: 15,
    travel: 0, // Usually on-site
  },

  /**
   * Extra Care / Sheltered Housing
   * - On-site like residential
   * - Mix of scheduled and ad-hoc support
   */
  extra_care: {
    availability: 35,
    continuity: 25,
    skills: 25,
    preference: 15,
    travel: 0, // On-site
  },

  /**
   * Live-In Care
   * - No travel after placement
   * - Maximum continuity (same carer for extended period)
   */
  live_in: {
    availability: 25,
    continuity: 40, // Highest - live-in requires strong relationship
    skills: 25,
    preference: 10,
    travel: 0, // NOT APPLICABLE after placement
  },
};

// =============================================================================
// CARE TYPE DETECTION
// =============================================================================

/**
 * Infer care type from assignment type
 *
 * Since residential and domiciliary use separate entities,
 * we can determine care type from the entity being used.
 */
export function getCareTypeFromAssignmentType(assignmentType: AssignmentType): CareType {
  if (assignmentType === 'shift') {
    return 'residential';
  }
  return 'domiciliary';
}

/**
 * Infer care type from CarePackageType enum
 */
export function getCareTypeFromPackageType(packageType?: CarePackageType): CareType {
  if (!packageType) {
    return 'domiciliary'; // Default for visits without package type
  }

  switch (packageType) {
    case CarePackageType.Domiciliary:
      return 'domiciliary';
    case CarePackageType.SupportedLiving:
      return 'supported_living';
    case CarePackageType.ExtraCareSheltered:
      return 'extra_care';
    case CarePackageType.LiveIn:
      return 'live_in';
    default:
      return 'domiciliary';
  }
}

/**
 * Check if a care type requires travel scoring
 */
export function requiresTravelScoring(careType: CareType): boolean {
  return careType === 'domiciliary';
}

/**
 * Check if a care type has service user preferences (vs location-based preferences)
 */
export function hasServiceUserPreferences(careType: CareType): boolean {
  return careType !== 'residential';
}

/**
 * Check if a care type involves multiple sites/locations
 */
export function isMultiSiteCare(careType: CareType): boolean {
  return careType === 'domiciliary';
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

/**
 * Create a CareContext from an assignment
 */
export function getCareContextFromAssignment(assignment: SwappableAssignment): CareContext {
  const careType = getCareTypeFromAssignmentType(assignment.type);

  // If it's a visit with a service user, try to get more specific care type
  let finalCareType = careType;
  if (assignment.type === 'visit' && assignment._sourceVisit?.cp365_serviceuser?.cp365_carepackagetype) {
    finalCareType = getCareTypeFromPackageType(assignment._sourceVisit.cp365_serviceuser.cp365_carepackagetype);
  }

  return {
    careType: finalCareType,
    locationId: assignment.locationId,
    locationName: assignment.locationName,
    requiresTravelScoring: requiresTravelScoring(finalCareType),
    matchingWeights: DEFAULT_MATCHING_WEIGHTS[finalCareType],
    isMultiSite: isMultiSiteCare(finalCareType),
    hasServiceUserPreferences: hasServiceUserPreferences(finalCareType),
  };
}

/**
 * Create a CareContext from a location and assignment type
 *
 * Used when we don't have a specific assignment but know the context
 */
export function getCareContextFromLocation(
  location: Location | null,
  assignmentType: AssignmentType
): CareContext {
  const careType = getCareTypeFromAssignmentType(assignmentType);

  return {
    careType,
    locationId: location?.cp365_locationid || '',
    locationName: location?.cp365_locationname,
    requiresTravelScoring: requiresTravelScoring(careType),
    matchingWeights: DEFAULT_MATCHING_WEIGHTS[careType],
    isMultiSite: isMultiSiteCare(careType),
    hasServiceUserPreferences: hasServiceUserPreferences(careType),
  };
}

/**
 * Create a CareContext directly from care type
 *
 * Used for configuration pages and testing
 */
export function createCareContext(
  careType: CareType,
  locationId: string = '',
  locationName?: string,
  customWeights?: Partial<MatchScoreWeights>
): CareContext {
  const defaultWeights = DEFAULT_MATCHING_WEIGHTS[careType];
  const matchingWeights = customWeights
    ? { ...defaultWeights, ...customWeights }
    : defaultWeights;

  return {
    careType,
    locationId,
    locationName,
    requiresTravelScoring: requiresTravelScoring(careType),
    matchingWeights,
    isMultiSite: isMultiSiteCare(careType),
    hasServiceUserPreferences: hasServiceUserPreferences(careType),
  };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get display label for care type
 */
export function getCareTypeLabel(careType: CareType): string {
  const labels: Record<CareType, string> = {
    residential: 'Residential Care',
    domiciliary: 'Domiciliary Care',
    supported_living: 'Supported Living',
    extra_care: 'Extra Care',
    live_in: 'Live-In Care',
  };
  return labels[careType];
}

/**
 * Get short label for care type (for badges etc.)
 */
export function getCareTypeShortLabel(careType: CareType): string {
  const labels: Record<CareType, string> = {
    residential: 'Residential',
    domiciliary: 'Domiciliary',
    supported_living: 'Supported Living',
    extra_care: 'Extra Care',
    live_in: 'Live-In',
  };
  return labels[careType];
}

/**
 * Get description of what travel scoring means for this care type
 */
export function getTravelScoringDescription(careType: CareType): string {
  if (requiresTravelScoring(careType)) {
    return 'Travel time and distance are considered when matching staff.';
  }
  return 'Travel scoring is not applicable for on-site care.';
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that matching weights sum to 100
 */
export function validateMatchingWeights(weights: MatchScoreWeights): boolean {
  const total =
    weights.availability +
    weights.continuity +
    weights.skills +
    weights.preference +
    weights.travel;
  return total === 100;
}

/**
 * Normalise weights to sum to 100
 */
export function normaliseMatchingWeights(weights: MatchScoreWeights): MatchScoreWeights {
  const total =
    weights.availability +
    weights.continuity +
    weights.skills +
    weights.preference +
    weights.travel;

  if (total === 0) {
    return DEFAULT_MATCHING_WEIGHTS.residential; // Fallback
  }

  const factor = 100 / total;
  return {
    availability: Math.round(weights.availability * factor),
    continuity: Math.round(weights.continuity * factor),
    skills: Math.round(weights.skills * factor),
    preference: Math.round(weights.preference * factor),
    travel: Math.round(weights.travel * factor),
  };
}
