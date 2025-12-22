# Shift Patterns - Dataverse Table Setup Guide

## For: CarePoint 365 Developer
## Version: 1.1 | December 2025

---

## Overview

This guide will walk you through creating the database tables (called "Tables" in Dataverse) needed for the Shift Patterns feature. You will create **4 new tables** and **modify 1 existing table**.

**Estimated Time:** 2-3 hours

**What You'll Create:**
1. `cp365_shiftpatterntemplatenew` - Stores pattern definitions (e.g., "4-on-4-off")
2. `cp365_shiftpatternday` - Stores individual day settings within patterns
3. `cp365_staffpatternassignment` - Links staff members to patterns
4. `cp365_shiftgenerationlog` - Tracks when shifts are generated from patterns
5. Modify `cp365_shift` - Add new columns to existing shifts table

---

## Naming Convention

All custom columns for this feature use the prefix `cp365_sp_` where:
- `cp365_` is the solution prefix
- `sp_` identifies this as a **S**hift **P**attern column

This makes it easy to identify which columns belong to this feature when building flows, reports, or queries.

**Exception:** Primary columns (the main name field) and lookup columns follow standard Dataverse conventions without the `sp_` prefix.

---

## Before You Start

### Access Required
- Power Apps Maker Portal access: https://make.powerapps.com
- System Administrator or System Customizer security role
- Access to the CarePoint 365 solution

### How to Navigate to Tables
1. Go to https://make.powerapps.com
2. Select your **Environment** from the top-right dropdown
3. Click **Solutions** in the left navigation
4. Open the **CarePoint 365** solution (or your solution name)
5. Click **+ New** → **Table** to create a new table

---

## Table 1: Shift Pattern Template new

This table stores the main pattern definitions that can be reused across multiple staff members.

### Step 1: Create the Table

1. In your solution, click **+ New** → **Table**
2. Enter the following details:

| Field | Value |
|-------|-------|
| Display name | `Shift Pattern Template new` |
| Plural name | `Shift Pattern Templates new` |
| Name (schema) | `cp365_shiftpatterntemplatenew` |
| Primary column display name | `Pattern Name` |
| Primary column name (schema) | `cp365_name` |
| Description | `Reusable shift pattern templates defining rotation schedules for staff` |

3. Click **Save**

### Step 2: Add Columns

After creating the table, click on it to open it, then click **+ New column** for each column below:

#### Column 1: Description
| Setting | Value |
|---------|-------|
| Display name | `Description` |
| Name (schema) | `cp365_sp_description` |
| Data type | `Text` → `Multiple lines of text` |
| Required | `Optional` |
| Description | `Detailed explanation of the shift pattern including typical use cases, target roles, and any special considerations for managers` |

Click **Save**

#### Column 2: Rotation Cycle (Weeks)
| Setting | Value |
|---------|-------|
| Display name | `Rotation Cycle (Weeks)` |
| Name (schema) | `cp365_sp_rotationcycleweeks` |
| Data type | `Number` → `Whole number` |
| Required | `Required` |
| Minimum value | `1` |
| Maximum value | `8` |
| Default value | `1` |
| Description | `Number of weeks before the pattern repeats. For example, a 2-week rotating pattern has value 2. Standard weekly patterns have value 1` |

Click **Save**

#### Column 3: Average Weekly Hours
| Setting | Value |
|---------|-------|
| Display name | `Average Weekly Hours` |
| Name (schema) | `cp365_sp_averageweeklyhours` |
| Data type | `Number` → `Decimal number` |
| Required | `Optional` |
| Decimal places | `2` |
| Description | `Calculated average working hours per week across the full rotation cycle. Used for contract validation and annual leave entitlement calculations (hours × 5.6 weeks for UK statutory leave)` |

Click **Save**

#### Column 4: Total Rotation Hours
| Setting | Value |
|---------|-------|
| Display name | `Total Rotation Hours` |
| Name (schema) | `cp365_sp_totalrotationhours` |
| Data type | `Number` → `Decimal number` |
| Required | `Optional` |
| Decimal places | `2` |
| Description | `Sum of all working hours across the entire rotation cycle (all weeks combined). For a 2-week pattern with 40 hours each week, this would be 80 hours` |

Click **Save**

