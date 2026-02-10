/**
 * Pattern Builder Page
 * Create and edit shift pattern templates
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Save, Loader2, AlertTriangle, Users, Settings2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  usePatternTemplate,
  useCreatePatternTemplate,
  useUpdatePatternTemplate,
} from '../hooks/usePatternTemplates';
import { bulkCreatePatternDays, replacePatternDays } from '../api/patternDays';
import type { PatternFormData, PatternDayFormData, DayOfWeek } from '../types';
import { PatternPublishStatus, GenerationWindow } from '../types';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { WeekGrid, PatternSummary, PatternValidation } from '../components/PatternBuilder';
import { PatternAssignedStaff } from '../components/PatternDetails';
import { useShiftReferences, useShiftActivities } from '@/hooks/useShifts';
import { useLocationSettings } from '@/store/settingsStore';
import { useLocations } from '@/hooks/useLocations';
import { MapPin } from 'lucide-react';

type TabType = 'details' | 'assigned';

// Form validation schema
const patternFormSchema = z.object({
  name: z.string().min(1, 'Pattern name is required').max(100, 'Pattern name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  rotationCycleWeeks: z.number().min(1, 'Minimum 1 week').max(8, 'Maximum 8 weeks'),
  defaultPublishStatus: z.nativeEnum(PatternPublishStatus),
  generationWindowWeeks: z.nativeEnum(GenerationWindow),
  isStandardTemplate: z.boolean(),
  locationId: z.string().min(1, 'Location is required'),
});

type PatternFormValues = z.infer<typeof patternFormSchema>;

/**
 * Pattern Builder Page Component
 */
