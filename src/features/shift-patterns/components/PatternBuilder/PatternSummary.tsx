/**
 * PatternSummary Component
 * Displays hours breakdown and shift statistics for a pattern
 *
 * Features:
 * - Total hours per rotation cycle
 * - Average weekly hours
 * - Hours per week breakdown
 * - Working days vs rest days count
 * - Shift type breakdown (Day/Evening/Night)
 * - Visual progress bar comparing to standard full-time (37.5h)
 */

import { useMemo } from 'react';
import { Clock, Sun, Sunset, Moon, Coffee, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PatternDayFormData } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface PatternSummaryProps {
  days: PatternDayFormData[];
  rotationCycleWeeks: number;
}

interface WeekHours {
  weekNumber: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
}

interface ShiftTypeCount {
  day: number;
  evening: number;
  night: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STANDARD_WEEKLY_HOURS = 37.5;
const WTD_MAX_WEEKLY_HOURS = 48;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine shift type based on start time
 */
function getShiftType(startTime: string | undefined): 'day' | 'evening' | 'night' | null {
  if (!startTime) return null;

  const [hours] = startTime.split(':').map(Number);

  if (hours >= 6 && hours < 18) return 'day';
  if (hours >= 18 && hours < 22) return 'evening';
  return 'night';
}

/**
 * Calculate shift duration in minutes
 */
function calculateShiftMinutes(
  startTime: string | undefined,
  endTime: string | undefined,
  breakMinutes: number | undefined,
  isOvernight: boolean
): number {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;

  if (isOvernight || endMins <= startMins) {
    endMins += 24 * 60;
  }

  return endMins - startMins - (breakMinutes || 0);
}

/**
 * Format minutes as "Xh XXm"
 */
function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0h 00m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PatternSummary({ days, rotationCycleWeeks }: PatternSummaryProps) {
  // Calculate hours per week
  const weeklyHours = useMemo<WeekHours[]>(() => {
    const weeks: WeekHours[] = [];

    for (let week = 1; week <= rotationCycleWeeks; week++) {
      const weekDays = days.filter((d) => d.weekNumber === week && !d.isRestDay);
      let totalMinutes = 0;

      for (const day of weekDays) {
        totalMinutes += calculateShiftMinutes(
          day.startTime,
          day.endTime,
          day.breakMinutes,
          day.isOvernight
        );
      }

      weeks.push({
        weekNumber: week,
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        totalMinutes,
      });
    }

    return weeks;
  }, [days, rotationCycleWeeks]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalMinutes = weeklyHours.reduce((sum, w) => sum + w.totalMinutes, 0);
    const averageMinutesPerWeek = rotationCycleWeeks > 0 ? totalMinutes / rotationCycleWeeks : 0;
    const averageHoursPerWeek = averageMinutesPerWeek / 60;

    const workingDays = days.filter((d) => !d.isRestDay && d.startTime && d.endTime).length;
    const restDays = days.filter((d) => d.isRestDay).length;

    return {
      totalMinutes,
      averageMinutesPerWeek,
      averageHoursPerWeek,
      workingDays,
      restDays,
    };
  }, [weeklyHours, days, rotationCycleWeeks]);

  // Calculate shift type breakdown
  const shiftTypes = useMemo<ShiftTypeCount>(() => {
    const counts: ShiftTypeCount = { day: 0, evening: 0, night: 0 };

    for (const day of days) {
      if (day.isRestDay || !day.startTime) continue;
      const type = getShiftType(day.startTime);
      if (type) counts[type]++;
    }

    return counts;
  }, [days]);

  // Calculate percentage compared to standard hours
  const percentageOfStandard = useMemo(() => {
    return Math.round((totals.averageHoursPerWeek / STANDARD_WEEKLY_HOURS) * 100);
  }, [totals.averageHoursPerWeek]);

  // Determine status colour
  const getStatusColour = (percentage: number): { bg: string; text: string; bar: string } => {
    if (percentage < 80) {
      return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' };
    }
    if (percentage > 128) {
      // > 48h (WTD limit)
      return { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' };
    }
    if (percentage > 110) {
      // > 41.25h
      return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' };
    }
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' };
  };

  const statusColours = getStatusColour(percentageOfStandard);

  // Trend indicator
  const TrendIcon =
    percentageOfStandard > 100 ? TrendingUp : percentageOfStandard < 100 ? TrendingDown : Minus;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="font-semibold text-slate-900">Pattern Summary</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Hours Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Rotation Hours</span>
            <span className="font-semibold text-slate-900">
              {formatDuration(totals.totalMinutes)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Average Weekly Hours</span>
            <span className="font-semibold text-slate-900">
              {formatDuration(totals.averageMinutesPerWeek)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className={`rounded-lg p-3 ${statusColours.bg}`}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className={statusColours.text}>vs Standard ({STANDARD_WEEKLY_HOURS}h)</span>
              <div className={`flex items-center gap-1 font-semibold ${statusColours.text}`}>
                <TrendIcon className="h-4 w-4" />
                {percentageOfStandard}%
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${statusColours.bar}`}
                style={{ width: `${Math.min(150, percentageOfStandard)}%` }}
              />
            </div>
            {totals.averageHoursPerWeek > WTD_MAX_WEEKLY_HOURS && (
              <p className="mt-2 text-xs text-red-600">
                ⚠ Exceeds Working Time Directive limit of {WTD_MAX_WEEKLY_HOURS}h
              </p>
            )}
          </div>
        </div>

        {/* Hours by Week (if multi-week rotation) */}
        {rotationCycleWeeks > 1 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-slate-500">Hours by Week</p>
            <div className="grid grid-cols-2 gap-2">
              {weeklyHours.map((week) => (
                <div
                  key={week.weekNumber}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-600">Week {week.weekNumber}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatDuration(week.totalMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Days Breakdown */}
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-slate-500">Days Breakdown</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{totals.workingDays}</span> working
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{totals.restDays}</span> rest
              </span>
            </div>
          </div>
        </div>

        {/* Shift Types */}
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-slate-500">Shift Types</p>
          <div className="flex flex-wrap gap-3">
            {shiftTypes.day > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1">
                <Sun className="h-3.5 w-3.5 text-amber-700" />
                <span className="text-sm font-medium text-amber-800">{shiftTypes.day} Day</span>
              </div>
            )}
            {shiftTypes.evening > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1">
                <Sunset className="h-3.5 w-3.5 text-blue-700" />
                <span className="text-sm font-medium text-blue-800">
                  {shiftTypes.evening} Evening
                </span>
              </div>
            )}
            {shiftTypes.night > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1">
                <Moon className="h-3.5 w-3.5 text-purple-700" />
                <span className="text-sm font-medium text-purple-800">
                  {shiftTypes.night} Night
                </span>
              </div>
            )}
            {shiftTypes.day === 0 && shiftTypes.evening === 0 && shiftTypes.night === 0 && (
              <span className="text-sm text-slate-400">No shifts defined</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatternSummary;
