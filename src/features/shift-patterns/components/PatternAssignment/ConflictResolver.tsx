/**
 * Conflict Resolver Component
 * Detects and helps resolve conflicts when generating shifts from patterns
 *
 * This component appears after an assignment is created and before shift generation,
 * allowing users to review and resolve any conflicts with existing shifts or leave.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, parseISO, startOfWeek, isWithinInterval } from 'date-fns';
import {
  Clock,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  CalendarX2,
  Layers,
  Play,
  Info,
} from 'lucide-react';
import type {
  PatternConflict,
  StaffPatternAssignment,
  ShiftPatternTemplate,
  PatternDayFormData,
  GenerationResult,
} from '../../types';
import { DayOfWeek } from '../../types';
import type { Shift, StaffAbsenceLog } from '@/api/dataverse/types';
import { AbsenceStatus } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

export type ConflictResolution = 'keep' | 'override' | 'skip';

export interface ConflictWithResolution extends PatternConflict {
  resolution: ConflictResolution;
}

interface ConflictResolverProps {
  /** The assignment to generate shifts for */
  assignment: StaffPatternAssignment;
  /** The pattern template */
  pattern: ShiftPatternTemplate;
  /** Pattern days (shift definitions) */
  patternDays: PatternDayFormData[];
  /** Start date for generation */
  startDate: Date;
  /** End date for generation */
  endDate: Date;
  /** Existing shifts for the staff member in the period */
  existingShifts?: Shift[];
  /** Existing leave records for the staff member in the period */
  existingLeave?: StaffAbsenceLog[];
  /** Callback when generation is confirmed */
  onGenerate: (
    conflicts: ConflictWithResolution[],
    shiftsToGenerate: number
  ) => Promise<GenerationResult>;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Show as modal or inline */
  variant?: 'modal' | 'inline';
  /** Loading state for external data */
  isLoadingData?: boolean;
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
 * Get the pattern day for a specific date based on rotation
 */
