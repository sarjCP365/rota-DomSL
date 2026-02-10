/**
 * Coverage Heatmap Component
 *
 * Visual grid showing coverage levels by shift reference and day.
 * Uses colour coding to indicate coverage status.
 */

import { useMemo, useState } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { Calendar, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayOfWeek, DayOfWeekShortLabels } from '../../types';
import type { ShiftReference } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

export interface CoverageRequirement {
  shiftReferenceId: string;
  dayOfWeek: DayOfWeek;
  requiredCount: number;
}

export interface CoverageData {
  date: string;
  shiftReferenceId: string;
  shiftReferenceName: string;
  required: number;
  assigned: number;
  gap: number;
  percentCovered: number;
}

interface CoverageHeatmapProps {
  /** Coverage data to display */
  coverageData: CoverageData[];
  /** Shift references to include */
  shiftReferences: ShiftReference[];
  /** Start date for the view */
  startDate: Date;
  /** Number of days to show */
  days?: number;
  /** Requirements configuration */
  requirements?: CoverageRequirement[];
  /** Callback when requirements are edited */
  onRequirementsChange?: (requirements: CoverageRequirement[]) => void;
  /** Allow editing requirements */
  editable?: boolean;
  /** Export callback */
  onExport?: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getCoverageColor(percentCovered: number): string {
  if (percentCovered >= 100) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (percentCovered >= 75) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (percentCovered >= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function getCoverageBarColor(percentCovered: number): string {
  if (percentCovered >= 100) return 'bg-emerald-500';
  if (percentCovered >= 75) return 'bg-amber-500';
  if (percentCovered >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

function getDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DayOfWeek;
}

// =============================================================================
// CELL COMPONENT
// =============================================================================

interface HeatmapCellProps {
  data: CoverageData | undefined;
  editable: boolean;
  onRequirementChange?: (required: number) => void;
}

function HeatmapCell({ data, editable, onRequirementChange }: HeatmapCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data?.required.toString() || '0');

  if (!data) {
    return (
      <div className="h-full min-h-[60px] flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
        -
      </div>
    );
  }

  const handleSave = () => {
    const newValue = parseInt(editValue) || 0;
    onRequirementChange?.(newValue);
    setIsEditing(false);
  };

  return (
    <div
      className={`h-full min-h-[60px] p-2 border rounded ${getCoverageColor(data.percentCovered)} flex flex-col justify-center`}
    >
      <div className="text-center">
        <span className="text-lg font-bold">{data.assigned}</span>
        <span className="text-sm font-normal opacity-70">/{data.required}</span>
      </div>

      {/* Coverage bar */}
      <div className="mt-1 h-1.5 w-full rounded-full bg-white/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${getCoverageBarColor(data.percentCovered)}`}
          style={{ width: `${Math.min(100, data.percentCovered)}%` }}
        />
      </div>

      {/* Gap indicator */}
      {data.gap > 0 && (
        <div className="mt-1 text-center text-xs font-medium text-red-600">-{data.gap}</div>
      )}

      {/* Editable requirement */}
      {editable && (
        <button
          onClick={() => setIsEditing(true)}
          className="mt-1 text-xs text-center text-slate-500 hover:text-slate-700"
        >
          Edit req
        </button>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white p-4 shadow-xl">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Edit requirement for {data.shiftReferenceName}
            </p>
            <input
              type="number"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CoverageHeatmap({
  coverageData,
  shiftReferences,
  startDate,
  days = 7,
  requirements = [],
  onRequirementsChange,
  editable = false,
  onExport,
}: CoverageHeatmapProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate dates to display
  const displayDates = useMemo(() => {
    const weekStart = startOfWeek(addDays(startDate, weekOffset * 7), { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, days - 1),
    });
  }, [startDate, weekOffset, days]);

  // Organize data by shift reference and date
  const dataGrid = useMemo(() => {
    const grid = new Map<string, Map<string, CoverageData>>();

    shiftReferences.forEach((ref) => {
      grid.set(ref.cp365_shiftreferenceid, new Map());
    });

    coverageData.forEach((data) => {
      const refGrid = grid.get(data.shiftReferenceId);
      if (refGrid) {
        refGrid.set(data.date, data);
      }
    });

    return grid;
  }, [coverageData, shiftReferences]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalRequired = 0;
    let totalAssigned = 0;
    let totalGaps = 0;

    coverageData.forEach((data) => {
      const dateStr = data.date;
      if (displayDates.some((d) => format(d, 'yyyy-MM-dd') === dateStr)) {
        totalRequired += data.required;
        totalAssigned += data.assigned;
        totalGaps += Math.max(0, data.gap);
      }
    });

    return {
      required: totalRequired,
      assigned: totalAssigned,
      gaps: totalGaps,
      coverage: totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 100,
    };
  }, [coverageData, displayDates]);

  const handleRequirementChange = (
    shiftRefId: string,
    dayOfWeek: DayOfWeek,
    newRequired: number
  ) => {
    if (!onRequirementsChange) return;

    const updated = [...requirements];
    const existingIndex = updated.findIndex(
      (r) => r.shiftReferenceId === shiftRefId && r.dayOfWeek === dayOfWeek
    );

    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], requiredCount: newRequired };
    } else {
      updated.push({
        shiftReferenceId: shiftRefId,
        dayOfWeek,
        requiredCount: newRequired,
      });
    }

    onRequirementsChange(updated);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Coverage Heatmap</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-slate-600">
            {format(displayDates[0], 'd MMM')} -{' '}
            {format(displayDates[displayDates.length - 1], 'd MMM yyyy')}
          </span>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="ml-2 flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-px border-b border-slate-200 bg-slate-200">
        <div className="bg-white p-3 text-center">
          <p className="text-lg font-bold text-slate-700">{totals.assigned}</p>
          <p className="text-xs text-slate-500">Assigned</p>
        </div>
        <div className="bg-white p-3 text-center">
          <p className="text-lg font-bold text-slate-600">{totals.required}</p>
          <p className="text-xs text-slate-500">Required</p>
        </div>
        <div className="bg-white p-3 text-center">
          <p
            className={`text-lg font-bold ${totals.gaps > 0 ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {totals.gaps}
          </p>
          <p className="text-xs text-slate-500">Gaps</p>
        </div>
        <div className="bg-white p-3 text-center">
          <p
            className={`text-lg font-bold ${
              totals.coverage >= 100
                ? 'text-emerald-600'
                : totals.coverage >= 75
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {totals.coverage.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500">Coverage</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-32 px-3 py-2 text-left text-xs font-medium text-slate-500">Shift</th>
              {displayDates.map((date) => (
                <th
                  key={format(date, 'yyyy-MM-dd')}
                  className="px-2 py-2 text-center text-xs font-medium text-slate-500"
                >
                  <div>{DayOfWeekShortLabels[getDayOfWeek(date)]}</div>
                  <div className="text-slate-400">{format(date, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shiftReferences.map((ref) => {
              const refData = dataGrid.get(ref.cp365_shiftreferenceid);
              return (
                <tr key={ref.cp365_shiftreferenceid}>
                  <td className="px-3 py-2 text-sm font-medium text-slate-700">
                    {ref.cp365_shiftreferencename}
                  </td>
                  {displayDates.map((date) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const cellData = refData?.get(dateStr);
                    return (
                      <td key={dateStr} className="p-1">
                        <HeatmapCell
                          data={cellData}
                          editable={editable}
                          onRequirementChange={(required) =>
                            handleRequirementChange(
                              ref.cp365_shiftreferenceid,
                              getDayOfWeek(date),
                              required
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 border-t border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-slate-600">100%+ Covered</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-amber-500" />
          <span className="text-slate-600">75-99%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-orange-500" />
          <span className="text-slate-600">50-74%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span className="text-slate-600">&lt;50% (Critical)</span>
        </div>
      </div>
    </div>
  );
}
