/**
 * CarePoint 365 - Pattern Templates API Functions
 * CRUD operations for Shift Pattern Templates
 */

import { getDataverseClient, isDataverseClientInitialised } from '../../../api/dataverse/client';
import type {
  ShiftPatternTemplate,
  ShiftPatternDay,
  PatternFormData,
  PatternDayFormData,
  PatternTemplateFilters,
  PatternStatus,
  PatternAssignmentSummary,
} from '../types';
import { PatternStatus as PatternStatusEnum, DayOfWeek } from '../types';

/**
 * Entity set name for pattern templates
 */
const ENTITY_SET = 'cp365_shiftpatterntemplatenews';

/**
 * Select columns for pattern template queries
 */
const TEMPLATE_SELECT = [
  'cp365_shiftpatterntemplatenewid',
  'cp365_name',
  'cp365_sp_description',
  'cp365_sp_rotationcycleweeks',
  'cp365_sp_averageweeklyhours',
  'cp365_sp_totalrotationhours',
  'cp365_sp_isstandardtemplate',
  'cp365_sp_defaultpublishstatus',
  'cp365_sp_generationwindowweeks',
  'cp365_sp_patternstatus',
  '_cr482_location_value', // Location lookup (cr482 publisher prefix)
  'statecode',
  'statuscode',
  'createdon',
  'modifiedon',
];

/**
 * Fetch all pattern templates with optional filters
 */
export async function fetchPatternTemplates(
  filters?: PatternTemplateFilters
): Promise<ShiftPatternTemplate[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[PatternTemplates] Dataverse client not initialised');
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Fetching templates with filters:', filters);

    // Build filter string
    const filterParts: string[] = ['statecode eq 0']; // Active records only

    // Filter by location if specified
    // Note: Uses cr482_location (different publisher prefix)
    if (filters?.locationId) {
      filterParts.push(`_cr482_location_value eq '${filters.locationId}'`);
    }

    if (filters?.status && filters.status !== 'all') {
      filterParts.push(`cp365_sp_patternstatus eq ${filters.status}`);
    }

    if (filters?.type && filters.type !== 'all') {
      const isStandard = filters.type === 'standard';
      filterParts.push(`cp365_sp_isstandardtemplate eq ${isStandard}`);
    }

    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.replace(/'/g, "''");
      filterParts.push(
        `(contains(cp365_name,'${searchTerm}') or contains(cp365_sp_description,'${searchTerm}'))`
      );
    }

    // Build order by
    let orderby = 'cp365_name asc';
    if (filters?.sortBy === 'name_desc') {
      orderby = 'cp365_name desc';
    } else if (filters?.sortBy === 'created_desc') {
      orderby = 'createdon desc';
    }

    const templates = await client.get<ShiftPatternTemplate>(ENTITY_SET, {
      filter: filterParts.join(' and '),
      select: TEMPLATE_SELECT,
      orderby,
    });

    console.log('[PatternTemplates] Fetched', templates.length, 'templates for location:', filters?.locationId || 'all');
    return templates;
  } catch (error) {
    console.error('[PatternTemplates] Error fetching templates:', error);
    throw error;
  }
}

/**
 * Fetch a single pattern template by ID with expanded days
 */
export async function fetchPatternTemplateById(
  id: string
): Promise<ShiftPatternTemplate | null> {
  if (!isDataverseClientInitialised()) {
    console.warn('[PatternTemplates] Dataverse client not initialised');
    return null;
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Fetching template by ID:', id);

    const template = await client.getById<ShiftPatternTemplate>(ENTITY_SET, id, {
      select: TEMPLATE_SELECT,
    });

    if (!template) {
      console.warn('[PatternTemplates] Template not found:', id);
      return null;
    }

    // Fetch associated pattern days
    const days = await fetchPatternDays(id);
    template.cp365_shiftpatterntemplate_days = days;

    console.log('[PatternTemplates] Fetched template with', days.length, 'days');
    return template;
  } catch (error) {
    console.error('[PatternTemplates] Error fetching template:', error);
    throw error;
  }
}

/**
 * Create a new pattern template
 * Uses two-step process: create template, then associate location (if provided)
 */
