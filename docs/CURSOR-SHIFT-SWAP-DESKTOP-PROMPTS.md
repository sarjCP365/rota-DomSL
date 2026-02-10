# CarePoint 365 - Desktop Rota App: Shift Swap & Open Shift Management

**Version:** 1.0  
**Date:** January 2026  
**Target:** Cursor AI - React Desktop Application  
**Context:** Manager-facing features for the existing Rota Management web app

---

## Overview

This specification provides Cursor AI prompts for implementing manager-side features:

1. **Requests Tab** - New tab showing pending swap requests awaiting approval
2. **Swap Approval Workflow** - Manager approve/reject with notifications
3. **Open Shift Management** - Mark shifts as open, view candidate responses
4. **Configuration** - System parameters for swap limits and rules

These features integrate with the existing React rota application built with TypeScript, React Query, and Dataverse.

---

## PROMPT 1: Shift Swap Types and Interfaces

**User Story:**
> As a developer, I need TypeScript interfaces for shift swap management, so that I can build type-safe components for the approval workflow.

**Prompt:**
```
Create TypeScript types for shift swap management in the rota desktop app.

FILE: src/types/shiftSwap.ts

```typescript
// ============================================
// SHIFT SWAP STATUS
// ============================================

type ShiftSwapStatus = 
  | 'AwaitingRecipient'       // 100000000 - Staff initiated, waiting for colleague
  | 'AwaitingManagerApproval' // 100000001 - Colleague accepted, needs manager
  | 'Approved'                // 100000002 - Manager approved, swap completed
  | 'RejectedByRecipient'     // 100000003 - Colleague declined
  | 'RejectedByManager'       // 100000004 - Manager declined
  | 'Cancelled'               // 100000005 - Initiator cancelled
  | 'Expired';                // 100000006 - Timed out

const SWAP_STATUS_VALUES: Record<ShiftSwapStatus, number> = {
  AwaitingRecipient: 100000000,
  AwaitingManagerApproval: 100000001,
  Approved: 100000002,
  RejectedByRecipient: 100000003,
  RejectedByManager: 100000004,
  Cancelled: 100000005,
  Expired: 100000006
};

// ============================================
// SHIFT SWAP RECORD
// ============================================

interface ShiftSwap {
  cp365_shiftswapid: string;
  cp365_name: string;
  
  // Staff involved
  _cp365_requestfrom_value: string;
  requestFromName?: string;
  requestFromJobTitle?: string;
  
  _cp365_requestto_value: string;
  requestToName?: string;
  requestToJobTitle?: string;
  
  // Shifts involved
  _cp365_originalshift_value: string;
  originalShiftDetails?: ShiftSummary;
  
  _cp365_requestedshift_value: string;
  requestedShiftDetails?: ShiftSummary;
  
  // Status
  cp365_swapstatus: number;
  swapStatusLabel?: ShiftSwapStatus;
  
  // Flags
  cp365_advancenoticebreached?: boolean;
  
  // Notes
  cp365_notesfrominitiator?: string;
  cp365_notesfromrecipient?: string;
  cp365_managernotes?: string;
  
  // Timestamps
  createdon: string;
  cp365_recipientrespondeddate?: string;
  cp365_swapapproveddate?: string;
  cp365_swapcompleteddate?: string;
  
  // Rota reference
  _cp365_rota_value: string;
}

interface ShiftSummary {
  cp365_shiftid: string;
  cp365_shiftdate: string;
  cp365_shiftstarttime: string;
  cp365_shiftendtime: string;
  cp365_shiftlengthminutes: number;
  shiftReferenceName?: string;
  activityName?: string;
  staffMemberName?: string;
}

// ============================================
// MANAGER APPROVAL
// ============================================

interface SwapApprovalRequest {
  swapId: string;
  approved: boolean;
  managerNotes?: string;
}

interface SwapApprovalResult {
  success: boolean;
  error?: string;
  swapId: string;
  newStatus: ShiftSwapStatus;
}

// ============================================
// PENDING SWAPS QUERY
// ============================================

interface PendingSwapsFilter {
  locationId?: string;
  sublocationId?: string;
  status?: ShiftSwapStatus[];
  dateFrom?: string;
  dateTo?: string;
  staffMemberId?: string;
  advanceNoticeBreachedOnly?: boolean;
}

