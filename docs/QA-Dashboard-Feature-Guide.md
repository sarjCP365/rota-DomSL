# Dashboard Feature Guide - QA Testing Documentation

**Feature**: Redesigned Dashboard with Today's Snapshot and Period Analytics  
**Version**: 1.0  
**Date**: January 2026  
**Author**: Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Component Guide](#component-guide)
   - [Location Filter](#1-location-filter)
   - [Today's Snapshot](#2-todays-snapshot)
   - [Period Filter](#3-period-filter)
   - [Attention Required](#4-attention-required)
   - [Period Stats](#5-period-stats)
   - [Coverage Heatmap](#6-coverage-heatmap)
3. [Test Scripts](#test-scripts)

---

## Overview

The Dashboard provides care administrators with a quick overview of staffing status. It is divided into two main sections:

1. **Today's Snapshot** - Real-time view of today's staffing (always shows current day)
2. **Period Section** - Analytics for a selectable date period (Week/Fortnight/Month)

### Data Dependencies

| Component | Respects Location Filter | Respects Period Filter |
|-----------|-------------------------|------------------------|
| Today's Snapshot | ✅ Yes | ❌ No (always today) |
| Attention Required | ✅ Yes | ✅ Yes |
| Period Stats | ✅ Yes | ✅ Yes |
| Coverage Heatmap | ✅ Yes | ✅ Yes |

---

## Component Guide

### 1. Location Filter

**Location**: Top of dashboard, below page header

**Purpose**: Filters all dashboard data by Location and Sublocation

**Fields**:
| Field | Source | Notes |
|-------|--------|-------|
| Location | `cp365_locations` table | Dropdown of all active locations |
| Sublocation | `cp365_sublocations` table | Filtered by selected location |
| Rota Name | `cp365_rotas` table | Shows active rota name (read-only) |

**Behaviour**:
- Location dropdown auto-selects first location on page load (if none saved)
- Sublocation dropdown auto-selects first sublocation when location changes
- Selection is persisted in browser storage across sessions
- Sublocation dropdown is disabled until a location is selected

---

### 2. Today's Snapshot

**Location**: Below Location Filter

**Purpose**: Real-time view of today's staffing situation. **Always shows current day regardless of period filter.**

#### 2.1 On Shift Now Card

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| **On Shift Now** | Count of shifts where current time is between shift start and end time AND staff member is assigned | `cp365_shifts` filtered by today's date and rota |
| **Coverage %** | `(Assigned Shifts / Total Shifts) × 100` | Same as above |
| **Unfilled Alert** | Count where `_cp365_staffmember_value` is NULL | Same as above |

**Coverage Bar Colours**:
- 🟢 Green: ≥90%
- 🟡 Amber: 70-89%
- 🔴 Red: <70%

#### 2.2 Shift Changes Card

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| **Time** | Each hour within next 4 hours | System clock |
| **Starting (+X)** | Count of shifts where start hour = target hour AND assigned | `cp365_shifts.cp365_shiftstarttime` |
| **Ending (-X)** | Count of shifts where end hour = target hour AND assigned | `cp365_shifts.cp365_shiftendtime` |

**Logic**:
- Only shows hours that have changes (starting > 0 OR ending > 0)
- Only shows up to 3 time slots
- Does not show times past midnight (next day)

#### 2.3 Absent Today Card

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| **Count** | Count of unique staff with approved absence overlapping today | `cp365_staffabsencelogs` |
| **Staff Name** | Staff member's full name | `cp365_staffmembers.cp365_staffmembername` |
| **Reason** | Absence type name | `cp365_absencetypes.cp365_absencetypename` |

**Filter Criteria**:
- `cp365_absencestatus = 3` (Approved)
- `cp365_absencestart <= today`
- `cp365_absenceend >= today`

---

### 3. Period Filter

**Location**: Below Today's Snapshot, above Attention Required

**Purpose**: Controls the date range for all period-based components

**Fields**:
| Field | Options | Default |
|-------|---------|---------|
| Navigation Arrows | Previous/Next period | N/A |
| Date Range Display | Shows "d MMM - d MMM yyyy" | Current week |
| Today Button | Resets to current week | N/A |
| Duration Dropdown | Weekly (7), Fortnightly (14), Monthly (28) | Weekly |

**Date Range Calculation**:
- Start Date: Monday of selected week
- End Date: Start Date + (Duration - 1) days
- "Previous" moves back by 1 week (or 4 weeks for Monthly)
- "Next" moves forward by 1 week (or 4 weeks for Monthly)

---

### 4. Attention Required

**Location**: Left side of period section (2/3 width)

**Purpose**: Prioritised list of issues requiring administrator attention

#### Alert Priority Levels

| Priority | Badge | Background | Icon | Categories |
|----------|-------|------------|------|------------|
| **Critical** | Red "CRITICAL" tag | Light red | Moon 🌙 | Unfilled Night/Sleep-In shifts |
| **Warning** | Amber count badge | Light amber | Sun ☀️, Clock 🕐 | Unfilled Day shifts, Overtime |
| **Info** | Blue count badge | None | Calendar 📅, Send ✉️ | Staff on leave, Unpublished |

#### Alert Types

**4.1 Unfilled Night/Sleep-In Shifts (CRITICAL)**
| Field | Calculation |
|-------|-------------|
| Count | Shifts where `_cp365_staffmember_value` is NULL AND (`cp365_sleepin = true` OR start hour ≥ 18 OR start hour < 6) |
| Dates | List of unique dates formatted as "EEE d MMM" |

**4.2 Unfilled Day Shifts (WARNING)**
| Field | Calculation |
|-------|-------------|
| Count | Shifts where `_cp365_staffmember_value` is NULL AND NOT sleep-in AND start hour between 6-17 |
| Dates | List of unique dates |

**4.3 Staff Near Overtime (WARNING)**
| Field | Calculation |
|-------|-------------|
| Threshold | ≥90% of contracted hours used |
| Scheduled Hours | Sum of shift durations for staff member in period |
| Contracted Hours | Sum of `cp365_requiredhours` from all active contracts (`cp365_staffcontracts` → `cp365_contracts`) |
| Details | "Staff Name (scheduled/contracted hrs)" |

**Contracted Hours Calculation**:
```
For each staff member:
1. Get all records from cp365_staffcontracts where cp365_active = true
2. For each contract, look up cp365_contracts._cp365_contract_value
3. Sum all cp365_requiredhours values
4. Staff may have multiple contracts - sum ALL required hours
```

**4.4 Staff on Leave (INFO)**
| Field | Calculation |
|-------|-------------|
| Count | Unique staff members with approved absence overlapping period |

**4.5 Unpublished Shifts (INFO)**
| Field | Calculation |
|-------|-------------|
| Count | Shifts where `cp365_shiftstatus = 1009` (Unpublished) |

---

### 5. Period Stats

**Location**: Right side of period section (1/3 width)

**Purpose**: Summary statistics for the selected period

| Stat | Calculation | Icon |
|------|-------------|------|
| **Total Shifts** | Count of all shifts in period | 👥 Users |
| **Assigned** | Count where `_cp365_staffmember_value` is NOT NULL | ✅ UserCheck (green) |
| **Unfilled** | Count where `_cp365_staffmember_value` is NULL | ❌ UserX (amber if >0) |
| **Staff on Leave** | Unique staff with approved absence | 📅 Calendar |
| **Unpublished** | Count where status = 1009 | ✉️ Send (purple if >0) |
| **Total Hours** | Sum of all shift durations in period | 🕐 Clock |
| **vs Contracted** | `(Total Hours / Sum of Contracted Hours) × 100` | Progress bar |

**Shift Duration Calculation**:
```
Duration = (cp365_shiftendtime - cp365_shiftstarttime) in hours
Total Hours = Sum of all durations
```

**Hours Progress Bar Colours**:
- 🟢 Green: ≤85%
- 🟡 Amber: 86-100%
- 🔴 Red: >100%

---

### 6. Coverage Heatmap

**Location**: Full width below Attention Required and Period Stats

**Purpose**: Visual representation of coverage by day and shift type

#### Row Types

| Row | Definition | Icon |
|-----|------------|------|
| **Day** | Shifts starting between 06:00-17:59 AND NOT sleep-in | ☀️ Sun (amber) |
| **Night** | Shifts starting between 18:00-05:59 AND NOT sleep-in | 🌙 Moon (indigo) |
| **Sleep-In** | Shifts where `cp365_sleepin = true` | 🛏️ Bed (purple) |

#### Cell Values

| Field | Calculation |
|-------|-------------|
| **Percentage** | `(Filled / Total) × 100`, rounded |
| **Fraction** | "Filled/Total" shifts |
| **Warning Icon** | Shows if <70% AND has unfilled shifts |

#### Cell Colours

| Coverage % | Background | Text |
|------------|------------|------|
| 100% | Green (#22c55e) | White |
| 70-99% | Amber (#fbbf24) | Dark amber |
| <70% | Red (#ef4444) | White |
| No shifts | Grey (#e2e8f0) | Grey dash |

#### Warning Icons

| Condition | Icon | Colour |
|-----------|------|--------|
| Night/Sleep-In <70% | ⚠️ AlertCircle | Red |
| Day <70% | ⚠️ AlertTriangle | Amber |

---

## Test Scripts

### Prerequisites

1. Access to the CarePoint365 Rota application at `http://localhost:4280`
2. Valid Azure AD credentials with data access
3. Test data in Dataverse:
   - At least one Location with Sublocations
   - Active Rota with shifts (published and unpublished)
   - Staff members with contracts
   - Some unfilled shifts
   - Approved absences
   - Shifts for current day and future dates

---

### TS-DASH-001: Location Filter Functionality

**Objective**: Verify location and sublocation filtering works correctly

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Dashboard | Location dropdown shows "Select location..." |
| 2 | Wait for locations to load | First location is auto-selected |
| 3 | Verify sublocation dropdown | First sublocation is auto-selected |
| 4 | Note the Rota name displayed | Active rota name appears next to dropdowns |
| 5 | Change Location dropdown | Sublocation dropdown resets and shows new sublocations |
| 6 | Select a different sublocation | All dashboard data refreshes |
| 7 | Refresh the page | Previously selected location/sublocation is remembered |
| 8 | Clear browser storage and refresh | Returns to auto-select first location/sublocation |

**Pass Criteria**: All steps complete successfully, data refreshes on selection change

---

### TS-DASH-002: Today's Snapshot - On Shift Now

**Objective**: Verify "On Shift Now" count and coverage calculation

**Test Data Required**: Shifts for current day with known start/end times

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Dashboard with test location | Today's Snapshot section displays |
| 2 | Note current time | Record for reference |
| 3 | Count shifts in Dataverse where: today's date, rota matches, start ≤ now ≤ end, staff assigned | Record count (X) |
| 4 | Compare "On Shift Now" value | Should match count X |
| 5 | Count total shifts for today | Record count (T) |
| 6 | Count assigned shifts for today | Record count (A) |
| 7 | Calculate expected coverage | (A/T) × 100, rounded |
| 8 | Compare Coverage % displayed | Should match calculation |
| 9 | Verify coverage bar colour | Green ≥90%, Amber 70-89%, Red <70% |
| 10 | If unfilled shifts exist | "X unfilled shifts" alert appears |

**Pass Criteria**: All counts and percentages match manual calculation

---

### TS-DASH-003: Today's Snapshot - Shift Changes

**Objective**: Verify upcoming shift changes display correctly

**Test Data Required**: Shifts with start/end times within next 4 hours

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note current time (e.g., 10:00) | Record reference time |
| 2 | Check next 4 hours (11:00, 12:00, 13:00, 14:00) | Identify which have shift changes |
| 3 | For each hour, count shifts starting at that hour | Record starting counts |
| 4 | For each hour, count shifts ending at that hour | Record ending counts |
| 5 | Open Dashboard | Shift Changes card displays |
| 6 | Verify times shown | Only hours with changes (starting>0 OR ending>0) appear |
| 7 | Verify +X values | Match starting counts |
| 8 | Verify -X values | Match ending counts |
| 9 | Test with no upcoming changes | "No upcoming changes" message displays |

**Pass Criteria**: All shift change times and counts match Dataverse data

---

### TS-DASH-004: Today's Snapshot - Absent Today

**Objective**: Verify absent staff display correctly

**Test Data Required**: Approved absences overlapping today's date

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query cp365_staffabsencelogs where status=3, start≤today, end≥today | Record count and names |
| 2 | Open Dashboard | Absent Today card displays |
| 3 | Compare count displayed | Should match query count |
| 4 | Verify staff names shown | First 3 names match query results |
| 5 | Verify absence reasons | Match cp365_absencetype names |
| 6 | If >3 absences | "+X more" message appears |
| 7 | Test with no absences | "No absences today" message displays |

**Pass Criteria**: Absent count, names, and reasons match Dataverse

---

### TS-DASH-005: Period Filter Navigation

**Objective**: Verify date navigation and duration selection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Dashboard | Current week displayed (Monday - Sunday) |
| 2 | Verify date format | Shows "d MMM - d MMM yyyy" |
| 3 | Click "Previous" arrow | Date range moves back 1 week |
| 4 | Click "Next" arrow | Date range moves forward 1 week |
| 5 | Click "Today" button | Returns to current week |
| 6 | Change duration to "Fortnightly" | Date range shows 14 days |
| 7 | Click "Previous" arrow | Moves back 1 week |
| 8 | Change duration to "Monthly" | Date range shows 28 days |
| 9 | Click "Previous" arrow | Moves back 4 weeks |
| 10 | Verify all period components update | Attention Required, Period Stats, Coverage Heatmap refresh |

**Pass Criteria**: Date navigation correct for all durations

---

### TS-DASH-006: Attention Required - Critical Alerts

**Objective**: Verify unfilled Night/Sleep-In shifts show as critical

**Test Data Required**: Unfilled night shifts and sleep-in shifts

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create unfilled shift starting at 20:00 (night) | Save successfully |
| 2 | Create unfilled shift with sleep-in flag | Save successfully |
| 3 | Open Dashboard, select period containing these shifts | Attention Required displays |
| 4 | Verify "Unfilled Night/Sleep-In Shifts" alert | Shows with red "CRITICAL" badge |
| 5 | Verify count matches | Sum of night + sleep-in unfilled shifts |
| 6 | Verify dates listed | Shows affected dates |
| 7 | Verify appears at top | Critical alerts sort before warnings/info |

**Pass Criteria**: Night/Sleep-In gaps flagged as critical with correct count

---

### TS-DASH-007: Attention Required - Warning Alerts

**Objective**: Verify unfilled Day shifts and overtime warnings

**Test Data Required**: Unfilled day shifts, staff with high scheduled hours

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create unfilled shift starting at 09:00 (day) | Save successfully |
| 2 | Open Dashboard | "Unfilled Day Shifts" appears as warning |
| 3 | Verify count and dates | Match unfilled day shifts |
| 4 | Create staff with 40hr contract | Record staff ID |
| 5 | Assign 36+ hours of shifts to that staff | ≥90% of 40hrs |
| 6 | Refresh Dashboard | "Staff Near Overtime" warning appears |
| 7 | Verify staff name and hours shown | "Staff Name (36/40 hrs)" format |

**Pass Criteria**: Day gaps show as warning, overtime threshold triggers at 90%

---

### TS-DASH-008: Attention Required - Info Alerts

**Objective**: Verify staff leave and unpublished shift info alerts

**Test Data Required**: Approved absences, unpublished shifts

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create approved absence for a staff member | Status = Approved (3) |
| 2 | Create shift with status Unpublished (1009) | Save successfully |
| 3 | Open Dashboard, select period containing these | Attention Required displays |
| 4 | Verify "Staff on Leave" info alert | Shows count of unique staff |
| 5 | Verify "Unpublished Shifts" info alert | Shows count of unpublished |
| 6 | Verify info alerts appear after critical/warning | Sorted by priority |

**Pass Criteria**: Leave and unpublished counts accurate, sorted correctly

---

### TS-DASH-009: Period Stats Calculations

**Objective**: Verify all period statistics are calculated correctly

**Test Data Required**: Mix of assigned, unfilled, published, unpublished shifts

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query shifts in test period | Record total count |
| 2 | Count assigned vs unfilled | Record both counts |
| 3 | Count unpublished (status=1009) | Record count |
| 4 | Query absences overlapping period | Count unique staff IDs |
| 5 | Calculate total hours | Sum all (end-start) durations |
| 6 | Open Dashboard | Period Stats displays |
| 7 | Verify "Total Shifts" | Matches total count |
| 8 | Verify "Assigned" | Matches assigned count (green) |
| 9 | Verify "Unfilled" | Matches unfilled count (amber if >0) |
| 10 | Verify "Staff on Leave" | Matches unique staff count |
| 11 | Verify "Unpublished" | Matches unpublished count (purple if >0) |
| 12 | Verify "Total Hours" | Matches calculated hours |

**Pass Criteria**: All statistics match manual calculations

---

### TS-DASH-010: Period Stats - Hours Progress Bar

**Objective**: Verify hours vs contracted calculation and colours

**Test Data Required**: Staff with contracts, shifts assigned to them

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Get all staff assigned shifts in period | List staff IDs |
| 2 | For each staff, sum contracted hours from all active contracts | Record total contracted |
| 3 | Sum all shift hours in period | Record total scheduled |
| 4 | Calculate percentage: (scheduled/contracted) × 100 | Record expected % |
| 5 | Open Dashboard | Hours progress bar displays |
| 6 | Verify percentage shown | Matches calculation |
| 7 | Verify progress bar colour | Green ≤85%, Amber 86-100%, Red >100% |
| 8 | Test with 80% utilisation | Bar should be green |
| 9 | Test with 95% utilisation | Bar should be amber |
| 10 | Test with 110% utilisation | Bar should be red |

**Pass Criteria**: Percentage accurate, colours match thresholds

---

### TS-DASH-011: Coverage Heatmap - Shift Categorisation

**Objective**: Verify shifts are correctly categorised as Day/Night/Sleep-In

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create shift starting at 08:00 (no sleep-in) | Day shift |
| 2 | Create shift starting at 14:00 (no sleep-in) | Day shift |
| 3 | Create shift starting at 18:00 (no sleep-in) | Night shift |
| 4 | Create shift starting at 22:00 (no sleep-in) | Night shift |
| 5 | Create shift starting at 04:00 (no sleep-in) | Night shift |
| 6 | Create shift with sleep-in flag = true | Sleep-In (regardless of time) |
| 7 | Open Dashboard | Coverage Heatmap displays |
| 8 | Verify Day row | Shows shifts starting 06:00-17:59 |
| 9 | Verify Night row | Shows shifts starting 18:00-05:59 |
| 10 | Verify Sleep-In row | Shows all sleep-in flagged shifts |

**Pass Criteria**: Each shift appears in correct row based on categorisation rules

---

### TS-DASH-012: Coverage Heatmap - Percentage Calculation

**Objective**: Verify coverage percentages are calculated correctly per day

**Test Data Required**: Shifts with known fill status for specific dates

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | For a specific date, create 4 day shifts | 2 assigned, 2 unfilled |
| 2 | Calculate expected Day coverage | (2/4) × 100 = 50% |
| 3 | Open Dashboard | Coverage Heatmap displays |
| 4 | Find the test date column | Locate in heatmap |
| 5 | Verify Day row cell | Shows "50%" and "2/4" |
| 6 | Verify cell colour | Red (<70%) |
| 7 | Verify warning icon | AlertTriangle appears (Day shift) |
| 8 | Test with 100% coverage | Cell is green, no warning |
| 9 | Test with 75% coverage | Cell is amber |

**Pass Criteria**: All percentages and colours match calculations

---

### TS-DASH-013: Coverage Heatmap - Warning Icons

**Objective**: Verify correct warning icons for different shift types

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create unfilled Day shifts (<70% coverage) | Save successfully |
| 2 | Create unfilled Night shifts (<70% coverage) | Save successfully |
| 3 | Create unfilled Sleep-In shifts (<70% coverage) | Save successfully |
| 4 | Open Dashboard | Coverage Heatmap displays |
| 5 | Check Day row with <70% | AlertTriangle icon (amber) |
| 6 | Check Night row with <70% | AlertCircle icon (red) |
| 7 | Check Sleep-In row with <70% | AlertCircle icon (red) |
| 8 | Check any row with ≥70% | No warning icon |
| 9 | Check any row with no shifts | Grey cell, dash, no icon |

**Pass Criteria**: Critical shift types (Night/Sleep-In) show red icon, Day shows amber

---

### TS-DASH-014: Data Refresh

**Objective**: Verify data refreshes when Refresh button clicked

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Dashboard | Note current values |
| 2 | In another tab, create a new shift in Dataverse | Save successfully |
| 3 | Return to Dashboard | Data unchanged (stale) |
| 4 | Click "Refresh" button | Spinner appears on button |
| 5 | Wait for refresh complete | All components update |
| 6 | Verify new shift reflected | Counts/coverage updated |

**Pass Criteria**: Manual refresh updates all dashboard data

---

### TS-DASH-015: Empty State Handling

**Objective**: Verify dashboard handles missing data gracefully

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select location with no rota | "Select a Location" message appears |
| 2 | Select sublocation with no shifts | Today's Snapshot shows zeros |
| 3 | Verify Attention Required | "No issues requiring attention" message |
| 4 | Verify Period Stats | Shows zeros for all stats |
| 5 | Verify Coverage Heatmap | "No coverage data available" or grey cells |
| 6 | Verify no errors in console | No JavaScript errors |

**Pass Criteria**: All empty states handled gracefully without errors

---

### TS-DASH-016: Responsive Layout

**Objective**: Verify dashboard displays correctly on different screen sizes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Dashboard on desktop (1920px) | Full layout, side-by-side components |
| 2 | Resize to tablet (1024px) | Layout adapts, may stack |
| 3 | Resize to mobile (375px) | Single column layout |
| 4 | Verify Today's Snapshot | Cards stack on mobile |
| 5 | Verify Attention + Stats | Stack vertically on mobile |
| 6 | Verify Coverage Heatmap | Horizontal scroll if needed |
| 7 | Verify all text readable | No overflow or truncation issues |

**Pass Criteria**: Dashboard usable on all screen sizes

---

### TS-DASH-017: Performance

**Objective**: Verify dashboard loads within acceptable time

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear browser cache | Fresh state |
| 2 | Navigate to Dashboard | Start timer |
| 3 | Wait for all components to load | Stop timer |
| 4 | Record load time | Should be <5 seconds |
| 5 | Change period filter | Components update <2 seconds |
| 6 | Click Refresh button | Refresh completes <3 seconds |

**Pass Criteria**: Initial load <5s, interactions <3s

---

## Appendix: Dataverse Entity Reference

### Key Tables

| Table | Purpose |
|-------|---------|
| `cp365_locations` | Care home locations |
| `cp365_sublocations` | Units within locations |
| `cp365_rotas` | Rota periods |
| `cp365_shifts` | Individual shifts |
| `cp365_staffmembers` | Staff records |
| `cp365_staffcontracts` | Staff-Contract links |
| `cp365_contracts` | Contract definitions |
| `cp365_staffabsencelogs` | Absence records |
| `cp365_absencetypes` | Absence type lookup |

### Key Field Values

| Field | Value | Meaning |
|-------|-------|---------|
| `cp365_shiftstatus` | 1001 | Published |
| `cp365_shiftstatus` | 1009 | Unpublished |
| `cp365_absencestatus` | 3 | Approved |
| `cp365_sleepin` | true | Sleep-in shift |

---

*Document End*
