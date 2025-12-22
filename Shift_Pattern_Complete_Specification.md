# Shift Pattern Templates - Complete Technical Specification

## CarePoint 365 Rota Management Application

**Version 1.0 | December 2024**

---

# Part 1: Feature Specification & User Stories

## 1. Executive Summary

This document defines the functional requirements and user experience recommendations for implementing Working Pattern Shift Templates in the CarePoint 365 Rota Management application. This feature addresses a critical gap in care staff scheduling by enabling managers to create reusable shift pattern templates, assign them efficiently to staff by team or job role, and leverage these patterns for accurate leave calculations and informed shift management decisions.

The shift pattern feature directly supports three core business objectives:
- Reducing administrative overhead through bulk pattern assignment
- Ensuring accurate leave entitlement calculations based on actual working patterns
- Improving shift swap and offer request management through pattern-aware recommendations

---

## 2. Problem Statement

### 2.1 Current State

The existing CarePoint 365 application supports basic template shift creation for individual staff members, but lacks comprehensive working pattern management capabilities. Currently, managers must manually create shifts for each employee, making bulk scheduling time-consuming and error-prone.

### 2.2 Identified Gaps

- No standardised shift pattern templates that can be reused across multiple staff members
- Inability to bulk-assign patterns to staff by team, unit, or job role
- Leave calculations not driven by actual working patterns, leading to potential miscalculations
- Shift swap and offer requests lack pattern awareness for intelligent recommendations
- No visibility into pattern-based coverage requirements

---

## 3. Feature Overview

### 3.1 Core Components

The Shift Pattern feature comprises four interconnected modules:

#### Pattern Template Management
A library of reusable shift pattern templates that define working hours, rotation cycles, and shift types. Templates support various industry-standard patterns including fixed schedules, rotating shifts, and compressed work weeks.

#### Pattern Assignment Engine
Bulk assignment capabilities allowing managers to apply patterns to individual staff, entire teams, job roles, or custom groups. Includes conflict detection and validation against contracted hours.

#### Leave Calculation Integration
Automatic leave entitlement calculations based on assigned patterns, supporting UK statutory requirements (5.6 weeks), pro-rata calculations for part-time staff, and public holiday entitlement based on actual working days.

#### Shift Swap and Offer Intelligence
Pattern-aware recommendations for shift swaps and offers, ensuring suggestions respect working patterns, contracted hours, qualification requirements, and rest period regulations.

---

## 4. User Stories - Pattern Template Management

### US-SP-001: Create Shift Pattern Template

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | create a reusable shift pattern template with defined working days, times, and rotation cycle |
| **So that** | I can quickly apply consistent schedules to multiple staff members without recreating shift details each time |

**Acceptance Criteria:**
1. Can specify pattern name and description for identification
2. Can define rotation cycle length (e.g., 1 week, 2 weeks, 4 weeks)
3. Can set specific shifts for each day in the rotation with start time, end time, and break duration
4. Can mark days as rest days within the pattern
5. Can specify shift references (Early, Late, Night, Long Day) for each shift
6. Can set the pattern as active or inactive
7. Pattern saves successfully and appears in template library

---

### US-SP-002: Configure Standard Shift Patterns

| Field | Value |
|-------|-------|
| **As a** | System Administrator |
| **I want to** | configure pre-built standard shift patterns commonly used in care settings |
| **So that** | managers can quickly select from industry-standard patterns rather than building from scratch |

**Acceptance Criteria:**
1. System includes pre-configured patterns: Standard Days (Mon-Fri 9-5), 4-on-4-off, 3x12-hour shifts, 2-week rotating, Continental shift pattern
2. Pre-built patterns can be cloned and customised
3. Administrators can add new standard patterns to the library
4. Standard patterns are marked with a 'Standard' badge for easy identification

---

### US-SP-003: Define Pattern Contracted Hours

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | specify the contracted weekly hours associated with a shift pattern |
| **So that** | the system can validate pattern assignments against staff contracts and calculate accurate leave entitlements |

**Acceptance Criteria:**
1. Can enter average weekly contracted hours for the pattern
2. System calculates and displays total hours per rotation cycle
3. Warning displayed if pattern hours don't match common contract types (e.g., 37.5, 40 hours)
4. Can specify if pattern is for full-time or part-time contracts

---

### US-SP-004: View Pattern Template Library

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | view all available shift pattern templates in a searchable library |
| **So that** | I can find and select the appropriate pattern for staff assignment |

**Acceptance Criteria:**
1. Templates displayed in a grid or list view with key details visible
2. Can search patterns by name, shift reference, or hours
3. Can filter by pattern type (Standard, Custom), status (Active, Inactive), and contracted hours
4. Can sort by name, creation date, or usage count
5. Quick preview shows pattern calendar visualisation on hover or click

---

### US-SP-005: Edit Shift Pattern Template

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | modify an existing shift pattern template |
| **So that** | I can update patterns as requirements change without creating duplicates |

