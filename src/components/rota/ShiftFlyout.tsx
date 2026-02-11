/**
 * ShiftFlyout Component
 * Slide-out panel for viewing/editing shift details
 * Based on specification section 5.1
 */

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { X, Save, Trash2, UserMinus, Clock, AlertTriangle, Loader2, Send } from 'lucide-react';
import {
  useShift,
  useShiftReferences,
  useShiftActivities,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useUnassignShift,
  usePublishShifts,
} from '@/hooks/useShifts';
import { LoadingSpinner } from '@/components/common/Loading';
import type { ShiftReference } from '@/api/dataverse/types';
import { ShiftStatus } from '@/api/dataverse/types';
import { isShiftEditable } from '@/utils/shiftUtils';

// =============================================================================
// TYPES & SCHEMA
// =============================================================================

const shiftSchema = z.object({
  staffMemberId: z.string().optional(),
  shiftReferenceId: z.string().optional(),
  shiftActivityId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  breakDuration: z.number().min(0).max(480),
  isOvertime: z.boolean(),
  isSleepIn: z.boolean(),
  isShiftLeader: z.boolean(),
  isActUp: z.boolean(),
  communityHours: z.number().min(0).max(24),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface ShiftFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId?: string;
  mode: 'view' | 'edit' | 'create';
  /** Pre-fill date for new shifts */
  defaultDate?: Date;
  /** Pre-fill staff member for new shifts */
  defaultStaffMemberId?: string;
  /** Pre-fill shift reference for new shifts (from Shift Reference View) */
  defaultShiftReferenceId?: string;
  /** Location ID for fetching references */
  locationId?: string;
  /** Sublocation ID for fetching references */
  sublocationId?: string;
  /** Rota ID for creating shifts */
  rotaId?: string;
  /** Staff list from rota data */
  staffList?: Array<{ 'Staff Member ID': string; 'Staff Member Name': string }>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ShiftFlyout({
  isOpen,
  onClose,
  shiftId,
  mode: initialMode,
  defaultDate,
  defaultStaffMemberId,
  defaultShiftReferenceId,
  locationId,
  sublocationId,
  rotaId,
  staffList = [],
}: ShiftFlyoutProps) {
  const [mode, setMode] = useState(initialMode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch shift data if editing
  const { data: shift, isLoading: isLoadingShift } = useShift(
    mode !== 'create' ? shiftId : undefined
  );

  // Check if shift is editable (past/started shifts cannot be edited)
  const editability = mode !== 'create' && shift ? isShiftEditable(shift) : { editable: true };
  const isPastOrStarted = !editability.editable;

  // Fetch dropdown data
  const { data: shiftReferences = [], isLoading: isLoadingRefs } = useShiftReferences(
    sublocationId,
    locationId
  );
  const { data: shiftActivities = [], isLoading: isLoadingActivities } = useShiftActivities();

  // Mutations
  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();
  const unassignShiftMutation = useUnassignShift();
  const publishShiftsMutation = usePublishShifts();

  const isSubmitting = createShiftMutation.isPending || updateShiftMutation.isPending;
  const isDeleting = deleteShiftMutation.isPending;
  const isPublishing = publishShiftsMutation.isPending;

  // Check if shift is unpublished
  const isUnpublished = shift && shift.cp365_shiftstatus !== ShiftStatus.Published;
  const isUnassigning = unassignShiftMutation.isPending;

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      staffMemberId: defaultStaffMemberId || '',
      shiftReferenceId: defaultShiftReferenceId || '',
      shiftActivityId: '',
      date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 0,
      isOvertime: false,
      isSleepIn: false,
      isShiftLeader: false,
      isActUp: false,
      communityHours: 0,
    },
  });

  // Watch shift reference to update times
  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form's watch() API
  const selectedRefId = watch('shiftReferenceId');

  // Reset form when shift data loads or mode changes
  useEffect(() => {
    // Always reset delete confirmation when mode or shift changes
    setShowDeleteConfirm(false);

    if (mode === 'create') {
      reset({
        staffMemberId: defaultStaffMemberId || '',
        shiftReferenceId: defaultShiftReferenceId || '',
        shiftActivityId: '',
        date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 0,
        isOvertime: false,
        isSleepIn: false,
        isShiftLeader: false,
        isActUp: false,
        communityHours: 0,
      });
    } else if (shift) {
      reset({
        staffMemberId: shift._cp365_staffmember_value || '',
        shiftReferenceId: shift._cp365_shiftreference_value || '',
        shiftActivityId: shift._cp365_shiftactivity_value || '',
        date: shift.cp365_shiftdate?.split('T')[0] || '',
        startTime: shift.cp365_shiftstarttime
          ? format(new Date(shift.cp365_shiftstarttime), 'HH:mm')
          : '',
        endTime: shift.cp365_shiftendtime
          ? format(new Date(shift.cp365_shiftendtime), 'HH:mm')
          : '',
        breakDuration: shift.cr1e2_shiftbreakduration || 0,
        isOvertime: shift.cp365_overtimeshift || false,
        isSleepIn: shift.cp365_sleepin || false,
        isShiftLeader: shift.cp365_shiftleader || false,
        isActUp: shift.cp365_actup || false,
        communityHours: shift.cp365_communityhours || 0,
      });
    }
  }, [shift, mode, reset, defaultDate, defaultStaffMemberId, defaultShiftReferenceId]);

  // Update times when shift reference changes
  useEffect(() => {
    if (selectedRefId) {
      const ref = shiftReferences.find((r) => r.cp365_shiftreferenceid === selectedRefId);
      if (ref) {
        const startTime = formatRefTime(
          ref.cp365_shiftreferencestarthour,
          ref.cp365_shiftreferencestartminute
        );
        const endTime = formatRefTime(
          ref.cp365_shiftreferenceendhour,
          ref.cp365_shiftreferenceendminute
        );
        // Only set times if they are valid formatted strings
        if (startTime) {
          setValue('startTime', startTime);
        }
        if (endTime) {
          setValue('endTime', endTime);
        }
        setValue('isSleepIn', ref.cp365_sleepin || false);
      }
    }
  }, [selectedRefId, shiftReferences, setValue]);

  // Reset mode when prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Handle form submission
  const onSubmit = async (data: ShiftFormData) => {
    setSubmitError(null);

    // Helper function to check if a value is a valid GUID
    const isValidGuid = (value: string | null | undefined): boolean => {
      if (!value || typeof value !== 'string') return false;
      const trimmed = value.trim();
      if (trimmed === '') return false;
      // GUID regex pattern
      const guidPattern =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return guidPattern.test(trimmed);
    };

    // Build the payload - only include fields that exist in Dataverse schema
    // Note: cp365_shiftname, cp365_shifttype, cp365_shiftsourcetype, cp365_shiftsetuptype
    // do NOT exist on cp365_shift entity - these are populated by Power Automate flows
    const shiftData: Record<string, unknown> = {
      cp365_shiftdate: data.date,
      cp365_shiftstarttime: `${data.date}T${data.startTime}:00Z`,
      cp365_shiftendtime: `${data.date}T${data.endTime}:00Z`,
      // New shifts default to Unpublished so they can be reviewed before publishing
      cp365_shiftstatus: ShiftStatus.Unpublished,
      // Note: break duration uses different publisher prefix
      cr1e2_shiftbreakduration: data.breakDuration || 0,
    };

    // Boolean fields - only add if true
    if (data.isOvertime) shiftData.cp365_overtimeshift = true;
    if (data.isSleepIn) shiftData.cp365_sleepin = true;
    if (data.isShiftLeader) shiftData.cp365_shiftleader = true;
    if (data.isActUp) shiftData.cp365_actup = true;

    // Lookup bindings - only add if valid GUID
    // IMPORTANT: For cp365_shifts, navigation property names MUST be PascalCase for @odata.bind
    // See docs/DATAVERSE-DEVELOPMENT-GUIDE.md and src/features/shift-patterns/constants/dataverseSchema.ts
    if (isValidGuid(data.staffMemberId)) {
      shiftData['cp365_StaffMember@odata.bind'] = `/cp365_staffmembers(${data.staffMemberId})`;
    }
    if (isValidGuid(data.shiftReferenceId)) {
      shiftData['cp365_ShiftReference@odata.bind'] =
        `/cp365_shiftreferences(${data.shiftReferenceId})`;
    }
    if (isValidGuid(data.shiftActivityId)) {
      shiftData['cp365_ShiftActivity@odata.bind'] =
        `/cp365_shiftactivities(${data.shiftActivityId})`;
    }
    if (mode === 'create' && isValidGuid(rotaId)) {
      shiftData['cp365_Rota@odata.bind'] = `/cp365_rotas(${rotaId})`;
    }

    try {
      // Validate rotaId for create mode
      if (mode === 'create' && !rotaId) {
        let errorMessage = 'Cannot create shift: No active rota found. ';
        if (!sublocationId) {
          errorMessage += 'Please select a sublocation first.';
        } else {
          errorMessage += 'This sublocation does not have an active rota.';
        }
        setSubmitError(errorMessage);
        return;
      }

      if (mode === 'create') {
        await createShiftMutation.mutateAsync(shiftData);
      } else if (shiftId) {
        await updateShiftMutation.mutateAsync({ shiftId, data: shiftData });
      }

      onClose();
    } catch (error) {
      console.error('[ShiftFlyout] Failed to save shift:', error);

      // Extract detailed error message
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        const dvError = error as { innerError?: { message?: string }; errorCode?: string };
        if (dvError.innerError?.message) {
          errorMessage = `${error.message} - ${dvError.innerError.message}`;
        }
        if (dvError.errorCode) {
          errorMessage = `[${dvError.errorCode}] ${errorMessage}`;
        }
      }

      // Log full error for debugging
      console.error('[ShiftFlyout] Full error:', JSON.stringify(error, null, 2));

      // Show error message
      setSubmitError(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!shiftId) return;

    try {
      await deleteShiftMutation.mutateAsync(shiftId);
      onClose();
    } catch (error) {
      console.error('Failed to delete shift:', error);
    }
  };

  // Handle unassign
  const handleUnassign = async () => {
    if (!shiftId) return;

    try {
      await unassignShiftMutation.mutateAsync(shiftId);
      onClose();
    } catch (error) {
      console.error('Failed to unassign shift:', error);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!shiftId) return;

    try {
      await publishShiftsMutation.mutateAsync([shiftId]);
      onClose();
    } catch (error) {
      console.error('Failed to publish shift:', error);
    }
  };

  if (!isOpen) return null;

  const title = {
    view: 'Shift Details',
    edit: 'Edit Shift',
    create: 'Create Shift',
  }[mode];

  const isLoading = isLoadingShift || isLoadingRefs || isLoadingActivities;
  // Read-only if in view mode OR if the shift is in the past/has started
  const isReadOnly = mode === 'view' || isPastOrStarted;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Flyout Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flyout-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-grey px-6 py-4">
          <h2 id="flyout-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {/* Only show Edit button if in view mode AND shift is editable (not past/started) */}
            {mode === 'view' && !isPastOrStarted && (
              <button
                onClick={() => setMode('edit')}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-elevation-1 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <form
              id="shift-form"
              onSubmit={handleSubmit(onSubmit, (validationErrors) => {
                console.error('[ShiftFlyout] Form validation failed:', validationErrors);
                const fields = Object.entries(validationErrors)
                  .map(([field, err]) => `${field}: ${err?.message ?? 'invalid'}`)
                  .join(', ');
                setSubmitError(`Validation failed: ${fields}`);
              })}
              className="space-y-5"
            >
              {/* Error Alert */}
              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                  <div className="text-sm text-error whitespace-pre-wrap break-all">
                    {submitError}
                  </div>
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

              {/* Staff Member */}
              <div>
                <label htmlFor="flyout-staff-member" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Staff Member
                </label>
                <select
                  id="flyout-staff-member"
                  {...register('staffMemberId')}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Unassigned</option>
                  {staffList
                    .filter((staff) => staff['Staff Member ID']) // Filter out staff with null/undefined IDs
                    .map((staff) => (
                      <option key={staff['Staff Member ID']} value={staff['Staff Member ID']}>
                        {staff['Staff Member Name']}
                      </option>
                    ))}
                </select>
              </div>

              {/* Shift Reference */}
              <div>
                <label htmlFor="flyout-shift-reference" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Shift Reference
                </label>
                <select
                  id="flyout-shift-reference"
                  {...register('shiftReferenceId')}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Select shift reference...</option>
                  {shiftReferences.map((ref) => (
                    <option key={ref.cp365_shiftreferenceid} value={ref.cp365_shiftreferenceid}>
                      {ref.cp365_shiftreferencename} ({formatRefTimeRange(ref)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Activity */}
              <div>
                <label htmlFor="flyout-shift-activity" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Shift Activity
                </label>
                <select
                  id="flyout-shift-activity"
                  {...register('shiftActivityId')}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
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
              </div>

              {/* Date */}
              <div>
                <label htmlFor="flyout-shift-date" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Date <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  id="flyout-shift-date"
                  {...register('date')}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                />
                {errors.date && <p className="mt-1 text-sm text-error">{errors.date.message}</p>}
              </div>

              {/* Start/End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flyout-start-time" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Start Time <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      id="flyout-start-time"
                      {...register('startTime')}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-border-grey py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  {errors.startTime && (
                    <p className="mt-1 text-sm text-error">{errors.startTime.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="flyout-end-time" className="mb-1.5 block text-sm font-medium text-gray-700">
                    End Time <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      id="flyout-end-time"
                      {...register('endTime')}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-border-grey py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  {errors.endTime && (
                    <p className="mt-1 text-sm text-error">{errors.endTime.message}</p>
                  )}
                </div>
              </div>

              {/* Break Duration */}
              <div>
                <label htmlFor="flyout-break-duration" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Break Duration (minutes)
                </label>
                <Controller
                  name="breakDuration"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      id="flyout-break-duration"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isReadOnly}
                      min={0}
                      max={480}
                      className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  )}
                />
              </div>

              {/* Community Hours */}
              <div>
                <label htmlFor="flyout-community-hours" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Community Hours
                </label>
                <Controller
                  name="communityHours"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      id="flyout-community-hours"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      min={0}
                      max={24}
                      step={0.5}
                      className="w-full rounded-lg border border-border-grey px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  )}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 rounded-lg border border-border-grey p-4">
                <p className="text-sm font-medium text-gray-700">Shift Options</p>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register('isOvertime')}
                    disabled={isReadOnly}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Overtime Shift</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register('isSleepIn')}
                    disabled={isReadOnly}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Sleep In</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register('isShiftLeader')}
                    disabled={isReadOnly}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Shift Leader</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register('isActUp')}
                    disabled={isReadOnly}
                    className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Act Up</span>
                </label>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-grey bg-elevation-1 px-6 py-4">
          {showDeleteConfirm && mode !== 'create' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">Delete this shift?</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-border-grey px-4 py-2 text-sm font-medium hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50"
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
            <div className="space-y-3">
              {/* Primary actions row - always visible and full width */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-border-grey px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
                >
                  Cancel
                </button>
                {/* Publish button for unpublished shifts (hidden for past/started shifts) */}
                {mode !== 'create' && isUnpublished && !isPastOrStarted && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publish
                  </button>
                )}
                {/* Only show Save button if not read-only AND not past/started (create mode is always allowed) */}
                {!isReadOnly && (
                  <button
                    type="submit"
                    form="shift-form"
                    disabled={isSubmitting || (mode !== 'create' && !isDirty)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {mode === 'create' ? 'Create' : 'Save'}
                  </button>
                )}
              </div>

              {/* Secondary actions row - destructive actions (hidden for past/started shifts) */}
              {mode !== 'create' && !isPastOrStarted && (
                <div className="flex gap-2 border-t border-border-grey pt-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-error px-3 py-2 text-sm font-medium text-error hover:bg-error/5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  {watch('staffMemberId') && (
                    <button
                      type="button"
                      onClick={handleUnassign}
                      disabled={isUnassigning}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-grey px-3 py-2 text-sm font-medium text-gray-700 hover:bg-elevation-1 disabled:opacity-50"
                    >
                      {isUnassigning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                      Unassign
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Dataverse stores time values as option sets with base value 599250000
// e.g., hour 12 is stored as 599250012, minute 30 is stored as 599250030
const DATAVERSE_OPTIONSET_BASE = 599250000;

function convertDataverseOptionSetValue(value: number | null | undefined): number | null {
  if (value == null || isNaN(value)) return null;
  // If value is greater than the base, it's an option set value that needs conversion
  if (value >= DATAVERSE_OPTIONSET_BASE) {
    return value - DATAVERSE_OPTIONSET_BASE;
  }
  // Otherwise, assume it's already a raw value
  return value;
}

function formatRefTime(hour: number | null | undefined, minute: number | null | undefined): string {
  // Convert from Dataverse option set values to actual values
  const actualHour = convertDataverseOptionSetValue(hour);
  const actualMinute = convertDataverseOptionSetValue(minute);

  // Handle invalid or missing values
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
