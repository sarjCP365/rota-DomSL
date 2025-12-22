# Leave/Absence Recording Schema Analysis

## CarePoint 365 Dataverse Schema Documentation

---

## Executive Summary

CarePoint 365 manages staff leave and absence through a two-table structure:

- **cp365_absencetype** (Absence Types) - Lookup/configuration table defining types of leave
- **cp365_staffabsencelog** (Staff Time Away From Work Logs) - Transaction table recording actual leave instances

This structure supports comprehensive leave management including approval workflows, payroll integration, half-day options, and sub-type categorisation.

---

## 1. Absence Types Table (cp365_absencetype)

The Absence Types table defines the categories of time away from work available in the system. This is a configuration/lookup table that controls behaviour and styling across the application.

### 1.1 Core Fields

| Field Name | Display Name | Purpose |
|------------|--------------|---------|
| `cp365_absencetypeid` | Time Away From Work Type | Primary key (GUID) |
| `cp365_absencetypename` | Time Away From Work Name | Display name (e.g., Annual Leave, Sick Leave) |
| `cp365_financeref` | Finance Ref | Finance/payroll reference code |
| `cp365_threshold` | Threshold | Configurable threshold limit for alerts |

### 1.2 Behavioural Boolean Flags

These flags control how each absence type behaves in the system:

| Field Name | Display Name | Options |
|------------|--------------|---------|
| `cp365_paid` | Paid | Yes / No |
| `cp365_sensitive` | Sensitive | Yes / No |
| `cp365_availableforwork` | Available For Work | Yes / No |
| `cp365_availableforshifts` | Available For Shifts | Yes / No |
| `cp365_allowoverbooking` | Allow Over Booking | Yes / No |
| `cp365_noterequired` | Note Required | Yes / No |
| `cp365_subtyperequired` | Sub Type Required | Yes / No |
| `cp365_staffallowancerequiredpriortobooking` | Staff Allowance Required Prior to Booking | Yes / No |
| `cp365_lateforworkreason` | Late For Work Reason | Yes / No |
| `cp365_earlydeparturereason` | Early Departure Reason | Yes / No |

### 1.3 Option Sets (Picklists)

| Field | Values |
|-------|--------|
| `cp365_origin` (Origin) | 1 = Staff Member, 2 = Line Manager, 3 = System |
| `cp365_holidaypaymentcalculation` | 599250000 = Pay at end of holiday, 599250001 = Average across dates |
| `statecode` (Status) | 0 = Active, 1 = Inactive |

### 1.4 Related Tables

- `cp365_absencesubtype_TimeAwayFromWorkType_cp365_absencetype` → Time Away From Work Sub Types
- `cp365_staffabsencelog_AbsenceType_cp365_absence` → Staff Time Away From Work Logs
- `cp365_payrate_TAFWType_cp365_absencetype` → Pay Rates
- `cp365_timesheet_TimeAwayfromWorkType_cp365_abse` → Timesheets

---

## 2. Staff Time Away From Work Logs (cp365_staffabsencelog)

This is the transaction table that records individual leave/absence instances for staff members. Each record represents a specific period of time away from work.

### 2.1 Core Identity Fields

| Field Name | Display Name | Type |
|------------|--------------|------|
| `cp365_staffabsencelogid` | Staff Time Away From Work Log | Primary Key (GUID) |
| `cp365_staffabsencelogname` | Autonumber | Auto-generated |
| `cp365_StaffMember` | Staff Member | Lookup (Staff Members) |
| `cp365_AbsenceType` | Time Away From Work Type | Lookup (Absence Types) |
| `cp365_TimeAwayFromWorkSubType` | Sub Type | Lookup (Sub Types) |
| `cp365_StaffTimeAwayFromWork` | Staff Time Away From Work Link | Lookup (related record) |

### 2.2 Date/Time Fields

| Field Name | Display Name | Purpose |
|------------|--------------|---------|
| `cp365_absencestart` | Time Away From Work Start | Start date/time |
| `cp365_absenceend` | Time Away From Work End | End date/time |
| `cp365_absencestartminute` | Start Minute | Minute precision |
| `cp365_totalleavedays` | Total Leave Days | Calculated days |
| `cp365_totalleavehours` | Total Leave Hours | Calculated hours |

