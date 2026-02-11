/**
 * Power Automate Flow Client
 *
 * IMPORTANT: Architecture Note
 * ============================
 * The existing CarePoint 365 Power Automate flows use "Power Apps V2" triggers,
 * which are designed to be invoked from Power Apps Canvas applications using
 * the PowerAutomate.Run() connector. These triggers CANNOT be called directly
 * via HTTP from a web application.
 *
 * To enable the React web app to call these flows, one of the following
 * approaches is required:
 *
 * OPTION 1: Add HTTP Triggers to Existing Flows (Recommended)
 * -----------------------------------------------------------
 * Add an "When an HTTP request is received" trigger to each flow while keeping
 * the existing Power Apps V2 trigger. This allows both Canvas apps and the
 * React web app to use the same flows.
 *
 * Steps:
 * 1. Open each flow in Power Automate
 * 2. Add a parallel branch with "When an HTTP request is received" trigger
 * 3. Connect it to the same actions as the Power Apps trigger
 * 4. Copy the HTTP POST URL and add to environment variables
 *
 * OPTION 2: Use Direct Dataverse API Calls
 * -----------------------------------------
 * Most flow functionality can be replicated with direct Dataverse Web API calls.
 * This is what we're currently doing for fetching rota data (see shifts.ts).
 *
 * Current Implementation Status:
 * - BuildNewRotaView: ✅ Replaced with direct Dataverse queries in shifts.ts
 * - CreateBulkShift: ⏳ Needs HTTP trigger or Dataverse implementation
 * - GetTAFW: ⏳ Needs HTTP trigger or Dataverse implementation
 * - Other flows: ⏳ Needs HTTP trigger or Dataverse implementation
 *
 * Based on specification section 9.3
 */

import type {
  BuildRotaViewParams,
  BuildRotaViewResponse,
  CreateBulkShiftParams,
  GetTAFWParams,
  GetOtherShiftsParams,
  PatternData,
  AssignedPerson,
  ShiftViewData,
  SublocationStaffViewData,
  StaffAbsenceLog,
} from '../dataverse/types';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Flow URLs from environment variables
 *
 * These should be the HTTP POST URLs from flows that have
 * "When an HTTP request is received" triggers added.
 *
 * If the flows only have Power Apps V2 triggers, these URLs won't work
 * and you'll need to add HTTP triggers to the flows first.
 */
const FLOW_URLS: Record<string, string | undefined> = {
  buildRotaView: import.meta.env.VITE_FLOW_BUILD_ROTA_VIEW as string | undefined,
  createBulkShift: import.meta.env.VITE_FLOW_CREATE_BULK_SHIFT as string | undefined,
  getTAFW: import.meta.env.VITE_FLOW_GET_TAFW as string | undefined,
  getOtherShifts: import.meta.env.VITE_FLOW_GET_OTHER_SHIFTS as string | undefined,
  handleClashingShifts: import.meta.env.VITE_FLOW_HANDLE_CLASHING as string | undefined,
  sendNotifications: import.meta.env.VITE_FLOW_SEND_NOTIFICATIONS as string | undefined,
  unassignStaff: import.meta.env.VITE_FLOW_UNASSIGN_STAFF as string | undefined,
  removeAgency: import.meta.env.VITE_FLOW_REMOVE_AGENCY as string | undefined,
  generatePDF: import.meta.env.VITE_FLOW_GENERATE_PDF as string | undefined,
  errorHandler: import.meta.env.VITE_FLOW_ERROR_HANDLER as string | undefined,
};

// =============================================================================
// ERROR TYPES
// =============================================================================

export class FlowError extends Error {
  public readonly statusCode: number;
  public readonly flowName: string;
  public readonly innerError?: unknown;

  constructor(message: string, flowName: string, statusCode: number, innerError?: unknown) {
    super(message);
    this.name = 'FlowError';
    this.flowName = flowName;
    this.statusCode = statusCode;
    this.innerError = innerError;
  }

  static fromResponse(flowName: string, response: Response, body?: unknown): FlowError {
    const errorMessage =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error?: string }).error
        : `Flow ${flowName} failed with status ${response.status}`;

    return new FlowError(
      errorMessage || `HTTP ${response.status}: ${response.statusText}`,
      flowName,
      response.status,
      body
    );
  }

  static notConfigured(flowName: string): FlowError {
    return new FlowError(
      `Flow "${flowName}" is not configured. The existing Power Automate flow uses a Power Apps V2 trigger which cannot be called from a web application. ` +
        `To use this functionality, add an HTTP Request trigger to the flow in Power Automate and set the VITE_FLOW_${flowName.toUpperCase()} environment variable.`,
      flowName,
      0
    );
  }
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface FlowResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ParsedRotaViewData {
  shifts: ShiftViewData[];
  staff: SublocationStaffViewData[];
  monthlyShifts: unknown[];
  driverSkills: unknown[];
}