**Acceptance Criteria:**
1. Can edit all pattern properties (name, shifts, rotation cycle)
2. Warning shown if pattern is currently assigned to staff
3. Option to apply changes to existing assignments or only new assignments
4. Audit log records who made changes and when
5. Can revert to previous version if needed

---

### US-SP-006: Clone Shift Pattern Template

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | duplicate an existing pattern template to create a variation |
| **So that** | I can quickly create similar patterns without starting from scratch |

**Acceptance Criteria:**
1. Clone button available on pattern detail view
2. Cloned pattern has '(Copy)' appended to name by default
3. All settings copied including shifts, breaks, and contracted hours
4. Cloned pattern opens in edit mode for immediate modification

---

### US-SP-007: Archive Shift Pattern Template

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | archive a shift pattern template that is no longer in use |
| **So that** | I can keep the template library clean while preserving historical data |

**Acceptance Criteria:**
1. Archive option available for patterns not currently assigned
2. Archived patterns hidden from main library view by default
3. Can view archived patterns with a toggle filter
4. Can restore archived patterns if needed
5. Patterns with active assignments cannot be archived until reassigned

---

## 5. User Stories - Pattern Assignment

### US-SP-008: Assign Pattern to Individual Staff

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | assign a shift pattern template to an individual staff member with a start date |
| **So that** | their schedule is automatically populated according to the pattern |

**Acceptance Criteria:**
1. Can select staff member and pattern from dropdown lists
2. Must specify pattern start date (rotation day 1)
3. Can optionally set pattern end date for temporary patterns
4. System validates pattern hours against staff contracted hours with warning if mismatch
5. Conflicts with existing shifts highlighted before confirmation
6. Option to overwrite or preserve existing shifts in conflict

---

### US-SP-009: Bulk Assign Pattern to Team

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | assign the same shift pattern to all members of a team with staggered start dates |
| **So that** | I can efficiently schedule an entire team with minimal effort |

**Acceptance Criteria:**
1. Can select multiple staff from a team in a single action
2. Pattern applied to all selected staff members
3. Option to stagger rotation starts (e.g., half team starts Week 1, half starts Week 2)
4. Preview shows expected coverage after assignment
5. Can exclude specific team members from bulk assignment
6. Batch validation shows all conflicts before confirmation

---

### US-SP-010: Assign Pattern by Job Role

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | assign a shift pattern to all staff with a specific job role |
| **So that** | I can ensure consistent scheduling for similar positions across the organisation |

**Acceptance Criteria:**
1. Can filter staff list by job role (e.g., Care Assistant, Senior Nurse)
2. Can select all staff with matching job role in one click
3. Pattern assignment respects existing team structures
4. Summary shows number of staff affected before confirmation
5. Email notification sent to affected staff (configurable)

---

### US-SP-011: View Staff Pattern Assignments

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | view all staff and their currently assigned shift patterns |
| **So that** | I can quickly identify who is on which pattern and spot any gaps |

**Acceptance Criteria:**
1. Dashboard shows all staff with their assigned patterns
2. Visual indicators for staff without pattern assignments
3. Can filter by team, unit, job role, or pattern type
4. Shows pattern effective dates and next rotation milestone
5. Quick action to reassign or remove pattern from this view

---

### US-SP-012: Change Staff Pattern Assignment

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | change a staff member's assigned pattern to a different pattern |
| **So that** | I can adjust schedules when roles change or patterns are updated |

**Acceptance Criteria:**
1. Can select new pattern and effective date for change
2. Option to preserve shifts already created from old pattern
3. System suggests transition dates that align with rotation boundaries
4. Warning if change creates gaps or overlaps in schedule
5. Staff member notified of pattern change

---

### US-SP-013: Remove Pattern Assignment

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | remove a shift pattern assignment from a staff member |
| **So that** | I can return them to ad-hoc scheduling when patterns no longer apply |

**Acceptance Criteria:**
1. Can remove pattern with immediate effect or future date
2. Option to keep or delete future shifts created by pattern
3. Staff member's contracted hours remain unchanged
4. Audit trail records pattern removal with reason

---

### US-SP-014: Pattern Coverage Analysis

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | view coverage analysis showing how assigned patterns meet staffing requirements |
| **So that** | I can identify coverage gaps before they become problems |

**Acceptance Criteria:**
1. Visual heatmap shows expected coverage by day and shift type
2. Highlights under-staffed periods based on demand requirements
3. Shows skill mix coverage (qualifications per shift)
4. Comparison view between current and proposed pattern assignments
5. Export coverage report to PDF or Excel

---

### US-SP-015: Pattern Conflict Resolution

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | resolve conflicts when assigning patterns that overlap with existing shifts or leave |
| **So that** | I can make informed decisions about how to handle scheduling conflicts |

**Acceptance Criteria:**
1. System identifies all conflicts before pattern is applied
2. Conflicts categorised: Existing Shifts, Approved Leave, Other Patterns
3. Resolution options per conflict: Keep Existing, Override, Skip Date
4. Bulk resolution option to apply same decision to similar conflicts
5. Conflict resolution decisions logged for audit purposes

