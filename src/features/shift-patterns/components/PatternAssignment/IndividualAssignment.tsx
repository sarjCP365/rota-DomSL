/**
 * Individual Assignment Component
 * Assigns a pattern template to a single staff member
 *
 * Can be triggered from:
 * - Staff profile page
 * - "Assign" button on pattern card
 * - Assignment wizard
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, addDays, addWeeks, startOfWeek, isSameDay } from 'date-fns';
import { CalendarClock, AlertTriangle, Clock, Check, X, Loader2, Play, Search } from 'lucide-react';
import { usePatternTemplates, usePatternTemplate } from '../../hooks/usePatternTemplates';
import {
  useStaffPatternAssignments,
  useCreatePatternAssignment,
} from '../../hooks/usePatternAssignments';
import { useStaffMember, useStaffMembers } from '@/hooks/useStaff';
import { useLocationSettings } from '@/store/settingsStore';
import { useSublocations, useActiveRota, useLocations } from '@/hooks/useLocations';
import { MapPin } from 'lucide-react';
import { generateShiftsFromPattern } from '../../api/patternGeneration';
import type { AssignmentFormData, PatternDayFormData } from '../../types';
import { DayOfWeek, DayOfWeekShortLabels, PatternPublishStatus, PatternStatus } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface IndividualAssignmentProps {
  /** Pre-selected staff member ID (optional) */
  staffMemberId?: string;
  /** Pre-selected pattern template ID (optional) */
  patternTemplateId?: string;
  /** Callback when assignment is successfully created */
  onSuccess?: (assignmentId: string) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Show as modal or inline */
  variant?: 'modal' | 'inline';
}

