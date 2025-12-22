# CarePoint 365 Rota Application - React Rebuild Specification

## Document Purpose
This specification provides everything needed to rebuild the CarePoint 365 Rostering Canvas Apps as React web/mobile applications while maintaining the existing Dataverse backend and Power Automate flows.

---

## 1. Executive Summary

### Current State
Three Power Apps Canvas applications:
1. **Rostering Administration** - Staff/Agency Worker/Service User management
2. **Rota Management** - Shift scheduling, rota views, shift patterns
3. **Rota View** - Read-only rota viewing for staff

### Target State
React-based web application with:
- Responsive design (desktop + mobile)
- Dataverse Web API integration
- Power Automate flow triggers via HTTP
- Modern UI with existing CarePoint 365 branding

---

## 2. Application Architecture

### 2.1 Recommended Tech Stack

```
Frontend:
├── React 18+ with TypeScript
├── React Router v6 (navigation)
├── TanStack Query (data fetching/caching)
├── Zustand or Redux Toolkit (state management)
├── Tailwind CSS or Chakra UI (styling)
├── React Hook Form + Zod (forms/validation)
├── FullCalendar or custom grid (rota view)
└── date-fns (date manipulation)

Backend Integration:
├── Dataverse Web API (REST)
├── Power Automate HTTP triggers
├── Azure AD / Entra ID (authentication)
└── MSAL.js (auth library)
```

### 2.2 Project Structure

```
src/
├── api/
│   ├── dataverse/
│   │   ├── client.ts           # Dataverse API client
│   │   ├── shifts.ts           # Shift operations
│   │   ├── staff.ts            # Staff operations
│   │   ├── locations.ts        # Location operations
│   │   └── types.ts            # API types
│   └── flows/
│       ├── client.ts           # Power Automate client
│       └── flows.ts            # Flow triggers
├── components/
│   ├── common/
│   │   ├── Loading.tsx
│   │   ├── Header.tsx
│   │   ├── SideNav.tsx
│   │   └── ErrorBoundary.tsx
│   ├── rota/
│   │   ├── RotaGrid.tsx
│   │   ├── ShiftCard.tsx
│   │   ├── ShiftFlyout.tsx
│   │   └── WeekNavigator.tsx
│   ├── staff/
│   │   ├── StaffList.tsx
│   │   ├── StaffDetail.tsx
│   │   └── StaffForm.tsx
│   └── admin/
│       ├── AgencyWorkerList.tsx
│       └── ServiceUserList.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useStaff.ts
│   ├── useShifts.ts
│   └── useRotaData.ts
├── pages/
│   ├── Dashboard.tsx
│   ├── RotaView.tsx
│   ├── StaffManagement.tsx
│   └── Settings.tsx
├── store/
│   ├── authStore.ts
│   ├── rotaStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts
└── utils/
    ├── dateUtils.ts
    ├── shiftUtils.ts
    └── formatters.ts
```

---

## 3. Data Model (Dataverse Tables)

### 3.1 Core Tables

#### Shifts (`cp365_shift`)
Primary table for shift data.

| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Shift ID | `cp365_shiftid` | GUID | Primary key |
| Shift Name | `cp365_shiftname` | String | Display name |
| Shift Date | `cp365_shiftdate` | Date | Date of shift |
| Shift Start Time | `cp365_shiftstarttime` | DateTime | Start time |
| Shift End Time | `cp365_shiftendtime` | DateTime | End time |
| Shift Status | `cp365_shiftstatus` | OptionSet | Published (1001), Unpublished (1009) |
| Shift Type | `cp365_shifttype` | String | Day, Night, Sleep In |
| Staff Member | `cp365_staffmember` | Lookup | FK to Staff Members |
| Rota | `cp365_rota` | Lookup | FK to Rotas |
| Shift Reference | `cp365_shiftreference` | Lookup | FK to Shift References |
| Shift Activity | `cp365_shiftactivity` | Lookup | FK to Shift Activities |
| Shift Pattern | `cp365_shiftpattern` | Lookup | FK to Shift Patterns |
| Overtime Shift | `cp365_overtimeshift` | Boolean | Is overtime |
| Break Duration | `cp365_breakduration` | Integer | Break minutes |
| Community Hours | `cp365_communityhours` | Decimal | Community care hours |
| Sleep In | `cp365_sleepin` | Boolean | Sleep-in shift |
| Shift Leader | `cp365_shiftleader` | Boolean | Is shift leader |
| Act Up | `cp365_actup` | Boolean | Acting up role |
| Senior | `cp365_senior` | Boolean | Senior role |

