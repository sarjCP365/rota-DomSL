/**
 * Power Automate Flow Triggers
 *
 * High-level functions to trigger specific Power Automate flows.
 *
 * IMPORTANT: Power Apps V2 Trigger Architecture
 * =============================================
 * The existing CarePoint 365 Power Automate flows use "Power Apps V2" triggers,
 * which cannot be called directly from a web application via HTTP.
 *
 * Current Status:
 * - BuildNewRotaView: Using direct Dataverse queries (see shifts.ts)
 * - Other flows: Need HTTP triggers added to work from this React app
 *
 * See client.ts for detailed architecture notes and options.
 */

import { getFlowClient, type ParsedRotaViewData, FlowError } from './client';
import type { ShiftViewData, StaffAbsenceLog } from '../dataverse/types';

// Re-export types from client
export type { ParsedRotaViewData, FlowError };

// =============================================================================
// ROTA VIEW OPERATIONS
// =============================================================================

/**
 * Build the rota grid data
 *
 * @deprecated Use getRotaGridData() from src/api/dataverse/shifts.ts instead.
 * This function is kept for reference in case HTTP triggers are added to the flow.
 *
 * The BuildNewRotaView flow uses a Power Apps V2 trigger and cannot be called
 * from a web app. The shifts.ts implementation uses direct Dataverse queries.
 */
export async function buildRotaView(params: {
  shiftStartDate: string;
  locationId: string;
  duration: number;
  rotaId?: string;
}): Promise<ParsedRotaViewData | null> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('buildRotaView')) {
    console.warn(
      '[flows] buildRotaView flow not configured. ' +
        'Use getRotaGridData() from shifts.ts instead.'
    );
    return null;
  }

  try {
    return await client.buildRotaView({
      shiftStartDate: params.shiftStartDate,
      locationId: params.locationId,
      duration: params.duration,
      rotaId: params.rotaId,
    });
  } catch (error) {
    console.error('[flows] buildRotaView failed:', error);
    return null;
  }
}

// =============================================================================
// ABSENCE OPERATIONS
// =============================================================================

/**
 * Get Time Away From Work (absences) for staff members
 *
 * NOTE: Requires HTTP trigger to be added to GetTAFWforstaffmember flow
 */
export async function getTAFW(params: {
  staffMemberIds: string;
  startDate: string;
  endDate: string;
}): Promise<StaffAbsenceLog[]> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('getTAFW')) {
    console.warn('[flows] getTAFW flow not configured');
    return [];
  }

  try {
    return await client.getTAFW({
      staffMemberIds: params.staffMemberIds,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  } catch (error) {
    console.error('[flows] getTAFW failed:', error);
    return [];
  }
}

/**
 * Get shifts from other rotas for the same staff (dual-location visibility)
 *
 * NOTE: Requires HTTP trigger to be added to GetOtherShiftsbyStaffMemberandDate flow
 */
export async function getOtherShifts(params: {
  staffArray: string;
  startDate: string;
  endDate: string;
  excludeRotaId: string;
}): Promise<ShiftViewData[]> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('getOtherShifts')) {
    console.warn('[flows] getOtherShifts flow not configured');
    return [];
  }

  try {
    return await client.getOtherShifts({
      staffArray: params.staffArray,
      startDate: params.startDate,
      endDate: params.endDate,
      excludeRotaId: params.excludeRotaId,
    });
  } catch (error) {
    console.error('[flows] getOtherShifts failed:', error);
    return [];
  }
}

// =============================================================================
// SHIFT CREATION OPERATIONS
// =============================================================================

export interface PatternData {
  StartDate: string;
  EndDate: string;
  RotaID: string;
  LocationID: string;
  PatternType: 'Daily' | 'Weekly' | 'Weekday' | 'Rotation';
  DailySkip?: number;
  WeeklySkip?: number;
  WorkingDays?: number;
  RestingDays?: number;
  SelectedDays?: {
    Monday?: boolean;
    Tuesday?: boolean;
    Wednesday?: boolean;
    Thursday?: boolean;
    Friday?: boolean;
    Saturday?: boolean;
    Sunday?: boolean;
  };
  ShiftReferenceID: string;
  ShiftActivityID: string;
  BreakDuration: number;
}

export interface AssignedPerson {
  StaffID: string;
  StaffName: string;
}

/**
 * Create multiple shifts based on pattern/recurrence settings
 *
 * NOTE: Requires HTTP trigger to be added to Rostering-CreateBulkShift flow.
 * Alternative: Use createShift() from shifts.ts for single shift creation.
 */
