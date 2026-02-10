# CarePoint 365 - Domiciliary & Supported Living Rostering

This specification defines the features required to extend the existing CarePoint 365 rota application to support **domiciliary care** and **supported living** rostering. The primary paradigm shift is from staff-centric scheduling (care homes) to **service user-centric scheduling** where staff are assigned to visit clients.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Differences from Residential Care](#key-differences-from-residential-care)
3. [Architecture & Data Layer](#architecture--data-layer)
4. [Phase 1: Core Data Models & Types](#phase-1-core-data-models--types)
5. [Phase 2: Service User Rota View](#phase-2-service-user-rota-view)
6. [Phase 3: Staff Availability Management](#phase-3-staff-availability-management)
7. [Phase 4: Visit Management](#phase-4-visit-management)
8. [Phase 5: Care Activities & Tasks](#phase-5-care-activities--tasks)
9. [Phase 6: Smart Matching & Assignment](#phase-6-smart-matching--assignment)
10. [Phase 7: Geographic & Round Planning](#phase-7-geographic--round-planning)
11. [Phase 8: Staff View & Travel](#phase-8-staff-view--travel)
12. [Dummy Data Generation](#dummy-data-generation)
13. [Data Model Reference](#data-model-reference)

---

## Overview

### Context

Domiciliary care and supported living differ fundamentally from residential care:

| Aspect | Residential Care | Domiciliary/Supported Living |
|--------|------------------|------------------------------|
| **Primary Entity** | Shifts at location | Visits to service users |
| **Staff Pattern** | Shifts at fixed location | Travel between multiple clients |
| **Scheduling Focus** | Coverage of location | Coverage of service user needs |
| **Time Allocation** | Fixed shift times | Variable visit durations |
| **Geographic Factor** | Single location | Multiple addresses, travel time |
| **Care Activities** | Location-based tasks | Service user-specific care plans |

### Core Use Cases

1. **Service User Rota View**: Display service users with their scheduled visits and assigned carers
2. **Staff Availability**: Staff provide their weekly availability which informs assignment
3. **Visit Scheduling**: Create visits based on service user care plans with required activities
4. **Smart Matching**: Assign staff to visits based on availability, skills, continuity, and geography
5. **Round Planning**: Group visits geographically to optimise travel time
6. **Staff Journey View**: Show a carer's daily schedule with travel between visits

---

## Key Differences from Residential Care

### Domiciliary Care
- Short visits (15 mins - 2 hours) multiple times per day
- Task-focused: personal care, medication, meal prep
- Geographic routing critical for efficiency
- Multiple service users visited per day
- Check-in/check-out visit verification

### Supported Living
- Longer shifts (often full shifts, not visits)
- Focus on independence and skill development
- Community integration activities
- Often shared accommodation with multiple service users
- More consistent staff-client relationships

---

## Architecture & Data Layer

### React Best Practices

All components must follow these React best practices:

1. **Functional Components**: Use function components with hooks exclusively
2. **TypeScript**: Strict typing for all props, state, and API responses
3. **Custom Hooks**: Extract reusable logic into custom hooks (e.g., `useVisits`, `useServiceUsers`)
4. **Component Composition**: Build complex UIs from small, focused components
5. **State Management**: Use Zustand for global state, React Query for server state
6. **Memoization**: Use `useMemo` and `useCallback` for expensive computations
7. **Error Boundaries**: Wrap feature areas in error boundaries
8. **Loading States**: Skeleton loaders for async operations
9. **Accessibility**: ARIA labels, keyboard navigation, focus management

### Data Source Abstraction

```typescript
// src/services/dataSource.ts

export type DataSourceType = 'dummy' | 'dataverse';

interface DataSourceConfig {
  type: DataSourceType;
  dataverseUrl?: string;
  dataverseToken?: string;
}

// Environment-based configuration
const config: DataSourceConfig = {
  type: (import.meta.env.VITE_DATA_SOURCE as DataSourceType) || 'dummy',
  dataverseUrl: import.meta.env.VITE_DATAVERSE_URL,
  dataverseToken: import.meta.env.VITE_DATAVERSE_TOKEN,
};

export const dataSource = config;
```

### Repository Pattern

```typescript
// src/repositories/baseRepository.ts

export interface Repository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  query(filter: Record<string, unknown>): Promise<T[]>;
}

// Each entity will have:
// - src/repositories/dummy/[entity]Repository.ts (uses dummy data)
// - src/repositories/dataverse/[entity]Repository.ts (uses Dataverse API)
// - src/repositories/[entity]Repository.ts (factory that selects based on config)
```

---

## Phase 1: Core Data Models & Types

### PROMPT 1.1: Create Type Definitions

```
Create the core TypeScript types for domiciliary/supported living rostering.

FILE: src/types/domiciliary.ts

Requirements:

1. Service User with visit scheduling fields:
```typescript
// Extends existing Service User with domiciliary-specific fields
interface DomiciliaryServiceUser {
  cp365_serviceuserid: string;
  cp365_fullname: string;
  cp365_preferredname?: string;
  cp365_dateofbirth?: Date;
  cp365_photo?: string;
  
  // Address for visit location
  cp365_currentaddress: string;
  cp365_postcode: string;
  cp365_latitude?: number;
  cp365_longitude?: number;
  
  // Care requirements
  cp365_fundingtype?: FundingType;
  cp365_weeklyfundedhours?: number;
  cp365_careplannotes?: string;
  
  // Preferences
  cp365_preferredgender?: 'male' | 'female' | 'no_preference';
  cp365_keysafelocation?: string;
  cp365_accessnotes?: string;
  
  // Status
  statecode: number;
  cp365_admissiondate?: Date;
  cp365_dischargedate?: Date;
}

type FundingType = 'local_authority' | 'nhs_chc' | 'private' | 'mixed';
```

2. Visit (the core scheduling entity):
```typescript
interface Visit {
  cp365_visitid: string;
  cp365_visitname: string;
  
  // Service User
  cp365_serviceuserid: string;
  cp365_serviceuser?: DomiciliaryServiceUser;
  
  // Timing
  cp365_visitdate: Date;
  cp365_scheduledstarttime: string; // HH:mm format
  cp365_scheduledendtime: string;
  cp365_durationminutes: number;
  
  // Assignment
  cp365_staffmemberid?: string;
  cp365_staffmember?: StaffMember;
  cp365_agencyworkerid?: string;
  
  // Status
  cp365_visitstatus: VisitStatus;
  cp365_actualstarttime?: string;
  cp365_actualendtime?: string;
  
  // Verification
  cp365_checkintime?: Date;
  cp365_checkouttime?: Date;
  cp365_checkinlatitude?: number;
  cp365_checkinlongitude?: number;
  
  // Visit type
  cp365_visittypecode: VisitType;
  cp365_isrecurring: boolean;
  cp365_recurrencepatternid?: string;
  
  // Round/Run
  cp365_roundid?: string;
  cp365_sequenceorder?: number;
  
  // Notes
  cp365_visitnotes?: string;
  cp365_cancellationreason?: string;
  
  statecode: number;
  createdon: Date;
  modifiedon: Date;
}

type VisitStatus = 
  | 'scheduled'      // Visit planned
  | 'assigned'       // Staff member assigned
  | 'in_progress'    // Carer has checked in
  | 'completed'      // Carer has checked out
  | 'cancelled'      // Visit cancelled
  | 'missed'         // Visit not completed
  | 'late';          // Started after scheduled time

type VisitType = 
  | 'morning'
  | 'lunch'
  | 'afternoon'
  | 'tea'
  | 'evening'
  | 'bedtime'
  | 'night'
  | 'waking_night'
  | 'sleep_in'
  | 'emergency'
  | 'assessment'
  | 'review';
```

3. Visit Activity (tasks to perform during visit):
```typescript
interface VisitActivity {
  cp365_visitactivityid: string;
  cp365_visitid: string;
  
  // Activity details
  cp365_activityname: string;
  cp365_activitydescription?: string;
  cp365_activitycategorycode: ActivityCategory;
  
  // Completion
  cp365_iscompleted: boolean;
  cp365_completedtime?: Date;
  cp365_completednotes?: string;
  
  // Requirements
  cp365_isrequired: boolean;
  cp365_estimatedminutes?: number;
  cp365_requirestwocarer: boolean;
  
  // Medication specific
  cp365_medicationid?: string;
  cp365_dosage?: string;
  
  // Display
  cp365_displayorder: number;
  
  statecode: number;
}

type ActivityCategory =
  | 'personal_care'      // Washing, dressing, toileting
  | 'medication'         // Medication administration
  | 'meal_preparation'   // Cooking, preparing food
  | 'meal_support'       // Assistance with eating
  | 'mobility'           // Moving, transfers
  | 'domestic'           // Cleaning, laundry
  | 'companionship'      // Social interaction
  | 'community'          // Outings, appointments
  | 'health_monitoring'  // Observations, vital signs
  | 'night_check'        // Night-time welfare checks
  | 'other';
```

4. Staff Availability:
```typescript
interface StaffAvailability {
  cp365_staffavailabilityid: string;
  cp365_staffmemberid: string;
  
  // Day of week (1=Mon, 7=Sun) or specific date
  cp365_dayofweek?: number;
  cp365_specificdate?: Date;
  
  // Availability window
  cp365_availablefrom: string; // HH:mm
  cp365_availableto: string;   // HH:mm
  
  // Type
  cp365_availabilitytype: AvailabilityType;
  cp365_ispreferredtime: boolean;
  
  // Recurring
  cp365_isrecurring: boolean;
  cp365_effectivefrom?: Date;
  cp365_effectiveto?: Date;
  
  statecode: number;
}

type AvailabilityType =
  | 'available'
  | 'unavailable'
  | 'preferred'
  | 'emergency_only';
```

5. Service User Staff Relationship (for continuity tracking):
```typescript
interface ServiceUserStaffRelationship {
  cp365_relationshipid: string;
  cp365_serviceuserid: string;
  cp365_staffmemberid: string;
  
  // Relationship quality
  cp365_relationshipstatus: RelationshipStatus;
  cp365_ispreferredcarer: boolean;
  cp365_isexcluded: boolean;
  cp365_exclusionreason?: string;
  
  // History
  cp365_firstvisitdate?: Date;
  cp365_lastvisitdate?: Date;
  cp365_totalvisits: number;
  
  // Continuity score (calculated)
  cp365_continuityscore?: number;
  
  statecode: number;
}

type RelationshipStatus =
  | 'active'
  | 'preferred'
  | 'excluded'
  | 'inactive';
```

6. Round/Run (geographic grouping):
```typescript
interface Round {
  cp365_roundid: string;
  cp365_roundname: string;
  
  // Timing
  cp365_roundtype: VisitType; // morning, lunch, etc.
  cp365_starttime: string;
  cp365_endtime: string;
  
  // Assignment
  cp365_staffmemberid?: string;
  cp365_istemplate: boolean;
  
  // Geographic
  cp365_areaid?: string;
  cp365_estimatedtravelminutes?: number;
  
  // Statistics
  cp365_visitcount: number;
  cp365_totaldurationminutes: number;
  
  statecode: number;
}
```

7. Export all types and create type guards
8. Follow existing CarePoint 365 field naming conventions (cp365_ prefix)
9. Include JSDoc comments explaining each field's purpose
```

---

### PROMPT 1.2: Create Repository Factory

```
Create the repository factory pattern to switch between dummy and Dataverse data sources.

FILE 1: src/repositories/repositoryFactory.ts

```typescript
import { dataSource } from '../services/dataSource';
import type { Repository } from './baseRepository';

export function createRepository<T>(
  dummyRepository: Repository<T>,
  dataverseRepository: Repository<T>
): Repository<T> {
  if (dataSource.type === 'dataverse') {
    return dataverseRepository;
  }
  return dummyRepository;
}
```

FILE 2: src/repositories/visitRepository.ts

```typescript
import { createRepository } from './repositoryFactory';
import { DummyVisitRepository } from './dummy/visitRepository';
import { DataverseVisitRepository } from './dataverse/visitRepository';
import type { Visit } from '../types/domiciliary';
import type { Repository } from './baseRepository';

// Extended repository interface with visit-specific methods
export interface VisitRepository extends Repository<Visit> {
  getByServiceUser(serviceUserId: string, dateRange: { start: Date; end: Date }): Promise<Visit[]>;
  getByStaffMember(staffMemberId: string, date: Date): Promise<Visit[]>;
  getUnassigned(dateRange: { start: Date; end: Date }): Promise<Visit[]>;
  getByRound(roundId: string): Promise<Visit[]>;
}

export const visitRepository: VisitRepository = createRepository(
  new DummyVisitRepository(),
  new DataverseVisitRepository()
) as VisitRepository;
```

FILE 3: Create similar repository files for:
- serviceUserRepository.ts
- staffAvailabilityRepository.ts
- visitActivityRepository.ts
- roundRepository.ts
- serviceUserStaffRelationshipRepository.ts

Requirements:
1. Each repository should extend the base Repository interface with entity-specific methods
2. Use the factory pattern consistently
3. Add comprehensive JSDoc comments
4. Export a singleton instance for each repository
```

---

### PROMPT 1.3: Create Dummy Data Repository Implementation

```
Create the dummy data repository for Visits with realistic test data.

FILE 1: src/repositories/dummy/visitRepository.ts

Requirements:

1. Implement the VisitRepository interface
2. Store data in memory with a Map<string, Visit>
3. Initialize with dummy data on first access (lazy loading)
4. Implement all CRUD operations
5. Implement query methods:
   - getByServiceUser: Filter visits by service user and date range
   - getByStaffMember: Get all visits for a staff member on a date
   - getUnassigned: Get visits without staff assignment
   - getByRound: Get visits in a specific round

6. Generate realistic dummy data:
   - 15-20 service users with addresses
   - 10-12 staff members with varied availability
   - Visits spanning a 4-week period
   - Mix of visit types (morning, lunch, tea, evening, bedtime)
   - Mix of assigned and unassigned visits
   - Include recurring visit patterns
   - Realistic visit durations (30 mins, 45 mins, 60 mins)

Example implementation structure:
```typescript
export class DummyVisitRepository implements VisitRepository {
  private visits: Map<string, Visit> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.generateDummyData();
      this.initialized = true;
    }
  }

  private async generateDummyData(): Promise<void> {
    // Generate visits for each service user
    // Use the dummy service users and staff members
    // Create realistic visit patterns
  }

  async getAll(): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values());
  }

  async getByServiceUser(
    serviceUserId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(v => 
      v.cp365_serviceuserid === serviceUserId &&
      new Date(v.cp365_visitdate) >= dateRange.start &&
      new Date(v.cp365_visitdate) <= dateRange.end
    );
  }

  // ... implement other methods
}
```

7. Use date-fns for date manipulation
8. Generate UUIDs for IDs using crypto.randomUUID()
9. Make data deterministic using a seed for reproducibility during development
```

---

## Phase 2: Service User Rota View

### PROMPT 2.1: View Mode Selector (Extended)

```
Extend the existing ViewModeSelector component to include the service user view option.

FILE: src/components/rota/ViewModeSelector.tsx (modify existing)

Requirements:

1. Add new view mode option:
```typescript
type ViewMode = 'team' | 'people' | 'shiftReference' | 'serviceUser';
```

2. Update dropdown options:
   - View by Team (existing)
   - View by People (existing)
   - View by Shift Reference (existing)
   - View by Service User (NEW) - default when domiciliary mode active

3. Add care type selector (determines which views are available):
```typescript
type CareType = 'residential' | 'domiciliary' | 'supported_living';
```
   - Residential: Team, People, Shift Reference views
   - Domiciliary: Service User, Staff, Round views
   - Supported Living: Service User, Staff, Team views

4. Store care type in localStorage and URL params
5. Show appropriate views based on care type selection
6. Trigger view refresh on mode change
```

---

### PROMPT 2.2: Service User Row Component

```
Create the service user row component for the domiciliary rota view.

FILE: src/components/rota/domiciliary/ServiceUserRow.tsx

Requirements:

1. Layout (service user info + visit cells):
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Photo] John Smith          │ Mon    │ Tue    │ Wed    │ Thu    │ Fri    │ Sat   │
│         24 Oak Lane         │┌──────┐│┌──────┐│┌──────┐│        │┌──────┐│       │
│         ★★★ Funded: 15h/wk  ││08:00 │││08:00 │││08:00 ││        ││08:00 ││       │
│         Needs: 2 carers AM  ││Sarah │││Sarah │││Sarah ││        ││Sarah ││       │
│                             │└──────┘│└──────┘│└──────┘│        │└──────┘│       │
│                             │┌──────┐│┌──────┐│        │        │        │       │
│                             ││18:00 │││18:00 ││        │        │        │       │
│                             ││Mike  │││Mike  ││        │        │        │       │
│                             │└──────┘│└──────┘│        │        │        │       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

2. Service User info column (left, fixed 220px):
   - Photo/avatar with initials fallback
   - Service user name (bold, clickable)
   - Address (first line, grey, smaller)
   - Funding indicator: stars or badge
   - Weekly funded hours: "Funded: Xh/wk"
   - Special requirements badges (e.g., "2 carers", "Key safe")

3. Visit cells (one per day):
   - Stack multiple visits vertically if more than one per day
   - Each visit shows:
     - Start time (bold): "08:00"
     - Assigned carer name or "UNASSIGNED" in red
     - Duration indicator (e.g., "45m")
   - Colour coding:
     - Assigned: Light blue (#E3F2FD)
     - Unassigned: Light red (#FFEBEE) with dashed border
     - Completed: Light green (#E8F5E9)
     - Cancelled: Grey with strikethrough

4. Visit cell interactions:
   - Hover: Show tooltip with full visit details
   - Click: Open visit detail flyout
   - Right-click: Context menu (Edit, Assign, Cancel, etc.)
   - Empty cell click: Create new visit for that day

5. Row interactions:
   - Click service user name: Open service user details
   - Hover row: Subtle highlight
   - Expandable: Click to show all activities for the week

6. Responsive behaviour:
   - Sticky first column on horizontal scroll
   - Compress visit cards on narrow screens
   - Tooltip for truncated content

Props:
```typescript
interface ServiceUserRowProps {
  serviceUser: DomiciliaryServiceUser;
  visits: Visit[];
  dateRange: Date[];
  onVisitClick: (visit: Visit) => void;
  onCreateVisit: (serviceUserId: string, date: Date) => void;
  onServiceUserClick: (serviceUser: DomiciliaryServiceUser) => void;
}
```

7. Use React.memo for performance
8. Implement virtual scrolling for large lists (react-window)
```

---

### PROMPT 2.3: Service User Rota Grid

```
Create the main grid container for the service user rota view.

FILE: src/components/rota/domiciliary/ServiceUserRotaGrid.tsx

Requirements:

1. Layout structure:
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Date navigation, Filters, View toggle, Actions                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ LEGEND: Visit types, Status colours                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ COLUMN HEADERS: Service User │ Mon 13 │ Tue 14 │ Wed 15 │ Thu 16 │ Fri 17 │ ... │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SERVICE USER ROWS (scrollable):                                                 │
│   [ServiceUserRow]                                                              │
│   [ServiceUserRow]                                                              │
│   [ServiceUserRow]                                                              │
│   ...                                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SUMMARY ROW: Total visits, Unassigned count, Coverage %                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

2. Header bar:
   - Week navigation: « Previous | Week of 13 Jan 2025 | Next »
   - Filters dropdown: Visit type, Status, Staff member
   - Search: Filter service users by name
   - Actions: Add Visit, Bulk Assign, Print Rota

3. Column headers:
   - Fixed service user column header
   - Day columns: "Mon 13", "Tue 14", etc.
   - Today highlighted
   - Weekend columns slightly different background

4. Summary row (sticky footer):
   - Total visits for the week
   - Unassigned visit count (red if > 0)
   - Coverage percentage
   - Total hours scheduled

5. State management:
   - Use custom hook: useServiceUserRota(locationId, dateRange)
   - React Query for data fetching
   - Optimistic updates for assignment changes

6. Performance:
   - Virtual scrolling for 50+ service users
   - Memoized row components
   - Debounced filter changes

7. Empty states:
   - No service users: "No active service users at this location"
   - No visits in range: "No visits scheduled for this week"

8. Loading states:
   - Skeleton grid while loading
   - Row-level loading for individual updates

Props:
```typescript
interface ServiceUserRotaGridProps {
  locationId: string;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}
```

Custom hook:
```typescript
function useServiceUserRota(locationId: string, dateRange: DateRange) {
  const serviceUsersQuery = useQuery({
    queryKey: ['serviceUsers', locationId],
    queryFn: () => serviceUserRepository.getByLocation(locationId)
  });

  const visitsQuery = useQuery({
    queryKey: ['visits', locationId, dateRange],
    queryFn: () => visitRepository.getByDateRange(locationId, dateRange)
  });

  // Group visits by service user
  const serviceUsersWithVisits = useMemo(() => {
    // ... grouping logic
  }, [serviceUsersQuery.data, visitsQuery.data]);

  return {
    serviceUsers: serviceUsersWithVisits,
    isLoading: serviceUsersQuery.isLoading || visitsQuery.isLoading,
    error: serviceUsersQuery.error || visitsQuery.error,
    refetch: () => {
      serviceUsersQuery.refetch();
      visitsQuery.refetch();
    }
  };
}
```
```

---

### PROMPT 2.4: Visit Card Component

```
Create a compact visit card component for display in the rota grid.

FILE: src/components/rota/domiciliary/VisitCard.tsx

Requirements:

1. Compact layout (fits in day cell):
```
┌─────────────┐
│ 08:00  45m  │
│ Sarah J.    │
│ [●●○] 3 act │
└─────────────┘
```

2. Display elements:
   - Start time (bold): "08:00"
   - Duration badge: "45m"
   - Assigned carer: First name + initial, or "VACANT"
   - Activity progress: Filled dots for completed
   - Activity count: "3 activities"

3. Visual states:
```typescript
const visitCardStyles = {
  scheduled: 'bg-blue-50 border-blue-200',
  assigned: 'bg-blue-100 border-blue-300',
  in_progress: 'bg-amber-50 border-amber-300 animate-pulse',
  completed: 'bg-green-50 border-green-200',
  cancelled: 'bg-gray-100 border-gray-300 opacity-60',
  missed: 'bg-red-50 border-red-300',
  unassigned: 'bg-red-50 border-red-300 border-dashed',
};
```

4. Interactions:
   - Hover: Elevation shadow, show quick actions
   - Click: Open visit detail flyout
   - Drag: Enable drag to reschedule (future)
   - Quick action buttons on hover:
     - Assign (if unassigned)
     - Edit
     - Cancel

5. Tooltip content (on hover):
```
Visit: Morning Care
Service User: John Smith
Date: Monday 13 Jan 2025
Time: 08:00 - 08:45 (45 mins)
Carer: Sarah Jones
Status: Assigned

Activities:
✓ Personal care
○ Medication
○ Breakfast preparation
```

6. Accessibility:
   - Role="button"
   - aria-label with full visit description
   - Keyboard focusable
   - Enter/Space to open details

Props:
```typescript
interface VisitCardProps {
  visit: Visit;
  activities?: VisitActivity[];
  compact?: boolean;
  showCarer?: boolean;
  onSelect: (visit: Visit) => void;
  onQuickAction?: (action: 'assign' | 'edit' | 'cancel', visit: Visit) => void;
}
```
```

---

## Phase 3: Staff Availability Management

### PROMPT 3.1: Staff Availability Types

```
Create type definitions for staff availability management.

FILE: src/types/availability.ts (extend)

Requirements:

1. Weekly availability pattern:
```typescript
interface WeeklyAvailabilityPattern {
  cp365_patternid: string;
  cp365_staffmemberid: string;
  cp365_patternname: string;
  
  // Each day's availability
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
  
  // Validity
  cp365_effectivefrom: Date;
  cp365_effectiveto?: Date;
  cp365_isactive: boolean;
}

interface DayAvailability {
  isAvailable: boolean;
  slots: AvailabilitySlot[];
  notes?: string;
}

interface AvailabilitySlot {
  startTime: string; // HH:mm
  endTime: string;
  type: AvailabilityType;
  isPreferred: boolean;
}
```

2. Availability exceptions (specific dates):
```typescript
interface AvailabilityException {
  cp365_exceptionid: string;
  cp365_staffmemberid: string;
  cp365_date: Date;
  cp365_exceptiontype: 'unavailable' | 'additional' | 'modified';
  cp365_slots?: AvailabilitySlot[];
  cp365_reason?: string;
  cp365_isapproved: boolean;
  cp365_approvedby?: string;
}
```

3. Calculated availability for scheduling:
```typescript
interface StaffAvailabilityForDate {
  staffMemberId: string;
  date: Date;
  availableSlots: AvailabilitySlot[];
  bookedSlots: { start: string; end: string; visitId: string }[];
  remainingCapacity: number; // minutes available
  hasExceptions: boolean;
}
```
```

---

### PROMPT 3.2: Staff Availability Grid Component

```
Create a weekly availability grid for staff members.

FILE: src/components/staff/availability/AvailabilityGrid.tsx

Requirements:

1. Layout (7-day week view with time slots):
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Staff: Sarah Jones                                           Week of 13 Jan │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬───────┤
│ Time    │ Mon     │ Tue     │ Wed     │ Thu     │ Fri     │ Sat     │ Sun   │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼───────┤
│ 06:00   │ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │         │         │ ▓▓▓▓▓▓▓ │         │       │
│ 07:00   │ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │         │         │ ▓▓▓▓▓▓▓ │         │       │
│ 08:00   │ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │ ████████│         │ ▓▓▓▓▓▓▓ │ ░░░░░░░ │       │
│ ...     │ ...     │ ...     │ ...     │ ...     │ ...     │ ...     │ ...   │
│ 18:00   │ ▓▓▓▓▓▓▓ │ ▓▓▓▓▓▓▓ │         │         │         │         │       │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼───────┤
│ Total   │ 12h     │ 12h     │ 4h      │ 0h      │ 10h     │ 4h      │ 0h    │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴───────┘
Legend: ▓ Available  ░ Preferred  █ Booked  ▒ Unavailable
```

2. Cell interactions:
   - Click to toggle availability
   - Drag to select time range
   - Right-click for options (Preferred, Unavailable, Notes)

3. Visual indicators:
   - Available: Light green
   - Preferred: Bright green with star
   - Booked (has visit): Blue with visit count
   - Unavailable: Light grey
   - TAFW/Leave: Orange with icon

4. Time slot granularity: 30-minute slots
5. Configurable time range (default 06:00 - 22:00)

6. Actions:
   - Copy previous week
   - Apply template
   - Clear week
   - Save changes

7. State management:
   - Local state for unsaved changes
   - Dirty state indicator
   - Optimistic updates with rollback

Props:
```typescript
interface AvailabilityGridProps {
  staffMember: StaffMember;
  weekStartDate: Date;
  existingPattern?: WeeklyAvailabilityPattern;
  bookedVisits?: Visit[];
  onSave: (pattern: WeeklyAvailabilityPattern) => Promise<void>;
  onCancel: () => void;
}
```
```

---

## Phase 4: Visit Management

### PROMPT 4.1: Visit Detail Flyout

```
Create a flyout panel for viewing and editing visit details.

FILE: src/components/rota/domiciliary/VisitDetailFlyout.tsx

Requirements:

1. Flyout layout (slides in from right, 450px width):
```
┌──────────────────────────────────────────────┐
│ [X] Morning Care Visit               [Edit]  │
├──────────────────────────────────────────────┤
│ SERVICE USER                                 │
│ ┌─────────────────────────────────────────┐  │
│ │ [Photo] John Smith                      │  │
│ │         24 Oak Lane, SW1A 1AA           │  │
│ │         📞 07123 456789                 │  │
│ └─────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│ VISIT DETAILS                                │
│ Date:     Monday 13 January 2025             │
│ Time:     08:00 - 08:45 (45 mins)           │
│ Type:     Morning Care                       │
│ Status:   [●] Assigned                       │
├──────────────────────────────────────────────┤
│ ASSIGNED CARER                               │
│ ┌─────────────────────────────────────────┐  │
│ │ [Photo] Sarah Jones                     │  │
│ │         Senior Carer                    │  │
│ │         📞 07987 654321                 │  │
│ │         [Change Carer]                  │  │
│ └─────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│ CARE ACTIVITIES (3)                          │
│ ☑ Personal care - washing & dressing        │
│ ☐ Medication - morning tablets              │
│ ☐ Breakfast - prepare and serve             │
│                                [Add Activity]│
├──────────────────────────────────────────────┤
│ VISIT NOTES                                  │
│ ┌─────────────────────────────────────────┐  │
│ │ Key safe code: 1234                     │  │
│ │ Enter via side door                     │  │
│ └─────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│ VISIT HISTORY                                │
│ Created: 10 Jan 2025 by Admin               │
│ Last modified: 12 Jan 2025 by Sarah J       │
├──────────────────────────────────────────────┤
│ [Cancel Visit]              [Save Changes]   │
└──────────────────────────────────────────────┘
```

2. Sections:
   - Service user info (read-only, link to profile)
   - Visit timing (editable: date, start/end time)
   - Status indicator with state machine transitions
   - Assigned carer with change option
   - Activities checklist (editable)
   - Notes (editable)
   - Audit history (read-only)

3. Edit mode:
   - Toggle between view and edit mode
   - Inline editing for simple fields
   - Modal for complex changes (reschedule, reassign)

4. Activity management:
   - Checkbox for completion
   - Add/remove activities
   - Reorder activities (drag)
   - Activity templates

5. Carer assignment:
   - "Change Carer" opens assignment modal
   - Shows current carer details
   - Quick swap with available staff

6. Actions:
   - Save changes (validate required fields)
   - Cancel visit (requires reason)
   - Delete visit (soft delete, requires confirmation)
   - Clone visit (copy to another date)

7. Animation:
   - Slide in from right with backdrop
   - Focus trap when open
   - Close on Escape key
   - Close on backdrop click

Props:
```typescript
interface VisitDetailFlyoutProps {
  visit: Visit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (visit: Visit) => Promise<void>;
  onCancel: (visitId: string, reason: string) => Promise<void>;
  onAssign: (visitId: string, staffMemberId: string) => Promise<void>;
}
```

Custom hook:
```typescript
function useVisitDetail(visitId: string | null) {
  const visitQuery = useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => visitRepository.getById(visitId!),
    enabled: !!visitId
  });

  const activitiesQuery = useQuery({
    queryKey: ['visitActivities', visitId],
    queryFn: () => visitActivityRepository.getByVisit(visitId!),
    enabled: !!visitId
  });

  const updateMutation = useMutation({
    mutationFn: (visit: Partial<Visit>) => visitRepository.update(visitId!, visit),
    onSuccess: () => {
      queryClient.invalidateQueries(['visits']);
    }
  });

  return {
    visit: visitQuery.data,
    activities: activitiesQuery.data,
    isLoading: visitQuery.isLoading,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
}
```
```

---

### PROMPT 4.2: Create Visit Modal

```
Create a modal for creating new visits.

FILE: src/components/rota/domiciliary/CreateVisitModal.tsx

Requirements:

1. Modal layout (centered, 500px width):
```
┌──────────────────────────────────────────────────┐
│ Create New Visit                            [X]  │
├──────────────────────────────────────────────────┤
│ SERVICE USER *                                   │
│ [Select service user...               ▼]        │
│                                                  │
│ VISIT TYPE *                                     │
│ ○ Morning  ○ Lunch  ○ Afternoon                 │
│ ○ Tea  ○ Evening  ○ Bedtime  ○ Night            │
│                                                  │
│ DATE *                                           │
│ [📅 Select date...                     ]        │
│                                                  │
│ TIME *                                           │
│ Start: [08:00 ▼]    End: [08:45 ▼]              │
│ Duration: 45 minutes                             │
│                                                  │
│ ASSIGN CARER                                     │
│ [Select carer (optional)...           ▼]        │
│ ℹ️ Matching carers: 4 available                  │
│                                                  │
│ ACTIVITIES                                       │
│ ☑ Personal care                                 │
│ ☑ Medication                                    │
│ ☐ Meal preparation                              │
│ ☐ Companionship                                 │
│ [+ Add custom activity]                          │
│                                                  │
│ RECURRENCE                                       │
│ ☐ Make this a recurring visit                   │
│   [Every week ▼] until [📅 End date    ]        │
│                                                  │
│ NOTES                                            │
│ ┌──────────────────────────────────────────┐    │
│ │                                          │    │
│ └──────────────────────────────────────────┘    │
├──────────────────────────────────────────────────┤
│              [Cancel]    [Create Visit]          │
└──────────────────────────────────────────────────┘
```

2. Form validation:
   - Service user required
   - Date required (not in past)
   - Start time required
   - End time must be after start time
   - At least one activity recommended (warning, not error)

3. Smart defaults:
   - Pre-populate service user if context provided
   - Pre-populate date if context provided
   - Default times based on visit type:
     - Morning: 07:00-09:00
     - Lunch: 12:00-13:00
     - Tea: 16:00-17:00
     - Evening: 18:00-19:00
     - Bedtime: 21:00-22:00

4. Service user search:
   - Searchable dropdown
   - Show address preview on selection
   - Recent service users at top

5. Carer assignment:
   - Optional at creation
   - Show count of available/matching carers
   - Filter by: available at time, has skills, has relationship

6. Activity templates:
   - Pre-select based on visit type
   - Allow custom activities
   - Persist activity preferences per service user

7. Recurrence:
   - Create multiple visits at once
   - Weekly/fortnightly/monthly patterns
   - End date or occurrence count
   - Preview of dates to be created

Props:
```typescript
interface CreateVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (visits: Partial<Visit>[]) => Promise<void>;
  defaultServiceUserId?: string;
  defaultDate?: Date;
  defaultVisitType?: VisitType;
}
```

Use react-hook-form for form management:
```typescript
const {
  register,
  handleSubmit,
  watch,
  formState: { errors, isSubmitting }
} = useForm<CreateVisitFormData>({
  defaultValues: {
    serviceUserId: defaultServiceUserId,
    date: defaultDate,
    visitType: defaultVisitType || 'morning',
    activities: ['personal_care', 'medication']
  }
});
```
```

---

## Phase 5: Care Activities & Tasks

### PROMPT 5.1: Activity Management Components

```
Create components for managing visit activities.

FILE 1: src/components/rota/domiciliary/ActivityChecklist.tsx

Requirements:

1. Layout:
```
CARE ACTIVITIES
┌─────────────────────────────────────────────────┐
│ ☑ Personal care - washing & dressing           │
│   └─ Completed at 08:15 by Sarah               │
│ ☐ Medication - morning tablets                 │
│   └─ Paracetamol 500mg x2, Aspirin 75mg       │
│ ☐ Breakfast - prepare and serve               │
│ ☐ Mobility - assist to living room            │
├─────────────────────────────────────────────────┤
│ [+ Add Activity]  Progress: 1/4 (25%)          │
└─────────────────────────────────────────────────┘
```

2. Activity item display:
   - Checkbox for completion status
   - Activity name (bold)
   - Activity description (grey)
   - Completion timestamp when done
   - Medication details if applicable
   - Required badge if mandatory

3. Activity completion:
   - Checkbox toggles completion
   - Prompt for completion notes (optional)
   - Auto-set timestamp
   - Validation for medication activities

4. Add activity:
   - Dropdown with common activities
   - Custom activity text input
   - Category selection
   - Duration estimate

5. Progress indicator:
   - X of Y completed
   - Percentage bar
   - Colour: green if 100%, amber if partial, red if none

Props:
```typescript
interface ActivityChecklistProps {
  activities: VisitActivity[];
  visitId: string;
  visitStatus: VisitStatus;
  onToggleComplete: (activityId: string, completed: boolean, notes?: string) => void;
  onAddActivity: (activity: Partial<VisitActivity>) => void;
  onRemoveActivity: (activityId: string) => void;
  readOnly?: boolean;
}
```

FILE 2: src/components/rota/domiciliary/ActivityTemplates.tsx

Requirements:

1. Predefined activity sets by visit type:
```typescript
const activityTemplates: Record<VisitType, ActivityTemplate[]> = {
  morning: [
    { name: 'Personal care', category: 'personal_care', isRequired: true },
    { name: 'Medication', category: 'medication', isRequired: true },
    { name: 'Breakfast', category: 'meal_preparation' },
    { name: 'Mobility check', category: 'mobility' }
  ],
  lunch: [
    { name: 'Lunch preparation', category: 'meal_preparation', isRequired: true },
    { name: 'Medication', category: 'medication' },
    { name: 'Welfare check', category: 'health_monitoring' }
  ],
  // ... other visit types
};
```

2. Template selection UI:
   - Grid of template cards
   - Each shows activities included
   - Click to apply template
   - Merge option (add to existing vs replace)

3. Custom template creation:
   - Save current activities as template
   - Name and categorize template
   - Share across service users (location-level)
```

---

## Phase 6: Smart Matching & Assignment

### PROMPT 6.1: Staff Matching Engine

```
Create the logic for matching staff to visits.

FILE: src/services/staffMatching.ts

Requirements:

1. Matching criteria interface:
```typescript
interface MatchingCriteria {
  visit: Visit;
  serviceUser: DomiciliaryServiceUser;
  requiredSkills?: string[];
  preferredCarers?: string[];
  excludedCarers?: string[];
  considerTravel?: boolean;
  previousVisitLocation?: { lat: number; lng: number };
}

interface MatchResult {
  staffMember: StaffMember;
  score: number;
  breakdown: MatchScoreBreakdown;
  isAvailable: boolean;
  hasRequiredSkills: boolean;
  warnings: string[];
}

interface MatchScoreBreakdown {
  availabilityScore: number;      // 0-30: Is available at this time
  continuityScore: number;        // 0-25: Has relationship with service user
  skillsScore: number;            // 0-20: Has required capabilities
  preferenceScore: number;        // 0-15: Is preferred by service user
  travelScore: number;            // 0-10: Proximity/travel time
}
```

2. Matching algorithm:
```typescript
async function findMatchingStaff(
  criteria: MatchingCriteria,
  options: { limit?: number; includeUnavailable?: boolean }
): Promise<MatchResult[]> {
  // 1. Get all active staff for location
  // 2. Filter by basic availability (has pattern covering this time)
  // 3. Check for conflicts (already booked visits)
  // 4. Score each candidate
  // 5. Sort by score descending
  // 6. Return top matches with breakdown
}

function calculateMatchScore(
  staff: StaffMember,
  criteria: MatchingCriteria,
  availability: StaffAvailabilityForDate,
  relationship: ServiceUserStaffRelationship | null
): MatchScoreBreakdown {
  return {
    availabilityScore: calculateAvailabilityScore(availability, criteria.visit),
    continuityScore: calculateContinuityScore(relationship),
    skillsScore: calculateSkillsScore(staff, criteria.requiredSkills),
    preferenceScore: calculatePreferenceScore(staff, criteria),
    travelScore: calculateTravelScore(staff, criteria)
  };
}
```

3. Availability scoring:
   - 30 points: Slot marked as "preferred"
   - 25 points: Slot marked as "available"
   - 15 points: Available but overtime would apply
   - 0 points: Not available (unless includeUnavailable=true)

4. Continuity scoring:
   - 25 points: Preferred carer for this service user
   - 20 points: Regular carer (5+ recent visits)
   - 15 points: Has visited before (1-4 visits)
   - 10 points: Same team/area
   - 0 points: Never visited

5. Skills scoring:
   - 20 points: Has all required capabilities
   - 10 points: Has most required capabilities
   - 0 points: Missing critical capabilities
   - Bonus 5 points: Has additional relevant skills

6. Preference scoring:
   - 15 points: Explicitly preferred by service user
   - -50 points: Excluded by service user (filter out unless override)
   - 10 points: Preferred gender match
   - 5 points: Language match

7. Travel scoring (if enabled):
   - Calculate distance from previous visit or home
   - 10 points: < 1 mile
   - 7 points: 1-3 miles
   - 4 points: 3-5 miles
   - 0 points: > 5 miles
```

---

### PROMPT 6.2: Assignment Modal

```
Create the modal for assigning staff to a visit.

FILE: src/components/rota/domiciliary/AssignStaffModal.tsx

Requirements:

1. Layout:
```
┌───────────────────────────────────────────────────────────────┐
│ Assign Carer to Visit                                    [X]  │
├───────────────────────────────────────────────────────────────┤
│ VISIT DETAILS                                                 │
│ John Smith - Morning Care                                     │
│ Monday 13 Jan 2025, 08:00-08:45                              │
├───────────────────────────────────────────────────────────────┤
│ RECOMMENDED CARERS                              [Refresh 🔄]  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ ⭐ Sarah Jones              Score: 95/100    [Assign]   │  │
│ │    Senior Carer | Available | 12 previous visits       │  │
│ │    ✓ Preferred  ✓ Skills  ✓ Nearby                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │    Mike Brown               Score: 78/100    [Assign]   │  │
│ │    Carer | Available | 3 previous visits               │  │
│ │    ✓ Skills  ⚠ 2 miles away                            │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │    Emma Wilson              Score: 65/100    [Assign]   │  │
│ │    Carer | Available (overtime) | New to client        │  │
│ │    ✓ Skills  ⚠ Overtime applies                        │  │
│ └─────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────┤
│ [Show all staff]                                              │
│ ☐ Include staff requiring overtime                           │
│ ☐ Include staff without full availability                    │
├───────────────────────────────────────────────────────────────┤
│ Search: [🔍 Search by name...                    ]           │
└───────────────────────────────────────────────────────────────┘
```

2. Recommended carers list:
   - Sorted by match score
   - Show top 5 by default
   - Each card shows:
     - Name and photo
     - Match score (X/100)
     - Job title
     - Availability status
     - Previous visit count with this service user
     - Match indicators (✓/⚠/✗)

3. Match indicators:
   - ✓ Preferred: Is service user's preferred carer
   - ✓ Skills: Has all required capabilities
   - ✓ Nearby: Good travel score
   - ⚠ Overtime: Would require overtime
   - ⚠ Distance: Travel > 5 miles
   - ⚠ New: First visit to this service user

4. Filters/options:
   - Include overtime (checkbox)
   - Include partially available (checkbox)
   - Search by name
   - "Show all staff" expands to full list

5. Assignment action:
   - Click "Assign" button on card
   - Confirm if warnings present
   - Close modal on success
   - Show error toast on failure

6. Empty states:
   - No matching carers: Show message with suggestions
   - All carers unavailable: Show list with conflicts

Props:
```typescript
interface AssignStaffModalProps {
  isOpen: boolean;
  visit: Visit;
  serviceUser: DomiciliaryServiceUser;
  onClose: () => void;
  onAssign: (staffMemberId: string) => Promise<void>;
}
```

Custom hook:
```typescript
function useStaffMatching(visit: Visit, serviceUser: DomiciliaryServiceUser) {
  const [options, setOptions] = useState({
    includeOvertime: false,
    includePartialAvailability: false
  });

  const matchesQuery = useQuery({
    queryKey: ['staffMatches', visit.cp365_visitid, options],
    queryFn: () => findMatchingStaff(
      { visit, serviceUser },
      { includeUnavailable: options.includePartialAvailability }
    )
  });

  return {
    matches: matchesQuery.data,
    isLoading: matchesQuery.isLoading,
    options,
    setOptions,
    refetch: matchesQuery.refetch
  };
}
```
```

---

## Phase 7: Geographic & Round Planning

### PROMPT 7.1: Round Management Types

```
Create types and utilities for round/run planning.

FILE: src/types/rounds.ts

Requirements:

1. Round types:
```typescript
interface Round {
  cp365_roundid: string;
  cp365_roundname: string;
  cp365_roundtype: VisitType;
  cp365_starttime: string;
  cp365_endtime: string;
  cp365_staffmemberid?: string;
  cp365_areaid?: string;
  cp365_istemplate: boolean;
  cp365_dayofweek?: number;
  
  // Calculated
  visits: Visit[];
  totalDurationMinutes: number;
  totalTravelMinutes: number;
  serviceUserCount: number;
}

interface RoundTemplate extends Omit<Round, 'visits'> {
  visitPatterns: RoundVisitPattern[];
}

interface RoundVisitPattern {
  serviceUserId: string;
  sequenceOrder: number;
  visitType: VisitType;
  startTimeOffset: number; // minutes from round start
  durationMinutes: number;
}
```

2. Geographic area:
```typescript
interface GeographicArea {
  cp365_areaid: string;
  cp365_areaname: string;
  cp365_postcodeprefix: string[]; // e.g., ["SW1A", "SW1B"]
  cp365_centerlatitude: number;
  cp365_centerlongitude: number;
  cp365_radiusmiles: number;
  cp365_colour: string; // for map display
}
```

3. Travel calculation:
```typescript
interface TravelEstimate {
  fromServiceUserId: string;
  toServiceUserId: string;
  distanceMiles: number;
  durationMinutes: number;
  mode: 'driving' | 'walking' | 'public_transport';
}
```

FILE: src/services/roundPlanning.ts

```typescript
// Group visits into efficient rounds
function optimizeRounds(
  visits: Visit[],
  constraints: RoundConstraints
): Round[] {
  // 1. Group by visit type (morning, lunch, etc.)
  // 2. Within each group, cluster by geography
  // 3. Sequence visits to minimize travel
  // 4. Assign to available staff
  // 5. Validate constraints (max duration, max visits, etc.)
}

interface RoundConstraints {
  maxVisitsPerRound: number;
  maxDurationMinutes: number;
  maxTravelMinutes: number;
  preferContinuity: boolean;
}

// Calculate travel between visits
function calculateTravelMatrix(
  visits: Visit[]
): Map<string, TravelEstimate> {
  // Use Haversine formula for straight-line distance
  // Or integrate with mapping API for real routes
}

// Simple Haversine implementation
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```
```

---

### PROMPT 7.2: Round View Component

```
Create a visual component for viewing and managing rounds.

FILE: src/components/rota/domiciliary/RoundView.tsx

Requirements:

1. Layout (split view: list + map):
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ROUNDS - Monday 13 January 2025                      [Create Round] [📍]│
├─────────────────────────────┬───────────────────────────────────────────┤
│ ROUND LIST                  │ MAP VIEW                                  │
│                             │                                           │
│ ┌─────────────────────────┐ │    ┌───┐                                 │
│ │ 🌅 Morning Round A      │ │    │ 1 │──┐                              │
│ │    Sarah J. | 4 visits  │ │    └───┘  │                              │
│ │    07:00 - 10:30        │ │           │    ┌───┐                     │
│ │    [Expand ▼]           │ │           └────│ 2 │──┐                  │
│ └─────────────────────────┘ │                └───┘  │                  │
│                             │                       │   ┌───┐          │
│ ┌─────────────────────────┐ │                       └───│ 3 │          │
│ │ 🌅 Morning Round B      │ │                           └───┘          │
│ │    Mike B. | 3 visits   │ │                              │           │
│ │    07:30 - 10:00        │ │                           ┌───┐          │
│ │    [Expand ▼]           │ │                           │ 4 │          │
│ └─────────────────────────┘ │                           └───┘          │
│                             │                                           │
│ ┌─────────────────────────┐ │  Legend:                                 │
│ │ ⚠️ UNASSIGNED           │ │  🔵 Assigned  🔴 Unassigned              │
│ │    2 visits need carers │ │  ── Route    📍 Service User             │
│ └─────────────────────────┘ │                                           │
├─────────────────────────────┴───────────────────────────────────────────┤
│ ROUND DETAILS (expanded):                                               │
│ 1. 07:00 - John Smith (45m) - 24 Oak Lane                              │
│ 2. 08:00 - Mary Jones (30m) - 15 High Street                           │
│ 3. 08:45 - Bob Wilson (45m) - 8 Park Road                              │
│ 4. 09:45 - Ann Davis (30m) - 32 Mill Lane                              │
│ Travel: 4.2 miles total | Est. travel time: 18 mins                    │
└─────────────────────────────────────────────────────────────────────────┘
```

2. Round list (left panel):
   - Group by round type (morning, lunch, etc.)
   - Show assigned carer or "UNASSIGNED"
   - Visit count and time range
   - Expandable to show visit sequence
   - Click to highlight on map

3. Map view (right panel):
   - Show service user locations as numbered pins
   - Draw route lines between sequential visits
   - Colour code by assignment status
   - Colour code by round (when multiple visible)
   - Click pin to show service user details

4. Round expansion:
   - Show visits in sequence order
   - Display travel time between each
   - Show total travel distance/time
   - Allow drag-drop reordering

5. Actions:
   - Create new round (group selected visits)
   - Add visit to round
   - Remove visit from round
   - Reorder visits
   - Assign carer to round
   - Optimize round order

6. Map integration:
   - Use Leaflet with OpenStreetMap (free)
   - Marker clustering for dense areas
   - Fit bounds to show all visits
   - Toggle between map and list-only view

Props:
```typescript
interface RoundViewProps {
  date: Date;
  locationId: string;
  onRoundCreate: (visits: Visit[]) => void;
  onRoundUpdate: (round: Round) => void;
  onVisitSelect: (visit: Visit) => void;
}
```

Dependencies:
- react-leaflet for map
- @types/leaflet for TypeScript support
```

---

## Phase 8: Staff View & Travel

### PROMPT 8.1: Staff Day Schedule View

```
Create a view showing a staff member's daily schedule with travel.

FILE: src/components/rota/domiciliary/StaffDaySchedule.tsx

Requirements:

1. Layout (timeline view):
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Sarah Jones - Monday 13 January 2025               Total: 7h 15m        │
├─────────────────────────────────────────────────────────────────────────┤
│ 07:00 ├──────────────────────────────────────────────────────────────── │
│       │ ┌────────────────────────────────────────────────────────────┐  │
│ 07:00 │ │ 🏠 John Smith | Morning Care | 45 min                      │  │
│       │ │    24 Oak Lane, SW1A 1AA                                   │  │
│       │ │    Activities: Personal care, Medication, Breakfast        │  │
│ 07:45 │ └────────────────────────────────────────────────────────────┘  │
│       │                                                                  │
│       │ 🚗 Travel: 8 min (1.2 miles)                                    │
│       │                                                                  │
│       │ ┌────────────────────────────────────────────────────────────┐  │
│ 08:00 │ │ 🏠 Mary Jones | Morning Care | 30 min                      │  │
│       │ │    15 High Street, SW1A 2BB                                │  │
│       │ │    Activities: Medication, Welfare check                   │  │
│ 08:30 │ └────────────────────────────────────────────────────────────┘  │
│       │                                                                  │
│       │ 🚗 Travel: 12 min (2.1 miles)                                   │
│       │                                                                  │
│       │ ┌────────────────────────────────────────────────────────────┐  │
│ 08:45 │ │ 🏠 Bob Wilson | Morning Care | 45 min                      │  │
│       │ │    8 Park Road, SW1B 1CC                                   │  │
│ ...   │ │    ...                                                     │  │
└───────┴──────────────────────────────────────────────────────────────────┘
```

2. Timeline elements:
   - Time markers on left (hourly + visit times)
   - Visit cards as blocks on timeline
   - Travel segments between visits
   - Gap indicators for breaks
   - Current time marker (red line)

3. Visit cards:
   - Service user name and photo
   - Visit type
   - Duration
   - Address
   - Activity summary
   - Status indicator (scheduled/in-progress/completed)
   - Click to open visit details

4. Travel segments:
   - Show estimated travel time
   - Show distance
   - Travel mode icon (car/walk/public)
   - Warning if travel time seems tight

5. Summary header:
   - Staff name and date
   - Total working time
   - Total travel time
   - Visit count
   - Mileage total

6. Actions:
   - Add visit (opens slot selector)
   - Reorder visits (drag)
   - Navigate to map view
   - Print schedule

Props:
```typescript
interface StaffDayScheduleProps {
  staffMember: StaffMember;
  date: Date;
  visits: Visit[];
  onVisitClick: (visit: Visit) => void;
  onAddVisit: (startTime: string) => void;
  onReorder: (visitIds: string[]) => void;
}
```

Custom hook:
```typescript
function useStaffDaySchedule(staffMemberId: string, date: Date) {
  const visitsQuery = useQuery({
    queryKey: ['staffVisits', staffMemberId, date],
    queryFn: () => visitRepository.getByStaffMember(staffMemberId, date)
  });

  // Calculate travel between visits
  const scheduleWithTravel = useMemo(() => {
    if (!visitsQuery.data) return [];
    
    const sorted = [...visitsQuery.data].sort((a, b) => 
      a.cp365_scheduledstarttime.localeCompare(b.cp365_scheduledstarttime)
    );
    
    return sorted.map((visit, index) => ({
      visit,
      travelFromPrevious: index > 0 
        ? calculateTravel(sorted[index - 1], visit)
        : null
    }));
  }, [visitsQuery.data]);

  return {
    schedule: scheduleWithTravel,
    isLoading: visitsQuery.isLoading,
    totalWorkMinutes: calculateTotalWorkMinutes(scheduleWithTravel),
    totalTravelMinutes: calculateTotalTravelMinutes(scheduleWithTravel)
  };
}
```
```

---

## Dummy Data Generation

### PROMPT D.1: Comprehensive Dummy Data Generator

```
Create a comprehensive dummy data generator for testing.

FILE: src/data/dummyDataGenerator.ts

Requirements:

1. Generate realistic UK-based test data:
```typescript
const DUMMY_SERVICE_USERS = [
  {
    name: 'John Smith',
    address: '24 Oak Lane',
    postcode: 'SW1A 1AA',
    fundingType: 'local_authority',
    weeklyHours: 15,
    preferredGender: 'no_preference',
    needs: ['personal_care', 'medication', 'meal_prep']
  },
  // ... 15-20 service users
];

const DUMMY_STAFF = [
  {
    name: 'Sarah Jones',
    jobTitle: 'Senior Carer',
    capabilities: ['medication', 'dementia', 'moving_handling'],
    availability: {
      monday: { start: '07:00', end: '19:00' },
      tuesday: { start: '07:00', end: '19:00' },
      // ...
    }
  },
  // ... 10-12 staff members
];
```

2. Generate visits for 4-week period:
   - Mix of visit types throughout the day
   - Realistic patterns (most have morning visits)
   - Some recurring, some one-off
   - Mix of assigned and unassigned
   - Some completed (past dates), some scheduled (future)

3. Generate continuity relationships:
   - Link staff to service users they've visited
   - Include preferred/excluded relationships
   - Realistic visit counts

4. Generate realistic addresses with coordinates:
   - Use real UK postcode areas
   - Calculate realistic lat/lng for each
   - Enable distance calculations

5. Export function:
```typescript
export async function generateDummyData(): Promise<{
  serviceUsers: DomiciliaryServiceUser[];
  staffMembers: StaffMember[];
  visits: Visit[];
  activities: VisitActivity[];
  availability: StaffAvailability[];
  relationships: ServiceUserStaffRelationship[];
  rounds: Round[];
}>;
```

6. Make generation deterministic with seed:
```typescript
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
```

7. Time generation for visits:
```typescript
const VISIT_TYPE_TIMES: Record<VisitType, { start: string; end: string }[]> = {
  morning: [
    { start: '07:00', end: '07:45' },
    { start: '07:30', end: '08:15' },
    { start: '08:00', end: '08:45' },
    { start: '08:30', end: '09:15' }
  ],
  lunch: [
    { start: '12:00', end: '12:45' },
    { start: '12:30', end: '13:15' }
  ],
  // ... etc
};
```
```

---

## Data Model Reference

This section provides the complete data model for Dataverse implementation.

### New Tables Required

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_visit                                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ cp365_visitid           │ GUID      │ Primary Key                              │
│ cp365_visitname         │ String    │ Auto-generated: "{ServiceUser} - {Type}" │
│ cp365_serviceuserid     │ Lookup    │ → cp365_serviceuser                      │
│ cp365_visitdate         │ DateTime  │ Date of visit                            │
│ cp365_scheduledstarttime│ String    │ HH:mm format                             │
│ cp365_scheduledendtime  │ String    │ HH:mm format                             │
│ cp365_durationminutes   │ Integer   │ Calculated or override                   │
│ cp365_staffmemberid     │ Lookup    │ → cp365_staffmember (nullable)           │
│ cp365_agencyworkerid    │ Lookup    │ → cp365_agencyworker (nullable)          │
│ cp365_visitstatus       │ OptionSet │ scheduled/assigned/in_progress/etc       │
│ cp365_actualstarttime   │ String    │ Recorded on check-in                     │
│ cp365_actualendtime     │ String    │ Recorded on check-out                    │
│ cp365_checkintime       │ DateTime  │ Timestamp of check-in                    │
│ cp365_checkouttime      │ DateTime  │ Timestamp of check-out                   │
│ cp365_checkinlatitude   │ Float     │ GPS latitude on check-in                 │
│ cp365_checkinlongitude  │ Float     │ GPS longitude on check-in                │
│ cp365_visittypecode     │ OptionSet │ morning/lunch/tea/evening/etc            │
│ cp365_isrecurring       │ Boolean   │ Part of recurring pattern                │
│ cp365_recurrencepatternid│ Lookup   │ → cp365_visitrecurrence                  │
│ cp365_roundid           │ Lookup    │ → cp365_round (nullable)                 │
│ cp365_sequenceorder     │ Integer   │ Order within round                       │
│ cp365_visitnotes        │ Text      │ Multi-line notes                         │
│ cp365_cancellationreason│ String    │ If cancelled                             │
│ statecode               │ State     │ Active/Inactive                          │
│ createdon               │ DateTime  │ System                                   │
│ modifiedon              │ DateTime  │ System                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_visitactivity                                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ cp365_visitactivityid   │ GUID      │ Primary Key                              │
│ cp365_visitid           │ Lookup    │ → cp365_visit                            │
│ cp365_activityname      │ String    │ Activity name                            │
│ cp365_activitydescription│ Text     │ Detailed description                     │
│ cp365_activitycategorycode│OptionSet│ personal_care/medication/etc             │
│ cp365_iscompleted       │ Boolean   │ Completion status                        │
│ cp365_completedtime     │ DateTime  │ When completed                           │
│ cp365_completednotes    │ Text      │ Completion notes                         │
│ cp365_isrequired        │ Boolean   │ Mandatory activity                       │
│ cp365_estimatedminutes  │ Integer   │ Expected duration                        │
│ cp365_requirestwocarer  │ Boolean   │ Needs two carers                         │
│ cp365_medicationid      │ Lookup    │ → cp365_serviceusermedication (nullable) │
│ cp365_dosage            │ String    │ If medication                            │
│ cp365_displayorder      │ Integer   │ Sort order                               │
│ statecode               │ State     │ Active/Inactive                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_staffavailability                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ cp365_staffavailabilityid│ GUID     │ Primary Key                              │
│ cp365_staffmemberid     │ Lookup    │ → cp365_staffmember                      │
│ cp365_dayofweek         │ Integer   │ 1=Mon through 7=Sun                      │
│ cp365_specificdate      │ DateTime  │ For exceptions (nullable)                │
│ cp365_availablefrom     │ String    │ HH:mm                                    │
│ cp365_availableto       │ String    │ HH:mm                                    │
│ cp365_availabilitytype  │ OptionSet │ available/unavailable/preferred          │
│ cp365_ispreferredtime   │ Boolean   │ Preferred slot                           │
│ cp365_isrecurring       │ Boolean   │ Repeating pattern                        │
│ cp365_effectivefrom     │ DateTime  │ Pattern start date                       │
│ cp365_effectiveto       │ DateTime  │ Pattern end date                         │
│ statecode               │ State     │ Active/Inactive                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_serviceuserstaffrelationship                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ cp365_relationshipid    │ GUID      │ Primary Key                              │
│ cp365_serviceuserid     │ Lookup    │ → cp365_serviceuser                      │
│ cp365_staffmemberid     │ Lookup    │ → cp365_staffmember                      │
│ cp365_relationshipstatus│ OptionSet │ active/preferred/excluded/inactive       │
│ cp365_ispreferredcarer  │ Boolean   │ Service user preference                  │
│ cp365_isexcluded        │ Boolean   │ Staff excluded                           │
│ cp365_exclusionreason   │ String    │ If excluded                              │
│ cp365_firstvisitdate    │ DateTime  │ First visit                              │
│ cp365_lastvisitdate     │ DateTime  │ Most recent visit                        │
│ cp365_totalvisits       │ Integer   │ Visit count                              │
│ cp365_continuityscore   │ Float     │ Calculated score                         │
│ statecode               │ State     │ Active/Inactive                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_round                                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ cp365_roundid           │ GUID      │ Primary Key                              │
│ cp365_roundname         │ String    │ e.g., "Morning Round A"                  │
│ cp365_roundtype         │ OptionSet │ morning/lunch/tea/evening/etc            │
│ cp365_starttime         │ String    │ HH:mm                                    │
│ cp365_endtime           │ String    │ HH:mm                                    │
│ cp365_staffmemberid     │ Lookup    │ → cp365_staffmember (nullable)           │
│ cp365_areaid            │ Lookup    │ → cp365_geographicarea (nullable)        │
│ cp365_istemplate        │ Boolean   │ Is a reusable template                   │
│ cp365_dayofweek         │ Integer   │ If template, which day                   │
│ cp365_estimatedtravelminutes│Integer│ Total travel estimate                    │
│ statecode               │ State     │ Active/Inactive                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_geographicarea                                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ cp365_areaid            │ GUID      │ Primary Key                              │
│ cp365_areaname          │ String    │ e.g., "Central"                          │
│ cp365_postcodeprefix    │ String    │ Comma-separated prefixes                 │
│ cp365_centerlatitude    │ Float     │ Area center lat                          │
│ cp365_centerlongitude   │ Float     │ Area center lng                          │
│ cp365_radiusmiles       │ Float     │ Coverage radius                          │
│ cp365_colour            │ String    │ Hex colour for display                   │
│ statecode               │ State     │ Active/Inactive                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Modified Existing Tables

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TABLE: cp365_serviceuser (MODIFY)                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ADD: cp365_latitude         │ Float     │ Address latitude                     │
│ ADD: cp365_longitude        │ Float     │ Address longitude                    │
│ ADD: cp365_preferredgender  │ OptionSet │ male/female/no_preference            │
│ ADD: cp365_keysafelocation  │ String    │ Key safe instructions                │
│ ADD: cp365_accessnotes      │ Text      │ Access instructions                  │
│ ADD: cp365_weeklyfundedhours│ Integer   │ Funded hours per week                │
│ ADD: cp365_carepackagetype  │ OptionSet │ domiciliary/supported_living/etc     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Option Sets

```
cp365_visitstatus:
  - 1: scheduled
  - 2: assigned
  - 3: in_progress
  - 4: completed
  - 5: cancelled
  - 6: missed
  - 7: late

cp365_visittype:
  - 1: morning
  - 2: lunch
  - 3: afternoon
  - 4: tea
  - 5: evening
  - 6: bedtime
  - 7: night
  - 8: waking_night
  - 9: sleep_in
  - 10: emergency
  - 11: assessment
  - 12: review

cp365_activitycategory:
  - 1: personal_care
  - 2: medication
  - 3: meal_preparation
  - 4: meal_support
  - 5: mobility
  - 6: domestic
  - 7: companionship
  - 8: community
  - 9: health_monitoring
  - 10: night_check
  - 99: other

cp365_availabilitytype:
  - 1: available
  - 2: unavailable
  - 3: preferred
  - 4: emergency_only

cp365_relationshipstatus:
  - 1: active
  - 2: preferred
  - 3: excluded
  - 4: inactive
```

---

## Implementation Order

Follow this sequence for implementation:

1. **Phase 1**: Types and repository pattern (foundation)
2. **Phase 2**: Service user rota view (core UI)
3. **Dummy Data**: Generate test data for development
4. **Phase 3**: Staff availability (enables assignment)
5. **Phase 4**: Visit management (CRUD operations)
6. **Phase 5**: Activities (care task management)
7. **Phase 6**: Smart matching (intelligence layer)
8. **Phase 7**: Geographic planning (optimization)
9. **Phase 8**: Staff view (alternative perspective)

Each phase builds on the previous, allowing incremental testing and validation.

---

## Environment Configuration

```env
# .env.local
VITE_DATA_SOURCE=dummy                    # or 'dataverse'
VITE_DATAVERSE_URL=https://your-org.crm.dynamics.com
VITE_DATAVERSE_TOKEN=                     # Azure AD token
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## Testing Strategy

1. **Unit Tests**: Test services and utilities (matching algorithm, distance calculation)
2. **Component Tests**: Test UI components with mock data (React Testing Library)
3. **Integration Tests**: Test data flow through repository pattern
4. **E2E Tests**: Test complete workflows (create visit, assign carer)

---

*Document Version: 1.0*
*Last Updated: January 2025*
*For use with Cursor AI*
