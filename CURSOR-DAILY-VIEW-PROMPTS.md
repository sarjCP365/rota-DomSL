# CarePoint 365 - Daily View Feature Prompts for Cursor AI

The Daily View is a detailed single-day view of all shifts, showing staff attendance status, clock-in/out times, and shift details in a list format (not a grid). It's designed for day-of operations management.

---

## OVERVIEW: What Makes Daily View Different

| Aspect | Weekly/Monthly View | Daily View |
|--------|---------------------|------------|
| Layout | Grid (staff rows × day columns) | List (one row per shift) |
| Purpose | Planning & scheduling | Day-of operations & attendance |
| Key data | Shift times, assignments | Clock-in/out, attendance status |
| Actions | Create/edit shifts | Track presence, assign leaders |
| Grouping | By staff member | By department |

---

## PROMPT 1: Daily View Page Structure

**User Story:**
> As a shift supervisor, I need a dedicated daily view of all shifts for today, so that I can monitor staff attendance, see who has clocked in, and manage the day's operations in real-time.

**Prompt:**
```
Create a new Daily View page at src/pages/DailyView.tsx that shows all shifts for a single selected day.

PAGE LAYOUT (top to bottom):

1. HEADER BAR (teal background #7BC8B5):
   - Left: Hamburger menu icon, Book icon, Title "CarePoint365 - Daily Rota Management"
   - Center: Day/Week/Month toggle buttons (Day is highlighted/active)
   - Center: Date navigation: ‹ Previous | Date Picker | Next ›
   - Right: Export PDF button

2. FILTER BAR (white background):
   - Search: text input "Search staff by name..."
   - Location: dropdown
   - Sublocation: dropdown
   - Department: dropdown with "All Departments" default
   - Status: dropdown with options [All Status, Present, Scheduled, Worked, Absent, Late]
   - Shift Type: dropdown with options [All, Day, Night, Sleep In]
   - Expand All / Collapse All buttons
   - Refresh icon button

3. STATISTICS ROW (white cards):
   - Card 1: Staff count (number + "Staff on Shifts" label)
   - Card 2: Total hours (number + "Total Rostered Hours" label)

4. DEPARTMENT SECTIONS (scrollable):
   - Each department is a collapsible section
   - Department header shows name + staff count badge
   - Contains list of shift cards for that department

5. SHIFT LIST:
   - Each shift is a horizontal card showing:
     - Staff avatar (initials), name, job title, Lead/Act-Up badges
     - Shift time column
     - Working hours column
     - Activities column
     - Break duration column
     - Shift type badge (Day/Night/Sleep In with colours)
     - Action buttons (Edit, Shift Leader, Clock In/Out status)

State management:
- selectedDate: Date (default today)
- selectedLocation, selectedSublocation
- filters: { search, department, status, shiftType }
- expandedDepartments: Set<string>

Navigation:
- Day button: stays on this page
- Week button: navigates to RotaView with duration=7
- Month button: navigates to RotaView with duration=28

Refer to rota-react-specification.md for API calls and data structures.
```

---

## PROMPT 2: Date Navigation Component

**User Story:**
> As a shift supervisor, I need to quickly navigate between days using previous/next arrows or a date picker, so that I can review past shifts or prepare for upcoming days.

**Prompt:**
```
Create a date navigation component at src/components/daily/DateNavigation.tsx for the Daily View.

Requirements:

1. Layout:
   ```
   ┌─────────────────────────────────────┐
   │  ‹  │  Tuesday, 31 December 2024  │  ›  │
   └─────────────────────────────────────┘
   ```

2. Previous button (‹):
   - Decrements date by 1 day
   - Triggers data reload
   - Disabled while loading

3. Next button (›):
   - Increments date by 1 day
   - Triggers data reload
   - Disabled while loading

4. Date display (center):
   - Shows full date format: "Tuesday, 31 December 2024"
   - Clickable to open date picker
   - Bold, white text on teal background

5. Date picker popup:
   - Calendar view
   - Highlights today
   - Highlights selected date
   - Quick buttons: "Today", "Tomorrow", "Yesterday"
   - Closes on selection

6. Keyboard shortcuts:
   - Left arrow: previous day
   - Right arrow: next day
   - T: jump to today

7. URL sync:
   - Date in URL: /daily?date=2024-12-31
   - Shareable links
   - Browser back/forward works

8. Visual styling:
   - Background: teal (#7BC8B5) with lighter shade
   - Arrows: white, hover effect
   - Date text: white, bold
   - Border radius: 5px

Props:
- selectedDate: Date
- onDateChange: (date: Date) => void
- isLoading: boolean
```