export async function createBulkShift(params: {
  patternData: PatternData;
  assignedPeople: AssignedPerson[];
  staffMembersXml: string;
}): Promise<boolean> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('createBulkShift')) {
    console.error(
      '[flows] createBulkShift flow not configured. ' +
        'Add HTTP trigger to the flow or use createShift() from shifts.ts.'
    );
    throw new Error(
      'Bulk shift creation is not available. The Power Automate flow needs an HTTP trigger. ' +
        'Please contact your administrator or create shifts individually.'
    );
  }

  try {
    await client.createBulkShift({
      patternData: params.patternData as import('../dataverse/types').PatternData,
      assignedPeople: params.assignedPeople,
      staffMembersXml: params.staffMembersXml,
    });
    return true;
  } catch (error) {
    console.error('[flows] createBulkShift failed:', error);
    throw error;
  }
}

// =============================================================================
// SHIFT MANAGEMENT OPERATIONS
// =============================================================================

/**
 * Validate and handle shift time conflicts
 *
 * NOTE: Requires HTTP trigger to be added to HandleClashingShifts flow
 */
export async function handleClashingShifts(params: {
  shiftId: string;
  staffMemberId: string;
  startTime: string;
  endTime: string;
  excludeShiftIds?: string[];
}): Promise<{ hasClash: boolean; clashingShifts: string[] }> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('handleClashingShifts')) {
    console.warn('[flows] handleClashingShifts flow not configured');
    // Return no clash as fallback - validation should happen server-side
    return { hasClash: false, clashingShifts: [] };
  }

  try {
    return await client.handleClashingShifts(params);
  } catch (error) {
    console.error('[flows] handleClashingShifts failed:', error);
    return { hasClash: false, clashingShifts: [] };
  }
}

/**
 * Remove staff assignment from a shift
 *
 * NOTE: Requires HTTP trigger or use updateShift() from shifts.ts
 */
export async function unassignShift(shiftId: string): Promise<boolean> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('unassignStaff')) {
    console.warn(
      '[flows] unassignStaff flow not configured. ' +
        'Use updateShift() from shifts.ts to clear staff assignment.'
    );
    return false;
  }

  try {
    await client.unassignStaff(shiftId);
    return true;
  } catch (error) {
    console.error('[flows] unassignStaff failed:', error);
    return false;
  }
}

/**
 * Remove agency worker from a shift
 *
 * NOTE: Requires HTTP trigger to be added to flow
 */
export async function removeAgencyWorker(shiftId: string): Promise<boolean> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('removeAgency')) {
    console.warn('[flows] removeAgency flow not configured');
    return false;
  }

  try {
    await client.removeAgencyWorker(shiftId);
    return true;
  } catch (error) {
    console.error('[flows] removeAgencyWorker failed:', error);
    return false;
  }
}

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================

/**
 * Send notifications for published shifts
 *
 * NOTE: Requires HTTP trigger to be added to SendRotaNotifications flow
 */
export async function sendRotaNotifications(params: {
  rotaId: string;
  staffMemberIds: string[];
  startDate: string;
  endDate: string;
}): Promise<boolean> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('sendNotifications')) {
    console.warn('[flows] sendNotifications flow not configured');
    return false;
  }

  try {
    await client.sendRotaNotifications(params);
    return true;
  } catch (error) {
    console.error('[flows] sendRotaNotifications failed:', error);
    return false;
  }
}

// =============================================================================
// EXPORT OPERATIONS
// =============================================================================

/**
 * Generate PDF export of rota
 *
 * NOTE: Requires HTTP trigger to be added to GeneratePDF flow
 */
export async function generatePDF(params: {
  rotaId: string;
  startDate: string;
  endDate: string;
  sublocationName: string;
}): Promise<Blob | null> {
  const client = getFlowClient();

  if (!client.isFlowConfigured('generatePDF')) {
    console.warn('[flows] generatePDF flow not configured');
    return null;
  }

  try {
    return await client.generatePDF(params);
  } catch (error) {
    console.error('[flows] generatePDF failed:', error);
    return null;
  }
}

// =============================================================================
// ERROR LOGGING
// =============================================================================

/**
 * Log application errors
 *
 * NOTE: Falls back to console logging if flow not configured
 */
export async function logError(error: {
  message: string;
  stack?: string;
  context?: string;
  userId?: string;
}): Promise<void> {
  const client = getFlowClient();

  try {
    await client.logError({
      message: error.message,
      stack: error.stack,
      context: error.context,
      userId: error.userId,
      url: window.location.href,
    });
  } catch (e) {
    // Fallback handled in client
    console.error('[flows] logError failed:', e);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert staff IDs array to XML format for flow input
 */
export function staffIdsToXml(staffIds: string[]): string {
  return staffIds.map((id) => `<item>${id}</item>`).join('');
}

/**
 * Check if a specific flow is available
 */
export function isFlowAvailable(flowName: string): boolean {
  const client = getFlowClient();
  return client.isFlowConfigured(flowName as keyof ReturnType<typeof client.getConfiguredFlows>);
}

/**
 * Get summary of which flows are available
 */
export function getAvailableFlows(): {
  available: string[];
  unavailable: string[];
} {
  const client = getFlowClient();
  return {
    available: client.getConfiguredFlows(),
    unavailable: client.getUnconfiguredFlows(),
  };
}
