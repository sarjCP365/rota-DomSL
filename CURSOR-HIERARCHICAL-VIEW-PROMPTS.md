# CarePoint 365 - Hierarchical Rota View (Unit > Team > Staff)

This feature introduces a new hierarchical structure for the weekly rota, grouping shifts by Units and Teams, with the ability to toggle between different view modes.

---

## OVERVIEW: View Modes

| View Mode | Primary Grouping | Secondary Grouping | Use Case |
|-----------|------------------|-------------------|----------|
| **By Team** | Unit | Team > Staff | Default - organizational view |
| **By People** | Staff Member | (flat list) | Current view - individual focus |
| **By Shift Reference** | Shift Type/Reference | Staff assigned | Coverage planning |

---

## PROMPT 1: View Toggle Component

**User Story:**
> As a rota manager, I want to switch between different view modes (by Team, by People, by Shift Reference), so that I can visualize the rota in the way that best suits my current task.

**Prompt:**
```
Create a view toggle component at src/components/rota/ViewModeSelector.tsx that allows switching between different rota display modes.

Requirements:

1. Header placement:
   - Position in the rota header bar, left side
   - Two dropdown selectors side by side

2. First dropdown - "View by":
   ```
   ┌─────────────────┐
   │ View by Team  ▼ │
   └─────────────────┘
   Options:
   - View by Team (default)
   - View by People  
   - View by Shift Reference
   ```

3. Second dropdown - "Detail Level":
   ```
   ┌──────────────────┐
   │ Detailed View  ▼ │
   └──────────────────┘
   Options:
   - Detailed View (shows all info)
   - Compact View (minimal info)
   - Hours Only (just hours, no details)
   ```

4. Visual styling:
   - White background with border
   - Dropdown arrow on right
   - Selected option displayed
   - Hover state with slight background change

5. State management:
   - Store viewMode in rotaStore: 'team' | 'people' | 'shiftReference'
   - Store detailLevel: 'detailed' | 'compact' | 'hoursOnly'
   - Persist selection in localStorage
   - URL param sync: ?view=team&detail=detailed

6. On change behaviour:
   - Trigger re-render of rota grid
   - Maintain current date selection
   - Maintain current filters
   - Show brief loading state during transition

7. Keyboard support:
   - Tab to focus
   - Arrow keys to navigate options
   - Enter to select

Props:
- viewMode: ViewMode
- detailLevel: DetailLevel
- onViewModeChange: (mode: ViewMode) => void
- onDetailLevelChange: (level: DetailLevel) => void

Types:
```typescript
type ViewMode = 'team' | 'people' | 'shiftReference';
type DetailLevel = 'detailed' | 'compact' | 'hoursOnly';
```
```

---

## PROMPT 2: Unit Data Model and API

**User Story:**
> As a system administrator, I need Units to be a configurable entity linked to Locations, so that each care facility can define their own organizational structure.

**Prompt:**
```
Create the data model and API layer for Units.

FILE 1: src/types/unit.ts
```typescript
interface Unit {
  cp365_unitid: string;
  cp365_unitname: string;
  cp365_description?: string;
  cp365_locationid: string;           // Parent location
  cp365_floorlevel?: string;          // e.g., "Ground Floor", "First Floor"
  cp365_wardname?: string;            // e.g., "Ward A", "Ward B"
  cp365_displayorder: number;         // Sort order
  cp365_isactive: boolean;
  cp365_unittypecode?: number;        // Dementia, Residential, Complex Care, etc.
  statecode: number;
}

interface UnitWithStats extends Unit {
  totalShifts: number;
  staffOnLeave: number;
  vacantPositions: number;
  teams: TeamWithStats[];
}

interface TeamWithStats extends Team {
  unitId: string | null;
  staffCount: number;
  onLeave: number;
  unassigned: number;
  staffMembers: StaffMemberWithShifts[];
}
```

FILE 2: src/api/units.ts
```typescript
// Fetch all units for a location
async function getUnitsByLocation(locationId: string): Promise<Unit[]>

// Fetch units with team and shift statistics
async function getUnitsWithStats(
  locationId: string, 
  sublocationId: string,
  startDate: Date, 
  endDate: Date
): Promise<UnitWithStats[]>

// Create/update unit
async function saveUnit(unit: Partial<Unit>): Promise<Unit>

// Link team to unit
async function assignTeamToUnit(teamId: string, unitId: string): Promise<void>

// Assign unit to shift
async function assignUnitToShift(shiftId: string, unitId: string): Promise<void>
```

FILE 3: Dataverse schema additions
```
New table: cp365_unit
- cp365_unitid (Primary Key, GUID)
- cp365_unitname (String, 100)
- cp365_description (String, 500)
- cp365_locationid (Lookup to Location)
- cp365_floorlevel (String, 50)
- cp365_wardname (String, 50)
- cp365_displayorder (Integer)
- cp365_isactive (Boolean)
- cp365_unittypecode (OptionSet)
- statecode (State)