---

## PROMPT 3: Filter Bar Component

**User Story:**
> As a shift supervisor, I need to filter the daily shift list by department, attendance status, shift type, or staff name, so that I can quickly find specific information without scrolling through all shifts.

**Prompt:**
```
Create a filter bar component at src/components/daily/DailyFilterBar.tsx.

Requirements:

1. Layout (horizontal row):
   ```
   | Search: [________] | Location: [▼] | Sublocation: [▼] | Department: [▼] | Status: [▼] | Shift Type: [▼] | [Collapse All] [Expand All] [↻] |
   ```

2. Search input:
   - Placeholder: "Search staff by name..."
   - Clear button (X) when has text
   - Debounced (300ms) to avoid excessive filtering
   - Searches across: staff name (supports multiple words)

3. Location dropdown:
   - Loads from Locations table
   - Filters Sublocation dropdown on change
   - Default: user's default location

4. Sublocation dropdown:
   - Filtered by selected Location
   - Triggers full data reload on change
   - Default: first sublocation in location

5. Department dropdown:
   - Options: "All Departments" + departments from data
   - Special options at bottom:
     - "Agency Workers"
     - "Shifts From Other Locations"
   - Filters visible shifts

6. Status dropdown:
   - Options: All Status, Present, Scheduled, Worked, Absent, Late
   - Status logic:
     - Present: Clocked in, NOT clocked out
     - Scheduled: NOT clocked in, shift start time > now
     - Worked: Clocked in AND clocked out
     - Absent: Shift status = Absent
     - Late: NOT clocked in, shift start time <= now, NOT marked absent

7. Shift Type dropdown:
   - Options: All, Day, Night, Sleep In
   - Filters by shift type field

8. Collapse All button:
   - Collapses all department sections
   - Icon: chevron up

9. Expand All button:
   - Expands all department sections
   - Icon: chevron down

10. Refresh button:
    - Reload icon (↻)
    - Reloads all data for current date
    - Spinning animation while loading

11. Active filter indicators:
    - Show filter chips/tags below the bar when filters active
    - Click X on chip to remove that filter
    - "Clear all filters" link

State:
- All filter values in parent state or URL params
- Communicate via callbacks: onFilterChange({ search, department, status, shiftType })
```

---

## PROMPT 4: Statistics Cards

**User Story:**
> As a shift supervisor, I need to see at-a-glance statistics showing how many staff are on shift and total rostered hours, so that I can quickly assess staffing levels for the day.

**Prompt:**
```
Create statistics cards component at src/components/daily/DailyStats.tsx.

Requirements:

1. Layout (two cards side by side):
   ```
   ┌──────────────────┐  ┌──────────────────┐
   │       12         │  │      96.5        │
   │  Staff on Shifts │  │ Total Rostered   │
   │                  │  │     Hours        │
   └──────────────────┘  └──────────────────┘
   ```

2. Staff on Shifts card:
   - Large number: count of unique staff with shifts today
   - Label below: "Staff on Shifts"
   - Calculation: Count distinct staff members (exclude unassigned)
   - Icon: person icon in teal
   - Respects current filters

3. Total Rostered Hours card:
   - Large number: sum of all shift hours
   - Label below: "Total Rostered Hours"
   - Calculation: Sum of (end time - start time - break) for all shifts
   - Format: show 1 decimal place (e.g., 96.5)
   - Icon: clock icon in teal
   - Respects current filters

4. Additional stats (optional, smaller):
   - Agency Hours: hours covered by agency workers
   - Present: count currently clocked in
   - Late: count not clocked in but should be

5. Visual styling:
   - White background cards
   - Subtle shadow
   - Border radius: 5px
   - Number: large (24px), bold, teal colour
   - Label: smaller (12px), grey

6. Real-time updates:
   - Recalculate when filters change
   - Recalculate when shifts data updates
   - Loading skeleton while calculating

Props:
- shifts: Shift[] (filtered list)
- isLoading: boolean
```

