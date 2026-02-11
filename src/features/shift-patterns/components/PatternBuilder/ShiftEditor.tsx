/**
 * ShiftEditor Component
 * Modal/popover for editing individual day shifts in the pattern builder
 *
 * Features:
 * - Is Rest Day toggle (collapses other fields when on)
 * - Shift Reference dropdown (shows times in format "Name (HH:mm-HH:mm)")
 * - Start/End Time pickers (auto-populated from shift reference)
 * - Break Duration input
 * - Shift Activity dropdown
 * - Is Overnight toggle
 * - Calculated duration display
 * - Validation (end time after start, break < shift duration)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Check, Trash2, Moon, Coffee, AlertCircle } from 'lucide-react';
import type { PatternDayFormData, DayOfWeek } from '../../types';
import { DayOfWeekLabels } from '../../types';
import type { ShiftReference, ShiftActivity } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface ShiftEditorProps {
  dayData: PatternDayFormData;
  weekNumber: number;
  dayOfWeek: DayOfWeek;
  shiftReferences: ShiftReference[];
  shiftActivities: ShiftActivity[];
  onSave: (data: PatternDayFormData) => void;
  onClose: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate duration in minutes
 */
function calculateDurationMinutes(
  startTime: string | undefined,
  endTime: string | undefined,
  isOvernight: boolean
): number {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (isOvernight || endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

/**
 * Format duration as "Xh XXm"
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

export function ShiftEditor({
  dayData,
  weekNumber,
  dayOfWeek,
  shiftReferences,
  shiftActivities,
  onSave,
  onClose,
}: ShiftEditorProps) {
  // Form state
  const [isRestDay, setIsRestDay] = useState(dayData.isRestDay);
  const [shiftReferenceId, setShiftReferenceId] = useState(dayData.shiftReferenceId || '');
  const [startTime, setStartTime] = useState(dayData.startTime || '09:00');
  const [endTime, setEndTime] = useState(dayData.endTime || '17:00');
  const [breakMinutes, setBreakMinutes] = useState(dayData.breakMinutes || 0);
  const [isOvernight, setIsOvernight] = useState(dayData.isOvernight);
  const [shiftActivityId, setShiftActivityId] = useState(dayData.shiftActivityId || '');

  // Auto-detect overnight when times change
  const handleStartTimeChange = useCallback(
    (newStartTime: string) => {
      setStartTime(newStartTime);
      // Auto-detect overnight
      if (newStartTime && endTime) {
        const [startH] = newStartTime.split(':').map(Number);
        const [endH] = endTime.split(':').map(Number);
        if (endH < startH && startH >= 18) {
          setIsOvernight(true);
        }
      }
    },
    [endTime]
  );

  const handleEndTimeChange = useCallback(
    (newEndTime: string) => {
      setEndTime(newEndTime);
      // Auto-detect overnight
      if (startTime && newEndTime) {
        const [startH] = startTime.split(':').map(Number);
        const [endH] = newEndTime.split(':').map(Number);
        if (endH < startH && startH >= 18) {
          setIsOvernight(true);
        }
      }
    },
    [startTime]
  );

  // Format time helper
  // Dataverse stores hours/minutes as choice values (e.g., 599250008 for 8 o'clock)
  // Extract actual value using modulo 100
  const formatTime = useCallback((hour: number, minute: number): string => {
    const actualHour = hour % 100;
    const actualMinute = minute % 100;
    const h = String(actualHour).padStart(2, '0');
    const m = String(actualMinute).padStart(2, '0');
    return `${h}:${m}`;
  }, []);

  // Handle shift reference selection - immediately populate times
  const handleShiftReferenceChange = useCallback(
    (refId: string) => {
      setShiftReferenceId(refId);

      if (!refId) return;

      const selectedRef = shiftReferences.find((ref) => ref.cp365_shiftreferenceid === refId);

      if (selectedRef) {
        const newStartTime = formatTime(
          selectedRef.cp365_shiftreferencestarthour,
          selectedRef.cp365_shiftreferencestartminute
        );
        const newEndTime = formatTime(
          selectedRef.cp365_shiftreferenceendhour,
          selectedRef.cp365_shiftreferenceendminute
        );

        setStartTime(newStartTime);
        setEndTime(newEndTime);
        setIsOvernight(selectedRef.cp365_endonnextday);
        setIsRestDay(false);
      }
    },
    [shiftReferences, formatTime]
  );

  // Format shift reference option label with times
  const formatShiftReferenceOption = useCallback(
    (ref: ShiftReference): string => {
      const start = formatTime(
        ref.cp365_shiftreferencestarthour,
        ref.cp365_shiftreferencestartminute
      );
      const end = formatTime(ref.cp365_shiftreferenceendhour, ref.cp365_shiftreferenceendminute);
      const overnight = ref.cp365_endonnextday ? ' (+1)' : '';
      return `${ref.cp365_shiftreferencename} (${start}-${end}${overnight})`;
    },
    [formatTime]
  );

  // Calculate duration
  const grossDuration = useMemo(
    () => calculateDurationMinutes(startTime, endTime, isOvernight),
    [startTime, endTime, isOvernight]
  );

  const netDuration = useMemo(
    () => Math.max(0, grossDuration - breakMinutes),
    [grossDuration, breakMinutes]
  );

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isRestDay) {
      // Must have times
      if (!startTime) errors.push('Start time is required');
      if (!endTime) errors.push('End time is required');

      // End must be after start (unless overnight)
      if (startTime && endTime && grossDuration <= 0) {
        errors.push('End time must be after start time (or enable overnight shift)');
      }

      // Break can't exceed shift
      if (breakMinutes >= grossDuration && grossDuration > 0) {
        errors.push('Break duration exceeds shift duration');
      }

      // Duration warnings
      if (netDuration > 0 && netDuration < 4 * 60) {
        warnings.push(`Short shift (${formatDuration(netDuration)})`);
      }
      if (netDuration > 14 * 60) {
        warnings.push(`Long shift (${formatDuration(netDuration)}) - exceeds 14 hours`);
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }, [isRestDay, startTime, endTime, grossDuration, breakMinutes, netDuration]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!validation.isValid) return;

    onSave({
      weekNumber,
      dayOfWeek,
      isRestDay,
      shiftReferenceId: isRestDay ? undefined : shiftReferenceId || undefined,
      startTime: isRestDay ? undefined : startTime,
      endTime: isRestDay ? undefined : endTime,
      breakMinutes: isRestDay ? undefined : breakMinutes,
      isOvernight: isRestDay ? false : isOvernight,
      shiftActivityId: isRestDay ? undefined : shiftActivityId || undefined,
    });
  }, [
    validation.isValid,
    onSave,
    weekNumber,
    dayOfWeek,
    isRestDay,
    shiftReferenceId,
    startTime,
    endTime,
    breakMinutes,
    isOvernight,
    shiftActivityId,
  ]);

  // Handle clear
  const handleClear = useCallback(() => {
    onSave({
      weekNumber,
      dayOfWeek,
      isRestDay: true,
      isOvernight: false,
    });
  }, [onSave, weekNumber, dayOfWeek]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="button" tabIndex={0} aria-label="Close modal" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{DayOfWeekLabels[dayOfWeek]}</h2>
            <p className="text-sm text-slate-500">Week {weekNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5 space-y-5">
          {/* Rest Day Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <Coffee className={`h-5 w-5 ${isRestDay ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-medium text-slate-900">Rest Day</p>
                <p className="text-sm text-slate-500">No shift scheduled</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRestDay(!isRestDay)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isRestDay ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isRestDay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Working Day Fields */}
          {!isRestDay && (
            <>
              {/* Shift Reference */}
              <div>
                <label htmlFor="editor-shift-reference" className="mb-1 block text-sm font-medium text-slate-700">
                  Shift Reference
                </label>
                <select
                  id="editor-shift-reference"
                  value={shiftReferenceId}
                  onChange={(e) => handleShiftReferenceChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select shift reference...</option>
                  {shiftReferences.map((ref) => (
                    <option key={ref.cp365_shiftreferenceid} value={ref.cp365_shiftreferenceid}>
                      {formatShiftReferenceOption(ref)}
                    </option>
                  ))}
                </select>
                {shiftReferences.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No shift references available for this location
                  </p>
                )}
              </div>

              {/* Times Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editor-start-time" className="mb-1 block text-sm font-medium text-slate-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="editor-start-time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="editor-end-time" className="mb-1 block text-sm font-medium text-slate-700">End Time</label>
                  <input
                    type="time"
                    id="editor-end-time"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Overnight Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-slate-700">Overnight Shift</span>
                  <span className="text-xs text-slate-400">(ends next day)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOvernight(!isOvernight)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    isOvernight ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isOvernight ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Break Duration */}
              <div>
                <label htmlFor="editor-break-duration" className="mb-1 block text-sm font-medium text-slate-700">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  id="editor-break-duration"
                  min={0}
                  max={120}
                  step={5}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Shift Activity */}
              <div>
                <label htmlFor="editor-shift-activity" className="mb-1 block text-sm font-medium text-slate-700">
                  Shift Activity
                </label>
                <select
                  id="editor-shift-activity"
                  value={shiftActivityId}
                  onChange={(e) => setShiftActivityId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select activity (optional)...</option>
                  {shiftActivities.map((activity) => (
                    <option
                      key={activity.cp365_shiftactivityid}
                      value={activity.cp365_shiftactivityid}
                    >
                      {activity.cp365_shiftactivityname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculated Duration */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Gross Duration</span>
                  <span className="font-medium text-slate-900">
                    {formatDuration(grossDuration)}
                  </span>
                </div>
                {breakMinutes > 0 && (
                  <>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Break</span>
                      <span className="text-slate-600">-{formatDuration(breakMinutes)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                      <span className="font-medium text-slate-700">Net Duration</span>
                      <span className="font-semibold text-emerald-600">
                        {formatDuration(netDuration)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Validation Messages */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!validation.isValid}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShiftEditor;