Modified table: cp365_staffteam
- Add: cp365_unitid (Lookup to Unit) - nullable

Modified table: cp365_shift
- Add: cp365_unitid (Lookup to Unit) - nullable
```

Data fetching strategy:
- On rota load, fetch units for selected location
- Use $expand to get related teams in single query
- Cache unit list (changes infrequently)
- Refresh stats on each rota data load
```

---

## PROMPT 3: Legend Component

**User Story:**
> As a rota manager, I need a clear legend explaining the visual indicators on the rota, so that I can quickly understand what different colours and badges mean.

**Prompt:**
```
Create a legend component at src/components/rota/RotaLegend.tsx.

Requirements:

1. Layout (horizontal bar below filters):
   ```
   Legend:  🔥 Fire Marshal  ❤️ First Aider  ▪️ Day Shift  ▫️ Night Shift  👤 Annual Leave  ⚠️ Unassigned
   ```

2. Legend items:
   - Fire Marshal: flame icon (🔥 or custom), orange badge "FM"
   - First Aider: heart icon (❤️), red badge "FA"  
   - Day Shift: light blue square
   - Night Shift: dark blue/purple square
   - Annual Leave: person icon with calendar
   - Unassigned: warning icon, red dashed border

3. Visual styling:
   - Light grey background bar
   - Items spaced evenly
   - Icon + label for each
   - Subtle border bottom

4. Colour swatches:
   - Day Shift: #E3F2FD (light blue)
   - Night Shift: #E8EAF6 (light purple/indigo)
   - Annual Leave: #FFF3E0 (light orange) with person icon
   - Unassigned/Vacant: #FFEBEE (light red) with dashed border

5. Interactive (optional):
   - Click legend item to filter/highlight those shifts
   - Tooltip on hover explaining each item

6. Responsive:
   - Wrap to two rows on smaller screens
   - Collapse to icon-only on mobile
   - Expandable on tap

7. Position:
   - Below the header/filter bar
   - Above the rota grid
   - Sticky when scrolling (optional)

Props:
- onFilterByType?: (type: string) => void
- activeFilters?: string[]
```

---

## PROMPT 4: Unit Header Component

**User Story:**
> As a rota manager, I need to see each Unit as a distinct section with summary statistics, so that I can quickly assess staffing levels across different care areas.

**Prompt:**
```
Create a Unit header component at src/components/rota/UnitHeader.tsx.

Requirements:

1. Layout:
   ```
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ ▼ Dementia Unit                                              Weekly Overview │
   │   Ward A - Ground Floor                          28 shifts • 4 staff on leave│
   └──────────────────────────────────────────────────────────────────────────────┘
   ```

2. Left side:
   - Collapse/expand chevron (▼ expanded, ► collapsed)
   - Unit name (bold, larger font)
   - Subtitle: Ward name + Floor level (smaller, grey)

3. Right side:
   - "Weekly Overview" link (opens detailed stats modal)
   - Statistics line: "X shifts • Y staff on leave"
   - If vacancies: add "• Z vacancies" in red

4. Collapse behaviour:
   - Click anywhere on header to toggle
   - Smooth height animation
   - Remember state per unit in localStorage
   - Keyboard: Enter/Space to toggle

5. Visual styling:
   - Background: light grey (#F8F9FA)
   - Left border: 4px solid teal (#1FD1BA)
   - Padding: 16px
   - Margin bottom: 8px
   - Border radius: 8px
   - Shadow on hover

6. Weekly Overview link:
   - Opens modal with detailed statistics
   - Shows: total hours, by shift type, coverage gaps
   - Breakdown by team within unit

7. Drag and drop (future):
   - Units can be reordered
   - Visual indicator when dragging

8. Empty state:
   - If unit has no shifts for the period
   - Show "No shifts scheduled" message
   - Option to hide empty units

Props:
```typescript
interface UnitHeaderProps {
  unit: UnitWithStats;
  isExpanded: boolean;
  onToggle: () => void;
  onViewOverview: () => void;
  dateRange: { start: Date; end: Date };
}
```
```

---

## PROMPT 5: Team Sub-Header Component

**User Story:**
> As a rota manager, I need to see Teams grouped within Units with their own statistics, so that I can assess coverage at both the unit and team level.