### 2.3 Status & Approval Fields

| Field | Details |
|-------|---------|
| `cp365_absencestatus` | **1=Active, 2=Pending, 3=Approved, 4=Rejected, 5=Inactive, 6=Expired, 7=Cancelled** |
| `cp365_ApprovalManager` | Lookup to Staff Member who approved/rejected |
| `cp365_approvercomments` | Free text comments from approver |
| `cp365_staffcomments` | Free text comments from staff member |

### 2.4 Half Day Option

`cp365_halfdayoption` - Global option set for partial day absences:

| Value | Label |
|-------|-------|
| 599250000 | Full Day |
| 599250001 | AM Only |
| 599250002 | PM Only |

### 2.5 Payroll Integration Fields

| Field | Purpose |
|-------|---------|
| `cp365_exportedtopayroll` | Boolean: Has been exported to payroll system |
| `cp365_dateexportedtopayroll` | DateTime: When exported to payroll |
| `cp365_reconciled` | Boolean: Has been reconciled in payroll |
| `cp365_datereconciled` | DateTime: When reconciled |
| `cp365_PayRate` | Lookup: Pay rate to apply for this absence |
| `cp365_PayrollPeriod` | Lookup: Payroll period this absence falls in |
| `cp365_payrollperiodid` | Payroll Period ID (string) |
| `cp365_hourspaid` | Decimal: Hours paid for this absence |
| `cp365_issalaried` | Boolean: Is staff member salaried (affects calculation) |
| `cp365_needsacontract` | Boolean: Staff needs a contract |
| `cp365_ExportedFile` | Lookup: Reference to exported file |

### 2.6 Additional Fields

| Field | Purpose |
|-------|---------|
| `cp365_attachments` | File attachments |
| `cp365_staffabsencelog_Annotations` | Notes/annotations |
| `cp365_documentlibrary_TimeAwayFromWorkLog_cp365` | Document Libraries |

---

## 3. Entity Relationships

```
┌─────────────────────┐
│   Staff Members     │
│ (cp365_staffmember) │
└─────────┬───────────┘
          │ 1:N
          ▼
┌─────────────────────────────────┐
│  Staff Time Away From Work Logs │
│    (cp365_staffabsencelog)      │
└─────────┬───────────────────────┘
          │ N:1
          ▼
┌─────────────────────┐        ┌─────────────────────┐
│    Absence Types    │◄───────│  Absence Sub Types  │
│ (cp365_absencetype) │  1:N   │                     │
└─────────┬───────────┘        └─────────────────────┘
          │ 1:N
          ▼
┌─────────────────────┐
│      Pay Rates      │
└─────────────────────┘
```

### Key Relationships:

- **Staff Members → Staff Time Away From Work Logs** (One-to-Many)
- **Absence Types → Staff Time Away From Work Logs** (One-to-Many)
- **Absence Types → Time Away From Work Sub Types** (One-to-Many)
- **Absence Types → Pay Rates** (One-to-Many)
- **Staff Time Away From Work Logs → Timesheets** (Referenced)

---

## 4. Business Rules & Workflow

### 4.1 Status Workflow

The `cp365_absencestatus` field follows a typical approval workflow:

```
┌─────────┐     ┌──────────┐     ┌──────────┐
│ Pending │────►│ Approved │────►│ Exported │
│   (2)   │     │   (3)    │     │ Payroll  │
└────┬────┘     └──────────┘     └──────────┘
     │
     │          ┌──────────┐
     └─────────►│ Rejected │
                │   (4)    │
                └──────────┘

     ┌───────────┐
     │ Cancelled │ (Staff initiated)
     │    (7)    │
     └───────────┘

     ┌───────────┐
     │  Expired  │ (System - no action taken)
     │    (6)    │
     └───────────┘
```

### 4.2 Rota Integration Query

When displaying on the rota, query Staff Time Away From Work Logs where:

```typescript
// Filter criteria for rota display
const leaveFilter = {
  absencestart: { le: rotaEndDate },    // Started before rota ends
  absenceend: { ge: rotaStartDate },     // Ends after rota starts
  absencestatus: 3,                      // Approved only
  staffMember: { in: filteredStaffIds }  // Staff in current team/location
};
```

Leave records span across day columns on the rota grid. Visual styling is determined by joining to the Absence Types table.

