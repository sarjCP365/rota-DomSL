# Shift Patterns Feature - Build Prompts for Cursor AI

## CarePoint 365 Rota Management Application
## Version: 1.1 | December 2025

---

## Document Purpose

This document contains structured prompts for Cursor AI to build the Shift Patterns feature in the CarePoint 365 Rota application. Each section represents a logical build step that should be completed before moving to the next.

**Important Context:**
- This is a React + TypeScript application using Vite
- State management: Zustand stores + React Query for server state
- Styling: Tailwind CSS following the CAREPOINT-DESIGN-SYSTEM.md
- API: Dataverse REST API via custom client in `src/api/dataverse/client.ts`
- The application follows UK English spelling conventions

---

## Naming Convention

All Dataverse columns for this feature use the prefix `cp365_sp_` where:
- `cp365_` is the solution prefix
- `sp_` identifies this as a **S**hift **P**attern column

**Exceptions:**
- Primary columns use `cp365_name` (Dataverse convention)
- Lookup columns use the related table name (e.g., `cp365_staffmember`, `cp365_shiftpatterntemplate`)

---

## Pre-Build Checklist

Before starting any build prompts, verify:

- [ ] Dataverse tables have been created (see SHIFT-PATTERNS-DATAVERSE-SETUP.md)
- [ ] Tables are published and accessible via API
- [ ] You have access to shift reference values (`cp365_shiftreference`)
- [ ] You have access to shift activity values (`cp365_shiftactivity`)
- [ ] The existing `cp365_shift` table has been modified with new columns

---

## Project Context Summary

### Key Decisions Made

1. **Prefix:** All new tables use `cp365_` prefix, columns use `cp365_sp_` prefix
2. **Multiple Patterns:** Staff can have multiple pattern assignments with priority-based resolution
3. **Generation Window:** Shifts generated 1, 2, or 4 weeks in advance (user selectable)
4. **Publish Status:** User chooses if generated shifts are published or unpublished
5. **Existing Shifts:** Manually created shifts are preserved; clash warnings shown
6. **Leave Integration:** Immediate integration with existing leave system
7. **Agency Coverage:** In scope for coverage analysis
8. **Shift Swaps/Offers:** Deferred to Phase 3 (not in initial release)
9. **Reporting:** Not required in initial release

### Relevant Existing Files

```
src/
├── api/dataverse/
│   ├── client.ts           # Dataverse API client
│   ├── types.ts            # TypeScript interfaces
│   ├── shifts.ts           # Shift-related API calls
│   └── units.ts            # Location/team/staff queries
├── hooks/
│   ├── useShifts.ts        # Shift React Query hooks
│   └── useRotaData.ts      # Rota data fetching
├── components/
│   └── rota/               # Existing rota components
├── pages/
│   ├── RotaView.tsx        # Weekly/monthly rota view
│   └── DailyView.tsx       # Daily view
└── store/
    └── settingsStore.ts    # Zustand stores
```

### Design System Reference

Follow `CAREPOINT-DESIGN-SYSTEM.md` for:
- Colour palette (emerald primary, slate neutrals)
- Typography (Inter font)
- Component patterns
- Status indicators
- Spacing conventions

---

# PHASE 0: FOUNDATION

## Prompt 0.1: Create TypeScript Interfaces

```
Create the TypeScript interfaces for the Shift Patterns feature.

Create a new file at: src/features/shift-patterns/types/patterns.ts

IMPORTANT: All custom columns use the `cp365_sp_` prefix (sp = shift pattern).
Lookup columns use the related table name without the sp_ prefix.

Include interfaces for:

1. ShiftPatternTemplate
```typescript
interface ShiftPatternTemplate {
  cp365_shiftpatterntemplateid: string;
  cp365_name: string;
  cp365_sp_description?: string;
  cp365_sp_rotationcycleweeks: number;
  cp365_sp_averageweeklyhours?: number;
  cp365_sp_totalrotationhours?: number;
  cp365_sp_isstandardtemplate: boolean;
  cp365_sp_defaultpublishstatus: PatternPublishStatus;
  cp365_sp_generationwindowweeks: GenerationWindow;
  cp365_sp_patternstatus: PatternStatus;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
  
  // Navigation properties (when expanded)
  cp365_shiftpatterntemplate_days?: ShiftPatternDay[];
}
```

2. ShiftPatternDay
```typescript
interface ShiftPatternDay {
  cp365_shiftpatterndayid: string;
  cp365_name: string;
  _cp365_shiftpatterntemplate_value: string;
  cp365_sp_weeknumber: number;
  cp365_sp_dayofweek: DayOfWeek;
  _cp365_shiftreference_value?: string;
  cp365_sp_starttime?: string;  // DateTime with dummy date (e.g., 1900-01-01T07:00:00) - extract time only
  cp365_sp_endtime?: string;    // DateTime with dummy date (e.g., 1900-01-01T15:00:00) - extract time only
  cp365_sp_breakminutes?: number;
  cp365_sp_isrestday: boolean;
  cp365_sp_isovernight: boolean;
  _cp365_shiftactivity_value?: string;
  cp365_sp_displayorder?: number;
  
  // Expanded lookups
  cp365_ShiftPatternTemplate?: ShiftPatternTemplate;
  cp365_ShiftReference?: ShiftReference;
  cp365_ShiftActivity?: ShiftActivity;
}
```

> **Note:** Dataverse doesn't have a "Time only" data type. The `cp365_sp_starttime` and `cp365_sp_endtime` fields store DateTime values with a fixed dummy date (e.g., `1900-01-01`). When displaying or using these values, extract only the time portion. When generating actual shifts, combine the time with the real shift date.

3. StaffPatternAssignment
```typescript
interface StaffPatternAssignment {
  cp365_staffpatternassignmentid: string;
  cp365_name: string;
  _cp365_staffmember_value: string;
  _cp365_shiftpatterntemplate_value: string;
  cp365_sp_startdate: string;
  cp365_sp_enddate?: string;
  cp365_sp_rotationstartweek: number;
  cp365_sp_priority: number;
  cp365_sp_appliestodays?: string; // JSON array
  cp365_sp_overridepublishstatus?: boolean;
  cp365_sp_publishstatus?: PatternPublishStatus;
  cp365_sp_lastgenerateddate?: string;
  cp365_sp_assignmentstatus: AssignmentStatus;
  statecode: number;
  statuscode: number;
  
  // Expanded lookups
  cp365_StaffMember?: StaffMember;
  cp365_ShiftPatternTemplate?: ShiftPatternTemplate;
}
```

4. ShiftGenerationLog
```typescript
interface ShiftGenerationLog {
  cp365_shiftgenerationlogid: string;
  cp365_name: string;
  _cp365_staffpatternassignment_value: string;
  cp365_sp_generationdate: string;
  cp365_sp_periodstart: string;
  cp365_sp_periodend: string;
  cp365_sp_shiftsgenerated: number;
  cp365_sp_conflictsdetected: number;
  cp365_sp_conflictdetails?: string; // JSON
  cp365_sp_generationtype: GenerationType;
  _cp365_sp_generatedby_value?: string;
}
```

5. All related enums:
```typescript
enum PatternPublishStatus {
  Published = 1001,
  Unpublished = 1009,
}

enum GenerationWindow {
  OneWeek = 1,
  TwoWeeks = 2,
  FourWeeks = 4,
}

enum PatternStatus {
  Active = 1,
  Inactive = 2,
  Archived = 3,
}