**Prompt:**
```
Create a Team sub-header component at src/components/rota/TeamSubHeader.tsx.

Requirements:

1. Layout:
   ```
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ ▼ Senior Nursing Team  (4 staff)                    On leave: 1  Unassigned: 2 │
   └────────────────────────────────────────────────────────────────────────────┘
   ```

2. Left side:
   - Collapse/expand chevron
   - Team name (semi-bold)
   - Staff count in parentheses: "(4 staff)"

3. Right side:
   - "On leave: X" - amber/orange colour
   - "Unassigned: X" - red colour (only if > 0)

4. Visual hierarchy:
   - Indented from Unit header (padding-left: 24px)
   - Smaller font than Unit header
   - Lighter background (#FAFAFA)
   - Left border: 3px solid light teal

5. Collapse behaviour:
   - Independent of Unit collapse
   - Collapses team's staff rows only
   - Team header always visible when Unit expanded

6. Unassigned count:
   - Shows number of vacant/unassigned shifts
   - Red text and/or badge
   - Click to scroll to unassigned row

7. On leave count:
   - Shows staff with TAFW in date range
   - Amber/orange colour
   - Tooltip lists who is on leave

8. Quick actions (on hover):
   - "Add Staff" button
   - "Add Shift" button
   - "View Team Details" link

Props:
```typescript
interface TeamSubHeaderProps {
  team: TeamWithStats;
  isExpanded: boolean;
  onToggle: () => void;
  onAddStaff: () => void;
  onAddShift: () => void;
}
```
```

---

## PROMPT 6: Staff Row Component (Team View)

**User Story:**
> As a rota manager, I need to see individual staff members within their teams showing their scheduled hours vs contracted hours and any special qualifications, so that I can ensure appropriate coverage and skill mix.

**Prompt:**
```
Create an enhanced staff row component at src/components/rota/TeamStaffRow.tsx.

Requirements:

1. Layout:
   ```
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ [Avatar] Jane Smith          │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
   │          Lead Nurse          │08:00│08:00│     │     │08:00│08:00│     │
   │          48h / 40h           │20:00│20:00│     │     │20:00│20:00│     │
   │          [FM] [FA]           │ 12h │ 12h │     │     │ 12h │ 12h │     │
   └──────────────────────────────────────────────────────────────────────────────┘
   ```

2. Staff info column (left, fixed 200px):
   - Avatar with initials or photo
   - Staff name (bold)
   - Job title (grey, smaller)
   - Hours: "Scheduled / Contracted" (e.g., "48h / 40h")
     - Green if at/above contracted
     - Amber if below contracted
     - Red if significantly over (overtime)
   - Qualification badges row:
     - FM = Fire Marshal (orange badge)
     - FA = First Aider (red badge)
     - Other qualifications as configured

3. Shift cells (one per day):
   - Show shift time range: "08:00-20:00"
   - Show duration below: "12h"
   - Colour coded by shift type
   - Multiple shifts stack vertically

4. Special cell states:
   - Annual Leave: spans multiple days, shows "Annual Leave" text, person icon
   - Sick Leave: similar styling, different colour
   - Training: shows "Training" text
   - Empty: subtle dashed border on hover

5. Hours calculation:
   - Sum all shift durations for the week
   - Compare to contract hours (from StaffContract table)
   - Visual indicator: progress bar or colour

6. Qualification badges:
   - Pulled from Staff Capabilities table
   - Show top 2-3, "+X more" for additional
   - Tooltip shows full list
   - Icons/abbreviations configurable

7. Row interactions:
   - Hover: show "Add Shift" button on empty cells
   - Click cell: open shift flyout
   - Click staff name: open staff details
   - Right-click: context menu

8. Visual styling:
   - Indented under Team header
   - Alternating row backgrounds
   - Border between staff members
   - Sticky first column on horizontal scroll

Props:
```typescript
interface TeamStaffRowProps {
  staff: StaffMemberWithShifts;
  dateRange: Date[];
  contractedHours: number;
  qualifications: Qualification[];
  onCellClick: (date: Date) => void;
  onStaffClick: () => void;
}
```
```

---

## PROMPT 7: Unassigned Shifts Row (Per Team)

**User Story:**
> As a rota manager, I need to see unassigned/vacant shifts within each team, so that I can quickly identify gaps and assign staff to fill them.

