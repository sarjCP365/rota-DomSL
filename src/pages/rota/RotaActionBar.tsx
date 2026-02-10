/**
 * RotaActionBar Component
 * Date navigation, view mode selector, and action buttons.
 * Extracted from RotaView.tsx.
 */

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Copy,
  Download,
  Plus,
} from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { ViewModeSelector } from '@/components/rota/ViewModeSelector';
import type { ViewMode, DetailLevel } from '@/store/rotaStore';
import type { Rota } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

interface RotaActionBarProps {
  // View mode
  viewMode: ViewMode;
  detailLevel: DetailLevel;
  onViewModeChange: (mode: ViewMode) => void;
  onDetailLevelChange: (level: DetailLevel) => void;
  disabled: boolean;

  // Date navigation
  weekStart: Date;
  duration: 7 | 14 | 28;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;

  // Selection
  selectedShiftCount: number;
  onClearSelection: () => void;

  // Actions
  onCopyWeek: () => void;
  onExportPDF: () => void;
  onAddShift: () => void;
  activeRota: Rota | undefined;
  isLoadingActiveRota: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function RotaActionBar({
  viewMode,
  detailLevel,
  onViewModeChange,
  onDetailLevelChange,
  disabled,
  weekStart,
  duration,
  onPreviousWeek,
  onNextWeek,
  onToday,
  selectedShiftCount,
  onClearSelection,
  onCopyWeek,
  onExportPDF,
  onAddShift,
  activeRota,
  isLoadingActiveRota,
}: RotaActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
      {/* Left: View Mode & Date Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Mode Selector (People/Shifts/Reference) */}
        <ViewModeSelector
          viewMode={viewMode}
          detailLevel={detailLevel}
          onViewModeChange={onViewModeChange}
          onDetailLevelChange={onDetailLevelChange}
          disabled={disabled}
        />

        {/* Separator */}
        <div className="hidden md:block h-6 w-px bg-slate-200" />

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200">
            <button
              onClick={onPreviousWeek}
              className="flex h-9 w-9 items-center justify-center rounded-l-lg hover:bg-slate-50"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <button
              onClick={onNextWeek}
              className="flex h-9 w-9 items-center justify-center rounded-r-lg border-l border-slate-200 hover:bg-slate-50"
              aria-label="Next period"
            >
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="font-medium text-slate-700">
              {format(weekStart, 'd MMM')} -{' '}
              {format(addWeeks(weekStart, duration / 7), 'd MMM yyyy')}
            </span>
          </div>

          <button
            onClick={onToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Selection info */}
        {selectedShiftCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
            <span className="text-sm font-medium text-emerald-700">
              {selectedShiftCount} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs text-emerald-600 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        <button
          onClick={onCopyWeek}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Copy Week</span>
        </button>

        <button
          onClick={onExportPDF}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          onClick={onAddShift}
          disabled={!activeRota || isLoadingActiveRota}
          title={
            isLoadingActiveRota
              ? 'Loading rota...'
              : !activeRota
                ? 'No active rota found. Select a sublocation with an active rota.'
                : 'Create a new shift'
          }
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
            activeRota && !isLoadingActiveRota
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'cursor-not-allowed bg-slate-200 text-slate-400'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Shift</span>
        </button>
      </div>
    </div>
  );
}