enum AssignmentStatus {
  Active = 1,
  Ended = 2,
  Superseded = 3,
}

enum DayOfWeek {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7,
}

enum GenerationType {
  Manual = 1,
  Scheduled = 2,
  OnDemand = 3,
}
```

6. Form data types for UI (PatternFormData, PatternDayFormData, AssignmentFormData)
7. Helper types (PatternConflict, GenerationResult, CoverageGap)

Match the field naming conventions used in existing types (src/api/dataverse/types.ts).
```

---

## Prompt 0.2: Create API Functions

```
Create the API functions for Shift Pattern CRUD operations.

Create files:
1. src/features/shift-patterns/api/patternTemplates.ts
2. src/features/shift-patterns/api/patternDays.ts
3. src/features/shift-patterns/api/patternAssignments.ts
4. src/features/shift-patterns/api/patternGeneration.ts

IMPORTANT: Use the correct column names with cp365_sp_ prefix:
- cp365_sp_description (not cp365_description)
- cp365_sp_rotationcycleweeks (not cp365_rotationcycleweeks)
- etc.

For patternTemplates.ts, include:
- fetchPatternTemplates(filters?) - Get all templates with optional filters
- fetchPatternTemplateById(id) - Get single template with expanded days
- createPatternTemplate(data) - Create new template
- updatePatternTemplate(id, data) - Update existing template
- deletePatternTemplate(id) - Delete template (with validation)
- clonePatternTemplate(id, newName) - Clone existing template

Example query for fetching templates:
```typescript
const templates = await client.get<ShiftPatternTemplate>('cp365_shiftpatterntemplates', {
  filter: `cp365_sp_patternstatus eq 1`, // Active only
  select: [
    'cp365_shiftpatterntemplateid',
    'cp365_name',
    'cp365_sp_description',
    'cp365_sp_rotationcycleweeks',
    'cp365_sp_averageweeklyhours',
    'cp365_sp_isstandardtemplate',
    'cp365_sp_defaultpublishstatus',
    'cp365_sp_generationwindowweeks',
    'cp365_sp_patternstatus',
  ],
  orderby: 'cp365_name asc',
});
```

For patternDays.ts, include:
- fetchPatternDays(templateId) - Get all days for a template
- createPatternDay(data) - Create single day
- updatePatternDay(id, data) - Update day
- deletePatternDay(id) - Delete day
- bulkCreatePatternDays(templateId, days[]) - Create multiple days at once
- bulkUpdatePatternDays(days[]) - Update multiple days

For patternAssignments.ts, include:
- fetchStaffAssignments(staffId) - Get all assignments for a staff member
- fetchAssignmentsByPattern(patternId) - Get all staff assigned to pattern
- createPatternAssignment(data) - Assign pattern to staff
- updatePatternAssignment(id, data) - Update assignment
- endPatternAssignment(id, endDate) - End an assignment
- getActivePatternForDate(staffId, date) - Get applicable pattern for specific date
- bulkAssignPattern(patternId, staffIds[], options) - Assign to multiple staff

For patternGeneration.ts, include:
- generateShiftsFromPattern(assignmentId, startDate, endDate) - Generate shifts
- detectConflicts(assignmentId, startDate, endDate) - Check for conflicts
- getGenerationLogs(assignmentId) - Get generation history

Use the existing DataverseClient from src/api/dataverse/client.ts.
Follow the patterns established in src/api/dataverse/shifts.ts.
Include proper error handling and console logging for debugging.
```

---

## Prompt 0.3: Create React Query Hooks

```
Create React Query hooks for the Shift Patterns feature.

Create files:
1. src/features/shift-patterns/hooks/usePatternTemplates.ts
2. src/features/shift-patterns/hooks/usePatternAssignments.ts
3. src/features/shift-patterns/hooks/usePatternGeneration.ts

For usePatternTemplates.ts, include:
- usePatternTemplates(filters?) - Query all templates
- usePatternTemplate(id) - Query single template with days
- useCreatePatternTemplate() - Mutation for creating
- useUpdatePatternTemplate() - Mutation for updating
- useDeletePatternTemplate() - Mutation for deleting
- useClonePatternTemplate() - Mutation for cloning

Query key examples:
```typescript
// List all templates
queryKey: ['patternTemplates', filters]

// Single template with days
queryKey: ['patternTemplate', id]

// Staff assignments
queryKey: ['staffPatternAssignments', staffId]
```

For usePatternAssignments.ts, include:
- useStaffPatternAssignments(staffId) - Query staff's assignments
- usePatternAssignments(patternId) - Query pattern's assignments
- useCreatePatternAssignment() - Mutation for assigning
- useUpdatePatternAssignment() - Mutation for updating
- useEndPatternAssignment() - Mutation for ending
- useBulkAssignPattern() - Mutation for bulk assignment

For usePatternGeneration.ts, include:
- useGenerateShifts() - Mutation for generating shifts
- useDetectConflicts(assignmentId, startDate, endDate) - Query conflicts
- useGenerationLogs(assignmentId) - Query generation history

Use react-query patterns from existing hooks (src/hooks/useShifts.ts).
Include proper query key management for cache invalidation.
Add staleTime and cacheTime appropriate for each query type.

Invalidation rules:
- After creating/updating template: invalidate ['patternTemplates'] and ['patternTemplate', id]
- After creating assignment: invalidate ['staffPatternAssignments', staffId] and ['patternAssignments', patternId]
- After generating shifts: invalidate ['shifts'] and ['rotaData']
```

---

## Prompt 0.4: Create Folder Structure and Routing

```
Set up the folder structure and add routing for the Shift Patterns feature.

1. Create the folder structure:
   src/features/shift-patterns/
   ├── api/
   ├── hooks/
   ├── components/
   │   ├── PatternBuilder/
   │   ├── PatternLibrary/
   │   ├── PatternAssignment/
   │   ├── PatternDisplay/
   │   └── CoverageAnalysis/
   ├── utils/
   ├── types/
   └── pages/

2. Create placeholder page components:
   - src/features/shift-patterns/pages/PatternLibraryPage.tsx
   - src/features/shift-patterns/pages/PatternBuilderPage.tsx
   - src/features/shift-patterns/pages/PatternAssignmentPage.tsx

3. Add routes to the application router (likely in src/App.tsx or src/router.tsx):
   - /patterns - Pattern Library
   - /patterns/new - Create new pattern
   - /patterns/:id - Edit existing pattern
   - /patterns/assign - Bulk assignment wizard

4. Add navigation item to sidebar/header for "Shift Patterns"
   - Icon suggestion: CalendarClock or CalendarRange from lucide-react
   - Position: After "Rota" in the navigation order

Each placeholder page should have a basic layout with:
- Page header matching the design system (emerald gradient)
- Breadcrumb navigation
- Empty state message indicating feature is under construction
```

---

# PHASE 1A: PATTERN TEMPLATE BUILDER

## Prompt 1A.1: Pattern Library Page