interface PendingSwapsSummary {
  awaitingApproval: number;
  advanceNoticeBreached: number;
  thisWeek: number;
  thisMonth: number;
}
```

Include:
- All status values mapped to Dataverse option set codes
- Helper functions to convert between code and label
- Type guards for status checks
```

---

## PROMPT 2: Requests Tab Navigation

**User Story:**
> As a rota manager, I need a new "Requests" tab in the rota navigation, so that I can access pending swap requests from the main rota view.

**Prompt:**
```
Add a "Requests" tab to the rota navigation with badge count for pending approvals.

MODIFY: src/components/rota/RotaNavigation.tsx (or equivalent navigation component)

Requirements:

1. Add new tab after existing tabs:
   ```
   [Weekly] [Monthly] [Daily] [Requests (3)]
   ```

2. Tab styling:
   - Same style as existing view tabs
   - Badge showing count of pending approvals (AwaitingManagerApproval status)
   - Badge is red/orange if any have advance notice breached
   - Badge hidden if count is 0

3. Tab route:
   - Route: /rota/requests
   - Maintains current location/sublocation/rota filters
   - URL params: ?location=X&sublocation=Y

4. Badge data source:
   - Query cp365_shiftswap where:
     - cp365_swapstatus = 100000001 (AwaitingManagerApproval)
     - Related rota matches current location filter
   - Count includes only swaps manager has access to approve
   - Refresh on tab focus and after any approval action

5. Real-time update:
   - Badge count refreshes every 60 seconds
   - Immediate refresh when returning to rota from other screens
   - React Query with staleTime: 30000

Create hook: src/hooks/usePendingSwapCount.ts
```typescript
function usePendingSwapCount(locationId?: string, sublocationId?: string): {
  count: number;
  hasUrgent: boolean;  // Any with advanceNoticeBreached
  isLoading: boolean;
}
```

Visual mockup:
```
┌─────────────────────────────────────────────────────────────────┐
│  [≡]  CarePoint365 - Rota Management                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐       │
│  │ Weekly  │ │ Monthly │ │  Daily  │ │ Requests  🔴 3  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘       │
│                                                                 │
```
```

---

## PROMPT 3: Requests List View

**User Story:**
> As a rota manager, I need to see all pending swap requests in a list, so that I can review and process them efficiently.

**Prompt:**
```
Create the Requests tab content showing pending swap requests.

FILE: src/pages/RequestsView.tsx

Requirements:

1. Header section:
   ```
   Shift Swap Requests
   
   Summary: 3 awaiting approval | 1 urgent (< 7 days notice)
   
   [Filter: All] [Filter: Urgent Only] [Date Range: This Week ▼]
   ```

2. Filter bar:
   - Status filter: All Pending | Urgent Only
   - Date range: This Week | Next Week | This Month | Custom
   - Staff search: Filter by initiator or recipient name
   - Location filter inherited from main rota

3. Request cards layout (vertical list):
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 🔴 URGENT - Less than 7 days notice                         │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │  Jane Smith  →  Ahmed Khan                                  │
   │  HR Manager     Support Worker                              │
   │                                                             │
   │  ┌─────────────────────┐    ┌─────────────────────┐        │
   │  │ Jane's Shift        │    │ Ahmed's Shift       │        │
   │  │ Mon 27 Jan          │ ⇄  │ Tue 28 Jan          │        │
   │  │ 07:00 - 15:00 (8h)  │    │ 14:00 - 22:00 (8h)  │        │
   │  │ Day Care            │    │ Day Care            │        │
   │  └─────────────────────┘    └─────────────────────┘        │
   │                                                             │
   │  Requested: 22 Jan 2026 at 09:15                           │
   │  Recipient accepted: 22 Jan 2026 at 14:30                  │
   │                                                             │
   │  Notes from Jane: "Medical appointment on Monday"          │
   │                                                             │
   │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │
   │  │    Reject     │  │    Approve    │  │   View Details  │ │
   │  └───────────────┘  └───────────────┘  └─────────────────┘ │
   └─────────────────────────────────────────────────────────────┘
   ```

4. Card elements:
   - Urgent banner (red) if advance notice breached
   - Staff photos/avatars with names and job titles
   - Both shifts side-by-side with swap arrow
   - Timeline: requested date, recipient response date
   - Notes from initiator and recipient (if any)
   - Action buttons: Reject, Approve, View Details