export async function createPatternTemplate(
  data: PatternFormData
): Promise<ShiftPatternTemplate> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Creating template:', data.name, 'for location:', data.locationId);

    // Calculate hours from days
    const { averageWeeklyHours, totalRotationHours } = calculatePatternHours(
      data.days,
      data.rotationCycleWeeks
    );

    // Step 1: Create template WITHOUT location (to avoid @odata.bind issues)
    const templateData: Record<string, unknown> = {
      cp365_name: data.name,
      cp365_sp_description: data.description || null,
      cp365_sp_rotationcycleweeks: data.rotationCycleWeeks,
      cp365_sp_averageweeklyhours: averageWeeklyHours,
      cp365_sp_totalrotationhours: totalRotationHours,
      cp365_sp_isstandardtemplate: data.isStandardTemplate,
      cp365_sp_defaultpublishstatus: data.defaultPublishStatus,
      cp365_sp_generationwindowweeks: data.generationWindowWeeks,
      cp365_sp_patternstatus: PatternStatusEnum.Active,
    };

    console.log('[PatternTemplates] CREATE payload:', templateData);

    const result = await client.create<ShiftPatternTemplate>(ENTITY_SET, templateData);
    const templateId = result.cp365_shiftpatterntemplatenewid;
    console.log('[PatternTemplates] Created template:', templateId);

    // Step 2: Associate location using $ref endpoint (more reliable than @odata.bind)
    if (data.locationId) {
      console.log('[PatternTemplates] Associating location:', data.locationId);
      try {
        // Try with cr482_Location (exact schema name from user)
        await client.associate(
          ENTITY_SET,
          templateId,
          'cr482_Location',
          'cp365_locations',
          data.locationId
        );
        console.log('[PatternTemplates] Location associated successfully');
      } catch (assocError) {
        console.warn('[PatternTemplates] Failed to associate location with cr482_Location, trying lowercase:', assocError);
        try {
          // Fallback: try lowercase
          await client.associate(
            ENTITY_SET,
            templateId,
            'cr482_location',
            'cp365_locations',
            data.locationId
          );
          console.log('[PatternTemplates] Location associated successfully (lowercase)');
        } catch (assocError2) {
          console.error('[PatternTemplates] Failed to associate location:', assocError2);
          // Don't throw - template was created, just without location
        }
      }
    }

    return result;
  } catch (error) {
    console.error('[PatternTemplates] Error creating template:', error);
    throw error;
  }
}

/**
 * Update an existing pattern template
 * Uses separate association for location updates to avoid @odata.bind issues
 */