```
Build the Pattern Library page that displays all shift pattern templates.

File: src/features/shift-patterns/pages/PatternLibraryPage.tsx

Requirements:

1. PAGE HEADER:
   - Title: "Shift Patterns"
   - Subtitle: "Manage reusable shift pattern templates"
   - "Create New Pattern" button (primary, emerald)
   - Uses the emerald gradient header style from DailyView

2. FILTER BAR:
   - Search input (searches pattern name and description)
   - Status filter dropdown (Active, Inactive, Archived, All)
   - Type filter dropdown (Standard, Custom, All)
   - Sort dropdown (Name A-Z, Name Z-A, Recently Created, Most Used)

3. PATTERN GRID:
   - Responsive grid of PatternCard components
   - 3 columns on desktop, 2 on tablet, 1 on mobile
   - Empty state when no patterns exist with call-to-action

4. PATTERN CARD (create as separate component):
   File: src/features/shift-patterns/components/PatternLibrary/PatternCard.tsx
   
   - Pattern name (bold, from cp365_name)
   - Description (truncated, 2 lines, from cp365_sp_description)
   - Rotation cycle badge (e.g., "2-Week Rotation", from cp365_sp_rotationcycleweeks)
   - Average weekly hours (from cp365_sp_averageweeklyhours)
   - Status badge (Active/Inactive/Archived, from cp365_sp_patternstatus)
   - "Standard" badge if cp365_sp_isstandardtemplate is true
   - Staff assigned count (query from assignments)
   - Actions: Edit, Clone, Delete (in dropdown menu)
   - Click card to navigate to edit page

5. LOADING STATE:
   - Skeleton cards matching the PatternCard layout

6. ERROR STATE:
   - Error message with retry button

Use the design system colours:
- Cards: white background with slate-200 border
- Badges: use status colours from design system
- Hover: subtle elevation effect

Connect to usePatternTemplates() hook for data fetching.
```

---

## Prompt 1A.2: Pattern Builder - Main Container

```
Build the main Pattern Builder page/container component.

File: src/features/shift-patterns/pages/PatternBuilderPage.tsx

Requirements:

1. MODES:
   - Create mode: /patterns/new
   - Edit mode: /patterns/:id
   - Detect mode from URL params

2. DATA LOADING (Edit mode):
   - Fetch pattern template with expanded days using usePatternTemplate(id)
   - Show loading skeleton while fetching
   - Handle "not found" error

3. FORM STATE:
   - Use react-hook-form with zod validation
   - Form fields mapping to Dataverse columns:
     - name → cp365_name (required, max 100 chars)
     - description → cp365_sp_description (optional)
     - rotationCycleWeeks → cp365_sp_rotationcycleweeks (required, 1-8)
     - defaultPublishStatus → cp365_sp_defaultpublishstatus (required)
     - generationWindowWeeks → cp365_sp_generationwindowweeks (required, 1/2/4)
     - days[] → array of pattern day configurations

4. PAGE LAYOUT:
   - Header with back button, title, Save/Cancel buttons
   - Two-column layout on desktop:
     - Left (60%): PatternHeader + RotationWeekGrid
     - Right (40%): PatternSummary + PatternValidation
   - Single column on mobile

5. AUTOSAVE:
   - Debounced autosave (2 seconds after last change)
   - "Unsaved changes" indicator
   - Prompt before leaving with unsaved changes

6. SAVE BEHAVIOUR:
   - Create mode: Create template, then create all days, then navigate to library
   - Edit mode: Update template and days, show success toast

7. SUB-COMPONENTS TO RENDER:
   - PatternHeader (name, description, settings)
   - RotationWeekTabs (Week 1, Week 2, etc.)
   - WeekGrid (Mon-Sun grid for selected week)
   - PatternSummary (hours totals)
   - PatternValidation (warnings/errors)
```

---

## Prompt 1A.3: Pattern Builder - Week Grid Component

```
Build the WeekGrid component for the pattern builder.

File: src/features/shift-patterns/components/PatternBuilder/WeekGrid.tsx

This is the core visual component where users define shifts for each day.

Requirements:

1. LAYOUT:
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ Week 1 of 2                                    Total: 42h 30m   │
   ├─────────────────────────────────────────────────────────────────┤
   │  Mon    │   Tue   │   Wed   │   Thu   │   Fri   │   Sat   │ Sun │
   ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────┤
   │ ░░░░░░░ │ ░░░░░░░ │ ░░░░░░░ │ ░░░░░░░ │   REST  │   REST  │░░░░░│
   │  Early  │  Early  │  Late   │  Night  │         │         │ Long│
   │ 07:00-  │ 07:00-  │ 14:00-  │ 20:00-  │         │         │08:00│
   │  15:00  │  15:00  │  22:00  │  08:00  │         │         │20:00│
   │  8h     │  8h     │  8h     │  12h    │         │         │ 12h │
   └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────┘
   ```

2. DAY CELL STATES:
   - Working day: Coloured background, shift details shown
   - Rest day: Grey background, "REST" text (cp365_sp_isrestday = true)
   - Empty: Dashed border, "+ Add Shift" text

3. DAY CELL CONTENT (working day):
   - Shift reference name (from expanded cp365_ShiftReference)
   - Start time - End time (cp365_sp_starttime, cp365_sp_endtime)
   - Duration (calculated from times minus cp365_sp_breakminutes)
   - Overnight indicator if cp365_sp_isovernight = true
   - Break duration if cp365_sp_breakminutes > 0

4. INTERACTIONS:
   - Click day cell to open ShiftEditor modal/popover
   - Right-click for context menu (Copy, Paste, Clear, Set as Rest Day)
   - Drag to copy shift to adjacent days (optional, can defer)

5. COLOUR CODING:
   - Day shifts (06:00-18:00 start): Yellow/amber background
   - Evening shifts (18:00-22:00 start): Blue background
   - Night shifts (22:00-06:00 start): Purple background
   - Rest days: Grey background

6. VALIDATION INDICATORS:
   - Red border if rest period violation (< 11 hours from previous shift)
   - Warning icon if potential issue

7. COPY WEEK FUNCTIONALITY:
   - "Copy Week" button in header
   - Copies all days from this week to another week
   - Dropdown to select target week

Props:
- weekNumber: number
- days: PatternDayFormData[]
- rotationCycleWeeks: number
- onDayChange: (dayIndex: number, data: PatternDayFormData) => void
- onCopyWeek: (targetWeek: number) => void
```

---

## Prompt 1A.4: Pattern Builder - Shift Editor Component

```
Build the ShiftEditor component for editing individual day shifts.

File: src/features/shift-patterns/components/PatternBuilder/ShiftEditor.tsx

This is a popover/modal that appears when clicking a day cell.

Requirements:

1. DISPLAY MODE:
   - Popover anchored to the clicked day cell
   - Or slide-in panel on mobile

2. FORM FIELDS (mapping to Dataverse columns):
   - Is Rest Day toggle → cp365_sp_isrestday (at top, collapses other fields when on)
   - Shift Reference dropdown → cp365_shiftreference (lookup)
   - Start Time picker → cp365_sp_starttime (display HH:mm, store as DateTime with dummy date 1900-01-01)
   - End Time picker → cp365_sp_endtime (display HH:mm, store as DateTime with dummy date 1900-01-01)
   - Break Duration input → cp365_sp_breakminutes (minutes)
   - Shift Activity dropdown → cp365_shiftactivity (lookup)
   - Is Overnight toggle → cp365_sp_isovernight

3. QUICK PRESETS:
   - Row of buttons for common shift times:
     - "Early" (07:00-15:00)
     - "Late" (14:00-22:00)
     - "Night" (22:00-08:00, overnight=true)
     - "Long Day" (08:00-20:00)
   - Clicking preset fills in the times automatically

4. CALCULATED DISPLAY:
   - Show calculated shift duration (e.g., "8h 00m")
   - Update in real-time as times change
   - Show warning if duration seems unusual (< 4h or > 14h)

