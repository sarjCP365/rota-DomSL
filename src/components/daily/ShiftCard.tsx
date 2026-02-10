/**
 * ShiftCard Component
 * Horizontal card showing comprehensive shift information
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 6
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Bed, Edit2, UserCheck, MoreHorizontal, AlertCircle, Cake } from 'lucide-react';
import { StatusDot } from './AttendanceStatusBadge';
import {
  type ShiftWithAttendance,
  getAttendanceStatus,
  getAttendanceDetails,
  getStatusConfig,
  formatLateBy,
} from '@/utils/attendanceStatus';
import type { ShiftViewData } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

type ShiftType = 'day' | 'night' | 'sleepin';

interface ShiftCardProps {
  /** Shift data */
  shift: ShiftViewData;
  /** Callback when edit is clicked */
  onEdit?: (shiftId: string) => void;
  /** Callback when assign leader is clicked */
  onAssignLeader?: (shiftId: string) => void;
  /** Whether this is an agency shift */
  isAgency?: boolean;
  /** Whether this is from another location (read-only) */
  isExternal?: boolean;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Callback when card is clicked */
  onClick?: (shiftId: string) => void;
  /** Whether the shift is unpublished */
  isUnpublished?: boolean;
  /** Staff member's date of birth (ISO string) for birthday indicator */
  dateOfBirth?: string | null;
  /** The current date being displayed (for birthday comparison) */
  currentDate?: Date;
}

// =============================================================================
// Constants
// =============================================================================

const SHIFT_TYPE_STYLES: Record<ShiftType, { bg: string; text: string; icon: typeof Sun }> = {
  day: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: Sun,
  },
  night: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: Moon,
  },
  sleepin: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    icon: Bed,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get shift type from shift data
 */
function getShiftType(shift: ShiftViewData): ShiftType {
  if (shift['Sleep In']) return 'sleepin';

  const startHour = shift['Shift Start Time'] ? new Date(shift['Shift Start Time']).getHours() : 8;

  if (startHour >= 20 || startHour < 6) return 'night';
  return 'day';
}

/**
 * Calculate working hours from shift times
 */
function calculateWorkingHours(shift: ShiftViewData): number {
  const start = shift['Shift Start Time'];
  const end = shift['Shift End Time'];
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  // Handle overnight shifts
  let diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
  }

  const hours = diffMs / (1000 * 60 * 60);
  const breakHours = (shift['Shift Break Duration'] || 0) / 60;
  return Math.max(0, hours - breakHours);
}

/**
 * Format hours as "Xh Ym"
 */
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/**
 * Format break duration
 */
function formatBreak(minutes: number | undefined): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  if (!name || name === 'Unassigned') return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Component
// =============================================================================