---

## PROMPT 5: Department Section Component

**User Story:**
> As a shift supervisor, I need shifts grouped by department with collapsible sections, so that I can focus on specific teams and easily navigate through a large number of shifts.

**Prompt:**
```
Create a collapsible department section component at src/components/daily/DepartmentSection.tsx.

Requirements:

1. Department header:
   ```
   ┌─────────────────────────────────────────────────┐
   │ ▼ Residential Care                         (5) │
   └─────────────────────────────────────────────────┘
   ```
   - Chevron icon: ▼ expanded, ► collapsed
   - Department name: bold text
   - Staff count badge: "(5)" in grey pill

2. Collapse/expand behaviour:
   - Click anywhere on header to toggle
   - Smooth animation (height transition)
   - Remember state per department

3. Shift cards container:
   - Vertical list of ShiftCard components
   - Padding between cards
   - Hidden when collapsed

4. Empty state:
   - If department has no shifts matching filters
   - Hide the entire section OR show "No shifts match filters"

5. Special sections:
   - "Agency Workers" section for agency shifts
   - "Shifts From Other Locations" section
   - These have distinct styling (different left border colour)

6. Visual styling:
   - Header: light grey background (#f8f9fa)
   - Left border: teal for regular, orange for agency
   - Hover effect on header
   - Shadow on expand

7. Accessibility:
   - aria-expanded attribute
   - Keyboard: Enter/Space to toggle
   - Focus visible indicator

Props:
- department: { id: string, name: string }
- shifts: Shift[]
- isExpanded: boolean
- onToggle: () => void
- staffCount: number
```

---

## PROMPT 6: Shift Card Component

**User Story:**
> As a shift supervisor, I need to see comprehensive shift information in a clear card layout showing staff details, times, activities, and status, so that I can quickly understand each shift at a glance.

**Prompt:**
```
Create a shift card component at src/components/daily/ShiftCard.tsx.

Requirements:

1. Card layout (horizontal):
   ```
   ┌────────────────────────────────────────────────────────────────────────────────┐
   │ [AS] Alison Smith     │ 07:00-15:00 │ 8h 0m │ Standard Care │ 1h 0m │ Day  │ ✏️ 👤 │
   │      Senior Carer     │             │       │               │       │      │       │
   │      [LEAD] [ACT-UP]  │             │       │               │       │      │       │
   └────────────────────────────────────────────────────────────────────────────────┘
   ```

2. Staff info section (left, 300px):
   - Avatar circle with initials (e.g., "AS")
   - Staff name (bold)
   - Job title (smaller, grey)
   - Badges row:
     - LEAD badge (orange) if shift leader
     - ACT-UP MGR badge (purple) if acting up
   - Teal right border accent

3. Shift Time column (180px):
   - Format: "07:00-15:00"
   - If overnight, show indicator
   - Header label: "Shift Time"

4. Working Hours column (155px):
   - Calculated: end - start - break
   - Format: "8h 0m" or "7h 30m"
   - Header label: "Working Hours"

5. Activities column (250px):
   - Show shift activity name
   - Truncate if too long, tooltip for full text
   - Header label: "Activities"

6. Break column (100px):
   - Format: "1 hour 0 min" or "30 min"
   - Header label: "Break"

7. Shift Type column (100px):
   - Pill badge with type name
   - Colours:
     - Day: #FCE4B4 (yellow)
     - Night: #BEDAE3 (blue)
     - Sleep In: #D3C7E6 (purple)
   - Header label: "Type"

8. Actions column (260px):
   - Edit button (blue): opens edit flyout
   - Shift Leader button (green): quick assign as leader
   - More actions dropdown (optional)
   - Header label: "Actions"

9. Clock-in/out status indicator:
   - Show coloured dot or icon based on status
   - Green: Present (clocked in)
   - Blue: Scheduled (upcoming)
   - Orange: Late (should have started)
   - Grey: Worked (completed)
   - Red: Absent

10. Row styling:
    - White background
    - Subtle shadow
    - Border radius: 5px
    - Hover: slight elevation
    - Click: opens edit flyout

Props:
- shift: Shift
- onEdit: (shiftId: string) => void
- onAssignLeader: (shiftId: string) => void
```

