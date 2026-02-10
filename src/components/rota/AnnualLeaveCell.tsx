/**
 * AnnualLeaveCell Component
 *
 * Displays annual leave and other absence types that span multiple days.
 * Shows as a merged cell across consecutive days.
 *
 * Features:
 * - Spans multiple day columns
 * - Different colours by leave type
 * - Icon and label
 * - Tooltip with details
 * - Handles partial day leave
 * - Warning for overlapping shifts
 */

import { useMemo, useState } from 'react';
import { format, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import { User, Calendar, AlertTriangle, BookOpen, Heart, Plane, Clock } from 'lucide-react';
import type { StaffAbsenceLog, AbsenceType, Shift } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface AnnualLeaveCellProps {
  /** The leave/absence record */
  leave: StaffAbsenceLog;
  /** The column index where this leave starts in the grid */
  startColumn: number;
  /** Number of days this leave spans in the visible range */
  spanDays: number;
  /** Absence type details */
  absenceType?: AbsenceType;
  /** Whether there's an overlapping shift */
  hasOverlap?: boolean;
  /** Overlapping shifts (for tooltip) */
  overlappingShifts?: Shift[];
  /** Callback when clicked */
  onClick?: () => void;
}

interface LeaveBlockProps {
  /** The leave/absence record */
  leave: StaffAbsenceLog;
  /** Dates in the current view */
  dates: Date[];
  /** Absence type details */
  absenceType?: AbsenceType;
  /** Shifts that overlap with this leave */
  overlappingShifts?: Shift[];
  /** Callback when clicked */
  onClick?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LEAVE_TYPE_STYLES: Record<
  string,
  {
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  annual: {
    bgColor: 'bg-[#FFF3E0]',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-800',
    icon: Plane,
  },
  'annual leave': {
    bgColor: 'bg-[#FFF3E0]',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-800',
    icon: Plane,
  },
  holiday: {
    bgColor: 'bg-[#FFF3E0]',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-800',
    icon: Plane,
  },
  sick: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    icon: Heart,
  },
  'sick leave': {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    icon: Heart,
  },
  sickness: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    icon: Heart,
  },
  training: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-800',
    icon: BookOpen,
  },
  study: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-800',
    icon: BookOpen,
  },
  compassionate: {
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-800',
    icon: Heart,
  },
  bereavement: {
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-800',
    icon: Heart,
  },
  parental: {
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    textColor: 'text-pink-800',
    icon: User,
  },
  maternity: {
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    textColor: 'text-pink-800',
    icon: User,
  },
  paternity: {
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    textColor: 'text-pink-800',
    icon: User,
  },
  unpaid: {
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-700',
    icon: Clock,
  },
  default: {
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-700',
    icon: Calendar,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getLeaveTypeStyle(absenceTypeName?: string) {
  if (!absenceTypeName) return LEAVE_TYPE_STYLES.default;

  const nameLower = absenceTypeName.toLowerCase();

  // Try exact match first
  if (LEAVE_TYPE_STYLES[nameLower]) {
    return LEAVE_TYPE_STYLES[nameLower];
  }

  // Try partial match
  for (const [key, style] of Object.entries(LEAVE_TYPE_STYLES)) {
    if (key !== 'default' && nameLower.includes(key)) {
      return style;
    }
  }

  return LEAVE_TYPE_STYLES.default;
}

function formatDateRange(startDate: Date, endDate: Date): string {
  const start = format(startDate, 'd MMM');
  const end = format(endDate, 'd MMM');

  if (start === end) {
    return start;
  }

  return `${start} - ${end}`;
}

// =============================================================================
// ANNUAL LEAVE CELL (SINGLE CELL)
// =============================================================================

export function AnnualLeaveCell({
  leave,
  startColumn: _startColumn,
  spanDays,
  absenceType,
  hasOverlap,
  overlappingShifts = [],
  onClick,
}: AnnualLeaveCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const leaveStart = parseISO(leave.cp365_startdate);
  const leaveEnd = parseISO(leave.cp365_enddate);
  const typeName = absenceType?.cp365_absencetypename || 'Leave';
  const style = getLeaveTypeStyle(typeName);
  const Icon = style.icon;

  // Determine label text
  const getLabelText = () => {
    if (spanDays >= 5) return typeName;
    if (spanDays >= 3) return typeName.split(' ')[0]; // First word only
    return ''; // Just icon for small spans
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onClick}
        className={`
          flex h-full min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md 
          border px-2 py-1 text-left transition-all
          ${style.bgColor} ${style.borderColor} ${style.textColor}
          hover:shadow-md
        `}
        style={{
          gridColumn: `span ${spanDays}`,
        }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {spanDays >= 2 && <span className="truncate text-xs font-medium">{getLabelText()}</span>}
        {hasOverlap && <AlertTriangle className="ml-auto h-3.5 w-3.5 shrink-0 text-red-500" />}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
          <div className="font-semibold">{typeName}</div>
          <div className="mt-1 text-gray-300">{formatDateRange(leaveStart, leaveEnd)}</div>
          {hasOverlap && (
            <div className="mt-1 flex items-center gap-1 text-red-300">
              <AlertTriangle className="h-3 w-3" />
              <span>Shift scheduled during approved leave</span>
            </div>
          )}
          {!leave.cp365_sensitive && overlappingShifts.length > 0 && (
            <div className="mt-1 text-gray-400">
              {overlappingShifts.length} overlapping{' '}
              {overlappingShifts.length === 1 ? 'shift' : 'shifts'}
            </div>
          )}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LEAVE BLOCK (SPANNING COMPONENT)
// =============================================================================

/**
 * A leave block that can span multiple table cells
 * Used when rendering leave across the grid
 */
export function LeaveBlock({
  leave,
  dates,
  absenceType,
  overlappingShifts = [],
  onClick,
}: LeaveBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate which columns this leave spans
  const { startCol, spanDays, isPartialStart, isPartialEnd } = useMemo(() => {
    const leaveStart = parseISO(leave.cp365_startdate);
    const leaveEnd = parseISO(leave.cp365_enddate);

    let startCol = -1;
    let endCol = -1;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const isInRange = isWithinInterval(date, { start: leaveStart, end: leaveEnd });

      if (isInRange) {
        if (startCol === -1) startCol = i;
        endCol = i;
      }
    }

    if (startCol === -1) {
      return { startCol: -1, spanDays: 0, isPartialStart: false, isPartialEnd: false };
    }

    const spanDays = endCol - startCol + 1;
    const isPartialStart = leaveStart < dates[0];
    const isPartialEnd = leaveEnd > dates[dates.length - 1];

    return { startCol, spanDays, isPartialStart, isPartialEnd };
  }, [leave, dates]);

  if (startCol === -1 || spanDays === 0) {
    return null;
  }

  const leaveStart = parseISO(leave.cp365_startdate);
  const leaveEnd = parseISO(leave.cp365_enddate);
  const totalDays = differenceInDays(leaveEnd, leaveStart) + 1;
  const typeName = absenceType?.cp365_absencetypename || 'Leave';
  const style = getLeaveTypeStyle(typeName);
  const Icon = style.icon;
  const hasOverlap = overlappingShifts.length > 0;

  // Label based on total days
  const getLabel = () => {
    if (totalDays >= 7) return 'All week';
    if (totalDays >= 5) return typeName;
    if (spanDays >= 3) return typeName.split(' ')[0];
    return '';
  };

  return (
    <div
      className="relative col-span-full"
      style={{
        gridColumn: `${startCol + 2} / span ${spanDays}`, // +2 because of staff column
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onClick}
        className={`
          flex h-full min-h-[36px] w-full items-center justify-center gap-2 
          border px-3 py-1.5 transition-all
          ${style.bgColor} ${style.borderColor} ${style.textColor}
          ${isPartialStart ? 'rounded-l-none border-l-0' : 'rounded-l-md'}
          ${isPartialEnd ? 'rounded-r-none border-r-0' : 'rounded-r-md'}
          hover:shadow-md
        `}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm font-medium">{getLabel()}</span>
        {hasOverlap && <AlertTriangle className="ml-auto h-4 w-4 shrink-0 text-red-500" />}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg">
          <div className="font-semibold">{typeName}</div>
          <div className="mt-1 text-gray-300">
            {formatDateRange(leaveStart, leaveEnd)}
            {totalDays > 1 && ` (${totalDays} days)`}
          </div>
          {hasOverlap && (
            <div className="mt-2 flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-red-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Shift scheduled during approved leave</span>
            </div>
          )}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LEAVE INDICATOR (INLINE)
// =============================================================================

interface LeaveIndicatorProps {
  /** Leave type name */
  typeName: string;
  /** Whether it's a partial day */
  isPartialDay?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Small inline indicator for leave within a cell
 */
export function LeaveIndicator({ typeName, isPartialDay, compact }: LeaveIndicatorProps) {
  const style = getLeaveTypeStyle(typeName);
  const Icon = style.icon;

  if (compact) {
    return (
      <div
        className={`
          flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-medium
          ${style.bgColor} ${style.textColor}
        `}
        title={typeName}
      >
        <Icon className="h-3 w-3" />
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-1 rounded-md border px-2 py-1
        ${style.bgColor} ${style.borderColor} ${style.textColor}
      `}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">
        {isPartialDay ? 'Partial ' : ''}
        {typeName}
      </span>
    </div>
  );
}

// =============================================================================
// LEAVE ROW (FOR STAFF WITH ALL-WEEK LEAVE)
// =============================================================================

interface LeaveRowProps {
  /** Staff member name */
  staffName: string;
  /** Leave records */
  leaves: StaffAbsenceLog[];
  /** Dates in view */
  dates: Date[];
  /** Absence types lookup */
  absenceTypes: Map<string, AbsenceType>;
}

/**
 * Special row display for staff who are on leave for most/all of the period
 */
export function LeaveRow({ staffName, leaves, dates, absenceTypes }: LeaveRowProps) {
  // Find the primary leave (longest or first)
  const primaryLeave = useMemo(() => {
    if (leaves.length === 0) return null;

    return leaves.reduce((longest, leave) => {
      const longestDays = differenceInDays(
        parseISO(longest.cp365_enddate),
        parseISO(longest.cp365_startdate)
      );
      const leaveDays = differenceInDays(
        parseISO(leave.cp365_enddate),
        parseISO(leave.cp365_startdate)
      );
      return leaveDays > longestDays ? leave : longest;
    });
  }, [leaves]);

  if (!primaryLeave) return null;

  const absenceType = absenceTypes.get(primaryLeave._cp365_absencetype_value);
  const typeName = absenceType?.cp365_absencetypename || 'Leave';
  const style = getLeaveTypeStyle(typeName);
  const Icon = style.icon;

  const leaveStart = parseISO(primaryLeave.cp365_startdate);
  const leaveEnd = parseISO(primaryLeave.cp365_enddate);

  return (
    <tr className={style.bgColor}>
      {/* Staff info */}
      <td
        className="sticky left-0 z-10 w-52 min-w-52 border-b border-r border-border-grey px-3 py-2"
        style={{ backgroundColor: 'inherit' }}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${style.bgColor} border ${style.borderColor}`}
          >
            <Icon className={`h-4 w-4 ${style.textColor}`} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{staffName}</div>
            <div className={`text-xs ${style.textColor}`}>{typeName}</div>
          </div>
        </div>
      </td>

      {/* Spanning leave cell */}
      <td colSpan={dates.length} className={`border-b border-border-grey p-2 ${style.bgColor}`}>
        <div
          className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 ${style.borderColor}`}
        >
          <Icon className={`h-5 w-5 ${style.textColor}`} />
          <span className={`text-sm font-medium ${style.textColor}`}>{typeName}</span>
          <span className="text-xs text-gray-500">{formatDateRange(leaveStart, leaveEnd)}</span>
        </div>
      </td>
    </tr>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { AnnualLeaveCellProps, LeaveBlockProps, LeaveIndicatorProps, LeaveRowProps };
