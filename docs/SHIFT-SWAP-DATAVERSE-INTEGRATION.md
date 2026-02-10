o you # Shift Swap & Open Shift - Dataverse & Power Automate Integration Guide

**Version:** 1.1  
**Last Updated:** January 2026  
**Context:** Backend integration requirements for the Shift Swap and Open Shift features

---

## Important: Table Naming

> **⚠️ NAMING CONFLICT AVOIDANCE**
>
> An existing `cp365_shiftswap` table exists in the environment and is used by another application.
> To ensure complete data isolation, this specification uses **different table names**:
>
> | Existing Table | New Table (This App) |
> |---------------|---------------------|
> | `cp365_shiftswap` | `cp365_swaprequest` |
> | `cp365_RequestStatus` (choice) | `cp365_swaprequeststatus` (new choice) |
> | N/A | `cp365_rotaswapconfig` |
>
> This ensures:
> - No data mixing between old and new applications
> - Both systems can run in parallel during transition
> - No risk of breaking the existing application

---

## Table of Contents

1. [Overview](#overview)
2. [Dataverse Tables](#dataverse-tables)
3. [Option Sets (Choice Fields)](#option-sets-choice-fields)
4. [Power Automate Flows](#power-automate-flows)
5. [API Endpoints](#api-endpoints)
6. [Security Roles](#security-roles)
7. [Configuration Records](#configuration-records)
8. [Testing Checklist](#testing-checklist)

---

## Overview

The Shift Swap and Open Shift features require the following Dataverse components:

- **2 new tables**: `cp365_swaprequest`, `cp365_openshiftoffer`
- **1 configuration table**: `cp365_rotaswapconfig`
- **6 Power Automate flows** for notifications and processing
- **4 new choice fields** (option sets)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React Desktop App                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ Requests View    │  │ Open Shifts      │  │ Swap Configuration       │  │
│  │ (SwapRequestCard)│  │ Dashboard        │  │ (Admin)                  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
└───────────┼─────────────────────┼─────────────────────────┼─────────────────┘
            │                     │                         │
            ▼                     ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Dataverse Web API                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ cp365_swaprequest│  │ cp365_openshift  │  │ cp365_rotaswapconfig         │ │
│  │   (NEW TABLE)    │  │ offer            │  │   (NEW TABLE)                │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────────────────┘ │
└───────────┼─────────────────────┼───────────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Power Automate Flows                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ NotifySwap       │  │ SendOpenShift    │  │ ExpireOpenShift              │ │
│  │ Approved/Rejected│  │ Notifications    │  │ Offers (Scheduled)           │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Dataverse Tables

### 1. Swap Request Table (`cp365_swaprequest`)

**Display Name:** Swap Request  
**Plural Name:** Swap Requests  
**Table Type:** Standard  
**Ownership:** Organisation  
**Primary Column:** `cp365_name` (Auto-number: SR-{SEQNUM:6})

Stores all shift/visit swap requests between staff members.

| Column Display Name | Column Logical Name | Data Type | Required | Description |
|---------------------|---------------------|-----------|----------|-------------|
| Swap Request ID | `cp365_swaprequestid` | Unique Identifier | Auto | Primary key (GUID) |
| Name | `cp365_name` | Auto Number | Auto | Auto: "SR-{SEQNUM:6}" |
| Request From | `cp365_requestfrom` | Lookup → cp365_staffmember | Yes | Staff initiating the swap |
| Request To | `cp365_requestto` | Lookup → cp365_staffmember | Yes | Staff receiving the request |
| Original Shift | `cp365_originalshift` | Lookup → cp365_shift | No* | Initiator's original shift |
| Requested Shift | `cp365_requestedshift` | Lookup → cp365_shift | No* | Recipient's shift being requested |
| Original Visit | `cp365_originalvisit` | Lookup → cp365_visit | No* | Initiator's original visit (domiciliary) |
| Requested Visit | `cp365_requestedvisit` | Lookup → cp365_visit | No* | Recipient's visit (domiciliary) |
| Assignment Type | `cp365_assignmenttype` | Choice | Yes | 'Shift' or 'Visit' |
| Request Status | `cp365_requeststatus` | Choice | Yes | Current status (see below) |
| Rota | `cp365_rota` | Lookup → cp365_rota | Yes | Related rota record |
| Location | `cp365_location` | Lookup → cp365_location | Yes | Location for filtering |
| Notes From Initiator | `cp365_notesfrominitiator` | Multiple Lines of Text (2000) | No | Reason/notes from initiator |
| Notes From Recipient | `cp365_notesfromrecipient` | Multiple Lines of Text (2000) | No | Response notes from recipient |
| Manager Notes | `cp365_managernotes` | Multiple Lines of Text (2000) | No | Notes from approving manager |
| Advance Notice Breached | `cp365_advancenoticebreached` | Yes/No | No | True if < 7 days notice. Default: No |
| Initiator Limit Reached | `cp365_initiatorlimitreached` | Yes/No | No | True if initiator at monthly limit. Default: No |
| Recipient Limit Reached | `cp365_recipientlimitreached` | Yes/No | No | True if recipient at monthly limit. Default: No |
| Recipient Responded Date | `cp365_recipientrespondeddate` | Date and Time | No | When recipient accepted/declined |
| Approved Date | `cp365_approveddate` | Date and Time | No | When manager approved |
| Completed Date | `cp365_completeddate` | Date and Time | No | When shifts were actually swapped |
| Expires Date | `cp365_expiresdate` | Date and Time | No | When request auto-expires |
| Status | `statecode` | State | Auto | Active/Inactive |
| Status Reason | `statuscode` | Status Reason | Auto | Detailed status reason |
| Created On | `createdon` | Date and Time | Auto | When request was created |
| Modified On | `modifiedon` | Date and Time | Auto | Last modification |

*Note: Either shift fields OR visit fields should be populated, based on `cp365_assignmenttype`.

#### Business Rules

1. **Auto-calculate advance notice breach**: On create, if shift/visit date is < 7 days away, set `cp365_advancenoticebreached = Yes`
2. **Auto-set expiry**: On create, set `cp365_expiresdate` to 48 hours from creation
3. **Auto-calculate limits**: On create, check both staff members' swap count for the month
4. **Validate assignment type**: Ensure either shift or visit fields are populated, not both

---

### 2. Open Shift Offer Table (`cp365_openshiftoffer`)

**Display Name:** Open Shift Offer  
**Plural Name:** Open Shift Offers  
**Table Type:** Standard  
**Ownership:** Organisation  
**Primary Column:** `cp365_name` (Auto-number: OSO-{SEQNUM:8})

Tracks notifications sent to staff for open shifts and their responses.

| Column Display Name | Column Logical Name | Data Type | Required | Description |
|---------------------|---------------------|-----------|----------|-------------|
| Open Shift Offer ID | `cp365_openshiftofferid` | Unique Identifier | Auto | Primary key (GUID) |
| Name | `cp365_name` | Auto Number | Auto | Auto: "OSO-{SEQNUM:8}" |
| Shift | `cp365_shift` | Lookup → cp365_shift | No* | The open shift |
| Visit | `cp365_visit` | Lookup → cp365_visit | No* | The open visit |
| Staff Member | `cp365_staffmember` | Lookup → cp365_staffmember | Yes | Staff member notified |
| Offer Status | `cp365_offerstatus` | Choice | Yes | Current status |
| Match Score | `cp365_matchscore` | Whole Number | Yes | Calculated match score (0-100) |
| Score Breakdown | `cp365_scorebreakdown` | Multiple Lines of Text | No | JSON string with score details |
| Offered Date | `cp365_offereddate` | Date and Time | Yes | When notification was sent |
| Responded Date | `cp365_respondeddate` | Date and Time | No | When staff responded |
| Response Notes | `cp365_responsenotes` | Multiple Lines of Text (500) | No | Notes from staff (e.g., decline reason) |
| Expires At | `cp365_expiresat` | Date and Time | Yes | When offer expires |
| Is Expired | `cp365_isexpired` | Yes/No | Yes | True if expired without response. Default: No |
| Notification Scope | `cp365_notificationscope` | Choice | Yes | sublocation/location/all |
| Notification Sent | `cp365_notificationsent` | Yes/No | Yes | Whether push notification was sent. Default: No |
| Status | `statecode` | State | Auto | Active/Inactive |

*Note: Either shift or visit should be populated.

---

### 3. Swap Configuration Table (`cp365_rotaswapconfig`)

**Display Name:** Rota Swap Configuration  
**Plural Name:** Rota Swap Configurations  
**Table Type:** Standard  
**Ownership:** Organisation  
**Primary Column:** `cp365_name`

Stores system-wide configuration for shift swap rules.

| Column Display Name | Column Logical Name | Data Type | Required | Default | Description |
|---------------------|---------------------|-----------|----------|---------|-------------|
| Config ID | `cp365_rotaswapconfigid` | Unique Identifier | Auto | - | Primary key (GUID) |
| Name | `cp365_name` | Single Line of Text (100) | Yes | "Default" | Configuration name |
| Monthly Limit Per Staff | `cp365_monthlylimitperstaff` | Whole Number | Yes | 5 | Max swaps per staff per month |
| Advance Notice Days | `cp365_advancenoticedays` | Whole Number | Yes | 7 | Days notice for "urgent" flag |
| Block Within Notice | `cp365_blockwithinnotice` | Yes/No | Yes | No | Block swaps within notice period |
| Requires Manager Approval | `cp365_requiresmanagerapproval` | Yes/No | Yes | Yes | Require manager approval |
| Notify L1 Manager | `cp365_notifyl1manager` | Yes/No | Yes | Yes | Notify L1 location manager |
| Notify L2 Manager | `cp365_notifyl2manager` | Yes/No | Yes | Yes | Notify L2 location manager |
| Notify L3 Manager | `cp365_notifyl3manager` | Yes/No | Yes | Yes | Notify L3 location manager |
| Auto Approve Same Level | `cp365_autoapprovesameLevel` | Yes/No | Yes | No | Auto-approve same-level swaps |
| Open Shift Default Expiry | `cp365_openshiftdefaultexpiry` | Whole Number | Yes | 24 | Default offer expiry (hours) |
| Open Shift Min Match Score | `cp365_openshiftminmatchscore` | Whole Number | Yes | 70 | Min match score for notification |
| WTD Warning Threshold | `cp365_wtdwarningthreshold` | Whole Number | Yes | 44 | WTD warning threshold (hours) |

---

## Option Sets (Choice Fields)

### 1. Swap Request Status (`cp365_swaprequeststatus`)

**Type:** Global Choice  
**Is Global:** Yes (can be reused across tables)

| Value | Label | Description | Colour (Hex) |
|-------|-------|-------------|--------------|
| 100000000 | Awaiting Recipient | Staff initiated, waiting for colleague response | #F59E0B (Amber) |
| 100000001 | Awaiting Manager Approval | Colleague accepted, needs manager approval | #3B82F6 (Blue) |
| 100000002 | Approved | Manager approved, swap completed | #10B981 (Green) |
| 100000003 | Rejected By Recipient | Colleague declined the swap | #EF4444 (Red) |
| 100000004 | Rejected By Manager | Manager declined the swap | #DC2626 (Dark Red) |
| 100000005 | Cancelled | Initiator cancelled the request | #6B7280 (Grey) |
| 100000006 | Expired | Timed out without response | #9CA3AF (Light Grey) |

**Default Value:** 100000000 (Awaiting Recipient)

---

### 2. Open Shift Offer Status (`cp365_openshiftofferstatus`)

**Type:** Global Choice  
**Is Global:** Yes

| Value | Label | Description | Colour (Hex) |
|-------|-------|-------------|--------------|
| 100000000 | Pending | Awaiting staff response | #F59E0B (Amber) |
| 100000001 | Accepted | Staff accepted the shift | #10B981 (Green) |
| 100000002 | Declined | Staff declined the shift | #EF4444 (Red) |
| 100000003 | Expired | Offer timed out | #6B7280 (Grey) |
| 100000004 | Cancelled | Offer cancelled (e.g., shift filled) | #9CA3AF (Light Grey) |

**Default Value:** 100000000 (Pending)

---

### 3. Notification Scope (`cp365_notificationscope`)

**Type:** Global Choice  
**Is Global:** Yes

| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Sublocation | Only staff in the same sublocation |
| 100000001 | Location | All staff in the location |
| 100000002 | All | All eligible staff across the organisation |

**Default Value:** 100000001 (Location)

---

### 4. Assignment Type (`cp365_assignmenttype`)

**Type:** Global Choice  
**Is Global:** Yes (shared with Open Shifts feature)

| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Shift | Residential care shift |
| 100000001 | Visit | Domiciliary care visit |

**Default Value:** 100000000 (Shift)

---

### 5. Existing Shift Status Extension

Add these values to the **existing** `cp365_shiftstatus` choice field:

| Value | Label | Description |
|-------|-------|-------------|
| 1005 | Open | Shift marked as open, notifications sent |
| 1006 | Filling | Open with pending acceptance |

**Note:** Do NOT remove existing values. These are additions only.

---

## Power Automate Flows

### 1. NotifySwapApproved

**Trigger:** HTTP Request (called from desktop app on approval)

**Input:**
```json
{
  "swapRequestId": "guid",
  "managerNotes": "optional string"
}
```

**Actions:**
1. Retrieve swap request record with related entities (initiator, recipient, shifts/visits)
2. Update request status to Approved (100000002)
3. Set `cp365_approveddate` to now
4. **Swap the assignments:**
   - If assignment type is 'Shift':
     - Update original shift: `cp365_staffmember` = recipient
     - Update requested shift: `cp365_staffmember` = initiator
   - If assignment type is 'Visit':
     - Update original visit: `cp365_staffmemberid` = recipient
     - Update requested visit: `cp365_staffmemberid` = initiator
5. Set `cp365_completeddate` to now
6. Send push notification to initiator: "Your swap request has been approved"
7. Send push notification to recipient: "Swap request approved - your shifts have been updated"
8. If `cp365_notifyl1manager` = true, email L1 manager
9. If `cp365_notifyl2manager` = true, email L2 manager
10. If `cp365_notifyl3manager` = true, email L3 manager

**Output:**
```json
{
  "success": true,
  "swapRequestId": "guid",
  "newStatus": "Approved"
}
```

---

### 2. NotifySwapRejected

**Trigger:** HTTP Request (called from desktop app on rejection)

**Input:**
```json
{
  "swapRequestId": "guid",
  "managerNotes": "required string"
}
```

**Actions:**
1. Retrieve swap request record
2. Update request status to RejectedByManager (100000004)
3. Set `cp365_managernotes`
4. Send push notification to initiator: "Your swap request was declined: {reason}"
5. Send push notification to recipient: "Swap request declined by manager"

**Output:**
```json
{
  "success": true,
  "swapRequestId": "guid",
  "newStatus": "RejectedByManager"
}
```

---

### 3. CalculateOpenShiftCandidates

**Trigger:** HTTP Request (called when marking shift as open)

**Input:**
```json
{
  "shiftId": "guid (or visitId)",
  "assignmentType": "Shift | Visit",
  "notificationScope": "Sublocation | Location | All",
  "minimumMatchScore": 70,
  "includeOnLeave": false
}
```

**Actions:**
1. Retrieve shift/visit details
2. Get all active staff in scope (based on notificationScope)
3. For each staff member, calculate match score:
   - Availability at shift time: 0-30 points
   - Skills match: 0-20 points
   - Continuity (previous visits to service user): 0-25 points
   - Travel distance (for domiciliary): 0-10 points
   - Preference match: 0-15 points
4. Filter by minimum match score
5. Check WTD compliance (hours this week + shift hours < threshold)
6. Exclude staff on leave (unless includeOnLeave = true)
7. Return sorted list of candidates

**Output:**
```json
{
  "candidates": [
    {
      "staffMemberId": "guid",
      "staffName": "string",
      "matchScore": 85,
      "isAvailable": true,
      "hasRequiredSkills": true,
      "wtdCompliant": true,
      "warnings": []
    }
  ],
  "totalCount": 12
}
```

---

### 4. SendOpenShiftNotifications

**Trigger:** HTTP Request (called after CalculateOpenShiftCandidates)

**Input:**
```json
{
  "shiftId": "guid",
  "assignmentType": "Shift | Visit",
  "candidates": [
    { "staffMemberId": "guid", "matchScore": 85 }
  ],
  "expiresInHours": 24,
  "minimumMatchScore": 70
}
```

**Actions:**
1. Update shift/visit status to Open (1005)
2. Calculate expiry datetime
3. For each candidate:
   a. Create `cp365_openshiftoffer` record
   b. Send push notification: "Open shift available: {date} {time} at {location}"
4. Return summary

**Output:**
```json
{
  "success": true,
  "notifiedCount": 12,
  "expiresAt": "2026-01-25T14:00:00Z"
}
```

---

### 5. ProcessOpenShiftAcceptance

**Trigger:** HTTP Request (called from mobile app when staff accepts)

**Input:**
```json
{
  "offerId": "guid",
  "staffMemberId": "guid"
}
```

**Actions:**
1. Retrieve offer record
2. Validate offer not expired
3. Validate shift/visit not already filled
4. Update offer status to Accepted
5. Set `cp365_respondeddate` to now
6. Assign staff to shift/visit
7. Update shift/visit status back to Assigned
8. Cancel all other pending offers for this shift (set to Cancelled)
9. Send confirmation to accepting staff
10. Notify manager of assignment

**Output:**
```json
{
  "success": true,
  "offerId": "guid",
  "assignedStaffId": "guid"
}
```

---

### 6. ExpireOpenShiftOffers (Scheduled)

**Trigger:** Recurrence (every hour)

**Actions:**
1. Query all offers where:
   - `cp365_offerstatus` = Pending (100000000)
   - `cp365_expiresat` < now
2. For each expired offer:
   - Update status to Expired (100000003)
   - Set `cp365_isexpired` = Yes
3. For shifts where ALL offers have expired:
   - Notify manager: "Open shift {date} {time} has no responses"
   - Optionally re-trigger candidate calculation with wider scope

---

## API Endpoints

The desktop app uses the Dataverse Web API. Key endpoints:

### Fetch Pending Swap Requests

```http
GET /api/data/v9.2/cp365_swaprequests
?$filter=cp365_requeststatus eq 100000001 and statecode eq 0
&$expand=cp365_requestfrom($select=cp365_forename,cp365_surname,cp365_jobtitle),
         cp365_requestto($select=cp365_forename,cp365_surname,cp365_jobtitle),
         cp365_originalshift($select=cp365_shiftdate,cp365_shiftstarttime,cp365_shiftendtime),
         cp365_requestedshift($select=cp365_shiftdate,cp365_shiftstarttime,cp365_shiftendtime)
&$orderby=cp365_advancenoticebreached desc,createdon asc
```

### Update Swap Request Status

```http
PATCH /api/data/v9.2/cp365_swaprequests({swapRequestId})
Content-Type: application/json

{
  "cp365_requeststatus": 100000002,
  "cp365_managernotes": "Approved",
  "cp365_approveddate": "2026-01-23T10:30:00Z"
}
```

### Fetch Open Shift Offers

```http
GET /api/data/v9.2/cp365_openshiftoffers
?$filter=_cp365_shift_value eq '{shiftId}'
&$expand=cp365_staffmember($select=cp365_staffmembername,cp365_jobtitle)
&$orderby=cp365_matchscore desc
```

### Get Configuration

```http
GET /api/data/v9.2/cp365_rotaswapconfigs
?$filter=cp365_name eq 'Default'
&$top=1
```

---

## Security Roles

### Rota Manager

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_swaprequest | ✓ BU | ✓ BU | ✓ BU | ✗ | ✓ | ✓ |
| cp365_openshiftoffer | ✓ BU | ✓ BU | ✓ BU | ✗ | ✓ | ✓ |
| cp365_rotaswapconfig | ✗ | ✓ Org | ✗ | ✗ | ✗ | ✗ |

### System Administrator

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_swaprequest | ✓ Org | ✓ Org | ✓ Org | ✓ Org | ✓ | ✓ |
| cp365_openshiftoffer | ✓ Org | ✓ Org | ✓ Org | ✓ Org | ✓ | ✓ |
| cp365_rotaswapconfig | ✓ Org | ✓ Org | ✓ Org | ✓ Org | ✓ | ✓ |

### Staff Member (via mobile app)

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_swaprequest | ✓ User* | ✓ User | ✓ User** | ✗ | ✓ | ✓ |
| cp365_openshiftoffer | ✗ | ✓ User | ✓ User*** | ✗ | ✗ | ✗ |

*Can only create as initiator  
**Can only update to accept/cancel own requests  
***Can only update to accept/decline own offers

---

## Configuration Records

### Default Configuration

Create one record in `cp365_rotaswapconfig` with these values:

```json
{
  "cp365_name": "Default",
  "cp365_monthlylimitperstaff": 5,
  "cp365_advancenoticedays": 7,
  "cp365_blockwithinnotice": false,
  "cp365_requiresmanagerapproval": true,
  "cp365_notifyl1manager": true,
  "cp365_notifyl2manager": true,
  "cp365_notifyl3manager": true,
  "cp365_autoapprovesameLevel": false,
  "cp365_openshiftdefaultexpiry": 24,
  "cp365_openshiftminmatchscore": 70,
  "cp365_wtdwarningthreshold": 44
}
```

---

## Testing Checklist

### Dataverse Tables

- [ ] `cp365_swaprequest` table created with all columns
- [ ] `cp365_openshiftoffer` table created with all columns
- [ ] `cp365_rotaswapconfig` table created and populated with Default record
- [ ] All lookups correctly configured (staffmember, shift, visit, rota, location)
- [ ] All choice fields created with correct values and default values set
- [ ] Business rules applied (advance notice breach, expiry dates)
- [ ] Auto-number formats working correctly (SR-000001, OSO-00000001)

### Choice Fields

- [ ] `cp365_swaprequeststatus` global choice created with 7 values
- [ ] `cp365_openshiftofferstatus` global choice created with 5 values
- [ ] `cp365_notificationscope` global choice created with 3 values
- [ ] `cp365_assignmenttype` global choice created with 2 values
- [ ] Values 1005 and 1006 added to existing `cp365_shiftstatus`

### Power Automate Flows

- [ ] NotifySwapApproved deployed and tested
- [ ] NotifySwapRejected deployed and tested
- [ ] CalculateOpenShiftCandidates deployed and tested
- [ ] SendOpenShiftNotifications deployed and tested
- [ ] ProcessOpenShiftAcceptance deployed and tested
- [ ] ExpireOpenShiftOffers scheduled and running hourly

### Integration Tests

- [ ] Create swap request from mobile → appears in desktop app
- [ ] Approve swap → shifts updated, notifications sent
- [ ] Reject swap → status updated, notifications sent
- [ ] Mark shift as open → offers created, notifications sent
- [ ] Accept open shift from mobile → shift assigned, others cancelled
- [ ] Configuration changes → respected by all flows
- [ ] Verify NO data appears in old `cp365_shiftswap` table

### Security Tests

- [ ] Manager can only see swap requests for their business unit
- [ ] Staff can only see/respond to their own requests and offers
- [ ] Only admin can modify configuration
- [ ] Old application continues to work with `cp365_shiftswap` table

---

## Migration Notes

### Parallel Running

Both systems can run in parallel:
- Existing app uses `cp365_shiftswap`
- New React app uses `cp365_swaprequest`

### Future Migration (Optional)

If you later want to migrate historical data:

1. **Data export**: Export from `cp365_shiftswap` 
2. **Status mapping**:
   | Old Status | New Status Value |
   |------------|------------------|
   | Pending | 100000000 |
   | Approved | 100000002 |
   | Rejected | 100000004 |
   | (add others as needed) |
3. **Import to new table**: Transform and import into `cp365_swaprequest`
4. **Decommission old app**: Once migration verified

---

## Summary of All New Dataverse Objects

| Object Type | Logical Name | Display Name |
|------------|--------------|--------------|
| **Table** | `cp365_swaprequest` | Swap Request |
| **Table** | `cp365_openshiftoffer` | Open Shift Offer |
| **Table** | `cp365_rotaswapconfig` | Rota Swap Configuration |
| **Choice** | `cp365_swaprequeststatus` | Swap Request Status |
| **Choice** | `cp365_openshiftofferstatus` | Open Shift Offer Status |
| **Choice** | `cp365_notificationscope` | Notification Scope |
| **Choice** | `cp365_assignmenttype` | Assignment Type |

---

*Document Version: 1.1*  
*For use with CarePoint 365 Rota Management System*
