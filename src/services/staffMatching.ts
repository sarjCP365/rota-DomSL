/**
 * Staff Matching Service
 *
 * Logic for matching staff members to visits/shifts based on:
 * - Availability
 * - Continuity (previous visits to service user)
 * - Skills/capabilities
 * - Service user preferences
 * - Travel/proximity (domiciliary only)
 *
 * Supports both residential care (shifts) and domiciliary care (visits)
 * with care-context-aware scoring weights.
 */

import type {
  Visit,
  DomiciliaryServiceUser,
  StaffAvailability,
  ServiceUserStaffRelationship,
} from '@/types/domiciliary';
import { AvailabilityType, RelationshipStatus } from '@/types/domiciliary';
import type { StaffMember } from '@/api/dataverse/types';
import { getDummyData } from '@/data/dummyDataGenerator';
import type { CareContext, MatchScoreWeights } from './careContext';
import { DEFAULT_MATCHING_WEIGHTS } from './careContext';
import { getMatchingConfiguration } from './configurationService';
import type { MatchingConfiguration, TravelThresholds } from '@/types/configuration';
import { DEFAULT_TRAVEL_THRESHOLDS } from '@/types/configuration';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Criteria for matching staff to a visit
 */
export interface MatchingCriteria {
  /** The visit to match */
  visit: Visit;
  /** The service user for the visit */
  serviceUser: DomiciliaryServiceUser;
  /** Required skills/capabilities */
  requiredSkills?: string[];
  /** Preferred carers for this service user */
  preferredCarers?: string[];
  /** Carers excluded from this service user */
  excludedCarers?: string[];
  /** Whether to consider travel time */
  considerTravel?: boolean;
  /** Previous visit location (for travel calculation) */
  previousVisitLocation?: { lat: number; lng: number };
}

/**
 * Result of matching a staff member to a visit
 */
export interface MatchResult {
  /** The staff member */
  staffMember: StaffMember;
  /** Overall match score (0-100) */
  score: number;
  /** Breakdown of how the score was calculated */
  breakdown: MatchScoreBreakdown;
  /** Whether staff is available at the visit time */
  isAvailable: boolean;
  /** Whether staff has all required skills */
  hasRequiredSkills: boolean;
  /** Any warnings about this match */
  warnings: string[];
}

/**
 * Breakdown of match score components
 */
export interface MatchScoreBreakdown {
  /** Availability score (0-30) */
  availabilityScore: number;
  /** Continuity/relationship score (0-25) */
  continuityScore: number;
  /** Skills match score (0-20) */
  skillsScore: number;
  /** Preference score (0-15) */
  preferenceScore: number;
  /** Travel/proximity score (0-10) */
  travelScore: number;
}

/**
 * Options for the matching algorithm
 */
export interface MatchingOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Include staff who aren't fully available */
  includeUnavailable?: boolean;
  /** Include staff who would require overtime */
  includeOvertime?: boolean;
  /** Care context for care-type-aware scoring */
  careContext?: CareContext;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate availability score (0-30 points)
 *
 * - 30 points: Time slot marked as "preferred"
 * - 25 points: Time slot marked as "available"
 * - 15 points: Available but overtime would apply
 * - 0 points: Not available
 */