5. Empty state:
   - "No pending swap requests"
   - Show if filtered to zero results

6. Sorting:
   - Default: Urgent first, then by request date (oldest first)
   - Option to sort by shift date (soonest first)

FILE: src/components/requests/SwapRequestCard.tsx
Reusable card component with all elements above.

Props:
- swap: ShiftSwap
- onApprove: (swapId: string) => void
- onReject: (swapId: string) => void
- onViewDetails: (swapId: string) => void
```

---

## PROMPT 4: Swap Approval/Rejection Flow

**User Story:**
> As a rota manager, I need to approve or reject swap requests with optional notes, so that I can manage shift coverage appropriately.

**Prompt:**
```
Implement the approval and rejection workflow for swap requests.

FILE: src/components/requests/SwapApprovalModal.tsx

APPROVE MODAL:
```
┌─────────────────────────────────────────────────────────────┐
│                    Approve Shift Swap                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This will swap the following shifts:                       │
│                                                             │
│  Jane Smith will work:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tue 28 Jan · 14:00 - 22:00                          │   │
│  │ Previously: Ahmed Khan's shift                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Ahmed Khan will work:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Mon 27 Jan · 07:00 - 15:00                          │   │
│  │ Previously: Jane Smith's shift                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ This swap is within 7 days of the shift dates.         │
│                                                             │
│  Notes (optional):                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │       Cancel        │  │      Confirm Approval       │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

REJECT MODAL:
```
┌─────────────────────────────────────────────────────────────┐
│                    Reject Shift Swap                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Are you sure you want to reject this swap request?         │
│                                                             │
│  Jane Smith ⇄ Ahmed Khan                                    │
│  Mon 27 Jan    Tue 28 Jan                                   │
│                                                             │
│  Reason for rejection (required):                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Insufficient coverage on Monday                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │       Cancel        │  │      Confirm Rejection      │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

FILE: src/api/shiftSwap.ts

```typescript
async function approveSwapRequest(
  swapId: string, 
  managerNotes?: string
): Promise<SwapApprovalResult> {
  // 1. Update swap record status to Approved (100000002)
  // 2. Set cp365_swapapproveddate = now
  // 3. Set cp365_swapcompleteddate = now
  // 4. Set cp365_managernotes
  
  // 5. Execute the swap:
  //    - Update original shift: cp365_staffmember = recipient
  //    - Update requested shift: cp365_staffmember = initiator
  
  // 6. Trigger Power Automate: NotifySwapApproved
  //    - Sends notifications to both staff
  //    - Notifies L1, L2, L3 location managers
  
  // 7. Invalidate React Query caches for:
  //    - Pending swaps count
  //    - Rota view (affected dates)
  //    - Both staff members' shift data
}

async function rejectSwapRequest(
  swapId: string, 
  managerNotes: string  // Required for rejection
): Promise<SwapApprovalResult> {
  // 1. Update swap record status to RejectedByManager (100000004)
  // 2. Set cp365_managernotes (required)
  
  // 3. Trigger Power Automate: NotifySwapRejected
  //    - Sends notifications to both staff with rejection reason
  
  // 4. Invalidate React Query caches
}
```

Requirements:
- Approve button disabled while processing
- Success toast: "Swap approved. Both staff members have been notified."
- Error handling with retry option
- Optimistic UI update (remove from list immediately)
- Rejection requires notes (validation)
```

---

## PROMPT 5: Swap Details Slide-over Panel

**User Story:**
> As a rota manager, I need to view full details of a swap request including staff history and potential conflicts, so that I can make informed approval decisions.

**Prompt:**
```
Create a detailed slide-over panel for viewing swap request information.

FILE: src/components/requests/SwapDetailsPanel.tsx