---

## PROMPT 7: Attendance Status Logic

**User Story:**
> As a shift supervisor, I need to see real-time attendance status for each shift (Present, Late, Absent, Scheduled, Worked), so that I can monitor who is on site and follow up with missing staff.

**Prompt:**
```
Create attendance status utilities and display components.

FILE 1: src/utils/attendanceStatus.ts

Status calculation logic:
```typescript
type AttendanceStatus = 'present' | 'scheduled' | 'worked' | 'absent' | 'late';

function getAttendanceStatus(shift: Shift): AttendanceStatus {
  const now = new Date();
  const shiftStart = new Date(shift.cp365_shiftstarttime);
  const clockedIn = shift.cp365_clockedin;
  const clockedOut = shift.cp365_clockedout;
  const isAbsent = shift.cp365_shiftstatus === ShiftStatus.Absent;

  // Absent: explicitly marked
  if (isAbsent) return 'absent';

  // Worked: completed shift (clocked in AND out)
  if (clockedIn && clockedOut) return 'worked';

  // Present: currently working (clocked in, not out)
  if (clockedIn && !clockedOut) return 'present';

  // Late: should have started but hasn't clocked in
  if (!clockedIn && shiftStart <= now) return 'late';

  // Scheduled: shift hasn't started yet
  if (!clockedIn && shiftStart > now) return 'scheduled';

  return 'scheduled';
}
```

FILE 2: src/components/daily/AttendanceStatusBadge.tsx

Visual badge component:
- Present: Green background, "Present" or clock-in time
- Scheduled: Blue background, "Scheduled"
- Worked: Grey background, "Worked" + clock-out time
- Absent: Red background, "Absent"
- Late: Orange background, "Late" + minutes late

Badge details:
```
┌─────────────────┐
│ ● Present       │  → Green dot + text
│   In: 06:58     │  → Clock-in time below
└─────────────────┘
```

Display clock times when available:
- Clocked In: show time "In: 06:58"
- Clocked Out: show time "Out: 15:02"
- If late: show "Late by 12 min"

Props:
- status: AttendanceStatus
- clockedIn?: Date
- clockedOut?: Date
- shiftStartTime: Date
```

---

## PROMPT 8: Edit Shift Flyout for Daily View

**User Story:**
> As a shift supervisor, I need to quickly edit shift details from the daily view, so that I can adjust times, change activities, or update shift properties without leaving the page.

**Prompt:**
```
Create or extend the ShiftFlyout component for Daily View editing at src/components/daily/DailyShiftFlyout.tsx.

This is similar to the rota view flyout but optimised for day-of operations.

Requirements:

1. Trigger:
   - Click Edit button on shift card
   - Click anywhere on shift card row

2. Flyout content:

   SECTION 1: Staff Info (read-only display)
   - Avatar, name, job title
   - Current status badge

   SECTION 2: Shift Reference
   - Dropdown to change shift reference
   - Shows time preview when selected

   SECTION 3: Times
   - Start Hour dropdown (00-23)
   - Start Minute dropdown (00, 15, 30, 45)
   - End Hour dropdown (00-23)
   - End Minute dropdown (00, 15, 30, 45)
   - Working hours display (calculated)

   SECTION 4: Activity
   - Dropdown for shift activity

   SECTION 5: Break
   - Duration input (minutes)

   SECTION 6: Options (checkboxes)
   - Sleep In
   - Overtime
   - Shift Leader
   - Act Up

   SECTION 7: Notes
   - Text area for shift notes

3. Footer buttons:
   - Delete (red) - with confirmation
   - Cancel (outline)
   - Save (teal primary)

4. Quick actions (top of flyout):
   - "Mark as Absent" button
   - "Assign Shift Leader" toggle

5. Validation:
   - End time must be after start time (or handle overnight)
   - Required fields highlighted

6. On save:
   - Update shift in Dataverse
   - Refresh shift list
   - Close flyout
   - Show success toast

7. Styling:
   - Slide in from right
   - Width: 400px
   - Overlay behind
   - Close on overlay click or Escape

Props:
- shift: Shift | null
- isOpen: boolean
- onClose: () => void
- onSave: (updatedShift: Shift) => void
```

