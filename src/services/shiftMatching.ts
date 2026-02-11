/**
 * Shift Matching Service
 *
 * Adapts the visit-based staff matching algorithm to work with
 * residential care Shift entities.
 *
 * Key differences from visit matching:
 * - No travel scoring (staff work on-site)
 * - Location-based staffing levels
 * - Shift reference/activity requirements
 */

import type { Shift, StaffMember, Location } from '@/api/dataverse/types';
import type { MatchResult, MatchScoreBreakdown, MatchingOptions } from './staffMatching';
import { getDummyData } from '@/data/dummyDataGenerator';
import { createCareContext, type MatchScoreWeights, DEFAULT_MATCHING_WEIGHTS } from './careContext';
import { getMatchingConfiguration } from './configurationService';
import { AvailabilityType, type StaffAvailability } from '@/types/domiciliary';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Criteria for matching staff to a shift
 */
export interface ShiftMatchingCriteria {
  /** The shift to match */
  shift: Shift;
  /** Location of the shift */
  location?: Location;
  /** Required capabilities for the shift */
  requiredCapabilities?: string[];
  /** Preferred staff for this shift */
  preferredStaff?: string[];
  /** Excluded staff */
  excludedStaff?: string[];
}

/**
 * Extended options for shift matching
 */
export interface ShiftMatchingOptions extends MatchingOptions {
  /** Check if staff already has shifts at this time */
  checkConflicts?: boolean;
  /** Include staff who would breach WTD limits */
  includeWTDBreaches?: boolean;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate availability score for a shift (0-30 points)
 *
 * For residential care, availability is primarily about:
 * - Working on the right day
 * - Not having conflicting shifts
 */
function calculateShiftAvailabilityScore(
  staffAvailability: StaffAvailability[],
  shift: Shift,
  includeOvertime: boolean
): { score: number; isAvailable: boolean; warnings: string[] } {
  const shiftDate = new Date(shift.cp365_shiftdate);
  const dayOfWeek = shiftDate.getDay() === 0 ? 7 : shiftDate.getDay();
  const warnings: string[] = [];

  // Parse shift times
  const startTime = shift.cp365_shiftstarttime
    ? new Date(shift.cp365_shiftstarttime).toTimeString().slice(0, 5)
    : '00:00';
  const endTime = shift.cp365_shiftendtime
    ? new Date(shift.cp365_shiftendtime).toTimeString().slice(0, 5)
    : '00:00';

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

  // Check if shift time falls within any availability window
  for (const avail of dayAvailability) {
    if (startTime >= avail.cp365_availablefrom && endTime <= avail.cp365_availableto) {
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

  if (includeOvertime) {
    warnings.push('Shift time outside regular availability');
    return { score: 15, isAvailable: false, warnings };
  }

  return { score: 0, isAvailable: false, warnings: ['Not available at this time'] };
}

/**
 * Calculate continuity score for shift assignment (0-25 points)
 *
 * For residential care, this is about:
 * - Regular staff at this location
 * - Staff familiar with residents
 */
function calculateShiftContinuityScore(
  _staffMember: StaffMember,
  _locationId: string
): number {
  // Simplified - would check staff's primary location assignment
  // For now, give partial score to all staff
  return 15; // Same location bonus
}

/**
 * Calculate skills score for shift (0-20 points)
 */
function calculateShiftSkillsScore(
  staffCapabilities: string[],
  requiredCapabilities: string[]
): { score: number; hasAllSkills: boolean } {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return { score: 20, hasAllSkills: true };
  }

  const matchedSkills = requiredCapabilities.filter(skill =>
    staffCapabilities.includes(skill)
  );

  const matchRatio = matchedSkills.length / requiredCapabilities.length;

  if (matchRatio === 1) {
    return { score: 20, hasAllSkills: true };
  }

  if (matchRatio >= 0.7) {
    return { score: 10, hasAllSkills: false };
  }

  return { score: 0, hasAllSkills: false };
}

/**
 * Calculate preference score for shift (0-15 points)
 */
function calculateShiftPreferenceScore(
  staffMember: StaffMember,
  preferredStaff: string[],
  excludedStaff: string[]
): { score: number; isExcluded: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (excludedStaff.includes(staffMember.cp365_staffmemberid)) {
    return {
      score: -50,
      isExcluded: true,
      warnings: ['Staff excluded from this shift'],
    };
  }

  let score = 0;

  if (preferredStaff.includes(staffMember.cp365_staffmemberid)) {
    score += 15;
  }

  return { score, isExcluded: false, warnings };
}

/**
 * Apply weights to shift scores
 *
 * Note: For residential care, travel weight is 0, so that
 * component doesn't affect the final score.
 */
function applyShiftWeights(
  breakdown: MatchScoreBreakdown,
  weights: MatchScoreWeights
): number {
  // Normalise each score to 0-1 range
  const normAvailability = breakdown.availabilityScore / 30;
  const normContinuity = breakdown.continuityScore / 25;
  const normSkills = breakdown.skillsScore / 20;
  const normPreference = breakdown.preferenceScore / 15;
  const normTravel = 0.5; // Neutral since not applicable

  // Apply weights
  const weightedScore =
    normAvailability * weights.availability +
    normContinuity * weights.continuity +
    normSkills * weights.skills +
    normPreference * weights.preference +
    normTravel * weights.travel; // Will be 0 for residential

  return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

// =============================================================================
// MAIN MATCHING FUNCTION
// =============================================================================

/**
 * Find matching staff members for a shift
 *
 * This is the residential care equivalent of findMatchingStaff.
 * Key differences:
 * - No travel scoring
 * - Location-based rather than service-user-based
 */
export async function findMatchingStaffForShift(
  criteria: ShiftMatchingCriteria,
  options: ShiftMatchingOptions = {}
): Promise<MatchResult[]> {
  const {
    shift,
    location,
    requiredCapabilities = [],
    preferredStaff = [],
    excludedStaff = [],
  } = criteria;

  const {
    limit = 10,
    includeUnavailable = false,
    includeOvertime = false,
    checkConflicts: _checkConflicts = true,
    careContext,
  } = options;

  // Determine care context (always residential for shifts)
  const effectiveContext = careContext || createCareContext(
    'residential',
    location?.cp365_locationid || '',
    location?.cp365_locationname
  );

  // Load configuration
  let matchingConfig;
  try {
    matchingConfig = await getMatchingConfiguration();
  } catch {
    // Use defaults
  }

  const weights = effectiveContext.matchingWeights
    || matchingConfig?.weightsByCareType.residential
    || DEFAULT_MATCHING_WEIGHTS.residential;

  // Load data
  const data = await getDummyData();
  const staffMembers = data.staffMembers;
  const availability = data.availability;

  const results: MatchResult[] = [];

  for (const staff of staffMembers) {
    // Get staff's availability records
    const staffAvailability = availability.filter(
      a => a.cp365_staffmemberid === staff.cp365_staffmemberid
    );

    // Calculate availability score
    const availabilityResult = calculateShiftAvailabilityScore(
      staffAvailability,
      shift,
      includeOvertime
    );

    // Calculate continuity score (location-based)
    const continuityScore = calculateShiftContinuityScore(
      staff,
      location?.cp365_locationid || ''
    );

    // Calculate skills score
    const staffCapabilities = (staff as unknown as Record<string, unknown>).capabilities as string[] ?? [];
    const skillsResult = calculateShiftSkillsScore(staffCapabilities, requiredCapabilities);

    // Calculate preference score
    const preferenceResult = calculateShiftPreferenceScore(
      staff,
      preferredStaff,
      excludedStaff
    );

    // Skip excluded staff
    if (preferenceResult.isExcluded && !includeUnavailable) {
      continue;
    }

    // Skip unavailable staff
    if (!availabilityResult.isAvailable && !includeUnavailable && !includeOvertime) {
      continue;
    }

    // Build breakdown
    const breakdown: MatchScoreBreakdown = {
      availabilityScore: availabilityResult.score,
      continuityScore,
      skillsScore: skillsResult.score,
      preferenceScore: Math.max(0, preferenceResult.score),
      travelScore: 0, // Not applicable for residential
    };

    // Calculate weighted score
    const totalScore = applyShiftWeights(breakdown, weights);

    // Collect warnings
    const warnings = [
      ...availabilityResult.warnings,
      ...preferenceResult.warnings,
    ];

    if (!skillsResult.hasAllSkills && requiredCapabilities.length > 0) {
      warnings.push('Missing some required capabilities');
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

  return results.slice(0, limit);
}

/**
 * Get a quick match score for a specific staff member for a shift
 */
export async function getStaffShiftMatchScore(
  staffMemberId: string,
  shift: Shift,
  location?: Location
): Promise<MatchResult | null> {
  const results = await findMatchingStaffForShift(
    { shift, location },
    { limit: 100, includeUnavailable: true }
  );

  return results.find(r => r.staffMember.cp365_staffmemberid === staffMemberId) || null;
}

/**
 * Check if two staff members are compatible for a swap
 *
 * Verifies that each staff member can work the other's shift
 * based on availability and capabilities.
 */
export async function checkSwapCompatibility(
  staff1Id: string,
  shift1: Shift,
  staff2Id: string,
  shift2: Shift,
  location?: Location
): Promise<{
  compatible: boolean;
  staff1ForShift2: MatchResult | null;
  staff2ForShift1: MatchResult | null;
  warnings: string[];
}> {
  // Check if staff1 can work shift2
  const allResultsForShift2 = await findMatchingStaffForShift(
    { shift: shift2, location },
    { limit: 100, includeUnavailable: true }
  );
  const staff1ForShift2 = allResultsForShift2.find(r => r.staffMember.cp365_staffmemberid === staff1Id) || null;

  // Check if staff2 can work shift1
  const allResultsForShift1 = await findMatchingStaffForShift(
    { shift: shift1, location },
    { limit: 100, includeUnavailable: true }
  );
  const staff2ForShift1 = allResultsForShift1.find(r => r.staffMember.cp365_staffmemberid === staff2Id) || null;

  const warnings: string[] = [];
  let compatible = true;

  if (!staff1ForShift2?.isAvailable) {
    compatible = false;
    warnings.push(`${staff1ForShift2?.staffMember.cp365_staffmembername || 'Staff 1'} is not available for the other shift`);
  }

  if (!staff2ForShift1?.isAvailable) {
    compatible = false;
    warnings.push(`${staff2ForShift1?.staffMember.cp365_staffmembername || 'Staff 2'} is not available for the other shift`);
  }

  // Check for low scores
  const MIN_ACCEPTABLE_SCORE = 50;
  if (staff1ForShift2 && staff1ForShift2.score < MIN_ACCEPTABLE_SCORE) {
    warnings.push(`Low match score (${staff1ForShift2.score}) for ${staff1ForShift2.staffMember.cp365_staffmembername}`);
  }
  if (staff2ForShift1 && staff2ForShift1.score < MIN_ACCEPTABLE_SCORE) {
    warnings.push(`Low match score (${staff2ForShift1.score}) for ${staff2ForShift1.staffMember.cp365_staffmembername}`);
  }

  return {
    compatible,
    staff1ForShift2,
    staff2ForShift1,
    warnings,
  };
}
