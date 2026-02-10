# CarePoint 365 - Mobile App: Shift Swap & Open Shift Features

**Version:** 1.1  
**Date:** January 2026  
**Target:** React Mobile App Developer  
**Backend:** Dataverse (existing tables), Power Automate Flows

---

## Overview

This specification covers the staff-facing mobile app features for:
1. **Shift Swap** - Staff initiate swap requests with colleagues
2. **Open Shift Offers** - Staff receive and accept open shift notifications

Both features require real-time notifications, WTD compliance display, and integration with existing Dataverse tables.

---

## Data Source Configuration

> **⚠️ IMPORTANT: DUMMY DATA MODE**
>
> For initial development and testing, this application will use **dummy/mock data** rather than live Dataverse connections. This allows frontend development to proceed independently of backend infrastructure.
>
> **Requirements:**
> 1. All data access must be abstracted through a **data service layer**
> 2. Services must implement a common interface that can be swapped between:
>    - `MockDataService` - Returns dummy data for development/testing
>    - `DataverseService` - Connects to live Dataverse via Web API
> 3. A configuration flag (`USE_LIVE_DATAVERSE: boolean`) controls which service is active
> 4. Dummy data should mirror the exact Dataverse schema defined in this document
>
> **Example Service Architecture:**
> ```typescript
> // src/services/dataService.ts
> import { mockDataService } from './mockDataService';
> import { dataverseService } from './dataverseService';
>
> const USE_LIVE_DATAVERSE = false; // Toggle this when ready for live data
>
> export const dataService = USE_LIVE_DATAVERSE 
>   ? dataverseService 
>   : mockDataService;
> ```
>
> **Switching to Live Dataverse:**
> When ready to connect to live Dataverse:
> 1. Set `USE_LIVE_DATAVERSE = true` in configuration
> 2. Configure MSAL authentication for Dataverse Web API
> 3. Set environment-specific Dataverse URL
> 4. No changes required to UI components (they use the abstracted service layer)

---

## Dataverse Schema Reference

> **⚠️ TABLE NAMING - IMPORTANT**
>
> An existing `cp365_shiftswap` table exists in the Dataverse environment and is used by another application.
> To ensure complete data isolation, this specification uses **different table names**:
>
> | Existing Table (DO NOT USE) | New Table (This App) |
> |---------------------------|---------------------|
> | `cp365_shiftswap` | `cp365_swaprequest` |
> | `cp365_RequestStatus` | `cp365_swaprequeststatus` |
> | N/A | `cp365_openshiftoffer` |
> | N/A | `cp365_rotaswapconfig` |
>
> This ensures:
> - No data mixing between old and new applications
> - Both systems can run in parallel during transition
> - No risk of breaking the existing application

---

## PART 1: SHIFT SWAP FEATURE (Staff Mobile App)

### 1.1 User Stories

#### US-1.1: View My Swappable Shifts

**As a** staff member  
**I want to** see which of my upcoming shifts I can swap  
**So that** I can initiate a swap request when needed

**Acceptance Criteria:**
- Display shifts with status "Published" (1001) that haven't started yet
- Show shift date, time, activity, and duration
- Indicate if shift is already in a pending swap (locked)
- Only show shifts in locations where user is assigned

---

#### US-1.2: Initiate Swap Request

**As a** staff member  
**I want to** request to swap my shift with a colleague's shift  
**So that** I can manage my schedule flexibly

**Acceptance Criteria:**
1. Select one of my own shifts to swap
2. System shows list of colleagues with shifts I could take in return
3. Colleagues filtered by: same location, appropriate capabilities, not on leave
4. Select which colleague shift I want in return
5. Add optional notes (max 500 chars)
6. Submit creates a pending swap request
7. Validation: Cannot swap past shifts or shifts already in pending swap
8. Validation: Check monthly swap limit not exceeded

---

#### US-1.3: View My Swap Requests

**As a** staff member  
**I want to** see all my pending, approved, and rejected swap requests  
**So that** I can track the status of my requests

**Acceptance Criteria:**
- Tab 1: "Outgoing" - swaps I initiated
- Tab 2: "Incoming" - swaps requested from me
- Tab 3: "History" - completed/rejected swaps
- Each item shows: colleague name, both shift details, status, dates
- Red highlight if advance notice breached (< 7 days)

---

#### US-1.4: Respond to Incoming Swap Request

**As a** staff member  
**I want to** accept or reject a swap request from a colleague  
**So that** I can decide if the swap works for me

**Acceptance Criteria:**
1. Push notification when swap request received
2. View both shifts side-by-side (mine vs theirs)
3. See any WTD impact for both shifts
4. Accept or Reject with optional notes
5. If accepted, status changes to "Awaiting Manager Approval"
6. If rejected, status changes to "Rejected by Recipient", requester notified

---

#### US-1.5: Receive Swap Outcome Notification

**As a** staff member  
**I want to** be notified when my swap is approved or rejected  
**So that** I know my updated schedule

**Acceptance Criteria:**
- Push notification on manager approval/rejection
- Updated shift appears in "My Shifts" view
- Swapped shift removed from my calendar
- New shift added with all correct details

---

### 1.2 TypeScript Interfaces