**Prompt:**
```
Create an unassigned shifts row component at src/components/rota/UnassignedShiftsRow.tsx.

Requirements:

1. Layout (appears at bottom of each team section):
   ```
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ ⚠️ Unassigned Shifts         │     │     │ ┌─VACANT──┐ │     │ ┌─VACANT──┐ │
   │    2 vacant positions        │     │     │ │20:00-   │ │     │ │20:00-   │ │
   │                              │     │     │ │08:00    │ │     │ │08:00    │ │
   │                              │     │     │ │[Assign] │ │     │ │[Assign] │ │
   │                              │     │     │ └─────────┘ │     │ └─────────┘ │
   └──────────────────────────────────────────────────────────────────────────────┘
   ```

2. Row header (left column):
   - Warning icon (⚠️) in red/orange
   - Text: "Unassigned Shifts"
   - Subtitle: "X vacant positions"
   - Light red background (#FFF5F5)

3. Vacant shift cards:
   - Red dashed border (#E53935)
   - Light red background
   - Header: "VACANT" in red
   - Shift time: "20:00-08:00"
   - Duration: "12h"
   - "Assign" button at bottom

4. Assign button behaviour:
   - Click opens assignment modal
   - Modal shows:
     - Available staff (not scheduled at that time)
     - Staff from same team prioritized
     - Search/filter capability
   - After assignment, shift moves to staff row

5. Multiple vacancies same day:
   - Stack vertically in cell
   - Show count badge if many: "+2 more"
   - Click to expand all

6. Visual distinction:
   - Clearly different from regular staff rows
   - Red/warning colour scheme
   - Dashed borders throughout
   - Slightly separated from staff rows above

7. Drag and drop (future):
   - Drag staff member onto vacant shift
   - Visual feedback during drag
   - Confirm before assigning

8. Empty state:
   - If no unassigned shifts for team
   - Show subtle "No vacancies" or hide row entirely

9. Quick assign:
   - Hover on vacant shift shows suggested staff
   - One-click to assign suggested person
   - Based on: availability, skills, hours balance

Props:
```typescript
interface UnassignedShiftsRowProps {
  teamId: string;
  vacantShifts: Shift[];
  dateRange: Date[];
  onAssign: (shiftId: string) => void;
  availableStaff: StaffMember[];
}
```
```

---

## PROMPT 8: Assignment Modal

**User Story:**
> As a rota manager, I need a quick way to assign staff to vacant shifts, showing me who is available and suitable, so that I can efficiently fill gaps in the rota.

**Prompt:**
```
Create a staff assignment modal at src/components/rota/AssignmentModal.tsx.

Requirements:

1. Modal header:
   ```
   ┌─────────────────────────────────────────────────┐
   │ Assign Staff to Shift                        X │
   │ Wednesday 13 Aug • 20:00-08:00 (12h)           │
   └─────────────────────────────────────────────────┘
   ```

2. Shift details section:
   - Date and time
   - Duration
   - Team name
   - Unit name
   - Shift type (Night, Day, etc.)
   - Any special requirements

3. Available staff list:
   ```
   ┌─────────────────────────────────────────────────┐
   │ 🔍 Search staff...                              │
   ├─────────────────────────────────────────────────┤
   │ Recommended                                     │
   │ ┌───────────────────────────────────────────┐  │
   │ │ [JD] John Doe          36h/40h  ✓ Select │  │
   │ │     Senior Nurse       [FM] [FA]          │  │
   │ │     Same team • 4h under contracted       │  │
   │ └───────────────────────────────────────────┘  │
   │                                                 │
   │ Other Available                                 │
   │ ┌───────────────────────────────────────────┐  │
   │ │ [AS] Alice Smith       40h/40h    Select │  │
   │ │     Care Assistant                        │  │
   │ │     Different team • At contracted hours  │  │
   │ └───────────────────────────────────────────┘  │
   └─────────────────────────────────────────────────┘
   ```

4. Staff filtering logic:
   - Exclude staff already working that shift time
   - Exclude staff on leave
   - Sort by:
     1. Same team (prioritized)
     2. Under contracted hours
     3. Has required qualifications
     4. Alphabetical

5. Staff card info:
   - Avatar + name
   - Job title
   - Current hours / contracted hours
   - Qualification badges
   - Reason for recommendation (if applicable)
   - Select button

6. Search:
   - Filter by name
   - Filter by qualification
   - Filter by job title

7. Selection:
   - Click "Select" to choose staff member
   - Shows confirmation: "Assign John Doe to this shift?"
   - Confirm button to complete

8. After assignment:
   - Close modal
   - Update rota view
   - Show success toast
   - Shift moves from Unassigned to staff row

9. Agency worker option:
   - "Request Agency Worker" button at bottom
   - Opens agency booking flow

10. Cancel/Close:
    - X button closes modal
    - Click outside closes modal
    - Escape key closes modal

Props:
```typescript
interface AssignmentModalProps {
  isOpen: boolean;
  shift: Shift;
  teamId: string;
  availableStaff: StaffMember[];
  onAssign: (staffId: string) => void;
  onRequestAgency: () => void;
  onClose: () => void;
}
```
```

---

## PROMPT 9: View by People Mode

**User Story:**
> As a rota manager, I want to view the rota as a flat list of all staff members without unit/team grouping, so that I can see individual schedules when organizational structure isn't relevant.