#### Column 5: Is Standard Template
| Setting | Value |
|---------|-------|
| Display name | `Is Standard Template` |
| Name (schema) | `cp365_sp_isstandardtemplate` |
| Data type | `Yes/No` |
| Required | `Required` |
| Default value | `No` |
| Description | `Yes if this is a pre-configured industry-standard pattern (e.g., 4-on-4-off, Standard Days). Standard templates are shown with a badge in the UI and cannot be deleted by regular users` |

Click **Save**

#### Column 6: Default Publish Status
| Setting | Value |
|---------|-------|
| Display name | `Default Publish Status` |
| Name (schema) | `cp365_sp_defaultpublishstatus` |
| Data type | `Choice` → `Choice` (not "Choices") |
| Required | `Required` |
| Sync with global choice | `No` (create new) |
| Description | `Default status for shifts generated from this pattern. Published shifts are visible to staff; Unpublished shifts are drafts that managers must manually publish` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| Published | `1001` |
| Unpublished | `1009` |

Set **Default value** to `Unpublished`

Click **Save**

#### Column 7: Generation Window (Weeks)
| Setting | Value |
|---------|-------|
| Display name | `Generation Window (Weeks)` |
| Name (schema) | `cp365_sp_generationwindowweeks` |
| Data type | `Choice` → `Choice` |
| Required | `Required` |
| Sync with global choice | `No` (create new) |
| Description | `How far in advance shifts should be automatically generated. For example, 2 Weeks means the system will create shifts up to 2 weeks ahead of the current date` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| 1 Week | `1` |
| 2 Weeks | `2` |
| 4 Weeks | `4` |

Set **Default value** to `2 Weeks`

Click **Save**

#### Column 8: Pattern Status
| Setting | Value |
|---------|-------|
| Display name | `Pattern Status` |
| Name (schema) | `cp365_sp_patternstatus` |
| Data type | `Choice` → `Choice` |
| Required | `Required` |
| Sync with global choice | `No` (create new) |
| Description | `Lifecycle status of the pattern. Active patterns can be assigned to staff. Inactive patterns cannot be newly assigned but existing assignments continue. Archived patterns are hidden from the UI` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| Active | `1` |
| Inactive | `2` |
| Archived | `3` |

Set **Default value** to `Active`

Click **Save**

### Step 3: Verify Your Table

Your `cp365_shiftpatterntemplatenew` table should now have these columns:
- ✅ cp365_name (Primary column - created automatically)
- ✅ cp365_sp_description
- ✅ cp365_sp_rotationcycleweeks
- ✅ cp365_sp_averageweeklyhours
- ✅ cp365_sp_totalrotationhours
- ✅ cp365_sp_isstandardtemplate
- ✅ cp365_sp_defaultpublishstatus
- ✅ cp365_sp_generationwindowweeks
- ✅ cp365_sp_patternstatus

---

## Table 2: Shift Pattern Day

This table stores the individual day definitions within each pattern. Each pattern template will have multiple pattern days (e.g., a 2-week pattern has 14 pattern day records).

### Step 1: Create the Table

1. In your solution, click **+ New** → **Table**
2. Enter the following details:

| Field | Value |
|-------|-------|
| Display name | `Shift Pattern Day` |
| Plural name | `Shift Pattern Days` |
| Name (schema) | `cp365_shiftpatternday` |
| Primary column display name | `Day Name` |
| Primary column name (schema) | `cp365_name` |
| Description | `Individual day definitions within a shift pattern rotation` |

3. Click **Save**

### Step 2: Add Columns

#### Column 1: Week Number
| Setting | Value |
|---------|-------|
| Display name | `Week Number` |
| Name (schema) | `cp365_sp_weeknumber` |
| Data type | `Number` → `Whole number` |
| Required | `Required` |
| Minimum value | `1` |
| Maximum value | `8` |
| Description | `Which week within the rotation cycle this day belongs to. Week 1 is the first week of the pattern. For single-week patterns, this is always 1` |

Click **Save**

#### Column 2: Day of Week
| Setting | Value |
|---------|-------|
| Display name | `Day of Week` |
| Name (schema) | `cp365_sp_dayofweek` |
| Data type | `Choice` → `Choice` |
| Required | `Required` |
| Sync with global choice | `No` (create new) |
| Description | `Which day of the week this pattern day represents. Monday=1 through Sunday=7. Combined with Week Number to identify the exact position in a multi-week rotation` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| Monday | `1` |
| Tuesday | `2` |
| Wednesday | `3` |
| Thursday | `4` |
| Friday | `5` |
| Saturday | `6` |
| Sunday | `7` |