export async function updatePatternTemplate(
  id: string,
  data: Partial<PatternFormData>
): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Updating template:', id);

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.cp365_name = data.name;
    }
    if (data.description !== undefined) {
      updateData.cp365_sp_description = data.description || null;
    }
    if (data.rotationCycleWeeks !== undefined) {
      updateData.cp365_sp_rotationcycleweeks = data.rotationCycleWeeks;
    }
    if (data.isStandardTemplate !== undefined) {
      updateData.cp365_sp_isstandardtemplate = data.isStandardTemplate;
    }
    if (data.defaultPublishStatus !== undefined) {
      updateData.cp365_sp_defaultpublishstatus = data.defaultPublishStatus;
    }
    if (data.generationWindowWeeks !== undefined) {
      updateData.cp365_sp_generationwindowweeks = data.generationWindowWeeks;
    }

    // Recalculate hours if days are provided
    if (data.days && data.rotationCycleWeeks) {
      const { averageWeeklyHours, totalRotationHours } = calculatePatternHours(
        data.days,
        data.rotationCycleWeeks
      );
      updateData.cp365_sp_averageweeklyhours = averageWeeklyHours;
      updateData.cp365_sp_totalrotationhours = totalRotationHours;
    }

    // Update non-lookup fields first
    if (Object.keys(updateData).length > 0) {
      console.log('[PatternTemplates] UPDATE payload:', updateData);
      await client.update(ENTITY_SET, id, updateData);
      console.log('[PatternTemplates] Updated template fields:', id);
    }

    // Handle location association separately (more reliable than @odata.bind)
    if (data.locationId !== undefined) {
      if (data.locationId) {
        console.log('[PatternTemplates] Associating location:', data.locationId);
        try {
          await client.associate(
            ENTITY_SET,
            id,
            'cr482_Location',
            'cp365_locations',
            data.locationId
          );
          console.log('[PatternTemplates] Location associated successfully');
        } catch (assocError) {
          console.warn('[PatternTemplates] Failed with cr482_Location, trying lowercase:', assocError);
          try {
            await client.associate(
              ENTITY_SET,
              id,
              'cr482_location',
              'cp365_locations',
              data.locationId
            );
            console.log('[PatternTemplates] Location associated successfully (lowercase)');
          } catch (assocError2) {
            console.error('[PatternTemplates] Failed to associate location:', assocError2);
          }
        }
      } else {
        // Clear the location by disassociating
        console.log('[PatternTemplates] Disassociating location');
        try {
          await client.disassociate(ENTITY_SET, id, 'cr482_Location');
        } catch (disassocError) {
          console.warn('[PatternTemplates] Failed to disassociate with cr482_Location:', disassocError);
          try {
            await client.disassociate(ENTITY_SET, id, 'cr482_location');
          } catch (disassocError2) {
            console.error('[PatternTemplates] Failed to disassociate location:', disassocError2);
          }
        }
      }
    }

    console.log('[PatternTemplates] Updated template:', id);
  } catch (error) {
    console.error('[PatternTemplates] Error updating template:', error);
    throw error;
  }
}

/**
 * Delete a pattern template
 * Will fail if there are active assignments
 */
export async function deletePatternTemplate(id: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Deleting template:', id);

    // Check for active assignments first
    const assignments = await client.get('cp365_staffpatternassignments', {
      filter: `_cp365_shiftpatterntemplate_value eq '${id}' and cp365_sp_assignmentstatus eq 1`,
      select: ['cp365_staffpatternassignmentid'],
      top: 1,
    });

    if (assignments.length > 0) {
      throw new Error(
        'Cannot delete pattern template with active assignments. Please end or remove all assignments first.'
      );
    }

    await client.delete(ENTITY_SET, id);
    console.log('[PatternTemplates] Deleted template:', id);
  } catch (error) {
    console.error('[PatternTemplates] Error deleting template:', error);
    throw error;
  }
}

/**
 * Clone an existing pattern template
 */
export async function clonePatternTemplate(
  sourceId: string,
  newName: string
): Promise<ShiftPatternTemplate> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    console.log('[PatternTemplates] Cloning template:', sourceId, 'as', newName);

    // Fetch the source template with days
    const source = await fetchPatternTemplateById(sourceId);
    if (!source) {
      throw new Error('Source template not found');
    }

    // Create new template
    const newTemplate = await createPatternTemplate({
      name: newName,
      description: source.cp365_sp_description,
      rotationCycleWeeks: source.cp365_sp_rotationcycleweeks,
      defaultPublishStatus: source.cp365_sp_defaultpublishstatus,
      generationWindowWeeks: source.cp365_sp_generationwindowweeks,
      isStandardTemplate: false, // Clones are never standard templates
      days: [], // Will create days separately
    });

    // Clone all pattern days
    if (source.cp365_shiftpatterntemplate_days && source.cp365_shiftpatterntemplate_days.length > 0) {
      await bulkCreatePatternDays(
        newTemplate.cp365_shiftpatterntemplatenewid,
        source.cp365_shiftpatterntemplate_days.map((day) => ({
          weekNumber: day.cp365_sp_weeknumber,
          dayOfWeek: day.cp365_sp_dayofweek,
          isRestDay: day.cp365_sp_isrestday,
          shiftReferenceId: day._cp365_shiftreference_value,
          startTime: day.cp365_sp_starttime ? extractTimeFromDateTime(day.cp365_sp_starttime) : undefined,
          endTime: day.cp365_sp_endtime ? extractTimeFromDateTime(day.cp365_sp_endtime) : undefined,
          breakMinutes: day.cp365_sp_breakminutes,
          isOvernight: day.cp365_sp_isovernight,
          shiftActivityId: day._cp365_shiftactivity_value,
        }))
      );
    }

    // Fetch the complete new template
    return (await fetchPatternTemplateById(newTemplate.cp365_shiftpatterntemplatenewid))!;
  } catch (error) {
    console.error('[PatternTemplates] Error cloning template:', error);
    throw error;
  }
}