#### Staff Members (`cp365_staffmember`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Staff Member ID | `cp365_staffmemberid` | GUID | Primary key |
| Staff Member Name | `cp365_staffmembername` | String | Full name |
| Forename | `cp365_forename` | String | First name |
| Surname | `cp365_surname` | String | Last name |
| Staff Number | `cp365_staffnumber` | String | Employee ID |
| Work Email | `cp365_workemail` | String | Work email |
| Staff Status | `cp365_staffstatus` | OptionSet | Active, Pending, Left |
| Date of Birth | `cp365_dateofbirth` | Date | DOB |
| Default Location | `cp365_defaultlocation` | Lookup | FK to Locations |
| Line Manager | `cp365_linemanager` | Lookup | FK to Staff Members |
| User Account | `cp365_useraccount` | Lookup | FK to Users |
| Agency Worker | `cp365_agencyworker` | OptionSet | Yes/No |

#### Locations (`cp365_location`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Location ID | `cp365_locationid` | GUID | Primary key |
| Location Name | `cp365_locationname` | String | Name |
| Location Status | `cp365_locationstatus` | OptionSet | Occupied, Vacant |

#### Sublocations (`cp365_sublocation`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Sublocation ID | `cp365_sublocationid` | GUID | Primary key |
| Sublocation Name | `cp365_sublocationname` | String | Name |
| Location | `cp365_location` | Lookup | FK to Locations |
| Allow Shift Clashes | `cp365_allowshiftclashes` | OptionSet | Yes/No |
| Visible From | `cp365_visiblefrom` | Date | Staff visibility start |
| Visible To | `cp365_visibleto` | Date | Staff visibility end |

#### Rotas (`cp365_rota`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Rota ID | `cp365_rotaid` | GUID | Primary key |
| Rota Name | `cp365_rotaname` | String | Name |
| Sublocation | `cp365_sublocation` | Lookup | FK to Sublocations |
| Status | `statecode` | OptionSet | Active/Inactive |
| Rota Start Date | `cp365_rotastartdate` | Date | Start date |

#### Shift References (`cp365_shiftreference`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Shift Reference ID | `cp365_shiftreferenceid` | GUID | Primary key |
| Shift Reference Name | `cp365_shiftreferencename` | String | Name |
| Start Hour | `cp365_shiftreferencestarthour` | Integer | Start hour (0-23) |
| Start Minute | `cp365_shiftreferencestartminute` | Integer | Start minute |
| End Hour | `cp365_shiftreferenceendhour` | Integer | End hour |
| End Minute | `cp365_shiftreferenceendminute` | Integer | End minute |
| Location | `cp365_location` | Lookup | FK to Locations |
| Sublocation | `cp365_sublocation` | Lookup | FK to Sublocations |
| Sleep In | `cp365_sleepin` | Boolean | Has sleep-in |
| End On Next Day | `cp365_endonnextday` | Boolean | Ends next day |

#### Staff Contracts (`cp365_staffcontract`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Staff Contract ID | `cp365_staffcontractid` | GUID | Primary key |
| Staff Member | `cp365_staffmember` | Lookup | FK to Staff Members |
| Contract | `cp365_contract` | Lookup | FK to Contracts |
| Start Date | `cp365_startdate` | Date | Contract start |
| End Date | `cp365_enddate` | Date | Contract end |
| Active | `cp365_active` | Boolean | Is active contract |

