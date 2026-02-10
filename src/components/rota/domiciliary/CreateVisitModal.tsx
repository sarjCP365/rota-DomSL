/**
 * CreateVisitModal Component
 *
 * Modal for creating new visits with service user selection,
 * visit type, timing, optional carer assignment, and activities.
 */

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks, isBefore } from 'date-fns';
import {
  X,
  Search,
  Calendar,
  Clock,
  User,
  ChevronDown,
  Repeat,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';
import type { Visit } from '@/types/domiciliary';
import {
  VisitType,
  VisitStatus,
  ActivityCategory,
  getVisitTypeDisplayName,
  getActivityCategoryDisplayName,
} from '@/types/domiciliary';
import { serviceUserRepository } from '@/repositories/serviceUserRepository';
import { visitRepository } from '@/repositories/visitRepository';
import { getDummyData } from '@/data/dummyDataGenerator';
import { findMatchingStaff } from '@/services/staffMatching';
import { StaffSuitabilityBadge } from './StaffSuitabilityBadge';

interface CreateVisitModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback after successful creation */
  onCreate?: (visits: Visit[]) => void;
  /** Pre-selected service user ID */
  defaultServiceUserId?: string;
  /** Pre-selected date */
  defaultDate?: Date;
  /** Pre-selected visit type */
  defaultVisitType?: VisitType;
}

/** Form data structure */
interface CreateVisitFormData {
  serviceUserId: string;
  visitType: VisitType;
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  staffMemberId?: string;
  activities: ActivityCategory[];
  notes?: string;
  isRecurring: boolean;
  recurrencePattern?: 'weekly' | 'fortnightly' | 'monthly';
  recurrenceEndDate?: string;
}

/** Default times by visit type */
const VISIT_TYPE_DEFAULTS: Record<VisitType, { start: string; end: string }> = {
  [VisitType.Morning]: { start: '08:00', end: '08:45' },
  [VisitType.Lunch]: { start: '12:00', end: '12:45' },
  [VisitType.Afternoon]: { start: '14:00', end: '14:45' },
  [VisitType.Tea]: { start: '16:00', end: '16:45' },
  [VisitType.Evening]: { start: '18:00', end: '18:45' },
  [VisitType.Bedtime]: { start: '21:00', end: '21:45' },
  [VisitType.Night]: { start: '22:00', end: '06:00' },
  [VisitType.WakingNight]: { start: '22:00', end: '06:00' },
  [VisitType.SleepIn]: { start: '22:00', end: '07:00' },
  [VisitType.Emergency]: { start: '09:00', end: '09:30' },
  [VisitType.Assessment]: { start: '10:00', end: '11:00' },
  [VisitType.Review]: { start: '10:00', end: '10:30' },
};

/** Default activities by visit type */
const VISIT_TYPE_ACTIVITIES: Record<VisitType, ActivityCategory[]> = {
  [VisitType.Morning]: [ActivityCategory.PersonalCare, ActivityCategory.Medication, ActivityCategory.MealPreparation],
  [VisitType.Lunch]: [ActivityCategory.MealPreparation, ActivityCategory.Medication],
  [VisitType.Afternoon]: [ActivityCategory.Companionship, ActivityCategory.Medication],
  [VisitType.Tea]: [ActivityCategory.MealPreparation, ActivityCategory.Companionship],
  [VisitType.Evening]: [ActivityCategory.MealPreparation, ActivityCategory.PersonalCare, ActivityCategory.Medication],
  [VisitType.Bedtime]: [ActivityCategory.PersonalCare, ActivityCategory.Medication],
  [VisitType.Night]: [ActivityCategory.NightCheck, ActivityCategory.PersonalCare],
  [VisitType.WakingNight]: [ActivityCategory.NightCheck, ActivityCategory.PersonalCare],
  [VisitType.SleepIn]: [ActivityCategory.NightCheck],
  [VisitType.Emergency]: [],
  [VisitType.Assessment]: [ActivityCategory.HealthMonitoring],
  [VisitType.Review]: [],
};

/** All activity categories for selection */
const ALL_ACTIVITIES: ActivityCategory[] = [
  ActivityCategory.PersonalCare,
  ActivityCategory.Medication,
  ActivityCategory.MealPreparation,
  ActivityCategory.MealSupport,
  ActivityCategory.Mobility,
  ActivityCategory.Domestic,
  ActivityCategory.Companionship,
  ActivityCategory.Community,
  ActivityCategory.HealthMonitoring,
  ActivityCategory.NightCheck,
];