**Prompt:**
```
Create the "View by People" mode for the rota grid at src/components/rota/PeopleViewGrid.tsx.

This is the current/existing view style - a flat list of staff members.

Requirements:

1. Layout:
   ```
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ Staff Member          │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │ Total │
   ├──────────────────────────────────────────────────────────────────────────────┤
   │ [AS] Alison Smith     │░░░░░│░░░░░│     │     │░░░░░│░░░░░│     │ 48h   │
   │     Senior Carer      │07-15│07-15│     │     │07-15│07-15│     │       │
   ├──────────────────────────────────────────────────────────────────────────────┤
   │ [JD] John Doe         │     │░░░░░│░░░░░│     │     │░░░░░│░░░░░│ 36h   │
   │     Care Assistant    │     │15-23│15-23│     │     │20-08│20-08│       │
   └──────────────────────────────────────────────────────────────────────────────┘
   ```

2. No grouping:
   - All staff in one flat list
   - Sorted alphabetically by default
   - Optional: sort by hours, job title, etc.

3. Staff column:
   - Same as Team View staff info
   - Avatar, name, job title
   - Hours summary
   - Qualification badges

4. Sort options dropdown:
   - Name (A-Z)
   - Name (Z-A)
   - Hours (High to Low)
   - Hours (Low to High)
   - Job Title

5. Total column (optional):
   - Show weekly hours total
   - Compare to contracted
   - Colour coded

6. Filtering:
   - Search by name
   - Filter by team (shows team name but doesn't group)
   - Filter by job title
   - Filter by qualification

7. Unassigned row:
   - Single "Unassigned" row at bottom
   - Shows ALL unassigned shifts across all teams
   - Not grouped by team

8. Performance:
   - Virtual scrolling for large staff lists
   - Lazy load shift data per staff

9. Export option:
   - Export this view to CSV/Excel
   - Print-friendly version

Props:
```typescript
interface PeopleViewGridProps {
  staffMembers: StaffMemberWithShifts[];
  dateRange: Date[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: FilterState;
}
```
```

---

## PROMPT 10: View by Shift Reference Mode

**User Story:**
> As a rota manager, I want to view the rota grouped by shift patterns/references (e.g., Early, Late, Night), so that I can ensure adequate coverage for each shift type across the week.

**Prompt:**
```
Create the "View by Shift Reference" mode at src/components/rota/ShiftReferenceViewGrid.tsx.

This view groups shifts by their reference/pattern rather than by person or team.

Requirements:

1. Layout concept:
   ```
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ ▼ Early Shift (07:00-15:00)                              Coverage: 85%       │
   │   Required: 4 staff per day                                                  │
   ├──────────────────────────────────────────────────────────────────────────────┤
   │         │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │                          │
   │ Need: 4 │  4  │  4  │  3  │  4  │  4  │  3  │  2  │                          │
   │         │ ✓   │ ✓   │ ⚠️  │ ✓   │ ✓   │ ⚠️  │ ⚠️  │                          │
   ├──────────────────────────────────────────────────────────────────────────────┤
   │ Assigned Staff:                                                              │
   │ Mon: Jane Smith, John Doe, Robert Davis, Sarah Johnson                       │
   │ Tue: Jane Smith, John Doe, Alice Brown, Mike Wilson                          │
   │ Wed: Jane Smith, John Doe, Robert Davis (NEED 1 MORE)                        │
   └──────────────────────────────────────────────────────────────────────────────┘
   
   ▼ Late Shift (15:00-23:00)                                 Coverage: 100%
   ...
   