// =============================================================================
// CLIENT CLASS
// =============================================================================

export class FlowClient {
  private getAccessToken: (() => Promise<string>) | null = null;
  private timeout: number;

  constructor(timeout: number = 60000) {
    this.timeout = timeout;
  }

  /**
   * Set the token provider for authenticated flow calls
   */
  setTokenProvider(getAccessToken: () => Promise<string>): void {
    this.getAccessToken = getAccessToken;
  }

  /**
   * Check if a flow is configured (has an HTTP trigger URL)
   */
  isFlowConfigured(flowName: keyof typeof FLOW_URLS): boolean {
    return !!FLOW_URLS[flowName];
  }

  /**
   * Get list of configured flows
   */
  getConfiguredFlows(): string[] {
    return Object.entries(FLOW_URLS)
      .filter(([, url]) => !!url)
      .map(([name]) => name);
  }

  /**
   * Get list of unconfigured flows
   */
  getUnconfiguredFlows(): string[] {
    return Object.entries(FLOW_URLS)
      .filter(([, url]) => !url)
      .map(([name]) => name);
  }

  /**
   * Call a Power Automate flow via HTTP trigger
   *
   * IMPORTANT: This only works if the flow has an HTTP Request trigger.
   * If the flow only has a Power Apps V2 trigger, this will fail.
   */
  private async callFlow<T>(
    flowName: string,
    payload: Record<string, unknown>,
    options?: { authenticated?: boolean }
  ): Promise<T> {
    const url = FLOW_URLS[flowName];

    if (!url) {
      throw FlowError.notConfigured(flowName);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add auth header if required and token provider is set
    if (options?.authenticated && this.getAccessToken) {
      const token = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = await response.text();
        }
        throw FlowError.fromResponse(flowName, response, body);
      }

      // Handle empty response
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof FlowError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new FlowError(`Flow ${flowName} timed out after ${this.timeout}ms`, flowName, 408);
      }