---

## 6. User Stories - Shift Swap Management

### US-SS-001: Request Shift Swap

| Field | Value |
|-------|-------|
| **As a** | Care Staff Member |
| **I want to** | request to swap one of my scheduled shifts with a colleague |
| **So that** | I can manage personal commitments while ensuring my shift is covered |

**Acceptance Criteria:**
1. Can select a shift from my schedule to offer for swap
2. System shows list of eligible colleagues based on qualifications and availability
3. Can send swap request to specific colleague or broadcast to team
4. Request includes shift details and optional message
5. Notification sent to colleague(s) immediately
6. Request status tracked (Pending, Accepted, Declined, Cancelled)

---

### US-SS-002: Pattern-Aware Swap Recommendations

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | see intelligent swap recommendations based on staff working patterns |
| **So that** | I can quickly identify the best candidates for covering a shift |

**Acceptance Criteria:**
1. Recommendations prioritise staff with complementary patterns
2. Shows hours impact (current vs contracted) for each candidate
3. Highlights staff under their contracted hours who could take extra shifts
4. Warns if swap would violate rest period requirements (11 hours between shifts)
5. Indicates pattern compatibility (same pattern = smoother swap)
6. Qualification match clearly shown

---

### US-SS-003: Approve or Reject Shift Swap

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | review and approve or reject shift swap requests |
| **So that** | I maintain control over schedule changes while enabling staff flexibility |

**Acceptance Criteria:**
1. Pending swap requests appear in manager dashboard with notification badge
2. Can view swap details including both staff members involved
3. Impact analysis shows hours, qualifications, and pattern implications
4. One-click approve or reject with optional comment
5. Both staff members notified of decision automatically
6. Approved swaps immediately reflected on rota

---

### US-SS-004: Set Shift Swap Policy Rules

| Field | Value |
|-------|-------|
| **As a** | System Administrator |
| **I want to** | configure business rules governing shift swaps |
| **So that** | swaps are automatically validated against organisational policies |

**Acceptance Criteria:**
1. Can set minimum notice period for swap requests (e.g., 24 hours)
2. Can restrict swaps to same team or allow cross-team
3. Can require manager approval or allow auto-approval for matching patterns
4. Can limit number of swaps per staff per month
5. Can define blackout periods where swaps are not permitted
6. Rules apply automatically during swap request validation

---

### US-SS-005: View Swap Request History

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | view the history of all shift swap requests |
| **So that** | I can identify patterns and ensure fair distribution of swaps |

**Acceptance Criteria:**
1. Searchable list of all swap requests with status
2. Filter by date range, staff member, team, or status
3. Shows approval rate and average processing time
4. Identifies staff who frequently request or accept swaps
5. Export swap history for reporting

---

## 7. User Stories - Shift Offer Management

### US-SO-001: Post Open Shift for Offers

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | post an unassigned shift as available for staff to claim |
| **So that** | I can fill gaps without having to contact each staff member individually |

**Acceptance Criteria:**
1. Can create or convert unassigned shift to open offer
2. Set offer deadline (auto-closes after deadline)
3. Specify required qualifications and preferences
4. Choose target audience: All Staff, Specific Team, Job Role, or Staff Under Hours
5. Notification sent to eligible staff immediately
6. Offer appears in staff app/portal for claiming

---

### US-SO-002: Claim Shift Offer

| Field | Value |
|-------|-------|
| **As a** | Care Staff Member |
| **I want to** | view and claim open shift offers that match my qualifications |
| **So that** | I can pick up extra shifts that fit my schedule and increase my hours |

**Acceptance Criteria:**
1. Available offers displayed in dedicated section of app
2. Offers filtered to show only those I'm qualified for
3. Clear display of shift details: date, time, location, rate
4. Pattern impact shown: how shift affects my weekly hours
5. One-click claim with confirmation
6. Notification sent if another staff member claims first

---

### US-SO-003: Prioritise Shift Offer Claims

| Field | Value |
|-------|-------|
| **As a** | Rota Manager |
| **I want to** | prioritise claims based on pattern-driven criteria when multiple staff claim the same shift |
| **So that** | I can make fair and efficient decisions about who gets the shift |

**Acceptance Criteria:**
1. System ranks claimants by configurable criteria
2. Default priority: Under contracted hours > Same team > Seniority > First to claim
3. Pattern compatibility score included in ranking
4. Manager can override system recommendation
5. Audit trail records selection decision and rationale

---

## 8. Leave Calculation Integration

### 8.1 Overview

Shift pattern assignments directly drive annual leave calculations, ensuring staff receive accurate entitlements based on their actual working arrangements. The system supports UK statutory requirements of 5.6 weeks (28 days for full-time) and handles the complexity of rotating patterns, part-time workers, and mid-year pattern changes.

### 8.2 Calculation Methodology

For staff on shift patterns, annual leave is calculated in hours rather than days to accommodate varying shift lengths:

```
Annual Leave Hours = Average Weekly Hours × 5.6 weeks
```

For shift workers on rotating patterns, the average weekly hours are calculated over the complete rotation cycle. For example, a 2-week rotation with 48 hours in week 1 and 36 hours in week 2 yields an average of 42 hours per week, resulting in 235.2 hours annual leave entitlement.

### 8.3 Public Holiday Entitlement

Staff working patterns that include weekends or non-standard days receive pro-rata public holiday entitlement. The calculation ensures part-time staff receive fair treatment regardless of which days their pattern includes. If a staff member's pattern means they never work on Mondays (when most UK public holidays fall), they still receive equivalent time off.

### 8.4 Pattern Change Impact

When a staff member's pattern changes mid-year, the system calculates leave on a pro-rata basis for each period. Remaining entitlement is adjusted based on the new pattern's weekly hours, ensuring no loss of accrued leave.

---

## 9. User Experience Recommendations

### 9.1 Pattern Template Builder Interface

#### Visual Calendar Grid
The pattern builder should present shifts in a visual weekly grid format rather than a form-based interface:

- Use a Monday-Sunday grid layout matching the rota view
- Colour-code shifts by type (Day=blue, Night=purple, Long Day=orange)
- Display running total of weekly hours as shifts are added
- Show rest period compliance warnings in real-time (minimum 11 hours between shifts)
- Provide quick-add buttons for common shift times (Early, Late, Night, Long Day)

#### Rotation Cycle Visualisation
For multi-week patterns, implement a rotation cycle selector:

- Tab or pagination interface for each week in rotation (Week 1, Week 2, etc.)
- Mini calendar showing the complete rotation at a glance
- Copy week functionality to duplicate one week's pattern to another
- Mirror pattern option for creating inverse rotations (e.g., Team A/Team B alternating)

### 9.2 Bulk Assignment Workflow

#### Step-by-Step Wizard
Pattern assignment for multiple staff should use a guided wizard approach:

1. **Step 1:** Select pattern from visual library with preview
2. **Step 2:** Select staff using multi-select with team/role grouping
3. **Step 3:** Set start dates with stagger options
4. **Step 4:** Review conflicts and coverage preview
5. **Step 5:** Confirm and apply with progress indicator

#### Conflict Resolution Interface
When conflicts are detected, present them in a clear, actionable format:

- Group conflicts by type (Existing Shifts, Leave, Other Patterns)
- Show conflict count with expandable details
- Provide resolution buttons inline: Keep / Override / Skip
- "Apply to all similar" option for bulk resolution
- Show before/after comparison for each affected shift

### 9.3 Shift Swap Interface

#### Request Flow for Staff
- Allow swap initiation directly from shift card on rota view (tap shift > 'Request Swap')
- Show smart recommendations: colleagues sorted by pattern compatibility and hours gap
- Display availability indicators (green tick for available, amber for pending leave request)
- Allow optional message with swap request
- Track request status with clear visual states and push notifications

#### Manager Approval Dashboard
- Dedicated 'Pending Requests' section with badge count on navigation
- Card-based layout showing both staff members and shift details at a glance
- Impact analysis panel: hours comparison, qualification verification, rest period check
- Quick approve/reject buttons with optional comment field
- Bulk action support for processing multiple similar requests

### 9.4 Shift Offer Interface

#### Staff App Offer Board
- Prominent 'Available Shifts' section on home screen with badge for new offers
- Filter by date, shift type, location, and hours impact
- Show 'Hours This Week' counter with projection if shift is claimed
- Countdown timer for offers with deadlines
- One-tap claim with immediate confirmation feedback

#### Manager Offer Creation
- Quick post from unassigned shift row (click > 'Post as Open Shift')
- Target audience selector with smart suggestions based on hours gaps
- Preview of eligible staff count before posting
- Optional priority weighting settings for claim resolution
- Real-time claim tracking with notification of claims received

---

## 10. Common Shift Patterns in UK Care Settings

The following patterns are commonly used in UK residential and nursing care facilities and should be included as pre-configured templates:

### Standard Days (37.5 hours)
Monday to Friday, 09:00-17:00 with 30-minute unpaid break. Typically used for administrative, management, and support roles.

### 4-on-4-off (42 hours average)
Four consecutive 12-hour shifts (08:00-20:00 or 20:00-08:00) followed by four days off. Popular for care staff providing continuity of care.

### 2-Week Rotating (37.5 hours average)
Week 1: 4 days (Mon, Tue, Sat, Sun). Week 2: 3 days (Wed, Thu, Fri). Provides every-other-weekend off while maintaining coverage.

### 3x12 Pattern (36 hours)
Three 12-hour shifts per week on set days. Common for staff preferring longer shifts with more days off.

### Continental Shift (42 hours average)
Complex 4-week rotation with combination of day and night shifts ensuring 24/7 coverage. Requires careful implementation to ensure rest period compliance.

### Part-Time Standard (various hours)
Configurable patterns for part-time staff: 16 hours (2x8h), 20 hours (2.5 days), 24 hours (3x8h), 30 hours (4x7.5h).

