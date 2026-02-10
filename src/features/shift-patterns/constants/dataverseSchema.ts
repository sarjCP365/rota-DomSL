/**
 * Dataverse Schema Reference for Shift Patterns Feature
 *
 * This file documents the exact column names from Dataverse to ensure
 * correct OData queries. The SchemaName is used for navigation properties
 * in $expand and @odata.bind references.
 *
 * IMPORTANT: The SchemaName casing varies by table!
 * - Some tables use lowercase (cp365_staffmember)
 * - Some tables use PascalCase (cp365_StaffMember)
 *
 * Generated from Dataverse metadata API on 2025-12-21
 */

// =============================================================================
// TABLE: cp365_shiftpatterntemplatenew (Shift Pattern Template)
// =============================================================================
export const PATTERN_TEMPLATE = {
  entityName: 'cp365_shiftpatterntemplatenews',
  primaryId: 'cp365_shiftpatterntemplatenewid',
  primaryName: 'cp365_name',

  // Custom columns
  columns: {
    name: 'cp365_name',
    rotationCycleWeeks: 'cp365_sp_rotationcycleweeks',
    description: 'cp365_sp_description',
    isStandardTemplate: 'cp365_sp_isstandardtemplate',
    patternStatus: 'cp365_sp_patternstatus',
    defaultPublishStatus: 'cp365_sp_defaultpublishstatus',
    generationWindowWeeks: 'cp365_sp_generationwindowweeks',
    averageWeeklyHours: 'cp365_sp_averageweeklyhours',
    totalRotationHours: 'cp365_sp_totalrotationhours',
  },

  // Lookup columns - NOTE: cr482_ prefix for location!
  lookups: {
    location: {
      logicalName: 'cr482_location',
      schemaName: 'cr482_Location', // PascalCase
      valueField: '_cr482_location_value',
    },
    shiftReference: {
      logicalName: 'cp365_shiftreference',
      schemaName: 'cp365_ShiftReference', // PascalCase
      valueField: '_cp365_shiftreference_value',
    },
    shiftActivity: {
      logicalName: 'cp365_shiftactivity',
      schemaName: 'cp365_shiftactivity', // lowercase
      valueField: '_cp365_shiftactivity_value',
    },
  },
} as const;

// =============================================================================
// TABLE: cp365_shiftpatternday (Shift Pattern Day)
// =============================================================================
export const PATTERN_DAY = {
  entityName: 'cp365_shiftpatterndays',
  primaryId: 'cp365_shiftpatterndayid',
  primaryName: 'cp365_name',

  // Custom columns
  columns: {
    name: 'cp365_name',
    weekNumber: 'cp365_sp_weeknumber',
    dayOfWeek: 'cp365_sp_dayofweek',
    startTime: 'cp365_sp_starttime',
    endTime: 'cp365_sp_endtime',
    isRestDay: 'cp365_sp_isrestday',
    isOvernight: 'cp365_sp_isovernight',
    breakMinutes: 'cp365_sp_breakminutes',
    displayOrder: 'cp365_sp_displayorder',
  },

  // Lookup columns
  lookups: {
    patternTemplate: {
      logicalName: 'cp365_shiftpatterntemplate',
      schemaName: 'cp365_shiftpatterntemplate', // lowercase!
      valueField: '_cp365_shiftpatterntemplate_value',
    },
  },
} as const;

// =============================================================================
// TABLE: cp365_staffpatternassignment (Staff Pattern Assignment)
// =============================================================================
export const STAFF_ASSIGNMENT = {
  entityName: 'cp365_staffpatternassignments',
  primaryId: 'cp365_staffpatternassignmentid',
  primaryName: 'cp365_name',

  // Custom columns
  columns: {
    name: 'cp365_name',
    startDate: 'cp365_sp_startdate',
    endDate: 'cp365_sp_enddate',
    rotationStartWeek: 'cp365_sp_rotationstartweek',
    priority: 'cp365_sp_priority',
    assignmentStatus: 'cp365_sp_assignmentstatus',
    publishStatus: 'cp365_sp_publishstatus',
    overridePublishStatus: 'cp365_sp_overridepublishstatus',
    lastGeneratedDate: 'cp365_sp_lastgenerateddate',
    appliesToDays: 'cp365_sp_appliestodays',
  },

  // Lookup columns - ALL LOWERCASE SchemaNames!
  lookups: {
    staffMember: {
      logicalName: 'cp365_staffmember',
      schemaName: 'cp365_staffmember', // lowercase!
      valueField: '_cp365_staffmember_value',
    },
    patternTemplate: {
      logicalName: 'cp365_shiftpatterntemplate',
      schemaName: 'cp365_shiftpatterntemplate', // lowercase!
      valueField: '_cp365_shiftpatterntemplate_value',
    },
  },
} as const;

// =============================================================================
// TABLE: cp365_shift (Shift)
// =============================================================================
export const SHIFT = {
  entityName: 'cp365_shifts',
  primaryId: 'cp365_shiftid',
  primaryName: 'cp365_name',

  // Pattern-related columns - NOTE: cr482_ prefix!
  patternColumns: {
    isGeneratedFromPattern: 'cr482_sp_isgeneratedfrompattern',
    patternDayOfWeek: 'cr482_sp_patterndayofweek',
    patternWeek: 'cr482_sp_patternweek',
  },

  // Lookup columns - PascalCase SchemaNames!
  lookups: {
    staffMember: {
      logicalName: 'cp365_staffmember',
      schemaName: 'cp365_StaffMember', // PascalCase!
      valueField: '_cp365_staffmember_value',
    },
    rota: {
      logicalName: 'cp365_rota',
      schemaName: 'cp365_Rota', // PascalCase!
      valueField: '_cp365_rota_value',
    },
    shiftReference: {
      logicalName: 'cp365_shiftreference',
      schemaName: 'cp365_ShiftReference', // PascalCase!
      valueField: '_cp365_shiftreference_value',
    },
    sublocation: {
      logicalName: 'cp365_sublocation',
      schemaName: 'cp365_Sublocation', // PascalCase!
      valueField: '_cp365_sublocation_value',
    },
  },
} as const;

// =============================================================================
// TABLE: cp365_sublocationstaff (Junction table for Staff-Sublocation)
// =============================================================================
export const SUBLOCATION_STAFF = {
  entityName: 'cp365_sublocationstaffs',
  primaryId: 'cp365_sublocationstaffid',
  primaryName: 'cp365_sublocationstaffname',

  // Lookup columns - PascalCase SchemaNames!
  lookups: {
    staffMember: {
      logicalName: 'cp365_staffmember',
      schemaName: 'cp365_StaffMember', // PascalCase!
      valueField: '_cp365_staffmember_value',
    },
    sublocation: {
      logicalName: 'cp365_sublocation',
      schemaName: 'cp365_Sublocation', // PascalCase!
      valueField: '_cp365_sublocation_value',
    },
  },
} as const;

// =============================================================================
// HELPER: Get navigation property name for @odata.bind or $expand
// =============================================================================
export function getNavigationProperty(
  table: 'patternTemplate' | 'patternDay' | 'staffAssignment' | 'shift' | 'sublocationStaff',
  lookup: string
): string {
  const schemas = {
    patternTemplate: PATTERN_TEMPLATE.lookups,
    patternDay: PATTERN_DAY.lookups,
    staffAssignment: STAFF_ASSIGNMENT.lookups,
    shift: SHIFT.lookups,
    sublocationStaff: SUBLOCATION_STAFF.lookups,
  };

  const tableSchema = schemas[table] as Record<string, { schemaName: string }>;
  return tableSchema[lookup]?.schemaName || lookup;
}