---

## 5. TypeScript Interfaces for React

```typescript
/**
 * Absence Type - Configuration/Lookup table
 * Table: cp365_absencetype
 * EntitySet: cp365_absencetypes
 */
export interface AbsenceType {
  cp365_absencetypeid: string;
  cp365_absencetypename: string;
  
  // Behavioural flags
  cp365_paid: boolean;
  cp365_sensitive: boolean;
  cp365_availableforwork: boolean;
  cp365_availableforshifts: boolean;
  cp365_allowoverbooking: boolean;
  
  // Validation flags
  cp365_noterequired: boolean;
  cp365_subtyperequired: boolean;
  cp365_staffallowancerequiredpriortobooking: boolean;
  
  // Timesheet flags
  cp365_lateforworkreason: boolean;
  cp365_earlydeparturereason: boolean;
  
  // Finance
  cp365_financeref?: string;
  cp365_threshold?: number;
  cp365_holidaypaymentcalculation?: HolidayPaymentCalculation;
  cp365_origin?: AbsenceOrigin;
  
  // Status
  statecode: number; // 0 = Active, 1 = Inactive
  statuscode: number;
}

/**
 * Staff Absence Log - Transaction table
 * Table: cp365_staffabsencelog
 * EntitySet: cp365_staffabsencelogs
 */
export interface StaffAbsenceLog {
  cp365_staffabsencelogid: string;
  cp365_staffabsencelogname: string; // Autonumber
  
  // Relationships
  _cp365_staffmember_value: string;
  _cp365_absencetype_value: string;
  _cp365_timeawayfromworksubtype_value?: string;
  _cp365_approvalmanager_value?: string;
  _cp365_payrate_value?: string;
  _cp365_payrollperiod_value?: string;
  
  // Expanded lookups (when using $expand)
  cp365_StaffMember?: { cp365_staffmemberid: string; cp365_fullname: string };
  cp365_AbsenceType?: AbsenceType;
  cp365_ApprovalManager?: { cp365_staffmemberid: string; cp365_fullname: string };
  
  // Date/Time
  cp365_absencestart: string; // ISO DateTime
  cp365_absenceend: string;   // ISO DateTime
  cp365_absencestartminute?: number;
  cp365_totalleavedays?: number;
  cp365_totalleavehours?: number;
  
  // Status & Approval
  cp365_absencestatus: AbsenceStatus;
  cp365_approvercomments?: string;
  cp365_staffcomments?: string;
  
  // Half Day
  cp365_halfdayoption?: HalfDayOption;
  
  // Payroll
  cp365_exportedtopayroll: boolean;
  cp365_dateexportedtopayroll?: string;
  cp365_reconciled: boolean;
  cp365_datereconciled?: string;
  cp365_hourspaid?: number;
  cp365_issalaried: boolean;
  cp365_payrollperiodid?: string;
  
  // System fields
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
}

/**
 * Absence Status Option Set
 */
export enum AbsenceStatus {
  Active = 1,
  Pending = 2,
  Approved = 3,
  Rejected = 4,
  Inactive = 5,
  Expired = 6,
  Cancelled = 7
}

/**
 * Half Day Option Set
 */
export enum HalfDayOption {
  FullDay = 599250000,
  AMOnly = 599250001,
  PMOnly = 599250002
}

/**
 * Holiday Payment Calculation Option Set
 */
export enum HolidayPaymentCalculation {
  PayAtEndOfHoliday = 599250000,
  AverageAcrossDates = 599250001
}

/**
 * Absence Origin Option Set
 */
export enum AbsenceOrigin {
  StaffMember = 1,
  LineManager = 2,
  System = 3
}
```

---

## 6. Data Fetching Examples

### 6.1 Fetch Absence Types (for dropdown/styling)

```typescript
const fetchAbsenceTypes = async (): Promise<AbsenceType[]> => {
  const response = await fetch(
    `${apiUrl}/cp365_absencetypes?$filter=statecode eq 0&$orderby=cp365_absencetypename`
  );
  const data = await response.json();
  return data.value;
};
```

### 6.2 Fetch Leave for Rota Date Range

