/**
 * Coverage Heatmap Component
 * Visual breakdown of coverage by day and shift type
 */

import { format } from 'date-fns';
import { Sun, Moon, Bed, AlertTriangle, AlertCircle } from 'lucide-react';
import type { CoverageByDay } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/common/Loading';

interface CoverageHeatmapProps {
  data: CoverageByDay[];
  isLoading: boolean;
}

export function CoverageHeatmap({ data, isLoading }: CoverageHeatmapProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 21 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-800">Coverage by Day</h3>
        </div>
        <div className="p-8 text-center text-slate-400">
          No coverage data available
        </div>
      </div>
    );
  }

  // Check if we have any shifts of each type
  const hasDayShifts = data.some((d) => d.dayShifts.total > 0);
  const hasNightShifts = data.some((d) => d.nightShifts.total > 0);
  const hasSleepIns = data.some((d) => d.sleepInShifts.total > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="font-semibold text-slate-800">Coverage by Day</h3>
      </div>

      {/* Content */}
      <div className="overflow-x-auto p-4">
        <div className="min-w-[600px]">
          {/* Date Headers */}
          <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `80px repeat(${data.length}, 1fr)` }}>
            <div /> {/* Empty cell for row labels */}
            {data.map((day) => (
              <div key={day.date.toISOString()} className="text-center">
                <p className="text-xs font-medium text-slate-500">{format(day.date, 'EEE')}</p>
                <p className="text-sm font-semibold text-slate-700">{format(day.date, 'd')}</p>
              </div>
            ))}
          </div>

          {/* Day Shifts Row */}
          {hasDayShifts && (
            <div className="mb-2 grid items-center gap-2" style={{ gridTemplateColumns: `80px repeat(${data.length}, 1fr)` }}>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Day</span>
              </div>
              {data.map((day) => (
                <CoverageCell
                  key={`day-${day.date.toISOString()}`}
                  total={day.dayShifts.total}
                  filled={day.dayShifts.filled}
                  percent={day.dayShifts.percent}
                  type="day"
                />
              ))}
            </div>
          )}

          {/* Night Shifts Row */}
          {hasNightShifts && (
            <div className="mb-2 grid items-center gap-2" style={{ gridTemplateColumns: `80px repeat(${data.length}, 1fr)` }}>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span>Night</span>
              </div>
              {data.map((day) => (
                <CoverageCell
                  key={`night-${day.date.toISOString()}`}
                  total={day.nightShifts.total}
                  filled={day.nightShifts.filled}
                  percent={day.nightShifts.percent}
                  type="night"
                />
              ))}
            </div>
          )}

          {/* Sleep-In Shifts Row */}
          {hasSleepIns && (
            <div className="grid items-center gap-2" style={{ gridTemplateColumns: `80px repeat(${data.length}, 1fr)` }}>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Bed className="h-4 w-4 text-purple-500" />
                <span>Sleep-In</span>
              </div>
              {data.map((day) => (
                <CoverageCell
                  key={`sleep-${day.date.toISOString()}`}
                  total={day.sleepInShifts.total}
                  filled={day.sleepInShifts.filled}
                  percent={day.sleepInShifts.percent}
                  type="sleepIn"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-slate-100 px-4 py-2">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span>100%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-amber-500" />
            <span>70-99%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>&lt;70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-slate-200" />
            <span>No shifts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CoverageCellProps {
  total: number;
  filled: number;
  percent: number;
  type: 'day' | 'night' | 'sleepIn';
}

function CoverageCell({ total, filled, percent, type }: CoverageCellProps) {
  if (total === 0) {
    return (
      <div className="flex h-14 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
        —
      </div>
    );
  }

  const bgColour = getCoverageBgColour(percent);
  const textColour = getCoverageTextColour(percent);
  const unfilled = total - filled;

  return (
    <div
      className={`relative flex h-14 flex-col items-center justify-center rounded ${bgColour} transition-all hover:scale-105`}
      title={`${filled}/${total} shifts filled (${percent}%)`}
    >
      <span className={`text-lg font-bold ${textColour}`}>{percent}%</span>
      <span className={`text-[10px] ${textColour} opacity-80`}>
        {filled}/{total}
      </span>

      {/* Warning indicator for critical gaps */}
      {unfilled > 0 && percent < 70 && (
        <div className="absolute -right-1 -top-1">
          {type === 'night' || type === 'sleepIn' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
        </div>
      )}
    </div>
  );
}

function getCoverageBgColour(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 70) return 'bg-amber-400';
  return 'bg-red-500';
}

function getCoverageTextColour(percent: number): string {
  if (percent >= 100) return 'text-white';
  if (percent >= 70) return 'text-amber-900';
  return 'text-white';
}