```typescript
// ============================================
// SWAP REQUEST TYPES (cp365_swaprequest table)
// ============================================

/**
 * Maps to Dataverse table: cp365_swaprequest
 * Display Name: Swap Request
 * Primary Column: cp365_name (Auto-number: SR-{SEQNUM:6})
 */
interface SwapRequest {
  cp365_swaprequestid: string;            // Primary key (GUID)
  cp365_name: string;                      // Auto-number: "SR-000001"
  
  // Staff involved (Lookups to cp365_staffmember)
  _cp365_requestfrom_value: string;        // Staff Member ID (initiator)
  _cp365_requestto_value: string;          // Staff Member ID (recipient)
  
  // Shifts involved (Lookups to cp365_shift) - for residential care
  _cp365_originalshift_value?: string;     // Initiator's original shift
  _cp365_requestedshift_value?: string;    // Recipient's shift being requested
  
  // Visits involved (Lookups to cp365_visit) - for domiciliary care
  _cp365_originalvisit_value?: string;     // Initiator's original visit
  _cp365_requestedvisit_value?: string;    // Recipient's visit being requested
  
  // Assignment type (determines if shift or visit fields are used)
  cp365_assignmenttype: AssignmentType;    // 100000000=Shift, 100000001=Visit
  
  // Status tracking (cp365_swaprequeststatus choice)
  cp365_requeststatus: SwapRequestStatusCode;
  cp365_advancenoticebreached?: boolean;   // True if < 7 days notice
  cp365_initiatorlimitreached?: boolean;   // True if initiator at monthly limit
  cp365_recipientlimitreached?: boolean;   // True if recipient at monthly limit
  
  // Related entities (Lookups)
  _cp365_rota_value: string;               // Related rota record
  _cp365_location_value: string;           // Location for filtering
  
  // Notes
  cp365_notesfrominitiator?: string;       // Max 2000 chars
  cp365_notesfromrecipient?: string;       // Max 2000 chars
  cp365_managernotes?: string;             // Max 2000 chars
  
  // Timestamps
  createdon: string;                       // ISO datetime
  modifiedon: string;                      // ISO datetime
  cp365_recipientrespondeddate?: string;   // When recipient accepted/declined
  cp365_approveddate?: string;             // When manager approved
  cp365_completeddate?: string;            // When shifts were actually swapped
  cp365_expiresdate?: string;              // When request auto-expires (48h default)
  
  // State
  statecode: number;                       // 0=Active, 1=Inactive
  statuscode: number;                      // Status reason
  
  // Expanded navigation properties (populated when using $expand)
  cp365_requestfrom?: StaffMember;
  cp365_requestto?: StaffMember;
  cp365_originalshift?: Shift;
  cp365_requestedshift?: Shift;
  cp365_originalvisit?: Visit;
  cp365_requestedvisit?: Visit;
}

/**
 * Swap Request Status - Global Choice: cp365_swaprequeststatus
 */
type SwapRequestStatus = 
  | 'AwaitingRecipient'       // 100000000 - Staff initiated, waiting for colleague response
  | 'AwaitingManagerApproval' // 100000001 - Colleague accepted, needs manager approval
  | 'Approved'                // 100000002 - Manager approved, swap completed
  | 'RejectedByRecipient'     // 100000003 - Colleague declined the swap
  | 'RejectedByManager'       // 100000004 - Manager declined the swap
  | 'Cancelled'               // 100000005 - Initiator cancelled the request
  | 'Expired';                // 100000006 - Timed out without response

type SwapRequestStatusCode = 100000000 | 100000001 | 100000002 | 100000003 | 100000004 | 100000005 | 100000006;

const SWAP_REQUEST_STATUS_MAP: Record<SwapRequestStatusCode, SwapRequestStatus> = {
  100000000: 'AwaitingRecipient',
  100000001: 'AwaitingManagerApproval',
  100000002: 'Approved',
  100000003: 'RejectedByRecipient',
  100000004: 'RejectedByManager',
  100000005: 'Cancelled',
  100000006: 'Expired'
};

const SWAP_REQUEST_STATUS_COLOURS: Record<SwapRequestStatusCode, string> = {
  100000000: '#F59E0B', // Amber - Awaiting Recipient
  100000001: '#3B82F6', // Blue - Awaiting Manager Approval
  100000002: '#10B981', // Green - Approved
  100000003: '#EF4444', // Red - Rejected By Recipient
  100000004: '#DC2626', // Dark Red - Rejected By Manager
  100000005: '#6B7280', // Grey - Cancelled
  100000006: '#9CA3AF'  // Light Grey - Expired
};

/**
 * Assignment Type - Global Choice: cp365_assignmenttype
 */
type AssignmentType = 100000000 | 100000001; // 100000000=Shift, 100000001=Visit

const ASSIGNMENT_TYPE_MAP: Record<AssignmentType, 'Shift' | 'Visit'> = {
  100000000: 'Shift',
  100000001: 'Visit'
};

// ============================================
// COLLEAGUE WITH SHIFTS FOR SWAP
// ============================================

interface ColleagueForSwap {
  staffMemberId: string;                    // cp365_staffmemberid
  fullName: string;                         // cp365_forename + cp365_surname
  jobTitle: string;                         // cp365_jobtitle
  profileImageUrl?: string;
  
  // Available shifts to swap with
  availableShifts: SwappableShift[];
  
  // Match indicators
  sameTeam: boolean;
  sameUnit: boolean;
  hasRequiredCapabilities: boolean;
}

interface SwappableShift {
  cp365_shiftid: string;
  cp365_shiftdate: string;                  // ISO date
  cp365_shiftstarttime: string;             // ISO datetime
  cp365_shiftendtime: string;               // ISO datetime
  cp365_shiftlengthminutes: number;
  
  // Activity details (expanded from cp365_shiftactivity)
  activityName: string;                     // cp365_shiftactivityname
  activityType: 'Care' | 'NonCare';         // cp365_shiftactivitycaretype
  
  // Reference (expanded from cp365_shiftreference)
  shiftReferenceName: string;               // cp365_shiftreferencename
  
  // Location (from related rota)
  locationId: string;                       // _cp365_location_value
  locationName: string;
  sublocationId?: string;                   // _cp365_sublocation_value
  sublocationName?: string;
  
  // Swap eligibility (checked against cp365_swaprequest table)
  isLocked: boolean;                        // Already in pending swap
  lockReason?: string;
  pendingSwapRequestId?: string;            // cp365_swaprequestid if locked
}

// ============================================
// SWAP REQUEST CREATION DTO
// ============================================

interface CreateSwapRequestDTO {
  assignmentType: AssignmentType;           // Required: 100000000=Shift, 100000001=Visit
  
  // For Shift swaps (assignmentType = 100000000)
  myShiftId?: string;                       // cp365_shiftid I want to swap away
  colleagueShiftId?: string;                // cp365_shiftid I want to take
  
  // For Visit swaps (assignmentType = 100000001)
  myVisitId?: string;                       // cp365_visitid I want to swap away
  colleagueVisitId?: string;                // cp365_visitid I want to take
  
  // Common fields
  rotaId: string;                           // cp365_rotaid
  locationId: string;                       // cp365_locationid
  notes?: string;                           // cp365_notesfrominitiator (max 2000 chars)
}

/**
 * Record shape for Dataverse POST to cp365_swaprequests
 */
interface SwapRequestCreatePayload {
  'cp365_requestfrom@odata.bind': string;   // /cp365_staffmembers(guid)
  'cp365_requestto@odata.bind': string;     // /cp365_staffmembers(guid)
  'cp365_rota@odata.bind': string;          // /cp365_rotas(guid)
  'cp365_location@odata.bind': string;      // /cp365_locations(guid)
  cp365_assignmenttype: AssignmentType;
  cp365_requeststatus: 100000000;           // Always AwaitingRecipient on create
  cp365_advancenoticebreached?: boolean;
  cp365_notesfrominitiator?: string;
  
  // Conditional: For Shift assignments
  'cp365_originalshift@odata.bind'?: string;
  'cp365_requestedshift@odata.bind'?: string;
  
  // Conditional: For Visit assignments
  'cp365_originalvisit@odata.bind'?: string;
  'cp365_requestedvisit@odata.bind'?: string;
}

interface SwapValidationResult {
  isValid: boolean;
  errors: SwapValidationError[];
  warnings: SwapValidationWarning[];
}

interface SwapValidationError {
  code: 'SHIFT_STARTED' | 'ALREADY_LOCKED' | 'MONTHLY_LIMIT_EXCEEDED' | 
        'NOT_YOUR_SHIFT' | 'CAPABILITY_MISMATCH' | 'LEAVE_CONFLICT' |
        'INVALID_ASSIGNMENT_TYPE';
  message: string;
  field?: string;
}

interface SwapValidationWarning {
  code: 'ADVANCE_NOTICE_BREACHED' | 'WTD_HOURS_HIGH' | 'INITIATOR_NEAR_LIMIT' | 'RECIPIENT_NEAR_LIMIT';
  message: string;
  details?: string;
}

// ============================================
// MY SHIFTS VIEW (for initiating swaps)
// ============================================

interface MyShiftForSwap extends SwappableShift {
  // Additional swap-specific info
  canSwap: boolean;
  swapBlockReason?: string;                 // Why can't swap if false
  pendingSwapRequestId?: string;            // cp365_swaprequestid if already in a swap
  pendingSwapStatus?: SwapRequestStatus;
}

// ============================================
// CONFIGURATION (cp365_rotaswapconfig table)
// ============================================

/**
 * Maps to Dataverse table: cp365_rotaswapconfig
 * Display Name: Rota Swap Configuration
 * Single record per environment with cp365_name = "Default"
 */
interface RotaSwapConfig {
  cp365_rotaswapconfigid: string;
  cp365_name: string;                       // "Default"
  cp365_monthlylimitperstaff: number;       // Default: 5
  cp365_advancenoticedays: number;          // Default: 7
  cp365_blockwithinnotice: boolean;         // Default: false
  cp365_requiresmanagerapproval: boolean;   // Default: true
  cp365_notifyl1manager: boolean;           // Default: true
  cp365_notifyl2manager: boolean;           // Default: true
  cp365_notifyl3manager: boolean;           // Default: true
  cp365_autoapprovesameLevel: boolean;      // Default: false
  cp365_openshiftdefaultexpiry: number;     // Default: 24 (hours)
  cp365_openshiftminmatchscore: number;     // Default: 70 (0-100)
  cp365_wtdwarningthreshold: number;        // Default: 44 (hours)
}
```

---