```typescript
const fetchLeaveForRota = async (
  staffIds: string[],
  startDate: Date,
  endDate: Date
): Promise<StaffAbsenceLog[]> => {
  const staffFilter = staffIds.map(id => 
    `_cp365_staffmember_value eq '${id}'`
  ).join(' or ');
  
  const filter = [
    `cp365_absencestart le ${endDate.toISOString()}`,
    `cp365_absenceend ge ${startDate.toISOString()}`,
    `cp365_absencestatus eq 3`, // Approved only
    `(${staffFilter})`
  ].join(' and ');
  
  const response = await fetch(
    `${apiUrl}/cp365_staffabsencelogs?$filter=${encodeURIComponent(filter)}&$expand=cp365_AbsenceType,cp365_StaffMember`
  );
  const data = await response.json();
  return data.value;
};
```

### 6.3 Check Leave Conflicts

```typescript
const checkLeaveConflict = (
  shiftDate: Date,
  staffId: string,
  leaveRecords: StaffAbsenceLog[]
): StaffAbsenceLog | undefined => {
  return leaveRecords.find(leave => {
    if (leave._cp365_staffmember_value !== staffId) return false;
    
    const leaveStart = new Date(leave.cp365_absencestart);
    const leaveEnd = new Date(leave.cp365_absenceend);
    
    return shiftDate >= leaveStart && shiftDate <= leaveEnd;
  });
};
```

---

## 7. UI Styling Guidelines

### 7.1 Leave Type Colors (for rota display)

```typescript
const getLeaveTypeStyle = (absenceTypeName: string): React.CSSProperties => {
  const styles: Record<string, React.CSSProperties> = {
    'Annual Leave': { 
      backgroundColor: '#FFF3E0', 
      borderColor: '#FFB74D',
      color: '#E65100'
    },
    'Sick Leave': { 
      backgroundColor: '#FFEBEE', 
      borderColor: '#EF9A9A',
      color: '#C62828'
    },
    'Training': { 
      backgroundColor: '#E3F2FD', 
      borderColor: '#90CAF9',
      color: '#1565C0'
    },
    'default': { 
      backgroundColor: '#F5F5F5', 
      borderColor: '#BDBDBD',
      color: '#424242'
    }
  };
  
  return styles[absenceTypeName] || styles.default;
};
```

### 7.2 Status Badge Colors

```typescript
const getStatusStyle = (status: AbsenceStatus): string => {
  const statusStyles: Record<AbsenceStatus, string> = {
    [AbsenceStatus.Active]: 'bg-blue-100 text-blue-800',
    [AbsenceStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [AbsenceStatus.Approved]: 'bg-green-100 text-green-800',
    [AbsenceStatus.Rejected]: 'bg-red-100 text-red-800',
    [AbsenceStatus.Inactive]: 'bg-gray-100 text-gray-800',
    [AbsenceStatus.Expired]: 'bg-orange-100 text-orange-800',
    [AbsenceStatus.Cancelled]: 'bg-gray-200 text-gray-600'
  };
  
  return statusStyles[status] || statusStyles[AbsenceStatus.Active];
};
```

---

## 8. Summary

The CarePoint 365 leave/absence system provides a comprehensive solution for managing staff time away from work:

| Feature | Implementation |
|---------|----------------|
| Configurable absence types | Boolean flags on cp365_absencetype |
| Approval workflow | 7-status workflow on cp365_absencestatus |
| Half-day support | cp365_halfdayoption (Full/AM/PM) |
| Payroll integration | Export flags, reconciliation, pay rates |
| Sub-type categorisation | cp365_TimeAwayFromWorkSubType lookup |
| Rota integration | Query by date range + Approved status |
| Sensitive data handling | cp365_sensitive flag for privacy |

---

## Appendix: Field Reference Quick Lookup

### Absence Types (cp365_absencetype)
- **Primary Key**: `cp365_absencetypeid`
- **Name Field**: `cp365_absencetypename`
- **Entity Set**: `cp365_absencetypes`
- **Logical Name**: `cp365_absencetype`

### Staff Absence Logs (cp365_staffabsencelog)
- **Primary Key**: `cp365_staffabsencelogid`
- **Name Field**: `cp365_staffabsencelogname` (autonumber)
- **Entity Set**: `cp365_staffabsencelogs`
- **Logical Name**: `cp365_staffabsencelog`