/**
 * Archive a pattern template (set status to Archived)
 */
export async function archivePatternTemplate(id: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Archiving template:', id);

    await client.update(ENTITY_SET, id, {
      cp365_sp_patternstatus: PatternStatusEnum.Archived,
    });

    console.log('[PatternTemplates] Archived template:', id);
  } catch (error) {
    console.error('[PatternTemplates] Error archiving template:', error);
    throw error;
  }
}

/**
 * Restore an archived pattern template (set status to Active)
 */
export async function restorePatternTemplate(id: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Restoring template:', id);

    await client.update(ENTITY_SET, id, {
      cp365_sp_patternstatus: PatternStatusEnum.Active,
    });

    console.log('[PatternTemplates] Restored template:', id);
  } catch (error) {
    console.error('[PatternTemplates] Error restoring template:', error);
    throw error;
  }
}

/**
 * Get assignment summary for all templates
 */
export async function getPatternAssignmentSummaries(): Promise<PatternAssignmentSummary[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternTemplates] Fetching assignment summaries');

    // Fetch all templates
    const templates = await fetchPatternTemplates();

    // Fetch all assignments
    const assignments = await client.get('cp365_staffpatternassignments', {
      filter: 'statecode eq 0',
      select: ['_cp365_shiftpatterntemplate_value', 'cp365_sp_assignmentstatus', '_cp365_staffmember_value'],
    });

    // Calculate summaries
    const summaries: PatternAssignmentSummary[] = templates.map((template) => {
      const templateAssignments = assignments.filter(
        (a: { _cp365_shiftpatterntemplate_value: string }) => 
          a._cp365_shiftpatterntemplate_value === template.cp365_shiftpatterntemplatenewid
      );

      const activeAssignments = templateAssignments.filter(
        (a: { cp365_sp_assignmentstatus: number }) => a.cp365_sp_assignmentstatus === 1
      ).length;

      const endedAssignments = templateAssignments.filter(
        (a: { cp365_sp_assignmentstatus: number }) => a.cp365_sp_assignmentstatus === 2
      ).length;

      const uniqueStaff = new Set(
        templateAssignments.map((a: { _cp365_staffmember_value: string }) => a._cp365_staffmember_value)
      );

      return {
        patternTemplateId: template.cp365_shiftpatterntemplatenewid,
        patternName: template.cp365_name,
        activeAssignments,
        endedAssignments,
        totalStaffAssigned: uniqueStaff.size,
      };
    });

    return summaries;
  } catch (error) {
    console.error('[PatternTemplates] Error fetching summaries:', error);
    throw error;
  }
}

// =============================================================================
// PATTERN DAYS FUNCTIONS (imported here for convenience)
// =============================================================================

/**
 * Fetch pattern days for a template
 */
export async function fetchPatternDays(templateId: string): Promise<ShiftPatternDay[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Fetching days for template:', templateId);

    // Fetch all columns without specifying select (to avoid column name mismatch issues)
    // We'll filter down to what we need after fetching
    const days = await client.get<ShiftPatternDay>('cp365_shiftpatterndaies', {
      filter: `_cp365_shiftpatterntemplate_value eq '${templateId}'`,
      orderby: 'cp365_sp_displayorder asc, cp365_sp_weeknumber asc, cp365_sp_dayofweek asc',
    });

    console.log('[PatternDays] Fetched', days.length, 'days');
    return days;
  } catch (error) {
    console.error('[PatternDays] Error fetching days:', error);
    throw error;
  }
}

/**
 * Create multiple pattern days at once
 */