### 1.3 API Endpoints / Dataverse Queries

> **Note:** These queries show the Dataverse Web API structure. During development with dummy data, 
> implement equivalent mock functions that return the same data shapes.

#### Query 1: Get My Swappable Shifts

```typescript
async function getMySwappableShifts(
  staffMemberId: string,
  locationId: string
): Promise<MyShiftForSwap[]> {
  
  const fetchXml = `
    <fetch>
      <entity name="cp365_shift">
        <attribute name="cp365_shiftid" />
        <attribute name="cp365_shiftname" />
        <attribute name="cp365_shiftdate" />
        <attribute name="cp365_shiftstarttime" />
        <attribute name="cp365_shiftendtime" />
        <attribute name="cp365_shiftlengthminutes" />
        <attribute name="cp365_shiftstatus" />
        
        <!-- Join to Shift Activity -->
        <link-entity name="cp365_shiftactivity" from="cp365_shiftactivityid" 
                     to="cp365_shiftactivity" alias="activity">
          <attribute name="cp365_shiftactivityname" />
          <attribute name="cp365_shiftactivitycaretype" />
        </link-entity>
        
        <!-- Join to Shift Reference -->
        <link-entity name="cp365_shiftreference" from="cp365_shiftreferenceid" 
                     to="cp365_shiftreference" alias="ref">
          <attribute name="cp365_shiftreferencename" />
        </link-entity>
        
        <!-- Join to Rota for Location -->
        <link-entity name="cp365_rota" from="cp365_rotaid" to="cp365_rota" alias="rota">
          <attribute name="cp365_location" />
          <attribute name="cp365_sublocation" />
        </link-entity>
        
        <filter type="and">
          <condition attribute="cp365_staffmember" operator="eq" value="${staffMemberId}" />
          <condition attribute="cp365_shiftstatus" operator="eq" value="1001" /> <!-- Published -->
          <condition attribute="cp365_shiftdate" operator="ge" value="${todayIso()}" />
          <condition attribute="statecode" operator="eq" value="0" /> <!-- Active -->
        </filter>
        
        <order attribute="cp365_shiftdate" />
      </entity>
    </fetch>
  `;
  
  // Post-process to add swap lock status
  // Check cp365_swaprequest table for pending swaps involving these shifts
  // (NOT cp365_shiftswap - that's the old table)
}
```

#### Query 2: Get Colleagues for Swap

```typescript
async function getColleaguesForSwap(
  myShiftId: string,
  locationId: string,
  sublocationId: string,
  myStaffMemberId: string
): Promise<ColleagueForSwap[]> {
  
  // Step 1: Get shift details to find date range
  const myShift = await getShiftById(myShiftId);
  
  // Step 2: Query colleagues with shifts in date range
  const fetchXml = `
    <fetch>
      <entity name="cp365_shift">
        <attribute name="cp365_shiftid" />
        <attribute name="cp365_shiftdate" />
        <attribute name="cp365_shiftstarttime" />
        <attribute name="cp365_shiftendtime" />
        <attribute name="cp365_shiftlengthminutes" />
        <attribute name="cp365_staffmember" />
        
        <!-- Staff details -->
        <link-entity name="cp365_staffmember" from="cp365_staffmemberid" 
                     to="cp365_staffmember" alias="staff">
          <attribute name="cp365_staffmemberid" />
          <attribute name="cp365_forename" />
          <attribute name="cp365_surname" />
          <attribute name="cp365_jobtitle" />
        </link-entity>
        
        <!-- Activity -->
        <link-entity name="cp365_shiftactivity" from="cp365_shiftactivityid" 
                     to="cp365_shiftactivity" alias="activity">
          <attribute name="cp365_shiftactivityname" />
        </link-entity>
        
        <filter type="and">
          <condition attribute="cp365_staffmember" operator="ne" value="${myStaffMemberId}" />
          <condition attribute="cp365_shiftstatus" operator="eq" value="1001" />
          <condition attribute="cp365_shiftdate" operator="ge" value="${todayIso()}" />
          <condition attribute="statecode" operator="eq" value="0" />
        </filter>
        
        <!-- Join via Rota to same location -->
        <link-entity name="cp365_rota" from="cp365_rotaid" to="cp365_rota" alias="rota">
          <filter>
            <condition attribute="cp365_location" operator="eq" value="${locationId}" />
          </filter>
        </link-entity>
        
        <order attribute="cp365_shiftdate" />
      </entity>
    </fetch>
  `;
  
  // Group by staff member and check:
  // - Not on leave on swap date
  // - Has matching capabilities for my shift
  // - Shift not locked in pending swap
}
```

#### Query 3: Check Monthly Swap Limit

```typescript
async function checkMonthlySwapLimit(
  staffMemberId: string
): Promise<{ used: number; limit: number; canCreate: boolean }> {
  
  const startOfMonth = getStartOfMonth();
  const endOfMonth = getEndOfMonth();
  
  // Query the NEW cp365_swaprequest table (NOT cp365_shiftswap)
  const fetchXml = `
    <fetch aggregate="true">
      <entity name="cp365_swaprequest">
        <attribute name="cp365_swaprequestid" alias="count" aggregate="count" />
        <filter type="and">
          <condition attribute="cp365_requestfrom" operator="eq" value="${staffMemberId}" />
          <condition attribute="createdon" operator="ge" value="${startOfMonth}" />
          <condition attribute="createdon" operator="le" value="${endOfMonth}" />
          <!-- Count pending and approved, not rejected -->
          <condition attribute="cp365_requeststatus" operator="in">
            <value>100000000</value> <!-- AwaitingRecipient -->
            <value>100000001</value> <!-- AwaitingManagerApproval -->
            <value>100000002</value> <!-- Approved -->
          </condition>
        </filter>
      </entity>
    </fetch>
  `;
  
  // Get limit from cp365_rotaswapconfig table
  const config = await getSwapConfig();
  const limit = config?.cp365_monthlylimitperstaff || 5;
  
  return {
    used: count,
    limit,
    canCreate: count < limit
  };
}

/**
 * Get configuration from cp365_rotaswapconfig table
 * Returns the "Default" configuration record
 */
async function getSwapConfig(): Promise<RotaSwapConfig | null> {
  // OData query to get default config
  // GET /api/data/v9.2/cp365_rotaswapconfigs?$filter=cp365_name eq 'Default'&$top=1
  
  // For dummy data mode, return mock config:
  return {
    cp365_rotaswapconfigid: 'mock-config-id',
    cp365_name: 'Default',
    cp365_monthlylimitperstaff: 5,
    cp365_advancenoticedays: 7,
    cp365_blockwithinnotice: false,
    cp365_requiresmanagerapproval: true,
    cp365_notifyl1manager: true,
    cp365_notifyl2manager: true,
    cp365_notifyl3manager: true,
    cp365_autoapprovesameLevel: false,
    cp365_openshiftdefaultexpiry: 24,
    cp365_openshiftminmatchscore: 70,
    cp365_wtdwarningthreshold: 44
  };
}
```

#### Mutation: Create Swap Request