---

# Part 2: Data Model Mapping Analysis

## 11. Existing Dataverse Schema vs Proposed Requirements

### 11.1 Key Findings Summary

| Metric | Value |
|--------|-------|
| New tables required | 6 |
| Existing tables requiring modifications | 3 |
| Field concept reuse rate | ~40% |
| Core shift timing fields | Can be reused from existing structures |

### 11.2 Status Legend

| Status | Description |
|--------|-------------|
| **EXISTS** | Field or concept already exists in current Dataverse schema and can be reused directly |
| **NEW** | New field or table that must be created - does not exist in current schema |
| **MODIFY** | Existing table requires modification (new field added to existing structure) |

---

## 12. Existing Dataverse Tables

### 12.1 cp365_shift (Shifts Table)

The core table for storing individual shift records.

| Field Name | Type | Description |
|------------|------|-------------|
| `cp365_shiftid` | GUID (PK) | Primary key identifier |
| `cp365_shiftreferenceid` | Lookup | Reference to shift template (Early, Late, Night, etc.) |
| Start time / End time | DateTime | Shift timing fields |
| Break Duration (mins) | Integer | Break duration in minutes |
| Staff Member | Lookup | Assigned staff member |
| Team | Lookup | Team assignment |
| Overtime | Boolean | Overtime flag (displays in red) |
| Act-Up | Boolean | Act-up shift indicator |
| Published | Boolean | Publish status flag |
| Activity Type | Lookup | Care/Non-Care activity type |
| Community Hours | Integer | Community hours count |
| Sleep-In | Boolean | Sleep-in shift indicator |

### 12.2 cp365_shiftreference (Shift Reference Table)

Pre-configured shift templates used when creating shifts. Options include: AM, Day Shift, ELD, LD, Long Day, Mid, Night, PM, Standard Hours, etc.

### 12.3 cp365_staffteam (Staff Teams Table)

Team structure for organizing staff members. Includes team ID, team name, and location lookup.

### 12.4 Staff/Employee Table

Staff member records displaying name, job title, weekly hours (Week bar), and period hours (Period bar) on the rota interface.

### 12.5 TAFW/StaffAbsenceLog (Time Away From Work)

Leave management table supporting Annual Leave, Sick Leave, Training, and other absence types with start/end dates and approval status.

### 12.6 Staff Capabilities Table

Qualifications and certifications including Fire Marshal (FM) and First Aider (FA) badges displayed on the rota.

---

## 13. Detailed Field Mapping

### 13.1 Shift Pattern Template (cp_shiftpatterntemplate)

**NEW TABLE** - Stores reusable shift pattern definitions that can be assigned to multiple staff members.

| Proposed Field | Existing Field | Status | Notes |
|----------------|----------------|--------|-------|
| `cp_shiftpatterntemplateid` | — | **NEW** | Primary key for new table |
| `cp_name` | `cp365_shiftreference.name` | **EXISTS** | Similar naming pattern exists |
| `cp_description` | `cp365_shiftreference.desc` | **EXISTS** | Description field pattern exists |
| `cp_rotationcycleweeks` | — | **NEW** | Multi-week rotation concept is new |
| `cp_averageweeklyhours` | — | **NEW** | Calculated field for leave integration |
| `cp_isstandardtemplate` | — | **NEW** | Flag for standard vs custom patterns |
| `cp_status` | `statecode` | **EXISTS** | State pattern exists across tables |
| `statecode` | `statecode` | **EXISTS** | Standard Dataverse state field |

**Reuse Rate:** 37.5% (3 of 8 fields have existing equivalents)

---

### 13.2 Shift Pattern Day (cp_shiftpatternday)

**NEW TABLE** - Child records defining specific shifts for each day within a pattern rotation.

| Proposed Field | Existing Field | Status | Notes |
|----------------|----------------|--------|-------|
| `cp_shiftpatterndayid` | — | **NEW** | Primary key for new table |
| `cp_shiftpatterntemplateid` | — | **NEW** | Foreign key to parent pattern |
| `cp_weeknumber` | — | **NEW** | Week within rotation cycle |
| `cp_dayofweek` | — | **NEW** | Day enumeration (0-6 or 1-7) |
| `cp_shiftreferenceid` | `cp365_shiftreferenceid` | **EXISTS** | Direct reuse of shift reference lookup |
| `cp_starttime` | `cp365_shift.starttime` | **EXISTS** | Time field pattern exists |
| `cp_endtime` | `cp365_shift.endtime` | **EXISTS** | Time field pattern exists |
| `cp_breakminutes` | `cp365_shift.breakduration` | **EXISTS** | Break duration field exists |
| `cp_isrestday` | — | **NEW** | Rest day flag is new concept |

**Reuse Rate:** 44.4% (4 of 9 fields have existing equivalents)

---

### 13.3 Staff Pattern Assignment (cp_staffpatternassignment)

**NEW TABLE** - Links staff members to patterns with effective dates and rotation offset.