function calculateAvailabilityScore(
  staffAvailability: StaffAvailability[],
  visit: Visit,
  includeOvertime: boolean
): { score: number; isAvailable: boolean; warnings: string[] } {
  const visitDate = new Date(visit.cp365_visitdate);
  const dayOfWeek = visitDate.getDay() === 0 ? 7 : visitDate.getDay(); // 1=Mon, 7=Sun
  const warnings: string[] = [];

  // Find availability records for this day
  const dayAvailability = staffAvailability.filter(
    a => a.cp365_dayofweek === dayOfWeek && a.statecode === 0
  );

  if (dayAvailability.length === 0) {
    if (includeOvertime) {
      warnings.push('No regular availability - would require overtime');
      return { score: 15, isAvailable: false, warnings };
    }
    return { score: 0, isAvailable: false, warnings: ['Not available on this day'] };
  }

  // Check if visit time falls within any availability window
  for (const avail of dayAvailability) {
    if (
      visit.cp365_scheduledstarttime >= avail.cp365_availablefrom &&
      visit.cp365_scheduledendtime <= avail.cp365_availableto
    ) {
      // Fully within availability window
      if (avail.cp365_ispreferredtime || avail.cp365_availabilitytype === AvailabilityType.Preferred) {
        return { score: 30, isAvailable: true, warnings: [] };
      }
      if (avail.cp365_availabilitytype === AvailabilityType.Available) {
        return { score: 25, isAvailable: true, warnings: [] };
      }
      if (avail.cp365_availabilitytype === AvailabilityType.EmergencyOnly) {
        warnings.push('Only available for emergencies');
        return { score: 10, isAvailable: true, warnings };
      }
    }
  }

  // Partial overlap or no match
  if (includeOvertime) {
    warnings.push('Visit time outside regular availability');
    return { score: 15, isAvailable: false, warnings };
  }

  return { score: 0, isAvailable: false, warnings: ['Not available at this time'] };
}

/**
 * Calculate continuity score (0-25 points)
 *
 * - 25 points: Preferred carer for this service user
 * - 20 points: Regular carer (5+ recent visits)
 * - 15 points: Has visited before (1-4 visits)
 * - 10 points: Same team/area
 * - 0 points: Never visited
 */
function calculateContinuityScore(
  relationship: ServiceUserStaffRelationship | null
): number {
  if (!relationship) return 0;

  if (relationship.cp365_relationshipstatus === RelationshipStatus.Preferred ||
      relationship.cp365_ispreferredcarer) {
    return 25;
  }

  if (relationship.cp365_totalvisits >= 5) {
    return 20;
  }

  if (relationship.cp365_totalvisits > 0) {
    return 15;
  }

  return 10; // Same team/area (fallback)
}

/**
 * Calculate skills score (0-20 points)
 *
 * - 20 points: Has all required capabilities
 * - 10 points: Has most required capabilities
 * - 0 points: Missing critical capabilities
 * - Bonus 5 points: Has additional relevant skills
 */
function calculateSkillsScore(
  staffCapabilities: string[],
  requiredSkills: string[]
): { score: number; hasAllSkills: boolean } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { score: 20, hasAllSkills: true }; // No requirements = full score
  }

  const matchedSkills = requiredSkills.filter(skill =>
    staffCapabilities.includes(skill)
  );

  const matchRatio = matchedSkills.length / requiredSkills.length;

  if (matchRatio === 1) {
    return { score: 20, hasAllSkills: true };
  }

  if (matchRatio >= 0.7) {
    return { score: 10, hasAllSkills: false };
  }

  return { score: 0, hasAllSkills: false };
}

/**
 * Calculate preference score (0-15 points)
 *
 * - 15 points: Explicitly preferred by service user
 * - -50 points: Excluded by service user (filter out unless override)
 * - 10 points: Gender preference match
 * - 5 points: Language match
 */
function calculatePreferenceScore(
  staffMember: StaffMember,
  serviceUser: DomiciliaryServiceUser,
  relationship: ServiceUserStaffRelationship | null,
  preferredCarers: string[],
  excludedCarers: string[]
): { score: number; isExcluded: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if excluded
  if (excludedCarers.includes(staffMember.cp365_staffmemberid) ||
      (relationship?.cp365_isexcluded)) {
    return {
      score: -50,
      isExcluded: true,
      warnings: [relationship?.cp365_exclusionreason || 'Staff excluded from this service user']
    };
  }

  let score = 0;

  // Check if preferred
  if (preferredCarers.includes(staffMember.cp365_staffmemberid) ||
      relationship?.cp365_ispreferredcarer) {
    score += 15;
  }

  // Gender preference match (simplified - would need gender field on staff)
  // For now, assume no preference gives partial points
  if (!serviceUser.cp365_preferredgender) {
    score += 5;
  }

  return { score, isExcluded: false, warnings };
}

/**
 * Calculate travel score (0-10 points)
 *
 * Uses Haversine formula for distance calculation.
 * Thresholds are loaded from configuration.
 *
 * @param staffLocation - Staff member's location
 * @param serviceUserLocation - Service user's location
 * @param thresholds - Configurable distance thresholds
 */
