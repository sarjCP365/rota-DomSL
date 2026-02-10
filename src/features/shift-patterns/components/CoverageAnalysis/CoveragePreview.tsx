/**
 * Coverage Preview Component
 *
 * Shows expected coverage after pattern assignments to help managers
 * make informed decisions about staffing levels.
 */

import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { StaffPatternAssignment, ShiftPatternTemplate, ShiftPatternDay } from '../../types';
import { DayOfWeek, DayOfWeekShortLabels } from '../../types';
import type { ShiftReference, StaffMember } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface CoveragePreviewProps {
  /** Proposed pattern assignments */
  proposedAssignments: Array<{
    staff: StaffMember;
    pattern: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
    rotationStartWeek: number;
  }>;
  /** Existing pattern assignments (current state) */
  existingAssignments?: StaffPatternAssignment[];
  /** Shift references to track coverage for */
  shiftReferences?: ShiftReference[];
  /** Staffing requirements per shift reference */
  requirements?: Map<string, number>;
  /** Start date for preview */
  startDate?: Date;
  /** Number of weeks to preview */
  previewWeeks?: number;
  /** Compact view mode */
  compact?: boolean;
}

interface DailyCoverage {
  date: Date;
  dateStr: string;
  dayOfWeek: DayOfWeek;
  byShiftReference: Map<
    string,
    {
      current: number;
      proposed: number;
      total: number;
      required: number;
      variance: number;
      status: 'covered' | 'under' | 'over';
    }
  >;
  totalStaff: {
    current: number;
    proposed: number;
    total: number;
  };
}

interface WeeklySummary {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  averageCoverage: number;
  totalGaps: number;
  totalOverstaffed: number;
  days: DailyCoverage[];
}