```typescript
async function createSwapRequest(
  request: CreateSwapRequestDTO,
  currentUserId: string
): Promise<{ success: boolean; swapRequestId?: string; validation: SwapValidationResult }> {
  
  // 1. Validate
  const validation = await validateSwapRequest(request, currentUserId);
  if (!validation.isValid) {
    return { success: false, validation };
  }
  
  // 2. Check advance notice (use config value, default 7 days)
  const config = await getSwapConfig();
  const advanceNoticeDays = config?.cp365_advancenoticedays || 7;
  
  const shiftDate = request.assignmentType === 100000000 
    ? (await getShiftById(request.myShiftId!)).cp365_shiftdate
    : (await getVisitById(request.myVisitId!)).cp365_visitdate;
  
  const daysUntilShift = differenceInDays(parseISO(shiftDate), new Date());
  const advanceNoticeBreached = daysUntilShift < advanceNoticeDays;
  
  // 3. Get recipient staff ID from their shift/visit
  const recipientStaffId = request.assignmentType === 100000000
    ? (await getShiftById(request.colleagueShiftId!))._cp365_staffmember_value
    : (await getVisitById(request.colleagueVisitId!))._cp365_staffmember_value;
  
  // 4. Build swap request record for cp365_swaprequest table
  const swapRecord: SwapRequestCreatePayload = {
    'cp365_requestfrom@odata.bind': `/cp365_staffmembers(${currentUserId})`,
    'cp365_requestto@odata.bind': `/cp365_staffmembers(${recipientStaffId})`,
    'cp365_rota@odata.bind': `/cp365_rotas(${request.rotaId})`,
    'cp365_location@odata.bind': `/cp365_locations(${request.locationId})`,
    cp365_assignmenttype: request.assignmentType,
    cp365_requeststatus: 100000000,  // AwaitingRecipient
    cp365_advancenoticebreached: advanceNoticeBreached,
    cp365_notesfrominitiator: request.notes || undefined
  };
  
  // Add shift or visit bindings based on assignment type
  if (request.assignmentType === 100000000) {
    // Shift assignment
    swapRecord['cp365_originalshift@odata.bind'] = `/cp365_shifts(${request.myShiftId})`;
    swapRecord['cp365_requestedshift@odata.bind'] = `/cp365_shifts(${request.colleagueShiftId})`;
  } else {
    // Visit assignment
    swapRecord['cp365_originalvisit@odata.bind'] = `/cp365_visits(${request.myVisitId})`;
    swapRecord['cp365_requestedvisit@odata.bind'] = `/cp365_visits(${request.colleagueVisitId})`;
  }
  
  // 5. POST to cp365_swaprequests (NOT cp365_shiftswaps)
  const result = await dataverse.create('cp365_swaprequests', swapRecord);
  
  // 6. Trigger notification flow to recipient
  await triggerPowerAutomateFlow('NotifySwapRecipient', {
    swapRequestId: result.id,
    recipientId: recipientStaffId
  });
  
  return {
    success: true,
    swapRequestId: result.id,
    validation
  };
}
```

#### Mutation: Respond to Swap Request

```typescript
async function respondToSwapRequest(
  swapRequestId: string,
  accept: boolean,
  notes?: string
): Promise<{ success: boolean }> {
  
  // Update cp365_swaprequest record (NOT cp365_shiftswap)
  const update = {
    cp365_requeststatus: accept ? 100000001 : 100000003, // AwaitingManager or RejectedByRecipient
    cp365_notesfromrecipient: notes || null,
    cp365_recipientrespondeddate: new Date().toISOString()
  };
  
  await dataverse.update('cp365_swaprequests', swapRequestId, update);
  
  // Trigger appropriate notification flow
  const flowName = accept ? 'NotifySwapAwaitingApproval' : 'NotifySwapRejectedByRecipient';
  await triggerPowerAutomateFlow(flowName, { swapRequestId });
  
  return { success: true };
}
```

---

### 1.4 UI Components (React Native / React)

#### Component: SwapInitiationScreen

```
┌─────────────────────────────────────────┐
│ ← Select Shift to Swap                  │
├─────────────────────────────────────────┤
│                                         │
│  Monthly Swaps: 2 of 5 used             │
│  ════════════════════════════           │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📅 Mon 27 Jan                       ││
│  │    07:00 - 15:00 (8h)               ││
│  │    Standard Hours - Day Care        ││
│  │    ▸ Select                         ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📅 Tue 28 Jan                       ││
│  │    14:00 - 22:00 (8h)               ││
│  │    Standard Hours - Day Care        ││
│  │    🔒 Pending swap with J. Smith    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📅 Wed 29 Jan                       ││
│  │    07:00 - 15:00 (8h)               ││
│  │    Standard Hours - Day Care        ││
│  │    ▸ Select                         ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

#### Component: ColleagueSelectionScreen

```
┌─────────────────────────────────────────┐
│ ← Select Colleague's Shift              │
├─────────────────────────────────────────┤
│  Your Shift: Mon 27 Jan, 07:00-15:00    │
├─────────────────────────────────────────┤
│  🔍 Search colleague...                 │
├─────────────────────────────────────────┤
│                                         │
│  👤 Jane Smith                          │
│  ┌─────────────────────────────────────┐│
│  │ 📅 Tue 28 Jan                       ││
│  │    14:00 - 22:00 (8h)               ││
│  │    Standard Hours - Day Care        ││
│  │    ▸ Select                         ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 📅 Thu 30 Jan                       ││
│  │    07:00 - 15:00 (8h)               ││
│  │    Standard Hours - Day Care        ││
│  │    ▸ Select                         ││
│  └─────────────────────────────────────┘│
│                                         │
│  👤 Ahmed Khan                          │
│  ┌─────────────────────────────────────┐│
│  │ 📅 Wed 29 Jan                       ││
│  │    22:00 - 07:00 (9h)               ││
│  │    Standard Hours - Night Care      ││
│  │    ▸ Select                         ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

#### Component: SwapConfirmationModal

```
┌─────────────────────────────────────────┐
│           Confirm Swap Request          │
├─────────────────────────────────────────┤
│                                         │
│  You Give:                              │
│  ┌─────────────────────────────────────┐│
│  │ Mon 27 Jan · 07:00 - 15:00          ││
│  │ Standard Hours (8h)                 ││
│  └─────────────────────────────────────┘│
│                    ⇅                    │
│  You Get:                               │
│  ┌─────────────────────────────────────┐│
│  │ Tue 28 Jan · 14:00 - 22:00          ││
│  │ Standard Hours (8h)                 ││
│  │ From: Jane Smith                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ⚠️ Less than 7 days notice - manager   │
│     will be alerted                     │
│                                         │
│  Notes (optional):                      │
│  ┌─────────────────────────────────────┐│
│  │ Medical appointment on Monday       ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌───────────────┐ ┌───────────────────┐│
│  │    Cancel     │ │   Send Request    ││
│  └───────────────┘ └───────────────────┘│
└─────────────────────────────────────────┘
```

#### Component: IncomingSwapCard

```
┌─────────────────────────────────────────┐
│ 🔄 Swap Request from Jane Smith         │
│    Received: 2 hours ago                │
├─────────────────────────────────────────┤
│                                         │
│  Jane wants your shift:                 │
│  ┌─────────────────────────────────────┐│
│  │ Tue 28 Jan · 14:00 - 22:00          ││
│  │ Standard Hours (8h)                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  In return, you get:                    │
│  ┌─────────────────────────────────────┐│
│  │ Mon 27 Jan · 07:00 - 15:00          ││
│  │ Standard Hours (8h)                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  💬 "Medical appointment on Monday"     │
│                                         │
│  ┌───────────────┐ ┌───────────────────┐│
│  │    Decline    │ │      Accept       ││
│  └───────────────┘ └───────────────────┘│
└─────────────────────────────────────────┘
```

---

### 1.5 Implementation Prompts

#### Prompt 1: Swap Request Types and State

```
Create the TypeScript types and Zustand store for shift swap functionality.

FILE: src/types/swapRequest.ts
- SwapRequest interface with all fields from Dataverse cp365_swaprequest table
- SwapRequestStatus union type and SwapRequestStatusCode type
- AssignmentType for Shift/Visit distinction
- ColleagueForSwap and SwappableShift interfaces
- CreateSwapRequestDTO and SwapRequestCreatePayload types
- RotaSwapConfig interface for configuration

FILE: src/stores/swapRequestStore.ts
- State: mySwappableShifts, colleaguesForSwap, myOutgoingRequests, myIncomingRequests, config
- Actions: fetchMyShifts, fetchColleagues, createSwapRequest, respondToSwapRequest, fetchConfig
- Computed: pendingIncomingCount (for badge)

IMPORTANT: Use cp365_swaprequest table (NOT cp365_shiftswap - that's the old system)
Field names: cp365_requeststatus (not cp365_swapstatus), cp365_swaprequestid (not cp365_shiftswapid)
Status codes: 100000000=AwaitingRecipient, 100000001=AwaitingManagerApproval,
100000002=Approved, 100000003=RejectedByRecipient, 100000004=RejectedByManager,
100000005=Cancelled, 100000006=Expired

FILE: src/services/swapRequestService.ts
- Implement data service interface with mock and live implementations
- USE_LIVE_DATAVERSE flag to toggle between dummy data and Dataverse
```

