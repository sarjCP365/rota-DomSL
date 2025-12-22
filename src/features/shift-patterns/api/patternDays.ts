/**
 * CarePoint 365 - Pattern Days API Functions
 * CRUD operations for Shift Pattern Days
 */

import { getDataverseClient, isDataverseClientInitialised } from '../../../api/dataverse/client';
import type { ShiftPatternDay, PatternDayFormData, DayOfWeek } from '../types';
import { DayOfWeek as DayOfWeekEnum } from '../types';

/**
 * Entity set name for pattern days
 */
const ENTITY_SET = 'cp365_shiftpatterndaies';

/**
 * NOTE: We intentionally do NOT use $select for pattern day queries.
 * This is because:
 * 1. Shift reference and activity lookup columns may not exist in Dataverse yet
 * 2. They may have different schema names depending on publisher prefix
 * 3. Standard patterns define times directly without needing these lookups
 * 
 * By not specifying a $select, Dataverse returns all available columns,
 * which prevents errors when optional columns don't exist.
 */

/**
 * Fetch all pattern days for a template
 * Note: Does not use $select to avoid errors with optional columns that may not exist
 */
export async function fetchPatternDays(templateId: string): Promise<ShiftPatternDay[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[PatternDays] Dataverse client not initialised');
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Fetching days for template:', templateId);

    // Do NOT use $select - let Dataverse return all available columns
    // This prevents errors when optional lookup columns don't exist
    const days = await client.get<ShiftPatternDay>(ENTITY_SET, {
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
 * Fetch a single pattern day by ID
 * Note: Does not use $select to avoid errors with optional columns that may not exist
 */
export async function fetchPatternDayById(id: string): Promise<ShiftPatternDay | null> {
  if (!isDataverseClientInitialised()) {
    console.warn('[PatternDays] Dataverse client not initialised');
    return null;
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Fetching day by ID:', id);

    // Do NOT use $select - let Dataverse return all available columns
    const day = await client.getById<ShiftPatternDay>(ENTITY_SET, id);

    return day;
  } catch (error) {
    console.error('[PatternDays] Error fetching day:', error);
    throw error;
  }
}

/**
 * Create a single pattern day
 */
export async function createPatternDay(
  templateId: string,
  data: PatternDayFormData
): Promise<ShiftPatternDay> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Creating day for template:', templateId);

    const dayData = buildPatternDayPayload(templateId, data);
    console.log('[PatternDays] CREATE payload:', dayData);

    const result = await client.create<ShiftPatternDay>(ENTITY_SET, dayData);
    console.log('[PatternDays] Created day:', result.cp365_shiftpatterndayid);

    return result;
  } catch (error) {
    console.error('[PatternDays] Error creating day:', error);
    throw error;
  }
}

/**
 * Update a pattern day
 */
export async function updatePatternDay(
  id: string,
  data: Partial<PatternDayFormData>
): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Updating day:', id);

    const updateData: Record<string, unknown> = {};

    if (data.weekNumber !== undefined) {
      updateData.cp365_sp_weeknumber = data.weekNumber;
    }

    if (data.dayOfWeek !== undefined) {
      updateData.cp365_sp_dayofweek = data.dayOfWeek;
    }

    if (data.isRestDay !== undefined) {
      updateData.cp365_sp_isrestday = data.isRestDay;
    }

    if (data.isOvernight !== undefined) {
      updateData.cp365_sp_isovernight = data.isOvernight;
    }

    if (data.shiftReferenceId !== undefined) {
      if (data.shiftReferenceId) {
        updateData['cp365_shiftreference@odata.bind'] = `/cp365_shiftreferences(${data.shiftReferenceId})`;
      } else {
        updateData.cp365_shiftreference = null;
      }
    }

    if (data.startTime !== undefined) {
      updateData.cp365_sp_starttime = data.startTime 
        ? createDateTimeWithDummyDate(data.startTime) 
        : null;
    }

    if (data.endTime !== undefined) {
      updateData.cp365_sp_endtime = data.endTime 
        ? createDateTimeWithDummyDate(data.endTime) 
        : null;
    }

    if (data.breakMinutes !== undefined) {
      updateData.cp365_sp_breakminutes = data.breakMinutes;
    }

    if (data.shiftActivityId !== undefined) {
      if (data.shiftActivityId) {
        updateData['cp365_shiftactivity@odata.bind'] = `/cp365_shiftactivities(${data.shiftActivityId})`;
      } else {
        updateData.cp365_shiftactivity = null;
      }
    }

    // Update display order if week or day changed
    if (data.weekNumber !== undefined || data.dayOfWeek !== undefined) {
      // Fetch current values if not provided
      const current = await fetchPatternDayById(id);
      const week = data.weekNumber ?? current?.cp365_sp_weeknumber ?? 1;
      const day = data.dayOfWeek ?? current?.cp365_sp_dayofweek ?? 1;
      updateData.cp365_sp_displayorder = (week * 10) + day;
    }

    // Update name if week or day changed
    if (data.weekNumber !== undefined || data.dayOfWeek !== undefined) {
      const current = await fetchPatternDayById(id);
      const week = data.weekNumber ?? current?.cp365_sp_weeknumber ?? 1;
      const day = data.dayOfWeek ?? current?.cp365_sp_dayofweek ?? 1;
      updateData.cp365_name = `Week ${week} - ${getDayName(day)}`;
    }

    console.log('[PatternDays] UPDATE payload:', updateData);

    await client.update(ENTITY_SET, id, updateData);
    console.log('[PatternDays] Updated day:', id);
  } catch (error) {
    console.error('[PatternDays] Error updating day:', error);
    throw error;
  }
}

