/**
 * CarePoint 365 - Domiciliary & Supported Living Types
 *
 * Type definitions for visit-based scheduling used in domiciliary care
 * and supported living services. These extend the existing residential
 * care model with service-user-centric scheduling.
 */

import type { StaffMember } from '../api/dataverse/types';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/**
 * Visit status values - tracks the lifecycle of a visit
 */
export const VisitStatus = {
  /** Visit planned but no carer assigned */
  Scheduled: 1,
  /** Carer has been assigned to the visit */
  Assigned: 2,
  /** Carer has checked in, visit in progress */
  InProgress: 3,
  /** Visit completed successfully */
  Completed: 4,
  /** Visit was cancelled */
  Cancelled: 5,
  /** Visit was not completed (no check-in/out) */
  Missed: 6,
  /** Visit started after scheduled time */
  Late: 7,
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

/** String representation of visit status for display */
export type VisitStatusLabel =
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'missed'
  | 'late';

/**
 * Visit type - categorises visits by time of day/purpose
 */
export const VisitType = {
  Morning: 1,
  Lunch: 2,
  Afternoon: 3,
  Tea: 4,
  Evening: 5,
  Bedtime: 6,
  Night: 7,
  WakingNight: 8,
  SleepIn: 9,
  Emergency: 10,
  Assessment: 11,
  Review: 12,
} as const;
export type VisitType = (typeof VisitType)[keyof typeof VisitType];

/** String representation of visit type for display */
export type VisitTypeLabel =
  | 'morning'
  | 'lunch'
  | 'afternoon'
  | 'tea'
  | 'evening'
  | 'bedtime'
  | 'night'
  | 'waking_night'
  | 'sleep_in'
  | 'emergency'
  | 'assessment'
  | 'review';

/**
 * Activity category - types of care tasks performed during visits
 */
export const ActivityCategory = {
  /** Washing, dressing, toileting */
  PersonalCare: 1,
  /** Medication administration */
  Medication: 2,
  /** Cooking, preparing food */
  MealPreparation: 3,
  /** Assistance with eating */
  MealSupport: 4,
  /** Moving, transfers */
  Mobility: 5,
  /** Cleaning, laundry */
  Domestic: 6,
  /** Social interaction */
  Companionship: 7,
  /** Outings, appointments */
  Community: 8,
  /** Observations, vital signs */
  HealthMonitoring: 9,
  /** Night-time welfare checks */
  NightCheck: 10,
  /** Other activities */
  Other: 99,
} as const;
export type ActivityCategory = (typeof ActivityCategory)[keyof typeof ActivityCategory];

/** String representation of activity category */
export type ActivityCategoryLabel =
  | 'personal_care'
  | 'medication'
  | 'meal_preparation'
  | 'meal_support'
  | 'mobility'
  | 'domestic'
  | 'companionship'
  | 'community'
  | 'health_monitoring'
  | 'night_check'
  | 'other';

/**
 * Availability type - how a staff member's time slot is categorised
 */
export const AvailabilityType = {
  /** Staff is available to work */
  Available: 1,
  /** Staff is not available */
  Unavailable: 2,
  /** Staff prefers to work this time */
  Preferred: 3,
  /** Only available for emergencies */
  EmergencyOnly: 4,
} as const;
export type AvailabilityType = (typeof AvailabilityType)[keyof typeof AvailabilityType];

/** String representation of availability type */
export type AvailabilityTypeLabel = 'available' | 'unavailable' | 'preferred' | 'emergency_only';

/**
 * Relationship status - quality of service user/staff relationship
 */
export const RelationshipStatus = {
  /** Normal working relationship */
  Active: 1,
  /** Service user's preferred carer */
  Preferred: 2,
  /** Staff excluded from visiting this service user */
  Excluded: 3,
  /** Relationship no longer active */
  Inactive: 4,
} as const;
export type RelationshipStatus = (typeof RelationshipStatus)[keyof typeof RelationshipStatus];

/** String representation of relationship status */
export type RelationshipStatusLabel = 'active' | 'preferred' | 'excluded' | 'inactive';

/**
 * Funding type - how service user's care is funded
 */
export const FundingType = {
  LocalAuthority: 1,
  NhsChc: 2,
  Private: 3,
  Mixed: 4,
} as const;
export type FundingType = (typeof FundingType)[keyof typeof FundingType];

/** String representation of funding type */
export type FundingTypeLabel = 'local_authority' | 'nhs_chc' | 'private' | 'mixed';

/**
 * Gender preference for care
 */
export const GenderPreference = {
  Male: 1,
  Female: 2,
  NoPreference: 3,
} as const;
export type GenderPreference = (typeof GenderPreference)[keyof typeof GenderPreference];

/** String representation of gender preference */
export type GenderPreferenceLabel = 'male' | 'female' | 'no_preference';

/**
 * Care package type - distinguishes service types
 */
export const CarePackageType = {
  Domiciliary: 1,
  SupportedLiving: 2,
  ExtraCareSheltered: 3,
  LiveIn: 4,
} as const;
export type CarePackageType = (typeof CarePackageType)[keyof typeof CarePackageType];

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * Extended Service User for domiciliary/supported living
 * Contains address and care requirement information needed for visit scheduling
 */
export interface DomiciliaryServiceUser {
  /** Primary key */
  cp365_serviceuserid: string;
  /** Full name (first + last) */
  cp365_fullname: string;
  /** Preferred name/nickname */
  cp365_preferredname?: string;
  /** Date of birth */
  cp365_dateofbirth?: string;
  /** Photo URL or base64 */
  cp365_photo?: string;

  // Address for visit location
  /** Full address string */
  cp365_currentaddress: string;
  /** Postcode */
  cp365_postcode: string;
  /** GPS latitude for routing */
  cp365_latitude?: number;
  /** GPS longitude for routing */
  cp365_longitude?: number;

  // Care requirements
  /** How care is funded */
  cp365_fundingtype?: FundingType;
  /** Funded hours per week */
  cp365_weeklyfundedhours?: number;
  /** Care plan notes and requirements */
  cp365_careplannotes?: string;
  /** Type of care package */
  cp365_carepackagetype?: CarePackageType;

  // Preferences
  /** Preferred carer gender */
  cp365_preferredgender?: GenderPreference;
  /** Key safe location and code instructions */
  cp365_keysafelocation?: string;
  /** Access notes (entry instructions, parking, etc.) */
  cp365_accessnotes?: string;
  /** Contact phone number */
  cp365_phonenumber?: string;
  /** Emergency contact name */
  cp365_emergencycontactname?: string;
  /** Emergency contact phone */
  cp365_emergencycontactphone?: string;

  // Status
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;
  /** Date service user started receiving care */
  cp365_admissiondate?: string;
  /** Date service user stopped receiving care */
  cp365_dischargedate?: string;

  // Lookups
  /** Location/branch this service user belongs to */
  _cp365_location_value?: string;
}

/**
 * Visit - the core scheduling entity for domiciliary care
 * Represents a scheduled care visit to a service user
 */
export interface Visit {
  /** Primary key */
  cp365_visitid: string;
  /** Auto-generated name: "{ServiceUser} - {Type}" */
  cp365_visitname: string;

  // Service User
  /** Foreign key to service user */
  cp365_serviceuserid: string;
  /** Expanded service user (when loaded) */
  cp365_serviceuser?: DomiciliaryServiceUser;

  // Timing
  /** Date of the visit (ISO date string) */
  cp365_visitdate: string;
  /** Scheduled start time (HH:mm format) */
  cp365_scheduledstarttime: string;
  /** Scheduled end time (HH:mm format) */
  cp365_scheduledendtime: string;
  /** Duration in minutes */
  cp365_durationminutes: number;

  // Assignment
  /** Assigned staff member ID (nullable) */
  cp365_staffmemberid?: string;
  /** Expanded staff member (when loaded) */
  cp365_staffmember?: StaffMember;
  /** Assigned agency worker ID (nullable) */
  cp365_agencyworkerid?: string;

  // Status
  /** Current visit status */
  cp365_visitstatus: VisitStatus;
  /** Actual start time (recorded on check-in) */
  cp365_actualstarttime?: string;
  /** Actual end time (recorded on check-out) */
  cp365_actualendtime?: string;

  // Verification (mobile check-in/out)
  /** Timestamp when carer checked in */
  cp365_checkintime?: string;
  /** Timestamp when carer checked out */
  cp365_checkouttime?: string;
  /** GPS latitude at check-in */
  cp365_checkinlatitude?: number;
  /** GPS longitude at check-in */
  cp365_checkinlongitude?: number;
  /** GPS latitude at check-out */
  cp365_checkoutlatitude?: number;
  /** GPS longitude at check-out */
  cp365_checkoutlongitude?: number;

  // Visit type
  /** Category of visit (morning, lunch, etc.) */
  cp365_visittypecode: VisitType;
  /** Whether this visit is part of a recurring pattern */
  cp365_isrecurring: boolean;
  /** Link to recurrence pattern if recurring */
  cp365_recurrencepatternid?: string;

  // Round/Run grouping
  /** Link to round this visit belongs to */
  cp365_roundid?: string;
  /** Order within the round (1, 2, 3...) */
  cp365_sequenceorder?: number;

  // Notes
  /** Notes for this specific visit */
  cp365_visitnotes?: string;
  /** Reason if visit was cancelled */
  cp365_cancellationreason?: string;

  // System fields
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;
  /** When record was created */
  createdon: string;
  /** When record was last modified */
  modifiedon: string;

  // Lookups (Dataverse format)
  _cp365_serviceuser_value?: string;
  _cp365_staffmember_value?: string;
  _cp365_agencyworker_value?: string;
  _cp365_round_value?: string;
  _cp365_recurrencepattern_value?: string;
}

/**
 * Visit Activity - a task to be performed during a visit
 */
export interface VisitActivity {
  /** Primary key */
  cp365_visitactivityid: string;
  /** Foreign key to visit */
  cp365_visitid: string;

  // Activity details
  /** Name of the activity */
  cp365_activityname: string;
  /** Detailed description */
  cp365_activitydescription?: string;
  /** Category of activity */
  cp365_activitycategorycode: ActivityCategory;

  // Completion tracking
  /** Whether activity has been completed */
  cp365_iscompleted: boolean;
  /** When activity was completed */
  cp365_completedtime?: string;
  /** Notes recorded on completion */
  cp365_completednotes?: string;
  /** Who completed the activity */
  cp365_completedby?: string;

  // Requirements
  /** Whether this activity is mandatory */
  cp365_isrequired: boolean;
  /** Estimated duration in minutes */
  cp365_estimatedminutes?: number;
  /** Whether two carers are required */
  cp365_requirestwocarer: boolean;

  // Medication specific
  /** Link to medication record if applicable */
  cp365_medicationid?: string;
  /** Dosage instructions */
  cp365_dosage?: string;

  // Display
  /** Sort order within the visit */
  cp365_displayorder: number;

  // System
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;

  // Lookups
  _cp365_visit_value?: string;
  _cp365_medication_value?: string;
}

/**
 * Staff Availability - defines when a staff member is available to work
 */
export interface StaffAvailability {
  /** Primary key */
  cp365_staffavailabilityid: string;
  /** Foreign key to staff member */
  cp365_staffmemberid: string;

  // When (either day of week OR specific date)
  /** Day of week (1=Monday through 7=Sunday) for recurring */
  cp365_dayofweek?: number;
  /** Specific date for one-off availability */
  cp365_specificdate?: string;

  // Availability window
  /** Available from time (HH:mm) */
  cp365_availablefrom: string;
  /** Available to time (HH:mm) */
  cp365_availableto: string;

  // Type
  /** Type of availability */
  cp365_availabilitytype: AvailabilityType;
  /** Whether this is a preferred working time */
  cp365_ispreferredtime: boolean;

  // Recurring settings
  /** Whether this is a recurring pattern */
  cp365_isrecurring: boolean;
  /** When pattern becomes effective */
  cp365_effectivefrom?: string;
  /** When pattern expires */
  cp365_effectiveto?: string;

  // Notes
  /** Optional notes about this availability */
  cp365_notes?: string;

  // System
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;

  // Lookups
  _cp365_staffmember_value?: string;
}

/**
 * Service User Staff Relationship - tracks continuity of care
 */
export interface ServiceUserStaffRelationship {
  /** Primary key */
  cp365_relationshipid: string;
  /** Foreign key to service user */
  cp365_serviceuserid: string;
  /** Foreign key to staff member */
  cp365_staffmemberid: string;

  // Relationship quality
  /** Status of the relationship */
  cp365_relationshipstatus: RelationshipStatus;
  /** Whether this is a preferred carer for the service user */
  cp365_ispreferredcarer: boolean;
  /** Whether staff is excluded from visiting this service user */
  cp365_isexcluded: boolean;
  /** Reason for exclusion */
  cp365_exclusionreason?: string;

  // Visit history
  /** Date of first visit */
  cp365_firstvisitdate?: string;
  /** Date of most recent visit */
  cp365_lastvisitdate?: string;
  /** Total number of visits */
  cp365_totalvisits: number;

  // Calculated metrics
  /** Continuity score (0-100) based on visit frequency/consistency */
  cp365_continuityscore?: number;

  // System
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;

  // Lookups
  _cp365_serviceuser_value?: string;
  _cp365_staffmember_value?: string;
}

/**
 * Round - groups visits together for geographic efficiency
 */
export interface Round {
  /** Primary key */
  cp365_roundid: string;
  /** Display name (e.g., "Morning Round A") */
  cp365_roundname: string;

  // Timing
  /** Type of visits in this round */
  cp365_roundtype: VisitType;
  /** Start time of round (HH:mm) */
  cp365_starttime: string;
  /** End time of round (HH:mm) */
  cp365_endtime: string;

  // Assignment
  /** Staff member assigned to this round */
  cp365_staffmemberid?: string;
  /** Expanded staff member */
  cp365_staffmember?: StaffMember;

  // Template settings
  /** Whether this is a reusable template */
  cp365_istemplate: boolean;
  /** Day of week if template (1=Monday through 7=Sunday) */
  cp365_dayofweek?: number;

  // Geographic
  /** Link to geographic area */
  cp365_areaid?: string;
  /** Estimated total travel time in minutes */
  cp365_estimatedtravelminutes?: number;

  // Statistics (calculated)
  /** Number of visits in this round */
  cp365_visitcount?: number;
  /** Total duration of all visits in minutes */
  cp365_totaldurationminutes?: number;

  // System
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;

  // Lookups
  _cp365_staffmember_value?: string;
  _cp365_area_value?: string;

  // Expanded collections (when loaded)
  visits?: Visit[];
}

/**
 * Geographic Area - defines a geographic region for round planning
 */
export interface GeographicArea {
  /** Primary key */
  cp365_areaid: string;
  /** Display name (e.g., "Central", "North") */
  cp365_areaname: string;

  // Coverage
  /** Postcode prefixes covered (e.g., ["SW1A", "SW1B"]) */
  cp365_postcodeprefix: string;
  /** Centre point latitude */
  cp365_centerlatitude: number;
  /** Centre point longitude */
  cp365_centerlongitude: number;
  /** Coverage radius in miles */
  cp365_radiusmiles: number;

  // Display
  /** Hex colour for map display */
  cp365_colour: string;

  // System
  /** Record state (0=Active, 1=Inactive) */
  statecode: number;
}

// =============================================================================
// AVAILABILITY PATTERN TYPES
// =============================================================================

/**
 * A single availability slot within a day
 */
export interface AvailabilitySlot {
  /** Start time (HH:mm) */
  startTime: string;
  /** End time (HH:mm) */
  endTime: string;
  /** Type of availability */
  type: AvailabilityType;
  /** Whether this is a preferred time */
  isPreferred: boolean;
}

/**
 * Availability for a single day
 */
export interface DayAvailability {
  /** Whether staff is available this day at all */
  isAvailable: boolean;
  /** Time slots available */
  slots: AvailabilitySlot[];
  /** Notes for this day */
  notes?: string;
}

/**
 * Weekly availability pattern - staff's regular working pattern
 */
export interface WeeklyAvailabilityPattern {
  /** Primary key */
  cp365_patternid: string;
  /** Staff member this pattern belongs to */
  cp365_staffmemberid: string;
  /** Name of the pattern */
  cp365_patternname: string;

  // Each day's availability
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;

  // Validity period
  /** When pattern becomes effective */
  cp365_effectivefrom: string;
  /** When pattern expires (optional) */
  cp365_effectiveto?: string;
  /** Whether pattern is currently active */
  cp365_isactive: boolean;
}

/**
 * Availability exception - overrides regular pattern for specific date
 */
export interface AvailabilityException {
  /** Primary key */
  cp365_exceptionid: string;
  /** Staff member */
  cp365_staffmemberid: string;
  /** Date of exception */
  cp365_date: string;
  /** Type: unavailable, additional, or modified */
  cp365_exceptiontype: 'unavailable' | 'additional' | 'modified';
  /** Override slots (for modified type) */
  cp365_slots?: AvailabilitySlot[];
  /** Reason for exception */
  cp365_reason?: string;
  /** Whether exception is approved */
  cp365_isapproved: boolean;
  /** Who approved the exception */
  cp365_approvedby?: string;
}

/**
 * Calculated availability for a specific date (combining pattern + exceptions)
 */
export interface StaffAvailabilityForDate {
  /** Staff member ID */
  staffMemberId: string;
  /** The date */
  date: string;
  /** Available time slots */
  availableSlots: AvailabilitySlot[];
  /** Already booked slots */
  bookedSlots: { start: string; end: string; visitId: string }[];
  /** Remaining capacity in minutes */
  remainingCapacity: number;
  /** Whether there are exceptions on this date */
  hasExceptions: boolean;
}

// =============================================================================
// VIEW & UI TYPES
// =============================================================================

/**
 * Service user with their visits for display in rota grid
 */
export interface ServiceUserWithVisits {
  serviceUser: DomiciliaryServiceUser;
  visits: Visit[];
  /** Total scheduled hours for the period */
  totalScheduledHours: number;
  /** Funded hours for the period */
  fundedHours: number;
  /** Unassigned visit count */
  unassignedCount: number;
}

/**
 * Visit with calculated/display fields
 */
export interface VisitWithDetails extends Visit {
  /** Activities for this visit */
  activities: VisitActivity[];
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Computed display colour based on status */
  displayColour: string;
  /** Whether visit is overdue */
  isOverdue: boolean;
}

/**
 * Round with calculated fields for display
 */
export interface RoundWithStats extends Round {
  /** Visits in this round */
  visits: Visit[];
  /** Total duration of visits in minutes */
  totalVisitMinutes: number;
  /** Total travel time between visits */
  totalTravelMinutes: number;
  /** Number of service users */
  serviceUserCount: number;
  /** Whether all visits are assigned */
  isFullyAssigned: boolean;
}

// =============================================================================
// MATCHING & ASSIGNMENT TYPES
// =============================================================================

/**
 * Criteria for matching staff to visits
 */
export interface MatchingCriteria {
  /** The visit to match */
  visit: Visit;
  /** Service user receiving care */
  serviceUser: DomiciliaryServiceUser;
  /** Required capabilities/skills */
  requiredSkills?: string[];
  /** IDs of preferred carers */
  preferredCarers?: string[];
  /** IDs of excluded carers */
  excludedCarers?: string[];
  /** Whether to consider travel time */
  considerTravel?: boolean;
  /** Location of previous visit (for travel calculation) */
  previousVisitLocation?: { lat: number; lng: number };
}

/**
 * Breakdown of how a match score was calculated
 */
export interface MatchScoreBreakdown {
  /** Score for availability (0-30) */
  availabilityScore: number;
  /** Score for continuity with service user (0-25) */
  continuityScore: number;
  /** Score for having required skills (0-20) */
  skillsScore: number;
  /** Score for matching preferences (0-15) */
  preferenceScore: number;
  /** Score for travel efficiency (0-10) */
  travelScore: number;
}

/**
 * Result of matching a staff member to a visit
 */
export interface MatchResult {
  /** The staff member */
  staffMember: StaffMember;
  /** Total match score (0-100) */
  score: number;
  /** Breakdown of score components */
  breakdown: MatchScoreBreakdown;
  /** Whether staff is available */
  isAvailable: boolean;
  /** Whether staff has required skills */
  hasRequiredSkills: boolean;
  /** Warning messages */
  warnings: string[];
}

// =============================================================================
// TRAVEL & GEOGRAPHIC TYPES
// =============================================================================

/**
 * Travel estimate between two locations
 */
export interface TravelEstimate {
  /** Service user ID of origin */
  fromServiceUserId: string;
  /** Service user ID of destination */
  toServiceUserId: string;
  /** Distance in miles */
  distanceMiles: number;
  /** Duration in minutes */
  durationMinutes: number;
  /** Travel mode */
  mode: 'driving' | 'walking' | 'public_transport';
}

/**
 * Constraints for round optimisation
 */
export interface RoundConstraints {
  /** Maximum visits per round */
  maxVisitsPerRound: number;
  /** Maximum total duration in minutes */
  maxDurationMinutes: number;
  /** Maximum travel time in minutes */
  maxTravelMinutes: number;
  /** Whether to prefer continuity of care */
  preferContinuity: boolean;
}

// =============================================================================
// UTILITY TYPES & HELPERS
// =============================================================================

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Type guard: Check if a value is a valid VisitStatus
 */
export function isVisitStatus(value: unknown): value is VisitStatus {
  return (
    typeof value === 'number' &&
    Object.values(VisitStatus).includes(value as VisitStatus)
  );
}

/**
 * Type guard: Check if a value is a valid VisitType
 */
export function isVisitType(value: unknown): value is VisitType {
  return (
    typeof value === 'number' &&
    Object.values(VisitType).includes(value as VisitType)
  );
}

/**
 * Type guard: Check if a value is a valid ActivityCategory
 */
export function isActivityCategory(value: unknown): value is ActivityCategory {
  return (
    typeof value === 'number' &&
    Object.values(ActivityCategory).includes(value as ActivityCategory)
  );
}

/**
 * Get display label for visit status
 */
export function getVisitStatusLabel(status: VisitStatus): VisitStatusLabel {
  const labels: Record<VisitStatus, VisitStatusLabel> = {
    [VisitStatus.Scheduled]: 'scheduled',
    [VisitStatus.Assigned]: 'assigned',
    [VisitStatus.InProgress]: 'in_progress',
    [VisitStatus.Completed]: 'completed',
    [VisitStatus.Cancelled]: 'cancelled',
    [VisitStatus.Missed]: 'missed',
    [VisitStatus.Late]: 'late',
  };
  return labels[status];
}

/**
 * Get display label for visit type
 */
export function getVisitTypeLabel(type: VisitType): VisitTypeLabel {
  const labels: Record<VisitType, VisitTypeLabel> = {
    [VisitType.Morning]: 'morning',
    [VisitType.Lunch]: 'lunch',
    [VisitType.Afternoon]: 'afternoon',
    [VisitType.Tea]: 'tea',
    [VisitType.Evening]: 'evening',
    [VisitType.Bedtime]: 'bedtime',
    [VisitType.Night]: 'night',
    [VisitType.WakingNight]: 'waking_night',
    [VisitType.SleepIn]: 'sleep_in',
    [VisitType.Emergency]: 'emergency',
    [VisitType.Assessment]: 'assessment',
    [VisitType.Review]: 'review',
  };
  return labels[type];
}

/**
 * Get display label for activity category
 */
export function getActivityCategoryLabel(category: ActivityCategory): ActivityCategoryLabel {
  const labels: Record<ActivityCategory, ActivityCategoryLabel> = {
    [ActivityCategory.PersonalCare]: 'personal_care',
    [ActivityCategory.Medication]: 'medication',
    [ActivityCategory.MealPreparation]: 'meal_preparation',
    [ActivityCategory.MealSupport]: 'meal_support',
    [ActivityCategory.Mobility]: 'mobility',
    [ActivityCategory.Domestic]: 'domestic',
    [ActivityCategory.Companionship]: 'companionship',
    [ActivityCategory.Community]: 'community',
    [ActivityCategory.HealthMonitoring]: 'health_monitoring',
    [ActivityCategory.NightCheck]: 'night_check',
    [ActivityCategory.Other]: 'other',
  };
  return labels[category];
}

/**
 * Get human-readable display name for visit type
 */
export function getVisitTypeDisplayName(type: VisitType): string {
  const names: Record<VisitType, string> = {
    [VisitType.Morning]: 'Morning',
    [VisitType.Lunch]: 'Lunch',
    [VisitType.Afternoon]: 'Afternoon',
    [VisitType.Tea]: 'Tea',
    [VisitType.Evening]: 'Evening',
    [VisitType.Bedtime]: 'Bedtime',
    [VisitType.Night]: 'Night',
    [VisitType.WakingNight]: 'Waking Night',
    [VisitType.SleepIn]: 'Sleep In',
    [VisitType.Emergency]: 'Emergency',
    [VisitType.Assessment]: 'Assessment',
    [VisitType.Review]: 'Review',
  };
  return names[type];
}

/**
 * Get human-readable display name for visit status
 */
export function getVisitStatusDisplayName(status: VisitStatus): string {
  const names: Record<VisitStatus, string> = {
    [VisitStatus.Scheduled]: 'Scheduled',
    [VisitStatus.Assigned]: 'Assigned',
    [VisitStatus.InProgress]: 'In Progress',
    [VisitStatus.Completed]: 'Completed',
    [VisitStatus.Cancelled]: 'Cancelled',
    [VisitStatus.Missed]: 'Missed',
    [VisitStatus.Late]: 'Late',
  };
  return names[status];
}

/**
 * Get human-readable display name for activity category
 */
export function getActivityCategoryDisplayName(category: ActivityCategory): string {
  const names: Record<ActivityCategory, string> = {
    [ActivityCategory.PersonalCare]: 'Personal Care',
    [ActivityCategory.Medication]: 'Medication',
    [ActivityCategory.MealPreparation]: 'Meal Preparation',
    [ActivityCategory.MealSupport]: 'Meal Support',
    [ActivityCategory.Mobility]: 'Mobility',
    [ActivityCategory.Domestic]: 'Domestic',
    [ActivityCategory.Companionship]: 'Companionship',
    [ActivityCategory.Community]: 'Community',
    [ActivityCategory.HealthMonitoring]: 'Health Monitoring',
    [ActivityCategory.NightCheck]: 'Night Check',
    [ActivityCategory.Other]: 'Other',
  };
  return names[category];
}
