/**
 * DailyShiftFlyout Component
 * Edit shift flyout optimised for Daily View day-of operations
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 8
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  X,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  UserCheck,
  XCircle,
  ChevronDown,
  Clock,
} from 'lucide-react';
import {
  useShift,
  useShiftReferences,
  useShiftActivities,
  useUpdateShift,
  useDeleteShift,
} from '@/hooks/useShifts';
import { LoadingSpinner } from '@/components/common/Loading';
import { StatusDot } from './AttendanceStatusBadge';
import {
  type AttendanceStatus,
  type ShiftWithAttendance,
  getAttendanceStatus,
  getStatusConfig,
} from '@/utils/attendanceStatus';
import type { ShiftReference, ShiftViewData } from '@/api/dataverse/types';
import { isShiftEditable, isShiftViewDataEditable } from '@/utils/shiftUtils';

// =============================================================================
// Types & Schema
// =============================================================================

const dailyShiftSchema = z.object({
  shiftReferenceId: z.string().optional(),
  shiftActivityId: z.string().optional(),
  startHour: z.string(),
  startMinute: z.string(),
  endHour: z.string(),
  endMinute: z.string(),
  breakDuration: z.number().min(0).max(480),
  isOvertime: z.boolean(),
  isSleepIn: z.boolean(),
  isShiftLeader: z.boolean(),
  isActUp: z.boolean(),
  notes: z.string().optional(),
});

type DailyShiftFormData = z.infer<typeof dailyShiftSchema>;

interface DailyShiftFlyoutProps {
  /** Whether the flyout is open */
  isOpen: boolean;
  /** Callback when flyout closes */
  onClose: () => void;
  /** Shift ID to edit */
  shiftId?: string;
  /** Pre-loaded shift data (from daily view) */
  shiftData?: ShiftViewData;
  /** Location ID for fetching references */
  locationId?: string;
  /** Sublocation ID for fetching references */
  sublocationId?: string;
  /** Callback when shift is saved */
  onSave?: () => void;
  /** Callback when shift is deleted */
  onDelete?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

// Dataverse option set base value
const DATAVERSE_OPTIONSET_BASE = 599250000;

// =============================================================================
// Helper Functions
// =============================================================================

function convertDataverseOptionSetValue(value: number | null | undefined): number | null {
  if (value == null || isNaN(value)) return null;
  if (value >= DATAVERSE_OPTIONSET_BASE) {
    return value - DATAVERSE_OPTIONSET_BASE;
  }
  return value;
}

function formatRefTime(hour: number | null | undefined, minute: number | null | undefined): string {
  const actualHour = convertDataverseOptionSetValue(hour);
  const actualMinute = convertDataverseOptionSetValue(minute);

  if (
    actualHour == null ||
    actualMinute == null ||
    actualHour < 0 ||
    actualHour > 23 ||
    actualMinute < 0 ||
    actualMinute > 59
  ) {
    return '';
  }

  return `${actualHour.toString().padStart(2, '0')}:${actualMinute.toString().padStart(2, '0')}`;
}

function formatRefTimeRange(ref: ShiftReference): string {
  const start = formatRefTime(
    ref.cp365_shiftreferencestarthour,
    ref.cp365_shiftreferencestartminute
  );
  const end = formatRefTime(ref.cp365_shiftreferenceendhour, ref.cp365_shiftreferenceendminute);
  return `${start}-${end}`;
}