      throw new FlowError(
        `Failed to call flow ${flowName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flowName,
        0,
        error
      );
    }
  }

  // ===========================================================================
  // ROTA VIEW FLOWS
  // ===========================================================================

  /**
   * Build the rota grid data for a given date range and sublocation
   *
   * NOTE: This flow (Component|BuildNewRotaView) has been REPLACED with direct
   * Dataverse queries in src/api/dataverse/shifts.ts for the React web app.
   *
   * Use getRotaGridData() from shifts.ts instead of this method.
   *
   * This method is kept for reference and in case HTTP triggers are added
   * to the existing Power Automate flow.
   */
  async buildRotaView(params: BuildRotaViewParams): Promise<ParsedRotaViewData> {
    if (!this.isFlowConfigured('buildRotaView')) {
      console.warn(
        '[FlowClient] buildRotaView flow not configured. ' +
          'Using direct Dataverse queries instead (see shifts.ts).'
      );
      throw FlowError.notConfigured('buildRotaView');
    }

    const response = await this.callFlow<BuildRotaViewResponse>('buildRotaView', {
      ShiftStartDate: params.shiftStartDate,
      LocationID: params.locationId,
      Duration: params.duration,
      rotaID: params.rotaId || '',
    });

    // Parse JSON strings from flow response
    return {
      shifts: this.safeParseJSON<ShiftViewData[]>(response.view, []),
      staff: this.safeParseJSON<SublocationStaffViewData[]>(response.sublocationstaff, []),
      monthlyShifts: this.safeParseJSON<unknown[]>(response.monthlyshifts, []),
      driverSkills: this.safeParseJSON<unknown[]>(response.driverskill, []),
    };
  }

  /**
   * Get Time Away From Work (absences) for staff members
   *
   * NOTE: Requires HTTP trigger to be added to Component|GetTAFWforstaffmember flow
   */
  async getTAFW(params: GetTAFWParams): Promise<StaffAbsenceLog[]> {
    return this.callFlow<StaffAbsenceLog[]>('getTAFW', {
      StaffMemberIDs: params.staffMemberIds,
      StartDate: params.startDate,
      EndDate: params.endDate,
    });
  }

  /**
   * Get shifts from other rotas for the same staff (dual-location visibility)
   *
   * NOTE: Requires HTTP trigger to be added to Component|GetOtherShiftsbyStaffMemberandDate flow
   */
  async getOtherShifts(params: GetOtherShiftsParams): Promise<ShiftViewData[]> {
    return this.callFlow<ShiftViewData[]>('getOtherShifts', {
      StaffArray: params.staffArray,
      StartDate: params.startDate,
      EndDate: params.endDate,
      ExcludeRotaID: params.excludeRotaId,
    });
  }

  // ===========================================================================
  // SHIFT MANAGEMENT FLOWS
  // ===========================================================================

  /**
   * Create multiple shifts based on pattern/recurrence settings
   *
   * NOTE: Requires HTTP trigger to be added to Rostering-CreateBulkShift flow
   *
   * Alternative: Use createShift() from shifts.ts to create shifts directly
   * via Dataverse API (one at a time).
   */
  async createBulkShift(params: CreateBulkShiftParams): Promise<void> {
    await this.callFlow<void>('createBulkShift', {
      PatternData: JSON.stringify(params.patternData),
      AssignedPeople: JSON.stringify(params.assignedPeople),
      StaffMembersXML: params.staffMembersXml,
    });
  }

  /**
   * Validate and handle shift time conflicts
   *
   * NOTE: Requires HTTP trigger to be added to Component|HandleClashingShifts flow
   */
  async handleClashingShifts(params: {
    shiftId: string;
    staffMemberId: string;
    startTime: string;
    endTime: string;
    excludeShiftIds?: string[];
  }): Promise<{ hasClash: boolean; clashingShifts: string[] }> {
    return this.callFlow<{ hasClash: boolean; clashingShifts: string[] }>('handleClashingShifts', {
      ShiftID: params.shiftId,
      StaffMemberID: params.staffMemberId,
      StartTime: params.startTime,
      EndTime: params.endTime,
      ExcludeShiftIDs: params.excludeShiftIds || [],
    });
  }

  /**
   * Remove staff assignment from a shift
   *
   * NOTE: Requires HTTP trigger to be added to Component|UnassignShift>StaffMemberRelationship flow
   *
   * Alternative: Use updateShift() from shifts.ts to set staff member to null.
   */
  async unassignStaff(shiftId: string): Promise<void> {
    await this.callFlow<void>('unassignStaff', {
      ShiftID: shiftId,
    });
  }

  /**
   * Remove agency worker from a shift
   *
   * NOTE: Requires HTTP trigger to be added to Component|RemoveShift>AgencyWorkerRelationship flow
   */
  async removeAgencyWorker(shiftId: string): Promise<void> {
    await this.callFlow<void>('removeAgency', {
      ShiftID: shiftId,
    });
  }

  // ===========================================================================
  // NOTIFICATION FLOWS
  // ===========================================================================

  /**
   * Send notifications for published shifts
   *
   * NOTE: Requires HTTP trigger to be added to Component|SendRotaNotifications flow
   */
  async sendRotaNotifications(params: {
    rotaId: string;
    staffMemberIds: string[];
    startDate: string;
    endDate: string;
  }): Promise<void> {
    await this.callFlow<void>('sendNotifications', {
      RotaID: params.rotaId,
      StaffMemberIDs: params.staffMemberIds,
      StartDate: params.startDate,
      EndDate: params.endDate,
    });
  }

  // ===========================================================================
  // EXPORT FLOWS
  // ===========================================================================

  /**
   * Generate PDF export of rota
   *
   * NOTE: Requires HTTP trigger to be added to GeneratePDF flow
   */
  async generatePDF(params: {
    rotaId: string;
    startDate: string;
    endDate: string;
    sublocationName: string;
  }): Promise<Blob> {
    const url = FLOW_URLS.generatePDF;

    if (!url) {
      throw FlowError.notConfigured('generatePDF');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        RotaID: params.rotaId,
        StartDate: params.startDate,
        EndDate: params.endDate,
        SublocationName: params.sublocationName,
      }),
    });

    if (!response.ok) {
      throw new FlowError(
        `PDF generation failed: ${response.statusText}`,
        'generatePDF',
        response.status
      );
    }

    return response.blob();
  }

  // ===========================================================================
  // ERROR LOGGING FLOWS
  // ===========================================================================

  /**
   * Log errors to the ErrorHandlingCanvasApp flow
   *
   * NOTE: Requires HTTP trigger to be added to ErrorHandlingCanvasApp flow
   */
  async logError(error: {
    message: string;
    stack?: string;
    context?: string;
    userId?: string;
    url?: string;
  }): Promise<void> {
    // Don't throw if error logging fails or not configured
    if (!this.isFlowConfigured('errorHandler')) {
      console.warn('[FlowClient] Error handler flow not configured. Logging to console only.');
      console.error('Application error:', error);
      return;
    }

    try {
      await this.callFlow<void>('errorHandler', {
        ErrorMessage: error.message,
        StackTrace: error.stack || '',
        Context: error.context || '',
        UserID: error.userId || '',
        URL: error.url || window.location.href,
        Timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Log to console as fallback
      console.error('Failed to log error to flow:', e);
      console.error('Original error:', error);
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Safely parse JSON with a fallback value
   */
  private safeParseJSON<T>(json: string | null | undefined, fallback: T): T {
    if (!json) return fallback;
    try {
      return JSON.parse(json) as T;
    } catch {
      console.warn('Failed to parse JSON response:', json);
      return fallback;
    }
  }

  /**
   * Convert staff IDs array to XML format for flow input
   */
  static staffIdsToXml(staffIds: string[]): string {
    return staffIds.map((id) => `<item>${id}</item>`).join('');
  }

  /**
   * Build pattern data for bulk shift creation
   */
  static buildPatternData(params: {
    startDate: string;
    endDate: string;
    rotaId: string;
    sublocationId: string;
    patternType: PatternData['PatternType'];
    shiftReferenceId: string;
    shiftActivityId: string;
    breakDuration?: number;
    selectedDays?: PatternData['SelectedDays'];
    flags?: {
      overtime?: boolean;
      sleepIn?: boolean;
      shiftLeader?: boolean;
      actUp?: boolean;
    };
    communityHours?: number;
  }): PatternData {
    return {
      StartDate: params.startDate,
      EndDate: params.endDate,
      RotaID: params.rotaId,
      LocationID: params.sublocationId,
      PatternType: params.patternType,
      ShiftReferenceID: params.shiftReferenceId,
      ShiftActivityID: params.shiftActivityId,
      BreakDuration: params.breakDuration || 0,
      SelectedDays: params.selectedDays,
      OvertimeShift: params.flags?.overtime || false,
      SleepIn: params.flags?.sleepIn || false,
      ShiftLeader: params.flags?.shiftLeader || false,
      ActUp: params.flags?.actUp || false,
      CommunityHours: params.communityHours || 0,
      ShiftSetupType: 'Manual',
    };
  }

  /**
   * Build assigned people array for bulk shift creation
   */
  static buildAssignedPeople(staff: Array<{ id: string; name: string }>): AssignedPerson[] {
    return staff.map((s) => ({
      StaffID: s.id,
      StaffName: s.name,
    }));
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: FlowClient | null = null;

/**
 * Get the Flow client instance
 */
export function getFlowClient(): FlowClient {
  if (!clientInstance) {
    clientInstance = new FlowClient();
  }
  return clientInstance;
}

/**
 * Initialise the Flow client with a token provider
 */
export function initFlowClient(getAccessToken: () => Promise<string>): FlowClient {
  const client = getFlowClient();
  client.setTokenProvider(getAccessToken);
  return client;
}

/**
 * Check if any flows are configured
 */
export function hasConfiguredFlows(): boolean {
  return getFlowClient().getConfiguredFlows().length > 0;
}

/**
 * Get a summary of flow configuration status
 */
export function getFlowConfigurationStatus(): {
  configured: string[];
  unconfigured: string[];
  message: string;
} {
  const client = getFlowClient();
  const configured = client.getConfiguredFlows();
  const unconfigured = client.getUnconfiguredFlows();

  let message: string;
  if (configured.length === 0) {
    message =
      'No Power Automate flows are configured. The app is using direct Dataverse API calls for data operations. ' +
      'To enable flow-based operations, add HTTP Request triggers to the existing flows and configure the environment variables.';
  } else if (unconfigured.length === 0) {
    message = 'All Power Automate flows are configured and ready to use.';
  } else {
    message = `${configured.length} flows configured, ${unconfigured.length} flows need HTTP triggers added.`;
  }

  return { configured, unconfigured, message };
}