Click **Save**

#### Column 3: Start Time
| Setting | Value |
|---------|-------|
| Display name | `Start Time` |
| Name (schema) | `cp365_sp_starttime` |
| Data type | `Date and time` |
| Format | `Date and Time` |
| Behaviour | `User Local` or `Time-Zone Independent` |
| Required | `Optional` |
| Description | `Shift start time in 24-hour format (e.g., 07:00 for 7am, 20:00 for 8pm). Leave empty if this is a rest day. For overnight shifts, this is when the shift begins` |

> **Important:** Dataverse doesn't have a "Time only" type. Use Date and Time with a **fixed dummy date** (e.g., `1900-01-01`). The app/code will only use the time portion. When generating actual shifts, the time is combined with the real shift date.

Click **Save**

#### Column 4: End Time
| Setting | Value |
|---------|-------|
| Display name | `End Time` |
| Name (schema) | `cp365_sp_endtime` |
| Data type | `Date and time` |
| Format | `Date and Time` |
| Behaviour | `User Local` or `Time-Zone Independent` |
| Required | `Optional` |
| Description | `Shift end time in 24-hour format. For overnight shifts (e.g., 20:00-08:00), set Is Overnight Shift to Yes and the system will correctly calculate the shift spans two calendar days` |

> **Important:** Same as Start Time - use Date and Time with a **fixed dummy date**. The app will extract only the time portion.

Click **Save**

#### Column 5: Break Duration (Minutes)
| Setting | Value |
|---------|-------|
| Display name | `Break Duration (Minutes)` |
| Name (schema) | `cp365_sp_breakminutes` |
| Data type | `Number` → `Whole number` |
| Required | `Optional` |
| Minimum value | `0` |
| Maximum value | `480` |
| Default value | `0` |
| Description | `Unpaid break duration in minutes. This is subtracted from total shift time when calculating working hours. Common values: 30 (half hour), 60 (one hour). Maximum 480 minutes (8 hours)` |

Click **Save**

#### Column 6: Is Rest Day
| Setting | Value |
|---------|-------|
| Display name | `Is Rest Day` |
| Name (schema) | `cp365_sp_isrestday` |
| Data type | `Yes/No` |
| Required | `Required` |
| Default value | `No` |
| Description | `Yes if this day is a scheduled day off within the pattern. Rest days have no shift times and no shift is generated. Used in 4-on-4-off patterns where staff have consecutive days off` |

Click **Save**

#### Column 7: Is Overnight Shift
| Setting | Value |
|---------|-------|
| Display name | `Is Overnight Shift` |
| Name (schema) | `cp365_sp_isovernight` |
| Data type | `Yes/No` |
| Required | `Required` |
| Default value | `No` |
| Description | `Yes if the shift crosses midnight (e.g., 20:00-08:00). When Yes, the system knows the end time is on the following calendar day. Important for night shifts in 24-hour care settings` |

Click **Save**

#### Column 8: Display Order
| Setting | Value |
|---------|-------|
| Display name | `Display Order` |
| Name (schema) | `cp365_sp_displayorder` |
| Data type | `Number` → `Whole number` |
| Required | `Optional` |
| Description | `Controls the sorting order when displaying pattern days in the UI. Lower numbers appear first. Typically calculated as (Week Number × 10) + Day of Week for chronological ordering` |

Click **Save**

### Step 3: Add Lookup Columns (Relationships)

Lookup columns create relationships between tables.

