/**
 * Today's Snapshot Component
 * Real-time view of today's staffing situation
 * Always shows current day data, regardless of period filter
 */

import { format } from 'date-fns';
import { Users, Clock, UserX, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import type { TodaySnapshotData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/common/Loading';

interface TodaySnapshotProps {
  data: TodaySnapshotData | null | undefined;
  isLoading: boolean;
}

export function TodaySnapshot({ data, isLoading }: TodaySnapshotProps) {
  const today = new Date();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users className="h-5 w-5 text-emerald-600" />
            Today's Snapshot
          </h2>
          <span className="text-sm text-slate-500">
            {format(today, 'EEEE, d MMMM yyyy')}
          </span>
        </div>
      </div>

      {/* Content */}
      {!data ? (
        <div className="p-8 text-center text-slate-500">
          Select a location and sublocation to view today's snapshot.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
          {/* On Shift Now Card */}
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">On Shift Now</p>
                <p className="mt-1 text-3xl font-bold text-emerald-700">{data.onShiftNow}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-2">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            {/* Coverage Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Coverage</span>
                <span className={`font-medium ${getCoverageColour(data.coveragePercent)}`}>
                  {data.coveragePercent}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${getCoverageBarColour(data.coveragePercent)}`}
                  style={{ width: `${data.coveragePercent}%` }}
                />
              </div>
            </div>

            {/* Unfilled Alert */}
            {data.unfilledToday > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{data.unfilledToday} unfilled shift{data.unfilledToday > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Shift Changes Card */}
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Shift Changes</p>
                <p className="mt-1 text-sm text-slate-500">Next 4 hours</p>
              </div>
              <div className="rounded-full bg-blue-100 p-2">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>

            {data.upcomingChanges.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No upcoming changes</p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.upcomingChanges.slice(0, 3).map((change) => (
                  <div
                    key={change.time}
                    className="flex items-center justify-between rounded bg-white/50 px-2 py-1.5 text-sm"
                  >
                    <span className="font-medium text-slate-700">{change.time}</span>
                    <div className="flex items-center gap-3 text-xs">
                      {change.starting > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <ArrowRight className="h-3 w-3" />+{change.starting}
                        </span>
                      )}
                      {change.ending > 0 && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <ArrowLeft className="h-3 w-3" />-{change.ending}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Absent Today Card */}
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Absent Today</p>
                <p className="mt-1 text-3xl font-bold text-amber-700">{data.absentToday.length}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-2">
                <UserX className="h-5 w-5 text-amber-600" />
              </div>
            </div>

            {data.absentToday.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No absences today</p>
            ) : (
              <div className="mt-3 space-y-1">
                {data.absentToday.slice(0, 3).map((absence) => (
                  <div
                    key={absence.staffId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-slate-700">{absence.staffName}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-500">{absence.reason}</span>
                  </div>
                ))}
                {data.absentToday.length > 3 && (
                  <p className="text-xs text-slate-400">
                    +{data.absentToday.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for coverage colours
function getCoverageColour(percent: number): string {
  if (percent >= 90) return 'text-emerald-600';
  if (percent >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function getCoverageBarColour(percent: number): string {
  if (percent >= 90) return 'bg-emerald-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}
