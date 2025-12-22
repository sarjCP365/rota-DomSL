/**
 * Application Types
 * Shared type definitions used across the application
 */

// Re-export Dataverse types for convenience
export type {
  Shift,
  StaffMember,
  Location,
  Sublocation,
  Rota,
  ShiftReference,
  StaffAbsenceLog,
  AgencyWorker,
  ServiceUser,
  Unit,
  UnitWithStats,
  TeamWithStats,
  StaffMemberWithShifts,
  StaffTeam,
} from '../api/dataverse/types';

export { ShiftStatus, UnitTypeCode, StateCode } from '../api/dataverse/types';

// UI/View Types

export interface ShiftView {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'day' | 'night' | 'sleepIn';
  status: 'published' | 'unpublished';
  staffMemberId?: string;
  staffMemberName?: string;
  isOvertime: boolean;
  isShiftLeader: boolean;
  isActUp: boolean;
  isSenior: boolean;
  communityHours: number;
  breakDuration: number;
}

export interface StaffRow {
  staffMemberId: string;
  staffMemberName: string;
  jobTitle?: string;
  shifts: ShiftView[];
  absences: AbsenceView[];
}

export interface AbsenceView {
  id: string;
  staffMemberId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  isSensitive: boolean;
}

export interface RotaGridData {
  startDate: Date;
  endDate: Date;
  duration: 7 | 14 | 28;
  staffRows: StaffRow[];
  unassignedShifts: ShiftView[];
  dates: Date[];
}

// Form Types

export interface ShiftFormData {
  staffMemberId?: string;
  shiftReferenceId?: string;
  shiftActivityId?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isOvertime: boolean;
  isSleepIn: boolean;
  isShiftLeader: boolean;
  isActUp: boolean;
  communityHours: number;
}

export interface PatternFormData {
  patternType: 'Daily' | 'Weekly' | 'Weekday' | 'Rotation';
  startDate: string;
  endDate: string;
  shiftReferenceId: string;
  shiftActivityId: string;
  breakDuration: number;
  dailySkip?: number;
  weeklySkip?: number;
  workingDays?: number;
  restingDays?: number;
  selectedDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

// Navigation Types

export interface NavItem {
  name: string;
  type: 'heading' | 'childlink';
  disabled: boolean;
  route?: string;
  action?: string;
  icon?: string;
}

// Utility Types

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