function getPatternDayForDate(
  date: Date,
  patternDays: PatternDayFormData[],
  rotationCycleWeeks: number,
  assignmentStartDate: Date,
  rotationStartWeek: number
): PatternDayFormData | undefined {
  // Calculate which week of the rotation we're in
  const daysSinceStart = Math.floor(
    (date.getTime() - startOfWeek(assignmentStartDate, { weekStartsOn: 1 }).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const weekNumber =
    ((Math.floor(daysSinceStart / 7) + rotationStartWeek - 1) % rotationCycleWeeks) + 1;
  const dayOfWeek = getDayOfWeek(date);

  return patternDays.find((pd) => pd.weekNumber === weekNumber && pd.dayOfWeek === dayOfWeek);
}

/**
 * Detect conflicts for a date range
 */
function detectConflicts(
  startDate: Date,
  endDate: Date,
  patternDays: PatternDayFormData[],
  rotationCycleWeeks: number,
  assignmentStartDate: Date,
  rotationStartWeek: number,
  existingShifts: Shift[],
  existingLeave: StaffAbsenceLog[]
): PatternConflict[] {
  const conflicts: PatternConflict[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const patternDay = getPatternDayForDate(
      currentDate,
      patternDays,
      rotationCycleWeeks,
      assignmentStartDate,
      rotationStartWeek
    );

    // Skip if rest day or no pattern day found
    if (!patternDay || patternDay.isRestDay) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const dateStr = format(currentDate, 'yyyy-MM-dd');

    // Check for existing shifts on this date
    const shiftOnDate = existingShifts.find((shift) => {
      const shiftDate = shift.cp365_shiftdate?.split('T')[0];
      return shiftDate === dateStr;
    });

    if (shiftOnDate) {
      const shiftRef = shiftOnDate.cp365_shiftreference?.cp365_shiftreferencename || 'Shift';
      const shiftStart = shiftOnDate.cp365_shiftstarttime
        ? format(parseISO(shiftOnDate.cp365_shiftstarttime), 'HH:mm')
        : '??:??';
      const shiftEnd = shiftOnDate.cp365_shiftendtime
        ? format(parseISO(shiftOnDate.cp365_shiftendtime), 'HH:mm')
        : '??:??';

      // Check if this is from another pattern (uses cr482_sp_ prefix in Dataverse)
      const isFromPattern = shiftOnDate.cr482_sp_isgeneratedfrompattern;

      conflicts.push({
        date: dateStr,
        type: isFromPattern ? 'other_pattern' : 'existing_shift',
        description: `${shiftRef} (${shiftStart}-${shiftEnd})${isFromPattern ? ' - Pattern generated' : ' - Manual entry'}`,
        existingShiftId: shiftOnDate.cp365_shiftid,
        patternWouldCreate: {
          startTime: patternDay.startTime || '09:00',
          endTime: patternDay.endTime || '17:00',
          shiftReferenceName: undefined, // Would need to fetch from pattern
        },
      });
    }

    // Check for leave on this date
    const leaveOnDate = existingLeave.find((leave) => {
      const leaveStart = parseISO(leave.cp365_startdate);
      const leaveEnd = parseISO(leave.cp365_enddate);
      return isWithinInterval(currentDate, { start: leaveStart, end: leaveEnd });
    });

    if (leaveOnDate && !shiftOnDate) {
      // Check if leave is approved using the proper AbsenceStatus enum
      const isApproved = leaveOnDate.cp365_absencestatus === AbsenceStatus.Approved;
      const leaveType = leaveOnDate.cp365_absencetype?.cp365_absencetypename || 'Leave';

      conflicts.push({
        date: dateStr,
        type: isApproved ? 'approved_leave' : 'pending_leave',
        description: `${leaveType}${isApproved ? ' (Approved)' : ''}`,
        existingLeaveId: leaveOnDate.cp365_staffabsencelogid,
        patternWouldCreate: {
          startTime: patternDay.startTime || '09:00',
          endTime: patternDay.endTime || '17:00',
        },
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  return conflicts;
}

/**
 * Count working days in the period
 */
function countWorkingDays(
  startDate: Date,
  endDate: Date,
  patternDays: PatternDayFormData[],
  rotationCycleWeeks: number,
  assignmentStartDate: Date,
  rotationStartWeek: number
): number {
  let count = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const patternDay = getPatternDayForDate(
      currentDate,
      patternDays,
      rotationCycleWeeks,
      assignmentStartDate,
      rotationStartWeek
    );

    if (patternDay && !patternDay.isRestDay) {
      count++;
    }

    currentDate = addDays(currentDate, 1);
  }

  return count;
}

// =============================================================================
// CONFLICT CARD COMPONENT
// =============================================================================

interface ConflictCardProps {
  conflict: ConflictWithResolution;
  onResolutionChange: (resolution: ConflictResolution) => void;
}

function ConflictCard({ conflict, onResolutionChange }: ConflictCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = {
    existing_shift: {
      icon: Clock,
      label: 'Existing Shift',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    approved_leave: {
      icon: CalendarX2,
      label: 'Approved Leave',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    pending_leave: {
      icon: CalendarX2,
      label: 'Pending Leave',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    other_pattern: {
      icon: Layers,
      label: 'Pattern Shift',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  };

  const config = typeConfig[conflict.type];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-black/5"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>

          <div className={`p-1.5 rounded ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">
                {format(parseISO(conflict.date), 'EEE d MMM yyyy')}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{conflict.description}</p>
          </div>
        </div>

        <select
          value={conflict.resolution}
          onChange={(e) => onResolutionChange(e.target.value as ConflictResolution)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            conflict.resolution === 'keep'
              ? 'bg-slate-100 border-slate-300 text-slate-700'
              : conflict.resolution === 'skip'
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-red-100 border-red-300 text-red-700'
          }`}
        >
          <option value="keep">Keep Existing</option>
          <option value="skip">Skip Date</option>
          {conflict.type !== 'approved_leave' && conflict.type !== 'pending_leave' && (
            <option value="override">Override</option>
          )}
        </select>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-dashed border-slate-200 mt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Current
              </p>
              <p className="text-slate-700">{conflict.description}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Pattern Would Create
              </p>
              <p className="text-slate-700">
                {conflict.patternWouldCreate.shiftReferenceName || 'Shift'} (
                {conflict.patternWouldCreate.startTime}-{conflict.patternWouldCreate.endTime})
              </p>
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

export function ConflictResolver({
  assignment,
  pattern,
  patternDays,
  startDate,
  endDate,
  existingShifts = [],
  existingLeave = [],
  onGenerate,
  onCancel,
  variant = 'modal',
  isLoadingData = false,
}: ConflictResolverProps) {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [conflicts, setConflicts] = useState<ConflictWithResolution[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<PatternConflict['type']>>(
    new Set(['existing_shift', 'approved_leave', 'pending_leave', 'other_pattern'])
  );

  // ==========================================================================
  // DETECT CONFLICTS
  // ==========================================================================

  useEffect(() => {
    if (isLoadingData) return;

    const detected = detectConflicts(
      startDate,
      endDate,
      patternDays,
      pattern.cp365_sp_rotationcycleweeks,
      parseISO(assignment.cp365_sp_startdate),
      assignment.cp365_sp_rotationstartweek,
      existingShifts,
      existingLeave
    );

    // Default resolutions based on type
    const withResolutions: ConflictWithResolution[] = detected.map((conflict) => ({
      ...conflict,
      resolution:
        conflict.type === 'approved_leave' || conflict.type === 'pending_leave' ? 'skip' : 'keep',
    }));

    setConflicts(withResolutions);
  }, [
    startDate,
    endDate,
    patternDays,
    pattern,
    assignment,
    existingShifts,
    existingLeave,
    isLoadingData,
  ]);

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================

  const totalWorkingDays = useMemo(() => {
    return countWorkingDays(
      startDate,
      endDate,
      patternDays,
      pattern.cp365_sp_rotationcycleweeks,
      parseISO(assignment.cp365_sp_startdate),
      assignment.cp365_sp_rotationstartweek
    );
  }, [startDate, endDate, patternDays, pattern, assignment]);

  const conflictsByType = useMemo(() => {
    const grouped: Record<PatternConflict['type'], ConflictWithResolution[]> = {
      existing_shift: [],
      approved_leave: [],
      pending_leave: [],
      other_pattern: [],
    };

    conflicts.forEach((conflict) => {
      grouped[conflict.type].push(conflict);
    });

    return grouped;
  }, [conflicts]);

  const summary = useMemo(() => {
    const skipped = conflicts.filter(
      (c) => c.resolution === 'skip' || c.resolution === 'keep'
    ).length;
    const overrides = conflicts.filter((c) => c.resolution === 'override').length;
    const shiftsToGenerate = totalWorkingDays - skipped;

    return {
      totalWorkingDays,
      conflicts: conflicts.length,
      skipped,
      overrides,
      shiftsToGenerate,
    };
  }, [conflicts, totalWorkingDays]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleResolutionChange = useCallback((index: number, resolution: ConflictResolution) => {
    setConflicts((prev) => {
      const updated = [...prev];
      updated[index].resolution = resolution;
      return updated;
    });
  }, []);

  const handleBulkResolution = useCallback(
    (type: PatternConflict['type'], resolution: ConflictResolution) => {
      setConflicts((prev) =>
        prev.map((conflict) => (conflict.type === type ? { ...conflict, resolution } : conflict))
      );
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await onGenerate(conflicts, summary.shiftsToGenerate);
      setGenerationResult(result);
      setGenerationComplete(true);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate shifts. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [conflicts, summary.shiftsToGenerate, onGenerate]);

  const toggleTypeExpansion = useCallback((type: PatternConflict['type']) => {
    setExpandedTypes((prev) => {
      const updated = new Set(prev);
      if (updated.has(type)) {
        updated.delete(type);
      } else {
        updated.add(type);
      }
      return updated;
    });
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const containerClasses =
    variant === 'modal' ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50' : '';

  const panelClasses =
    variant === 'modal'
      ? 'mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col'
      : 'rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col';

  // Generation complete view
  if (generationComplete && generationResult) {
    return (
      <div className={containerClasses}>
        <div className={`${panelClasses} max-w-lg`}>
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Shifts Generated</h2>
            <p className="mt-2 text-slate-600">
              Successfully created {generationResult.shiftsCreated.length} shifts.
            </p>

            {generationResult.shiftsSkipped.length > 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-left">
                <p className="text-sm font-medium text-amber-800">
                  {generationResult.shiftsSkipped.length} dates skipped
                </p>
                <ul className="mt-1 text-xs text-amber-700">
                  {generationResult.shiftsSkipped.slice(0, 5).map((skip, i) => (
                    <li key={i}>
                      • {skip.date}: {skip.reason}
                    </li>
                  ))}
                  {generationResult.shiftsSkipped.length > 5 && (
                    <li>• ...and {generationResult.shiftsSkipped.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {generationResult.errors.length > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-left">
                <p className="text-sm font-medium text-red-800">
                  {generationResult.errors.length} errors occurred
                </p>
                <ul className="mt-1 text-xs text-red-700">
                  {generationResult.errors.slice(0, 3).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3 border-t border-slate-200 px-6 py-4">
            <button
              onClick={onCancel}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={panelClasses}>
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Review & Generate Shifts</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {format(startDate, 'd MMM yyyy')} - {format(endDate, 'd MMM yyyy')}
              </p>
            </div>
            {variant === 'modal' && (
              <button
                onClick={onCancel}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingData && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm text-slate-600">Checking for conflicts...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoadingData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-emerald-600">{summary.shiftsToGenerate}</p>
                <p className="text-xs text-slate-500">Shifts to Create</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-amber-600">{summary.conflicts}</p>
                <p className="text-xs text-slate-500">Conflicts Found</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-slate-600">{summary.skipped}</p>
                <p className="text-xs text-slate-500">Dates Skipped</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-red-600">{summary.overrides}</p>
                <p className="text-xs text-slate-500">Overrides</p>
              </div>
            </div>

            {/* No Conflicts */}
            {conflicts.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No Conflicts Found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  All {summary.totalWorkingDays} shifts can be created without conflicts.
                </p>
              </div>
            )}

            {/* Conflicts List */}
            {conflicts.length > 0 && (
              <div className="flex-1 overflow-auto px-6 py-4">
                {/* Conflict Type Sections */}
                {Object.entries(conflictsByType).map(([type, typeConflicts]) => {
                  if (typeConflicts.length === 0) return null;

                  const typedType = type as PatternConflict['type'];
                  const isExpanded = expandedTypes.has(typedType);

                  const typeLabels: Record<PatternConflict['type'], string> = {
                    existing_shift: 'Existing Shifts',
                    approved_leave: 'Approved Leave',
                    pending_leave: 'Pending Leave',
                    other_pattern: 'Pattern Shifts',
                  };

                  return (
                    <div key={type} className="mb-4">
                      <button
                        onClick={() => toggleTypeExpansion(typedType)}
                        className="mb-2 flex w-full items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-left"
                      >
                        <span className="font-medium text-slate-700">
                          {typeLabels[typedType]} ({typeConflicts.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleBulkResolution(typedType, e.target.value as ConflictResolution)
                            }
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="">Apply to all...</option>
                            <option value="keep">Keep Existing</option>
                            <option value="skip">Skip All</option>
                            {typedType !== 'approved_leave' && typedType !== 'pending_leave' && (
                              <option value="override">Override All</option>
                            )}
                          </select>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-2">
                          {typeConflicts.map((conflict) => {
                            const globalIndex = conflicts.findIndex(
                              (c) => c.date === conflict.date && c.type === conflict.type
                            );
                            return (
                              <ConflictCard
                                key={`${conflict.date}-${conflict.type}`}
                                conflict={conflict}
                                onResolutionChange={(resolution) =>
                                  handleResolutionChange(globalIndex, resolution)
                                }
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Info Note */}
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div className="text-xs text-slate-600">
                    <p className="font-medium">Resolution Options:</p>
                    <ul className="mt-1 space-y-0.5">
                      <li>
                        <strong>Keep Existing:</strong> Don't create a pattern shift for this date
                      </li>
                      <li>
                        <strong>Skip:</strong> Same as keep (no shift created for this date)
                      </li>
                      <li>
                        <strong>Override:</strong> Delete existing and create pattern shift
                      </li>
                    </ul>
                    <p className="mt-2">Leave cannot be overridden - only skipped.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isGenerating}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || isLoadingData || summary.shiftsToGenerate === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate {summary.shiftsToGenerate} Shifts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