export async function bulkCreatePatternDays(
  templateId: string,
  days: PatternDayFormData[]
): Promise<ShiftPatternDay[]> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  const client = getDataverseClient();
  console.log('[PatternDays] Bulk creating', days.length, 'days for template:', templateId);

  const createdDays: ShiftPatternDay[] = [];

  for (const day of days) {
    try {
      // IMPORTANT: Navigation property names MUST be lowercase for @odata.bind in Dataverse
      const dayData: Record<string, unknown> = {
        cp365_name: `Week ${day.weekNumber} - ${getDayName(day.dayOfWeek)}`,
        'cp365_shiftpatterntemplate@odata.bind': `/cp365_shiftpatterntemplatenews(${templateId})`,
        cp365_sp_weeknumber: day.weekNumber,
        cp365_sp_dayofweek: day.dayOfWeek,
        cp365_sp_isrestday: day.isRestDay,
        cp365_sp_isovernight: day.isOvernight,
        cp365_sp_displayorder: (day.weekNumber * 10) + day.dayOfWeek,
      };

      if (day.shiftReferenceId) {
        dayData['cp365_shiftreference@odata.bind'] = `/cp365_shiftreferences(${day.shiftReferenceId})`;
      }

      if (day.startTime) {
        dayData.cp365_sp_starttime = createDateTimeWithDummyDate(day.startTime);
      }

      if (day.endTime) {
        dayData.cp365_sp_endtime = createDateTimeWithDummyDate(day.endTime);
      }

      if (day.breakMinutes !== undefined) {
        dayData.cp365_sp_breakminutes = day.breakMinutes;
      }

      if (day.shiftActivityId) {
        dayData['cp365_shiftactivity@odata.bind'] = `/cp365_shiftactivities(${day.shiftActivityId})`;
      }

      const created = await client.create<ShiftPatternDay>('cp365_shiftpatterndaies', dayData);
      createdDays.push(created);
    } catch (error) {
      console.error('[PatternDays] Error creating day:', day, error);
      // Continue with other days
    }
  }

  console.log('[PatternDays] Created', createdDays.length, 'of', days.length, 'days');
  return createdDays;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate average and total hours from pattern days
 */
function calculatePatternHours(
  days: PatternDayFormData[],
  rotationCycleWeeks: number
): { averageWeeklyHours: number; totalRotationHours: number } {
  let totalMinutes = 0;

  for (const day of days) {
    if (day.isRestDay || !day.startTime || !day.endTime) {
      continue;
    }

    const startMinutes = parseTimeToMinutes(day.startTime);
    let endMinutes = parseTimeToMinutes(day.endTime);

    // Handle overnight shifts
    if (day.isOvernight || endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }

    let shiftMinutes = endMinutes - startMinutes;

    // Subtract break
    if (day.breakMinutes) {
      shiftMinutes -= day.breakMinutes;
    }

    totalMinutes += Math.max(0, shiftMinutes);
  }

  const totalRotationHours = Math.round((totalMinutes / 60) * 100) / 100;
  const averageWeeklyHours = rotationCycleWeeks > 0
    ? Math.round((totalRotationHours / rotationCycleWeeks) * 100) / 100
    : 0;

  return { averageWeeklyHours, totalRotationHours };
}

/**
 * Parse time string (HH:mm) to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Get day name from DayOfWeek value
 */
function getDayName(dayOfWeek: DayOfWeek): string {
  const names: Record<DayOfWeek, string> = {
    [DayOfWeek.Monday]: 'Monday',
    [DayOfWeek.Tuesday]: 'Tuesday',
    [DayOfWeek.Wednesday]: 'Wednesday',
    [DayOfWeek.Thursday]: 'Thursday',
    [DayOfWeek.Friday]: 'Friday',
    [DayOfWeek.Saturday]: 'Saturday',
    [DayOfWeek.Sunday]: 'Sunday',
  };
  return names[dayOfWeek] || 'Unknown';
}

/**
 * Create a DateTime string with dummy date (1900-01-01) for time-only storage
 */
function createDateTimeWithDummyDate(time: string): string {
  return `1900-01-01T${time}:00Z`;
}

/**
 * Extract time (HH:mm) from a DateTime string
 */
function extractTimeFromDateTime(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
}