#### Sublocation Staff (`cp365_sublocationstaff`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Sublocation Staff ID | `cp365_sublocationstaffid` | GUID | Primary key |
| Staff Member | `cp365_staffmember` | Lookup | FK to Staff Members |
| Sublocation | `cp365_sublocation` | Lookup | FK to Sublocations |
| Visible From | `cp365_visiblefrom` | Date | Visibility start |
| Visible To | `cp365_visibleto` | Date | Visibility end |

#### Staff Time Away From Work (`cp365_staffabsencelog`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Staff Absence Log ID | `cp365_staffabsencelogid` | GUID | Primary key |
| Staff Member | `cp365_staffmember` | Lookup | FK to Staff Members |
| Absence Type | `cp365_absencetype` | Lookup | FK to Absence Types |
| Start Date | `cp365_startdate` | Date | Start |
| End Date | `cp365_enddate` | Date | End |
| Sensitive | `cp365_sensitive` | Boolean | Hide details |

#### Agency Workers (`cp365_agencyworker`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Agency Worker ID | `cp365_agencyworkerid` | GUID | Primary key |
| Agency Worker Name | `cp365_agencyworkername` | String | Name |
| Agency | `cp365_agency` | Lookup | FK to Agencies |
| Status | `cp365_status` | OptionSet | Active, Left |

#### Service Users (`cp365_serviceuser`)
| Column | Logical Name | Type | Description |
|--------|--------------|------|-------------|
| Service User ID | `cp365_serviceuserid` | GUID | Primary key |
| Service User Name | `cp365_serviceusername` | String | Name |
| Status | `statecode` | OptionSet | Active/Inactive |

### 3.2 Supporting Tables

- `cp365_agency` - Staffing agencies
- `cp365_absencetype` - Leave/absence types
- `cp365_shiftactivity` - Shift activity types
- `cp365_shiftpattern` - Recurring shift patterns
- `cp365_capability` - Staff skills/certifications
- `cp365_staffcapability` - Staff-capability junction
- `cp365_staffteam` - Teams of staff
- `cp365_staffteammember` - Team membership
- `cp365_department` - Departments
- `cp365_jobtitle` - Job titles
- `cp365_contract` - Contract templates
- `cp365_contractcategory` - Contract categories
- `cp365_cp365configuration` - App configuration

---

## 4. Power Automate Flows (API Layer)

### 4.1 Flow Endpoints

These flows are called from the Canvas app and should be called from React via HTTP triggers.

#### Component|BuildNewRotaView
**Purpose**: Builds the rota grid data for a given date range and sublocation.

**Input Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| ShiftStartDate | String (dd/mm/yyyy) | Start date |
| LocationID | GUID | Sublocation ID |
| Duration | Number | Days to show (7, 28) |
| rotaID | String (optional) | Specific rota ID |

**Output**:
```json
{
  "view": "[Array of shift objects as JSON string]",
  "sublocationstaff": "[Array of staff objects as JSON string]",
  "monthlyshifts": "[Array for monthly view]",
  "driverskill": "[Array of driver capabilities]"
}
```

**Shift Object Structure** (from flow response):
```typescript
interface ShiftData {
  'Shift ID': string;
  'Shift Name': string;
  'Shift Date': string;
  'Shift Start Time': string;
  'Shift End Time': string;
  'Shift Status': number;
  'Shift Type': string; // Day, Night, Sleep In
  'Staff Member ID': string;
  'Staff Member Name': string;
  'Job Title': string;
  'Rota ID': string;
  'Rota Name': string;
  'Sublocation ID': string;
  'Sublocation Name': string;
  'Shift Reference Name': string;
  'Overtime Shift': boolean;
  'Community Hours': number;
  'Shift Leader': boolean;
  'Act Up': boolean;
  'Senior': boolean;
  'Allow Shift Clashes': boolean;
  'Shift Pattern ID': string;
  // ... additional fields
}
```

#### Rostering-CreateBulkShift
**Purpose**: Creates multiple shifts based on pattern/recurrence settings.

**Input Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| PatternData | JSON String | Pattern configuration |
| AssignedPeople | JSON String | Array of staff to assign |
| StaffMembersXML | XML String | Staff member IDs in XML format |