   ▼ Night Shift (20:00-08:00)                                Coverage: 75%
   ...
   ```

2. Grouping by Shift Reference:
   - Each shift reference is a collapsible section
   - Shows time range in header
   - Shows required staffing level
   - Shows coverage percentage

3. Coverage grid:
   - One column per day
   - Shows: number assigned vs number required
   - Visual indicators:
     - ✓ Green: fully covered
     - ⚠️ Amber: under by 1
     - ❌ Red: under by 2+
     - 🔵 Blue: over-staffed

4. Required staff:
   - Configurable per shift reference
   - Can vary by day of week (weekends may differ)
   - Stored in Shift Reference table

5. Assigned staff list:
   - Expandable section per day
   - Shows names of assigned staff
   - Click name to view/edit their shift
   - "NEED X MORE" warning if under-staffed

6. Quick actions:
   - "Fill Gap" button on under-staffed days
   - Opens assignment modal pre-filtered
   - "Add Shift" to create new shift with this reference

7. Statistics:
   - Weekly coverage percentage
   - Total hours by shift reference
   - Trend vs previous week

8. Unassigned:
   - Shows unassigned shifts per reference
   - Easy to see which shift types need coverage

9. Filters:
   - Filter by unit
   - Filter by team
   - Show/hide fully covered

Props:
```typescript
interface ShiftReferenceViewProps {
  shiftReferences: ShiftReference[];
  shifts: Shift[];
  dateRange: Date[];
  staffingRequirements: StaffingRequirement[];
}

interface StaffingRequirement {
  shiftReferenceId: string;
  dayOfWeek: number;
  requiredCount: number;
}
```
```

---

## PROMPT 11: Annual Leave Display

**User Story:**
> As a rota manager, I need to clearly see when staff have annual leave that spans multiple days, so that I know they are unavailable for the entire period.

**Prompt:**
```
Create an annual leave cell component at src/components/rota/AnnualLeaveCell.tsx.

Requirements:

1. Visual appearance:
   ```
   ┌──────────────────────────────────┐
   │ All week           👤            │
   │ Annual Leave                     │
   └──────────────────────────────────┘
   ```

2. Spanning multiple days:
   - If leave covers multiple consecutive days
   - Cell visually spans those columns
   - Shows "All week" or date range
   - Single merged appearance

3. Styling:
   - Background: light orange/peach (#FFF3E0)
   - Border: subtle orange
   - Icon: person silhouette or calendar
   - Text: "Annual Leave" (or leave type)

4. Leave types:
   - Annual Leave: orange/peach background
   - Sick Leave: light red background
   - Training: light blue background
   - Other: grey background
   - Icon varies by type

5. Partial day handling:
   - If leave is only part of day
   - Show leave block + any shift blocks
   - Clear visual separation

6. Interaction:
   - Hover: show tooltip with details
     - Leave type
     - Start/end dates
     - Approved by
     - Notes
   - Click: view leave record (read-only from rota)

7. Overlapping shift warning:
   - If shift exists on leave day
   - Show warning indicator
   - Tooltip: "Shift scheduled during approved leave"

8. Data source:
   - From TAFW (Time Away From Work) table
   - Join with Absence Types for styling
   - Filter by date range and staff

Props:
```typescript
interface AnnualLeaveCellProps {
  leave: StaffAbsenceLog;
  startColumn: number;  // Which day column it starts
  spanDays: number;     // How many days it spans
  absenceType: AbsenceType;
}
```
```

---

## PROMPT 12: Unit Dropdown in Shift Creation

**User Story:**
> As a rota manager, when creating a shift I need to optionally assign it to a Unit, so that it appears under the correct organizational grouping on the rota.

**Prompt:**
```
Update the ShiftFlyout component to include Unit selection.

Requirements:

1. Add Unit dropdown to shift form:
   ```
   ┌─────────────────────────────────────────────────┐
   │ Create/Edit Shift                            X │
   ├─────────────────────────────────────────────────┤
   │ Unit (optional)                                 │
   │ ┌─────────────────────────────────────────────┐│
   │ │ Select Unit...                            ▼ ││
   │ │ ○ Dementia Unit - Ward A                   ││
   │ │ ○ Residential Unit - Ward B                ││
   │ │ ○ Complex Care Unit - First Floor          ││
   │ │ ○ (No Unit)                                ││
   │ └─────────────────────────────────────────────┘│
   │                                                 │
   │ Team                                            │
   │ ┌─────────────────────────────────────────────┐│
   │ │ Senior Nursing Team                       ▼ ││
   │ └─────────────────────────────────────────────┘│
   │ ... rest of form ...                           │
   └─────────────────────────────────────────────────┘
   ```

2. Unit dropdown:
   - Label: "Unit (optional)"
   - Options: All active units for current location
   - Plus "(No Unit)" option
   - Shows unit name + ward/floor info
   - Filtered by selected location

3. Team dropdown update:
   - If Unit is selected, filter teams to that unit
   - Show teams not in any unit as "Unassigned Teams"
   - Allow selecting team from different unit (with warning)

4. Cascading behaviour:
   - Select Unit → Filter Teams to that unit
   - Select Team → Auto-select Team's unit (if has one)
   - Clear Unit → Show all teams

5. Form field placement:
   - Unit dropdown appears BEFORE Team dropdown
   - Both after Location/Sublocation
   - Both before Shift Reference

6. Validation:
   - Unit is optional (not required)
   - If team has assigned unit, warn if different unit selected
   - "Team 'X' is usually assigned to 'Y Unit'. Continue?"

7. Save behaviour:
   - Save cp365_unitid on shift record
   - If no unit selected, field remains null
   - Shift appears in appropriate grouping based on selection

8. Edit existing shift:
   - Load current unit selection
   - Allow changing unit
   - Warn if moving to different unit

Props update:
```typescript
interface ShiftFlyoutProps {
  // ... existing props
  units: Unit[];
  onUnitChange: (unitId: string | null) => void;
}
```
```

---

## PROMPT 13: Team-Unit Configuration in Admin

**User Story:**
> As an administrator, I need to link Teams to Units in the Rostering Admin app, so that the organizational hierarchy is properly configured.

**Prompt:**
```
Create Unit management and Team-Unit linking in the admin interface.

FILE 1: src/pages/admin/UnitsManagement.tsx
```
Unit list and management page:

1. Units list view:
   - Table showing all units for location
   - Columns: Name, Ward, Floor, Teams Count, Status
   - Actions: Edit, Deactivate

2. Create/Edit Unit form:
   - Unit Name (required)
   - Description (optional)
   - Ward Name (optional)
   - Floor Level (optional)
   - Display Order (number)
   - Is Active (toggle)
   - Location (auto-set to current)

3. Teams assigned panel:
   - Shows teams currently linked to this unit
   - "Add Team" button to link new team
   - Remove team from unit option
```

FILE 2: src/pages/admin/TeamEdit.tsx (update)
```
Add Unit assignment to Team edit form:

1. New field in team form:
   - Label: "Assigned Unit"
   - Dropdown with all units for location
   - Plus "(No Unit)" option
   - Help text: "Teams in a unit appear grouped on the rota"

2. Multi-team assignment:
   - One team can only be in one unit
   - But UI should show which teams are unassigned
   - Bulk assign option for multiple teams

3. Display on team list:
   - Add "Unit" column to teams table
   - Shows assigned unit name or "—" if none
   - Filter teams by unit
```

FILE 3: Business logic
```typescript
// Rules:
// - A team can belong to zero or one unit
// - A unit can have multiple teams
// - Teams without unit appear in "Unassigned Teams" on rota
// - Changing team's unit doesn't affect existing shifts
// - But new shifts will default to team's unit

async function assignTeamToUnit(teamId: string, unitId: string | null): Promise<void> {
  await dataverse.update('cp365_staffteams', teamId, {
    cp365_unitid: unitId
  });
}

async function getTeamsForUnit(unitId: string): Promise<Team[]> {
  return dataverse.get('cp365_staffteams', {
    filter: `cp365_unitid eq ${unitId}`,
    orderBy: 'cp365_teamname'
  });
}

async function getUnassignedTeams(locationId: string): Promise<Team[]> {
  return dataverse.get('cp365_staffteams', {
    filter: `cp365_locationid eq ${locationId} and cp365_unitid eq null`,
    orderBy: 'cp365_teamname'
  });
}
```
```

---

## PROMPT 14: Hierarchical Data Fetching

**User Story:**
> As a developer, I need efficient data fetching that retrieves the hierarchical Unit > Team > Staff > Shifts structure in minimal API calls, so that the rota loads quickly even for large facilities.

**Prompt:**
```
Create optimized data fetching for the hierarchical rota view.

FILE: src/hooks/useHierarchicalRotaData.ts

Requirements:

1. Single aggregated query approach:
   - Fetch all data needed in 1-2 API calls
   - Use Dataverse $expand for relationships
   - Build hierarchy client-side

2. Data structure returned:
```typescript
interface HierarchicalRotaData {
  units: UnitWithTeams[];
  unassignedTeams: TeamWithStaff[];
  unassignedShifts: Shift[];
  leaveData: StaffAbsenceLog[];
  stats: RotaStats;
}

interface UnitWithTeams extends Unit {
  teams: TeamWithStaff[];
  stats: {
    totalShifts: number;
    staffOnLeave: number;
    vacancies: number;
  };
}

interface TeamWithStaff extends Team {
  staffMembers: StaffWithShifts[];
  unassignedShifts: Shift[];
  stats: {
    onLeave: number;
    unassigned: number;
  };
}

interface StaffWithShifts extends StaffMember {
  shifts: Shift[];
  leave: StaffAbsenceLog[];
  contractedHours: number;
  scheduledHours: number;
  qualifications: Capability[];
}
```

3. Fetch strategy:
```typescript
async function fetchHierarchicalRotaData(
  locationId: string,
  sublocationId: string,
  startDate: Date,
  endDate: Date
): Promise<HierarchicalRotaData> {
  // Step 1: Fetch units with teams
  const units = await fetchUnitsWithTeams(locationId);
  
  // Step 2: Fetch all shifts for date range (single query)
  const shifts = await fetchShiftsForDateRange(sublocationId, startDate, endDate);
  
  // Step 3: Fetch all staff for sublocation with contracts
  const staff = await fetchStaffWithContracts(sublocationId);
  
  // Step 4: Fetch leave data for date range
  const leave = await fetchLeaveForDateRange(sublocationId, startDate, endDate);
  
  // Step 5: Build hierarchy client-side
  return buildHierarchy(units, shifts, staff, leave);
}
```

4. Client-side hierarchy building:
```typescript
function buildHierarchy(
  units: Unit[],
  shifts: Shift[],
  staff: StaffMember[],
  leave: StaffAbsenceLog[]
): HierarchicalRotaData {
  // Group shifts by unit, then by team, then by staff
  // Calculate stats at each level
  // Handle unassigned (null unit/team)
  // Return structured data
}
```

5. Caching strategy:
   - Cache unit/team structure (changes rarely)
   - Cache staff list (changes occasionally)
   - Always fetch fresh shift data
   - Use TanStack Query for cache management

6. Incremental updates:
   - After shift create/edit, update local cache
   - Don't refetch entire hierarchy
   - Optimistic updates where possible

7. Performance targets:
   - Initial load: < 2 seconds
   - View mode switch: < 500ms (no refetch)
   - After shift edit: < 300ms (local update)
```

---

## PROMPT 15: Responsive Layout for Team View

**User Story:**
> As a rota manager using a tablet, I need the hierarchical rota view to work well on smaller screens, so that I can manage shifts while moving around the facility.

**Prompt:**
```
Implement responsive design for the hierarchical rota view.

Requirements:

1. Breakpoints:
   - Desktop: > 1200px (full hierarchy visible)
   - Tablet: 768px - 1200px (condensed)
   - Mobile: < 768px (stacked/simplified)

2. Desktop layout (default):
   - Full Unit > Team > Staff hierarchy
   - All columns visible
   - Horizontal scroll for many days

3. Tablet layout:
   - Collapse to 3-4 day view with horizontal scroll
   - Unit headers full width
   - Team headers condensed
   - Staff rows show less detail

4. Mobile layout:
   - Single day view with day selector
   - Units as accordion sections
   - Teams as sub-accordions
   - Staff as cards (not table rows)

5. Mobile staff card:
   ```
   ┌─────────────────────────┐
   │ [AS] Alison Smith       │
   │ Senior Carer • 48h/40h  │
   │ [FM] [FA]               │
   ├─────────────────────────┤
   │ Today's Shift:          │
   │ 08:00-20:00 (12h)       │
   │ Day Shift               │
   └─────────────────────────┘
   ```

6. Day selector (mobile):
   - Horizontal scrollable day tabs
   - Tap to switch day
   - Shows day name + date
   - Highlights today

7. Touch interactions:
   - Swipe left/right to change day
   - Tap unit/team to expand
   - Long press shift for context menu
   - Pull to refresh

8. Performance on mobile:
   - Lazy load team contents
   - Virtual scrolling for long lists
   - Reduced animations
   - Smaller image assets

9. Offline consideration:
   - Cache last viewed data
   - Show stale data with warning
   - Queue edits for sync

CSS approach:
```css
/* Mobile first */
.rota-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .rota-grid {
    display: grid;
    grid-template-columns: 200px repeat(7, 1fr);
  }
}

