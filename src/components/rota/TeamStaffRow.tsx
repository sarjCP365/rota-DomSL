/**
 * TeamStaffRow Component
 *
 * Displays a staff member row within the Team View hierarchy.
 * Shows avatar, name, job title, hours, qualifications, and shift cells.
 *
 * Features:
 * - Avatar with initials or photo
 * - Staff name and job title
 * - Hours comparison (scheduled vs contracted)
 * - Qualification badges (FM, FA, etc.)
 * - Shift cells by day
 * - Empty cell click to add shift
 * - Colour coded hours indicator
 */

import { useMemo, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';
import type { StaffWithShifts, Shift, Capability } from '@/api/dataverse/types';
import type { DetailLevel } from '@/store/rotaStore';

// =============================================================================
// TYPES
// =============================================================================

interface TeamStaffRowProps {
  /** Staff member with shifts and qualifications */
  staff: StaffWithShifts;
  /** Array of dates to display */
  dateRange: Date[];
  /** Contracted hours per week */
  contractedHours: number;
  /** Staff qualifications/capabilities */
  qualifications: Capability[];
  /** Currently selected shift IDs */
  selectedShiftIds?: Set<string>;
  /** Callback when a cell is clicked */
  onCellClick?: (date: Date, staffMemberId: string) => void;
  /** Callback when a shift is clicked */
  onShiftClick?: (shift: Shift) => void;
  /** Callback when staff name is clicked */
  onStaffClick?: () => void;
  /** Detail level for display */
  detailLevel?: DetailLevel;
}

interface ProcessedDayShift {
  shift: Shift;
  shiftType: 'day' | 'night' | 'sleepIn';
  timeLabel: string;
  isPublished: boolean;
  isOvertime: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SHIFT_BG_CLASSES = {
  day: 'bg-[#FCE4B4]',
  night: 'bg-[#BEDAE3]',
  sleepIn: 'bg-[#D3C7E6]',
  overtime: 'bg-[#E3826F] text-white',
} as const;

// Well-known qualification abbreviations
const QUALIFICATION_BADGES: Record<string, { abbr: string; color: string; bgColor: string }> = {
  'fire warden': { abbr: 'FW', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'fire marshal': { abbr: 'FM', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'first aider': { abbr: 'FA', color: 'text-red-700', bgColor: 'bg-red-100' },
  'first aid': { abbr: 'FA', color: 'text-red-700', bgColor: 'bg-red-100' },
  'manual handling': { abbr: 'MH', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  medication: { abbr: 'MED', color: 'text-green-700', bgColor: 'bg-green-100' },
  safeguarding: { abbr: 'SG', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  driver: { abbr: 'DR', color: 'text-gray-700', bgColor: 'bg-gray-200' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getShiftType(shift: Shift): 'day' | 'night' | 'sleepIn' {
  if (shift.cp365_sleepin) return 'sleepIn';

  // Check start hour from the time
  if (shift.cp365_shiftstarttime) {
    const startHour = new Date(shift.cp365_shiftstarttime).getHours();
    if (startHour >= 20 || startHour < 6) return 'night';
  }

  return 'day';
}

function formatTime(dateTimeStr: string): string {
  try {
    const date = new Date(dateTimeStr);
    return format(date, 'HH:mm');
  } catch {
    return '--:--';
  }
}

function getTimeLabel(shift: Shift): string {
  const start = formatTime(shift.cp365_shiftstarttime);
  const end = formatTime(shift.cp365_shiftendtime);
  return `${start}-${end}`;
}

function calculateShiftHours(shift: Shift): number {
  try {
    const start = new Date(shift.cp365_shiftstarttime);
    const end = new Date(shift.cp365_shiftendtime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const breakHours = (shift.cr1e2_shiftbreakduration || 0) / 60;
    return Math.max(0, hours - breakHours);
  } catch {
    return 0;
  }
}

function getHoursVarianceColor(scheduled: number, contracted: number): string {
  if (contracted === 0) return 'text-gray-500';

  const variance = scheduled - contracted;
  const variancePercent = (variance / contracted) * 100;

  if (variancePercent >= 10) return 'text-red-600'; // Significantly over
  if (variancePercent > 0) return 'text-amber-600'; // Slightly over
  if (variancePercent >= -10) return 'text-green-600'; // At or near target
  return 'text-amber-600'; // Under contracted
}

function getQualificationBadge(
  capabilityName: string
): { abbr: string; color: string; bgColor: string } | null {
  const nameLower = capabilityName.toLowerCase();

  for (const [key, badge] of Object.entries(QUALIFICATION_BADGES)) {
    if (nameLower.includes(key)) {
      return badge;
    }
  }

  // Generic badge for unknown qualifications
  return {
    abbr: capabilityName.substring(0, 2).toUpperCase(),
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamStaffRow({
  staff,
  dateRange,
  contractedHours,
  qualifications,
  selectedShiftIds = new Set(),
  onCellClick,
  onShiftClick,
  onStaffClick,
  detailLevel = 'detailed',
}: TeamStaffRowProps) {
  // Process shifts by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ProcessedDayShift[]>();

    for (const shift of staff.shifts) {
      const dateKey = shift.cp365_shiftdate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }

      map.get(dateKey)!.push({
        shift,
        shiftType: getShiftType(shift),
        timeLabel: getTimeLabel(shift),
        isPublished: shift.cp365_shiftstatus === 1001,
        isOvertime: shift.cp365_overtimeshift || false,
      });
    }

    return map;
  }, [staff.shifts]);

  // Calculate total scheduled hours
  const scheduledHours = useMemo(() => {
    return staff.shifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0);
  }, [staff.shifts]);

  // Derive display values
  const displayName =
    staff.cp365_staffmembername ||
    `${staff.cp365_forename || ''} ${staff.cp365_surname || ''}`.trim() ||
    'Unknown';
  const initial = displayName.charAt(0).toUpperCase();
  const hoursColor = getHoursVarianceColor(scheduledHours, contractedHours);

  const isCompact = detailLevel === 'compact';
  const isHoursOnly = detailLevel === 'hoursOnly';

  // Handle cell click
  const handleCellClick = useCallback(
    (date: Date) => {
      onCellClick?.(date, staff.cp365_staffmemberid);
    },
    [onCellClick, staff.cp365_staffmemberid]
  );

  // Render qualification badges (max 3, with +N more)
  const renderQualifications = () => {
    if (qualifications.length === 0) return null;

    const maxShow = 3;
    const shown = qualifications.slice(0, maxShow);
    const remaining = qualifications.length - maxShow;

    return (
      <div className="flex flex-wrap gap-0.5">
        {shown.map((qual) => {
          const badge = getQualificationBadge(qual.cp365_capabilityname);
          if (!badge) return null;

          return (
            <span
              key={qual.cp365_capabilityid}
              className={`rounded px-1 text-[9px] font-bold ${badge.bgColor} ${badge.color}`}
              title={qual.cp365_capabilityname}
            >
              {badge.abbr}
            </span>
          );
        })}
        {remaining > 0 && (
          <span
            className="rounded bg-gray-100 px-1 text-[9px] font-medium text-gray-500"
            title={qualifications
              .slice(maxShow)
              .map((q) => q.cp365_capabilityname)
              .join(', ')}
          >
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  return (
    <tr className="group hover:bg-gray-50/50">
      {/* Staff info cell */}
      <td className="sticky left-0 z-10 w-52 min-w-52 border-b border-r border-border-grey bg-white px-3 py-2 group-hover:bg-gray-50">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <button
            onClick={onStaffClick}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary hover:bg-primary/20"
            title="View staff details"
          >
            {initial}
          </button>

          {/* Info */}
          <div className="min-w-0 flex-1">
            {/* Name */}
            <button
              onClick={onStaffClick}
              className="truncate text-sm font-medium text-gray-900 hover:text-primary hover:underline"
            >
              {displayName}
            </button>

            {/* Job title - hidden in hoursOnly mode */}
            {!isHoursOnly && (
              <div className="truncate text-xs text-gray-500">
                {/* Job title would come from a separate lookup - placeholder */}
                Staff Member
              </div>
            )}

            {/* Hours comparison */}
            <div className={`text-xs font-medium ${hoursColor}`}>
              {Math.round(scheduledHours * 10) / 10}h / {contractedHours}h
            </div>

            {/* Qualifications - hidden in compact/hoursOnly mode */}
            {!isCompact && !isHoursOnly && renderQualifications()}
          </div>
        </div>
      </td>

      {/* Shift cells */}
      {dateRange.map((date, index) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayShifts = shiftsByDate.get(dateKey) || [];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = isSameDay(date, new Date());

        // Check if staff is on leave this day
        const isOnLeave = staff.leave.some((leave) => {
          const leaveStart = new Date(leave.cp365_startdate);
          const leaveEnd = new Date(leave.cp365_enddate);
          return date >= leaveStart && date <= leaveEnd;
        });

        // Calculate daily hours for hoursOnly mode
        const dailyHours = dayShifts.reduce((sum, ds) => sum + calculateShiftHours(ds.shift), 0);

        return (
          <td
            key={index}
            onClick={() => handleCellClick(date)}
            className={`min-w-28 border-b border-r border-border-grey p-1 align-top transition-colors ${
              isToday ? 'bg-primary/5' : isWeekend ? 'bg-gray-50/50' : ''
            } ${isOnLeave ? 'bg-orange-50' : ''} cursor-pointer hover:bg-primary/10`}
          >
            {isOnLeave ? (
              // Leave indicator
              <div className="flex h-full min-h-[40px] items-center justify-center rounded border border-orange-200 bg-orange-50 px-2 py-1">
                <span className="text-xs font-medium text-orange-700">On Leave</span>
              </div>
            ) : isHoursOnly ? (
              // Hours only view
              <div className="flex h-10 items-center justify-center">
                {dayShifts.length > 0 && (
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(dailyHours * 10) / 10}h
                  </span>
                )}
              </div>
            ) : (
              // Normal shift cards
              <div className="flex flex-col gap-1">
                {dayShifts.map((ds) => (
                  <TeamShiftCard
                    key={ds.shift.cp365_shiftid}
                    processedShift={ds}
                    isSelected={selectedShiftIds.has(ds.shift.cp365_shiftid)}
                    onClick={() => onShiftClick?.(ds.shift)}
                    isCompact={isCompact}
                  />
                ))}

                {/* Empty cell hint */}
                {dayShifts.length === 0 && (
                  <div className="flex h-8 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// =============================================================================
// SHIFT CARD COMPONENT
// =============================================================================

interface TeamShiftCardProps {
  processedShift: ProcessedDayShift;
  isSelected: boolean;
  onClick: () => void;
  isCompact?: boolean;
}

function TeamShiftCard({ processedShift, isSelected, onClick, isCompact }: TeamShiftCardProps) {
  const { shift, shiftType, timeLabel, isPublished, isOvertime } = processedShift;

  const bgClass = isOvertime ? SHIFT_BG_CLASSES.overtime : SHIFT_BG_CLASSES[shiftType];

  const iconEmoji = shiftType === 'night' ? '🌙' : shiftType === 'sleepIn' ? '🛏️' : '☀️';

  // Compact view
  if (isCompact) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`
          relative w-full rounded-md px-2 py-1 text-left transition-all
          ${bgClass}
          ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
          hover:shadow-md hover:brightness-95
        `}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm">{iconEmoji}</span>
          <span className="text-xs font-semibold">{timeLabel}</span>
          {!isPublished && <span className="ml-auto text-[9px] font-bold text-gray-600">*</span>}
        </div>
      </button>
    );
  }

  // Detailed view
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        relative w-full rounded-md px-2 py-1.5 text-left transition-all
        ${bgClass}
        ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
        hover:shadow-md hover:brightness-95
      `}
    >
      {/* Time and icon */}
      <div className="flex items-center gap-1">
        <span className="text-base">{iconEmoji}</span>
        <span className="text-xs font-semibold">{timeLabel}</span>
      </div>

      {/* Badges */}
      <div className="mt-1 flex flex-wrap gap-0.5">
        {!isPublished && (
          <span className="rounded bg-gray-900/20 px-1 text-[9px] font-bold text-gray-800">*</span>
        )}
        {shift.cp365_shiftleader && (
          <span className="rounded bg-primary/30 px-1 text-[9px] font-medium text-primary">SL</span>
        )}
        {shift.cp365_actup && (
          <span className="rounded bg-secondary/30 px-1 text-[9px] font-medium text-secondary">
            AU
          </span>
        )}
        {shift.cp365_senior && (
          <span className="rounded bg-gray-500/30 px-1 text-[9px] font-medium text-gray-700">
            SR
          </span>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { TeamStaffRowProps, ProcessedDayShift };
