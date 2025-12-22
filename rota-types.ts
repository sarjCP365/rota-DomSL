// CarePoint 365 Rota Application - TypeScript Types
// Generated from Canvas App source analysis

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Shift {
  cp365_shiftid: string;
  cp365_shiftname: string;
  cp365_shiftdate: string; // ISO date
  cp365_shiftstarttime: string; // ISO datetime
  cp365_shiftendtime: string; // ISO datetime
  cp365_shiftstatus: ShiftStatus;
  cp365_shifttype: ShiftType;
  cp365_overtimeshift: boolean;
  cp365_breakduration: number;
  cp365_communityhours: number;
  cp365_sleepin: boolean;
  cp365_shiftleader: boolean;
  cp365_actup: boolean;
  cp365_senior: boolean;
  
  // Lookups (navigation properties)
  _cp365_staffmember_value: string | null;
  _cp365_rota_value: string;
  _cp365_shiftreference_value: string | null;
  _cp365_shiftactivity_value: string | null;
  _cp365_shiftpattern_value: string | null;
  _cp365_serviceuser_value: string | null;
  
  // Expanded entities
  cp365_staffmember?: StaffMember;
  cp365_rota?: Rota;
  cp365_shiftreference?: ShiftReference;
  cp365_shiftactivity?: ShiftActivity;
}

export enum ShiftStatus {
  Published = 1001,
  Unpublished = 1009,
}

export type ShiftType = 'Day' | 'Night' | 'Sleep In';

export interface StaffMember {
  cp365_staffmemberid: string;
  cp365_staffmembername: string;
  cp365_forename: string;
  cp365_surname: string;
  cp365_staffnumber: string;
  cp365_workemail: string;
  cp365_personalemail: string | null;
  cp365_personalmobile: string | null;
  cp365_workmobile: string | null;
  cp365_dateofbirth: string | null;
  cp365_staffstatus: StaffStatus;
  cp365_agencyworker: YesNo;
  
  // Lookups
  _cp365_defaultlocation_value: string | null;
  _cp365_linemanager_value: string | null;
  _cp365_useraccount_value: string | null;
  _cp365_gender_value: string | null;
  _cp365_title_value: string | null;
  
  // Expanded
  cp365_defaultlocation?: Location;
  cp365_linemanager?: StaffMember;
}

export enum StaffStatus {
  Active = 1,
  Pending = 2,
  LeftOrganisation = 3,
}

export enum YesNo {
  Yes = 1,
  No = 0,
}

export interface Location {
  cp365_locationid: string;
  cp365_locationname: string;
  cp365_locationstatus: LocationStatus;
  cp365_addressline1: string | null;
  cp365_addressline2: string | null;
  cp365_city: string | null;
  cp365_postcode: string | null;
}

export enum LocationStatus {
  Occupied = 'Occupied',
  Vacant = 'Vacant',
}

export interface Sublocation {
  cp365_sublocationid: string;
  cp365_sublocationname: string;
  cp365_allowshiftclashes: YesNo;
  cp365_visiblefrom: string | null;
  cp365_visibleto: string | null;
  
  _cp365_location_value: string;
  cp365_location?: Location;
}

export interface Rota {
  cp365_rotaid: string;
  cp365_rotaname: string;
  cp365_rotastartdate: string | null;
  statecode: StateCode;
  
  _cp365_sublocation_value: string;
  cp365_sublocation?: Sublocation;
}

export enum StateCode {
  Active = 0,
  Inactive = 1,
}

export interface ShiftReference {
  cp365_shiftreferenceid: string;
  cp365_shiftreferencename: string;
  cp365_shiftreferencestarthour: number;
  cp365_shiftreferencestartminute: number;
  cp365_shiftreferenceendhour: number;
  cp365_shiftreferenceendminute: number;
  cp365_sleepin: boolean;
  cp365_endonnextday: boolean;
  cp365_sleepinstarthour: number | null;
  cp365_sleepinstartminute: number | null;
  cp365_sleepineinendhour: number | null;
  cp365_sleepinendminute: number | null;
  
  _cp365_location_value: string | null;
  _cp365_sublocation_value: string | null;
}

export interface ShiftActivity {
  cp365_shiftactivityid: string;
  cp365_shiftactivityname: string;
  cp365_countstowardscare: YesNo;
  cp365_shiftactivitycaretype: ShiftActivityCareType;
}