/** Calculate duration between times in minutes */
function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let minutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (minutes < 0) minutes += 24 * 60; // Handle overnight
  return minutes;
}

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * CreateVisitModal component
 */
export function CreateVisitModal({
  isOpen,
  onClose,
  onCreate,
  defaultServiceUserId,
  defaultDate,
  defaultVisitType,
}: CreateVisitModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showServiceUserDropdown, setShowServiceUserDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVisitFormData>({
    defaultValues: {
      serviceUserId: defaultServiceUserId || '',
      visitType: defaultVisitType || VisitType.Morning,
      date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: VISIT_TYPE_DEFAULTS[defaultVisitType || VisitType.Morning].start,
      endTime: VISIT_TYPE_DEFAULTS[defaultVisitType || VisitType.Morning].end,
      activities: VISIT_TYPE_ACTIVITIES[defaultVisitType || VisitType.Morning],
      isRecurring: false,
      recurrencePattern: 'weekly',
    },
  });

  // Watch form values
  const selectedServiceUserId = watch('serviceUserId');
  const selectedVisitType = watch('visitType');
  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const activities = watch('activities');
  const isRecurring = watch('isRecurring');
  const recurrencePattern = watch('recurrencePattern');
  const recurrenceEndDate = watch('recurrenceEndDate');
  const selectedDate = watch('date');

  // Fetch service users
  const serviceUsersQuery = useQuery({
    queryKey: ['domiciliary', 'serviceUsers', 'active'],
    queryFn: () => serviceUserRepository.getActive(),
    enabled: isOpen,
  });

  // Fetch staff members
  const staffQuery = useQuery({
    queryKey: ['domiciliary', 'staffMembers'],
    queryFn: async () => {
      const data = await getDummyData();
      return data.staffMembers;
    },
    enabled: isOpen,
  });

  // Filter service users based on search
  const filteredServiceUsers = useMemo(() => {
    if (!serviceUsersQuery.data) return [];
    if (!searchTerm) return serviceUsersQuery.data;

    const term = searchTerm.toLowerCase();
    return serviceUsersQuery.data.filter(
      su =>
        su.cp365_fullname.toLowerCase().includes(term) ||
        su.cp365_preferredname?.toLowerCase().includes(term) ||
        su.cp365_currentaddress.toLowerCase().includes(term) ||
        su.cp365_postcode?.toLowerCase().includes(term)
    );
  }, [serviceUsersQuery.data, searchTerm]);

  // Get selected service user (must be defined before staffMatchingQuery)
  const selectedServiceUser = useMemo(() => {
    if (!serviceUsersQuery.data || !selectedServiceUserId) return null;
    return serviceUsersQuery.data.find(su => su.cp365_serviceuserid === selectedServiceUserId);
  }, [serviceUsersQuery.data, selectedServiceUserId]);

  // Fetch staff matching results when service user and time are selected
  const staffMatchingQuery = useQuery({
    queryKey: ['staffMatching', selectedServiceUserId, selectedDate, startTime, endTime],
    queryFn: async () => {
      if (!selectedServiceUser) return [];

      // Create a temporary visit object for matching
      const tempVisit: Visit = {
        cp365_visitid: 'temp',
        cp365_visitname: 'Temp Visit',
        cp365_serviceuserid: selectedServiceUserId,
        cp365_visitdate: selectedDate,
        cp365_scheduledstarttime: startTime,
        cp365_scheduledendtime: endTime,
        cp365_durationminutes: calculateDuration(startTime, endTime),
        cp365_visittypecode: selectedVisitType,
        cp365_visitstatus: VisitStatus.Scheduled,
        cp365_isrecurring: false,
        statecode: 0,
        createdon: new Date().toISOString(),
        modifiedon: new Date().toISOString(),
      };

      return findMatchingStaff(
        { visit: tempVisit, serviceUser: selectedServiceUser },
        { limit: 20, includeUnavailable: true }
      );
    },
    enabled: isOpen && !!selectedServiceUserId && !!selectedServiceUser && !!selectedDate && !!startTime && !!endTime,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Calculate duration
  const duration = useMemo(() => calculateDuration(startTime, endTime), [startTime, endTime]);

  // Calculate recurring dates preview
  const recurringDates = useMemo(() => {
    if (!isRecurring || !selectedDate || !recurrenceEndDate) return [];

    const dates: Date[] = [];
    let current = new Date(selectedDate);
    const end = new Date(recurrenceEndDate);

    while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      dates.push(new Date(current));

      if (recurrencePattern === 'weekly') {
        current = addWeeks(current, 1);
      } else if (recurrencePattern === 'fortnightly') {
        current = addWeeks(current, 2);
      } else {
        current = addDays(current, 30); // Approximate month
      }
    }

    return dates.slice(0, 12); // Limit preview to 12
  }, [isRecurring, selectedDate, recurrenceEndDate, recurrencePattern]);

  // Update times when visit type changes
  useEffect(() => {
    const defaults = VISIT_TYPE_DEFAULTS[selectedVisitType];
    if (defaults) {
      setValue('startTime', defaults.start);
      setValue('endTime', defaults.end);
    }
    // Update default activities
    const defaultActivities = VISIT_TYPE_ACTIVITIES[selectedVisitType] || [];
    setValue('activities', defaultActivities);
  }, [selectedVisitType, setValue]);

  // Reset form when modal opens with new defaults
  useEffect(() => {
    if (isOpen) {
      reset({
        serviceUserId: defaultServiceUserId || '',
        visitType: defaultVisitType || VisitType.Morning,
        date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: VISIT_TYPE_DEFAULTS[defaultVisitType || VisitType.Morning].start,
        endTime: VISIT_TYPE_DEFAULTS[defaultVisitType || VisitType.Morning].end,
        activities: VISIT_TYPE_ACTIVITIES[defaultVisitType || VisitType.Morning],
        isRecurring: false,
        recurrencePattern: 'weekly',
      });
      setSearchTerm('');
    }
  }, [isOpen, defaultServiceUserId, defaultDate, defaultVisitType, reset]);

  // Create visit mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateVisitFormData) => {
      const serviceUser = serviceUsersQuery.data?.find(su => su.cp365_serviceuserid === data.serviceUserId);
      if (!serviceUser) throw new Error('Service user not found');

      const dates = data.isRecurring && data.recurrenceEndDate
        ? recurringDates.map(d => format(d, 'yyyy-MM-dd'))
        : [data.date];

      const createdVisits: Visit[] = [];

      for (const visitDate of dates) {
        const newVisit: Partial<Visit> = {
          cp365_visitname: `${serviceUser.cp365_fullname} - ${getVisitTypeDisplayName(data.visitType)}`,
          cp365_serviceuserid: data.serviceUserId,
          cp365_visitdate: visitDate,
          cp365_scheduledstarttime: data.startTime,
          cp365_scheduledendtime: data.endTime,
          cp365_durationminutes: calculateDuration(data.startTime, data.endTime),
          cp365_visittypecode: data.visitType,
          cp365_visitstatus: data.staffMemberId ? VisitStatus.Assigned : VisitStatus.Scheduled,
          cp365_staffmemberid: data.staffMemberId,
          cp365_isrecurring: data.isRecurring,
          cp365_visitnotes: data.notes,
          statecode: 0,
          createdon: new Date().toISOString(),
          modifiedon: new Date().toISOString(),
        };

        const created = await visitRepository.create(newVisit);
        createdVisits.push(created);
      }

      return createdVisits;
    },
    onSuccess: (visits) => {
      queryClient.invalidateQueries({ queryKey: ['domiciliary', 'visits'] });
      onCreate?.(visits);
      onClose();
    },
  });

  // Handle form submission
  const onSubmit = handleSubmit((data) => {
    createMutation.mutate(data);
  });

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
              Create New Visit
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Service User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service User <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div
                  onClick={() => setShowServiceUserDropdown(!showServiceUserDropdown)}
                  className={`
                    w-full p-3 border rounded-lg cursor-pointer flex items-center gap-3
                    ${selectedServiceUser ? 'border-gray-300' : 'border-gray-300'}
                    ${errors.serviceUserId ? 'border-red-500' : ''}
                    hover:border-teal-500 transition-colors
                  `}
                >
                  {selectedServiceUser ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {getInitials(selectedServiceUser.cp365_fullname)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{selectedServiceUser.cp365_fullname}</p>
                        <p className="text-sm text-gray-500 truncate">{selectedServiceUser.cp365_currentaddress}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-500">Select a service user...</span>
                    </>
                  )}
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>

                {/* Dropdown */}
                {showServiceUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search service users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {serviceUsersQuery.isLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                        </div>
                      ) : filteredServiceUsers.length === 0 ? (
                        <p className="p-4 text-center text-gray-500">No service users found</p>
                      ) : (
                        filteredServiceUsers.map((su) => (
                          <div
                            key={su.cp365_serviceuserid}
                            onClick={() => {
                              setValue('serviceUserId', su.cp365_serviceuserid);
                              setShowServiceUserDropdown(false);
                              setSearchTerm('');
                            }}
                            className={`
                              p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50
                              ${su.cp365_serviceuserid === selectedServiceUserId ? 'bg-teal-50' : ''}
                            `}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {getInitials(su.cp365_fullname)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{su.cp365_fullname}</p>
                              <p className="text-xs text-gray-500 truncate">{su.cp365_postcode}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <input type="hidden" {...register('serviceUserId', { required: true })} />
              </div>
              {errors.serviceUserId && (
                <p className="mt-1 text-sm text-red-500">Please select a service user</p>
              )}
            </div>

            {/* Visit Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visit Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(VisitType)
                  .filter(([key]) => isNaN(Number(key)))
                  .map(([key, value]) => (
                    <label
                      key={key}
                      className={`
                        flex items-center justify-center p-2 rounded-lg border cursor-pointer text-sm
                        transition-colors
                        ${selectedVisitType === value
                          ? 'bg-teal-50 border-teal-500 text-teal-700'
                          : 'border-gray-200 hover:border-teal-300'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        {...register('visitType')}
                        value={value}
                        className="sr-only"
                      />
                      {getVisitTypeDisplayName(value as VisitType)}
                    </label>
                  ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    {...register('date', { required: true })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className={`
                      w-full pl-10 pr-4 py-2 border rounded-lg
                      focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                      ${errors.date ? 'border-red-500' : 'border-gray-300'}
                    `}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                  <input
                    type="time"
                    {...register('startTime', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                  <input
                    type="time"
                    {...register('endTime', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Duration display */}
            <div className="flex items-center gap-2 text-sm text-gray-600 -mt-4">
              <Clock className="w-4 h-4" />
              <span>Duration: <strong>{duration} minutes</strong></span>
            </div>

            {/* Staff Assignment (Optional) with Suitability Scores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Carer (optional)
              </label>
              <Controller
                name="staffMemberId"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    {(() => {
                      const selectedStaff = field.value ? staffQuery.data?.find(s => s.cp365_staffmemberid === field.value) : null;
                      const matchResult = field.value ? staffMatchingQuery.data?.find(m => m.staffMember.cp365_staffmemberid === field.value) : null;
                      
                      return (
                        <>
                          <div
                            onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                            className={`
                              w-full p-3 border rounded-lg cursor-pointer flex items-center gap-3
                              border-gray-300 hover:border-teal-500 transition-colors
                            `}
                          >
                            {selectedStaff ? (
                              <>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {getInitials(selectedStaff.cp365_staffmembername)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm">{selectedStaff.cp365_staffmembername}</p>
                                  <p className="text-xs text-gray-500">{selectedStaff.cp365_jobtitle || 'Carer'}</p>
                                </div>
                                {matchResult && <StaffSuitabilityBadge matchResult={matchResult} variant="compact" showTooltip={false} />}
                              </>
                            ) : (
                              <>
                                <User className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-500">Leave unassigned or select a carer...</span>
                              </>
                            )}
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          </div>
                          
                          {/* Show detailed suitability breakdown below selected carer */}
                          {selectedStaff && matchResult && !showStaffDropdown && (
                            <div className="mt-2">
                              <StaffSuitabilityBadge matchResult={matchResult} variant="detailed" />
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Staff Dropdown with Suitability Scores */}
                    {showStaffDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                        {/* Unassigned option */}
                        <div
                          onClick={() => {
                            field.onChange('');
                            setShowStaffDropdown(false);
                          }}
                          className={`
                            p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100
                            ${!field.value ? 'bg-teal-50' : ''}
                          `}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-700 text-sm">Leave unassigned</p>
                            <p className="text-xs text-gray-500">Assign a carer later</p>
                          </div>
                        </div>

                        {/* Loading state */}
                        {staffMatchingQuery.isLoading ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                            <p className="text-xs text-gray-500 mt-1">Calculating suitability...</p>
                          </div>
                        ) : !selectedServiceUserId ? (
                          <div className="p-4 text-center">
                            <Info className="w-5 h-5 mx-auto text-gray-400" />
                            <p className="text-xs text-gray-500 mt-1">Select a service user to see carer suitability</p>
                          </div>
                        ) : staffMatchingQuery.data && staffMatchingQuery.data.length > 0 ? (
                          <div className="overflow-y-auto max-h-56">
                            {/* Recommended header */}
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Recommended Carers (by suitability)
                              </p>
                            </div>
                            {staffMatchingQuery.data.map((match) => (
                              <div
                                key={match.staffMember.cp365_staffmemberid}
                                onClick={() => {
                                  field.onChange(match.staffMember.cp365_staffmemberid);
                                  setShowStaffDropdown(false);
                                }}
                                className={`
                                  p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0
                                  ${match.staffMember.cp365_staffmemberid === field.value ? 'bg-teal-50' : ''}
                                  ${!match.isAvailable ? 'opacity-60' : ''}
                                `}
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {getInitials(match.staffMember.cp365_staffmembername)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 text-sm">{match.staffMember.cp365_staffmembername}</p>
                                    <StaffSuitabilityBadge matchResult={match} variant="inline" />
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {match.staffMember.cp365_jobtitle || 'Carer'}
                                    {match.warnings.length > 0 && (
                                      <span className="text-amber-600 ml-2">• {match.warnings[0]}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Fallback to basic staff list */
                          <div className="overflow-y-auto max-h-56">
                            {staffQuery.data?.map((staff) => (
                              <div
                                key={staff.cp365_staffmemberid}
                                onClick={() => {
                                  field.onChange(staff.cp365_staffmemberid);
                                  setShowStaffDropdown(false);
                                }}
                                className={`
                                  p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50
                                  ${staff.cp365_staffmemberid === field.value ? 'bg-teal-50' : ''}
                                `}
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {getInitials(staff.cp365_staffmembername)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm">{staff.cp365_staffmembername}</p>
                                  <p className="text-xs text-gray-500">{staff.cp365_jobtitle || 'Carer'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              />
              {staffMatchingQuery.data && selectedServiceUserId && (
                <p className="mt-1 text-xs text-gray-500">
                  <Info className="w-3 h-3 inline mr-1" />
                  {staffMatchingQuery.data.filter(m => m.isAvailable).length} carers available, {staffMatchingQuery.data.length} total matches
                </p>
              )}
            </div>

            {/* Activities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Care Activities
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {ALL_ACTIVITIES.map((activity) => (
                  <label
                    key={activity}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <Controller
                      name="activities"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value?.includes(activity) || false}
                          onChange={(e) => {
                            const current = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...current, activity]);
                            } else {
                              field.onChange(current.filter((a) => a !== activity));
                            }
                          }}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                      )}
                    />
                    <span className="text-sm text-gray-700">
                      {getActivityCategoryDisplayName(activity)}
                    </span>
                  </label>
                ))}
              </div>
              {activities?.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Consider adding at least one activity
                </p>
              )}
            </div>

            {/* Recurrence */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isRecurring')}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Make this a recurring visit</span>
                </div>
              </label>

              {isRecurring && (
                <div className="mt-4 space-y-4 pl-7">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Repeat</label>
                      <select
                        {...register('recurrencePattern')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="weekly">Every week</option>
                        <option value="fortnightly">Every 2 weeks</option>
                        <option value="monthly">Every month</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Until</label>
                      <input
                        type="date"
                        {...register('recurrenceEndDate')}
                        min={selectedDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {recurringDates.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Preview ({recurringDates.length} visits):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {recurringDates.map((date, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                          >
                            {format(date, 'd MMM')}
                          </span>
                        ))}
                        {recurringDates.length === 12 && <span className="text-xs text-gray-400">...</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                {...register('notes')}
                placeholder="Add any special instructions or notes..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={onSubmit}
              disabled={isSubmitting || createMutation.isPending}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {(isSubmitting || createMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isRecurring && recurringDates.length > 1
                ? `Create ${recurringDates.length} Visits`
                : 'Create Visit'}
            </button>
          </div>

          {/* Error display */}
          {createMutation.error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Failed to create visit: {createMutation.error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CreateVisitModal;