---

## PROMPT 9: Assign Shift Leader Quick Action

**User Story:**
> As a shift supervisor, I need to quickly assign or change the shift leader for any shift, so that I can ensure there's always clear leadership during each shift.

**Prompt:**
```
Create a quick action for assigning shift leader from the Daily View.

Requirements:

1. Shift Leader button on each shift card:
   - Icon: person with star or crown
   - Text: "Leader" or "Assign Lead"
   - Green colour (#2e7d32)
   - Shows current state (filled if already leader)

2. Click behaviour - opens modal:
   ```
   ┌─────────────────────────────────────┐
   │ Assign Shift Leader                 │
   ├─────────────────────────────────────┤
   │ Current shift: 07:00-15:00          │
   │ Staff: Alison Smith                 │
   │                                     │
   │ ☐ Make Shift Leader                 │
   │ ☐ Act Up (temporary manager)        │
   │                                     │
   │ This will notify the staff member.  │
   │                                     │
   │         [Cancel]  [Confirm]         │
   └─────────────────────────────────────┘
   ```

3. Checkboxes:
   - Shift Leader: sets cp365_shiftleader = true
   - Act Up: sets cp365_actup = true
   - Can select both

4. On confirm:
   - Update shift record in Dataverse
   - Optionally send notification
   - Update UI immediately (optimistic update)
   - Show success toast

5. Already a leader:
   - Button shows "Lead ✓" with filled state
   - Click to open modal with checkboxes pre-checked
   - Can uncheck to remove leader status

6. Badge update:
   - After assigning, LEAD badge appears on shift card
   - ACT-UP MGR badge if acting up

7. Validation:
   - Only one shift leader per time slot? (configurable)
   - Warning if another leader exists for overlapping time
```

---

## PROMPT 10: Agency Workers Section

**User Story:**
> As a shift supervisor, I need to see agency worker shifts in a separate section, so that I can easily identify and manage temporary staff coverage.

**Prompt:**
```
Create an Agency Workers section for the Daily View.

Requirements:

1. Section position:
   - Shows when "All Departments" or "Agency Workers" selected
   - Appears after regular department sections
   - Collapsible like other departments

2. Section header:
   - Title: "Agency Workers"
   - Orange left border (distinct from teal)
   - Badge showing count of agency shifts
   - Agency icon

3. Agency shift cards:
   - Same layout as regular shift cards
   - BUT shows agency worker name instead of staff member
   - Shows agency company name
   - Different avatar colour (orange background)

4. Agency worker info:
   ```
   ┌────────────────────────────────────────────────────────────────┐
   │ [JD] John Doe (Agency)    │ 07:00-15:00 │ 8h │ Care │ Day │ ✏️ │
   │      ABC Care Agency      │             │    │      │     │    │
   └────────────────────────────────────────────────────────────────┘
   ```

5. Data source:
   - Filter shifts where cp365_agencyworkerid is not null
   - Join with Agency Workers table for worker details
   - Join with Agencies table for agency name

6. Visual distinction:
   - Card border: orange (#ff9800)
   - Avatar background: orange
   - "AGENCY" badge on card

7. Actions:
   - Edit (limited - can change times/activity)
   - Cannot assign as shift leader
   - Cannot change to regular staff

8. Stats:
   - Agency hours included in total stats
   - Optional: separate "Agency Hours" stat card
```

---

## PROMPT 11: Shifts From Other Locations

**User Story:**
> As a shift supervisor, I need to see when staff are scheduled at other locations, so that I understand their full schedule and avoid conflicts.