interface _StaffSearchResult {
  cp365_staffmemberid: string;
  cp365_staffmembername: string;
  cp365_forename: string;
  cp365_surname: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate preview of what shifts would be created
 */
function generatePatternPreview(
  patternDays: PatternDayFormData[],
  rotationCycleWeeks: number,
  startDate: Date,
  rotationStartWeek: number,
  weeksToShow: number = 4
): Array<{
  date: Date;
  isWorkingDay: boolean;
  startTime?: string;
  endTime?: string;
  dayOfWeek: DayOfWeek;
}> {
  const preview: Array<{
    date: Date;
    isWorkingDay: boolean;
    startTime?: string;
    endTime?: string;
    dayOfWeek: DayOfWeek;
  }> = [];

  // Start from the Monday of the start week
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });

  for (let day = 0; day < weeksToShow * 7; day++) {
    const currentDate = addDays(weekStart, day);
    const currentDayOfWeek = ((currentDate.getDay() + 6) % 7) + 1; // Convert to Mon=1, Sun=7

    // Calculate which week of the rotation we're in
    const daysSinceStart = Math.floor(
      (currentDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekNumber =
      ((Math.floor(daysSinceStart / 7) + rotationStartWeek - 1) % rotationCycleWeeks) + 1;

    // Find matching pattern day
    const patternDay = patternDays.find(
      (pd) => pd.weekNumber === weekNumber && pd.dayOfWeek === currentDayOfWeek
    );

    preview.push({
      date: currentDate,
      isWorkingDay: patternDay ? !patternDay.isRestDay : false,
      startTime: patternDay?.startTime,
      endTime: patternDay?.endTime,
      dayOfWeek: currentDayOfWeek as DayOfWeek,
    });
  }

  return preview;
}

// =============================================================================
// MINI CALENDAR COMPONENT
// =============================================================================

interface MiniCalendarProps {
  preview: ReturnType<typeof generatePatternPreview>;
  startDate: Date;
}

function MiniCalendar({ preview, startDate }: MiniCalendarProps) {
  const weeks: Array<typeof preview> = [];
  for (let i = 0; i < preview.length; i += 7) {
    weeks.push(preview.slice(i, i + 7));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-medium text-slate-700">4-Week Preview</h4>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {Object.entries(DayOfWeekShortLabels).map(([value, label]) => (
          <div key={value} className="text-center text-xs font-medium text-slate-500">
            {label}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              const isBeforeStart = day.date < startDate;
              const isStartDate = isSameDay(day.date, startDate);

              return (
                <div
                  key={dayIndex}
                  className={`relative flex h-10 flex-col items-center justify-center rounded text-xs ${
                    isBeforeStart
                      ? 'bg-slate-50 text-slate-300'
                      : day.isWorkingDay
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-50 text-slate-400'
                  } ${isStartDate ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
                  title={
                    day.isWorkingDay && day.startTime && day.endTime
                      ? `${format(day.date, 'EEE d MMM')}: ${day.startTime}-${day.endTime}`
                      : `${format(day.date, 'EEE d MMM')}: Rest day`
                  }
                >
                  <span className="font-medium">{format(day.date, 'd')}</span>
                  {day.isWorkingDay && day.startTime && (
                    <span className="text-[9px] leading-tight">{day.startTime}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-100" />
          <span>Working</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-slate-50 border border-slate-200" />
          <span>Rest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-white ring-2 ring-emerald-500" />
          <span>Start</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IndividualAssignment({
  staffMemberId: initialStaffId,
  patternTemplateId: initialPatternId,
  onSuccess,
  onCancel,
  variant = 'modal',
}: IndividualAssignmentProps) {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [selectedStaffId, setSelectedStaffId] = useState(initialStaffId || '');
  const [selectedPatternId, setSelectedPatternId] = useState(initialPatternId || '');
  const [startDate, setStartDate] = useState(() => {
    // Default to next Monday
    const today = new Date();
    const nextMonday = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    return format(nextMonday, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState('');
  const [rotationStartWeek, setRotationStartWeek] = useState(1);
  const [priority, setPriority] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [appliesToDays, setAppliesToDays] = useState<string[]>([]);
  const [overridePublishStatus, setOverridePublishStatus] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PatternPublishStatus>(
    PatternPublishStatus.Unpublished
  );
  const [showGeneratePrompt, setShowGeneratePrompt] = useState(false);
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    shiftsCreated: number;
    errors: string[];
  } | null>(null);

  // Staff search state
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  // Location settings for staff filtering
  const { selectedSublocationId, selectedLocationId } = useLocationSettings();

  // Fetch all locations for display
  const { data: allLocations = [] } = useLocations();

  // Fetch the selected pattern with its actual days (must be before useMemos that depend on it)
  const { data: selectedPatternWithDays, isLoading: isLoadingPatternDetails } = usePatternTemplate(
    selectedPatternId || undefined
  );

  // Local sublocation state - defaults to the global selection
  const [localSublocationId, setLocalSublocationId] = useState(selectedSublocationId || '');

  // Get the pattern's location - this determines which location/sublocations to use
  // If pattern is pre-selected, use its location; otherwise use the global location
  // Note: Uses _cr482_location_value (different publisher prefix)
  const effectiveLocationId = useMemo(() => {
    // First priority: pattern's assigned location
    if (selectedPatternWithDays?._cr482_location_value) {
      return selectedPatternWithDays._cr482_location_value;
    }
    // Fallback: global selected location
    if (selectedLocationId) {
      return selectedLocationId;
    }
    return null;
  }, [selectedPatternWithDays, selectedLocationId]);

  // Track previous pattern ID to detect when pattern changes
  const prevPatternIdRef = useRef<string | undefined>(undefined);

  // Track local sublocation ID via ref to avoid dependency loop
  const localSublocationIdRef = useRef(localSublocationId);
  localSublocationIdRef.current = localSublocationId;

  // Update local sublocation when pattern CHANGES (not on every render)
  useEffect(() => {
    const currentPatternId = selectedPatternWithDays?.cp365_shiftpatterntemplatenewid;

    // Only reset sublocation if pattern actually changed (not just on re-renders)
    if (currentPatternId && currentPatternId !== prevPatternIdRef.current) {
      prevPatternIdRef.current = currentPatternId;
      // Pattern changed - reset sublocation selection to pick from the pattern's location
      setLocalSublocationId('');
    } else if (!currentPatternId && selectedSublocationId && !localSublocationIdRef.current) {
      // No pattern selected yet, use global sublocation as default
      setLocalSublocationId(selectedSublocationId);
    }
  }, [selectedPatternWithDays?.cp365_shiftpatterntemplatenewid, selectedSublocationId]);

  // Fetch sublocations for the pattern's location (or selected location)
  const { data: sublocations = [], isLoading: isLoadingSublocations } =
    useSublocations(effectiveLocationId);

  // Get the location name for display
  // Note: Uses _cr482_location_value (different publisher prefix)
  const patternLocationName = useMemo(() => {
    if (!selectedPatternWithDays?._cr482_location_value) return null;
    const loc = allLocations.find(
      (l) => l.cp365_locationid === selectedPatternWithDays._cr482_location_value
    );
    return loc?.cp365_locationname || 'Unknown Location';
  }, [selectedPatternWithDays, allLocations]);

  // Fetch the active rota for the selected sublocation
  const { data: activeRota, isLoading: isLoadingRota } = useActiveRota(
    localSublocationId || undefined
  );

  // Click-outside handler for staff dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setIsStaffDropdownOpen(false);
      }
    };

    if (isStaffDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isStaffDropdownOpen]);

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Fetch patterns filtered by location (only show patterns for the selected location)
  const { data: patterns = [], isLoading: isLoadingPatterns } = usePatternTemplates({
    status: PatternStatus.Active,
    locationId: selectedLocationId || undefined, // Filter by currently selected location
  });

  // Fetch staff members for the selected location
  const { data: allStaff = [], isLoading: isLoadingStaff } = useStaffMembers(
    localSublocationId || undefined
  );

  const { data: staffMember } = useStaffMember(selectedStaffId || undefined);

  const { data: existingAssignments = [] } = useStaffPatternAssignments(
    selectedStaffId || undefined
  );

  const createAssignment = useCreatePatternAssignment();

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================

  const selectedPattern = useMemo(() => {
    // Prefer the detailed pattern if loaded, otherwise fall back to list item
    if (selectedPatternWithDays) return selectedPatternWithDays;
    return patterns.find((p) => p.cp365_shiftpatterntemplatenewid === selectedPatternId);
  }, [patterns, selectedPatternId, selectedPatternWithDays]);

  // Filter staff based on search term
  const filteredStaff = useMemo(() => {
    if (!staffSearchTerm) return allStaff;
    const search = staffSearchTerm.toLowerCase();
    return allStaff.filter(
      (s) =>
        s.cp365_staffmembername?.toLowerCase().includes(search) ||
        s.cp365_jobtitle?.toLowerCase().includes(search)
    );
  }, [allStaff, staffSearchTerm]);

  // Get pattern days from the actual loaded pattern template
  const patternDays = useMemo<PatternDayFormData[]>(() => {
    // Use actual pattern days from the loaded template
    const loadedDays = selectedPatternWithDays?.cp365_shiftpatterntemplate_days;

    if (loadedDays && loadedDays.length > 0) {
      // Extract time from Dataverse datetime format
      const extractTime = (dateTimeStr?: string): string | undefined => {
        if (!dateTimeStr) return undefined;
        try {
          const date = new Date(dateTimeStr);
          return format(date, 'HH:mm');
        } catch {
          return undefined;
        }
      };

      return loadedDays.map((day) => ({
        weekNumber: day.cp365_sp_weeknumber,
        dayOfWeek: day.cp365_sp_dayofweek,
        isRestDay: day.cp365_sp_isrestday,
        shiftReferenceId: day._cp365_shiftreference_value,
        startTime: extractTime(day.cp365_sp_starttime),
        endTime: extractTime(day.cp365_sp_endtime),
        breakMinutes: day.cp365_sp_breakminutes,
        isOvernight: day.cp365_sp_isovernight,
        shiftActivityId: day._cp365_shiftactivity_value,
      }));
    }

    // Fallback: if no days loaded yet but pattern is selected, create placeholders
    // This ensures the preview shows something while loading
    if (selectedPattern && !selectedPatternWithDays) {
      const days: PatternDayFormData[] = [];
      for (let week = 1; week <= selectedPattern.cp365_sp_rotationcycleweeks; week++) {
        for (let day = 1; day <= 7; day++) {
          days.push({
            weekNumber: week,
            dayOfWeek: day as DayOfWeek,
            isRestDay: true, // Show as rest until actual data loads
            isOvernight: false,
          });
        }
      }
      return days;
    }

    return [];
  }, [selectedPattern, selectedPatternWithDays]);

  const preview = useMemo(() => {
    if (!selectedPattern || patternDays.length === 0) return [];
    return generatePatternPreview(
      patternDays,
      selectedPattern.cp365_sp_rotationcycleweeks,
      new Date(startDate),
      rotationStartWeek
    );
  }, [selectedPattern, patternDays, startDate, rotationStartWeek]);

  // Contract validation
  const contractMismatch = useMemo(() => {
    if (!staffMember || !selectedPattern) return null;

    // Get contracted hours - this field may vary
    const contractedHours =
      staffMember.cp365_requiredhours ?? staffMember.cp365_contractedhours ?? 37.5; // Default
    const patternHours = selectedPattern.cp365_sp_averageweeklyhours || 0;

    if (Math.abs(contractedHours - patternHours) > 0.5) {
      return {
        contractedHours,
        patternHours,
        difference: patternHours - contractedHours,
      };
    }
    return null;
  }, [staffMember, selectedPattern]);

  // Check for overlapping assignments
  const overlappingAssignments = useMemo(() => {
    if (!startDate) return [];

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    return existingAssignments.filter((assignment) => {
      const assignmentStart = new Date(assignment.cp365_sp_startdate);
      const assignmentEnd = assignment.cp365_sp_enddate
        ? new Date(assignment.cp365_sp_enddate)
        : null;

      // Check for overlap
      if (end === null && assignmentEnd === null) {
        // Both are ongoing - they will overlap
        return true;
      }

      if (end === null) {
        // New assignment is ongoing - overlaps if existing starts before new
        return !assignmentEnd || assignmentEnd >= start;
      }

      if (assignmentEnd === null) {
        // Existing is ongoing - overlaps if new ends after existing starts
        return end >= assignmentStart;
      }

      // Both have end dates - standard overlap check
      return start <= assignmentEnd && end >= assignmentStart;
    });
  }, [existingAssignments, startDate, endDate]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = async () => {
    if (!selectedStaffId || !selectedPatternId || !startDate) {
      return;
    }

    const data: AssignmentFormData = {
      staffMemberId: selectedStaffId,
      patternTemplateId: selectedPatternId,
      startDate,
      endDate: endDate || undefined,
      rotationStartWeek,
      priority,
      appliesToDays: appliesToDays.length > 0 ? appliesToDays : undefined,
      overridePublishStatus,
      publishStatus: overridePublishStatus ? publishStatus : undefined,
    };

    try {
      const result = await createAssignment.mutateAsync(data);
      setCreatedAssignmentId(result.cp365_staffpatternassignmentid);
      setShowGeneratePrompt(true);
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const handleGenerateNow = async () => {
    if (!createdAssignmentId || !startDate) {
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      // Validate rota is available
      if (!activeRota?.cp365_rotaid) {
        throw new Error(
          'No active rota found for the selected location. Please ensure the location has an active rota.'
        );
      }

      // Calculate generation period - default to 4 weeks from start date
      const genStartDate = new Date(startDate);
      const genEndDate = addWeeks(genStartDate, 4);

      const result = await generateShiftsFromPattern({
        assignmentId: createdAssignmentId,
        startDate: genStartDate,
        endDate: genEndDate,
        rotaId: activeRota.cp365_rotaid,
        sublocationId: localSublocationId,
      });

      setGenerationResult({
        shiftsCreated: result.shiftsCreated.length,
        errors: result.errors,
      });

      // If successful, close after a short delay to show the result
      if (result.errors.length === 0) {
        setTimeout(() => {
          onSuccess?.(createdAssignmentId);
        }, 1500);
      }
    } catch (error) {
      console.error('[IndividualAssignment] Generation failed:', error);
      setGenerationResult({
        shiftsCreated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLater = () => {
    onSuccess?.(createdAssignmentId!);
  };

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const hasValidRota = !!activeRota?.cp365_rotaid;

  const canSubmit =
    localSublocationId &&
    hasValidRota &&
    selectedStaffId &&
    selectedPatternId &&
    startDate &&
    !createAssignment.isPending;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const containerClasses =
    variant === 'modal' ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50' : '';

  const panelClasses =
    variant === 'modal'
      ? 'mx-4 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-2xl'
      : 'rounded-xl border border-slate-200 bg-white shadow-sm';

  // Show generate prompt after successful creation
  if (showGeneratePrompt) {
    // Show generation result
    if (generationResult) {
      const hasErrors = generationResult.errors.length > 0;

      return (
        <div className={containerClasses}>
          <div className={`${panelClasses} p-6`}>
            <div className="text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  hasErrors ? 'bg-amber-100' : 'bg-emerald-100'
                }`}
              >
                {hasErrors ? (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                ) : (
                  <Check className="h-8 w-8 text-emerald-600" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {hasErrors ? 'Generation Completed with Warnings' : 'Shifts Generated!'}
              </h2>
              <p className="mt-2 text-slate-600">
                {generationResult.shiftsCreated} shifts have been created for{' '}
                {staffMember?.cp365_forename} {staffMember?.cp365_surname}.
              </p>
              {hasErrors && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-left">
                  <p className="text-sm font-medium text-amber-800">Warnings:</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                    {generationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => onSuccess?.(createdAssignmentId!)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show generating state
    if (isGenerating) {
      return (
        <div className={containerClasses}>
          <div className={`${panelClasses} p-6`}>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Generating Shifts...</h2>
              <p className="mt-2 text-slate-600">
                Creating shifts for {staffMember?.cp365_forename} {staffMember?.cp365_surname}.
              </p>
              <p className="mt-1 text-sm text-slate-500">This may take a few moments.</p>
            </div>
          </div>
        </div>
      );
    }

    // Show initial prompt
    return (
      <div className={containerClasses}>
        <div className={`${panelClasses} p-6`}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Pattern Assigned</h2>
            <p className="mt-2 text-slate-600">
              The pattern has been assigned to {staffMember?.cp365_forename}{' '}
              {staffMember?.cp365_surname}.
            </p>
            <p className="mt-1 text-sm text-slate-500">Would you like to generate shifts now?</p>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={handleGenerateLater}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Generate Later
            </button>
            <button
              onClick={handleGenerateNow}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Play className="h-4 w-4" />
              Generate Now
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
              <h2 className="text-lg font-semibold text-slate-900">Assign Pattern</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Assign a shift pattern template to a staff member
              </p>
            </div>
            {variant === 'modal' && onCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Location Selection */}
          <div>
            <label htmlFor="assign-sublocation" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sublocation <span className="text-red-500">*</span>
            </label>
            {patternLocationName && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <MapPin className="h-4 w-4" />
                <span>
                  Showing sublocations for: <strong>{patternLocationName}</strong>
                </span>
              </div>
            )}
            {isLoadingPatternDetails ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading pattern details...
              </div>
            ) : (
              <select
                id="assign-sublocation"
                value={localSublocationId}
                onChange={(e) => {
                  setLocalSublocationId(e.target.value);
                  // Clear staff selection when sublocation changes
                  setSelectedStaffId('');
                  setStaffSearchTerm('');
                }}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                disabled={isLoadingSublocations || !effectiveLocationId}
              >
                <option value="">
                  {!effectiveLocationId
                    ? 'No location set for this pattern'
                    : 'Select a sublocation...'}
                </option>
                {sublocations.map((sub) => (
                  <option key={sub.cp365_sublocationid} value={sub.cp365_sublocationid}>
                    {sub.cp365_sublocationname}
                  </option>
                ))}
              </select>
            )}
            {!effectiveLocationId && !isLoadingPatternDetails && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                This pattern is not assigned to a location. Please edit the pattern and assign it to
                a location first.
              </p>
            )}
            {localSublocationId && !hasValidRota && !isLoadingRota && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                This sublocation does not have an active rota. Please create one first.
              </p>
            )}
            {localSublocationId && hasValidRota && (
              <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Active rota: {activeRota?.cp365_rotaname}
              </p>
            )}
          </div>

          {/* Staff Selection */}
          <div>
            <label htmlFor="assign-staff-member" className="mb-1.5 block text-sm font-medium text-slate-700">
              Staff Member <span className="text-red-500">*</span>
            </label>
            {initialStaffId && staffMember ? (
              // Read-only display when staff is pre-selected
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  {staffMember.cp365_forename?.[0]}
                  {staffMember.cp365_surname?.[0]}
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {staffMember.cp365_forename} {staffMember.cp365_surname}
                  </p>
                  <p className="text-sm text-slate-500">
                    {staffMember.cp365_jobtitle || 'Staff Member'}
                  </p>
                </div>
              </div>
            ) : selectedStaffId && staffMember ? (
              // Show selected staff with option to change
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  {staffMember.cp365_forename?.[0]}
                  {staffMember.cp365_surname?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {staffMember.cp365_forename} {staffMember.cp365_surname}
                  </p>
                  <p className="text-sm text-slate-500">
                    {staffMember.cp365_jobtitle || 'Staff Member'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffId('');
                    setStaffSearchTerm('');
                    setIsStaffDropdownOpen(true);
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              // Searchable staff dropdown
              <div className="relative" ref={staffDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    id="assign-staff-member"
                    value={staffSearchTerm}
                    onChange={(e) => {
                      setStaffSearchTerm(e.target.value);
                      setIsStaffDropdownOpen(true);
                    }}
                    onFocus={() => setIsStaffDropdownOpen(true)}
                    placeholder="Search for a staff member..."
                    className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {isLoadingStaff && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Staff Dropdown */}
                {isStaffDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto">
                    {filteredStaff.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">
                        {isLoadingStaff ? 'Loading staff...' : 'No staff found'}
                      </div>
                    ) : (
                      filteredStaff.map((staff) => (
                        <button
                          key={staff.cp365_staffmemberid}
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(staff.cp365_staffmemberid);
                            setStaffSearchTerm('');
                            setIsStaffDropdownOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                            {staff.cp365_staffmembername
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {staff.cp365_staffmembername}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {staff.cp365_jobtitle || 'Staff Member'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pattern Selection */}
          <div>
            <label htmlFor="assign-pattern-template" className="mb-1.5 block text-sm font-medium text-slate-700">
              Pattern Template <span className="text-red-500">*</span>
            </label>

            {/* Show info if no location is selected */}
            {!selectedLocationId && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <MapPin className="h-4 w-4" />
                <span>Select a location in the header to see patterns for that location</span>
              </div>
            )}

            <select
              id="assign-pattern-template"
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={isLoadingPatterns || !selectedLocationId}
            >
              <option value="">
                {!selectedLocationId ? 'Select a location first...' : 'Select a pattern...'}
              </option>
              {patterns.map((pattern) => (
                <option
                  key={pattern.cp365_shiftpatterntemplatenewid}
                  value={pattern.cp365_shiftpatterntemplatenewid}
                >
                  {pattern.cp365_name} ({pattern.cp365_sp_averageweeklyhours?.toFixed(1) || '0'}
                  h/week)
                </option>
              ))}
            </select>

            {selectedLocationId && patterns.length === 0 && !isLoadingPatterns && (
              <p className="mt-2 text-sm text-slate-500">
                No patterns found for this location. Create a pattern first.
              </p>
            )}

            {selectedPattern && (
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-slate-400" />
                  <span>{selectedPattern.cp365_sp_rotationcycleweeks}-week rotation</span>
                  <span className="text-slate-300">•</span>
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    {selectedPattern.cp365_sp_averageweeklyhours?.toFixed(1) || '0'} hours/week
                  </span>
                </div>
                {patternLocationName && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                    <MapPin className="h-3 w-3" />
                    <span>{patternLocationName}</span>
                  </div>
                )}
                {selectedPattern.cp365_sp_description && (
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedPattern.cp365_sp_description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Contract Mismatch Warning */}
          {contractMismatch && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Hours Mismatch</p>
                <p className="text-amber-700">
                  Pattern hours ({contractMismatch.patternHours}h/week) differ from contracted hours
                  ({contractMismatch.contractedHours}h/week) by{' '}
                  {Math.abs(contractMismatch.difference).toFixed(1)} hours.
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="assign-start-date" className="mb-1.5 block text-sm font-medium text-slate-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="assign-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500">Recommended: Start on a Monday</p>
            </div>
            <div>
              <label htmlFor="assign-end-date" className="mb-1.5 block text-sm font-medium text-slate-700">
                End Date <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="date"
                id="assign-end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500">Leave empty for ongoing assignment</p>
            </div>
          </div>

          {/* Rotation Start Week */}
          {selectedPattern && selectedPattern.cp365_sp_rotationcycleweeks > 1 && (
            <div>
              <label htmlFor="assign-rotation-week" className="mb-1.5 block text-sm font-medium text-slate-700">
                Rotation Start Week
              </label>
              <select
                id="assign-rotation-week"
                value={rotationStartWeek}
                onChange={(e) => setRotationStartWeek(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Array.from({ length: selectedPattern.cp365_sp_rotationcycleweeks }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Week {i + 1}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Use different start weeks to stagger staff on the same pattern
              </p>
            </div>
          )}

          {/* Priority */}
          <div>
            <label htmlFor="assign-priority" className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
            <input
              type="number"
              id="assign-priority"
              value={priority}
              onChange={(e) => setPriority(Math.max(1, Math.min(99, Number(e.target.value))))}
              min={1}
              max={99}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Lower number = higher priority (1 is highest). Used when staff have multiple patterns.
            </p>
          </div>

          {/* Publish Status Override */}
          <div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overridePublish"
                checked={overridePublishStatus}
                onChange={(e) => setOverridePublishStatus(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="overridePublish" className="text-sm font-medium text-slate-700">
                Override default publish status
              </label>
            </div>

            {overridePublishStatus && (
              <div className="mt-2 ml-6">
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(Number(e.target.value) as PatternPublishStatus)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={PatternPublishStatus.Published}>Published</option>
                  <option value={PatternPublishStatus.Unpublished}>Unpublished</option>
                </select>
              </div>
            )}
          </div>

          {/* Existing Assignments Warning */}
          {overlappingAssignments.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Overlapping Assignments</p>
                <p className="text-amber-700">
                  This staff member has {overlappingAssignments.length} existing assignment(s) that
                  overlap with this date range:
                </p>
                <ul className="mt-1 space-y-1">
                  {overlappingAssignments.map((assignment) => (
                    <li key={assignment.cp365_staffpatternassignmentid} className="text-amber-700">
                      • {assignment.cp365_shiftpatterntemplate?.cp365_name || 'Pattern'}
                      (Priority {assignment.cp365_sp_priority})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedPatternId && isLoadingPatternDetails && (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <p className="text-sm text-slate-500">Loading pattern days...</p>
              </div>
            </div>
          )}
          {selectedPattern && preview.length > 0 && !isLoadingPatternDetails && (
            <MiniCalendar preview={preview} startDate={new Date(startDate)} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={createAssignment.isPending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createAssignment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Assign Pattern
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