export enum ShiftActivityCareType {
  StandardCare = 'Standard Care',
  CommunityCare = 'Community Care',
  EmergencyCare = 'Emergency Care',
  NonCare = 'Non-Care',
}

export interface ShiftPattern {
  cp365_shiftpatternid: string;
  cp365_shiftpatternname: string;
  cp365_patterntype: PatternType;
  cp365_workingdays: number | null;
  cp365_restingdays: number | null;
  cp365_dailyskip: number | null;
  cp365_weeklyskip: number | null;
  cp365_monday: boolean;
  cp365_tuesday: boolean;
  cp365_wednesday: boolean;
  cp365_thursday: boolean;
  cp365_friday: boolean;
  cp365_saturday: boolean;
  cp365_sunday: boolean;
}

export type PatternType = 'Daily' | 'Weekly' | 'Weekday' | 'Rotation';

export interface StaffContract {
  cp365_staffcontractid: string;
  cp365_startdate: string;
  cp365_enddate: string | null;
  cp365_active: boolean;
  
  _cp365_staffmember_value: string;
  _cp365_contract_value: string;
  
  cp365_staffmember?: StaffMember;
  cp365_contract?: Contract;
}

export interface Contract {
  cp365_contractid: string;
  cp365_contractname: string;
  cp365_requiredhours: number | null;
  cp365_paymenttype: PaymentType;
  
  _cp365_location_value: string | null;
  _cp365_department_value: string | null;
  _cp365_jobtitle_value: string | null;
  _cp365_contractcategory_value: string | null;
  
  cp365_jobtitle?: JobTitle;
  cp365_department?: Department;
}

export enum PaymentType {
  Hourly = 1,
  Salaried = 2,
}

export interface SublocationStaff {
  cp365_sublocationstaffid: string;
  cp365_sublocationstaffname: string;
  cp365_visiblefrom: string | null;
  cp365_visibleto: string | null;
  
  _cp365_staffmember_value: string;
  _cp365_sublocation_value: string;
  
  cp365_staffmember?: StaffMember;
  cp365_sublocation?: Sublocation;
}

export interface StaffAbsenceLog {
  cp365_staffabsencelogid: string;
  cp365_startdate: string;
  cp365_enddate: string;
  cp365_sensitive: boolean;
  
  _cp365_staffmember_value: string;
  _cp365_absencetype_value: string;
  
  cp365_staffmember?: StaffMember;
  cp365_absencetype?: AbsenceType;
}

export interface AbsenceType {
  cp365_absencetypeid: string;
  cp365_absencetypename: string;
  cp365_sensitive: boolean;
}

export interface AgencyWorker {
  cp365_agencyworkerid: string;
  cp365_agencyworkername: string;
  cp365_status: AgencyWorkerStatus;
  
  _cp365_agency_value: string;
  cp365_agency?: Agency;
}

export enum AgencyWorkerStatus {
  Active = 1,
  Left = 2,
}

export interface Agency {
  cp365_agencyid: string;
  cp365_agencyname: string;
}

export interface ServiceUser {
  cp365_serviceuserid: string;
  cp365_serviceusername: string;
  statecode: StateCode;
}

export interface Department {
  cp365_departmentid: string;
  cp365_departmentname: string;
  _cp365_location_value: string | null;
}

export interface JobTitle {
  cp365_jobtitleid: string;
  cp365_jobtitlename: string;
}

export interface StaffTeam {
  cp365_staffteamid: string;
  cp365_staffteamname: string;
}

export interface StaffTeamMember {
  cp365_staffteammemberid: string;
  _cp365_staffteam_value: string;
  _cp365_staffmember_value: string;
}

export interface Capability {
  cp365_capabilityid: string;
  cp365_capabilityname: string;
  cp365_drivercapability: boolean;
}

export interface StaffCapability {
  cp365_staffcapabilityid: string;
  cp365_capabilitystartdate: string | null;
  cp365_capabilityenddate: string | null;
  
  _cp365_staffmember_value: string;
  _cp365_capability_value: string;
}

// =============================================================================
// FLOW RESPONSE TYPES
// =============================================================================

export interface BuildRotaViewResponse {
  view: string; // JSON string of ShiftViewData[]
  sublocationstaff: string; // JSON string of SublocationStaffViewData[]
  monthlyshifts: string; // JSON string
  driverskill: string; // JSON string
}