---

#### Prompt 2: My Shifts for Swap Screen

```
Create the SwapInitiationScreen component showing staff's swappable shifts.

FILE: src/screens/swap/SwapInitiationScreen.tsx

Requirements:
1. Header showing monthly swap usage: "2 of 5 used" with progress bar
   - Limit comes from cp365_rotaswapconfig.cp365_monthlylimitperstaff (default 5)
2. List of upcoming published shifts owned by current user
3. Each shift card shows:
   - Date and day of week
   - Start/end time and duration
   - Shift reference and activity name
   - Location
4. Locked shifts (already in pending swap) show lock icon and swap partner name
5. Tapping unlocked shift navigates to ColleagueSelectionScreen
6. Empty state if no swappable shifts

Use FetchXML query to get shifts where:
- cp365_staffmember = currentUserId
- cp365_shiftstatus = 1001 (Published)
- cp365_shiftdate >= today
- statecode = 0 (Active)

Check cp365_swaprequest table (NOT cp365_shiftswap) for any pending swaps involving these shifts.
Filter by cp365_requeststatus in (100000000, 100000001) for pending states.

For dummy data mode: Return mock shifts with realistic test data.
```

---

#### Prompt 3: Colleague Selection Screen

```
Create the ColleagueSelectionScreen for selecting which colleague's shift to swap with.

FILE: src/screens/swap/ColleagueSelectionScreen.tsx

Requirements:
1. Header shows user's selected shift details
2. Search box to filter colleagues by name
3. Colleagues grouped alphabetically
4. Under each colleague, list their available shifts
5. Each colleague shift shows:
   - Date, time, duration
   - Shift reference and activity
   - Lock indicator if already in swap
6. Tapping shift opens confirmation modal

Filter colleagues:
- Same location as user's shift
- Has shifts in the next 4 weeks
- Not on leave on the shift date
- Shift not locked in pending swap

Sort by: date ascending within each colleague group.
```

---

#### Prompt 4: Swap Confirmation and Creation

```
Create the swap request confirmation flow and API integration.

FILE: src/screens/swap/SwapConfirmationModal.tsx

Requirements:
1. Show "You Give" card with user's shift details
2. Show "You Get" card with colleague's shift details
3. Warning banner if advance notice breached (< cp365_advancenoticedays from config, default 7)
4. Optional notes textarea (2000 char limit - cp365_notesfrominitiator max length)
5. Cancel and "Send Request" buttons
6. Loading state during submission
7. Success/error feedback

FILE: src/services/swapRequestService.ts

createSwapRequest function:
1. Validate shifts haven't started
2. Check monthly limit against cp365_rotaswapconfig.cp365_monthlylimitperstaff
3. Calculate advance notice breach using cp365_rotaswapconfig.cp365_advancenoticedays
4. Create cp365_swaprequest record (NOT cp365_shiftswap) with cp365_requeststatus = 100000000
5. Set cp365_assignmenttype to 100000000 (Shift) for residential care shifts
6. Trigger Power Automate flow "NotifySwapRecipient"
7. Return success/validation result

On success, navigate back to swap list with success toast.

For dummy data mode: Simulate record creation with UUID generation, return mock response.
```

---

#### Prompt 5: Incoming Swap Requests

```
Create the incoming swap request handling screens.

FILE: src/screens/swap/SwapRequestsScreen.tsx

Tab layout:
- Tab 1: Outgoing (swaps I created) - filter by _cp365_requestfrom_value = currentUserId
- Tab 2: Incoming (swaps sent to me) - filter by _cp365_requestto_value = currentUserId
- Tab 3: History (completed/rejected) - filter by cp365_requeststatus in (100000002, 100000003, 100000004, 100000005, 100000006)

FILE: src/components/swap/IncomingSwapCard.tsx

Card displays:
1. Requester name and profile image (from cp365_requestfrom expanded)
2. "Received X hours/days ago" timestamp (from createdon)
3. "They want your shift" with shift card (cp365_requestedshift)
4. "You would get" with their shift card (cp365_originalshift)
5. Their notes (cp365_notesfrominitiator if any)
6. Accept/Decline buttons

FILE: src/services/swapRequestService.ts (add)

respondToSwapRequest function:
1. Update cp365_requeststatus to 100000001 (accept) or 100000003 (reject)
2. Set cp365_recipientrespondeddate to current ISO datetime
3. Save cp365_notesfromrecipient (max 2000 chars)
4. POST to cp365_swaprequests endpoint
5. Trigger notification flow

Push notification badge on Incoming tab showing count of requests with cp365_requeststatus = 100000000.

For dummy data mode: Update mock data array, simulate state transitions.
```

---

#### Prompt 6: Swap Notifications

```
Implement push notification handling for swap events.

FILE: src/services/swapNotifications.ts

Handle these notification types:
1. SWAP_REQUEST_RECEIVED - someone sent you a swap request
2. SWAP_ACCEPTED_BY_RECIPIENT - your request was accepted, awaiting manager
3. SWAP_REJECTED_BY_RECIPIENT - your request was declined
4. SWAP_APPROVED_BY_MANAGER - swap completed, shifts exchanged
5. SWAP_REJECTED_BY_MANAGER - manager declined the swap

Each notification:
- Shows as push notification with appropriate message
- Tapping opens relevant screen
- Updates badge count
- Refreshes swap list in background

Notification payloads come from Power Automate flows with swapId included.
```

---

## PART 2: OPEN SHIFT OFFERS (Staff Mobile App)

### 2.1 User Stories

#### US-2.1: Receive Open Shift Notification

**As a** staff member  
**I want to** receive notifications when open shifts match my profile  
**So that** I can pick up extra work

**Acceptance Criteria:**
- Push notification with shift date, time, and location
- Notification includes match score and WTD status
- Tapping opens shift details screen
- Only receive if WTD compliant and not on leave

---

#### US-2.2: View Open Shift Details

**As a** staff member  
**I want to** see full details of an open shift offer  
**So that** I can decide if I want to accept it

**Acceptance Criteria:**
1. Shift date, time, duration
2. Location and sublocation
3. Activity type and any special requirements
4. My match score breakdown
5. WTD compliance indicator (green/amber/red)
6. If amber/red, show hours worked this week and impact

---

#### US-2.3: Accept Open Shift

**As a** staff member  
**I want to** accept an open shift offer  
**So that** I can confirm I will work that shift

**Acceptance Criteria:**
1. Accept button on shift details
2. Confirmation modal with final check
3. If WTD warning, require acknowledgment
4. On accept, shift assigned to me immediately
5. Success message and calendar update
6. If shift was taken by someone else, show "No longer available" error

---

#### US-2.4: View My Open Shift Offers

**As a** staff member  
**I want to** see all open shift offers available to me  
**So that** I can browse and select ones that suit me

**Acceptance Criteria:**
- List of all open shifts I've been notified about
- Sorted by date or match score
- Filter by date range
- Show expiration countdown for each offer
- Indicate if I've already viewed/dismissed

---

### 2.2 TypeScript Interfaces