/**
 * Delete a pattern day
 */
export async function deletePatternDay(id: string): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Deleting day:', id);

    await client.delete(ENTITY_SET, id);
    console.log('[PatternDays] Deleted day:', id);
  } catch (error) {
    console.error('[PatternDays] Error deleting day:', error);
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

  console.log('[PatternDays] Bulk creating', days.length, 'days for template:', templateId);

  const createdDays: ShiftPatternDay[] = [];
  const errors: string[] = [];

  for (const day of days) {
    try {
      const created = await createPatternDay(templateId, day);
      createdDays.push(created);
    } catch (error) {
      console.error('[PatternDays] Error creating day:', day, error);
      errors.push(`Week ${day.weekNumber}, Day ${day.dayOfWeek}: ${error}`);
    }
  }

  if (errors.length > 0) {
    console.warn('[PatternDays] Bulk create completed with errors:', errors);
  }

  console.log('[PatternDays] Created', createdDays.length, 'of', days.length, 'days');
  return createdDays;
}

/**
 * Update multiple pattern days at once
 */
export async function bulkUpdatePatternDays(
  updates: Array<{ id: string; data: Partial<PatternDayFormData> }>
): Promise<void> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  console.log('[PatternDays] Bulk updating', updates.length, 'days');

  const errors: string[] = [];

  for (const { id, data } of updates) {
    try {
      await updatePatternDay(id, data);
    } catch (error) {
      console.error('[PatternDays] Error updating day:', id, error);
      errors.push(`${id}: ${error}`);
    }
  }

  if (errors.length > 0) {
    console.warn('[PatternDays] Bulk update completed with errors:', errors);
    throw new Error(`Failed to update ${errors.length} days`);
  }

  console.log('[PatternDays] Updated all', updates.length, 'days');
}

/**
 * Delete all pattern days for a template and recreate from form data
 * Useful for full pattern day replacement during editing
 */
export async function replacePatternDays(
  templateId: string,
  newDays: PatternDayFormData[]
): Promise<ShiftPatternDay[]> {
  if (!isDataverseClientInitialised()) {
    throw new Error('Dataverse client not initialised');
  }

  console.log('[PatternDays] Replacing all days for template:', templateId);

  // Fetch existing days
  const existingDays = await fetchPatternDays(templateId);

  // Delete all existing days
  for (const day of existingDays) {
    try {
      await deletePatternDay(day.cp365_shiftpatterndayid);
    } catch (error) {
      console.warn('[PatternDays] Error deleting existing day:', day.cp365_shiftpatterndayid, error);
    }
  }

  // Create new days
  const createdDays = await bulkCreatePatternDays(templateId, newDays);

  console.log('[PatternDays] Replaced', existingDays.length, 'days with', createdDays.length, 'new days');
  return createdDays;
}

/**
 * Get pattern days for a specific week within a rotation
 * Note: Does not use $select to avoid errors with optional columns that may not exist
 */