5. VALIDATION:
   - End time must be after start time (or overnight flag must be set)
   - Break duration cannot exceed shift duration
   - Show validation errors inline

6. ACTIONS:
   - Apply button (saves and closes)
   - Cancel button (discards changes)
   - Clear button (removes shift from this day)

7. KEYBOARD SUPPORT:
   - Tab through fields
   - Enter to apply
   - Escape to cancel

Props:
- dayData: PatternDayFormData
- weekNumber: number
- dayOfWeek: DayOfWeek
- shiftReferences: ShiftReference[]
- shiftActivities: ShiftActivity[]
- onSave: (data: PatternDayFormData) => void
- onClose: () => void
- anchorElement: HTMLElement (for popover positioning)
```

---

## Prompt 1A.5: Pattern Builder - Summary and Validation

```
Build the PatternSummary and PatternValidation components.

Files:
- src/features/shift-patterns/components/PatternBuilder/PatternSummary.tsx
- src/features/shift-patterns/components/PatternBuilder/PatternValidation.tsx

PATTERN SUMMARY:

1. HOURS BREAKDOWN:
   - Total hours per rotation cycle (sum all cp365_sp_starttime to cp365_sp_endtime minus cp365_sp_breakminutes)
   - Average weekly hours (total / cp365_sp_rotationcycleweeks)
   - Hours per week (listed for each week)

2. SHIFT STATISTICS:
   - Total working days in rotation (days where cp365_sp_isrestday = false)
   - Total rest days in rotation (days where cp365_sp_isrestday = true)
   - Shift type breakdown (Day/Evening/Night counts based on start times)

3. VISUAL INDICATORS:
   - Progress bar showing hours vs standard full-time (37.5h)
   - Green if within normal range
   - Amber if under (< 30h) or over (> 45h)
   - Red if significantly over (> 48h WTD limit)

4. DISPLAY FORMAT:
   ```
   ┌─────────────────────────────┐
   │ Pattern Summary             │
   ├─────────────────────────────┤
   │ Total Rotation Hours  84h   │
   │ Average Weekly Hours  42h   │
   │ ████████████████░░░░  112%  │
   ├─────────────────────────────┤
   │ Working Days          10    │
   │ Rest Days              4    │
   ├─────────────────────────────┤
   │ Day Shifts             6    │
   │ Night Shifts           4    │
   └─────────────────────────────┘
   ```

PATTERN VALIDATION:

1. VALIDATION RULES:
   - ✓ At least one working day defined
   - ✓ All working days have start and end times (cp365_sp_starttime, cp365_sp_endtime)
   - ⚠ Rest period warnings (< 11 hours between shifts)
   - ⚠ Consecutive working days warnings (> 6 days)
   - ⚠ Weekly hours exceed 48h (WTD warning)
   - ❌ Invalid time configurations

2. DISPLAY FORMAT:
   - List of validation messages
   - Icon indicating severity (✓ green, ⚠ amber, ❌ red)
   - Expandable details for each issue
   - Click to navigate to problematic day

3. REAL-TIME UPDATES:
   - Validate as pattern is edited
   - Debounce validation for performance

Props for PatternSummary:
- days: PatternDayFormData[]
- rotationCycleWeeks: number

Props for PatternValidation:
- days: PatternDayFormData[]
- rotationCycleWeeks: number
- onNavigateToDay?: (weekNumber: number, dayOfWeek: DayOfWeek) => void
```

---

## Prompt 1A.6: Pre-configured Standard Patterns

```
Create the standard pattern templates data and seeding functionality.

File: src/features/shift-patterns/utils/standardPatterns.ts

Create pre-configured patterns for common UK care sector schedules.
These will be created with cp365_sp_isstandardtemplate = true.

1. STANDARD DAYS (37.5 hours):
   - cp365_name: "Standard Days (Mon-Fri)"
   - cp365_sp_rotationcycleweeks: 1
   - Monday to Friday: 09:00 - 17:00, cp365_sp_breakminutes: 30
   - Saturday, Sunday: cp365_sp_isrestday: true

2. 4-ON-4-OFF DAYS (42 hours average):
   - cp365_name: "4-on-4-off Day Shifts"
   - cp365_sp_rotationcycleweeks: 2
   - Week 1: Mon-Thu working (08:00-20:00, 12h shifts, cp365_sp_breakminutes: 60)
   - Week 1: Fri-Sun rest (cp365_sp_isrestday: true)
   - Week 2: Mon-Thu rest
   - Week 2: Fri-Sun working (08:00-20:00)

3. 4-ON-4-OFF NIGHTS (42 hours average):
   - cp365_name: "4-on-4-off Night Shifts"
   - Same as above but 20:00-08:00 with cp365_sp_isovernight: true

4. 3x12 PATTERN (36 hours):
   - cp365_name: "3x12 Hour Shifts"
   - cp365_sp_rotationcycleweeks: 1
   - Mon, Tue, Wed working (08:00-20:00, cp365_sp_breakminutes: 60)
   - Thu-Sun rest

5. 2-WEEK ROTATING (37.5 hours average):
   - cp365_name: "2-Week Rotating"
   - cp365_sp_rotationcycleweeks: 2
   - Week 1: Mon, Tue, Sat, Sun working (08:00-16:00)
   - Week 2: Wed, Thu, Fri working (08:00-16:00)

6. CONTINENTAL SHIFT (42 hours average):
   - cp365_name: "Continental Rotation"
   - cp365_sp_rotationcycleweeks: 4
   - Complex day/night rotation pattern
   - 2 days, 2 nights, 4 off, repeat

Export:
- standardPatterns: Array of pattern template definitions with their days
- seedStandardPatterns(): Function to create these patterns in Dataverse
- checkStandardPatternsExist(): Function to check if already seeded

Each pattern should include:
- Template fields (cp365_name, cp365_sp_description, cp365_sp_rotationcycleweeks, etc.)
- All day definitions for the rotation (with cp365_sp_weeknumber, cp365_sp_dayofweek, times, etc.)
- cp365_sp_isstandardtemplate: true
- cp365_sp_patternstatus: PatternStatus.Active
```

---

# PHASE 1B: INDIVIDUAL ASSIGNMENT

## Prompt 1B.1: Staff Pattern Assignment Component

```
Build the component for assigning a pattern to an individual staff member.

File: src/features/shift-patterns/components/PatternAssignment/IndividualAssignment.tsx

This can be triggered from:
- Staff profile page
- "Assign" button on pattern card
- Assignment wizard

Requirements:

1. STAFF SELECTION:
   - If not pre-selected, show staff search/dropdown
   - Display selected staff info (name, job title, contracted hours from cp365_requiredhours)

2. PATTERN SELECTION:
   - Dropdown of active patterns (cp365_sp_patternstatus = Active)
   - Show pattern preview on selection (mini calendar)
   - Display pattern's cp365_sp_averageweeklyhours

3. ASSIGNMENT CONFIGURATION (mapping to Dataverse columns):
   - Start Date picker → cp365_sp_startdate (required)
   - End Date picker → cp365_sp_enddate (optional, for temporary assignments)
   - Rotation Start Week dropdown → cp365_sp_rotationstartweek (1 to rotationcycleweeks)
   - Priority input → cp365_sp_priority (default 1, for multiple pattern support)
   - Applies to Days multi-select → cp365_sp_appliestodays (optional, JSON array)