Layout (slide from right, 500px wide):
```
┌─────────────────────────────────────────────────────────────┐
│ ← Swap Request Details                              [Close] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ STATUS: Awaiting Manager Approval                           │
│ ⚠️ Urgent - Less than 7 days notice                         │
│                                                             │
├───────────────── INITIATOR ─────────────────────────────────┤
│                                                             │
│ 👤 Jane Smith                                               │
│    HR Manager · Employment                                  │
│                                                             │
│    Giving up:                                               │
│    ┌───────────────────────────────────────────────────┐   │
│    │ Mon 27 Jan · 07:00 - 15:00 (8h)                   │   │
│    │ Day Care - Standard Hours                         │   │
│    │ Forestry House - Ground Floor                     │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    Swap history: 2 swaps this month (limit: 5)             │
│                                                             │
│    Notes: "Medical appointment on Monday"                   │
│                                                             │
├───────────────── RECIPIENT ─────────────────────────────────┤
│                                                             │
│ 👤 Ahmed Khan                                               │
│    Support Worker · Permanent                               │
│                                                             │
│    Giving up:                                               │
│    ┌───────────────────────────────────────────────────┐   │
│    │ Tue 28 Jan · 14:00 - 22:00 (8h)                   │   │
│    │ Day Care - Standard Hours                         │   │
│    │ Forestry House - Ground Floor                     │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    Swap history: 0 swaps this month (limit: 5)             │
│                                                             │
│    Notes: "Happy to help"                                   │
│                                                             │
├───────────────── TIMELINE ──────────────────────────────────┤
│                                                             │
│ ● Request created                                           │
│   22 Jan 2026 at 09:15 by Jane Smith                       │
│                                                             │
│ ● Recipient accepted                                        │
│   22 Jan 2026 at 14:30 by Ahmed Khan                       │
│                                                             │
│ ○ Awaiting manager approval                                 │
│   You                                                       │
│                                                             │
├───────────────── IMPACT CHECK ──────────────────────────────┤
│                                                             │
│ ✅ No scheduling conflicts detected                         │
│ ✅ Both staff have required capabilities                    │
│ ⚠️ Mon 27 Jan: Only 2 senior staff after swap              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │       Reject        │  │         Approve             │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Sections:
1. Status header with urgency indicator
2. Initiator section: staff details, their shift, swap count, notes
3. Recipient section: same structure
4. Timeline: visual progress of the request
5. Impact check: automated checks for conflicts
6. Action buttons at bottom

Impact checks to run:
- Capability match for both shifts
- Minimum staffing levels on affected dates
- Senior staff coverage
- Any leave or conflicts on swap dates

Use existing API to fetch additional data for impact checks.
```

---

## PROMPT 6: Open Shift Management - Mark as Open

**User Story:**
> As a rota manager, I need to mark an unassigned shift as "Open" to trigger notifications, so that suitable staff can be notified and pick up the shift.

**Prompt:**
```
Add ability to mark shifts as Open from the rota grid and trigger notifications.

MODIFY: src/components/rota/ShiftContextMenu.tsx (or shift action component)

Add menu option for unassigned shifts:
```
Right-click on unassigned shift cell:
┌─────────────────────────┐
│ Assign Staff...         │
│ Edit Shift...           │
│ ─────────────────────── │
│ 📢 Mark as Open Shift   │  ← NEW OPTION
│ Delete Shift            │
└─────────────────────────┘
```

FILE: src/components/shifts/MarkOpenShiftModal.tsx

Modal for configuring open shift notification:
```
┌─────────────────────────────────────────────────────────────┐
│                   Mark as Open Shift                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Shift Details:                                             │
│  Wed 29 Jan · 07:00 - 15:00 (8h)                           │
│  Day Care - Standard Hours                                  │
│  Forestry House - Ground Floor                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Notification Settings:                                     │
│                                                             │
│  Notify staff from:                                         │
│  ○ This sublocation only                                    │
│  ● This location (all sublocations)                         │
│  ○ All locations                                            │
│                                                             │
│  Minimum match score: [70%  ▼]                              │
│                                                             │
│  Offer expires in: [24 hours ▼]                             │
│                                                             │
│  Include staff on annual leave: [ ]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Preview: Estimated 12 staff will be notified               │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │       Cancel        │  │   Send Notifications        │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

FILE: src/api/openShifts.ts

```typescript
interface MarkOpenShiftRequest {
  shiftId: string;
  notificationScope: 'sublocation' | 'location' | 'all';
  minimumMatchScore: number;
  expiresInHours: number;
  includeOnLeave: boolean;
}

async function markShiftAsOpen(request: MarkOpenShiftRequest): Promise<{
  success: boolean;
  notifiedCount: number;
  candidates: CandidateSummary[];
}> {
  // 1. Update shift status to Open (1005)
  
  // 2. Trigger Power Automate: CalculateOpenShiftCandidates
  //    - Runs matching algorithm
  //    - Calculates match scores
  //    - Checks WTD compliance
  
  // 3. Trigger Power Automate: SendOpenShiftNotifications
  //    - Sends push notifications to matched staff
  //    - Creates offer records
  
  // 4. Return count and candidate summary
}

async function previewOpenShiftCandidates(
  shiftId: string,
  scope: 'sublocation' | 'location' | 'all',
  minimumScore: number
): Promise<CandidateSummary[]> {
  // Preview matching without sending notifications
}
```