```typescript
// ============================================
// OPEN SHIFT OFFER TYPES (cp365_openshiftoffer table)
// ============================================

/**
 * Maps to Dataverse table: cp365_openshiftoffer
 * Display Name: Open Shift Offer
 * Primary Column: cp365_name (Auto-number: OSO-{SEQNUM:8})
 */
interface OpenShiftOffer {
  cp365_openshiftofferid: string;          // Primary key (GUID)
  cp365_name: string;                       // Auto-number: "OSO-00000001"
  
  // Assignment (one of these will be populated based on type)
  _cp365_shift_value?: string;             // Lookup to cp365_shift (for residential)
  _cp365_visit_value?: string;             // Lookup to cp365_visit (for domiciliary)
  _cp365_staffmember_value: string;        // Lookup to cp365_staffmember (who received offer)
  
  // Status tracking (cp365_openshiftofferstatus choice)
  cp365_offerstatus: OpenShiftOfferStatusCode;
  
  // Matching
  cp365_matchscore: number;                // 0-100, whole number
  cp365_scorebreakdown?: string;           // JSON string with score details
  
  // Timestamps
  cp365_offereddate: string;               // When notification was sent (ISO datetime)
  cp365_respondeddate?: string;            // When staff responded
  cp365_expiresat: string;                 // When offer expires (ISO datetime)
  cp365_isexpired: boolean;                // True if expired without response
  
  // Response
  cp365_responsenotes?: string;            // Staff notes (max 500 chars)
  
  // Notification
  cp365_notificationscope: NotificationScopeCode; // sublocation/location/all
  cp365_notificationsent: boolean;         // Whether push notification was sent
  
  // State
  statecode: number;                       // 0=Active, 1=Inactive
  
  // Expanded navigation properties (when using $expand)
  cp365_shift?: Shift;
  cp365_visit?: Visit;
  cp365_staffmember?: StaffMember;
}

/**
 * Open Shift Offer Status - Global Choice: cp365_openshiftofferstatus
 */
type OpenShiftOfferStatus = 
  | 'Pending'    // 100000000 - Awaiting staff response
  | 'Accepted'   // 100000001 - Staff accepted the shift
  | 'Declined'   // 100000002 - Staff declined the shift
  | 'Expired'    // 100000003 - Offer timed out
  | 'Cancelled'; // 100000004 - Offer cancelled (e.g., shift filled)

type OpenShiftOfferStatusCode = 100000000 | 100000001 | 100000002 | 100000003 | 100000004;

const OPEN_SHIFT_OFFER_STATUS_MAP: Record<OpenShiftOfferStatusCode, OpenShiftOfferStatus> = {
  100000000: 'Pending',
  100000001: 'Accepted',
  100000002: 'Declined',
  100000003: 'Expired',
  100000004: 'Cancelled'
};

const OPEN_SHIFT_OFFER_STATUS_COLOURS: Record<OpenShiftOfferStatusCode, string> = {
  100000000: '#F59E0B', // Amber - Pending
  100000001: '#10B981', // Green - Accepted
  100000002: '#EF4444', // Red - Declined
  100000003: '#6B7280', // Grey - Expired
  100000004: '#9CA3AF'  // Light Grey - Cancelled
};

/**
 * Notification Scope - Global Choice: cp365_notificationscope
 */
type NotificationScope = 'Sublocation' | 'Location' | 'All';
type NotificationScopeCode = 100000000 | 100000001 | 100000002;

const NOTIFICATION_SCOPE_MAP: Record<NotificationScopeCode, NotificationScope> = {
  100000000: 'Sublocation',
  100000001: 'Location',
  100000002: 'All'
};

/**
 * Match Score Breakdown - stored as JSON in cp365_scorebreakdown
 */
interface MatchScoreBreakdown {
  availabilityScore: number;    // 0-30 points - available at shift time
  skillsMatch: number;          // 0-20 points - required skills match
  continuityScore: number;      // 0-25 points - previous visits to service user
  travelDistance: number;       // 0-10 points - for domiciliary
  preferenceMatch: number;      // 0-15 points - shift preferences
  totalScore: number;           // 0-100 (same as cp365_matchscore)
}

interface WTDComplianceStatus {
  status: 'Compliant' | 'Warning' | 'AtRisk';
  hoursThisWeek: number;
  hoursWithShift: number;
  weeklyLimit: number;          // Usually 48
  warningThreshold: number;     // From cp365_rotaswapconfig.cp365_wtdwarningthreshold (default 44)
  message: string;
  
  // Rest period compliance
  restPeriodOk: boolean;
  hoursSinceLastShift?: number;
  
  // Night work limits (if applicable)
  nightWorkOk: boolean;
  nightHoursThisPeriod?: number;
}

// ============================================
// ACCEPT RESPONSE
// ============================================

interface AcceptOpenShiftResult {
  success: boolean;
  error?: 'SHIFT_TAKEN' | 'WTD_VIOLATION' | 'CAPABILITY_CHANGED' | 'ON_LEAVE' | 'OFFER_EXPIRED';
  message: string;
  assignedShiftId?: string;
  assignedVisitId?: string;
}
```

---

### 2.3 UI Components

#### Component: OpenShiftOfferCard

```
┌─────────────────────────────────────────┐
│ 🟢 85% Match                   Expires │
│                               in 4h 32m │
├─────────────────────────────────────────┤
│                                         │
│ 📅 Wednesday 29 January                 │
│    07:00 - 15:00 (8 hours)              │
│                                         │
│ 📍 Forestry House - Ground Floor        │
│                                         │
│ 💼 Day Care - Standard Hours            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ WTD Status: ✅ Compliant             │ │
│ │ 32h this week → 40h with this shift │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌───────────────┐ ┌───────────────────┐ │
│ │    Dismiss    │ │   View Details    │ │
│ └───────────────┘ └───────────────────┘ │
└─────────────────────────────────────────┘
```

#### Component: OpenShiftDetailsScreen

```
┌─────────────────────────────────────────┐
│ ← Open Shift Details                    │
├─────────────────────────────────────────┤
│                                         │
│ 📅 Wednesday 29 January 2026            │
│    07:00 - 15:00                        │
│    8 hours                              │
│                                         │
├─────────────────────────────────────────┤
│ Location                                │
│ Forestry House                          │
│ Ground Floor Unit                       │
│                                         │
├─────────────────────────────────────────┤
│ Activity                                │
│ Day Care - Standard Hours               │
│ Care Activity                           │
│                                         │
├─────────────────────────────────────────┤
│ Your Match Score                        │
│ ┌─────────────────────────────────────┐ │
│ │ ████████████████████░░░░░ 85%       │ │
│ ├─────────────────────────────────────┤ │
│ │ Capabilities      ████████░░ 28/30  │ │
│ │ Location          ██████████ 20/20  │ │
│ │ Pattern Match     ████████░░ 16/20  │ │
│ │ Performance       ██████░░░░ 10/15  │ │
│ │ Availability      ████████░░ 11/15  │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ Working Time Directive                  │
│ ┌─────────────────────────────────────┐ │
│ │ ✅ Compliant                         │ │
│ │                                     │ │
│ │ Hours this week:        32h         │ │
│ │ This shift:             +8h         │ │
│ │ Total if accepted:      40h         │ │
│ │ Weekly limit:           48h         │ │
│ │                                     │ │
│ │ 11+ hours rest after last shift ✓   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │           Accept This Shift          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Offer expires in 4 hours 32 minutes     │
│                                         │
└─────────────────────────────────────────┘
```

#### Component: WTD Warning Modal

```
┌─────────────────────────────────────────┐
│          ⚠️ WTD Warning                 │
├─────────────────────────────────────────┤
│                                         │
│  Accepting this shift will bring you    │
│  close to the weekly working limit.     │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Current hours:        44h          ││
│  │ This shift:           +8h          ││
│  │ Total:                52h          ││
│  │ Weekly limit:         48h          ││
│  │                                    ││
│  │ ⚠️ 4 hours over recommended limit  ││
│  └─────────────────────────────────────┘│
│                                         │
│  You may still accept if you have       │
│  opted out of the 48-hour limit.        │
│                                         │
│  ☐ I understand and wish to proceed    │
│                                         │
│  ┌───────────────┐ ┌───────────────────┐│
│  │    Cancel     │ │   Accept Anyway   ││
│  └───────────────┘ └───────────────────┘│
└─────────────────────────────────────────┘
```