**PatternData Structure**:
```typescript
interface PatternData {
  StartDate: string;
  EndDate: string;
  RotaID: string;
  LocationID: string;
  PatternType: 'Daily' | 'Weekly' | 'Weekday' | 'Rotation';
  DailySkip?: number;
  WeeklySkip?: number;
  WorkingDays?: number;
  RestingDays?: number;
  SelectedDays?: {
    Monday?: boolean;
    Tuesday?: boolean;
    // ... etc
  };
  ShiftReferenceID: string;
  ShiftActivityID: string;
  BreakDuration: number;
  // ... additional fields
}
```

#### Component|GetTAFWforstaffmember
**Purpose**: Gets Time Away From Work (absences) for staff members.

**Input Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| StaffMemberIDs | XML String | Staff IDs in XML format |
| StartDate | String (yyyy-mm-dd) | Range start |
| EndDate | String (yyyy-mm-dd) | Range end |

#### Component|GetOtherShiftsbyStaffMemberandDate
**Purpose**: Gets shifts from other rotas for the same staff (dual-location visibility).

**Input Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| StaffArray | JSON String | Array of staff member IDs |
| StartDate | String (yyyy-mm-dd) | Range start |
| EndDate | String (yyyy-mm-dd) | Range end |
| ExcludeRotaID | GUID | Rota to exclude |

#### Component|HandleClashingShifts
**Purpose**: Validates and handles shift time conflicts.

#### Component|SendRotaNotifications
**Purpose**: Sends notifications for published shifts.

#### Component|UnassignShift>StaffMemberRelationship
**Purpose**: Removes staff assignment from a shift.

#### Component|RemoveShift>AgencyWorkerRelationship
**Purpose**: Removes agency worker from a shift.

#### GeneratePDF
**Purpose**: Generates PDF export of rota.

#### ErrorHandlingCanvasApp
**Purpose**: Logs errors from the application.

---

## 5. Screen Specifications

### 5.1 Rota Management App

#### Dashboard Screen
**Route**: `/dashboard`
**Purpose**: Main entry point showing rota overview and quick stats.

**Key Features**:
- Location/Sublocation selector (dropdown)
- Date range picker (week start)
- Rota grid showing 7 or 28 days
- Stats tiles: Hours Rostered, Agency Hours, Unassigned shifts
- Quick navigation to Weekly/Monthly views

**Data Requirements**:
- `BuildNewRotaView` flow for rota data
- Locations, Sublocations, Rotas tables
- Staff contracts for hour calculations

**UI Components**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard          [Location ▼] [Sublocation ▼]    │
├─────────────────────────────────────────────────────────────┤
│ [◄] Week of 15 Dec 2025 [►]    [Daily] [Weekly] [Monthly]  │
├─────────────────────────────────────────────────────────────┤
│  Stats: [Hours: 420] [Agency: 24] [Unassigned: 5]          │
├─────────────────────────────────────────────────────────────┤
│         │ Mon    │ Tue    │ Wed    │ Thu    │ Fri    │ ... │
│─────────┼────────┼────────┼────────┼────────┼────────┼─────│
│ J Smith │ [07-15]│ [07-15]│  OFF   │ [15-23]│ [15-23]│     │
│ A Jones │ [15-23]│ [15-23]│ [15-23]│  TAFW  │ [07-15]│     │
│ ...     │        │        │        │        │        │     │
│─────────┼────────┼────────┼────────┼────────┼────────┼─────│
│Unassign │ [07-15]│        │ [07-15]│        │        │     │
└─────────────────────────────────────────────────────────────┘
```

#### Rota View Screen
**Route**: `/rota/:duration` (duration = 7, 14, 28)
**Purpose**: Full rota management grid with edit capabilities.

**Key Features**:
- Staff rows with shift blocks
- Drag-and-drop shift assignment (future)
- Click to open shift flyout
- Shift status indicators (published/unpublished)
- Absence overlay (TAFW)
- Multi-select for bulk operations
- Publish/Unpublish actions
- Copy week functionality

**Shift Block Styling**:
```typescript
const shiftColors = {
  day: '#FCE4B4',      // Day shift
  night: '#BEDAE3',    // Night shift
  sleepIn: '#D3C7E6',  // Sleep-in
  overtime: '#E3826F', // Overtime
  absence: '#EFA18A',  // TAFW background
};