#### Lookup 1: Pattern Template (REQUIRED)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Pattern Template` |
| Name (schema) | `cp365_shiftpatterntemplate` |
| Data type | `Lookup` → `Lookup` |
| Required | `Required` |
| Related table | `Shift Pattern Template new` (select from dropdown) |
| Description | `The parent pattern template this day belongs to. Each pattern template has multiple pattern day records (one for each day in the rotation cycle)` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Cascade` (this means if the pattern template is deleted, all its days are also deleted)

4. Click **Save**

#### Lookup 2: Shift Reference (OPTIONAL)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Shift Reference` |
| Name (schema) | `cp365_shiftreference` |
| Data type | `Lookup` → `Lookup` |
| Required | `Optional` |
| Related table | `Shift Reference` (the existing cp365_shiftreference table) |
| Description | `Links to a pre-defined shift type (e.g., Early, Late, Night, Long Day). When shifts are generated, they inherit this reference for consistent categorisation and reporting` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Remove Link` (if shift reference is deleted, just clear this field)

4. Click **Save**

#### Lookup 3: Shift Activity (OPTIONAL)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Shift Activity` |
| Name (schema) | `cp365_shiftactivity` |
| Data type | `Lookup` → `Lookup` |
| Required | `Optional` |
| Related table | `Shift Activity` (the existing cp365_shiftactivity table) |
| Description | `Default activity type for shifts generated on this day (e.g., Direct Care, Administration, Training). Can be overridden on individual shifts after generation` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Remove Link`

4. Click **Save**

### Step 4: Verify Your Table

Your `cp365_shiftpatternday` table should now have:
- ✅ cp365_name (Primary column)
- ✅ cp365_sp_weeknumber
- ✅ cp365_sp_dayofweek
- ✅ cp365_sp_starttime
- ✅ cp365_sp_endtime
- ✅ cp365_sp_breakminutes
- ✅ cp365_sp_isrestday
- ✅ cp365_sp_isovernight
- ✅ cp365_sp_displayorder
- ✅ cp365_shiftpatterntemplate (Lookup)
- ✅ cp365_shiftreference (Lookup)
- ✅ cp365_shiftactivity (Lookup)

---

## Table 3: Staff Pattern Assignment

This table links staff members to pattern templates. A staff member can have multiple pattern assignments.

### Step 1: Create the Table

1. In your solution, click **+ New** → **Table**
2. Enter:

| Field | Value |
|-------|-------|
| Display name | `Staff Pattern Assignment` |
| Plural name | `Staff Pattern Assignments` |
| Name (schema) | `cp365_staffpatternassignment` |
| Primary column display name | `Assignment Name` |
| Primary column name (schema) | `cp365_name` |
| Description | `Links staff members to shift pattern templates with effective dates` |

3. Click **Save**

### Step 2: Add Columns

#### Column 1: Start Date
| Setting | Value |
|---------|-------|
| Display name | `Start Date` |
| Name (schema) | `cp365_sp_startdate` |
| Data type | `Date and time` |
| Format | `Date only` |
| Required | `Required` |
| Description | `The date when this pattern assignment becomes effective and shift generation begins. Should align with the start of the rotation cycle (typically a Monday). Must be on or after today's date for new assignments` |

Click **Save**

#### Column 2: End Date
| Setting | Value |
|---------|-------|
| Display name | `End Date` |
| Name (schema) | `cp365_sp_enddate` |
| Data type | `Date and time` |
| Format | `Date only` |
| Required | `Optional` |
| Description | `Optional end date for temporary pattern assignments. Leave empty for permanent/ongoing assignments. When set, no shifts will be generated after this date and the assignment status changes to Ended` |

Click **Save**

#### Column 3: Rotation Start Week
| Setting | Value |
|---------|-------|
| Display name | `Rotation Start Week` |
| Name (schema) | `cp365_sp_rotationstartweek` |
| Data type | `Number` → `Whole number` |
| Required | `Required` |
| Minimum value | `1` |
| Maximum value | `8` |
| Default value | `1` |
| Description | `Which week of the rotation cycle to start from. Used to stagger team members on the same pattern. For example, if Team A starts at Week 1 and Team B starts at Week 2, they alternate coverage` |

Click **Save**

#### Column 4: Priority
| Setting | Value |
|---------|-------|
| Display name | `Priority` |
| Name (schema) | `cp365_sp_priority` |
| Data type | `Number` → `Whole number` |
| Required | `Required` |
| Minimum value | `1` |
| Maximum value | `99` |
| Default value | `1` |
| Description | `Priority ranking when staff have multiple overlapping patterns. Lower number = higher priority. Priority 1 takes precedence over Priority 2. Used to resolve conflicts when patterns overlap` |

Click **Save**

> **Note:** Priority 1 = highest priority. If a staff member has multiple patterns, the lower priority number takes precedence.

