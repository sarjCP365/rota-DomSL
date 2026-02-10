/**
 * CarePoint 365 - Shift Patterns Feature Types
 * TypeScript interfaces for the Shift Patterns feature
 *
 * Naming Convention:
 * - All custom columns use the `cp365_sp_` prefix (sp = shift pattern)
 * - Primary columns use `cp365_name` (Dataverse convention)
 * - Lookup columns use the related table name (e.g., `cp365_staffmember`)
 */

import type {
  ShiftReference,
  ShiftActivity,
  StaffMember,
  Shift,
  Location,
} from '@/api/dataverse/types';

// =============================================================================
// ENUMS (as const objects for erasableSyntaxOnly compatibility)
// =============================================================================

export const PatternPublishStatus = {
  Published: 1001,
  Unpublished: 1009,
} as const;
export type PatternPublishStatus = (typeof PatternPublishStatus)[keyof typeof PatternPublishStatus];

export const GenerationWindow = {
  OneWeek: 1,
  TwoWeeks: 2,
  FourWeeks: 4,
} as const;
export type GenerationWindow = (typeof GenerationWindow)[keyof typeof GenerationWindow];

export const PatternStatus = {
  Active: 1,
  Inactive: 2,
  Archived: 3,
} as const;
export type PatternStatus = (typeof PatternStatus)[keyof typeof PatternStatus];

export const AssignmentStatus = {
  Active: 1,
  Ended: 2,
  Superseded: 3,
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const DayOfWeek = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
} as const;
export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export const GenerationType = {
  Manual: 1,
  Scheduled: 2,
  OnDemand: 3,
} as const;
export type GenerationType = (typeof GenerationType)[keyof typeof GenerationType];

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * Shift Pattern Template - Reusable pattern definitions
 * Table: cp365_shiftpatterntemplatenew
 * EntitySet: cp365_shiftpatterntemplatenews
 */
export interface ShiftPatternTemplate {
  cp365_shiftpatterntemplatenewid: string;
  cp365_name: string;
  cp365_sp_description?: string;
  cp365_sp_rotationcycleweeks: number;
  cp365_sp_averageweeklyhours?: number;
  cp365_sp_totalrotationhours?: number;
  cp365_sp_isstandardtemplate: boolean;
  cp365_sp_defaultpublishstatus: PatternPublishStatus;
  cp365_sp_generationwindowweeks: GenerationWindow;
  cp365_sp_patternstatus: PatternStatus;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;

  // Location lookup - patterns belong to a location
  // Note: Uses cr482_location (different publisher prefix)
  _cr482_location_value?: string;
  cr482_location?: Location;

  // Navigation properties (when expanded)
  cp365_shiftpatterntemplate_days?: ShiftPatternDay[];
}

/**
 * Shift Pattern Day - Individual day definitions within a pattern
 * Table: cp365_shiftpatternday
 * EntitySet: cp365_shiftpatterndaies
 *
 * Note: cp365_sp_starttime and cp365_sp_endtime are DateTime fields with a fixed
 * dummy date (e.g., 1900-01-01). When displaying or using these values, extract
 * only the time portion. When generating actual shifts, combine the time with
 * the real shift date.
 */
export interface ShiftPatternDay {
  cp365_shiftpatterndayid: string;
  cp365_name: string;
  _cp365_shiftpatterntemplate_value: string;
  cp365_sp_weeknumber: number;
  cp365_sp_dayofweek: DayOfWeek;
  _cp365_shiftreference_value?: string;
  cp365_sp_starttime?: string; // DateTime with dummy date - extract time only
  cp365_sp_endtime?: string; // DateTime with dummy date - extract time only
  cp365_sp_breakminutes?: number;
  cp365_sp_isrestday: boolean;
  cp365_sp_isovernight: boolean;
  _cp365_shiftactivity_value?: string;
  cp365_sp_displayorder?: number;

  // Expanded lookups - Dataverse navigation property names are ALWAYS lowercase
  cp365_shiftpatterntemplate?: ShiftPatternTemplate;
  cp365_shiftreference?: ShiftReference;
  cp365_shiftactivity?: ShiftActivity;
}

/**
 * Staff Pattern Assignment - Links staff to patterns
 * Table: cp365_staffpatternassignment
 * EntitySet: cp365_staffpatternassignments
 */
