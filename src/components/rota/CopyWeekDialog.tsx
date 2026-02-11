/**
 * CopyWeekDialog Component
 *
 * Modal dialog for copying all shifts from the current week to a target week.
 * Features:
 * - Target week picker (navigate forward/backward)
 * - Options: include unassigned shifts, set status
 * - Real-time progress bar during copy
 * - Results summary on completion
 *
 * Uses direct Dataverse Web API calls with concurrency-limited parallel creation
 * for scalable performance (no Power Automate dependency).
 */

import { useState, useCallback, useMemo } from 'react';
import {
  X,
  Copy,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';
import {
  format,
  addWeeks,
  subWeeks,
  addDays,
  differenceInCalendarDays,
  startOfWeek,
  parseISO,
} from 'date-fns';
import { useBulkCreateShifts } from '@/hooks/useShifts';
import { ShiftStatus } from '@/api/dataverse/types';
import type { ShiftViewData, Shift } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

interface CopyWeekDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Monday of the source week */
  sourceWeekStart: Date;
  /** Duration of the current view (7, 14, or 28) */
  duration: 7 | 14 | 28;
  /** Shifts currently displayed in the grid */
  shifts: ShiftViewData[];
  /** Active rota ID (required for binding new shifts) */
  rotaId: string | undefined;
}

type DialogPhase = 'configure' | 'copying' | 'complete';