4. PUBLISH STATUS:
   - Toggle: "Use pattern default" (cp365_sp_overridepublishstatus = false)
   - Or "Override" (cp365_sp_overridepublishstatus = true)
   - If override, show Published/Unpublished dropdown → cp365_sp_publishstatus

5. CONTRACT VALIDATION:
   - Compare pattern's cp365_sp_averageweeklyhours vs staff's cp365_requiredhours
   - Show warning if mismatch (e.g., pattern is 42h but contract is 37.5h)
   - Allow proceeding with acknowledgement

6. EXISTING ASSIGNMENTS:
   - Query staff's current assignments using useStaffPatternAssignments(staffId)
   - Show list with pattern name, dates, priority
   - Warn if new assignment overlaps with existing (based on cp365_sp_startdate/cp365_sp_enddate)

7. PREVIEW:
   - Show what the next 4 weeks would look like with this pattern
   - Calendar view with pattern-generated shifts highlighted

8. ACTIONS:
   - Save Assignment button (creates cp365_staffpatternassignment record)
   - Cancel button
   - After save, option to "Generate Shifts Now" or "Generate Later"
```

---

## Prompt 1B.2: Conflict Detection Component

```
Build the conflict detection and resolution component.

File: src/features/shift-patterns/components/PatternAssignment/ConflictResolver.tsx

This component appears after assignment is saved and before shift generation.

Requirements:

1. CONFLICT DETECTION:
   - Check for existing shifts on pattern dates (query cp365_shift)
   - Check for approved leave on pattern dates (query cp365_staffabsencelog where cp365_absencestatus = 3)
   - Check for other pattern assignments (query cp365_staffpatternassignment)

2. CONFLICT DISPLAY:
   ```
   ┌──────────────────────────────────────────────────────────────────┐
   │ ⚠ 3 Conflicts Detected                                          │
   ├──────────────────────────────────────────────────────────────────┤
   │ ┌────────────────────────────────────────────────────────────┐   │
   │ │ 📅 Mon 23 Dec 2024                              [Keep ▼]   │   │
   │ │ Existing Shift: Early (07:00-15:00) - Manual Entry         │   │
   │ │ Pattern Would Create: Late (14:00-22:00)                   │   │
   │ └────────────────────────────────────────────────────────────┘   │
   │                                                                  │
   │ ┌────────────────────────────────────────────────────────────┐   │
   │ │ 📅 Tue 24 Dec 2024                              [Skip ▼]   │   │
   │ │ Approved Leave: Annual Leave                               │   │
   │ │ Pattern Would Create: Early (07:00-15:00)                  │   │
   │ └────────────────────────────────────────────────────────────┘   │
   │                                                                  │
   │ Apply to all similar: [Keep Existing ▼]  [Apply]                 │
   │                                                                  │
   │ [Cancel]                                [Generate X Shifts]       │
   └──────────────────────────────────────────────────────────────────┘
   ```

3. CONFLICT TYPES:
   - Existing Shift: Manual or from another pattern (check cp365_sp_isgeneratedfrompattern)
   - Approved Leave: Leave that's been approved (cp365_absencestatus = 3)
   - Pending Leave: Leave awaiting approval (cp365_absencestatus = 2)
   - Other Pattern: Shift from different active pattern assignment

4. RESOLUTION OPTIONS:
   - Keep Existing: Don't generate pattern shift for this date
   - Override: Delete existing and create pattern shift
   - Skip: Don't generate for this date (same as Keep for leave)

5. BULK RESOLUTION:
   - "Apply to all similar" dropdown
   - Apply same resolution to all conflicts of same type

6. SUMMARY:
   - Show count of shifts that will be generated
   - Show count of skipped dates
   - Show count of overrides

7. GENERATION:
   - On confirm, generate shifts respecting resolution choices
   - Show progress indicator
   - Log generation details to cp365_shiftgenerationlog
   - Update assignment's cp365_sp_lastgenerateddate
```

---

## Prompt 1B.3: Staff Pattern View Component

```
Build the component to display a staff member's assigned patterns.

File: src/features/shift-patterns/components/PatternDisplay/StaffPatternView.tsx

This component shows on the staff profile or as a panel on the rota view.

Requirements:

1. CURRENT PATTERNS:
   - List all active pattern assignments (cp365_sp_assignmentstatus = Active)
   - Show pattern name (from expanded cp365_ShiftPatternTemplate.cp365_name)
   - Show cp365_sp_startdate, cp365_sp_priority
   - Visual indicator showing which days each pattern covers (from cp365_sp_appliestodays)

2. PATTERN CALENDAR:
   - Combined calendar showing all patterns merged
   - Different colours for different patterns
   - Show which pattern applies to each day
   - Resolve by cp365_sp_priority (lower number = higher priority)

3. ASSIGNMENT MANAGEMENT:
   - "Add Pattern" button → opens IndividualAssignment
   - "Edit" button per assignment (change dates, priority)
   - "End" button to end an assignment (sets cp365_sp_enddate, cp365_sp_assignmentstatus = Ended)
   - "Remove" button to delete assignment entirely

4. GENERATION STATUS:
   - Show cp365_sp_lastgenerateddate per assignment
   - "Generate Now" button if shifts are behind schedule
   - Warning if no shifts generated yet (cp365_sp_lastgenerateddate is null)