export interface StaffPatternAssignment {
  cp365_staffpatternassignmentid: string;
  cp365_name: string;
  _cp365_staffmember_value: string;
  _cp365_shiftpatterntemplate_value: string;
  cp365_sp_startdate: string;
  cp365_sp_enddate?: string;
  cp365_sp_rotationstartweek: number;
  cp365_sp_priority: number;
  cp365_sp_appliestodays?: string; // JSON array, e.g., '["Monday","Tuesday"]'
  cp365_sp_overridepublishstatus?: boolean;
  cp365_sp_publishstatus?: PatternPublishStatus;
  cp365_sp_lastgenerateddate?: string;
  cp365_sp_assignmentstatus: AssignmentStatus;
  statecode: number;
  statuscode: number;

  // Expanded lookups - Dataverse navigation property names are ALWAYS lowercase
  cp365_staffmember?: StaffMember;
  cp365_shiftpatterntemplate?: ShiftPatternTemplate;
}

/**
 * Shift Generation Log - Audit trail for generation operations
 * Table: cp365_shiftgenerationlog
 * EntitySet: cp365_shiftgenerationlog
 */
export interface ShiftGenerationLog {
  cp365_shiftgenerationlogid: string;
  cp365_name: string;
  _cp365_staffpatternassignment_value: string;
  cp365_sp_generationdate: string;
  cp365_sp_periodstart: string;
  cp365_sp_periodend: string;
  cp365_sp_shiftsgenerated: number;
  cp365_sp_conflictsdetected: number;
  cp365_sp_conflictdetails?: string; // JSON string of conflict details
  cp365_sp_generationtype: GenerationType;
  _cp365_sp_generatedby_value?: string;

  // Expanded lookups - Dataverse navigation property names are ALWAYS lowercase
  cp365_staffpatternassignment?: StaffPatternAssignment;
}

/**
 * Extended Shift type with pattern-related fields
 * These fields are added to the existing cp365_shift entity
 * NOTE: These columns use 'cr482_sp_' prefix in Dataverse, not 'cp365_sp_'
 */
export interface ShiftWithPattern extends Shift {
  cr482_sp_isgeneratedfrompattern?: boolean;
  cr482_sp_patternweek?: number;
  cr482_sp_patterndayofweek?: number;
  _cp365_staffpatternassignment_value?: string;

  // Expanded lookup - Dataverse navigation property names are ALWAYS lowercase
  cp365_staffpatternassignment?: StaffPatternAssignment;
}

// =============================================================================
// FORM DATA TYPES (for UI forms)
// =============================================================================

/**
 * Form data for creating/editing a pattern template
 */
export interface PatternFormData {
  name: string;
  description?: string;
  rotationCycleWeeks: number;
  defaultPublishStatus: PatternPublishStatus;
  generationWindowWeeks: GenerationWindow;
  isStandardTemplate: boolean;
  /** Location ID - patterns belong to a specific location */
  locationId?: string;
  days: PatternDayFormData[];
}

/**
 * Form data for a single pattern day
 */
export interface PatternDayFormData {
  weekNumber: number;
  dayOfWeek: DayOfWeek;
  isRestDay: boolean;
  shiftReferenceId?: string;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  breakMinutes?: number;
  isOvernight: boolean;
  shiftActivityId?: string;
}

/**
 * Form data for creating a staff pattern assignment
 */
export interface AssignmentFormData {
  staffMemberId: string;
  patternTemplateId: string;
  startDate: string;
  endDate?: string;
  rotationStartWeek: number;
  priority: number;
  appliesToDays?: string[]; // Day names, e.g., ['Monday', 'Tuesday']
  overridePublishStatus: boolean;
  publishStatus?: PatternPublishStatus;
}

/**
 * Options for bulk assignment
 */
