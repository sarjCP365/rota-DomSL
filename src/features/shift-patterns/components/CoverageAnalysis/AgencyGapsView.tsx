/**
 * Agency Gaps View Component
 * 
 * Displays a list of uncovered shifts grouped by date,
 * showing estimated agency hours needed to fill gaps.
 */

import { useMemo, useState } from 'react';
import { format, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import {
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronRight,
  Building2,
  ExternalLink,
} from 'lucide-react';
import type { CoverageData } from './CoverageHeatmap';
import type { ShiftReference } from '../../../../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface GapEntry {
  date: string;
  shiftReferenceId: string;
  shiftReferenceName: string;
  startTime: string;
  endTime: string;
  gapCount: number;
  hoursPerShift: number;
  totalGapHours: number;
}

interface DailyGapSummary {
  date: string;
  dateFormatted: string;
  gaps: GapEntry[];
  totalGapHours: number;
  totalGapShifts: number;
}

interface AgencyGapsViewProps {
  /** Coverage data to analyze */
  coverageData: CoverageData[];
  /** Shift references for time info */
  shiftReferences: ShiftReference[];
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Export callback */
  onExport?: () => void;
  /** Create agency request callback */
  onCreateAgencyRequest?: (gaps: GapEntry[]) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get shift hours from shift reference
 */
function getShiftHours(ref: ShiftReference): number {
  const startMinutes = (ref.cp365_shiftreferencestarthour || 9) * 60 + (ref.cp365_shiftreferencestartminute || 0);
  let endMinutes = (ref.cp365_shiftreferenceendhour || 17) * 60 + (ref.cp365_shiftreferenceendminute || 0);
  
  // Handle overnight
  if (ref.cp365_endonnextday && endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * Format time from hour/minute
 */
function formatShiftTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// =============================================================================
// GAP CARD COMPONENT
// =============================================================================

interface GapCardProps {
  gap: GapEntry;
  onRequestAgency?: () => void;
}

function GapCard({ gap, onRequestAgency }: GapCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <Users className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="font-medium text-slate-800">{gap.shiftReferenceName}</p>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {gap.startTime} - {gap.endTime}
            </span>
            <span className="text-red-600 font-medium">
              Need {gap.gapCount} more
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold text-red-600">{gap.totalGapHours}h</p>
          <p className="text-xs text-slate-500">gap hours</p>
        </div>
        {onRequestAgency && (
          <button
            onClick={onRequestAgency}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            <Building2 className="h-3.5 w-3.5" />
            Request
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DAY SECTION COMPONENT
// =============================================================================

interface DaySectionProps {
  summary: DailyGapSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onRequestAgency?: (gaps: GapEntry[]) => void;
}

function DaySection({ summary, isExpanded, onToggle, onRequestAgency }: DaySectionProps) {
  const criticalLevel = summary.totalGapHours > 24 ? 'critical' : summary.totalGapHours > 8 ? 'warning' : 'normal';

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 ${
          criticalLevel === 'critical'
            ? 'bg-red-50'
            : criticalLevel === 'warning'
            ? 'bg-amber-50'
            : ''
        }`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <Calendar className="h-5 w-5 text-slate-400" />
          <span className="font-medium text-slate-800">{summary.dateFormatted}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {summary.totalGapShifts} gaps
          </span>
          <span
            className={`rounded px-2 py-0.5 text-sm font-medium ${
              criticalLevel === 'critical'
                ? 'bg-red-100 text-red-700'
                : criticalLevel === 'warning'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {summary.totalGapHours}h needed
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-2 px-4 pb-4">
          {summary.gaps.map((gap, index) => (
            <GapCard
              key={`${gap.date}-${gap.shiftReferenceId}-${index}`}
              gap={gap}
              onRequestAgency={onRequestAgency ? () => onRequestAgency([gap]) : undefined}
            />
          ))}
          {onRequestAgency && summary.gaps.length > 1 && (
            <button
              onClick={() => onRequestAgency(summary.gaps)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Building2 className="h-4 w-4" />
              Request Agency for All ({summary.totalGapHours}h)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AgencyGapsView({
  coverageData,
  shiftReferences,
  startDate,
  endDate,
  onExport,
  onCreateAgencyRequest,
}: AgencyGapsViewProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Process gaps data
  const { dailySummaries, totalGapHours, totalGapShifts, daysWithGaps } = useMemo(() => {
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const summaries: DailyGapSummary[] = [];
    let totalHours = 0;
    let totalShifts = 0;
    let gapDays = 0;

    // Create a map of shift reference data
    const refMap = new Map<string, ShiftReference>();
    shiftReferences.forEach((ref) => {
      refMap.set(ref.cp365_shiftreferenceid, ref);
    });

    // Group coverage data by date
    const byDate = new Map<string, CoverageData[]>();
    coverageData.forEach((data) => {
      if (data.gap > 0) {
        const existing = byDate.get(data.date) || [];
        existing.push(data);
        byDate.set(data.date, existing);
      }
    });

    // Build summaries for each date
    dateRange.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dateData = byDate.get(dateStr);

      if (dateData && dateData.length > 0) {
        const gaps: GapEntry[] = [];
        let dayTotalHours = 0;
        let dayTotalShifts = 0;

        dateData.forEach((data) => {
          const ref = refMap.get(data.shiftReferenceId);
          const hoursPerShift = ref ? getShiftHours(ref) : 8;
          const gapHours = data.gap * hoursPerShift;

          gaps.push({
            date: dateStr,
            shiftReferenceId: data.shiftReferenceId,
            shiftReferenceName: data.shiftReferenceName,
            startTime: ref
              ? formatShiftTime(ref.cp365_shiftreferencestarthour || 9, ref.cp365_shiftreferencestartminute || 0)
              : '09:00',
            endTime: ref
              ? formatShiftTime(ref.cp365_shiftreferenceendhour || 17, ref.cp365_shiftreferenceendminute || 0)
              : '17:00',
            gapCount: data.gap,
            hoursPerShift,
            totalGapHours: gapHours,
          });

          dayTotalHours += gapHours;
          dayTotalShifts += data.gap;
        });

        summaries.push({
          date: dateStr,
          dateFormatted: format(date, 'EEEE, d MMMM yyyy'),
          gaps,
          totalGapHours: dayTotalHours,
          totalGapShifts: dayTotalShifts,
        });

        totalHours += dayTotalHours;
        totalShifts += dayTotalShifts;
        gapDays++;
      }
    });

    return {
      dailySummaries: summaries,
      totalGapHours: totalHours,
      totalGapShifts: totalShifts,
      daysWithGaps: gapDays,
    };
  }, [coverageData, shiftReferences, startDate, endDate]);

  const toggleDate = (dateStr: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDates(new Set(dailySummaries.map((s) => s.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  // No gaps state
  if (dailySummaries.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Users className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-medium text-emerald-800">No Coverage Gaps</h3>
        <p className="mt-1 text-sm text-emerald-600">
          All shifts are fully covered for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="font-semibold text-slate-800">Agency Gaps</h3>
        </div>
        <div className="flex items-center gap-2">
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
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-200">
        <div className="bg-white p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{totalGapHours}</p>
          <p className="text-xs text-slate-500">Total Gap Hours</p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="text-3xl font-bold text-slate-700">{totalGapShifts}</p>
          <p className="text-xs text-slate-500">Shift Gaps</p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{daysWithGaps}</p>
          <p className="text-xs text-slate-500">Days Affected</p>
        </div>
      </div>

      {/* Estimated Cost (if applicable) */}
      <div className="border-b border-slate-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Agency Coverage Estimate</span>
          </div>
          <span className="text-sm text-amber-700">
            ~£{(totalGapHours * 18).toFixed(2)} @ £18/hr (estimated)
          </span>
        </div>
      </div>

      {/* Daily Gaps List */}
      <div className="divide-y divide-slate-100">
        {dailySummaries.map((summary) => (
          <DaySection
            key={summary.date}
            summary={summary}
            isExpanded={expandedDates.has(summary.date)}
            onToggle={() => toggleDate(summary.date)}
            onRequestAgency={onCreateAgencyRequest}
          />
        ))}
      </div>

      {/* Bulk Action */}
      {onCreateAgencyRequest && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={() => {
              const allGaps = dailySummaries.flatMap((s) => s.gaps);
              onCreateAgencyRequest(allGaps);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Building2 className="h-4 w-4" />
            Request Agency for All Gaps ({totalGapHours}h)
          </button>
        </div>
      )}
    </div>
  );
}