#### Column 5: Applies to Days
| Setting | Value |
|---------|-------|
| Display name | `Applies to Days` |
| Name (schema) | `cp365_sp_appliestodays` |
| Data type | `Text` → `Multiple lines of text` |
| Required | `Optional` |
| Description | `JSON array specifying which days of the week this assignment applies to. Format: ["Monday","Tuesday"]. If empty or null, the pattern applies to all 7 days. Used for part-time staff who only work certain days` |

> **Note:** This field stores a JSON array like `["Monday","Tuesday","Wednesday"]`. If empty/null, the pattern applies to all days.

Click **Save**

#### Column 6: Override Publish Status
| Setting | Value |
|---------|-------|
| Display name | `Override Publish Status` |
| Name (schema) | `cp365_sp_overridepublishstatus` |
| Data type | `Yes/No` |
| Required | `Optional` |
| Default value | `No` |
| Description | `If Yes, this assignment uses its own Publish Status instead of the pattern template's default. Allows individual staff to have different publish settings even when using the same pattern` |

Click **Save**

#### Column 7: Publish Status
| Setting | Value |
|---------|-------|
| Display name | `Publish Status` |
| Name (schema) | `cp365_sp_publishstatus` |
| Data type | `Choice` → `Choice` |
| Required | `Optional` |
| Sync with global choice | `No` (create new) |
| Description | `Only used when Override Publish Status is Yes. Determines whether shifts generated for this specific assignment are Published (visible to staff) or Unpublished (draft mode)` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| Published | `1001` |
| Unpublished | `1009` |

Click **Save**

#### Column 8: Last Generated Date
| Setting | Value |
|---------|-------|
| Display name | `Last Generated Date` |
| Name (schema) | `cp365_sp_lastgenerateddate` |
| Data type | `Date and time` |
| Format | `Date only` |
| Required | `Optional` |
| Description | `System-updated field showing the last date through which shifts have been generated. Used by the generation process to know where to continue from. Prevents duplicate shift creation` |

Click **Save**

#### Column 9: Assignment Status
| Setting | Value |
|---------|-------|
| Display name | `Assignment Status` |
| Name (schema) | `cp365_sp_assignmentstatus` |
| Data type | `Choice` → `Choice` |
| Required | `Required` |
| Sync with global choice | `No` (create new) |
| Description | `Current state of the assignment. Active = generating shifts. Ended = past end date or manually terminated. Superseded = replaced by a newer assignment with higher priority` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| Active | `1` |
| Ended | `2` |
| Superseded | `3` |

Set **Default value** to `Active`

Click **Save**

### Step 3: Add Lookup Columns