5. HOURS SUMMARY:
   - Contracted hours (from staff's contract cp365_requiredhours)
   - Pattern hours (combined cp365_sp_averageweeklyhours from all active patterns)
   - Variance indicator (pattern hours - contracted hours)

6. HISTORY:
   - Collapsed section showing past/ended assignments (cp365_sp_assignmentstatus = Ended)
   - Expandable to view historical patterns

Props:
- staffMemberId: string
- onAssignPattern: () => void
- onEditAssignment: (assignmentId: string) => void
- onEndAssignment: (assignmentId: string) => void
```

---

# PHASE 2A: SHIFT GENERATION ENGINE

## Prompt 2A.1: Generation Algorithm

```
Build the shift generation algorithm.

File: src/features/shift-patterns/utils/shiftGeneration.ts

This is the core logic for converting pattern assignments into actual shifts.

Requirements:

1. GENERATION FUNCTION:
```typescript
interface GenerateShiftsOptions {
  assignmentId: string;
  startDate: Date;
  endDate: Date;
  conflictResolutions?: Map<string, 'keep' | 'override' | 'skip'>;
  dryRun?: boolean; // If true, return what would be created without creating
}

interface GenerateShiftsResult {
  shiftsCreated: Shift[];
  shiftsSkipped: { date: Date; reason: string }[];
  conflicts: PatternConflict[];
  errors: string[];
}

function generateShiftsFromPattern(options: GenerateShiftsOptions): Promise<GenerateShiftsResult>
```

2. ALGORITHM STEPS:
   a. Fetch the pattern assignment with template and days
   b. Calculate the date range to generate
   c. For each date in range:
      - Determine which week of rotation this date falls in (using rotation calculation)
      - Get the cp365_sp_dayofweek (1-7) for this date
      - Find the pattern day matching week + day of week
      - If cp365_sp_isrestday = true, skip
      - Check cp365_sp_appliestodays if set (JSON array of day names)
      - Check for conflicts (existing shifts, leave)
      - Apply conflict resolution
      - Create shift record if not skipped
   d. Return results

3. ROTATION WEEK CALCULATION:
```typescript
function getRotationWeek(
  assignmentStartDate: Date,       // cp365_sp_startdate
  rotationStartWeek: number,       // cp365_sp_rotationstartweek
  totalRotationWeeks: number,      // template's cp365_sp_rotationcycleweeks
  targetDate: Date
): number {
  const weeksSinceStart = differenceInWeeks(targetDate, assignmentStartDate);
  const adjustedWeek = (weeksSinceStart + rotationStartWeek - 1) % totalRotationWeeks;
  return adjustedWeek + 1; // Return 1-based week number
}
```

4. CONFLICT DETECTION:
```typescript
function detectConflicts(
  staffMemberId: string,
  startDate: Date,
  endDate: Date,
  excludePatternAssignmentId?: string
): Promise<PatternConflict[]>
```
   - Query existing shifts for staff in date range
   - Query approved/pending leave in date range
   - Query other pattern-generated shifts (exclude current assignment)

5. SHIFT CREATION:
   When creating a shift from pattern, set:
   - cp365_shiftdate: target date
   - cp365_shiftstarttime: combine target date with time portion from pattern day's cp365_sp_starttime
   - cp365_shiftendtime: combine target date with time portion from pattern day's cp365_sp_endtime (if overnight, use next day)
   - cr1e2_shiftbreakduration: from pattern day's cp365_sp_breakminutes
   - cp365_StaffMember@odata.bind: staff member lookup
   - cp365_ShiftReference@odata.bind: from pattern day's cp365_shiftreference
   - cp365_ShiftActivity@odata.bind: from pattern day's cp365_shiftactivity
   - cp365_shiftstatus: Published (1001) or Unpublished (1009) based on assignment settings
   - cp365_staffpatternassignment: lookup to the assignment
   - cp365_sp_isgeneratedfrompattern: true
   - cp365_sp_patternweek: the rotation week number
   - cp365_sp_patterndayofweek: the day of week from pattern

6. APPLIES TO DAYS HANDLING:
   - If cp365_sp_appliestodays is set (JSON like ["Monday","Tuesday","Wednesday"])
   - Parse and check if target day name is in array
   - Only generate for matching days

7. MULTIPLE PATTERNS:
   - If staff has multiple active patterns, sort by cp365_sp_priority
   - For each date, use the highest priority pattern that applies
   - Lower priority number = higher priority (1 is highest)

8. ERROR HANDLING:
   - Wrap in try-catch
   - Log errors but continue with other dates
   - Return partial results with error list
```

---

## Prompt 2A.2: Generation Service and Scheduling

```
Build the generation service and scheduling logic.

File: src/features/shift-patterns/utils/generationService.ts

Requirements:

1. GENERATION WINDOW CALCULATION:
```typescript
function calculateGenerationWindow(
  assignment: StaffPatternAssignment,
  pattern: ShiftPatternTemplate
): { startDate: Date; endDate: Date }
```
   - Look at cp365_sp_lastgenerateddate
   - If null, start from cp365_sp_startdate (or today if in past)
   - Calculate how far ahead based on cp365_sp_generationwindowweeks (1, 2, or 4)
   - Return the window to generate

2. CHECK IF GENERATION NEEDED:
```typescript
function isGenerationNeeded(assignment: StaffPatternAssignment): boolean
```
   - Compare cp365_sp_lastgenerateddate + window vs current date
   - Return true if we're within threshold (e.g., within 2 days of needing more shifts)

3. BATCH GENERATION:
```typescript
function generateAllPendingShifts(): Promise<{
  assignmentsProcessed: number;
  shiftsGenerated: number;
  errors: string[];
}>
```
   - Fetch all active assignments (cp365_sp_assignmentstatus = Active)
   - Check which ones need generation (isGenerationNeeded)
   - Generate for each (with rate limiting to avoid API throttling)

4. GENERATION LOGGING:
```typescript
function logGeneration(
  assignmentId: string,
  result: GenerateShiftsResult,
  type: GenerationType
): Promise<void>
```
   - Create cp365_shiftgenerationlog record with:
     - cp365_staffpatternassignment: assignment lookup
     - cp365_sp_generationdate: now
     - cp365_sp_periodstart: start of generated period
     - cp365_sp_periodend: end of generated period
     - cp365_sp_shiftsgenerated: count
     - cp365_sp_conflictsdetected: count
     - cp365_sp_conflictdetails: JSON string of conflict details
     - cp365_sp_generationtype: Manual/Scheduled/OnDemand
   - Update assignment's cp365_sp_lastgenerateddate

5. REGENERATION ON PATTERN CHANGE:
```typescript
function regenerateForPatternChange(
  patternId: string,
  effectiveDate: Date
): Promise<void>
```
   - Find all assignments using this pattern
   - Delete future pattern-generated shifts after effectiveDate
     (where cp365_sp_isgeneratedfrompattern = true and cp365_shiftdate >= effectiveDate)
   - Regenerate with updated pattern

6. MANUAL TRIGGER:
   - "Generate Now" function for immediate generation
   - Respect generation window even for manual triggers
   - Create log with cp365_sp_generationtype = Manual

7. POWER AUTOMATE INTEGRATION:
   - Document: Create a scheduled Power Automate flow that runs daily
   - Flow calls generateAllPendingShifts() or equivalent Dataverse action
   - Handle errors and send notifications if generation fails
```

---

# PHASE 2B: BULK ASSIGNMENT

## Prompt 2B.1: Bulk Assignment Wizard

```
Build the bulk assignment wizard for assigning patterns to multiple staff.

File: src/features/shift-patterns/pages/PatternAssignmentPage.tsx
Related components in: src/features/shift-patterns/components/PatternAssignment/

Requirements:

1. WIZARD STEPS:
   - Step 1: Select Pattern
   - Step 2: Select Staff
   - Step 3: Configure Assignment
   - Step 4: Review Conflicts
   - Step 5: Confirm and Assign

2. STEP 1 - PATTERN SELECTION:
   - Pattern library cards (mini version)
   - Search/filter by cp365_name, cp365_sp_patternstatus
   - Show pattern preview on select
   - "Next" button enabled when pattern selected

3. STEP 2 - STAFF SELECTION:
   - Filter by: Location, Sublocation, Team, Job Role
   - "Select All" and "Clear All" buttons
   - Checkbox list of staff with:
     - Name, job title
     - Contracted hours (cp365_requiredhours from contract)
     - Current pattern indicator (query existing active assignments)
   - Show count of selected staff
   - Warning if selecting staff with existing patterns

4. STEP 3 - CONFIGURATION:
   - Start Date (single cp365_sp_startdate for all, or individual per staff)
   - Stagger Options for cp365_sp_rotationstartweek:
     - "All start same week" (all get rotationstartweek = 1)
     - "Stagger by week" (auto-distribute rotation start weeks evenly)
     - "Custom per staff" (manual entry per staff)
   - Publish Status (pattern default or override via cp365_sp_overridepublishstatus)
   - Priority (cp365_sp_priority for staff with existing patterns)

5. STEP 4 - CONFLICT REVIEW:
   - Aggregate conflicts across all selected staff
   - Group by conflict type
   - Per-staff expandable conflict list
   - Bulk resolution controls
   - Show impact summary:
     - X staff, Y total shifts to generate
     - Z conflicts to resolve

6. STEP 5 - CONFIRMATION:
   - Summary of what will happen
   - Estimate of shifts to be created
   - "Assign and Generate" or "Assign Only" options
   - Progress indicator during execution (creating assignments, then generating shifts)

7. COMPLETION:
   - Success message with statistics
   - "View Assignments" button
   - "Assign More" button to restart wizard

8. NAVIGATION:
   - Step indicator at top
   - Back/Next buttons
   - Cancel button (with confirmation if in progress)
   - Save draft functionality (optional, can defer)
```

---

## Prompt 2B.2: Coverage Preview Component

```
Build the coverage preview component for bulk assignment.

File: src/features/shift-patterns/components/CoverageAnalysis/CoveragePreview.tsx

Requirements:

1. PURPOSE:
   - Show expected coverage after pattern assignments
   - Identify gaps and over-coverage
   - Help managers make informed decisions

2. DISPLAY FORMAT:
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ Coverage Preview - Next 4 Weeks                                 │
   ├─────────────────────────────────────────────────────────────────┤
   │        Mon   Tue   Wed   Thu   Fri   Sat   Sun                  │
   │ Early   4     4     4     4     4     2     2    Req: 4         │
   │         ██    ██    ██    ██    ██    ▒▒    ▒▒                  │
   │ Late    3     3     3     3     3     2     2    Req: 3         │
   │         ██    ██    ██    ██    ██    ▒▒    ▒▒                  │
   │ Night   2     2     2     2     2     2     2    Req: 2         │
   │         ██    ██    ██    ██    ██    ██    ██                  │
   └─────────────────────────────────────────────────────────────────┘
   
   Legend: ██ Fully Covered  ▒▒ Under-staffed  ▓▓ Over-staffed
   ```

3. INPUTS:
   - Selected staff and their proposed patterns
   - Existing pattern assignments (current state)
   - Staffing requirements (if defined, or use defaults)

4. CALCULATIONS:
   - For each date and shift reference:
     - Count staff assigned via patterns
     - Compare against requirements
     - Calculate variance

5. VIEWS:
   - Weekly summary (aggregated across the rotation)
   - Daily detail (expandable per day)
   - Shift reference breakdown
   - Team/unit breakdown (if applicable)

6. COMPARISON MODE:
   - Toggle between "Current" and "Proposed"
   - Show delta (change from current)
   - Highlight improvements (more coverage) and regressions (less coverage)

7. AGENCY GAP INDICATOR:
   - Calculate uncovered shifts (required - assigned)
   - Show estimated agency hours needed
   - Per day and total for period

8. EXPORT:
   - Export coverage data to CSV
   - Print-friendly view
```

---

# PHASE 2C: LEAVE INTEGRATION

## Prompt 2C.1: Leave Calculation from Patterns

```
Build the leave calculation utilities based on pattern assignments.

File: src/features/shift-patterns/utils/leaveCalculations.ts

Requirements:

1. ANNUAL LEAVE ENTITLEMENT:
```typescript
interface LeaveEntitlement {
  totalHours: number;
  totalDays: number;       // Based on average shift length
  usedHours: number;
  usedDays: number;
  remainingHours: number;
  remainingDays: number;
  calculationMethod: 'pattern' | 'contract' | 'actual';
}

function calculateAnnualLeaveEntitlement(
  staffMemberId: string,
  year: number
): Promise<LeaveEntitlement>
```

2. CALCULATION LOGIC:
   - UK statutory: 5.6 weeks annual leave
   - Get average weekly hours from active pattern(s) (cp365_sp_averageweeklyhours)
   - If no pattern, fall back to contract hours (cp365_requiredhours)
   - If no contract hours, fall back to actual worked hours
   - Formula: Average Weekly Hours × 5.6 = Annual Leave Hours

3. PATTERN CHANGE HANDLING:
   - If pattern changes mid-year (new assignment with different cp365_sp_startdate)
   - Pro-rata calculation for each period
   - Calculate entitlement for each period based on that period's pattern hours
   - Combine for total year entitlement

4. PUBLIC HOLIDAY ENTITLEMENT:
```typescript
function calculatePublicHolidayEntitlement(
  staffMemberId: string,
  year: number
): Promise<{
  entitlementHours: number;
  workedOnHolidays: number;
  additionalDaysOwed: number;
}>
```
   - Check pattern for which public holidays fall on working days
   - Staff working weekends may not work Monday bank holidays
   - Calculate equivalent time off owed

5. LEAVE BOOKING VALIDATION:
```typescript
function validateLeaveRequest(
  staffMemberId: string,
  startDate: Date,
  endDate: Date,
  leaveType: string
): Promise<{
  valid: boolean;
  hoursRequired: number;
  hoursAvailable: number;
  warnings: string[];
}>
```
   - Check pattern to see which days in range are working days (cp365_sp_isrestday = false)
   - Only deduct leave for working days
   - Calculate hours based on pattern shift lengths
   - Handle half-day requests (using cp365_halfdayoption from leave system)

6. HOURS TO DAYS CONVERSION:
   - Use average shift length from pattern
   - "1 day" = average shift hours (not always 7.5h)
   - For 12-hour shift patterns, 1 day = 12 hours
```

---

## Prompt 2C.2: Leave Pattern Integration UI

```
Build the UI components for leave-pattern integration.

Files:
- src/features/shift-patterns/components/PatternDisplay/LeaveEntitlementCard.tsx
- Updates to existing leave booking components

Requirements:

1. LEAVE ENTITLEMENT CARD:
   File: src/features/shift-patterns/components/PatternDisplay/LeaveEntitlementCard.tsx
   
   - Display on staff profile
   - Shows:
     - Total annual leave entitlement (hours and days)
     - Used leave (query from cp365_staffabsencelog)
     - Remaining leave
     - Calculation method indicator (pattern/contract/actual)
   - "View Breakdown" expandable section showing:
     - Pattern periods and hours for each
     - Pro-rata calculations if pattern changed
   - Based on pattern's cp365_sp_averageweeklyhours

2. LEAVE BOOKING ENHANCEMENT:
   - When booking leave, show pattern-aware information:
     - "This covers X working days in your pattern"
     - Show hours being deducted (based on pattern shift lengths)
     - Warn if booking leave on rest days (cp365_sp_isrestday = true)

3. PATTERN CALENDAR WITH LEAVE:
   - On pattern calendar view, overlay approved leave
   - Different colour for leave days
   - Show leave type on hover (from cp365_AbsenceType.cp365_absencetypename)

4. LEAVE VS PATTERN CONFLICTS:
   - When assigning pattern, show existing leave conflicts
   - When booking leave, warn if it conflicts with pattern-generated shifts
   - Option to automatically remove pattern-generated shifts for leave period
     (delete shifts where cp365_sp_isgeneratedfrompattern = true)

5. ENTITLEMENT CALCULATOR:
   - Modal/page for calculating entitlement
   - Input: Year, Staff member
   - Output: Detailed calculation breakdown
   - Show pattern periods and hours for each
   - Export to PDF/print
```

---

# PHASE 2D: AGENCY COVERAGE

## Prompt 2D.1: Coverage Analysis Dashboard

```
Build the agency coverage analysis components.

Files:
- src/features/shift-patterns/components/CoverageAnalysis/CoverageHeatmap.tsx
- src/features/shift-patterns/components/CoverageAnalysis/AgencyGapsView.tsx

Requirements:

1. COVERAGE HEATMAP:
   - Visual grid showing coverage levels
   - X-axis: Days of week (or dates for specific period)
   - Y-axis: Shift references (from cp365_shiftreference)
   - Cell colour: Green (covered), Amber (under), Red (critical gap)
   - Cell content: Assigned/Required count (e.g., "3/4")

2. AGENCY GAPS VIEW:
   - List of uncovered shifts
   - Grouped by date
   - Shows:
     - Shift reference name
     - Time (from pattern's cp365_sp_starttime/cp365_sp_endtime)
     - Gap count (need X more staff)
     - Estimated hours (shift duration × gap count)
   - Total agency hours needed for period

3. COVERAGE CALCULATION:
```typescript
interface CoverageRequirement {
  shiftReferenceId: string;
  dayOfWeek: DayOfWeek;
  requiredCount: number;
}

interface CoverageAnalysis {
  date: Date;
  shiftReference: string;
  required: number;
  assigned: number;      // Staff with patterns covering this shift
  gap: number;           // required - assigned
  percentCovered: number;
}

function analyzeCoverage(
  sublocationId: string,
  startDate: Date,
  endDate: Date,
  requirements?: CoverageRequirement[]
): Promise<CoverageAnalysis[]>
```
   - Query all active pattern assignments for sublocation staff
   - Project what shifts each pattern generates
   - Count by shift reference and day
   - Compare against requirements

4. REQUIREMENT CONFIGURATION:
   - If staffing requirements table exists, use it
   - If not, use historical averages or manual input
   - Allow inline editing of requirements
   - Save requirements for future reference

5. EXPORT:
   - Export coverage analysis to Excel/CSV
   - Include agency hours estimate
   - Per-day and summary views

6. INTEGRATION:
   - Link to agency booking system (if exists)
   - Quick action to create agency shift request for gaps
```

---

# PHASE 3: SHIFT SWAPS & OFFERS (DEFERRED)

*These prompts are documented for future implementation but are not part of the initial release.*

## Prompt 3.1: Shift Swap Request System (DEFERRED)

```
[DEFERRED TO PHASE 3]

Build the shift swap request system.

Tables required (create when ready):
- cp365_shiftswaprequest

Components to build:
- SwapRequestForm
- SwapRequestList
- SwapApprovalPanel
- SwapRecommendations

Features:
- Staff can request to swap a shift
- Pattern-aware recommendations (suggest staff with complementary patterns)
- Manager approval workflow
- Automatic schedule updates on approval
```

---

## Prompt 3.2: Shift Offer System (DEFERRED)

```
[DEFERRED TO PHASE 3]

Build the shift offer posting and claiming system.

Tables required (create when ready):
- cp365_shiftoffer

Components to build:
- ShiftOfferForm
- AvailableShiftsList
- ClaimResolution
- OfferNotifications

Features:
- Post unassigned shifts as available
- Staff can claim shifts
- Priority-based claim resolution
- Pattern-aware eligibility filtering
```

---

# TESTING PROMPTS

## Prompt T.1: Unit Tests for Generation Algorithm

```
Write unit tests for the shift generation algorithm.

File: src/features/shift-patterns/__tests__/shiftGeneration.test.ts

Test cases:
1. Simple 1-week pattern generates correct shifts for each day
2. 2-week rotation calculates correct rotation week for any date
3. Rest days (cp365_sp_isrestday = true) are not generated
4. Overnight shifts (cp365_sp_isovernight = true) handle date boundary correctly
5. Multiple patterns resolve by cp365_sp_priority (lower = higher priority)
6. cp365_sp_appliestodays filter works correctly (only generates for specified days)
7. Conflict detection finds existing shifts
8. Conflict detection finds approved leave (cp365_absencestatus = 3)
9. Generation respects conflict resolutions (keep/override/skip)
10. Generation window calculations are correct based on cp365_sp_generationwindowweeks
11. Shifts are created with correct cp365_sp_isgeneratedfrompattern flag
12. Shifts include correct cp365_sp_patternweek and cp365_sp_patterndayofweek
```

---

## Prompt T.2: Integration Tests

```
Write integration tests for pattern assignment flow.

File: src/features/shift-patterns/__tests__/patternAssignment.integration.test.ts

Test cases:
1. Create pattern template with days via API
2. Assign pattern to staff member (create cp365_staffpatternassignment)
3. Generate shifts from assignment
4. Verify shifts have correct cp365_staffpatternassignment lookup
5. Verify shifts have cp365_sp_isgeneratedfrompattern = true
6. End assignment (set cp365_sp_enddate, cp365_sp_assignmentstatus = Ended)
7. Verify no future generation after end date
8. Multiple patterns on same staff resolve correctly by cp365_sp_priority
9. Leave integration blocks shift generation on leave days
10. Pattern update triggers regeneration of future shifts
```

---

# DOCUMENTATION PROMPTS

## Prompt D.1: User Documentation

```
Create user documentation for the Shift Patterns feature.

File: docs/SHIFT-PATTERNS-USER-GUIDE.md

Include:
1. Overview of shift patterns - what they are and why use them
2. Creating a new pattern template
3. Using standard patterns (pre-configured)
4. Understanding the pattern builder interface
5. Assigning patterns to individual staff
6. Bulk assignment walkthrough
7. Understanding conflict resolution
8. Managing multiple patterns per staff
9. Leave entitlement calculations
10. Coverage analysis and agency gaps
11. Troubleshooting common issues
12. FAQ
```

---

## Prompt D.2: Technical Documentation

```
Create technical documentation for the Shift Patterns feature.

File: docs/SHIFT-PATTERNS-TECHNICAL.md

Include:
1. Architecture overview
2. Data model diagram with all cp365_sp_ columns
3. API reference (all endpoints and functions)
4. Generation algorithm explanation
5. Conflict resolution logic
6. Leave calculation formulas
7. Power Automate integration for scheduled generation
8. Performance considerations
9. Security and permissions
10. Deployment checklist
```

---

# COMPLETION CHECKLIST

When all prompts are complete, verify:

## Phase 0
- [ ] TypeScript interfaces created with cp365_sp_ prefix
- [ ] API functions implemented
- [ ] React Query hooks working
- [ ] Routing configured
- [ ] Navigation added

## Phase 1A
- [ ] Pattern Library page functional
- [ ] Pattern Builder complete
- [ ] Week Grid working with cp365_sp_ fields
- [ ] Shift Editor functional
- [ ] Validation working
- [ ] Standard patterns seeded

## Phase 1B
- [ ] Individual assignment working
- [ ] Conflict detection functional
- [ ] Staff pattern view complete
- [ ] Priority-based resolution working

## Phase 2A
- [ ] Generation algorithm working with all cp365_sp_ fields
- [ ] Scheduled generation configured
- [ ] Generation logging complete (cp365_shiftgenerationlog)
- [ ] Regeneration on change working

## Phase 2B
- [ ] Bulk assignment wizard complete
- [ ] Stagger options working (cp365_sp_rotationstartweek distribution)
- [ ] Coverage preview functional

## Phase 2C
- [ ] Leave calculation working from cp365_sp_averageweeklyhours
- [ ] Pattern-aware leave booking
- [ ] Entitlement display complete

## Phase 2D
- [ ] Coverage heatmap working
- [ ] Agency gaps identified
- [ ] Export functional

---

**Document Version:** 1.2  
**Last Updated:** December 2025  
**Changes:**
- v1.1: Updated all column names to use cp365_sp_ prefix for feature identification
- v1.2: Clarified that cp365_sp_starttime and cp365_sp_endtime are DateTime fields with dummy dates (Dataverse has no "Time only" type)

**Created For:** CarePoint 365 Rota Management Application