export async function fetchPatternDaysForWeek(
  templateId: string,
  weekNumber: number
): Promise<ShiftPatternDay[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[PatternDays] Fetching days for template:', templateId, 'week:', weekNumber);

    // Do NOT use $select - let Dataverse return all available columns
    const days = await client.get<ShiftPatternDay>(ENTITY_SET, {
      filter: `_cp365_shiftpatterntemplate_value eq '${templateId}' and cp365_sp_weeknumber eq ${weekNumber}`,
      orderby: 'cp365_sp_dayofweek asc',
    });

    return days;
  } catch (error) {
    console.error('[PatternDays] Error fetching week days:', error);
    throw error;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build the payload for creating a pattern day
 */
function buildPatternDayPayload(
  templateId: string,
  data: PatternDayFormData
): Record<string, unknown> {
  console.log('[PatternDays] Building payload for:', {
    weekNumber: data.weekNumber,
    dayOfWeek: data.dayOfWeek,
    isRestDay: data.isRestDay,
    shiftReferenceId: data.shiftReferenceId,
    startTime: data.startTime,
    endTime: data.endTime,
    breakMinutes: data.breakMinutes,
    isOvernight: data.isOvernight,
  });

  // Note: Dataverse lookup bindings use lowercase navigation property names
  const payload: Record<string, unknown> = {
    cp365_name: `Week ${data.weekNumber} - ${getDayName(data.dayOfWeek)}`,
    'cp365_shiftpatterntemplate@odata.bind': `/cp365_shiftpatterntemplatenews(${templateId})`,
    cp365_sp_weeknumber: data.weekNumber,
    cp365_sp_dayofweek: data.dayOfWeek,
    cp365_sp_isrestday: data.isRestDay ?? true,
    cp365_sp_isovernight: data.isOvernight ?? false,
    cp365_sp_displayorder: (data.weekNumber * 10) + data.dayOfWeek,
  };

  if (data.shiftReferenceId) {
    console.log('[PatternDays] Adding shift reference:', data.shiftReferenceId);
    payload['cp365_shiftreference@odata.bind'] = `/cp365_shiftreferences(${data.shiftReferenceId})`;
  }

  if (data.startTime) {
    console.log('[PatternDays] Adding start time:', data.startTime);
    payload.cp365_sp_starttime = createDateTimeWithDummyDate(data.startTime);
  }

  if (data.endTime) {
    console.log('[PatternDays] Adding end time:', data.endTime);
    payload.cp365_sp_endtime = createDateTimeWithDummyDate(data.endTime);
  }

  if (data.breakMinutes !== undefined && data.breakMinutes !== null) {
    payload.cp365_sp_breakminutes = data.breakMinutes;
  }

  if (data.shiftActivityId) {
    payload['cp365_shiftactivity@odata.bind'] = `/cp365_shiftactivities(${data.shiftActivityId})`;
  }

  console.log('[PatternDays] Final payload:', payload);
  return payload;
}

/**
 * Get day name from DayOfWeek value
 */
function getDayName(dayOfWeek: DayOfWeek): string {
  const names: Record<DayOfWeek, string> = {
    [DayOfWeekEnum.Monday]: 'Monday',
    [DayOfWeekEnum.Tuesday]: 'Tuesday',
    [DayOfWeekEnum.Wednesday]: 'Wednesday',
    [DayOfWeekEnum.Thursday]: 'Thursday',
    [DayOfWeekEnum.Friday]: 'Friday',
    [DayOfWeekEnum.Saturday]: 'Saturday',
    [DayOfWeekEnum.Sunday]: 'Sunday',
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
export function extractTimeFromDateTime(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
}

/**
 * Calculate shift duration in minutes from a pattern day
 */
export function calculateDayDurationMinutes(day: PatternDayFormData): number {
  if (day.isRestDay || !day.startTime || !day.endTime) {
    return 0;
  }

  const startMinutes = parseTimeToMinutes(day.startTime);
  let endMinutes = parseTimeToMinutes(day.endTime);

  // Handle overnight shifts
  if (day.isOvernight || endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  let duration = endMinutes - startMinutes;

  // Subtract break
  if (day.breakMinutes) {
    duration -= day.breakMinutes;
  }

  return Math.max(0, duration);
}

/**
 * Parse time string (HH:mm) to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

