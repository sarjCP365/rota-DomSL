/**
 * DailyStatsBar Component
 * Statistics row showing staff count, hours, unassigned shifts, leave, and publish actions.
 * Includes both mobile (compact) and desktop layouts.
 * Extracted from DailyView.tsx.
 */

import { Users, Clock, AlertCircle, Calendar, Send, Loader2 } from 'lucide-react';
import { LastUpdatedIndicator } from '@/components/daily/LastUpdatedIndicator';
import type { DailyStats } from './useDailyViewData';

// =============================================================================
// Types
// =============================================================================

interface DailyStatsBarProps {
  stats: DailyStats;
  lastUpdatedText: string;
  isRefreshing: boolean;
  isLoadingRota: boolean;
  isAutoRefreshEnabled: boolean;
  isPageVisible: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: (enabled: boolean) => void;
  onShowBulkAssignModal: () => void;
  onShowStaffOnLeaveModal: () => void;
  onPublishAll: () => void;
  isPublishing: boolean;
  refetchRota: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function DailyStatsBar({
  stats,
  lastUpdatedText,
  isRefreshing,
  isLoadingRota,
  isAutoRefreshEnabled,
  isPageVisible,
  onRefresh,
  onToggleAutoRefresh,
  onShowBulkAssignModal,
  onShowStaffOnLeaveModal,
  onPublishAll,
  isPublishing,
  refetchRota,
}: DailyStatsBarProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3">
          {/* Compact Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="text-lg font-bold text-emerald-600">{stats.staffCount}</span>
                <span className="ml-1 text-xs text-slate-500">staff</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="text-lg font-bold text-emerald-600">{stats.totalHours}</span>
                <span className="ml-1 text-xs text-slate-500">hours</span>
              </div>
            </div>
            {/* Unassigned Count - Clickable for Bulk Assign */}
            {stats.unassignedCount > 0 && (
              <button
                onClick={onShowBulkAssignModal}
                className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 hover:bg-amber-200 transition-colors"
              >
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <div>
                  <span className="text-lg font-bold text-amber-600">
                    {stats.unassignedCount}
                  </span>
                  <span className="ml-1 text-xs text-amber-700">unassigned</span>
                </div>
              </button>
            )}
            {/* Staff on Leave - Clickable to show list */}
            {stats.staffOnLeave > 0 && (
              <button
                onClick={onShowStaffOnLeaveModal}
                className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 hover:bg-red-200 transition-colors"
              >
                <Calendar className="h-4 w-4 text-red-600" />
                <div>
                  <span className="text-lg font-bold text-red-600">{stats.staffOnLeave}</span>
                  <span className="ml-1 text-xs text-red-700">on leave</span>
                </div>
              </button>
            )}
            {/* Unpublished Count - Clickable to Publish All */}
            {stats.unpublishedCount > 0 && (
              <button
                onClick={onPublishAll}
                disabled={isPublishing}
                className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 hover:bg-emerald-200 transition-colors disabled:opacity-50"
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-emerald-600" />
                )}
                <div>
                  <span className="text-lg font-bold text-emerald-600">
                    {stats.unpublishedCount}
                  </span>
                  <span className="ml-1 text-xs text-emerald-700">
                    {isPublishing ? 'publishing...' : 'publish'}
                  </span>
                </div>
              </button>
            )}
          </div>
          {/* Compact Last Updated */}
          <LastUpdatedIndicator
            lastUpdatedText={lastUpdatedText}
            isRefreshing={isRefreshing && !isLoadingRota}
            onRefresh={() => refetchRota()}
            compact
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <div className="flex gap-4">
          {/* Staff Count Card */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{stats.staffCount}</div>
              <div className="text-xs text-slate-500">Staff on Shifts</div>
            </div>
          </div>

          {/* Total Hours Card */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{stats.totalHours}</div>
              <div className="text-xs text-slate-500">Total Rostered Hours</div>
            </div>
          </div>

          {/* Unassigned Shifts Card - Clickable for Bulk Assign */}
          {stats.unassignedCount > 0 && (
            <button
              onClick={onShowBulkAssignModal}
              className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm hover:bg-amber-100 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.unassignedCount}</div>
                <div className="text-xs text-amber-700">Unassigned Shifts</div>
              </div>
            </button>
          )}

          {/* Staff on Leave Card - Clickable to show list */}
          {stats.staffOnLeave > 0 && (
            <button
              onClick={onShowStaffOnLeaveModal}
              className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm hover:bg-red-100 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-red-600">{stats.staffOnLeave}</div>
                <div className="text-xs text-red-700">On Leave</div>
              </div>
            </button>
          )}

          {/* Unpublished Shifts Card - Clickable to Publish All */}
          {stats.unpublishedCount > 0 && (
            <button
              onClick={onPublishAll}
              disabled={isPublishing}
              className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                {isPublishing ? (
                  <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.unpublishedCount}
                </div>
                <div className="text-xs text-emerald-700">
                  {isPublishing ? 'Publishing...' : 'Publish All'}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Last Updated Indicator */}
        <LastUpdatedIndicator
          lastUpdatedText={lastUpdatedText}
          isRefreshing={isRefreshing && !isLoadingRota}
          onRefresh={onRefresh}
          isAutoRefreshEnabled={isAutoRefreshEnabled}
          onToggleAutoRefresh={onToggleAutoRefresh}
          isPageVisible={isPageVisible}
        />
      </div>
    </div>
  );
}

export default DailyStatsBar;