const shiftIcons = {
  day: '☀️',
  night: '🌙',
  sleepIn: '🛏️',
};
```

#### Shift Flyout Panel
**Purpose**: Edit individual shift details.

**Fields**:
- Staff Member (dropdown)
- Shift Reference (dropdown with time preview)
- Shift Activity (dropdown)
- Date (date picker)
- Start/End Time (time pickers)
- Break Duration (number input)
- Flags: Overtime, Sleep In, Shift Leader, Act Up
- Community Hours (number input)
- Recurrence options (for bulk creation)

**Actions**:
- Save
- Delete
- Unassign (removes staff but keeps shift)
- Cancel

#### Staff Capabilities Screen
**Route**: `/staff-capabilities`
**Purpose**: View/edit staff skills and certifications.

#### Service Users Screen
**Route**: `/service-users`
**Purpose**: Manage service user assignments.

#### Shift Pattern Screens
**Route**: `/shift-patterns`
**Purpose**: Create/manage recurring shift templates.

### 5.2 Rostering Administration App

#### Home Screen
**Route**: `/admin`
**Purpose**: Navigation hub for admin functions.

#### All Staff Members Screen
**Route**: `/admin/staff`
**Purpose**: List and search staff members.

**Features**:
- Search by name/staff number
- Include Leavers toggle
- Column headers: Name, ID, Age, Location, Department, Manager, Status
- Click row to view/edit

**Data Source**: `cp365_staffmembers` with related data

#### Staff Member Detail/Create Screen
**Route**: `/admin/staff/:id` or `/admin/staff/new`
**Purpose**: Full staff member profile with tabs.

**Tabs**:
1. **Personal Details**: Name, DOB, gender, contact info
2. **Employment**: Contracts, job title, department, location
3. **Addresses**: Multiple addresses support
4. **Bank Details**: Payment information
5. **Emergency Contacts**: Contact list
6. **Documents**: Document library

**Related Collections**:
- Staff Addresses (`cp365_staffaddress`)
- Staff Contacts (`cp365_staffcontact`)
- Staff Contracts (`cp365_staffcontract`)
- Staff Bank Details (`cp365_staffbankdetail`)
- Document Libraries (`cp365_documentlibrary`)

#### All Agency Workers Screen
**Route**: `/admin/agency-workers`
**Purpose**: Manage agency staff.

#### All Service Users Screen
**Route**: `/admin/service-users`
**Purpose**: Manage service users.

#### All Staff Teams Screen
**Route**: `/admin/teams`
**Purpose**: Manage staff groupings.

### 5.3 Rota View App (Read-Only)

#### Home Screen
**Route**: `/view`
**Purpose**: Simple rota viewer for staff.

**Features**:
- Location/Sublocation selector
- Date picker
- View modes: Day, Week, Month
- Shift details on click (read-only)

---

## 6. Shared Components

### 6.1 Header Component
```typescript
interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  showSettingsButton?: boolean;
  showProfileButton?: boolean;
  onRefresh?: () => void;
}
```

### 6.2 Side Navigation Component
```typescript
interface NavItem {
  name: string;
  type: 'heading' | 'childlink';
  disabled: boolean;
  route?: string;
  action?: string;
}

