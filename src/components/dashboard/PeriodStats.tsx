/**
 * Period Stats Component
 * Summary statistics for the selected date period
 */

import { Calendar, Users, Clock, UserCheck, UserX, Send } from 'lucide-react';
import { Skeleton } from '@/components/common/Loading';

interface PeriodStatsProps {
  stats: {
    totalShifts: number;
    assignedShifts: number;
    unfilledShifts: number;
    staffOnLeave: number;
    unpublishedShifts: number;
    totalHours: number;
    contractedHours: number;
  } | null;
  isLoading: boolean;
}

export function PeriodStats({ stats, isLoading }: PeriodStatsProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-800">Period Stats</h3>
        </div>
        <div className="p-8 text-center text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const hoursPercent = stats.contractedHours > 0 
    ? Math.round((stats.totalHours / stats.contractedHours) * 100)
    : 0;

  const getHoursColour = (percent: number): string => {
    if (percent <= 85) return 'text-emerald-600';
    if (percent <= 100) return 'text-amber-600';
    return 'text-red-600';
  };

  const getHoursBarColour = (percent: number): string => {
    if (percent <= 85) return 'bg-emerald-500';
    if (percent <= 100) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <Calendar className="h-4 w-4 text-slate-500" />
          Period Stats
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Total Shifts */}
          <StatRow
            icon={<Users className="h-4 w-4 text-slate-400" />}
            label="Total Shifts"
            value={stats.totalShifts}
          />

          {/* Assigned */}
          <StatRow
            icon={<UserCheck className="h-4 w-4 text-emerald-500" />}
            label="Assigned"
            value={stats.assignedShifts}
            valueClass="text-emerald-600"
          />

          {/* Unfilled */}
          <StatRow
            icon={<UserX className="h-4 w-4 text-amber-500" />}
            label="Unfilled"
            value={stats.unfilledShifts}
            valueClass={stats.unfilledShifts > 0 ? 'text-amber-600' : 'text-slate-600'}
          />

          {/* Staff on Leave */}
          <StatRow
            icon={<Calendar className="h-4 w-4 text-blue-500" />}
            label="Staff on Leave"
            value={stats.staffOnLeave}
          />

          {/* Unpublished */}
          <StatRow
            icon={<Send className="h-4 w-4 text-purple-500" />}
            label="Unpublished"
            value={stats.unpublishedShifts}
            valueClass={stats.unpublishedShifts > 0 ? 'text-purple-600' : 'text-slate-600'}
          />
        </div>

        {/* Hours Progress */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Clock className="h-4 w-4" />
              Total Hours
            </span>
            <span className="font-semibold text-slate-800">
              {stats.totalHours.toLocaleString()} hrs
            </span>
          </div>

          {stats.contractedHours > 0 && (
            <>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">vs Contracted ({stats.contractedHours.toLocaleString()} hrs)</span>
                <span className={`font-medium ${getHoursColour(hoursPercent)}`}>
                  {hoursPercent}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${getHoursBarColour(hoursPercent)}`}
                  style={{ width: `${Math.min(hoursPercent, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueClass?: string;
}

function StatRow({ icon, label, value, valueClass = 'text-slate-800' }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        {icon}
        {label}
      </span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