#### Lookup 1: Staff Member (REQUIRED)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Staff Member` |
| Name (schema) | `cp365_staffmember` |
| Data type | `Lookup` → `Lookup` |
| Required | `Required` |
| Related table | `Staff Member` (the existing cp365_staffmember table) |
| Description | `The employee this pattern is assigned to. Links to the main Staff Member table. A staff member can have multiple pattern assignments for different time periods or day combinations` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Restrict` (cannot delete a staff member who has pattern assignments)

4. Click **Save**

#### Lookup 2: Pattern Template (REQUIRED)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Pattern Template` |
| Name (schema) | `cp365_shiftpatterntemplate` |
| Data type | `Lookup` → `Lookup` |
| Required | `Required` |
| Related table | `Shift Pattern Template new` |
| Description | `The shift pattern template this assignment uses. Defines the rotation cycle, working days, and shift times that will be applied to generate shifts for the staff member` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Restrict` (cannot delete a pattern that has active assignments)

4. Click **Save**

### Step 4: Verify Your Table

Your `cp365_staffpatternassignment` table should now have:
- ✅ cp365_name (Primary column)
- ✅ cp365_sp_startdate
- ✅ cp365_sp_enddate
- ✅ cp365_sp_rotationstartweek
- ✅ cp365_sp_priority
- ✅ cp365_sp_appliestodays
- ✅ cp365_sp_overridepublishstatus
- ✅ cp365_sp_publishstatus
- ✅ cp365_sp_lastgenerateddate
- ✅ cp365_sp_assignmentstatus
- ✅ cp365_staffmember (Lookup)
- ✅ cp365_shiftpatterntemplate (Lookup)

---

## Table 4: Shift Generation Log

This table tracks when shifts are generated from patterns for auditing purposes.

### Step 1: Create the Table

1. In your solution, click **+ New** → **Table**
2. Enter:

| Field | Value |
|-------|-------|
| Display name | `Shift Generation Log` |
| Plural name | `Shift Generation Logs` |
| Name (schema) | `cp365_shiftgenerationlog` |
| Primary column display name | `Log Name` |
| Primary column name (schema) | `cp365_name` |
| Description | `Audit trail for pattern-based shift generation operations` |

3. Click **Save**

### Step 2: Add Columns

#### Column 1: Generation Date
| Setting | Value |
|---------|-------|
| Display name | `Generation Date` |
| Name (schema) | `cp365_sp_generationdate` |
| Data type | `Date and time` |
| Required | `Required` |
| Description | `Timestamp when this shift generation operation was executed. Used for audit trail and troubleshooting. Includes both date and time for precise tracking` |

Click **Save**

#### Column 2: Period Start
| Setting | Value |
|---------|-------|
| Display name | `Period Start` |
| Name (schema) | `cp365_sp_periodstart` |
| Data type | `Date and time` |
| Format | `Date only` |
| Required | `Required` |
| Description | `First date of the period for which shifts were generated in this operation. Combined with Period End, defines the date range of shifts created` |

Click **Save**

#### Column 3: Period End
| Setting | Value |
|---------|-------|
| Display name | `Period End` |
| Name (schema) | `cp365_sp_periodend` |
| Data type | `Date and time` |
| Format | `Date only` |
| Required | `Required` |
| Description | `Last date of the period for which shifts were generated. The generation window (1, 2, or 4 weeks ahead) determines how far into the future this extends` |

Click **Save**

#### Column 4: Shifts Generated
| Setting | Value |
|---------|-------|
| Display name | `Shifts Generated` |
| Name (schema) | `cp365_sp_shiftsgenerated` |
| Data type | `Number` → `Whole number` |
| Required | `Required` |
| Default value | `0` |
| Description | `Total count of shift records successfully created during this generation operation. Does not include rest days or days that were skipped due to conflicts` |

Click **Save**

#### Column 5: Conflicts Detected
| Setting | Value |
|---------|-------|
| Display name | `Conflicts Detected` |
| Name (schema) | `cp365_sp_conflictsdetected` |
| Data type | `Number` → `Whole number` |
| Required | `Required` |
| Default value | `0` |
| Description | `Number of potential shifts that could not be created due to conflicts (existing shifts, approved leave, or overlapping patterns). Details stored in Conflict Details field` |

Click **Save**

#### Column 6: Conflict Details
| Setting | Value |
|---------|-------|
| Display name | `Conflict Details` |
| Name (schema) | `cp365_sp_conflictdetails` |
| Data type | `Text` → `Multiple lines of text` |
| Required | `Optional` |
| Description | `JSON array containing detailed information about each conflict: date, conflict type (ExistingShift/ApprovedLeave/PatternOverlap), and details. Used for troubleshooting and manager review` |

> **Note:** This field stores JSON data with details about any conflicts found during generation.

Click **Save**

#### Column 7: Generation Type
| Setting | Value |
|---------|-------|
| Display name | `Generation Type` |
| Name (schema) | `cp365_sp_generationtype` |
| Data type | `Choice` → `Choice` |
| Required | `Required` |
| Sync with global choice | `No` (create new) |
| Description | `How the generation was triggered. Manual = user clicked generate button. Scheduled = automated via Power Automate flow. On Demand = API call from external system or app` |

**Choice Values to Add:**
| Label | Value |
|-------|-------|
| Manual | `1` |
| Scheduled | `2` |
| On Demand | `3` |

Click **Save**

### Step 3: Add Lookup Columns

#### Lookup 1: Pattern Assignment (REQUIRED)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Pattern Assignment` |
| Name (schema) | `cp365_staffpatternassignment` |
| Data type | `Lookup` → `Lookup` |
| Required | `Required` |
| Related table | `Staff Pattern Assignment` |
| Description | `The staff pattern assignment that triggered this generation operation. Links the log entry to a specific staff member's pattern for tracking and reporting purposes` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Cascade` (delete logs when assignment is deleted)

4. Click **Save**

#### Lookup 2: Generated By (OPTIONAL)

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Generated By` |
| Name (schema) | `cp365_sp_generatedby` |
| Data type | `Lookup` → `Lookup` |
| Required | `Optional` |
| Related table | `User` (system table) |
| Description | `The Dataverse user who initiated this generation (for manual/on-demand). For scheduled generations via Power Automate, this may be the flow owner or service account` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Remove Link`

4. Click **Save**

### Step 4: Verify Your Table

Your `cp365_shiftgenerationlog` table should now have:
- ✅ cp365_name (Primary column)
- ✅ cp365_sp_generationdate
- ✅ cp365_sp_periodstart
- ✅ cp365_sp_periodend
- ✅ cp365_sp_shiftsgenerated
- ✅ cp365_sp_conflictsdetected
- ✅ cp365_sp_conflictdetails
- ✅ cp365_sp_generationtype
- ✅ cp365_staffpatternassignment (Lookup)
- ✅ cp365_sp_generatedby (Lookup)

---

## Modify Existing Table: cp365_shift

Add new columns to the existing Shifts table to track pattern-generated shifts.

### Step 1: Open the Existing Table

1. In your solution, find and click on `cp365_shift` (Shifts table)
2. Click on **Columns** in the left panel

### Step 2: Add New Columns

#### Column 1: Is Generated from Pattern
| Setting | Value |
|---------|-------|
| Display name | `Is Generated from Pattern` |
| Name (schema) | `cp365_sp_isgeneratedfrompattern` |
| Data type | `Yes/No` |
| Required | `Optional` |
| Default value | `No` |
| Description | `Yes if this shift was automatically created from a pattern template. No for manually created shifts. Used to distinguish pattern-generated shifts in reports and to track pattern coverage` |

Click **Save**

#### Column 2: Pattern Week
| Setting | Value |
|---------|-------|
| Display name | `Pattern Week` |
| Name (schema) | `cp365_sp_patternweek` |
| Data type | `Number` → `Whole number` |
| Required | `Optional` |
| Description | `Which week of the rotation cycle this shift corresponds to (1-8). Allows tracking of where in the rotation each shift falls. Only populated for pattern-generated shifts` |

Click **Save**

#### Column 3: Pattern Day of Week
| Setting | Value |
|---------|-------|
| Display name | `Pattern Day of Week` |
| Name (schema) | `cp365_sp_patterndayofweek` |
| Data type | `Number` → `Whole number` |
| Required | `Optional` |
| Description | `Day of week from the pattern definition (1=Monday to 7=Sunday). Combined with Pattern Week, identifies exactly which pattern day was used to generate this shift` |

Click **Save**

### Step 3: Add Lookup Column

#### Lookup: Staff Pattern Assignment

1. Click **+ New column**
2. Enter:

| Setting | Value |
|---------|-------|
| Display name | `Staff Pattern Assignment` |
| Name (schema) | `cp365_staffpatternassignment` |
| Data type | `Lookup` → `Lookup` |
| Required | `Optional` |
| Related table | `Staff Pattern Assignment` |
| Description | `Links to the pattern assignment that generated this shift. Enables tracing shifts back to their source pattern. Null for manually created shifts` |

3. Click **Advanced options** and set:
   - **Delete** behaviour: `Remove Link` (keep the shift but clear the pattern reference if assignment is deleted)

4. Click **Save**

---

## Final Steps

### 1. Publish Your Changes

After creating all tables and columns:

1. Go back to your **Solution** view
2. Click **Publish all customizations** at the top
3. Wait for the publish to complete (may take a few minutes)

### 2. Verify Relationships

To verify the relationships were created correctly:

1. Open each table
2. Click **Relationships** in the left panel
3. Verify you see the expected relationships listed

### 3. Test the Tables

Create a few test records to verify everything works:

1. Create a test `Shift Pattern Template new`
2. Create a few `Shift Pattern Day` records linked to that template
3. Create a `Staff Pattern Assignment` linking a staff member to the template
4. Verify lookups work correctly

---

## Troubleshooting

### "Column already exists" Error
- Check if the column was already created
- Verify you're using the exact schema name specified

### "Related table not found" Error
- Make sure you created the tables in the correct order (Template first, then Day, then Assignment)
- Try refreshing the page

### Lookup Not Showing Related Table
- The related table might not be published yet
- Click "Publish all customizations" and try again

### Delete Behaviour Not Available
- Make sure you clicked "Advanced options" when creating the lookup
- Some delete behaviours may not be available for certain relationship types

---

## Summary Checklist

### Tables Created
- [ ] cp365_shiftpatterntemplatenew (9 columns)
- [ ] cp365_shiftpatternday (12 columns including 3 lookups)
- [ ] cp365_staffpatternassignment (12 columns including 2 lookups)
- [ ] cp365_shiftgenerationlog (10 columns including 2 lookups)

### Existing Table Modified
- [ ] cp365_shift (4 new columns including 1 lookup)

### Final Steps
- [ ] Published all customizations
- [ ] Verified relationships
- [ ] Tested with sample data

---

## Quick Reference: Column Names

### cp365_shiftpatterntemplatenew
| Display Name | Schema Name |
|--------------|-------------|
| Pattern Name | cp365_name |
| Description | cp365_sp_description |
| Rotation Cycle (Weeks) | cp365_sp_rotationcycleweeks |
| Average Weekly Hours | cp365_sp_averageweeklyhours |
| Total Rotation Hours | cp365_sp_totalrotationhours |
| Is Standard Template | cp365_sp_isstandardtemplate |
| Default Publish Status | cp365_sp_defaultpublishstatus |
| Generation Window (Weeks) | cp365_sp_generationwindowweeks |
| Pattern Status | cp365_sp_patternstatus |

### cp365_shiftpatternday
| Display Name | Schema Name |
|--------------|-------------|
| Day Name | cp365_name |
| Week Number | cp365_sp_weeknumber |
| Day of Week | cp365_sp_dayofweek |
| Start Time | cp365_sp_starttime |
| End Time | cp365_sp_endtime |
| Break Duration (Minutes) | cp365_sp_breakminutes |
| Is Rest Day | cp365_sp_isrestday |
| Is Overnight Shift | cp365_sp_isovernight |
| Display Order | cp365_sp_displayorder |
| Pattern Template | cp365_shiftpatterntemplate |
| Shift Reference | cp365_shiftreference |
| Shift Activity | cp365_shiftactivity |

### cp365_staffpatternassignment
| Display Name | Schema Name |
|--------------|-------------|
| Assignment Name | cp365_name |
| Start Date | cp365_sp_startdate |
| End Date | cp365_sp_enddate |
| Rotation Start Week | cp365_sp_rotationstartweek |
| Priority | cp365_sp_priority |
| Applies to Days | cp365_sp_appliestodays |
| Override Publish Status | cp365_sp_overridepublishstatus |
| Publish Status | cp365_sp_publishstatus |
| Last Generated Date | cp365_sp_lastgenerateddate |
| Assignment Status | cp365_sp_assignmentstatus |
| Staff Member | cp365_staffmember |
| Pattern Template | cp365_shiftpatterntemplate |

### cp365_shiftgenerationlog
| Display Name | Schema Name |
|--------------|-------------|
| Log Name | cp365_name |
| Generation Date | cp365_sp_generationdate |
| Period Start | cp365_sp_periodstart |
| Period End | cp365_sp_periodend |
| Shifts Generated | cp365_sp_shiftsgenerated |
| Conflicts Detected | cp365_sp_conflictsdetected |
| Conflict Details | cp365_sp_conflictdetails |
| Generation Type | cp365_sp_generationtype |
| Pattern Assignment | cp365_staffpatternassignment |
| Generated By | cp365_sp_generatedby |

### cp365_shift (New Columns Only)
| Display Name | Schema Name |
|--------------|-------------|
| Is Generated from Pattern | cp365_sp_isgeneratedfrompattern |
| Pattern Week | cp365_sp_patternweek |
| Pattern Day of Week | cp365_sp_patterndayofweek |
| Staff Pattern Assignment | cp365_staffpatternassignment |

---

## Questions?

If you encounter any issues or have questions, please reach out before proceeding to the next step. It's easier to fix issues early than after data has been created.

**Document Version:** 1.2  
**Last Updated:** December 2025  
**Changes:**
- v1.1: Added `sp_` prefix to all custom columns for feature identification
- v1.2: Added descriptions to all columns; clarified that time fields use DateTime with dummy date (no "Time only" in Dataverse)