const navigationItems: NavItem[] = [
  { name: 'Rota Management', type: 'heading', disabled: false },
  { name: 'Weekly', type: 'childlink', disabled: false, route: '/rota/7' },
  { name: 'Monthly', type: 'childlink', disabled: false, route: '/rota/28' },
  { name: 'Administration', type: 'heading', disabled: false },
  { name: 'Employee details', type: 'childlink', disabled: false, route: '/staff-capabilities' },
  { name: 'Service user details', type: 'childlink', disabled: false, route: '/service-users' },
  { name: 'Agency Workers admin', type: 'childlink', disabled: false, route: '/admin/agency-workers' },
];
```

### 6.3 Loading Component
Full-screen overlay with spinner and "Loading..." text.

### 6.4 Error Handler Component
Global error boundary with logging to `ErrorHandlingCanvasApp` flow.

---

## 7. Theming & Branding

### CarePoint 365 Theme

```typescript
const theme = {
  name: 'CarePoint 365 Theme',
  colors: {
    primary: {
      fill: '#1FD1BA',
      hover: '#2EE5CE',
      pressed: '#0AB19B',
      selected: '#1DCAB4',
      fill10Percent: 'rgba(31, 209, 186, 0.1)',
    },
    secondary: {
      fill: '#FEA115',
      hover: '#FCE9C5',
      pressed: '#FCC969',
      selected: '#FEA115',
    },
    stats: {
      dayBold: '#B6CFB6',
      dayLight: '#D4E2D4',
      nightBold: '#A8D1D1',
      nightLight: '#C6E4E4',
      communityBold: '#FDE7B1',
      communityLight: '#FDF1D3',
    },
    others: {
      elevation1: '#FAFAFA',
      elevation2: '#ECEEF0',
      red: '#AF0524',
      yellow: '#1DCAB4',
      green: '#27AF05',
      borderGrey: '#E0E0E0',
    },
    text: '#000000',
  },
  borders: {
    radius: 10,
    style: 'solid',
    width: 1,
  },
  font: {
    size: 10,
    family: 'Arial, sans-serif',
  },
};
```

---

## 8. Authentication

### Azure AD / Entra ID Integration

```typescript
// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: '<APP_CLIENT_ID>',
    authority: 'https://login.microsoftonline.com/<TENANT_ID>',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

// Scopes for Dataverse access
const dataverseScopes = [
  'https://<ORG>.crm11.dynamics.com/.default',
];
```

### User Context
Current user identified by email match to `cp365_staffmember.cp365_workemail`.

```typescript
// Get current staff member
const currentUser = await dataverseClient.get('cp365_staffmembers', {
  filter: `cp365_workemail eq '${userEmail}'`,
  top: 1,
});
```

---

## 9. API Integration

### 9.1 Dataverse Web API Client

```typescript
// Base client setup
const DATAVERSE_URL = 'https://<ORG>.crm11.dynamics.com/api/data/v9.2';

interface QueryOptions {
  select?: string[];
  filter?: string;
  expand?: string[];
  orderby?: string;
  top?: number;
}

class DataverseClient {
  private accessToken: string;

  async get<T>(entitySet: string, options?: QueryOptions): Promise<T[]> {
    const url = this.buildUrl(entitySet, options);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Prefer': 'odata.include-annotations="*"',
      },
    });
    const data = await response.json();
    return data.value;
  }

  async create<T>(entitySet: string, data: Partial<T>): Promise<T> {
    // POST implementation
  }

  async update<T>(entitySet: string, id: string, data: Partial<T>): Promise<void> {
    // PATCH implementation
  }

  async delete(entitySet: string, id: string): Promise<void> {
    // DELETE implementation
  }
}
```

### 9.2 Common Queries

```typescript
// Get active shifts for a rota and date range
const shifts = await client.get('cp365_shifts', {
  filter: `_cp365_rota_value eq '${rotaId}' 
    and cp365_shiftdate ge ${startDate} 
    and cp365_shiftdate le ${endDate}
    and (cp365_shiftstatus eq 1001 or cp365_shiftstatus eq 1009)`,
  expand: ['cp365_staffmember', 'cp365_shiftreference', 'cp365_shiftactivity'],
  orderby: 'cp365_shiftdate asc',
});

// Get staff for a sublocation
const staff = await client.get('cp365_sublocationstaffs', {
  filter: `_cp365_sublocation_value eq '${sublocationId}'`,
  expand: ['cp365_staffmember($expand=cp365_staffcontract_staffmember)'],
});

// Get active locations
const locations = await client.get('cp365_locations', {
  filter: `cp365_locationstatus eq 'Occupied'`,
  orderby: 'cp365_locationname asc',
});
```

### 9.3 Power Automate Flow Client

```typescript
interface FlowClient {
  runBuildRotaView(params: {
    shiftStartDate: string;
    locationId: string;
    duration: number;
    rotaId?: string;
  }): Promise<RotaViewResponse>;