| Proposed Field | Existing Field | Status | Notes |
|----------------|----------------|--------|-------|
| `cp_staffpatternassignmentid` | — | **NEW** | Primary key for new table |
| `cp_staffmemberid` | Staff member lookup | **EXISTS** | Staff lookup pattern exists |
| `cp_shiftpatterntemplateid` | — | **NEW** | Foreign key to pattern template |
| `cp_startdate` | Date fields | **EXISTS** | Date field patterns exist |
| `cp_enddate` | Date fields | **EXISTS** | Date field patterns exist (nullable) |
| `cp_rotationstartweek` | — | **NEW** | Rotation offset is new concept |
| `cp_status` | `statecode` | **EXISTS** | State pattern exists |
| `statecode` | `statecode` | **EXISTS** | Standard Dataverse state field |

**Reuse Rate:** 62.5% (5 of 8 fields have existing equivalents)

---

### 13.4 Shift Swap Request (cp_shiftswaprequest)

**NEW TABLE** - Workflow table for managing shift swap requests between staff members.

| Proposed Field | Existing Field | Status | Notes |
|----------------|----------------|--------|-------|
| `cp_shiftswaprequestid` | — | **NEW** | Primary key for new table |
| `cp_requestingstaffid` | Staff member lookup | **EXISTS** | Staff lookup pattern exists |
| `cp_targetstaffid` | Staff member lookup | **EXISTS** | Staff lookup pattern exists |
| `cp_requestingshiftid` | `cp365_shiftid` | **EXISTS** | Shift lookup exists |
| `cp_targetshiftid` | `cp365_shiftid` | **EXISTS** | Shift lookup exists (nullable) |
| `cp_status` | statecode pattern | **EXISTS** | Status field pattern exists |
| `cp_requestdate` | DateTime fields | **EXISTS** | DateTime patterns exist |
| `cp_managercomment` | — | **NEW** | Comment field for approval |
| `cp_approvedbyid` | User lookup | **EXISTS** | User lookup patterns exist |
| `cp_approveddate` | DateTime fields | **EXISTS** | DateTime patterns exist |

**Reuse Rate:** 80% (8 of 10 fields have existing equivalents)

---

### 13.5 Shift Offer (cp_shiftoffer)

**NEW TABLE** - Posted shift offers for staff to claim.

| Proposed Field | Existing Field | Status | Notes |
|----------------|----------------|--------|-------|
| `cp_shiftofferid` | — | **NEW** | Primary key for new table |
| `cp_shiftid` | `cp365_shiftid` | **EXISTS** | Shift lookup exists |
| `cp_deadline` | DateTime fields | **EXISTS** | DateTime patterns exist |
| `cp_targetaudience` | — | **NEW** | OptionSet: All/Team/JobRole/UnderHours |
| `cp_targetteamid` | `cp365_teamid` | **EXISTS** | Team lookup exists |
| `cp_targetjobrole` | Job title field | **EXISTS** | Job role field exists |
| `cp_status` | statecode pattern | **EXISTS** | Status pattern exists |
| `cp_claimedbyid` | Staff member lookup | **EXISTS** | Staff lookup exists |
| `cp_claimeddate` | DateTime fields | **EXISTS** | DateTime patterns exist |
| `cp_createddate` | DateTime fields | **EXISTS** | DateTime patterns exist |

**Reuse Rate:** 80% (8 of 10 fields have existing equivalents)

---

### 13.6 Unit (cp365_unit)

**NEW TABLE** - Organizational hierarchy level between Location and Team (from Hierarchical View feature).

| Proposed Field | Existing Field | Status | Notes |
|----------------|----------------|--------|-------|
| `cp365_unitid` | — | **NEW** | Primary key for new table |
| `cp365_unitname` | `cp365_teamname` pattern | **EXISTS** | Name field patterns exist |
| `cp365_description` | Description fields | **EXISTS** | Description patterns exist |
| `cp365_locationid` | `cp365_locationid` | **EXISTS** | Location lookup exists |
| `cp365_floorlevel` | — | **NEW** | Physical location identifier |
| `cp365_wardname` | — | **NEW** | Care ward identifier |
| `cp365_displayorder` | — | **NEW** | Sort order for display |
| `cp365_isactive` | Boolean fields | **EXISTS** | Boolean pattern exists |
| `cp365_unittypecode` | — | **NEW** | OptionSet for unit types |
| `statecode` | `statecode` | **EXISTS** | Standard state field |

**Reuse Rate:** 50% (5 of 10 fields have existing equivalents)

---

## 14. Modifications to Existing Tables

### 14.1 cp365_staffteam (Add Unit Lookup)

Modification required to link teams to organizational units for hierarchical grouping.

| New Field | Type | Purpose |
|-----------|------|---------|
| `cp365_unitid` | Lookup (nullable) | Links team to organizational unit for hierarchical view grouping |

---

### 14.2 cp365_shift (Add Unit and Pattern Assignment Lookups)

Modifications required to support unit assignment and pattern tracking on individual shifts.