---

### 2.4 Implementation Prompts

#### Prompt 7: Open Shift Types and Store

```
Create the TypeScript types and state management for open shift offers.

FILE: src/types/openShiftOffer.ts
- OpenShiftOffer interface mapping to cp365_openshiftoffer table
- OpenShiftOfferStatus and OpenShiftOfferStatusCode types
- NotificationScope and NotificationScopeCode types
- MatchScoreBreakdown (stored as JSON in cp365_scorebreakdown)
- WTDComplianceStatus with compliance details
- AcceptOpenShiftResult for API responses

FILE: src/stores/openShiftOfferStore.ts
- State: pendingOffers, acceptedOffers, declinedOffers, config
- Actions: fetchMyOffers, acceptOffer, declineOffer, markViewed
- Computed: pendingCount (for badge - cp365_offerstatus = 100000000), 
            nearingExpiry (offers where cp365_expiresat < 2h from now)

Query cp365_openshiftoffer table filtered by:
- _cp365_staffmember_value = currentUserId
- cp365_offerstatus = 100000000 (Pending)
- cp365_isexpired = false
- Expand cp365_shift for shift details

WTD calculation:
- Get staff's shifts for current week from cp365_shift
- Sum cp365_shiftlengthminutes
- Compare against cp365_rotaswapconfig.cp365_wtdwarningthreshold (default 44h)

For dummy data mode: Return mock offers with realistic test data.
```

---

#### Prompt 8: Open Shift Offers List

```
Create the OpenShiftOffersScreen showing available shifts to pick up.

FILE: src/screens/openShifts/OpenShiftOffersScreen.tsx

Requirements:
1. Header with "X open shifts available" count
2. Sort toggle: "By Date" / "By Match Score"
3. Date filter: This week / Next week / All
4. List of OpenShiftOfferCard components
5. Pull-to-refresh
6. Empty state if no offers

Each card shows:
- Match score badge (green >80, amber 60-80, grey <60)
- Expiration countdown
- Date, time, duration
- Location name
- WTD compliance indicator
- Dismiss / View Details buttons

FILE: src/components/openShifts/OpenShiftOfferCard.tsx
Reusable card component with tap to expand details.
```

---

#### Prompt 9: Open Shift Details and Accept

```
Create the open shift details screen with acceptance flow.

FILE: src/screens/openShifts/OpenShiftDetailsScreen.tsx

Sections:
1. Shift basic info (date, time, location, activity)
2. Match score breakdown with visual bars
3. WTD compliance panel with hours calculation
4. Accept button (full width, prominent)
5. Expiration countdown at bottom

FILE: src/components/openShifts/WTDCompliancePanel.tsx
Shows:
- Status indicator (green check / amber warning / red alert)
- Hours this week
- Hours if shift accepted
- Weekly limit
- Rest period compliance

FILE: src/components/openShifts/WTDWarningModal.tsx
For amber/red status:
- Explain the WTD concern
- Show hours breakdown
- Checkbox: "I understand and wish to proceed"
- Cancel / Accept buttons

FILE: src/api/openShifts.ts

acceptOpenShift function:
1. Re-validate shift still available
2. Re-check WTD compliance
3. Update shift record: assign to staff, status to Published
4. Create acceptance record
5. Cancel other pending offers for this shift
6. Trigger manager notification
7. Return result with new shift ID
```

---

#### Prompt 10: Open Shift Notifications

```
Implement push notification handling for open shift offers.

FILE: src/services/openShiftNotifications.ts

Notification types:
1. OPEN_SHIFT_AVAILABLE - new shift matching your profile
2. OPEN_SHIFT_EXPIRING - offer expires in 1 hour
3. OPEN_SHIFT_ACCEPTED - your acceptance confirmed
4. OPEN_SHIFT_TAKEN - shift was taken by someone else

Notification payload includes:
- offerId
- shiftId
- matchScore
- expiresAt

On OPEN_SHIFT_AVAILABLE:
- Show notification with shift date/time
- Include match score: "85% match - Wed 29 Jan, 07:00-15:00"
- Tapping opens OpenShiftDetailsScreen

On OPEN_SHIFT_EXPIRING:
- Show reminder: "Open shift offer expires in 1 hour"
- Include shift summary
- Tapping opens offer details

Badge count shows total pending offers.
```

---

## PART 3: SHARED COMPONENTS

### 3.1 Shift Card Component

```
FILE: src/components/common/ShiftCard.tsx

Reusable shift display card used across swap and open shift features.

Props:
- shift: Shift (basic shift data)
- variant: 'compact' | 'detailed'
- showLocation: boolean
- showActivity: boolean
- highlighted: boolean
- locked: boolean
- lockReason?: string
- onPress?: () => void

Displays:
- Date with day name
- Time range and duration
- Activity and shift reference
- Location (if showLocation)
- Lock icon and reason (if locked)
```

### 3.2 WTD Indicator Component

```
FILE: src/components/common/WTDIndicator.tsx

Small inline indicator showing WTD status.

Props:
- status: 'Compliant' | 'Warning' | 'AtRisk'
- hoursWorked: number
- hoursLimit: number
- compact: boolean

Displays:
- Green/Amber/Red dot
- "32h / 48h" text
- Tooltip with details on press
```

---

## Dataverse Schema Reference

### New Tables (This Application)

| Table | Logical Name | Primary Key | Description |
|-------|--------------|-------------|-------------|
| Swap Request | `cp365_swaprequest` | `cp365_swaprequestid` | Shift/visit swap requests between staff |
| Open Shift Offer | `cp365_openshiftoffer` | `cp365_openshiftofferid` | Notifications to staff for open shifts |
| Rota Swap Configuration | `cp365_rotaswapconfig` | `cp365_rotaswapconfigid` | System-wide configuration settings |

> **⚠️ DO NOT USE:** `cp365_shiftswap` - This is the OLD table used by another application

### Swap Request Table (`cp365_swaprequest`)

| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| ID | `cp365_swaprequestid` | GUID | Primary key |
| Name | `cp365_name` | Auto-number | SR-{SEQNUM:6} |
| Request From | `cp365_requestfrom` | Lookup → cp365_staffmember | Initiator |
| Request To | `cp365_requestto` | Lookup → cp365_staffmember | Recipient |
| Original Shift | `cp365_originalshift` | Lookup → cp365_shift | Initiator's shift |
| Requested Shift | `cp365_requestedshift` | Lookup → cp365_shift | Recipient's shift |
| Original Visit | `cp365_originalvisit` | Lookup → cp365_visit | For domiciliary |
| Requested Visit | `cp365_requestedvisit` | Lookup → cp365_visit | For domiciliary |
| Assignment Type | `cp365_assignmenttype` | Choice | Shift (100000000) or Visit (100000001) |
| Request Status | `cp365_requeststatus` | Choice | See status values below |
| Rota | `cp365_rota` | Lookup → cp365_rota | Related rota |
| Location | `cp365_location` | Lookup → cp365_location | For filtering |
| Notes From Initiator | `cp365_notesfrominitiator` | Text (2000) | Reason/notes |
| Notes From Recipient | `cp365_notesfromrecipient` | Text (2000) | Response notes |
| Manager Notes | `cp365_managernotes` | Text (2000) | Approval notes |
| Advance Notice Breached | `cp365_advancenoticebreached` | Yes/No | < 7 days notice |
| Recipient Responded Date | `cp365_recipientrespondeddate` | DateTime | When recipient responded |
| Approved Date | `cp365_approveddate` | DateTime | When manager approved |
| Completed Date | `cp365_completeddate` | DateTime | When swap executed |
| Expires Date | `cp365_expiresdate` | DateTime | Auto-expiry (48h default) |