**Prompt:**
```
Create a section showing shifts from other locations in Daily View.

Requirements:

1. Section trigger:
   - Toggle in filter bar OR
   - Department filter: "Shifts From Other Locations"
   - Hidden by default (opt-in)

2. Data fetching:
   - Call GetOtherShiftsbyStaffMemberandDate flow
   - Pass: staff IDs visible in current view, selected date
   - Returns shifts from other sublocations

3. Section header:
   - Title: "Shifts From Other Locations"
   - Grey left border
   - Location icon
   - Collapsible

4. Shift card differences:
   - Read-only (cannot edit)
   - Shows location name prominently
   - Shows sublocation
   - Greyed out / faded styling

5. Card layout:
   ```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ [AS] Alison Smith         │ 07:00-15:00 │ 8h │ 📍 Care Home B        │
   │      Working at:          │             │    │    Residential Wing   │
   │      Care Home B          │             │    │                       │
   └────────────────────────────────────────────────────────────────────────┘
   ```

6. Visual styling:
   - Background: light grey (#f5f5f5)
   - Opacity: 70%
   - Border: dashed grey
   - Location badge: prominent

7. Interaction:
   - Click shows info tooltip (not editable)
   - Link to view in other location's rota

8. Purpose:
   - Helps identify staff working multiple sites
   - Shows why certain staff aren't available
   - Prevents accidental double-booking
```

---

## PROMPT 12: PDF Export Feature

**User Story:**
> As a shift supervisor, I need to export the daily rota as a PDF document, so that I can print it for staff notice boards or share it with managers who don't have system access.

**Prompt:**
```
Create PDF export functionality for the Daily View.

Requirements:

1. Export button in header:
   - Icon: download or PDF icon
   - Text: "Export" or "PDF"
   - Position: right side of header

2. Click behaviour:
   - Show loading indicator
   - Call GeneratePDFDocument flow
   - Pass: date, sublocation ID, filter settings

3. PDF content (generated server-side):
   - Header: "Daily Rota - [Date]"
   - Subtitle: "[Location] - [Sublocation]"
   - Statistics summary
   - Table of all shifts grouped by department
   - Columns: Staff, Time, Hours, Activity, Type, Status

4. Success modal:
   ```
   ┌─────────────────────────────────────┐
   │ ✓ Export Successful                 │
   ├─────────────────────────────────────┤
   │ Your data has been exported.        │
   │                                     │
   │ File name: DailyRota_31Dec2024.pdf  │
   │ Location: Downloads folder          │
   │                                     │
   │ Would you like to open the file?    │
   │                                     │
   │         [Close]  [Open File]        │
   └─────────────────────────────────────┘
   ```

5. Open File button:
   - Triggers download of the PDF
   - Uses the URL returned from flow

6. Error handling:
   - If generation fails, show error message
   - Retry button
   - "Generation may take a moment for large rotas"

7. Alternative: Client-side PDF:
   - Use library like jsPDF or react-pdf
   - Generate PDF in browser
   - Faster but less formatting control
   - Good for simple layouts

8. Print option:
   - Add "Print" button alongside Export
   - Opens browser print dialog
   - Print-optimised CSS styles
```

---

## PROMPT 13: Real-Time Status Updates

**User Story:**
> As a shift supervisor, I need the daily view to update in real-time when staff clock in or out, so that I always see current attendance without refreshing the page.