export interface ShiftViewData {
  'Shift ID': string;
  'Shift Name': string;
  'Shift Date': string;
  'Shift Start Time': string;
  'Shift End Time': string;
  'Shift Status': number;
  'Shift Type': string;
  'Staff Member ID': string | null;
  'Staff Member Name': string;
  'Staff Status': number | null;
  'Job Title': string | null;
  'Staff Teams': string[];
  'Rota ID': string;
  'Rota Name': string;
  'Rota Start Date': string | null;
  'Sublocation ID': string;
  'Sublocation Name': string;
  'Sublocation Visible From': string | null;
  'Sublocation Visible To': string | null;
  'Shift Reference': string | null;
  'Shift Reference Name': string | null;
  'Shift Reference Start Hour': number | null;
  'Shift Reference Start Minute': number | null;
  'Shift Reference End Hour': number | null;
  'Shift Reference End Minute': number | null;
  'Shift Reference Sleep In': boolean;
  'Shift Reference End On Next Day': boolean;
  'Shift Reference Sleep In Start Hour': number | null;
  'Shift Reference Sleep In Start Minute': number | null;
  'Shift Reference Sleep In End Hour': number | null;
  'Shift Reference Sleep In End Minute': number | null;
  'Shift Activity': string | null;
  'Shift Activity Care Type': string | null;
  'Counts Towards Care': boolean;
  'Shift Pattern ID': string | null;
  'Shift Pattern Name': string | null;
  'Shift Pattern Type': string | null;
  'Shift Pattern Working Days': number | null;
  'Shift Pattern Resting Days': number | null;
  'Shift Pattern Daily Skip': number | null;
  'Shift Pattern Weekly Skip': number | null;
  'Pattern Day Selected Monday': boolean;
  'Pattern Day Selected Tuesday': boolean;
  'Pattern Day Selected Wednesday': boolean;
  'Pattern Day Selected Thursday': boolean;
  'Pattern Day Selected Friday': boolean;
  'Pattern Day Selected Saturday': boolean;
  'Pattern Day Selected Sunday': boolean;
  'Bulk Pattern': boolean;
  'Bulk Pattern Start Time': string | null;
  'Bulk Pattern End Time': string | null;
  'Shift Pattern Activity': string | null;
  'Overtime Shift': boolean;
  'Community Hours': number;
  'Community Hours Note': string | null;
  'Community Hours Owner': string | null;
  'Community Hours Last Edit': string | null;
  'Shift Break Duration': number;
  'Sleep In': boolean;
  'Sleep In Start Hour': number | null;
  'Sleep In Start Minute': number | null;
  'Sleep In End Hour': number | null;
  'Sleep In End Minute': number | null;
  'Shift Leader': boolean;
  'Act Up': boolean;
  'Senior': boolean;
  'Allow Shift Clashes': boolean;
  'Contract End Date': string | null;
  'End on the following day': boolean;
  'Department': string | null;
  'Shift Setup Type': string | null;
}