  runCreateBulkShift(params: {
    patternData: PatternData;
    assignedPeople: AssignedPerson[];
    staffMembersXml: string;
  }): Promise<void>;

  runGetTAFW(params: {
    staffMemberIds: string;
    startDate: string;
    endDate: string;
  }): Promise<TAFWResponse[]>;
}

// Flow HTTP trigger URLs (configure in environment)
const FLOW_URLS = {
  buildRotaView: process.env.REACT_APP_FLOW_BUILD_ROTA_VIEW,
  createBulkShift: process.env.REACT_APP_FLOW_CREATE_BULK_SHIFT,
  getTAFW: process.env.REACT_APP_FLOW_GET_TAFW,
  // ... other flows
};
```

---

## 10. State Management

### 10.1 Global State (Zustand)

```typescript
interface AppState {
  // User context
  currentUser: StaffMember | null;
  
  // Location selection
  selectedLocation: Location | null;
  selectedSublocation: Sublocation | null;
  selectedRota: Rota | null;
  
  // Date context
  selectedDate: Date;
  duration: 7 | 14 | 28;
  
  // UI state
  isLoading: boolean;
  sideNavOpen: boolean;
  
  // Actions
  setLocation: (location: Location) => void;
  setSublocation: (sublocation: Sublocation) => void;
  setDate: (date: Date) => void;
  setDuration: (duration: number) => void;
}
```

### 10.2 Rota-Specific State

```typescript
interface RotaState {
  // Grid data
  shifts: Shift[];
  staffRows: StaffRow[];
  unassignedRow: UnassignedRow;
  
  // Absences
  absences: StaffAbsence[];
  
  // Selection
  selectedShifts: Set<string>;
  
  // Flyout
  flyoutShift: Shift | null;
  flyoutMode: 'view' | 'edit' | 'create';
  
  // Actions
  loadRotaData: (params: LoadParams) => Promise<void>;
  selectShift: (shiftId: string) => void;
  publishSelectedShifts: () => Promise<void>;
  // ... etc
}
```

---

## 11. Key Business Logic

### 11.1 Date/Week Calculations

```typescript
// Get Monday of current week
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Default to Monday of current week on app start
const getDefaultRotaViewDate = (): Date => {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-GB', { weekday: 'long' });
  
  const daysFromMonday: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };
  
  const daysToSubtract = daysFromMonday[dayOfWeek] || 0;
  return addDays(today, -daysToSubtract);
};
```

### 11.2 Shift Zone Calculation

Each cell in the grid is identified by a "Zone" string:
```typescript
// Zone format: "{dayIndex}|{staffMemberId}" or "{dayIndex}|unassigned"
const calculateZone = (shiftDate: Date, startDate: Date, staffMemberId?: string): string => {
  const dayIndex = differenceInDays(shiftDate, startDate) + 1;
  return staffMemberId 
    ? `${dayIndex}|${staffMemberId}` 
    : `${dayIndex}|unassigned`;
};
```

### 11.3 Shift Status

```typescript
enum ShiftStatus {
  Published = 1001,
  Unpublished = 1009,
}

const isPublished = (shift: Shift): boolean => 
  shift.cp365_shiftstatus === ShiftStatus.Published;