function calculateTravelScore(
  staffLocation: { lat: number; lng: number } | null,
  serviceUserLocation: { lat: number; lng: number } | null,
  thresholds: TravelThresholds = DEFAULT_TRAVEL_THRESHOLDS
): { score: number; distanceMiles: number | null } {
  if (!staffLocation || !serviceUserLocation) {
    return { score: 5, distanceMiles: null }; // Default middle score if no location data
  }

  const distance = calculateHaversineDistance(
    staffLocation.lat,
    staffLocation.lng,
    serviceUserLocation.lat,
    serviceUserLocation.lng
  );

  if (distance < thresholds.excellent) return { score: 10, distanceMiles: distance };
  if (distance < thresholds.good) return { score: 7, distanceMiles: distance };
  if (distance < thresholds.acceptable) return { score: 4, distanceMiles: distance };
  return { score: 0, distanceMiles: distance };
}

/**
 * Calculate Haversine distance between two points in miles
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// =============================================================================
// WEIGHTED SCORE CALCULATION
// =============================================================================

/**
 * Apply care-context-aware weights to raw scores
 *
 * Normalises individual component scores using the provided weights,
 * ensuring the total is out of 100.
 */
function applyWeightsToScores(
  breakdown: MatchScoreBreakdown,
  weights: MatchScoreWeights
): number {
  // Raw scores are out of their original maximums:
  // availability: 0-30, continuity: 0-25, skills: 0-20, preference: 0-15, travel: 0-10

  // Normalise each to 0-1 range
  const normAvailability = breakdown.availabilityScore / 30;
  const normContinuity = breakdown.continuityScore / 25;
  const normSkills = breakdown.skillsScore / 20;
  const normPreference = breakdown.preferenceScore / 15;
  const normTravel = breakdown.travelScore / 10;

  // Apply weights (weights sum to 100)
  const weightedScore =
    normAvailability * weights.availability +
    normContinuity * weights.continuity +
    normSkills * weights.skills +
    normPreference * weights.preference +
    normTravel * weights.travel;

  return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

// =============================================================================
// MAIN MATCHING FUNCTION
// =============================================================================

/**
 * Find matching staff members for a visit
 *
 * This is the main entry point for the staff matching algorithm.
 * It scores all available staff and returns them sorted by score.
 *
 * The algorithm now supports care-context-aware scoring:
 * - Residential care: No travel scoring (weight = 0)
 * - Domiciliary care: Full travel scoring
 * - Supported living: Higher continuity weighting
 */
export async function findMatchingStaff(
  criteria: MatchingCriteria,
  options: MatchingOptions = {}
): Promise<MatchResult[]> {
  const {
    visit,
    serviceUser,
    requiredSkills = [],
    preferredCarers = [],
    excludedCarers = [],
    considerTravel = true,
  } = criteria;

  const {
    limit = 10,
    includeUnavailable = false,
    includeOvertime = false,
    careContext,
  } = options;

  // Load matching configuration
  let matchingConfig: MatchingConfiguration | null = null;
  try {
    matchingConfig = await getMatchingConfiguration();
  } catch {
    // Use defaults if config loading fails
  }

  // Determine care type and weights
  // Default to domiciliary for visit-based matching
  const effectiveCareType = careContext?.careType || 'domiciliary';
  const weights: MatchScoreWeights = careContext?.matchingWeights
    || matchingConfig?.weightsByCareType[effectiveCareType]
    || DEFAULT_MATCHING_WEIGHTS[effectiveCareType];

  const travelThresholds = matchingConfig?.travelThresholds || DEFAULT_TRAVEL_THRESHOLDS;

  // Determine if travel should be considered based on care context
  const shouldConsiderTravel = considerTravel &&
    (careContext?.requiresTravelScoring ?? true) &&
    weights.travel > 0;

  // Load data
  const data = await getDummyData();
  const staffMembers = data.staffMembers;
  const availability = data.availability;
  const relationships = data.relationships;

  const results: MatchResult[] = [];

  for (const staff of staffMembers) {
    // Get staff's availability records
    const staffAvailability = availability.filter(
      a => a.cp365_staffmemberid === staff.cp365_staffmemberid
    );

    // Get relationship with this service user
    const relationship = relationships.find(
      r =>
        r.cp365_staffmemberid === staff.cp365_staffmemberid &&
        r.cp365_serviceuserid === serviceUser.cp365_serviceuserid
    ) || null;

    // Calculate all scores
    const availabilityResult = calculateAvailabilityScore(
      staffAvailability,
      visit,
      includeOvertime
    );

    const continuityScore = calculateContinuityScore(relationship);

    // Staff capabilities (simplified - would come from staff record)
    const staffCapabilities = (staff as unknown as Record<string, unknown>).capabilities as string[] ?? [];
    const skillsResult = calculateSkillsScore(staffCapabilities, requiredSkills);

    const preferenceResult = calculatePreferenceScore(
      staff,
      serviceUser,
      relationship,
      preferredCarers,
      excludedCarers
    );

    // Skip excluded staff unless explicitly included
    if (preferenceResult.isExcluded && !includeUnavailable) {
      continue;
    }

    // Skip unavailable staff unless explicitly included
    if (!availabilityResult.isAvailable && !includeUnavailable && !includeOvertime) {
      continue;
    }

    // Calculate travel score only if applicable to this care type
    let travelResult = { score: 5, distanceMiles: null as number | null };
    if (shouldConsiderTravel && serviceUser.cp365_latitude && serviceUser.cp365_longitude) {
      // For now, use a dummy staff location (would come from staff record or home address)
      const staffLat = ((staff as unknown as Record<string, unknown>).latitude as number) || 51.5074; // Default to London
      const staffLng = ((staff as unknown as Record<string, unknown>).longitude as number) || -0.1278;
      travelResult = calculateTravelScore(
        { lat: staffLat, lng: staffLng },
        { lat: serviceUser.cp365_latitude, lng: serviceUser.cp365_longitude },
        travelThresholds
      );
    } else if (!shouldConsiderTravel) {
      // For residential care, give neutral travel score (not used in weighting anyway)
      travelResult = { score: 5, distanceMiles: null };
    }

    // Build breakdown (raw scores before weighting)
    const breakdown: MatchScoreBreakdown = {
      availabilityScore: availabilityResult.score,
      continuityScore,
      skillsScore: skillsResult.score,
      preferenceScore: Math.max(0, preferenceResult.score), // Don't include negative in breakdown
      travelScore: travelResult.score,
    };

    // Calculate weighted total score (0-100)
    const totalScore = applyWeightsToScores(breakdown, weights);

    // Collect all warnings
    const warnings = [
      ...availabilityResult.warnings,
      ...preferenceResult.warnings,
    ];

    if (!skillsResult.hasAllSkills && requiredSkills.length > 0) {
      warnings.push('Missing some required skills');
    }

    if (shouldConsiderTravel && travelResult.distanceMiles !== null && travelResult.distanceMiles > travelThresholds.acceptable) {
      warnings.push(`Travel distance: ${travelResult.distanceMiles.toFixed(1)} miles`);
    }

    results.push({
      staffMember: staff,
      score: totalScore,
      breakdown,
      isAvailable: availabilityResult.isAvailable,
      hasRequiredSkills: skillsResult.hasAllSkills,
      warnings,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Return limited results
  return results.slice(0, limit);
}

/**
 * Get a quick match score for a specific staff member
 * Used for displaying score when staff is already selected
 */
export async function getStaffMatchScore(
  staffMemberId: string,
  visit: Visit,
  serviceUser: DomiciliaryServiceUser,
  careContext?: CareContext
): Promise<MatchResult | null> {
  const results = await findMatchingStaff(
    { visit, serviceUser },
    { limit: 100, includeUnavailable: true, careContext }
  );

  return results.find(r => r.staffMember.cp365_staffmemberid === staffMemberId) || null;
}

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

export type { CareContext, MatchScoreWeights } from './careContext';
export {
  getCareContextFromAssignment,
  getCareTypeFromAssignmentType,
  DEFAULT_MATCHING_WEIGHTS,
} from './careContext';