interface CopyResult {
  success: number;
  failed: number;
  errors: string[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a value is a valid GUID
 */
function isValidGuid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  const guidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidPattern.test(trimmed);
}

/**
 * Build a Dataverse shift creation payload from a ShiftViewData source,
 * offset to a new date.
 */
function buildShiftPayload(
  source: ShiftViewData,
  newDate: string,
  rotaId: string,
  statusOverride?: ShiftStatus
): Partial<Shift> & Record<string, unknown> {
  // Parse source times to extract hours/minutes
  const sourceStart = parseISO(source['Shift Start Time']);
  const sourceEnd = parseISO(source['Shift End Time']);

  const startHours = String(sourceStart.getUTCHours()).padStart(2, '0');
  const startMinutes = String(sourceStart.getUTCMinutes()).padStart(2, '0');
  const endHours = String(sourceEnd.getUTCHours()).padStart(2, '0');
  const endMinutes = String(sourceEnd.getUTCMinutes()).padStart(2, '0');

  const payload: Record<string, unknown> = {
    cp365_shiftdate: newDate,
    cp365_shiftstarttime: `${newDate}T${startHours}:${startMinutes}:00Z`,
    cp365_shiftendtime: `${newDate}T${endHours}:${endMinutes}:00Z`,
    cp365_shiftstatus: statusOverride ?? ShiftStatus.Unpublished,
    cr1e2_shiftbreakduration: source['Shift Break Duration'] || 0,
    cp365_communityhours: source['Community Hours'] || 0,
  };

  // Boolean fields
  if (source['Overtime Shift']) payload.cp365_overtimeshift = true;
  if (source['Sleep In']) payload.cp365_sleepin = true;
  if (source['Shift Leader']) payload.cp365_shiftleader = true;
  if (source['Act Up']) payload.cp365_actup = true;

  // Lookup bindings (PascalCase navigation properties for cp365_shift)
  if (isValidGuid(source['Staff Member ID'])) {
    payload['cp365_StaffMember@odata.bind'] = `/cp365_staffmembers(${source['Staff Member ID']})`;
  }
  if (isValidGuid(source['Shift Reference'])) {
    payload['cp365_ShiftReference@odata.bind'] =
      `/cp365_shiftreferences(${source['Shift Reference']})`;
  }
  if (isValidGuid(source['Shift Activity'])) {
    payload['cp365_ShiftActivity@odata.bind'] =
      `/cp365_shiftactivities(${source['Shift Activity']})`;
  }
  if (isValidGuid(rotaId)) {
    payload['cp365_Rota@odata.bind'] = `/cp365_rotas(${rotaId})`;
  }

  return payload as Partial<Shift> & Record<string, unknown>;
}

// =============================================================================
// Component
// =============================================================================

export function CopyWeekDialog({
  isOpen,
  onClose,
  sourceWeekStart,
  duration,
  shifts,
  rotaId,
}: CopyWeekDialogProps) {
  // Target week state — default to next week
  const [targetWeekStart, setTargetWeekStart] = useState<Date>(() =>
    addWeeks(sourceWeekStart, duration === 28 ? 4 : duration === 14 ? 2 : 1)
  );

  // Options
  const [includeUnassigned, setIncludeUnassigned] = useState(true);
  const [copyAsUnpublished, setCopyAsUnpublished] = useState(true);

  // Progress state
  const [phase, setPhase] = useState<DialogPhase>('configure');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<CopyResult | null>(null);

  const bulkCreate = useBulkCreateShifts();

  // Filter shifts that belong to the source week (exclude other-rota shifts)
  const sourceShifts = useMemo(() => {
    const endDate = addDays(sourceWeekStart, duration);

    return shifts.filter((shift) => {
      // Exclude shifts from other rotas
      if (shift.isFromOtherRota) return false;
      // Exclude external staff shifts
      if (shift['Is External Staff']) return false;
      // Filter by date range
      const shiftDate = parseISO(shift['Shift Date']);
      return shiftDate >= sourceWeekStart && shiftDate < endDate;
    });
  }, [shifts, sourceWeekStart, duration]);

  // Shifts that will actually be copied (after applying options)
  const shiftsToCopy = useMemo(() => {
    if (includeUnassigned) return sourceShifts;
    return sourceShifts.filter((s) => isValidGuid(s['Staff Member ID']));
  }, [sourceShifts, includeUnassigned]);

  // Navigation handlers for target week
  const handlePreviousTarget = useCallback(() => {
    setTargetWeekStart((prev) => subWeeks(prev, duration === 28 ? 4 : duration === 14 ? 2 : 1));
  }, [duration]);

  const handleNextTarget = useCallback(() => {
    setTargetWeekStart((prev) => addWeeks(prev, duration === 28 ? 4 : duration === 14 ? 2 : 1));
  }, [duration]);

  // Check if target overlaps source
  const isTargetSameAsSource = useMemo(() => {
    return (
      startOfWeek(targetWeekStart, { weekStartsOn: 1 }).getTime() ===
      startOfWeek(sourceWeekStart, { weekStartsOn: 1 }).getTime()
    );
  }, [targetWeekStart, sourceWeekStart]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!rotaId || shiftsToCopy.length === 0) return;

    setPhase('copying');
    setProgress({ completed: 0, total: shiftsToCopy.length });

    // Calculate the day offset between source and target weeks
    const dayOffset = differenceInCalendarDays(targetWeekStart, sourceWeekStart);

    // Build payloads for all shifts
    const payloads = shiftsToCopy.map((shift) => {
      const sourceDate = parseISO(shift['Shift Date']);
      const newDate = addDays(sourceDate, dayOffset);
      const newDateStr = format(newDate, 'yyyy-MM-dd');

      return buildShiftPayload(
        shift,
        newDateStr,
        rotaId,
        copyAsUnpublished ? ShiftStatus.Unpublished : undefined
      );
    });

    try {
      const copyResult = await bulkCreate.mutateAsync({
        shifts: payloads,
        onProgress: (completed, total) => {
          setProgress({ completed, total });
        },
      });

      setResult(copyResult);
      setPhase('complete');
    } catch (error) {
      console.error('[CopyWeek] Bulk create failed:', error);
      setResult({
        success: 0,
        failed: shiftsToCopy.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
      setPhase('complete');
    }
  }, [rotaId, shiftsToCopy, targetWeekStart, sourceWeekStart, copyAsUnpublished, bulkCreate]);

  // Reset dialog state when closing
  const handleClose = useCallback(() => {
    // Reset to defaults for next open
    setPhase('configure');
    setProgress({ completed: 0, total: 0 });
    setResult(null);
    setTargetWeekStart(addWeeks(sourceWeekStart, duration === 28 ? 4 : duration === 14 ? 2 : 1));
    setIncludeUnassigned(true);
    setCopyAsUnpublished(true);
    onClose();
  }, [onClose, sourceWeekStart, duration]);

  if (!isOpen) return null;

  const sourceEndDate = addDays(sourceWeekStart, duration);
  const targetEndDate = addDays(targetWeekStart, duration);
  const periodLabel = duration === 7 ? 'week' : duration === 14 ? '2-week period' : 'month';
  const progressPercent =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Copy className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Copy {periodLabel}</h2>
              <p className="text-sm text-slate-500">Duplicate shifts to another {periodLabel}</p>
            </div>
          </div>
          {phase !== 'copying' && (
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {phase === 'configure' && (
            <div className="space-y-5">
              {/* Source week info */}
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Copy from
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {format(sourceWeekStart, 'd MMM')} –{' '}
                    {format(addDays(sourceEndDate, -1), 'd MMM yyyy')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {shiftsToCopy.length} shift{shiftsToCopy.length !== 1 ? 's' : ''} will be copied
                  {sourceShifts.length !== shiftsToCopy.length && (
                    <span className="text-slate-400">
                      {' '}
                      ({sourceShifts.length - shiftsToCopy.length} unassigned excluded)
                    </span>
                  )}
                </p>
              </div>

              {/* Target week picker */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Copy to
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePreviousTarget}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                    aria-label="Previous target period"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-slate-900">
                      {format(targetWeekStart, 'd MMM')} –{' '}
                      {format(addDays(targetEndDate, -1), 'd MMM yyyy')}
                    </span>
                  </div>
                  <button
                    onClick={handleNextTarget}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                    aria-label="Next target period"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
                {isTargetSameAsSource && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    Target {periodLabel} is the same as the source — shifts will be duplicated.
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Options
                </p>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeUnassigned}
                    onChange={(e) => setIncludeUnassigned(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      Include unassigned shifts
                    </span>
                    <p className="text-xs text-slate-500">
                      Copy shifts that don't have a staff member assigned
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={copyAsUnpublished}
                    onChange={(e) => setCopyAsUnpublished(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      Create as unpublished
                    </span>
                    <p className="text-xs text-slate-500">
                      New shifts will be unpublished for review before staff can see them
                    </p>
                  </div>
                </label>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  Existing shifts in the target {periodLabel} will not be affected. Copied shifts
                  are created alongside any existing ones.
                </p>
              </div>
            </div>
          )}

          {phase === 'copying' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span className="font-medium text-slate-700">Copying shifts...</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-center text-sm text-slate-500">
                  {progress.completed} of {progress.total} shifts created ({progressPercent}%)
                </p>
              </div>
            </div>
          )}

          {phase === 'complete' && result && (
            <div className="space-y-4 py-4">
              {result.failed === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Copy complete</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Successfully created{' '}
                      <span className="font-medium text-emerald-600">{result.success}</span> shift
                      {result.success !== 1 ? 's' : ''} in the target {periodLabel}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                    <AlertTriangle className="h-7 w-7 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Copy completed with errors</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      <span className="font-medium text-emerald-600">{result.success}</span>{' '}
                      succeeded, <span className="font-medium text-red-600">{result.failed}</span>{' '}
                      failed
                    </p>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="w-full max-h-32 overflow-y-auto rounded-lg bg-red-50 p-3 text-left">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-red-700">
                          {err}
                        </p>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="mt-1 text-xs text-red-500">
                          ...and {result.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {phase === 'configure' && (
            <>
              <button
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                disabled={shiftsToCopy.length === 0 || !rotaId || isTargetSameAsSource}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  shiftsToCopy.length > 0 && rotaId && !isTargetSameAsSource
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400'
                }`}
              >
                <Copy className="h-4 w-4" />
                Copy {shiftsToCopy.length} shift{shiftsToCopy.length !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {phase === 'complete' && (
            <button
              onClick={handleClose}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