| New Field | Type | Purpose |
|-----------|------|---------|
| `cp365_unitid` | Lookup (nullable) | Direct unit assignment on shift for display grouping |
| `cp365_staffpatternassignmentid` | Lookup (nullable) | Tracks which pattern assignment generated this shift |

---

### 14.3 Staff/Employee Table (Verify Contracted Hours)

Verification required to ensure contracted hours field exists for leave calculation integration.

| Field to Verify | Expected Type | Purpose |
|-----------------|---------------|---------|
| Contracted weekly hours | Decimal | Leave entitlement calculation: Hours × 5.6 weeks |

> **Note:** The rota UI displays 'Week' and 'Period' hour bars, confirming some hours tracking exists. Verify the contracted hours field is available for pattern validation and leave calculations.

---

## 15. Gap Analysis Summary

### 15.1 New Tables Required

| Table Name | Field Reuse Rate | Primary Purpose |
|------------|------------------|-----------------|
| `cp_shiftpatterntemplate` | 37.5% | Pattern definitions |
| `cp_shiftpatternday` | 44.4% | Pattern day details |
| `cp_staffpatternassignment` | 62.5% | Staff-to-pattern links |
| `cp_shiftswaprequest` | 80% | Swap workflow |
| `cp_shiftoffer` | 80% | Offer workflow |
| `cp365_unit` | 50% | Organizational units |

### 15.2 New Field Concepts (Not in Current Schema)

- **Rotation cycle weeks** - Multi-week pattern rotation tracking
- **Week number within rotation** - Position tracking in rotation cycle
- **Day of week as explicit field** - Enumeration for pattern days
- **Rest day flag** - Marks non-working days within patterns
- **Pattern assignment tracking** - Links generated shifts to source pattern
- **Rotation start week offset** - Staggered pattern start positions
- **Target audience option set** - Offer targeting (All/Team/JobRole/UnderHours)
- **Average weekly hours** - Calculated for leave entitlement integration
- **Unit organizational structure** - Hierarchical grouping fields

### 15.3 Reusable Existing Patterns

- `cp365_shiftreferenceid` - Shift template/reference lookups
- Start time / End time / Break duration - Shift timing fields
- Staff member lookups - Employee reference pattern
- Team lookups - Team reference pattern
- Location lookups - Location hierarchy pattern
- Shift ID lookups - Existing shift references
- `statecode` - Standard Dataverse state management
- DateTime fields - Date/time handling patterns
- Boolean flags - Yes/No field patterns

---

## 16. TypeScript Interfaces

```typescript
/**
 * Shift Pattern Template - Reusable pattern definitions
 * Table: cp_shiftpatterntemplate
 */
export interface ShiftPatternTemplate {
  cp_shiftpatterntemplateid: string;
  cp_name: string;
  cp_description?: string;
  cp_rotationcycleweeks: number;
  cp_averageweeklyhours: number;
  cp_isstandardtemplate: boolean;
  cp_status: PatternStatus;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
  
  // Navigation properties
  cp_shiftpatterndays?: ShiftPatternDay[];
  cp_staffpatternassignments?: StaffPatternAssignment[];
}

/**
 * Shift Pattern Day - Individual day definitions within a pattern
 * Table: cp_shiftpatternday
 */
export interface ShiftPatternDay {
  cp_shiftpatterndayid: string;
  _cp_shiftpatterntemplateid_value: string;
  cp_weeknumber: number;
  cp_dayofweek: DayOfWeek;
  _cp_shiftreferenceid_value?: string;
  cp_starttime?: string; // Time string "HH:mm"
  cp_endtime?: string;   // Time string "HH:mm"
  cp_breakminutes?: number;
  cp_isrestday: boolean;
  
  // Expanded lookups
  cp_ShiftPatternTemplate?: ShiftPatternTemplate;
  cp_ShiftReference?: ShiftReference;
}

/**
 * Staff Pattern Assignment - Links staff to patterns
 * Table: cp_staffpatternassignment
 */
export interface StaffPatternAssignment {
  cp_staffpatternassignmentid: string;
  _cp_staffmemberid_value: string;
  _cp_shiftpatterntemplateid_value: string;
  cp_startdate: string;
  cp_enddate?: string;
  cp_rotationstartweek: number;
  cp_status: AssignmentStatus;
  statecode: number;
  statuscode: number;
  
  // Expanded lookups
  cp_StaffMember?: StaffMember;
  cp_ShiftPatternTemplate?: ShiftPatternTemplate;
}

/**
 * Shift Swap Request - Swap workflow tracking
 * Table: cp_shiftswaprequest
 */
export interface ShiftSwapRequest {
  cp_shiftswaprequestid: string;
  _cp_requestingstaffid_value: string;
  _cp_targetstaffid_value?: string;
  _cp_requestingshiftid_value: string;
  _cp_targetshiftid_value?: string;
  cp_status: SwapRequestStatus;
  cp_requestdate: string;
  cp_managercomment?: string;
  _cp_approvedbyid_value?: string;
  cp_approveddate?: string;
  
  // Expanded lookups
  cp_RequestingStaff?: StaffMember;
  cp_TargetStaff?: StaffMember;
  cp_RequestingShift?: Shift;
  cp_TargetShift?: Shift;
}

/**
 * Shift Offer - Open shift posting
 * Table: cp_shiftoffer
 */
export interface ShiftOffer {
  cp_shiftofferid: string;
  _cp_shiftid_value: string;
  cp_deadline: string;
  cp_targetaudience: TargetAudience;
  _cp_targetteamid_value?: string;
  cp_targetjobrole?: string;
  cp_status: OfferStatus;
  _cp_claimedbyid_value?: string;
  cp_claimeddate?: string;
  cp_createddate: string;
  
  // Expanded lookups
  cp_Shift?: Shift;
  cp_TargetTeam?: Team;
  cp_ClaimedBy?: StaffMember;
}

/**
 * Unit - Organizational hierarchy
 * Table: cp365_unit
 */
export interface Unit {
  cp365_unitid: string;
  cp365_unitname: string;
  cp365_description?: string;
  _cp365_locationid_value: string;
  cp365_floorlevel?: string;
  cp365_wardname?: string;
  cp365_displayorder?: number;
  cp365_isactive: boolean;
  cp365_unittypecode?: UnitType;
  statecode: number;
  
  // Expanded lookups
  cp365_Location?: Location;
  cp365_Teams?: Team[];
}

// Enums

export enum PatternStatus {
  Active = 1,
  Inactive = 2,
  Archived = 3
}

export enum AssignmentStatus {
  Active = 1,
  Ended = 2,
  Superseded = 3
}

export enum SwapRequestStatus {
  Pending = 1,
  Accepted = 2,
  Declined = 3,
  Cancelled = 4,
  Approved = 5,
  Rejected = 6
}

export enum OfferStatus {
  Open = 1,
  Claimed = 2,
  Expired = 3,
  Cancelled = 4
}

export enum TargetAudience {
  All = 1,
  Team = 2,
  JobRole = 3,
  UnderHours = 4
}

export enum DayOfWeek {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7
}

export enum UnitType {
  Ward = 1,
  Floor = 2,
  Wing = 3,
  Building = 4,
  Department = 5
}
```

