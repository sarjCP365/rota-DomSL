/**
 * UnassignedShiftsRow Component
 *
 * Displays unassigned/vacant shifts within each team section in the Team View.
 * Appears at the bottom of each team's staff rows.
 *
 * Features:
 * - Warning icon and count badge
 * - Vacant shift cards with "VACANT" label
 * - "Assign" button on each card
 * - Stacked shifts on same day
 * - Red/warning colour scheme
 * - Dashed borders for vacant shifts
 * - Quick assign suggestions (future)
 */

import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { AlertTriangle, UserPlus } from 'lucide-react';
import type { Shift, StaffMember } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface UnassignedShiftsRowProps {
  /** Team ID this row belongs to */
  teamId: string;
  /** Array of vacant/unassigned shifts */
  vacantShifts: Shift[];
  /** Array of dates to display */
  dateRange: Date[];
  /** Callback when "Assign" is clicked on a shift */
  onAssign: (shiftId: string) => void;
  /** Callback when a shift card is clicked */
  onShiftClick?: (shift: Shift) => void;
  /** Available staff members for quick assign */
  availableStaff?: StaffMember[];
  /** Whether to show the row even if there are no vacant shifts */
  showWhenEmpty?: boolean;
}

interface ProcessedVacantShift {
  shift: Shift;
  shiftType: 'day' | 'night' | 'sleepIn';
  timeLabel: string;
  duration: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getShiftType(shift: Shift): 'day' | 'night' | 'sleepIn' {
  if (shift.cp365_sleepin) return 'sleepIn';

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

function calculateDuration(shift: Shift): number {
  try {
    const start = new Date(shift.cp365_shiftstarttime);
    const end = new Date(shift.cp365_shiftendtime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
  } catch {
    return 0;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function UnassignedShiftsRow({
  teamId: _teamId,
  vacantShifts,
  dateRange,
  onAssign,
  onShiftClick,
  availableStaff: _availableStaff = [],
  showWhenEmpty = false,
}: UnassignedShiftsRowProps) {
  // Process and group shifts by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ProcessedVacantShift[]>();

    for (const shift of vacantShifts) {
      const dateKey = shift.cp365_shiftdate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }

      map.get(dateKey)!.push({
        shift,
        shiftType: getShiftType(shift),
        timeLabel: getTimeLabel(shift),
        duration: calculateDuration(shift),
      });
    }

    return map;
  }, [vacantShifts]);

  const totalVacancies = vacantShifts.length;
  const hasVacancies = totalVacancies > 0;

  // Don't render if empty and showWhenEmpty is false
  if (!hasVacancies && !showWhenEmpty) {
    return null;
  }

  return (
    <tr className="bg-[#FFF5F5]">
      {/* Row header */}
      <td className="sticky left-0 z-10 w-52 min-w-52 border-b-2 border-b-red-300 border-r border-border-grey bg-[#FFF5F5] px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Warning icon */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              hasVacancies ? 'bg-red-100' : 'bg-gray-100'
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${hasVacancies ? 'text-red-500' : 'text-gray-400'}`}
            />
          </div>

          {/* Label and count */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${hasVacancies ? 'text-gray-900' : 'text-gray-500'}`}
              >
                Unassigned Shifts
              </span>
              {hasVacancies && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {totalVacancies}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {hasVacancies
                ? `${totalVacancies} unassigned ${totalVacancies === 1 ? 'shift' : 'shifts'}`
                : 'No vacancies'}
            </span>
          </div>
        </div>
      </td>

      {/* Shift cells */}
      {dateRange.map((date, index) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayShifts = shiftsByDate.get(dateKey) || [];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = isSameDay(date, new Date());

        return (
          <td
            key={index}
            className={`min-w-28 border-b-2 border-b-red-300 border-r border-border-grey p-1 align-top ${
              isToday ? 'bg-red-50' : isWeekend ? 'bg-[#FFF0F0]' : 'bg-[#FFF5F5]'
            }`}
          >
            <div className="flex flex-col gap-1">
              {dayShifts.map((ps, idx) => (
                <VacantShiftCard
                  key={ps.shift.cp365_shiftid}
                  processedShift={ps}
                  onAssign={() => onAssign(ps.shift.cp365_shiftid)}
                  onClick={() => onShiftClick?.(ps.shift)}
                  showMore={idx >= 2 && dayShifts.length > 3}
                  remainingCount={idx === 2 ? dayShifts.length - 3 : 0}
                />
              ))}

              {/* Show condensed view for many shifts */}
              {dayShifts.length > 3 && (
                <button
                  onClick={() => {
                    // Could open a modal showing all shifts
                  }}
                  className="rounded border border-dashed border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  +{dayShifts.length - 2} more
                </button>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// =============================================================================
// VACANT SHIFT CARD
// =============================================================================

interface VacantShiftCardProps {
  processedShift: ProcessedVacantShift;
  onAssign: () => void;
  onClick?: () => void;
  showMore?: boolean;
  remainingCount?: number;
}

function VacantShiftCard({
  processedShift,
  onAssign,
  onClick,
  showMore,
  remainingCount,
}: VacantShiftCardProps) {
  const { shift: _shift, shiftType, timeLabel, duration } = processedShift;

  // Don't render if this is a "show more" placeholder
  if (showMore && remainingCount && remainingCount > 0) {
    return null;
  }

  const iconEmoji = shiftType === 'night' ? '🌙' : shiftType === 'sleepIn' ? '🛏️' : '☀️';

  return (
    <div
      className="
        relative rounded-md border-2 border-dashed border-red-400 bg-red-50 
        p-2 transition-all hover:border-red-500 hover:bg-red-100 hover:shadow-md
      "
    >
      {/* VACANT header */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
          Unassigned
        </span>
        <span className="text-sm" role="img" aria-label={shiftType}>
          {iconEmoji}
        </span>
      </div>

      {/* Time */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="block w-full text-left"
      >
        <div className="text-sm font-semibold text-gray-800">{timeLabel}</div>
        <div className="text-xs text-gray-600">{duration}h</div>
      </button>

      {/* Assign button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAssign();
        }}
        className="
          mt-2 flex w-full items-center justify-center gap-1 rounded-md 
          bg-red-500 px-2 py-1 text-xs font-medium text-white 
          transition-colors hover:bg-red-600
        "
      >
        <UserPlus className="h-3.5 w-3.5" />
        Assign
      </button>
    </div>
  );
}

// =============================================================================
// GLOBAL UNASSIGNED ROW (for People View)
// =============================================================================

interface GlobalUnassignedRowProps {
  /** All unassigned shifts across all teams */
  vacantShifts: Shift[];
  /** Array of dates to display */
  dateRange: Date[];
  /** Callback when "Assign" is clicked */
  onAssign: (shiftId: string) => void;
  /** Callback when shift is clicked */
  onShiftClick?: (shift: Shift) => void;
  /** Callback when cell is clicked to create new unassigned shift */
  onCellClick?: (date: Date) => void;
}

/**
 * Single unassigned row for People View (not grouped by team)
 */
export function GlobalUnassignedRow({
  vacantShifts,
  dateRange,
  onAssign,
  onShiftClick,
  onCellClick,
}: GlobalUnassignedRowProps) {
  // Group by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ProcessedVacantShift[]>();

    for (const shift of vacantShifts) {
      const dateKey = shift.cp365_shiftdate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }

      map.get(dateKey)!.push({
        shift,
        shiftType: getShiftType(shift),
        timeLabel: getTimeLabel(shift),
        duration: calculateDuration(shift),
      });
    }

    return map;
  }, [vacantShifts]);

  const totalVacancies = vacantShifts.length;
  const hasVacancies = totalVacancies > 0;

  return (
    <tr className={`bg-[#f5f5f5] ${hasVacancies ? '' : ''}`}>
      {/* Row header */}
      <td
        className={`sticky left-0 z-10 w-56 min-w-56 border-b border-r ${
          hasVacancies ? 'border-b-warning border-b-2' : 'border-border-grey'
        } bg-[#f5f5f5] px-3 py-2`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              hasVacancies ? 'bg-warning/20' : 'bg-gray-200'
            }`}
          >
            <span className="text-lg" role="img" aria-label="unassigned">
              {hasVacancies ? '⚠️' : '📋'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${hasVacancies ? 'text-gray-900' : 'text-gray-600'}`}
            >
              Unassigned
            </span>
            {hasVacancies && (
              <span className="inline-flex items-center justify-center rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-white">
                {totalVacancies}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Total hours cell (for People View alignment) */}
      <td
        className={`w-16 min-w-16 border-b border-r ${
          hasVacancies ? 'border-b-warning border-b-2' : 'border-border-grey'
        } border-r-border-grey bg-[#f5f5f5] px-2 py-2`}
      />

      {/* Shift cells */}
      {dateRange.map((date, index) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayShifts = shiftsByDate.get(dateKey) || [];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = isSameDay(date, new Date());

        return (
          <td
            key={index}
            onClick={() => onCellClick?.(date)}
            className={`min-w-28 border-r ${
              hasVacancies ? 'border-b-2 border-b-warning' : 'border-b border-border-grey'
            } border-r-border-grey p-1 align-top ${
              isToday ? 'bg-[#ebebeb]' : isWeekend ? 'bg-[#ebebeb]' : 'bg-[#f5f5f5]'
            } cursor-pointer hover:bg-gray-200`}
          >
            <div className="flex flex-col gap-1">
              {dayShifts.slice(0, 3).map((ps) => (
                <CompactVacantCard
                  key={ps.shift.cp365_shiftid}
                  processedShift={ps}
                  onAssign={() => onAssign(ps.shift.cp365_shiftid)}
                  onClick={() => onShiftClick?.(ps.shift)}
                />
              ))}

              {dayShifts.length > 3 && (
                <div className="rounded border border-dashed border-gray-400 bg-gray-100 px-2 py-0.5 text-center text-xs text-gray-600">
                  +{dayShifts.length - 3} more
                </div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// =============================================================================
// COMPACT VACANT CARD
// =============================================================================

interface CompactVacantCardProps {
  processedShift: ProcessedVacantShift;
  onAssign: () => void;
  onClick?: () => void;
}

function CompactVacantCard({ processedShift, onAssign, onClick }: CompactVacantCardProps) {
  const { shift: _shift, shiftType, timeLabel } = processedShift;
  const iconEmoji = shiftType === 'night' ? '🌙' : shiftType === 'sleepIn' ? '🛏️' : '☀️';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="
        group relative w-full rounded-md border-2 border-dashed border-gray-500 
        bg-gray-100 px-2 py-1.5 text-left transition-all
        hover:border-gray-600 hover:bg-gray-200 hover:shadow-md
      "
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{iconEmoji}</span>
        <span className="text-xs font-semibold text-gray-700">{timeLabel}</span>
      </div>

      {/* Assign button appears on hover */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onAssign();
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onAssign(); } }}
        role="button"
        tabIndex={0}
        className="
          absolute inset-0 flex items-center justify-center rounded-md 
          bg-primary/90 opacity-0 transition-opacity group-hover:opacity-100
        "
      >
        <span className="flex items-center gap-1 text-xs font-medium text-white">
          <UserPlus className="h-3.5 w-3.5" />
          Assign
        </span>
      </div>
    </button>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UnassignedShiftsRowProps, GlobalUnassignedRowProps };