On success:
- Shift cell on rota shows "Open" indicator
- Toast: "Notifications sent to 12 staff members"
- Shift status updated to 1005 (Open)
```

---

## PROMPT 7: Open Shift Tracking Dashboard

**User Story:**
> As a rota manager, I need to see which open shifts have been notified and track responses, so that I can monitor coverage and manually assign if needed.

**Prompt:**
```
Create a dashboard view for tracking open shift notifications and responses.

FILE: src/pages/OpenShiftsDashboard.tsx

Accessed from: Hamburger menu → "Open Shifts" or from Requests tab

Layout:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Open Shifts Dashboard                              [Location: All ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Summary:  🟡 3 Open  |  🟢 2 Accepted Today  |  🔴 1 Expired       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Date       │ Time        │ Activity      │ Notified │ Status       │
├────────────┼─────────────┼───────────────┼──────────┼──────────────┤
│ Wed 29 Jan │ 07:00-15:00 │ Day Care      │ 12       │ 🟡 Open      │
│            │             │               │          │ [▼ Details]  │
├────────────┼─────────────┼───────────────┼──────────┼──────────────┤
│ Thu 30 Jan │ 14:00-22:00 │ Day Care      │ 8        │ 🟡 Open      │
│            │             │               │          │ [▼ Details]  │
├────────────┼─────────────┼───────────────┼──────────┼──────────────┤
│ Fri 31 Jan │ 22:00-07:00 │ Night Care    │ 5        │ 🟢 Accepted  │
│            │             │               │          │ J. Smith     │
└─────────────────────────────────────────────────────────────────────┘
```

Expandable row details:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Wed 29 Jan · 07:00-15:00 · Day Care                                │
│ Forestry House - Ground Floor                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Notified 12 staff · Expires in 18h 32m                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Responses:                                                          │
│                                                                     │
│ 👤 Jane Smith     │ 92% match │ ⏳ Pending  │ Notified 2h ago       │
│ 👤 Ahmed Khan     │ 85% match │ ❌ Declined │ "Already committed"   │
│ 👤 Sarah Johnson  │ 78% match │ ⏳ Pending  │ Notified 2h ago       │
│ 👤 Mike Brown     │ 75% match │ ⏳ Pending  │ Notified 2h ago       │
│ ... +8 more                                                         │
│                                                                     │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│ │  Resend Offers  │  │  Extend Expiry  │  │  Manually Assign    │  │
│ └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

Features:
1. Table with sortable columns
2. Expandable rows showing candidate responses
3. Filter by status: All | Open | Accepted | Expired
4. Actions:
   - Resend: Re-notify staff who haven't responded
   - Extend: Add more time to expiry
   - Manually Assign: Open staff picker to assign directly

FILE: src/components/openShifts/OpenShiftRow.tsx
FILE: src/components/openShifts/CandidateResponseList.tsx

Query: Fetch shifts with status = 1005 (Open) or recently accepted open shifts.
Include related notification/offer records with responses.
```

---

## PROMPT 8: Configuration - Swap System Parameters

**User Story:**
> As a system administrator, I need to configure swap limits and rules, so that I can control how staff use the swap feature.

**Prompt:**
```
Create configuration UI for shift swap system parameters.

FILE: src/pages/admin/SwapConfiguration.tsx

Accessed from: Admin menu → Rostering Configuration → Shift Swaps

Layout:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Shift Swap Configuration                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Monthly Limits                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Maximum swaps per staff member per month:                           │
│ ┌──────┐                                                            │
│ │  5   │  (counts pending and approved, not rejected)              │
│ └──────┘                                                            │
│                                                                     │
│ Advance Notice                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Minimum days notice for swap request:                               │
│ ┌──────┐                                                            │
│ │  7   │  (swaps within this period flagged as urgent)             │
│ └──────┘                                                            │
│                                                                     │
│ ☐ Block swaps within advance notice period (currently just warns)  │
│                                                                     │
│ Approval Workflow                                                   │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Swaps require manager approval: ● Yes  ○ No                         │
│                                                                     │
│ Notify these manager levels on approval:                            │
│ ☑ L1 Location Manager                                               │
│ ☑ L2 Location Manager                                               │
│ ☑ L3 Location Manager                                               │
│                                                                     │
│ Auto-approve swaps between same-level staff: ○ Yes  ● No            │
│                                                                     │
│ Open Shift Settings                                                 │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ Default offer expiry: [24 hours ▼]                                  │
│                                                                     │
│ Default minimum match score: [70%      ▼]                           │
│                                                                     │
│ WTD warning threshold: [44] hours per week                          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                             ┌────────────────────┐  │
│                                             │   Save Changes     │  │
│                                             └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

Configuration stored in: cp365_configuration table (or environment variables)

Keys:
- SwapMonthlyLimit (integer, default 5)
- SwapAdvanceNoticeDays (integer, default 7)
- SwapBlockWithinNotice (boolean, default false)
- SwapRequiresApproval (boolean, default true)
- SwapNotifyL1Manager (boolean, default true)
- SwapNotifyL2Manager (boolean, default true)
- SwapNotifyL3Manager (boolean, default true)
- SwapAutoApproveSameLevel (boolean, default false)
- OpenShiftDefaultExpiry (integer hours, default 24)
- OpenShiftMinMatchScore (integer percent, default 70)
- WTDWarningThreshold (integer hours, default 44)

FILE: src/api/configuration.ts
```typescript
interface SwapConfiguration {
  swapMonthlyLimit: number;
  swapAdvanceNoticeDays: number;
  swapBlockWithinNotice: boolean;
  swapRequiresApproval: boolean;
  swapNotifyL1Manager: boolean;
  swapNotifyL2Manager: boolean;
  swapNotifyL3Manager: boolean;
  swapAutoApproveSameLevel: boolean;
  openShiftDefaultExpiry: number;
  openShiftMinMatchScore: number;
  wtdWarningThreshold: number;
}

async function getSwapConfiguration(): Promise<SwapConfiguration>
async function updateSwapConfiguration(config: Partial<SwapConfiguration>): Promise<void>
```
```

---

## PROMPT 9: Rota Grid - Open Shift Indicator

**User Story:**
> As a rota manager, I need to see which shifts are marked as Open directly on the rota grid, so that I can track coverage gaps visually.

**Prompt:**
```
Add visual indicator on rota grid for Open shifts and show notification status.

MODIFY: src/components/rota/ShiftCell.tsx

Requirements:

1. Open shift visual styling:
   - Background: Light orange/amber (#FFF3E0)
   - Border: Dashed orange border
   - Icon: 📢 or bell icon in corner
   - Text: "OPEN" label instead of staff name

2. Hover tooltip for open shifts:
   ```
   Open Shift
   ─────────────
   Notified: 12 staff
   Responses: 2 declined, 10 pending
   Expires: 18h 32m
   
   Click to view candidates
   ```

3. Click behavior:
   - Opens slide-over panel with candidate list
   - Same as OpenShiftsDashboard expandable row

4. After acceptance:
   - Shift immediately shows assigned staff name
   - Brief "Just filled" indicator (green pulse)
   - Normal styling resumes

Visual example in grid:
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Mon 27      │ Tue 28      │ Wed 29      │ Thu 30      │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ J. Smith    │ J. Smith    │┌───────────┐│ J. Smith    │
│ 07:00-15:00 │ 07:00-15:00 ││📢 OPEN    ││ 07:00-15:00 │
│             │             ││07:00-15:00││             │
│             │             │└───────────┘│             │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ A. Khan     │ A. Khan     │ A. Khan     │┌───────────┐│
│ 14:00-22:00 │ 14:00-22:00 │ 14:00-22:00 ││📢 OPEN    ││
│             │             │             ││14:00-22:00││
│             │             │             │└───────────┘│
└─────────────┴─────────────┴─────────────┴─────────────┘
```

FILE: src/components/rota/OpenShiftCandidatesPanel.tsx

Slide-over panel showing:
- Shift details
- List of notified candidates with scores
- Response status for each
- Actions: Resend, Extend, Manually Assign
```

---

## PROMPT 10: Shift Swap History Report

**User Story:**
> As a rota manager, I need to view historical swap data and generate reports, so that I can analyze patterns and staff usage.

**Prompt:**
```
Create a swap history view with filtering and export capabilities.

FILE: src/pages/reports/SwapHistoryReport.tsx

Layout:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Shift Swap History                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Date Range: [01/01/2026] to [31/01/2026]  [Apply]                  │
│                                                                     │
│ Filters:                                                            │
│ Status: [All ▼]  Staff: [All ▼]  Location: [All ▼]                 │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Summary                                                         │ │
│ │ Total requests: 45 | Approved: 38 | Rejected: 5 | Cancelled: 2 │ │
│ │ Avg processing time: 4.2 hours | Advance notice breaches: 8    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Date       │ Initiator   │ Recipient   │ Shifts        │ Status    │
├────────────┼─────────────┼─────────────┼───────────────┼───────────┤
│ 22 Jan     │ J. Smith    │ A. Khan     │ Mon↔Tue       │ ✅ Approved│
│ 20 Jan     │ S. Johnson  │ M. Brown    │ Wed↔Thu       │ ✅ Approved│
│ 18 Jan     │ L. Wilson   │ K. Davis    │ Fri↔Sat       │ ❌ Rejected│
│ ...        │             │             │               │           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Staff Usage This Month:                                             │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ J. Smith      ████████░░ 4/5 swaps                           │   │
│ │ A. Khan       ██░░░░░░░░ 1/5 swaps                           │   │
│ │ S. Johnson    ██████░░░░ 3/5 swaps                           │   │
│ │ M. Brown      ░░░░░░░░░░ 0/5 swaps                           │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌─────────────────────┐                                            │
│ │  Export to Excel    │                                            │
│ └─────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

Features:
1. Date range picker with presets (This week, This month, Last month)
2. Filterable by status, staff member, location
3. Summary statistics card
4. Sortable table with all swap records
5. Staff usage bar chart showing swaps per person vs limit
6. Export to Excel functionality

FILE: src/api/swapReports.ts
```typescript
interface SwapHistoryQuery {
  dateFrom: string;
  dateTo: string;
  status?: ShiftSwapStatus[];
  staffMemberId?: string;
  locationId?: string;
}

interface SwapHistorySummary {
  total: number;
  approved: number;
  rejectedByRecipient: number;
  rejectedByManager: number;
  cancelled: number;
  expired: number;
  avgProcessingHours: number;
  advanceNoticeBreaches: number;
}

interface StaffSwapUsage {
  staffMemberId: string;
  staffName: string;
  swapsThisMonth: number;
  monthlyLimit: number;
}

async function getSwapHistory(query: SwapHistoryQuery): Promise<ShiftSwap[]>
async function getSwapSummary(query: SwapHistoryQuery): Promise<SwapHistorySummary>
async function getStaffSwapUsage(locationId: string, month: Date): Promise<StaffSwapUsage[]>
async function exportSwapHistory(query: SwapHistoryQuery): Promise<Blob>
```
```

---

## Dataverse Queries Reference

### Query: Pending Swaps for Manager Approval

```typescript
const fetchXml = `
<fetch>
  <entity name="cp365_shiftswap">
    <all-attributes />
    
    <!-- Expand initiator -->
    <link-entity name="cp365_staffmember" from="cp365_staffmemberid" 
                 to="cp365_requestfrom" alias="initiator" link-type="outer">
      <attribute name="cp365_forename" />
      <attribute name="cp365_surname" />
      <attribute name="cp365_jobtitle" />
    </link-entity>
    
    <!-- Expand recipient -->
    <link-entity name="cp365_staffmember" from="cp365_staffmemberid" 
                 to="cp365_requestto" alias="recipient" link-type="outer">
      <attribute name="cp365_forename" />
      <attribute name="cp365_surname" />
      <attribute name="cp365_jobtitle" />
    </link-entity>
    
    <!-- Expand original shift -->
    <link-entity name="cp365_shift" from="cp365_shiftid" 
                 to="cp365_originalshift" alias="origshift" link-type="outer">
      <attribute name="cp365_shiftdate" />
      <attribute name="cp365_shiftstarttime" />
      <attribute name="cp365_shiftendtime" />
      <attribute name="cp365_shiftlengthminutes" />
    </link-entity>
    
    <!-- Expand requested shift -->
    <link-entity name="cp365_shift" from="cp365_shiftid" 
                 to="cp365_requestedshift" alias="reqshift" link-type="outer">
      <attribute name="cp365_shiftdate" />
      <attribute name="cp365_shiftstarttime" />
      <attribute name="cp365_shiftendtime" />
      <attribute name="cp365_shiftlengthminutes" />
    </link-entity>
    
    <!-- Filter to location via rota -->
    <link-entity name="cp365_rota" from="cp365_rotaid" to="cp365_rota" alias="rota">
      <filter>
        <condition attribute="cp365_location" operator="eq" value="${locationId}" />
      </filter>
    </link-entity>
    
    <filter type="and">
      <condition attribute="cp365_swapstatus" operator="eq" value="100000001" />
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
    
    <order attribute="cp365_advancenoticebreached" descending="true" />
    <order attribute="createdon" />
  </entity>
</fetch>
`;
```

### Query: Open Shifts with Candidates

```typescript
const fetchXml = `
<fetch>
  <entity name="cp365_shift">
    <all-attributes />
    
    <!-- Shift details -->
    <link-entity name="cp365_shiftactivity" from="cp365_shiftactivityid" 
                 to="cp365_shiftactivity" alias="activity" link-type="outer">
      <attribute name="cp365_shiftactivityname" />
    </link-entity>
    
    <link-entity name="cp365_shiftreference" from="cp365_shiftreferenceid" 
                 to="cp365_shiftreference" alias="ref" link-type="outer">
      <attribute name="cp365_shiftreferencename" />
    </link-entity>
    
    <!-- Location via rota -->
    <link-entity name="cp365_rota" from="cp365_rotaid" to="cp365_rota" alias="rota">
      <attribute name="cp365_location" />
      <attribute name="cp365_sublocation" />
      <filter>
        <condition attribute="cp365_location" operator="eq" value="${locationId}" />
      </filter>
    </link-entity>
    
    <filter type="and">
      <condition attribute="cp365_shiftstatus" operator="eq" value="1005" />
      <condition attribute="cp365_shiftdate" operator="ge" value="${todayIso()}" />
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
    
    <order attribute="cp365_shiftdate" />
  </entity>
</fetch>
`;
```

---

## Power Automate Flows Required

| Flow Name | Trigger | Description |
|-----------|---------|-------------|
| NotifySwapApproved | HTTP (from app) | Updates shifts, notifies both staff and location managers |
| NotifySwapRejected | HTTP (from app) | Notifies both staff with rejection reason |
| CalculateOpenShiftCandidates | HTTP (from app) | Runs matching algorithm, returns scored candidates |
| SendOpenShiftNotifications | HTTP (from app) | Creates offer records, sends push notifications |
| ProcessOpenShiftAcceptance | HTTP (from mobile) | Validates, assigns shift, cancels other offers |
| ExpireOpenShiftOffers | Scheduled (hourly) | Marks expired offers, updates shift status |

---

## Testing Checklist

### Requests Tab
- [ ] Tab appears with badge count
- [ ] Badge shows red for urgent items
- [ ] Count refreshes on focus
- [ ] Pending swaps list loads correctly
- [ ] Urgent items sorted first
- [ ] Filter by status works
- [ ] Filter by date range works

### Approval Workflow
- [ ] Approve modal shows correct shift details
- [ ] Warning displays for advance notice breach
- [ ] Approval updates both shifts correctly
- [ ] Rejection requires notes
- [ ] Notifications triggered on approve/reject
- [ ] Optimistic UI update works
- [ ] Error handling with retry

### Open Shifts
- [ ] Mark as Open option available for unassigned shifts
- [ ] Preview shows candidate count
- [ ] Notifications sent on confirmation
- [ ] Open shift indicator on rota grid
- [ ] Dashboard shows all open shifts
- [ ] Candidate responses tracked
- [ ] Manual assign option works
- [ ] Expired offers handled correctly

### Configuration
- [ ] Settings load correctly
- [ ] Changes save and apply
- [ ] Monthly limit enforced
- [ ] Advance notice warning works
- [ ] Manager notification settings respected

---

## Integration Notes

This implementation integrates with:
- **Mobile App**: Staff initiate swaps and accept open shifts via mobile
- **Power Automate**: Notifications, matching algorithm, shift updates
- **Dataverse**: All data storage and queries
- **Existing Rota**: Grid display, shift management, staff data

Ensure React Query cache invalidation after:
- Swap approval/rejection
- Open shift marked
- Shift assigned from open
- Configuration changes