export interface BulkAssignmentOptions {
  patternTemplateId: string;
  staffMemberIds: string[];
  startDate: string;
  endDate?: string;
  staggerType: 'same' | 'stagger' | 'custom';
  staggerSettings?: Map<string, number>; // staffId -> rotationStartWeek
  publishStatus?: PatternPublishStatus;
  overridePublishStatus: boolean;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Conflict detected during pattern assignment or generation
 */
export interface PatternConflict {
  date: string;
  type: 'existing_shift' | 'approved_leave' | 'pending_leave' | 'other_pattern';
  description: string;
  existingShiftId?: string;
  existingLeaveId?: string;
  existingPatternAssignmentId?: string;
  patternWouldCreate: {
    startTime: string;
    endTime: string;
    shiftReferenceName?: string;
  };
}

/**
 * Result of a shift generation operation
 */
export interface GenerationResult {
  assignmentId: string;
  shiftsCreated: Shift[];
  shiftsSkipped: {
    date: string;
    reason: string;
  }[];
  conflicts: PatternConflict[];
  errors: string[];
  periodStart: string;
  periodEnd: string;
}

/**
 * Coverage gap identified in analysis
 */
export interface CoverageGap {
  date: string;
  shiftReferenceId: string;
  shiftReferenceName: string;
  required: number;
  assigned: number;
  gap: number;
  estimatedHours: number;
}

/**
 * Coverage analysis result
 */
export interface CoverageAnalysis {
  periodStart: string;
  periodEnd: string;
  sublocationId: string;
  gaps: CoverageGap[];
  totalGapHours: number;
  coveragePercentage: number;
}

/**
 * Filter options for pattern templates
 */
export interface PatternTemplateFilters {
  searchTerm?: string;
  status?: PatternStatus | 'all';
  type?: 'standard' | 'custom' | 'all';
  sortBy?: 'name_asc' | 'name_desc' | 'created_desc' | 'usage';
  /** Filter patterns by location ID */
  locationId?: string;
}

/**
 * Options for shift generation
 */
export interface GenerateShiftsOptions {
  assignmentId: string;
  startDate: Date;
  endDate: Date;
  /** Rota ID to associate shifts with - REQUIRED for shifts to appear on the rota grid */
  rotaId: string;
  /** Sublocation ID for context (optional) */
  sublocationId?: string;
  conflictResolutions?: Map<string, 'keep' | 'override' | 'skip'>;
  dryRun?: boolean; // If true, return what would be created without creating
}

/**
 * Summary of pattern assignment counts
 */
export interface PatternAssignmentSummary {
  patternTemplateId: string;
  patternName: string;
  activeAssignments: number;
  endedAssignments: number;
  totalStaffAssigned: number;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Day of week labels for display
 */
export const DayOfWeekLabels: Record<DayOfWeek, string> = {
  [DayOfWeek.Monday]: 'Monday',
  [DayOfWeek.Tuesday]: 'Tuesday',
  [DayOfWeek.Wednesday]: 'Wednesday',
  [DayOfWeek.Thursday]: 'Thursday',
  [DayOfWeek.Friday]: 'Friday',
  [DayOfWeek.Saturday]: 'Saturday',
  [DayOfWeek.Sunday]: 'Sunday',
};

/**
 * Short day of week labels for display
 */
export const DayOfWeekShortLabels: Record<DayOfWeek, string> = {
  [DayOfWeek.Monday]: 'Mon',
  [DayOfWeek.Tuesday]: 'Tue',
  [DayOfWeek.Wednesday]: 'Wed',
  [DayOfWeek.Thursday]: 'Thu',
  [DayOfWeek.Friday]: 'Fri',
  [DayOfWeek.Saturday]: 'Sat',
  [DayOfWeek.Sunday]: 'Sun',
};

/**
 * Pattern status labels for display
 */
export const PatternStatusLabels: Record<PatternStatus, string> = {
  [PatternStatus.Active]: 'Active',
  [PatternStatus.Inactive]: 'Inactive',
  [PatternStatus.Archived]: 'Archived',
};

/**
 * Assignment status labels for display
 */
export const AssignmentStatusLabels: Record<AssignmentStatus, string> = {
  [AssignmentStatus.Active]: 'Active',
  [AssignmentStatus.Ended]: 'Ended',
  [AssignmentStatus.Superseded]: 'Superseded',
};

/**
 * Generation type labels for display
 */
export const GenerationTypeLabels: Record<GenerationType, string> = {
  [GenerationType.Manual]: 'Manual',
  [GenerationType.Scheduled]: 'Scheduled',
  [GenerationType.OnDemand]: 'On Demand',
};

/**
 * Generation window labels for display
 */
export const GenerationWindowLabels: Record<GenerationWindow, string> = {
  [GenerationWindow.OneWeek]: '1 Week',
  [GenerationWindow.TwoWeeks]: '2 Weeks',
  [GenerationWindow.FourWeeks]: '4 Weeks',
};