function getInitials(name: string): string {
  if (!name || name === 'Unassigned') return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function calculateWorkingHours(
  startHour: string,
  startMinute: string,
  endHour: string,
  endMinute: string,
  breakMinutes: number
): string {
  const start = parseInt(startHour) * 60 + parseInt(startMinute);
  let end = parseInt(endHour) * 60 + parseInt(endMinute);

  // Handle overnight
  if (end < start) {
    end += 24 * 60;
  }

  const totalMinutes = end - start - breakMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return `${hours}h ${mins}m`;
}

// =============================================================================
// Component
// =============================================================================

export function DailyShiftFlyout({
  isOpen,
  onClose,
  shiftId,
  shiftData,
  locationId,
  sublocationId,
  onSave,
  onDelete,
}: DailyShiftFlyoutProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch full shift data if not provided
  const { data: fetchedShift, isLoading: isLoadingShift } = useShift(
    !shiftData && shiftId ? shiftId : undefined
  );

  // Use provided data or fetched data
  const shift = shiftData || fetchedShift;

  // Fetch dropdown data
  const { data: shiftReferences = [], isLoading: isLoadingRefs } = useShiftReferences(
    sublocationId,
    locationId
  );
  const { data: shiftActivities = [], isLoading: isLoadingActivities } = useShiftActivities();

  // Mutations
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();

  const isSubmitting = updateShiftMutation.isPending;
  const isDeleting = deleteShiftMutation.isPending;

  // Check if shift is editable (past/started shifts cannot be edited)
  const editability = useMemo(() => {
    if (!shift) return { editable: true };
    
    // Handle ShiftViewData format
    if ('Shift Date' in shift) {
      return isShiftViewDataEditable(shift);
    }
    // Handle Shift entity format
    return isShiftEditable(shift);
  }, [shift]);
  
  const isPastOrStarted = !editability.editable;

  // Get attendance status
  const attendanceStatus = useMemo<AttendanceStatus>(() => {
    if (!shift) return 'scheduled';
    // Handle both ShiftViewData and Shift types
    const isShiftViewData = 'Shift Start Time' in shift;
    const shiftForStatus: ShiftViewData = isShiftViewData
      ? (shift)
      : ({
          'Shift Start Time': (shift).cp365_shiftstarttime,
          'Shift End Time': (shift).cp365_shiftendtime,
          'Shift Status': (shift).cp365_shiftstatus,
        } as ShiftViewData);
    return getAttendanceStatus(shiftForStatus as ShiftWithAttendance);
  }, [shift]);

  const statusConfig = getStatusConfig(attendanceStatus);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<DailyShiftFormData>({
    resolver: zodResolver(dailyShiftSchema),
    defaultValues: {
      shiftReferenceId: '',
      shiftActivityId: '',
      startHour: '09',
      startMinute: '00',
      endHour: '17',
      endMinute: '00',
      breakDuration: 0,
      isOvertime: false,
      isSleepIn: false,
      isShiftLeader: false,
      isActUp: false,
      notes: '',
    },
  });

  // Watch values for working hours calculation
  const startHour = watch('startHour');
  const startMinute = watch('startMinute');
  const endHour = watch('endHour');
  const endMinute = watch('endMinute');
  const breakDuration = watch('breakDuration');
  const selectedRefId = watch('shiftReferenceId');

  // Calculate working hours
  const workingHours = useMemo(() => {
    return calculateWorkingHours(startHour, startMinute, endHour, endMinute, breakDuration);
  }, [startHour, startMinute, endHour, endMinute, breakDuration]);

  // Reset form when shift data changes
  useEffect(() => {
    if (!shift) return;

    // Handle ShiftViewData format
    if ('Shift Start Time' in shift) {
      const viewData = shift;
      const startTime = viewData['Shift Start Time']
        ? new Date(viewData['Shift Start Time'])
        : null;
      const endTime = viewData['Shift End Time'] ? new Date(viewData['Shift End Time']) : null;

      reset({
        shiftReferenceId: viewData['Shift Reference'] || '',
        shiftActivityId: '', // Would need to look up from activity name
        startHour: startTime ? startTime.getHours().toString().padStart(2, '0') : '09',
        startMinute: startTime
          ? (Math.floor(startTime.getMinutes() / 15) * 15).toString().padStart(2, '0')
          : '00',
        endHour: endTime ? endTime.getHours().toString().padStart(2, '0') : '17',
        endMinute: endTime
          ? (Math.floor(endTime.getMinutes() / 15) * 15).toString().padStart(2, '0')
          : '00',
        breakDuration: viewData['Shift Break Duration'] || 0,
        isOvertime: viewData['Overtime Shift'] || false,
        isSleepIn: viewData['Sleep In'] || false,
        isShiftLeader: viewData['Shift Leader'] || false,
        isActUp: viewData['Act Up'] || false,
        notes: '',
      });
    } else {
      // Handle Shift entity format
      const entityShift = shift;
      const startTime = entityShift.cp365_shiftstarttime
        ? new Date(entityShift.cp365_shiftstarttime)
        : null;
      const endTime = entityShift.cp365_shiftendtime
        ? new Date(entityShift.cp365_shiftendtime)
        : null;

      reset({
        shiftReferenceId: entityShift._cp365_shiftreference_value || '',
        shiftActivityId: entityShift._cp365_shiftactivity_value || '',
        startHour: startTime ? startTime.getHours().toString().padStart(2, '0') : '09',
        startMinute: startTime
          ? (Math.floor(startTime.getMinutes() / 15) * 15).toString().padStart(2, '0')
          : '00',
        endHour: endTime ? endTime.getHours().toString().padStart(2, '0') : '17',
        endMinute: endTime
          ? (Math.floor(endTime.getMinutes() / 15) * 15).toString().padStart(2, '0')
          : '00',
        breakDuration: entityShift.cr1e2_shiftbreakduration || 0,
        isOvertime: entityShift.cp365_overtimeshift || false,
        isSleepIn: entityShift.cp365_sleepin || false,
        isShiftLeader: entityShift.cp365_shiftleader || false,
        isActUp: entityShift.cp365_actup || false,
        notes: '',
      });
    }
  }, [shift, reset]);

  // Update times when shift reference changes
  useEffect(() => {
    if (selectedRefId) {
      const ref = shiftReferences.find((r) => r.cp365_shiftreferenceid === selectedRefId);
      if (ref) {
        const actualStartHour = convertDataverseOptionSetValue(ref.cp365_shiftreferencestarthour);
        const actualStartMinute = convertDataverseOptionSetValue(
          ref.cp365_shiftreferencestartminute
        );
        const actualEndHour = convertDataverseOptionSetValue(ref.cp365_shiftreferenceendhour);
        const actualEndMinute = convertDataverseOptionSetValue(ref.cp365_shiftreferenceendminute);

        if (actualStartHour != null)
          setValue('startHour', actualStartHour.toString().padStart(2, '0'));
        if (actualStartMinute != null)
          setValue(
            'startMinute',
            (Math.floor(actualStartMinute / 15) * 15).toString().padStart(2, '0')
          );
        if (actualEndHour != null) setValue('endHour', actualEndHour.toString().padStart(2, '0'));
        if (actualEndMinute != null)
          setValue(
            'endMinute',
            (Math.floor(actualEndMinute / 15) * 15).toString().padStart(2, '0')
          );
        setValue('isSleepIn', ref.cp365_sleepin || false);
      }
    }
  }, [selectedRefId, shiftReferences, setValue]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle form submission
  const onSubmit = async (data: DailyShiftFormData) => {
    if (!shiftId) return;
    setSubmitError(null);

    try {
      // Get the shift date from the shift data
      const shiftDate =
        shift && 'Shift Date' in shift
          ? (shift)['Shift Date']?.split('T')[0]
          : shift && 'cp365_shiftdate' in shift
            ? (shift).cp365_shiftdate?.split('T')[0]
            : format(new Date(), 'yyyy-MM-dd');

      const shiftUpdateData: Record<string, unknown> = {
        cp365_shiftstarttime: `${shiftDate}T${data.startHour}:${data.startMinute}:00Z`,
        cp365_shiftendtime: `${shiftDate}T${data.endHour}:${data.endMinute}:00Z`,
        cr1e2_shiftbreakduration: data.breakDuration,
        cp365_overtimeshift: data.isOvertime,
        cp365_sleepin: data.isSleepIn,
        cp365_shiftleader: data.isShiftLeader,
        cp365_actup: data.isActUp,
      };

      // IMPORTANT: For cp365_shifts, navigation property names MUST be PascalCase for @odata.bind
      if (data.shiftReferenceId) {
        shiftUpdateData['cp365_ShiftReference@odata.bind'] =
          `/cp365_shiftreferences(${data.shiftReferenceId})`;
      }
      if (data.shiftActivityId) {
        shiftUpdateData['cp365_ShiftActivity@odata.bind'] =
          `/cp365_shiftactivities(${data.shiftActivityId})`;
      }

      await updateShiftMutation.mutateAsync({ shiftId, data: shiftUpdateData });
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Failed to save shift:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to save shift');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!shiftId) return;

    try {
      await deleteShiftMutation.mutateAsync(shiftId);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to delete shift');
    }
  };

  // Quick action: Mark as absent
  const handleMarkAbsent = async () => {
    if (!shiftId) return;
    // TODO: Implement mark absent functionality
  };

  // Quick action: Toggle shift leader
  const handleToggleLeader = () => {
    setValue('isShiftLeader', !watch('isShiftLeader'), { shouldDirty: true });
  };

  if (!isOpen) return null;

  const isLoading = isLoadingShift || isLoadingRefs || isLoadingActivities;

  // Get staff info from shift
  const staffName =
    shift && 'Staff Member Name' in shift
      ? (shift)['Staff Member Name'] || 'Unassigned'
      : 'Staff Member';
  const jobTitle =
    shift && 'Job Title' in shift ? (shift)['Job Title'] || 'Standard Care' : '';
  const initials = getInitials(staffName);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Flyout Panel - Full screen on mobile, slide-in on desktop */}
      <div
        className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 z-50 flex h-full w-full sm:max-w-[400px] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flyout-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-grey bg-primary px-4 py-3">
          <h2 id="flyout-title" className="text-lg font-semibold text-white">
            {isPastOrStarted ? 'View Shift' : 'Edit Shift'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Actions Bar (hidden for past/started shifts) */}
        {!isPastOrStarted && (
          <div className="flex items-center gap-2 border-b border-border-grey bg-gray-50 px-4 py-2">
            <button
              type="button"
              onClick={handleMarkAbsent}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
              Mark Absent
            </button>
            <button
              type="button"
              onClick={handleToggleLeader}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                watch('isShiftLeader')
                  ? 'bg-green-100 text-green-800'
                  : 'border border-green-300 bg-white text-green-700 hover:bg-green-50'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              {watch('isShiftLeader') ? 'Leader ✓' : 'Assign Leader'}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <form id="daily-shift-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
              {/* Error Alert */}
              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="text-sm text-red-700">{submitError}</div>
                </div>
              )}

              {/* Read-only Banner for Past/Started Shifts */}
              {isPastOrStarted && editability.reason && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">View Only:</span> {editability.reason}
                  </div>
                </div>
              )}

              {/* Staff Info Section (Read-only) */}
              <div className="rounded-lg border border-border-grey bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-medium text-white">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{staffName}</div>
                    <div className="text-sm text-gray-500">{jobTitle}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${statusConfig.bgColour} ${statusConfig.colour}`}
                    >
                      <StatusDot status={attendanceStatus} size="sm" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift Reference */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Shift Reference
                </label>
                <div className="relative">
                  <select
                    {...register('shiftReferenceId')}
                    disabled={isPastOrStarted}
                    className="w-full appearance-none rounded-lg border border-border-grey bg-white px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">Select shift reference...</option>
                    {shiftReferences.map((ref) => (
                      <option key={ref.cp365_shiftreferenceid} value={ref.cp365_shiftreferenceid}>
                        {ref.cp365_shiftreferencename} ({formatRefTimeRange(ref)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Times Section */}
              <div className="rounded-lg border border-border-grey p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Shift Times</span>
                  <span className="text-sm font-semibold text-primary">{workingHours}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Start</label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <select
                          {...register('startHour')}
                          disabled={isPastOrStarted}
                          className="w-full appearance-none rounded-lg border border-border-grey bg-white px-2 py-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          {HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="flex items-center text-gray-400">:</span>
                      <div className="relative flex-1">
                        <select
                          {...register('startMinute')}
                          disabled={isPastOrStarted}
                          className="w-full appearance-none rounded-lg border border-border-grey bg-white px-2 py-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          {MINUTES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">End</label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <select
                          {...register('endHour')}
                          disabled={isPastOrStarted}
                          className="w-full appearance-none rounded-lg border border-border-grey bg-white px-2 py-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          {HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="flex items-center text-gray-400">:</span>
                      <div className="relative flex-1">
                        <select
                          {...register('endMinute')}
                          disabled={isPastOrStarted}
                          className="w-full appearance-none rounded-lg border border-border-grey bg-white px-2 py-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          {MINUTES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Activity</label>
                <div className="relative">
                  <select
                    {...register('shiftActivityId')}
                    disabled={isPastOrStarted}
                    className="w-full appearance-none rounded-lg border border-border-grey bg-white px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">Select activity...</option>
                    {shiftActivities.map((activity) => (
                      <option
                        key={activity.cp365_shiftactivityid}
                        value={activity.cp365_shiftactivityid}
                      >
                        {activity.cp365_shiftactivityname}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Break Duration */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Break Duration (minutes)
                </label>
                <Controller
                  name="breakDuration"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isPastOrStarted}
                      min={0}
                      max={480}
                      step={15}
                      className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  )}
                />
              </div>

              {/* Options Checkboxes */}
              <div className="space-y-3 rounded-lg border border-border-grey p-4">
                <p className="text-sm font-medium text-gray-700">Shift Options</p>

                <label className={`flex items-center gap-3 ${isPastOrStarted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    {...register('isSleepIn')}
                    disabled={isPastOrStarted}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Sleep In</span>
                </label>

                <label className={`flex items-center gap-3 ${isPastOrStarted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    {...register('isOvertime')}
                    disabled={isPastOrStarted}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Overtime</span>
                </label>

                <label className={`flex items-center gap-3 ${isPastOrStarted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    {...register('isShiftLeader')}
                    disabled={isPastOrStarted}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Shift Leader</span>
                </label>

                <label className={`flex items-center gap-3 ${isPastOrStarted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    {...register('isActUp')}
                    disabled={isPastOrStarted}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Act Up</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  disabled={isPastOrStarted}
                  placeholder={isPastOrStarted ? '' : 'Add any notes about this shift...'}
                  className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-grey bg-gray-50 px-4 py-3">
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">Delete this shift?</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-border-grey bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Delete button (hidden for past/started shifts) */}
              {!isPastOrStarted && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <div className="flex-1" />

              {/* Close/Cancel */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border-grey bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {isPastOrStarted ? 'Close' : 'Cancel'}
              </button>

              {/* Save (hidden for past/started shifts) */}
              {!isPastOrStarted && (
                <button
                  type="submit"
                  form="daily-shift-form"
                  disabled={isSubmitting || !isDirty}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DailyShiftFlyout;