### Open Shift Offer Table (`cp365_openshiftoffer`)

| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| ID | `cp365_openshiftofferid` | GUID | Primary key |
| Name | `cp365_name` | Auto-number | OSO-{SEQNUM:8} |
| Shift | `cp365_shift` | Lookup → cp365_shift | The open shift |
| Visit | `cp365_visit` | Lookup → cp365_visit | For domiciliary |
| Staff Member | `cp365_staffmember` | Lookup → cp365_staffmember | Who received offer |
| Offer Status | `cp365_offerstatus` | Choice | See status values below |
| Match Score | `cp365_matchscore` | Whole Number | 0-100 |
| Score Breakdown | `cp365_scorebreakdown` | Text | JSON with score details |
| Offered Date | `cp365_offereddate` | DateTime | When notification sent |
| Responded Date | `cp365_respondeddate` | DateTime | When staff responded |
| Response Notes | `cp365_responsenotes` | Text (500) | Staff notes |
| Expires At | `cp365_expiresat` | DateTime | When offer expires |
| Is Expired | `cp365_isexpired` | Yes/No | Expired without response |
| Notification Scope | `cp365_notificationscope` | Choice | sublocation/location/all |
| Notification Sent | `cp365_notificationsent` | Yes/No | Push notification sent |

### Existing Tables Used

| Table | Logical Name | Key Fields |
|-------|--------------|------------|
| Shifts | `cp365_shift` | cp365_shiftid, cp365_shiftdate, cp365_shiftstarttime, cp365_shiftendtime, cp365_staffmember, cp365_shiftstatus |
| Staff Members | `cp365_staffmember` | cp365_staffmemberid, cp365_forename, cp365_surname |
| Rotas | `cp365_rota` | cp365_rotaid, cp365_location, cp365_sublocation |
| Locations | `cp365_location` | cp365_locationid, cp365_locationname |
| Visits | `cp365_visit` | cp365_visitid, cp365_visitdate (for domiciliary care) |

### Shift Status Values (cp365_shiftstatus)

| Value | Label | Use |
|-------|-------|-----|
| 1001 | Published | Normal assigned shift |
| 1005 | Open | Unassigned, available for offers |
| 1006 | Filling | Open with pending acceptance |

### Swap Request Status Values (cp365_swaprequeststatus)

| Value | Label | Colour |
|-------|-------|--------|
| 100000000 | Awaiting Recipient | #F59E0B (Amber) |
| 100000001 | Awaiting Manager Approval | #3B82F6 (Blue) |
| 100000002 | Approved | #10B981 (Green) |
| 100000003 | Rejected by Recipient | #EF4444 (Red) |
| 100000004 | Rejected by Manager | #DC2626 (Dark Red) |
| 100000005 | Cancelled | #6B7280 (Grey) |
| 100000006 | Expired | #9CA3AF (Light Grey) |

### Open Shift Offer Status Values (cp365_openshiftofferstatus)

| Value | Label | Colour |
|-------|-------|--------|
| 100000000 | Pending | #F59E0B (Amber) |
| 100000001 | Accepted | #10B981 (Green) |
| 100000002 | Declined | #EF4444 (Red) |
| 100000003 | Expired | #6B7280 (Grey) |
| 100000004 | Cancelled | #9CA3AF (Light Grey) |

### Notification Scope Values (cp365_notificationscope)

| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Sublocation | Only staff in same sublocation |
| 100000001 | Location | All staff in the location |
| 100000002 | All | All eligible staff across organisation |

### Assignment Type Values (cp365_assignmenttype)

| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Shift | Residential care shift |
| 100000001 | Visit | Domiciliary care visit |

---

## Power Automate Flows Required

| Flow Name | Trigger | Action |
|-----------|---------|--------|
| NotifySwapRecipient | On swap created | Send push to recipient staff |
| NotifySwapAwaitingApproval | On recipient accept | Notify initiator + managers |
| NotifySwapRejectedByRecipient | On recipient reject | Notify initiator |
| NotifySwapApproved | On manager approve | Notify both staff, execute swap |
| NotifySwapRejected | On manager reject | Notify both staff |
| SendOpenShiftOffers | On shift marked Open | Calculate matches, send offers |
| NotifyOpenShiftAccepted | On staff accept | Update shift, notify manager |
| ExpireOpenShiftOffers | Scheduled | Expire offers past deadline |

---

## Testing Checklist

### Data Service Layer Tests
- [ ] MockDataService returns realistic dummy data matching Dataverse schema
- [ ] DataverseService correctly constructs OData/FetchXML queries
- [ ] USE_LIVE_DATAVERSE flag correctly switches between services
- [ ] Both services implement identical interface
- [ ] All field names match Dataverse schema (cp365_ prefix)

### Shift Swap Tests (cp365_swaprequest table)
- [ ] Staff can view their swappable shifts
- [ ] Locked shifts show correct lock reason (checked against cp365_swaprequest)
- [ ] Monthly limit prevents excess swaps (from cp365_rotaswapconfig)
- [ ] Colleagues filtered correctly by location
- [ ] Advance notice warning shows for <7 days (or configured value)
- [ ] Swap request creates correct cp365_swaprequest record (NOT cp365_shiftswap)
- [ ] cp365_requeststatus correctly set to 100000000 on creation
- [ ] cp365_assignmenttype correctly set (100000000=Shift, 100000001=Visit)
- [ ] Recipient receives push notification
- [ ] Accept/Reject updates cp365_requeststatus correctly
- [ ] Manager notification triggered on accept (100000001)
- [ ] History shows completed/rejected swaps
- [ ] Records have correct auto-number format (SR-000001)

### Open Shift Offer Tests (cp365_openshiftoffer table)
- [ ] Offers display with correct match scores (cp365_matchscore)
- [ ] WTD calculation uses cp365_rotaswapconfig.cp365_wtdwarningthreshold
- [ ] WTD warning modal appears for amber/red status
- [ ] Accept updates cp365_offerstatus to 100000001
- [ ] Decline updates cp365_offerstatus to 100000002
- [ ] "Shift taken" error when cp365_offerstatus already 100000001
- [ ] Expiration countdown uses cp365_expiresat
- [ ] cp365_isexpired flag correctly set when expired
- [ ] Push notifications use cp365_notificationsent flag
- [ ] Badge count shows cp365_offerstatus = 100000000 count
- [ ] Records have correct auto-number format (OSO-00000001)

### Integration Tests
- [ ] Verify NO data written to old cp365_shiftswap table
- [ ] Configuration values correctly loaded from cp365_rotaswapconfig
- [ ] Power Automate flows receive correct swapRequestId/offerId

---

## Summary of All Dataverse Objects

| Object Type | Logical Name | Display Name | Notes |
|-------------|--------------|--------------|-------|
| **Table** | `cp365_swaprequest` | Swap Request | NEW - replaces cp365_shiftswap |
| **Table** | `cp365_openshiftoffer` | Open Shift Offer | NEW |
| **Table** | `cp365_rotaswapconfig` | Rota Swap Configuration | NEW |
| **Choice** | `cp365_swaprequeststatus` | Swap Request Status | Global, 7 values |
| **Choice** | `cp365_openshiftofferstatus` | Open Shift Offer Status | Global, 5 values |
| **Choice** | `cp365_notificationscope` | Notification Scope | Global, 3 values |
| **Choice** | `cp365_assignmenttype` | Assignment Type | Global, 2 values |

---

## Related Documentation

- **Dataverse Integration Guide:** `docs/SHIFT-SWAP-DATAVERSE-INTEGRATION.md` - Full backend schema and Power Automate flows
- **Build Prompts:** `docs/SHIFT-SWAP-DATAVERSE-BUILD-PROMPTS.md` - Step-by-step prompts for Dataverse setup

---

*Document Version: 1.1*  
*Last Updated: January 2026*  
*For use with CarePoint 365 Rota Management System*