@media (min-width: 1200px) {
  .rota-grid {
    grid-template-columns: 250px repeat(7, minmax(100px, 1fr));
  }
}
```
```

---

## USAGE ORDER

**Recommended build sequence:**

### Phase 1: Foundation (Week 1)
1. **Prompt 2**: Unit data model and API
2. **Prompt 13**: Team-Unit admin configuration
3. **Prompt 12**: Unit dropdown in shift creation

### Phase 2: View Toggle (Week 2)
4. **Prompt 1**: View mode selector component
5. **Prompt 9**: View by People mode (existing, refactor)
6. **Prompt 14**: Hierarchical data fetching

### Phase 3: Team View Components (Week 3)
7. **Prompt 3**: Legend component
8. **Prompt 4**: Unit header component
9. **Prompt 5**: Team sub-header component
10. **Prompt 6**: Staff row component

### Phase 4: Unassigned & Assignment (Week 4)
11. **Prompt 7**: Unassigned shifts row
12. **Prompt 8**: Assignment modal
13. **Prompt 11**: Annual leave display

### Phase 5: Shift Reference View (Week 5)
14. **Prompt 10**: View by Shift Reference mode

### Phase 6: Polish (Week 6)
15. **Prompt 15**: Responsive layout

---

## DATA MODEL SUMMARY

```
Location (existing)
    └── Unit (NEW)
            ├── cp365_unitid
            ├── cp365_unitname
            ├── cp365_wardname
            ├── cp365_floorlevel
            └── cp365_locationid (FK)
                    └── Team (existing, modified)
                            ├── cp365_teamid
                            ├── cp365_teamname
                            └── cp365_unitid (NEW FK, nullable)
                                    └── Staff Member (existing)
                                            └── Shift (existing, modified)
                                                    ├── cp365_shiftid
                                                    └── cp365_unitid (NEW FK, nullable)
```

---

## TESTING CHECKLIST

- [ ] Units can be created and edited in admin
- [ ] Teams can be assigned to units
- [ ] Shift creation includes unit dropdown
- [ ] View by Team shows Unit > Team > Staff hierarchy
- [ ] View by People shows flat staff list
- [ ] View by Shift Reference shows coverage view
- [ ] View toggle persists selection
- [ ] Unassigned row shows per team in Team view
- [ ] Assignment modal filters available staff correctly
- [ ] Annual leave spans multiple days correctly
- [ ] Stats calculate correctly at all levels
- [ ] Mobile view is usable
- [ ] Performance acceptable with large data sets