---

## 17. Implementation Recommendations

### 17.1 Phased Delivery

#### Phase 1: Pattern Templates and Individual Assignment (4-6 weeks)
- Pattern template creation and management (US-SP-001 to US-SP-007)
- Individual staff pattern assignment (US-SP-008)
- Pattern view on staff profile
- Basic conflict detection

#### Phase 2: Bulk Assignment and Leave Integration (3-4 weeks)
- Bulk assignment by team and job role (US-SP-009 to US-SP-015)
- Leave calculation integration with pattern hours
- Coverage analysis view
- Advanced conflict resolution workflow

#### Phase 3: Shift Swap and Offer Intelligence (3-4 weeks)
- Shift swap request and approval workflow (US-SS-001 to US-SS-005)
- Shift offer posting and claiming (US-SO-001 to US-SO-003)
- Pattern-aware recommendations engine
- Swap policy configuration

### 17.2 Database Implementation Order

1. Create `cp_shiftpatterntemplate` table with all identified fields
2. Create `cp_shiftpatternday` table as child entity
3. Create `cp_staffpatternassignment` table
4. Verify staff contracted hours field exists for leave integration
5. Build pattern-to-shift generation Power Automate flow
6. Create `cp365_unit` table for hierarchical grouping
7. Modify `cp365_staffteam` to add `cp365_unitid` lookup (nullable)
8. Modify `cp365_shift` to add `cp365_unitid` lookup (nullable)
9. Build hierarchical data queries for rota display
10. Create `cp_shiftswaprequest` table
11. Create `cp_shiftoffer` table
12. Modify `cp365_shift` to add `cp365_staffpatternassignmentid` lookup
13. Build swap/offer recommendation algorithms

### 17.3 Calculated Fields Required

```typescript
// Pattern average weekly hours
const averageWeeklyHours = totalShiftHoursInRotation / rotationCycleWeeks;

// Staff scheduled hours for period
const scheduledHours = shifts
  .filter(s => s.date >= periodStart && s.date <= periodEnd)
  .reduce((sum, s) => sum + calculateShiftDuration(s), 0);

// Staff hours gap
const hoursGap = contractedWeeklyHours - scheduledHours;

// Annual leave entitlement (UK statutory)
const annualLeaveHours = averageWeeklyHours * 5.6;

// Coverage percentage
const coveragePercent = (assignedShifts / requiredShifts) * 100;
```

### 17.4 Data Migration Considerations

- Existing `cp365_shiftreference` records can serve as basis for standard pattern templates
- No existing shifts require modification (pattern assignment is nullable)
- Team-to-unit assignment is optional (nullable lookup)
- Backward compatibility maintained - all new fields are nullable or additive

---

*--- End of Document ---*
