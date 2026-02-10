# Open Shifts - Dataverse Schema Specification

**Version:** 1.0  
**Last Updated:** January 2026  
**Feature:** Open Shifts / Unfilled Shifts Management

---

## Table of Contents

1. [Overview](#overview)
2. [Tables Required](#tables-required)
3. [Table 1: cp365_openshift](#table-1-cp365_openshift)
4. [Table 2: cp365_openshiftoffer](#table-2-cp365_openshiftoffer)
5. [Choice Fields (Option Sets)](#choice-fields-option-sets)
6. [Existing Table Modifications](#existing-table-modifications)
7. [Relationships Diagram](#relationships-diagram)
8. [Security Configuration](#security-configuration)
9. [Business Rules](#business-rules)
10. [Sample OData Queries](#sample-odata-queries)
11. [Implementation Checklist](#implementation-checklist)

---

## Overview

The Open Shifts feature allows managers to mark unfilled shifts/visits as "open" and notify suitable staff members who can then accept or decline. This requires:

- **2 new tables**: `cp365_openshift` (parent) and `cp365_openshiftoffer` (child)
- **3 new choice fields** (option sets)
- **1 modification** to existing `cp365_shiftstatus` option set
- **Business rules** for automatic expiry and candidate management

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPEN SHIFT WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Manager marks shift as "Open"                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────┐                                                        │
│  │  cp365_openshift │ ◄── Parent record created                              │
│  │  (Status: Open)  │                                                        │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           │ System calculates eligible candidates                            │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │                    cp365_openshiftoffer (multiple)                │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │        │
│  │  │ Staff A  │  │ Staff B  │  │ Staff C  │  │ Staff D  │          │        │
│  │  │ Score:90 │  │ Score:85 │  │ Score:78 │  │ Score:72 │          │        │
│  │  │ Pending  │  │ Pending  │  │ Pending  │  │ Pending  │          │        │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │        │
│  └──────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  2. Staff member accepts offer                                               │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────┐                                                        │
│  │  cp365_openshift │ ◄── Status changes to "Filled"                         │
│  │  (Status: Filled)│                                                        │
│  └──────────────────┘                                                        │
│         │                                                                    │
│         │ Other offers cancelled, shift assigned                             │
│         ▼                                                                    │
│  ┌──────────────────┐                                                        │
│  │  cp365_shift     │ ◄── Staff member assigned                              │
│  │  (Status: 1001)  │                                                        │
│  └──────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tables Required

| Table Logical Name | Table Display Name | Description |
|-------------------|-------------------|-------------|
| `cp365_openshift` | Open Shift | Parent record for an open shift request |
| `cp365_openshiftoffer` | Open Shift Offer | Individual offer sent to a staff member |

---

## Table 1: cp365_openshift

**Display Name:** Open Shift  
**Plural Name:** Open Shifts  
**Table Type:** Standard  
**Ownership:** Organisation  
**Enable for Activities:** No  
**Enable Auditing:** Yes  
**Enable Change Tracking:** Yes

### Primary Column

| Property | Value |
|----------|-------|
| Display Name | Name |
| Logical Name | cp365_name |
| Type | Single Line of Text |
| Max Length | 200 |
| Auto-number Format | `OS-{SEQNUM:6}` (e.g., OS-000001) |

### Columns

#### Core Identification

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Open Shift ID | `cp365_openshiftid` | Unique Identifier | Auto | Primary key (GUID) |
| Name | `cp365_name` | Auto Number | Auto | Auto-generated: OS-{SEQNUM:6} |

#### Assignment Reference (Choose ONE based on type)

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Assignment Type | `cp365_assignmenttype` | Choice | Yes | Whether this is a shift or visit |
| Shift | `cp365_shift` | Lookup → cp365_shift | Conditional | The shift being offered (if type = shift) |
| Visit | `cp365_visit` | Lookup → cp365_visit | Conditional | The visit being offered (if type = visit) |

#### Status & Tracking

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Status | `cp365_status` | Choice | Yes | Current status of the open shift |
| Status Reason | `statuscode` | Status Reason | Auto | Detailed status reason |
| State | `statecode` | State | Auto | Active/Inactive |

#### Configuration

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Notification Scope | `cp365_notificationscope` | Choice | Yes | Who to notify (sublocation/location/all) |
| Minimum Match Score | `cp365_minimummatchscore` | Whole Number | Yes | Minimum score (0-100) to be notified. Default: 70 |
| Include Staff On Leave | `cp365_includestaffonleave` | Yes/No | Yes | Whether to include staff on leave. Default: No |
| Expires At | `cp365_expiresat` | Date and Time | Yes | When offers expire |

#### Statistics (Auto-calculated)

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Offer Count | `cp365_offercount` | Whole Number | No | Total offers sent. Default: 0 |
| Accepted Count | `cp365_acceptedcount` | Whole Number | No | Offers accepted. Default: 0 |
| Declined Count | `cp365_declinedcount` | Whole Number | No | Offers declined. Default: 0 |
| Pending Count | `cp365_pendingcount` | Whole Number | No | Offers still pending. Default: 0 |

#### Outcome

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Filled By | `cp365_filledby` | Lookup → cp365_staffmember | No | Staff member who accepted (if filled) |
| Filled Date | `cp365_filleddate` | Date and Time | No | When the shift was filled |
| Closed Date | `cp365_closeddate` | Date and Time | No | When closed without filling |
| Closed Reason | `cp365_closedreason` | Multiple Lines of Text | No | Reason for closing (if manually closed) |

#### Location Reference (for filtering)

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Location | `cp365_location` | Lookup → cp365_location | No | Location for filtering/security |
| Sublocation | `cp365_sublocation` | Lookup → cp365_sublocation | No | Sublocation for filtering |
| Rota | `cp365_rota` | Lookup → cp365_rota | No | Rota reference |

#### Timestamps (Auto-managed)

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Created On | `createdon` | Date and Time | Auto | When record was created |
| Created By | `createdby` | Lookup → systemuser | Auto | Who created the record |
| Modified On | `modifiedon` | Date and Time | Auto | Last modification date |
| Modified By | `modifiedby` | Lookup → systemuser | Auto | Who last modified |

---

## Table 2: cp365_openshiftoffer

**Display Name:** Open Shift Offer  
**Plural Name:** Open Shift Offers  
**Table Type:** Standard  
**Ownership:** Organisation  
**Enable for Activities:** No  
**Enable Auditing:** Yes  
**Enable Change Tracking:** Yes

### Primary Column

| Property | Value |
|----------|-------|
| Display Name | Name |
| Logical Name | cp365_name |
| Type | Single Line of Text |
| Max Length | 200 |
| Auto-number Format | `OSO-{SEQNUM:8}` (e.g., OSO-00000001) |

### Columns

#### Core Identification

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Open Shift Offer ID | `cp365_openshiftofferid` | Unique Identifier | Auto | Primary key (GUID) |
| Name | `cp365_name` | Auto Number | Auto | Auto-generated: OSO-{SEQNUM:8} |

#### Relationships

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Open Shift | `cp365_openshift` | Lookup → cp365_openshift | Yes | Parent open shift record |
| Staff Member | `cp365_staffmember` | Lookup → cp365_staffmember | Yes | Staff member receiving offer |

#### Scoring

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Match Score | `cp365_matchscore` | Whole Number | Yes | Calculated match score (0-100) |
| Score Breakdown | `cp365_scorebreakdown` | Multiple Lines of Text | No | JSON string with score component details |

#### Status

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Offer Status | `cp365_offerstatus` | Choice | Yes | Current status of this offer |
| Is Expired | `cp365_isexpired` | Yes/No | Yes | True if expired without response. Default: No |

#### Timing

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Offered Date | `cp365_offereddate` | Date and Time | Yes | When offer was sent |
| Responded Date | `cp365_respondeddate` | Date and Time | No | When staff responded |
| Expires At | `cp365_expiresat` | Date and Time | Yes | When this offer expires |

#### Response Details

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Response Notes | `cp365_responsenotes` | Multiple Lines of Text | No | Notes from staff (e.g., decline reason) |
| Notification Sent | `cp365_notificationsent` | Yes/No | Yes | Whether push notification was sent. Default: No |
| Notification Sent Date | `cp365_notificationsentdate` | Date and Time | No | When notification was sent |

#### Timestamps (Auto-managed)

| Display Name | Logical Name | Type | Required | Description |
|--------------|--------------|------|----------|-------------|
| Created On | `createdon` | Date and Time | Auto | When record was created |
| Modified On | `modifiedon` | Date and Time | Auto | Last modification date |

---

## Choice Fields (Option Sets)

### 1. Open Shift Status (`cp365_openshiftstatus`)

**Type:** Global Choice (can be reused)  
**Is Global:** Yes  

| Value | Label | Description | Colour (Hex) |
|-------|-------|-------------|--------------|
| 100000000 | Open | Shift is open, offers active | #F59E0B (Amber) |
| 100000001 | Filled | Shift has been accepted by someone | #10B981 (Green) |
| 100000002 | Closed | Manually closed without filling | #6B7280 (Grey) |
| 100000003 | Expired | All offers expired without response | #EF4444 (Red) |

**Default Value:** 100000000 (Open)

---

### 2. Open Shift Offer Status (`cp365_openshiftofferstatus`)

**Type:** Global Choice (can be reused)  
**Is Global:** Yes  

| Value | Label | Description | Colour (Hex) |
|-------|-------|-------------|--------------|
| 100000000 | Pending | Awaiting staff response | #F59E0B (Amber) |
| 100000001 | Accepted | Staff accepted the shift | #10B981 (Green) |
| 100000002 | Declined | Staff declined the shift | #EF4444 (Red) |
| 100000003 | Expired | Offer timed out without response | #6B7280 (Grey) |
| 100000004 | Cancelled | Offer cancelled (shift filled/closed) | #9CA3AF (Light Grey) |

**Default Value:** 100000000 (Pending)

---

### 3. Notification Scope (`cp365_notificationscope`)

**Type:** Global Choice (can be reused)  
**Is Global:** Yes  

| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Sublocation | Only staff in the same sublocation |
| 100000001 | Location | All staff in the location |
| 100000002 | All | All eligible staff across the organisation |

**Default Value:** 100000001 (Location)

---

### 4. Assignment Type (`cp365_assignmenttype`)

**Type:** Global Choice (shared with Shift Swap feature)  
**Is Global:** Yes  

| Value | Label | Description |
|-------|-------|-------------|
| 100000000 | Shift | Residential care shift |
| 100000001 | Visit | Domiciliary care visit |

**Default Value:** 100000000 (Shift)

---

## Existing Table Modifications

### cp365_shift - Add Status Values

Add these values to the **existing** `cp365_shiftstatus` choice field:

| Value | Label | Description |
|-------|-------|-------------|
| 1005 | Open | Shift marked as open, notifications sent |
| 1006 | Filling | Open with at least one acceptance pending confirmation |

**Note:** Do NOT remove existing values. These are additions only.

### cp365_visit - Add Status Values (if applicable)

If visits have a similar status field, add equivalent values for consistency.

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY RELATIONSHIPS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                      ┌───────────────────┐                                   │
│                      │  cp365_location   │                                   │
│                      └─────────┬─────────┘                                   │
│                                │ 1:N                                         │
│                                ▼                                             │
│                      ┌───────────────────┐                                   │
│                      │ cp365_sublocation │                                   │
│                      └─────────┬─────────┘                                   │
│                                │ 1:N                                         │
│                                ▼                                             │
│  ┌───────────────┐   ┌───────────────────┐   ┌─────────────────────┐        │
│  │  cp365_shift  │◄──│    cp365_rota     │──►│  cp365_staffmember  │        │
│  └───────┬───────┘   └───────────────────┘   └──────────┬──────────┘        │
│          │                                              │                    │
│          │ N:1 (optional)                               │ N:1                │
│          ▼                                              │                    │
│  ┌───────────────────────────────────────────────────┐  │                    │
│  │                  cp365_openshift                   │  │                    │
│  │  - cp365_shift (lookup)                           │  │                    │
│  │  - cp365_visit (lookup, optional)                 │  │                    │
│  │  - cp365_filledby (lookup) ──────────────────────►│──┘                    │
│  │  - cp365_location (lookup)                        │                       │
│  │  - cp365_sublocation (lookup)                     │                       │
│  └───────────────────┬───────────────────────────────┘                       │
│                      │ 1:N                                                   │
│                      ▼                                                       │
│  ┌───────────────────────────────────────────────────┐                       │
│  │              cp365_openshiftoffer                  │                       │
│  │  - cp365_openshift (lookup, required) ────────────┘                       │
│  │  - cp365_staffmember (lookup, required) ─────────►cp365_staffmember       │
│  └────────────────────────────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relationship Details

#### cp365_openshift Relationships

| Relationship Type | Related Table | Lookup Column | Cascade Behaviour |
|------------------|---------------|---------------|-------------------|
| Many-to-One | cp365_shift | cp365_shift | Restrict Delete |
| Many-to-One | cp365_visit | cp365_visit | Restrict Delete |
| Many-to-One | cp365_staffmember | cp365_filledby | Remove Link |
| Many-to-One | cp365_location | cp365_location | Remove Link |
| Many-to-One | cp365_sublocation | cp365_sublocation | Remove Link |
| Many-to-One | cp365_rota | cp365_rota | Remove Link |
| One-to-Many | cp365_openshiftoffer | cp365_openshift | Cascade Delete |

#### cp365_openshiftoffer Relationships

| Relationship Type | Related Table | Lookup Column | Cascade Behaviour |
|------------------|---------------|---------------|-------------------|
| Many-to-One | cp365_openshift | cp365_openshift | Cascade Delete |
| Many-to-One | cp365_staffmember | cp365_staffmember | Restrict Delete |

---

## Security Configuration

### Security Roles

#### 1. Rota Manager

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_openshift | ✓ Business Unit | ✓ Business Unit | ✓ Business Unit | ✗ | ✓ | ✓ |
| cp365_openshiftoffer | ✓ Business Unit | ✓ Business Unit | ✓ Business Unit | ✗ | ✓ | ✓ |

#### 2. Team Leader

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_openshift | ✓ User | ✓ Business Unit | ✓ User | ✗ | ✓ | ✓ |
| cp365_openshiftoffer | ✗ | ✓ Business Unit | ✗ | ✗ | ✗ | ✗ |

#### 3. Staff Member (Mobile App)

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_openshift | ✗ | ✓ User* | ✗ | ✗ | ✗ | ✗ |
| cp365_openshiftoffer | ✗ | ✓ User | ✓ User** | ✗ | ✗ | ✗ |

*Can only read open shifts where they have an offer  
**Can only update their own offer (accept/decline)

#### 4. System Administrator

| Table | Create | Read | Write | Delete | Append | Append To |
|-------|--------|------|-------|--------|--------|-----------|
| cp365_openshift | ✓ Organisation | ✓ Organisation | ✓ Organisation | ✓ Organisation | ✓ | ✓ |
| cp365_openshiftoffer | ✓ Organisation | ✓ Organisation | ✓ Organisation | ✓ Organisation | ✓ | ✓ |

### Column-Level Security (Optional)

Consider restricting these columns to managers only:

- `cp365_scorebreakdown` - Contains detailed matching algorithm data
- `cp365_closedreason` - Internal notes

---

## Business Rules

### On cp365_openshift Create

1. **Set Default Expiry**
   - If `cp365_expiresat` is empty, set to `createdon + 24 hours`

2. **Set Default Configuration**
   - If `cp365_minimummatchscore` is empty, set to `70`
   - If `cp365_includestaffonleave` is empty, set to `No`
   - If `cp365_notificationscope` is empty, set to `Location`

3. **Initialise Counters**
   - Set `cp365_offercount = 0`
   - Set `cp365_acceptedcount = 0`
   - Set `cp365_declinedcount = 0`
   - Set `cp365_pendingcount = 0`

4. **Populate Location Reference**
   - If `cp365_shift` is set, derive location from `cp365_shift → cp365_rota → cp365_sublocation → cp365_location`

### On cp365_openshiftoffer Create

1. **Set Offered Date**
   - Set `cp365_offereddate = createdon`

2. **Set Expiry from Parent**
   - Copy `cp365_expiresat` from parent `cp365_openshift`

3. **Increment Parent Counter**
   - Increment `cp365_openshift.cp365_offercount` by 1
   - Increment `cp365_openshift.cp365_pendingcount` by 1

### On cp365_openshiftoffer Update (Status Change)

1. **When status changes to Accepted (100000001)**
   - Set `cp365_respondeddate = now()`
   - Decrement `cp365_openshift.cp365_pendingcount` by 1
   - Increment `cp365_openshift.cp365_acceptedcount` by 1
   - **Trigger Power Automate flow** to:
     - Assign staff to shift/visit
     - Update parent status to Filled
     - Cancel other pending offers

2. **When status changes to Declined (100000002)**
   - Set `cp365_respondeddate = now()`
   - Decrement `cp365_openshift.cp365_pendingcount` by 1
   - Increment `cp365_openshift.cp365_declinedcount` by 1

3. **When status changes to Expired (100000003)**
   - Set `cp365_isexpired = Yes`
   - Decrement `cp365_openshift.cp365_pendingcount` by 1

4. **When status changes to Cancelled (100000004)**
   - Decrement `cp365_openshift.cp365_pendingcount` by 1

### Scheduled Job: Expire Open Shift Offers

**Frequency:** Every hour

**Logic:**
```
For each cp365_openshiftoffer where:
  - cp365_offerstatus = Pending (100000000)
  - cp365_expiresat < now()
  - cp365_isexpired = No

Do:
  - Update cp365_offerstatus = Expired (100000003)
  - Update cp365_isexpired = Yes
  - Update parent counters
  
For each cp365_openshift where:
  - cp365_status = Open (100000000)
  - cp365_pendingcount = 0
  - No offers with status = Accepted

Do:
  - Update cp365_status = Expired (100000003)
  - Notify manager: "Open shift expired without being filled"
```

---

## Sample OData Queries

### Get All Open Shifts (Manager Dashboard)

```http
GET /api/data/v9.2/cp365_openshifts
?$filter=cp365_status eq 100000000 and statecode eq 0
&$expand=cp365_shift($select=cp365_shiftid,cp365_shiftdate,cp365_shiftstarttime,cp365_shiftendtime),
         cp365_filledby($select=cp365_staffmemberid,cp365_staffmembername),
         cp365_location($select=cp365_locationid,cp365_locationname)
&$orderby=cp365_expiresat asc
```

### Get Open Shift with All Offers

```http
GET /api/data/v9.2/cp365_openshifts({openshiftid})
?$expand=cp365_openshift_openshiftoffer_openshift(
    $select=cp365_openshiftofferid,cp365_matchscore,cp365_offerstatus,cp365_respondeddate;
    $expand=cp365_staffmember($select=cp365_staffmemberid,cp365_staffmembername,cp365_jobtitle);
    $orderby=cp365_matchscore desc
  ),
  cp365_shift($select=cp365_shiftid,cp365_shiftdate,cp365_shiftstarttime,cp365_shiftendtime,cp365_shiftname)
```

### Get Pending Offers for a Staff Member (Mobile App)

```http
GET /api/data/v9.2/cp365_openshiftoffers
?$filter=_cp365_staffmember_value eq '{staffmemberid}' 
    and cp365_offerstatus eq 100000000 
    and cp365_isexpired eq false
&$expand=cp365_openshift(
    $select=cp365_openshiftid,cp365_expiresat;
    $expand=cp365_shift($select=cp365_shiftdate,cp365_shiftstarttime,cp365_shiftendtime)
  )
&$orderby=cp365_matchscore desc
```

### Get Open Shifts Summary (Dashboard Counts)

```http
GET /api/data/v9.2/cp365_openshifts
?$filter=statecode eq 0
&$apply=groupby((cp365_status),aggregate($count as count))
```

### Accept an Offer

```http
PATCH /api/data/v9.2/cp365_openshiftoffers({offerid})
Content-Type: application/json

{
  "cp365_offerstatus": 100000001,
  "cp365_respondeddate": "2026-01-24T10:30:00Z"
}
```

---

## Implementation Checklist

### Phase 1: Create Tables

- [ ] Create `cp365_openshift` table with all columns
- [ ] Create `cp365_openshiftoffer` table with all columns
- [ ] Configure primary column auto-numbering
- [ ] Set up all lookup relationships
- [ ] Configure cascade delete on offers

### Phase 2: Create Choice Fields

- [ ] Create global choice: `cp365_openshiftstatus`
- [ ] Create global choice: `cp365_openshiftofferstatus`
- [ ] Create global choice: `cp365_notificationscope`
- [ ] Verify/create global choice: `cp365_assignmenttype`
- [ ] Add values 1005, 1006 to existing `cp365_shiftstatus`

### Phase 3: Configure Security

- [ ] Add table permissions to Rota Manager role
- [ ] Add table permissions to Team Leader role
- [ ] Add table permissions to Staff Member role
- [ ] Test row-level security filtering
- [ ] Configure column-level security (optional)

### Phase 4: Implement Business Rules

- [ ] Create business rule: Default values on openshift create
- [ ] Create business rule: Populate location from shift
- [ ] Create business rule: Copy expiry to offer
- [ ] Create business rule: Update counters on offer status change

### Phase 5: Create Power Automate Flows

- [ ] Scheduled flow: Expire offers hourly
- [ ] Instant flow: Process acceptance (assign shift, cancel others)
- [ ] Instant flow: Send notifications on offer create
- [ ] Instant flow: Notify manager when all offers expire

### Phase 6: Testing

- [ ] Test creating open shift from desktop app
- [ ] Test offers created with correct scores
- [ ] Test accepting offer from mobile app
- [ ] Test declining offer
- [ ] Test automatic expiry
- [ ] Test security (manager vs staff access)
- [ ] Test counter accuracy

---

## Notes for Developers

### Score Breakdown JSON Format

The `cp365_scorebreakdown` column stores a JSON string with the following structure:

```json
{
  "availability": { "score": 25, "maxScore": 30, "details": "Available 07:00-19:00" },
  "skills": { "score": 20, "maxScore": 20, "details": "All required skills" },
  "continuity": { "score": 15, "maxScore": 25, "details": "3 previous visits" },
  "travel": { "score": 8, "maxScore": 10, "details": "2.5 miles" },
  "preference": { "score": 10, "maxScore": 15, "details": "Preferred carer" },
  "total": 78
}
```

### API Response Handling

When querying offers, the frontend expects this shape:

```typescript
interface OpenShiftOffer {
  cp365_openshiftofferid: string;
  _cp365_openshift_value: string;
  _cp365_staffmember_value: string;
  staffMemberName?: string;  // Expanded
  staffMemberJobTitle?: string;  // Expanded
  cp365_matchscore: number;
  cp365_offerstatus: number;
  cp365_offereddate: string;
  cp365_respondeddate?: string;
  cp365_responsenotes?: string;
  cp365_isexpired: boolean;
}
```

---

*Document Version: 1.0*  
*For use with CarePoint 365 Rota Management System*