export function PatternBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id && id !== 'new';
  const { isOpen: isSideNavOpen, close: closeSideNav } = useSideNav();

  // Location data
  const { data: locations = [], isLoading: isLoadingLocations } = useLocations();

  // Get location settings for fetching shift references and default location
  const { selectedLocationId, selectedSublocationId } = useLocationSettings();

  // Queries
  const { data: existingPattern, isLoading: isLoadingPattern } = usePatternTemplate(
    isEditMode ? id : undefined
  );
  const { data: shiftReferences = [] } = useShiftReferences(
    selectedSublocationId,
    selectedLocationId
  );
  const { data: shiftActivities = [] } = useShiftActivities();

  // Mutations
  const createPattern = useCreatePatternTemplate();
  const updatePattern = useUpdatePatternTemplate();

  // Form state
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatternFormValues>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: {
      name: '',
      description: '',
      rotationCycleWeeks: 1,
      defaultPublishStatus: PatternPublishStatus.Unpublished,
      generationWindowWeeks: GenerationWindow.TwoWeeks,
      isStandardTemplate: false,
      locationId: selectedLocationId || '', // Default to current location
    },
  });

  const rotationCycleWeeks = watch('rotationCycleWeeks');

  // Pattern days state
  const [patternDays, setPatternDays] = useState<PatternDayFormData[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Tab state (only show tabs in edit mode)
  const [activeTab, setActiveTab] = useState<TabType>('details');

  // Initialize form with existing pattern data
  useEffect(() => {
    if (existingPattern) {
      reset({
        name: existingPattern.cp365_name,
        description: existingPattern.cp365_sp_description || '',
        rotationCycleWeeks: existingPattern.cp365_sp_rotationcycleweeks,
        defaultPublishStatus: existingPattern.cp365_sp_defaultpublishstatus,
        generationWindowWeeks: existingPattern.cp365_sp_generationwindowweeks,
        isStandardTemplate: existingPattern.cp365_sp_isstandardtemplate,
        locationId: existingPattern._cr482_location_value || '',
      });

      // Initialize pattern days from loaded data
      const loadedDays = existingPattern.cp365_shiftpatterntemplate_days || [];

      if (loadedDays.length > 0) {
        // Use loaded days from Dataverse
        setPatternDays(
          loadedDays.map((day) => ({
            weekNumber: day.cp365_sp_weeknumber,
            dayOfWeek: day.cp365_sp_dayofweek,
            isRestDay: day.cp365_sp_isrestday,
            shiftReferenceId: day._cp365_shiftreference_value,
            startTime: day.cp365_sp_starttime ? extractTime(day.cp365_sp_starttime) : undefined,
            endTime: day.cp365_sp_endtime ? extractTime(day.cp365_sp_endtime) : undefined,
            breakMinutes: day.cp365_sp_breakminutes,
            isOvernight: day.cp365_sp_isovernight,
            shiftActivityId: day._cp365_shiftactivity_value,
          }))
        );
      } else {
        // No days saved yet - initialize with default rest days for all weeks
        const rotationWeeks = existingPattern.cp365_sp_rotationcycleweeks || 1;
        const newDays: PatternDayFormData[] = [];
        for (let week = 1; week <= rotationWeeks; week++) {
          for (let day = 1; day <= 7; day++) {
            newDays.push({
              weekNumber: week,
              dayOfWeek: day as DayOfWeek,
              isRestDay: true,
              isOvernight: false,
            });
          }
        }
        setPatternDays(newDays);
      }
    }
  }, [existingPattern, reset]);

  // Initialize empty pattern days when rotation cycle changes
  useEffect(() => {
    if (!isEditMode || !existingPattern) {
      const newDays: PatternDayFormData[] = [];
      for (let week = 1; week <= rotationCycleWeeks; week++) {
        for (let day = 1; day <= 7; day++) {
          // Check if day already exists
          const existing = patternDays.find((d) => d.weekNumber === week && d.dayOfWeek === day);
          if (existing) {
            newDays.push(existing);
          } else {
            newDays.push({
              weekNumber: week,
              dayOfWeek: day as DayOfWeek,
              isRestDay: true,
              isOvernight: false,
            });
          }
        }
      }
      setPatternDays(newDays);
    }
  }, [rotationCycleWeeks, isEditMode, existingPattern]);

  // Get days for selected week
  const selectedWeekDays = useMemo(
    () => patternDays.filter((d) => d.weekNumber === selectedWeek),
    [patternDays, selectedWeek]
  );

  // Handle form submission
  const onSubmit = async (values: PatternFormValues) => {
    try {
      const formData: PatternFormData = {
        name: values.name,
        description: values.description,
        rotationCycleWeeks: values.rotationCycleWeeks,
        defaultPublishStatus: values.defaultPublishStatus,
        generationWindowWeeks: values.generationWindowWeeks,
        isStandardTemplate: values.isStandardTemplate,
        locationId: values.locationId,
        days: patternDays,
      };

      if (isEditMode && existingPattern) {
        // Update existing pattern
        await updatePattern.mutateAsync({
          id: existingPattern.cp365_shiftpatterntemplatenewid,
          data: formData,
        });

        // Replace pattern days
        await replacePatternDays(existingPattern.cp365_shiftpatterntemplatenewid, patternDays);
      } else {
        // Create new pattern
        const newPattern = await createPattern.mutateAsync(formData);

        // Create pattern days
        if (patternDays.length > 0) {
          await bulkCreatePatternDays(newPattern.cp365_shiftpatterntemplatenewid, patternDays);
        }
      }

      navigate('/patterns');
    } catch (error) {
      console.error('[PatternBuilder] Error saving pattern:', error);
      // Error is already handled by the mutation
    }
  };

  // Handle individual day change
  const handleDayChange = useCallback(
    (dayOfWeek: DayOfWeek, data: PatternDayFormData) => {
      setPatternDays((prev) => {
        const index = prev.findIndex(
          (d) => d.weekNumber === selectedWeek && d.dayOfWeek === dayOfWeek
        );
        if (index >= 0) {
          const newDays = [...prev];
          newDays[index] = { ...data, weekNumber: selectedWeek, dayOfWeek };
          return newDays;
        } else {
          return [...prev, { ...data, weekNumber: selectedWeek, dayOfWeek }];
        }
      });
    },
    [selectedWeek]
  );

  // Handle copy week functionality
  const handleCopyWeek = useCallback(
    (targetWeek: number) => {
      // Get days from current selected week
      const sourceDays = patternDays.filter((d) => d.weekNumber === selectedWeek);

      setPatternDays((prev) => {
        // Remove existing days for target week
        const otherDays = prev.filter((d) => d.weekNumber !== targetWeek);
        // Copy source days to target week
        const copiedDays = sourceDays.map((d) => ({
          ...d,
          weekNumber: targetWeek,
        }));
        return [...otherDays, ...copiedDays];
      });
    },
    [selectedWeek, patternDays]
  );

  if (isEditMode && isLoadingPattern) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isEditMode && !existingPattern && !isLoadingPattern) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Pattern Not Found</h2>
        <p className="mt-2 text-gray-500">The pattern you're looking for doesn't exist.</p>
        <Link
          to="/patterns"
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav isOpen={isSideNavOpen} onClose={closeSideNav} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/patterns" className="rounded-lg p-2 hover:bg-white/10">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">
                  {isEditMode ? 'Edit Pattern' : 'Create Pattern'}
                </h1>
                <p className="text-sm text-emerald-100">
                  {isEditMode ? existingPattern?.cp365_name : 'Define a new shift pattern template'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/patterns"
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Cancel
              </Link>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || createPattern.isPending || updatePattern.isPending}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-600 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
              >
                {isSubmitting || createPattern.isPending || updatePattern.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Pattern
              </button>
            </div>
          </div>
        </header>

        {/* Tabs - Only show in edit mode */}
        {isEditMode && (
          <div className="border-b border-slate-200 bg-white px-6">
            <nav className="-mb-px flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Settings2 className="h-4 w-4" />
                Pattern Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assigned')}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'assigned'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Users className="h-4 w-4" />
                Assigned Staff
              </button>
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Assigned Staff Tab */}
          {isEditMode && activeTab === 'assigned' ? (
            <div className="mx-auto max-w-5xl">
              <PatternAssignedStaff
                patternTemplateId={id}
                patternName={existingPattern?.cp365_name || 'Pattern'}
              />
            </div>
          ) : (
            /* Pattern Details Tab / Create Mode */
            <div className="mx-auto max-w-5xl">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Pattern Details Card */}
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">Pattern Details</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Location */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          Location <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Controller
                        name="locationId"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            disabled={isLoadingLocations}
                            className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                          >
                            <option value="">Select location...</option>
                            {locations.map((location) => (
                              <option
                                key={location.cp365_locationid}
                                value={location.cp365_locationid}
                              >
                                {location.cp365_locationname}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.locationId && (
                        <p className="mt-1 text-sm text-red-500">{errors.locationId.message}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        This pattern will be available for staff at this location
                      </p>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Pattern Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="e.g., 4-on-4-off Day Shifts"
                        className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        placeholder="Describe this pattern..."
                        className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Settings Row */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {/* Rotation Cycle */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Rotation Cycle (Weeks) <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="rotationCycleWeeks"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <option key={n} value={n}>
                                  {n} {n === 1 ? 'Week' : 'Weeks'}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </div>

                      {/* Default Publish Status */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Default Publish Status
                        </label>
                        <Controller
                          name="defaultPublishStatus"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value={PatternPublishStatus.Published}>Published</option>
                              <option value={PatternPublishStatus.Unpublished}>Unpublished</option>
                            </select>
                          )}
                        />
                      </div>

                      {/* Generation Window */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Generation Window
                        </label>
                        <Controller
                          name="generationWindowWeeks"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value={GenerationWindow.OneWeek}>1 Week Ahead</option>
                              <option value={GenerationWindow.TwoWeeks}>2 Weeks Ahead</option>
                              <option value={GenerationWindow.FourWeeks}>4 Weeks Ahead</option>
                            </select>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Week Tabs */}
                {rotationCycleWeeks > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {Array.from({ length: rotationCycleWeeks }, (_, i) => i + 1).map((week) => (
                      <button
                        key={week}
                        type="button"
                        onClick={() => setSelectedWeek(week)}
                        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          selectedWeek === week
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Week {week}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Content - Two Column Layout */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Left Column - Week Grid */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Week Grid */}
                    <WeekGrid
                      weekNumber={selectedWeek}
                      days={selectedWeekDays}
                      rotationCycleWeeks={rotationCycleWeeks}
                      shiftReferences={shiftReferences}
                      shiftActivities={shiftActivities}
                      onDayChange={handleDayChange}
                      onCopyWeek={handleCopyWeek}
                    />
                  </div>

                  {/* Right Column - Summary & Validation */}
                  <div className="space-y-6">
                    {/* Pattern Summary */}
                    <PatternSummary days={patternDays} rotationCycleWeeks={rotationCycleWeeks} />

                    {/* Pattern Validation */}
                    <PatternValidation
                      days={patternDays}
                      rotationCycleWeeks={rotationCycleWeeks}
                      onNavigateToDay={(weekNumber, _dayOfWeek) => {
                        setSelectedWeek(weekNumber);
                        // Could also highlight the day in the grid
                      }}
                    />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Extract time (HH:mm) from a DateTime string
 */
function extractTime(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
}