**Prompt:**
```
Implement real-time or near-real-time status updates for Daily View.

Requirements:

1. Auto-refresh mechanism:
   - Poll for updates every 60 seconds
   - OR use WebSocket/SignalR if available
   - Only fetch changed data, not full reload

2. Visual update indicators:
   - When a shift status changes:
     - Brief highlight animation on the card
     - Status badge updates
     - Stats recalculate

3. Last updated timestamp:
   - Show "Last updated: 2 minutes ago"
   - Updates every minute
   - Click to manual refresh

4. Optimistic updates:
   - If supervisor marks someone absent
   - UI updates immediately
   - Sync with server in background

5. Conflict handling:
   - If data changed on server while viewing
   - Show notification: "Data has been updated"
   - Option to refresh

6. Connection status:
   - Show indicator if offline
   - Queue actions for when reconnected
   - "You're offline - changes will sync when connected"

7. Performance:
   - Only poll on active tab
   - Pause when page hidden
   - Resume when visible

8. Implementation options:
   Option A: Simple polling
   ```typescript
   useEffect(() => {
     const interval = setInterval(fetchShifts, 60000);
     return () => clearInterval(interval);
   }, []);
   ```
   
   Option B: TanStack Query refetch
   ```typescript
   useQuery({
     queryKey: ['dailyShifts', date],
     queryFn: fetchShifts,
     refetchInterval: 60000,
   });
   ```
```

---

## PROMPT 14: Mobile Responsive Daily View

**User Story:**
> As a shift supervisor using a tablet or phone on the floor, I need the daily view to work well on smaller screens, so that I can check attendance and manage shifts while walking around.

**Prompt:**
```
Make the Daily View fully responsive for mobile devices.

Requirements:

1. Breakpoints:
   - Desktop: > 1024px (full layout)
   - Tablet: 768px - 1024px (condensed)
   - Mobile: < 768px (stacked)

2. Mobile header:
   - Hamburger menu for navigation
   - Date navigation below title
   - Filters in collapsible panel

3. Mobile filter bar:
   - Hidden by default
   - "Filters" button to expand
   - Stacked dropdowns when expanded
   - Close button

4. Mobile shift cards:
   - Stacked layout instead of horizontal
   ```
   ┌─────────────────────┐
   │ [AS] Alison Smith   │
   │ Senior Carer        │
   │ [LEAD]              │
   ├─────────────────────┤
   │ ⏰ 07:00-15:00      │
   │ 📋 Standard Care    │
   │ ☕ 1h break         │
   │ 🌞 Day Shift        │
   ├─────────────────────┤
   │ Status: Present ●   │
   │ In: 06:58           │
   ├─────────────────────┤
   │ [Edit] [Leader]     │
   └─────────────────────┘
   ```

5. Mobile stats:
   - Full width cards
   - Stacked vertically
   - Smaller numbers

6. Touch interactions:
   - Swipe to expand/collapse departments
   - Tap card to view details
   - Pull to refresh

7. Mobile flyout:
   - Full screen on mobile
   - Bottom sheet style
   - Large touch targets

8. Department sections:
   - Larger tap targets for collapse/expand
   - Sticky headers while scrolling

9. Performance:
   - Lazy load department contents
   - Virtual scrolling for long lists
   - Reduced animations

Test on:
- iPhone SE (smallest)
- iPhone 14 Pro
- iPad
- Android tablets
```

---

## USAGE ORDER

**Recommended build sequence:**

1. **Prompt 1**: Page structure (skeleton)
2. **Prompt 2**: Date navigation
3. **Prompt 3**: Filter bar
4. **Prompt 4**: Statistics cards
5. **Prompt 5**: Department sections
6. **Prompt 6**: Shift cards
7. **Prompt 7**: Attendance status
8. **Prompt 8**: Edit flyout
9. **Prompt 9**: Shift leader action
10. **Prompt 10**: Agency workers
11. **Prompt 11**: Other locations
12. **Prompt 12**: PDF export
13. **Prompt 13**: Real-time updates
14. **Prompt 14**: Mobile responsive

**Dependencies:**
- Prompts 2-4 can be done in parallel
- Prompt 6 depends on Prompt 7
- Prompt 8 depends on Prompt 6
- Prompts 10-11 can be done after core features

---

## TESTING CHECKLIST

After building, verify:

- [ ] Date navigation works (prev/next/picker)
- [ ] All filters work correctly
- [ ] Status filter logic matches spec
- [ ] Department sections collapse/expand
- [ ] Shift cards show all required info
- [ ] Edit flyout opens and saves
- [ ] Shift leader assignment works
- [ ] Agency workers section shows
- [ ] PDF export generates file
- [ ] Mobile view is usable
- [ ] Stats calculate correctly
- [ ] Page loads without errors