```

### 11.4 Staff Visibility

Staff appear in the rota if they have a Sublocation Staff record with:
- `cp365_visiblefrom` <= current period OR blank
- `cp365_visibleto` >= current period OR blank

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Vite + React + TypeScript)
- [ ] Authentication with MSAL
- [ ] Dataverse API client
- [ ] Basic routing
- [ ] Theme/styling setup
- [ ] Shared components (Header, SideNav, Loading)

### Phase 2: Rota View - Read Only (Week 3-4)
- [ ] Dashboard screen layout
- [ ] Location/Sublocation selectors
- [ ] Date navigation
- [ ] Rota grid component (read-only)
- [ ] Shift card styling
- [ ] Integration with BuildNewRotaView flow

### Phase 3: Rota View - Edit Mode (Week 5-6)
- [ ] Shift flyout panel
- [ ] Create/Edit shift forms
- [ ] Delete shift functionality
- [ ] Staff assignment
- [ ] Shift status management
- [ ] Integration with create/update flows

### Phase 4: Advanced Features (Week 7-8)
- [ ] Bulk shift creation (patterns/recurrence)
- [ ] Copy week functionality
- [ ] Multi-select and bulk publish
- [ ] TAFW/Absence overlay
- [ ] Other rota shifts (dual location)

### Phase 5: Admin Screens (Week 9-10)
- [ ] Staff list and search
- [ ] Staff detail/edit forms
- [ ] Agency worker management
- [ ] Service user management

### Phase 6: Polish & Testing (Week 11-12)
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] User acceptance testing

---

## 13. Environment Configuration

```env
# .env.local
REACT_APP_DATAVERSE_URL=https://<ORG>.crm11.dynamics.com
REACT_APP_CLIENT_ID=<Azure AD App Client ID>
REACT_APP_TENANT_ID=<Azure AD Tenant ID>

# Power Automate Flow URLs
REACT_APP_FLOW_BUILD_ROTA_VIEW=<HTTP trigger URL>
REACT_APP_FLOW_CREATE_BULK_SHIFT=<HTTP trigger URL>
REACT_APP_FLOW_GET_TAFW=<HTTP trigger URL>
REACT_APP_FLOW_GET_OTHER_SHIFTS=<HTTP trigger URL>
REACT_APP_FLOW_HANDLE_CLASHING=<HTTP trigger URL>
REACT_APP_FLOW_SEND_NOTIFICATIONS=<HTTP trigger URL>
REACT_APP_FLOW_UNASSIGN_STAFF=<HTTP trigger URL>
REACT_APP_FLOW_REMOVE_AGENCY=<HTTP trigger URL>
REACT_APP_FLOW_GENERATE_PDF=<HTTP trigger URL>
REACT_APP_FLOW_ERROR_HANDLER=<HTTP trigger URL>
```

---

## 14. Reference Files

The following source files from the Canvas app export provide additional detail:

### Rota Management App
- `rotamanagement_src/Src/App.fx.yaml` - Global variables, OnStart logic, theme
- `rotamanagement_src/Src/DashboardScreen.fx.yaml` - Main dashboard (4000+ lines)
- `rotamanagement_src/Src/RotaViewScreen.fx.yaml` - Weekly/monthly rota view
- `rotamanagement_src/Src/Components/LeftNavComponent.fx.yaml` - Navigation
- `rotamanagement_src/Src/Components/HeaderComponent.fx.yaml` - Header

### Rostering Administration App
- `rosteringadministration_src/Src/All Staff Members Screen.fx.yaml` - Staff list
- `rosteringadministration_src/Src/Staff Member Create Screen.fx.yaml` - Staff form
- `rosteringadministration_src/Src/Components/cmp_SideBarNav.fx.yaml` - Admin navigation

### Data Sources (Table Schemas)
- `rotamanagement_src/pkgs/TableDefinitions/` - All table JSON definitions
- `rotamanagement_src/DataSources/` - Data connection configurations

### Power Automate Flows
- `Rostering/Workflows/` folder contains all flow JSON definitions

---

## 15. Notes for Cursor AI

1. **Start with the Rota Grid** - This is the most complex component. Build it first with mock data, then integrate.

2. **Use TanStack Query** - The app makes heavy use of collections that get refreshed. TanStack Query's caching and invalidation patterns map well to this.

3. **The BuildNewRotaView flow is critical** - Most of the rota screen data comes from this single flow call. Study its output structure.

4. **Zone-based rendering** - The grid uses "zones" (day|staffId) as keys. This allows efficient updates of individual cells.

5. **Handle loading states** - The Canvas app shows a full-screen loader during data fetches. Implement similar UX.

6. **Responsive design** - The Canvas app has screen size variables. Build mobile-first then scale up.

7. **Test with real Dataverse** - Mock data only goes so far. Connect to a dev environment early.

---

*Document generated from Canvas App source analysis on December 2025*