export interface SublocationStaffViewData {
  'Staff Member ID': string;
  'Staff Member Name': string;
  'Staff Status': number;
  'Contract End Date': string | null;
  'Job Title Name': string | null;
  'Job Type Name': string | null;
  'Staff Teams': string[];
  'Department': string | null;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface RotaGridCell {
  zone: string; // Format: "{dayIndex}|{staffMemberId}" or "{dayIndex}|unassigned"
  day: number;
  staffMemberId: string | null;
  shifts: ProcessedShift[];
  isSelected: boolean;
  hasAbsence: boolean;
  absenceType?: string;
}

export interface ProcessedShift extends ShiftViewData {
  zone: string;
  day: number;
  backgroundColor: string;
  icon: string;
  timeLabel: string;
  publishedIndicator: string;
  isSelected: boolean;
}

export interface StaffRow {
  staffMemberId: string;
  staffMemberName: string;
  staffStatus: number;
  jobTitle: string | null;
  staffTeams: string;
  department: string | null;
  contractEndDate: string | null;
  days: RotaGridCell[];
  weekTotals?: string;
  periodTotals?: string;
}

export interface UnassignedRow {
  staffMemberId: null;
  staffMemberName: 'Unassigned';
  days: RotaGridCell[];
}

// =============================================================================
// FLOW INPUT TYPES
// =============================================================================

export interface BuildRotaViewParams {
  shiftStartDate: string; // dd/mm/yyyy format
  locationId: string; // Sublocation GUID
  duration: number; // 7, 14, or 28
  rotaId?: string; // Optional Rota GUID
}

export interface CreateBulkShiftParams {
  patternData: PatternData;
  assignedPeople: AssignedPerson[];
  staffMembersXml: string;
}

export interface PatternData {
  StartDate: string;
  EndDate: string;
  RotaID: string;
  LocationID: string; // Actually Sublocation ID
  PatternType: PatternType;
  DailySkip?: number;
  WeeklySkip?: number;
  WorkingDays?: number;
  RestingDays?: number;
  SelectedDays?: SelectedDays;
  ShiftReferenceID: string;
  ShiftActivityID: string;
  BreakDuration: number;
  OvertimeShift: boolean;
  SleepIn: boolean;
  ShiftLeader: boolean;
  ActUp: boolean;
  CommunityHours: number;
  ShiftSetupType: string;
}

export interface SelectedDays {
  Monday?: boolean;
  Tuesday?: boolean;
  Wednesday?: boolean;
  Thursday?: boolean;
  Friday?: boolean;
  Saturday?: boolean;
  Sunday?: boolean;
}

export interface AssignedPerson {
  StaffID: string;
  StaffName: string;
}

export interface GetTAFWParams {
  staffMemberIds: string; // XML format
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
}

export interface GetOtherShiftsParams {
  staffArray: string; // JSON array of staff member IDs
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  excludeRotaId: string;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface CP365Configuration {
  cp365_cp365configurationid: string;
  cp365_cp365configurationname: string;
  cp365_value: string;
  cp365_description: string;
  cp365_productcategory: string;
}

export interface AppTheme {
  name: string;
  colors: {
    primary: {
      fill: string;
      hover: string;
      pressed: string;
      selected: string;
      fill10Percent: string;
    };
    secondary: {
      fill: string;
      hover: string;
      pressed: string;
      selected: string;
    };
    stats: {
      dayBold: string;
      dayLight: string;
      nightBold: string;
      nightLight: string;
      communityBold: string;
      communityLight: string;
    };
    others: {
      elevation1: string;
      elevation2: string;
      red: string;
      yellow: string;
      green: string;
      borderGrey: string;
    };
    text: string;
  };
  borders: {
    radius: number;
    style: string;
    width: number;
  };
  font: {
    size: number;
    family: string;
  };
}

// =============================================================================
// NAVIGATION TYPES
// =============================================================================

export interface NavItem {
  name: string;
  type: 'heading' | 'childlink';
  disabled: boolean;
  route?: string;
  action?: string;
}

// =============================================================================
// FORM TYPES (for Staff Management)
// =============================================================================

export interface StaffFormData {
  forename: string;
  surname: string;
  workEmail: string;
  personalEmail?: string;
  personalMobile?: string;
  workMobile?: string;
  dateOfBirth?: string;
  genderId?: string;
  titleId?: string;
  defaultLocationId?: string;
  lineManagerId?: string;
  staffStatus: StaffStatus;
  nationalInsuranceNumber?: string;
  payrollNumber?: string;
}

export interface StaffAddressFormData {
  addressType: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode: string;
  country?: string;
  landline?: string;
  isPrimary: boolean;
}

export interface StaffContactFormData {
  relationship: string;
  title?: string;
  forename: string;
  surname: string;
  gender?: string;
  landline?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  postcode?: string;
  isEmergencyContact: boolean;
}

export interface StaffContractFormData {
  contractId: string;
  startDate: string;
  endDate?: string;
  referrerEmail?: string;
  isActive: boolean;
}

export interface StaffBankDetailFormData {
  accountHolderName: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  bankPostcode?: string;
  isActive: boolean;
}

// =============================================================================
// VALIDATION STATE TYPES
// =============================================================================

export interface FormValidationState<T> {
  isDirty: boolean;
  isNewRecord: boolean;
  errors: Partial<Record<keyof T, string>>;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface DataverseResponse<T> {
  '@odata.context': string;
  '@odata.count'?: number;
  value: T[];
}

export interface DataverseSingleResponse<T> {
  '@odata.context': string;
  '@odata.etag': string;
} & T;