export function ShiftCard({
  shift,
  onEdit,
  onAssignLeader,
  isAgency = false,
  isExternal = false,
  isSelected = false,
  onClick,
  isUnpublished = false,
  dateOfBirth,
  currentDate,
}: ShiftCardProps) {
  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const shiftId = shift['Shift ID'];
  const staffName = shift['Staff Member Name'] || 'Unassigned';
  const isUnassigned = !shift['Staff Member ID'];
  const jobTitle = shift['Job Title'] || shift['Shift Activity'] || 'Standard Care';
  const initials = getInitials(staffName);

  // Check if today is the staff member's birthday
  const isBirthday = useMemo(() => {
    if (!dateOfBirth || isUnassigned) return false;
    try {
      const dob = new Date(dateOfBirth);
      const today = currentDate || new Date();
      return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
    } catch {
      return false;
    }
  }, [dateOfBirth, currentDate, isUnassigned]);

  const startTime = shift['Shift Start Time']
    ? format(new Date(shift['Shift Start Time']), 'HH:mm')
    : '--:--';
  const endTime = shift['Shift End Time']
    ? format(new Date(shift['Shift End Time']), 'HH:mm')
    : '--:--';

  const isOvernight =
    shift['End on the following day'] ||
    (shift['Shift Start Time'] &&
      shift['Shift End Time'] &&
      new Date(shift['Shift End Time']) < new Date(shift['Shift Start Time']));

  const workingHours = useMemo(() => calculateWorkingHours(shift), [shift]);
  const shiftType = getShiftType(shift);
  const typeStyle = SHIFT_TYPE_STYLES[shiftType];
  const TypeIcon = typeStyle.icon;

  // Badges
  const isShiftLeader = shift['Shift Leader'];
  const isActUp = shift['Act Up'];
  const isOvertime = shift['Overtime Shift'];
  const isSenior = shift['Senior'];

  // Attendance status
  const attendanceStatus = useMemo(
    () => getAttendanceStatus(shift as ShiftWithAttendance),
    [shift]
  );
  const attendanceDetails = useMemo(
    () => getAttendanceDetails(shift as ShiftWithAttendance),
    [shift]
  );
  const statusConfig = getStatusConfig(attendanceStatus);

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  const handleClick = () => {
    if (onClick) onClick(shiftId);
    else if (onEdit && !isExternal) onEdit(shiftId);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(shiftId);
  };

  const handleLeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAssignLeader) onAssignLeader(shiftId);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={`
        group transition-all duration-150 relative
        ${isExternal ? 'bg-gray-50 opacity-70' : 'bg-white hover:bg-gray-50'}
        ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
        ${onClick || (onEdit && !isExternal) ? 'cursor-pointer' : ''}
        ${isAgency ? 'border-l-4 border-orange-400' : ''}
        ${isUnpublished ? 'border-l-4 border-dashed border-l-emerald-500' : ''}
      `}
      onClick={handleClick}
      role={onClick || onEdit ? 'button' : undefined}
      tabIndex={onClick || onEdit ? 0 : undefined}
    >
      {/* Unpublished indicator */}
      {isUnpublished && (
        <div className="absolute top-1 right-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          Draft
        </div>
      )}
      {/* ================================================================== */}
      {/* MOBILE LAYOUT (< 768px) - Stacked Card */}
      {/* ================================================================== */}
      <div className="block md:hidden p-4">
        {/* Header: Avatar, Name, Status */}
        <div className="flex items-start gap-3">
          <div
            className={`
              flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-medium text-white
              ${isUnassigned ? 'bg-gray-400' : isAgency ? 'bg-orange-500' : 'bg-primary'}
            `}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`truncate font-semibold text-base ${isUnassigned ? 'text-gray-500 italic' : 'text-gray-900'}`}
                >
                  {staffName}
                </span>
                {isBirthday && (
                  <span className="flex-shrink-0" title="Happy Birthday! 🎂">
                    <Cake className="h-4 w-4 text-pink-500" />
                  </span>
                )}
                {isAgency && (
                  <span className="flex-shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                    AGENCY
                  </span>
                )}
              </div>
              <StatusDot status={attendanceStatus} size="md" />
            </div>
            <div className="text-sm text-gray-500 truncate">{jobTitle}</div>
            {/* Badges */}
            {(isShiftLeader || isActUp || isOvertime || isSenior) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {isShiftLeader && (
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                    LEAD
                  </span>
                )}
                {isActUp && (
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                    ACT-UP
                  </span>
                )}
                {isSenior && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                    SENIOR
                  </span>
                )}
                {isOvertime && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                    OT
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">⏰</span>
            <span className="font-medium">
              {startTime} - {endTime}
            </span>
            {isOvernight && <span className="text-xs text-gray-400">+1</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">📋</span>
            <span className="truncate">{shift['Shift Activity'] || 'Standard Care'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">⏱️</span>
            <span>{formatHours(workingHours)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">☕</span>
            <span>{formatBreak(shift['Shift Break Duration'])}</span>
          </div>
        </div>

        {/* Status & Type Row */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}
          >
            <TypeIcon className="h-3.5 w-3.5" />
            {shiftType === 'sleepin'
              ? 'Sleep In'
              : shiftType.charAt(0).toUpperCase() + shiftType.slice(1)}
          </span>
          <div className="flex flex-col items-end">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${statusConfig.bgColour} ${statusConfig.colour}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColour}`} />
              {statusConfig.label}
            </span>
            {attendanceStatus === 'late' && attendanceDetails.minutesLate > 0 && (
              <span className="mt-0.5 flex items-center gap-1 text-[10px] text-orange-600">
                <AlertCircle className="h-3 w-3" />
                {formatLateBy(attendanceDetails.minutesLate)}
              </span>
            )}
          </div>
        </div>

        {/* External Location */}
        {isExternal && shift['Sublocation Name'] && (
          <div className="mt-2 text-sm text-gray-500">
            <span className="rounded bg-gray-200 px-2 py-1 text-xs">
              📍 {shift['Sublocation Name']}
            </span>
          </div>
        )}

        {/* Actions */}
        {!isExternal && (
          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100">
            {onEdit && (
              <button
                onClick={handleEditClick}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
            {onAssignLeader && !isAgency && !isUnassigned && (
              <button
                onClick={handleLeaderClick}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                  ${
                    isShiftLeader
                      ? 'bg-green-100 text-green-800'
                      : 'border border-green-600 text-green-700'
                  }
                `}
              >
                <UserCheck className="h-4 w-4" />
                {isShiftLeader ? 'Lead ✓' : 'Leader'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* DESKTOP LAYOUT (≥768px) - Horizontal Row */}
      {/* ================================================================== */}
      <div className="hidden md:flex items-center gap-3 px-4 py-3">
        {/* Status Indicator */}
        <div className="flex-shrink-0">
          <StatusDot status={attendanceStatus} size="md" />
        </div>

        {/* Staff Avatar & Info - 240px on lg, smaller on md */}
        <div className="flex min-w-[180px] lg:min-w-[240px] max-w-[240px] items-center gap-3">
          <div
            className={`
              flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white
              ${isUnassigned ? 'bg-gray-400' : isAgency ? 'bg-orange-500' : 'bg-primary'}
            `}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`truncate font-medium ${isUnassigned ? 'text-gray-500 italic' : 'text-gray-900'}`}
              >
                {staffName}
              </span>
              {isBirthday && (
                <span className="flex-shrink-0" title="Happy Birthday! 🎂">
                  <Cake className="h-4 w-4 text-pink-500" />
                </span>
              )}
              {isAgency && (
                <span className="flex-shrink-0 rounded bg-orange-100 px-1 py-0.5 text-[9px] font-semibold text-orange-800">
                  AGENCY
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="truncate">{jobTitle}</span>
            </div>
            {/* Badges Row */}
            {(isShiftLeader || isActUp || isOvertime || isSenior) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {isShiftLeader && (
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                    LEAD
                  </span>
                )}
                {isActUp && (
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                    ACT-UP
                  </span>
                )}
                {isSenior && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                    SENIOR
                  </span>
                )}
                {isOvertime && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                    OT
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shift Time - hidden on tablet, visible on lg */}
        <div className="hidden lg:block min-w-[130px]">
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Shift Time
          </div>
          <div className="flex items-center gap-1 font-medium text-gray-900">
            {startTime} - {endTime}
            {isOvernight && (
              <span className="text-xs text-gray-400" title="Overnight shift">
                +1
              </span>
            )}
          </div>
        </div>

        {/* Time (condensed for tablet) */}
        <div className="lg:hidden min-w-[100px]">
          <div className="font-medium text-gray-900">
            {startTime} - {endTime}
          </div>
          <div className="text-xs text-gray-500">{formatHours(workingHours)}</div>
        </div>

        {/* Working Hours - hidden on tablet */}
        <div className="hidden lg:block min-w-[90px]">
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Hours</div>
          <div className="font-medium text-gray-900">{formatHours(workingHours)}</div>
        </div>

        {/* Activity - hidden on tablet, visible on lg */}
        <div className="hidden xl:block min-w-[160px] max-w-[160px]">
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Activity
          </div>
          <div
            className="truncate font-medium text-gray-900"
            title={shift['Shift Activity'] || 'Standard Care'}
          >
            {shift['Shift Activity'] || 'Standard Care'}
          </div>
        </div>

        {/* Break - hidden on tablet */}
        <div className="hidden xl:block min-w-[80px]">
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Break</div>
          <div className="font-medium text-gray-900">
            {formatBreak(shift['Shift Break Duration'])}
          </div>
        </div>

        {/* Shift Type Badge */}
        <div className="min-w-[70px] lg:min-w-[90px]">
          <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Type
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}
          >
            <TypeIcon className="h-3 w-3" />
            <span className="hidden lg:inline">
              {shiftType === 'sleepin'
                ? 'Sleep In'
                : shiftType.charAt(0).toUpperCase() + shiftType.slice(1)}
            </span>
          </span>
        </div>

        {/* Status Badge */}
        <div className="min-w-[90px] lg:min-w-[110px]">
          <div className="hidden lg:block text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Status
          </div>
          <div className="flex flex-col">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${statusConfig.bgColour} ${statusConfig.colour}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColour}`} />
              {statusConfig.label}
            </span>
            {attendanceStatus === 'late' && attendanceDetails.minutesLate > 0 && (
              <span className="mt-0.5 flex items-center gap-1 text-[10px] text-orange-600">
                <AlertCircle className="h-3 w-3" />
                {formatLateBy(attendanceDetails.minutesLate)}
              </span>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        {!isExternal && (
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-400"
                title="Edit shift"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Edit</span>
              </button>
            )}
            {onAssignLeader && !isAgency && !isUnassigned && (
              <button
                onClick={handleLeaderClick}
                className={`
                  flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                  ${
                    isShiftLeader
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'border border-green-600 text-green-700 hover:bg-green-50'
                  }
                `}
                title={isShiftLeader ? 'Shift Leader' : 'Assign as Shift Leader'}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{isShiftLeader ? 'Lead ✓' : 'Leader'}</span>
              </button>
            )}
            <button
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* External Location Badge */}
        {isExternal && shift['Sublocation Name'] && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="rounded bg-gray-200 px-2 py-1 text-xs">
              📍 {shift['Sublocation Name']}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Shift Card Skeleton (for loading states)
// =============================================================================

export function ShiftCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-3">
      {/* Status dot */}
      <div className="h-3 w-3 rounded-full bg-gray-200" />

      {/* Avatar & Info */}
      <div className="flex min-w-[240px] items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
      </div>

      {/* Time */}
      <div className="min-w-[130px] space-y-1">
        <div className="h-3 w-12 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>

      {/* Hours */}
      <div className="min-w-[90px] space-y-1">
        <div className="h-3 w-10 rounded bg-gray-200" />
        <div className="h-4 w-14 rounded bg-gray-200" />
      </div>

      {/* Activity */}
      <div className="min-w-[160px] space-y-1">
        <div className="h-3 w-12 rounded bg-gray-200" />
        <div className="h-4 w-28 rounded bg-gray-200" />
      </div>

      {/* Break */}
      <div className="min-w-[80px] space-y-1">
        <div className="h-3 w-10 rounded bg-gray-200" />
        <div className="h-4 w-12 rounded bg-gray-200" />
      </div>

      {/* Type */}
      <div className="min-w-[90px] space-y-1">
        <div className="h-3 w-8 rounded bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>

      {/* Status */}
      <div className="min-w-[110px] space-y-1">
        <div className="h-3 w-10 rounded bg-gray-200" />
        <div className="h-5 w-20 rounded bg-gray-200" />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-lg bg-gray-200" />
        <div className="h-8 w-20 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

export default ShiftCard;