interface CoverageSummary {
  weeks: WeeklySummary[];
  byShiftReference: Map<
    string,
    {
      name: string;
      required: number;
      averageAssigned: number;
      coveragePercent: number;
      gapDays: number;
      overDays: number;
    }
  >;
  overall: {
    averageCoverage: number;
    totalGapHours: number;
    agencyHoursNeeded: number;
    improvementFromCurrent: number;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the day of week from a Date (Mon=1, Sun=7)
 */
function getDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DayOfWeek;
}

/**
 * Calculate rotation week for a specific date
 */
function getRotationWeek(
  targetDate: Date,
  assignmentStartDate: Date,
  rotationStartWeek: number,
  totalRotationWeeks: number
): number {
  const startWeekMonday = startOfWeek(assignmentStartDate, { weekStartsOn: 1 });
  const targetWeekMonday = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weeksSinceStart = Math.floor(
    (targetWeekMonday.getTime() - startWeekMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const adjustedWeek = (weeksSinceStart + rotationStartWeek - 1) % totalRotationWeeks;
  return adjustedWeek + 1;
}

/**
 * Check if a pattern day applies to a specific date
 */
function getPatternDayForDate(
  date: Date,
  patternDays: ShiftPatternDay[],
  rotationCycleWeeks: number,
  rotationStartWeek: number
): ShiftPatternDay | undefined {
  const dayOfWeek = getDayOfWeek(date);
  const rotationWeek = getRotationWeek(
    date,
    startOfWeek(new Date(), { weekStartsOn: 1 }), // Use current week as reference
    rotationStartWeek,
    rotationCycleWeeks
  );

  return patternDays.find(
    (pd) => pd.cp365_sp_weeknumber === rotationWeek && pd.cp365_sp_dayofweek === dayOfWeek
  );
}

/**
 * Get status colour class based on coverage
 */
function getCoverageStatusClass(status: 'covered' | 'under' | 'over'): string {
  switch (status) {
    case 'covered':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'under':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'over':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Get bar colour based on coverage status
 */
function getCoverageBarClass(status: 'covered' | 'under' | 'over'): string {
  switch (status) {
    case 'covered':
      return 'bg-emerald-500';
    case 'under':
      return 'bg-amber-500';
    case 'over':
      return 'bg-blue-500';
    default:
      return 'bg-slate-300';
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CoverageCellProps {
  current: number;
  proposed: number;
  required: number;
  status: 'covered' | 'under' | 'over';
  showDelta?: boolean;
  compact?: boolean;
}

function CoverageCell({
  current,
  proposed,
  required,
  status,
  showDelta,
  compact,
}: CoverageCellProps) {
  const total = current + proposed;
  const delta = proposed;
  const fillPercent = required > 0 ? Math.min(100, (total / required) * 100) : 100;

  return (
    <div className={`relative rounded border p-1.5 ${getCoverageStatusClass(status)}`}>
      <div className="text-center">
        <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{total}</span>
        {showDelta && delta > 0 && (
          <span className="text-emerald-600 text-xs ml-0.5">+{delta}</span>
        )}
      </div>
      {!compact && (
        <div className="mt-1 h-1.5 w-full rounded-full bg-white/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getCoverageBarClass(status)}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface WeekRowProps {
  summary: WeeklySummary;
  shiftReferences: ShiftReference[];
  requirements: Map<string, number>;
  showDelta: boolean;
  compact: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function WeekRow({
  summary,
  shiftReferences,
  requirements,
  showDelta,
  compact,
  isExpanded,
  onToggle,
}: WeekRowProps) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      {/* Week Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        <span className="font-medium text-slate-700">Week {summary.weekNumber}</span>
        <span className="text-xs text-slate-500">
          {format(summary.startDate, 'd MMM')} - {format(summary.endDate, 'd MMM')}
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs">
          {summary.totalGaps > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {summary.totalGaps} gaps
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 ${
              summary.averageCoverage >= 100
                ? 'bg-emerald-100 text-emerald-700'
                : summary.averageCoverage >= 80
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {summary.averageCoverage.toFixed(0)}%
          </span>
        </span>
      </button>

      {/* Expanded Daily View */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Shift</th>
                {summary.days.map((day) => (
                  <th
                    key={day.dateStr}
                    className="px-2 py-2 text-center text-xs font-medium text-slate-500"
                  >
                    <div>{DayOfWeekShortLabels[day.dayOfWeek]}</div>
                    <div className="text-slate-400">{format(day.date, 'd')}</div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Req</th>
              </tr>
            </thead>
            <tbody>
              {shiftReferences.map((ref) => {
                const required = requirements.get(ref.cp365_shiftreferenceid) || 0;
                return (
                  <tr key={ref.cp365_shiftreferenceid} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {ref.cp365_shiftreferencename}
                    </td>
                    {summary.days.map((day) => {
                      const coverage = day.byShiftReference.get(ref.cp365_shiftreferenceid);
                      return (
                        <td key={day.dateStr} className="px-1 py-1">
                          {coverage ? (
                            <CoverageCell
                              current={coverage.current}
                              proposed={coverage.proposed}
                              required={coverage.required}
                              status={coverage.status}
                              showDelta={showDelta}
                              compact={compact}
                            />
                          ) : (
                            <div className="rounded bg-slate-100 p-1.5 text-center text-xs text-slate-400">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-medium text-slate-600">{required}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CoveragePreview({
  proposedAssignments,
  existingAssignments: _existingAssignments = [],
  shiftReferences = [],
  requirements = new Map(),
  startDate = new Date(),
  previewWeeks = 4,
  compact = false,
}: CoveragePreviewProps) {
  // State
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [showDelta, setShowDelta] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewMode, setViewMode] = useState<'weekly' | 'summary'>('weekly');

  // Calculate coverage data
  const coverageSummary = useMemo(() => {
    const weeks: WeeklySummary[] = [];
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });

    for (let weekNum = 0; weekNum < previewWeeks; weekNum++) {
      const currentWeekStart = addWeeks(weekStart, weekNum);
      const days: DailyCoverage[] = [];

      for (let dayNum = 0; dayNum < 7; dayNum++) {
        const date = addDays(currentWeekStart, dayNum);
        const dayOfWeek = getDayOfWeek(date);
        const dateStr = format(date, 'yyyy-MM-dd');

        const byShiftReference = new Map<
          string,
          {
            current: number;
            proposed: number;
            total: number;
            required: number;
            variance: number;
            status: 'covered' | 'under' | 'over';
          }
        >();

        // Initialize all shift references
        shiftReferences.forEach((ref) => {
          const required = requirements.get(ref.cp365_shiftreferenceid) || 2; // Default to 2
          byShiftReference.set(ref.cp365_shiftreferenceid, {
            current: 0,
            proposed: 0,
            total: 0,
            required,
            variance: -required,
            status: 'under',
          });
        });

        // Count proposed assignments
        proposedAssignments.forEach(({ pattern, patternDays, rotationStartWeek }) => {
          const patternDay = getPatternDayForDate(
            date,
            patternDays,
            pattern.cp365_sp_rotationcycleweeks,
            rotationStartWeek
          );

          if (
            patternDay &&
            !patternDay.cp365_sp_isrestday &&
            patternDay._cp365_shiftreference_value
          ) {
            const coverage = byShiftReference.get(patternDay._cp365_shiftreference_value);
            if (coverage) {
              coverage.proposed++;
              coverage.total = coverage.current + coverage.proposed;
              coverage.variance = coverage.total - coverage.required;
              coverage.status =
                coverage.variance >= 0 ? (coverage.variance > 0 ? 'over' : 'covered') : 'under';
            }
          }
        });

        // Calculate totals
        let totalCurrent = 0;
        let totalProposed = 0;
        byShiftReference.forEach((coverage) => {
          totalCurrent += coverage.current;
          totalProposed += coverage.proposed;
        });

        days.push({
          date,
          dateStr,
          dayOfWeek,
          byShiftReference,
          totalStaff: {
            current: totalCurrent,
            proposed: totalProposed,
            total: totalCurrent + totalProposed,
          },
        });
      }

      // Calculate week averages
      let totalCoverage = 0;
      let totalGaps = 0;
      let totalOverstaffed = 0;
      let coverageCount = 0;

      days.forEach((day) => {
        day.byShiftReference.forEach((coverage) => {
          const percent = coverage.required > 0 ? (coverage.total / coverage.required) * 100 : 100;
          totalCoverage += percent;
          coverageCount++;
          if (coverage.status === 'under') totalGaps++;
          if (coverage.status === 'over') totalOverstaffed++;
        });
      });

      weeks.push({
        weekNumber: weekNum + 1,
        startDate: currentWeekStart,
        endDate: addDays(currentWeekStart, 6),
        averageCoverage: coverageCount > 0 ? totalCoverage / coverageCount : 0,
        totalGaps,
        totalOverstaffed,
        days,
      });
    }

    // Calculate overall summary
    let totalAvgCoverage = 0;
    let totalGapHours = 0;
    weeks.forEach((week) => {
      totalAvgCoverage += week.averageCoverage;
      totalGapHours += week.totalGaps * 8; // Assume 8 hours per shift
    });

    // Summary by shift reference
    const byShiftRef = new Map<
      string,
      {
        name: string;
        required: number;
        averageAssigned: number;
        coveragePercent: number;
        gapDays: number;
        overDays: number;
      }
    >();

    shiftReferences.forEach((ref) => {
      let totalAssigned = 0;
      let gapDays = 0;
      let overDays = 0;
      let dayCount = 0;

      weeks.forEach((week) => {
        week.days.forEach((day) => {
          const coverage = day.byShiftReference.get(ref.cp365_shiftreferenceid);
          if (coverage) {
            totalAssigned += coverage.total;
            dayCount++;
            if (coverage.status === 'under') gapDays++;
            if (coverage.status === 'over') overDays++;
          }
        });
      });

      const required = requirements.get(ref.cp365_shiftreferenceid) || 2;
      const avgAssigned = dayCount > 0 ? totalAssigned / dayCount : 0;

      byShiftRef.set(ref.cp365_shiftreferenceid, {
        name: ref.cp365_shiftreferencename,
        required,
        averageAssigned: avgAssigned,
        coveragePercent: required > 0 ? (avgAssigned / required) * 100 : 100,
        gapDays,
        overDays,
      });
    });

    return {
      weeks,
      byShiftReference: byShiftRef,
      overall: {
        averageCoverage: previewWeeks > 0 ? totalAvgCoverage / previewWeeks : 0,
        totalGapHours,
        agencyHoursNeeded: totalGapHours,
        improvementFromCurrent: 0, // Would need current state to calculate
      },
    } as CoverageSummary;
  }, [proposedAssignments, shiftReferences, requirements, startDate, previewWeeks]);

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) {
        next.delete(weekNum);
      } else {
        next.add(weekNum);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedWeeks(new Set(coverageSummary.weeks.map((w) => w.weekNumber)));
  };

  const collapseAll = () => {
    setExpandedWeeks(new Set());
  };

  // No data state
  if (proposedAssignments.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          Select staff and a pattern to see coverage preview
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Coverage Preview</h3>
          <span className="text-xs text-slate-500">Next {previewWeeks} weeks</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDelta(!showDelta)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              showDelta ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {showDelta ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
            Show Changes
          </button>
          <button
            onClick={expandAll}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-4 gap-px border-b border-slate-200 bg-slate-200">
        <div className="bg-white p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {coverageSummary.overall.averageCoverage.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500">Avg Coverage</p>
        </div>
        <div className="bg-white p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{proposedAssignments.length}</p>
          <p className="text-xs text-slate-500">Staff Assigned</p>
        </div>
        <div className="bg-white p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {coverageSummary.weeks.reduce((sum, w) => sum + w.totalGaps, 0)}
          </p>
          <p className="text-xs text-slate-500">Gap Instances</p>
        </div>
        <div className="bg-white p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {coverageSummary.overall.agencyHoursNeeded}
          </p>
          <p className="text-xs text-slate-500">Agency Hrs Needed</p>
        </div>
      </div>

      {/* Shift Reference Summary */}
      {!compact && shiftReferences.length > 0 && (
        <div className="border-b border-slate-200 p-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            By Shift Type
          </h4>
          <div className="flex flex-wrap gap-3">
            {Array.from(coverageSummary.byShiftReference.entries()).map(([id, data]) => (
              <div
                key={id}
                className={`rounded-lg border p-2 ${
                  data.coveragePercent >= 100
                    ? 'border-emerald-200 bg-emerald-50'
                    : data.coveragePercent >= 80
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                }`}
              >
                <p className="text-sm font-medium text-slate-700">{data.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span
                    className={
                      data.coveragePercent >= 100
                        ? 'text-emerald-600'
                        : data.coveragePercent >= 80
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }
                  >
                    {data.coveragePercent.toFixed(0)}%
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    {data.averageAssigned.toFixed(1)} / {data.required}
                  </span>
                  {data.gapDays > 0 && <span className="text-amber-600">{data.gapDays} gaps</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Detail */}
      <div className="divide-y divide-slate-100">
        {coverageSummary.weeks.map((week) => (
          <WeekRow
            key={week.weekNumber}
            summary={week}
            shiftReferences={shiftReferences}
            requirements={requirements}
            showDelta={showDelta}
            compact={compact}
            isExpanded={expandedWeeks.has(week.weekNumber)}
            onToggle={() => toggleWeek(week.weekNumber)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-slate-600">Fully Covered</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-amber-500" />
          <span className="text-slate-600">Under-staffed</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-slate-600">Over-staffed</span>
        </div>
      </div>
    </div>
  );
}
