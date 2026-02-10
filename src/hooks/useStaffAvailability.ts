/**
 * useStaffAvailability Hook
 *
 * Custom hook for fetching and managing staff availability data.
 * Supports weekly patterns and specific date exceptions.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek } from 'date-fns';
import { staffAvailabilityRepository } from '@/repositories/staffAvailabilityRepository';
import { visitRepository } from '@/repositories/visitRepository';
import type {
  StaffAvailability,
  WeeklyAvailabilityPattern,
  DayAvailability,
  AvailabilitySlot,
  Visit,
} from '@/types/domiciliary';
import { AvailabilityType } from '@/types/domiciliary';

/** Days of the week */
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

interface UseStaffAvailabilityOptions {
  /** Staff member to load availability for */
  staffMemberId: string;
  /** Week start date */
  weekStartDate: Date;
}

interface TimeSlotData {
  /** Hour (0-23) */
  hour: number;
  /** Minute (0 or 30) */
  minute: number;
  /** Availability type for this slot */
  type: AvailabilityType | null;
  /** Whether this slot is preferred */
  isPreferred: boolean;
  /** Whether this slot has a booked visit */
  isBooked: boolean;
  /** Visit ID if booked */
  visitId?: string;
  /** Visit details if booked */
  visitDetails?: string;
}

interface DaySlotData {
  /** Day of week */
  day: DayOfWeek;
  /** Date */
  date: Date;
  /** All 30-minute time slots for this day */
  slots: TimeSlotData[];
  /** Total available hours */
  totalAvailableHours: number;
  /** Total booked hours */
  totalBookedHours: number;
}

interface UseStaffAvailabilityResult {
  /** Weekly availability pattern */
  pattern: WeeklyAvailabilityPattern | null;
  /** Day-by-day slot data for display */
  weekData: DaySlotData[];
  /** Visits for this staff member during the week */
  visits: Visit[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Save availability for a specific slot */
  setSlotAvailability: (day: DayOfWeek, hour: number, minute: number, type: AvailabilityType | null, isPreferred?: boolean) => void;
  /** Clear all availability for a day */
  clearDay: (day: DayOfWeek) => void;
  /** Copy availability from another day */
  copyDay: (fromDay: DayOfWeek, toDay: DayOfWeek) => void;
  /** Save all changes */
  saveChanges: () => Promise<void>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Reset to last saved state */
  resetChanges: () => void;
  /** Is saving in progress */
  isSaving: boolean;
}

/** Default empty day availability */
function createEmptyDayAvailability(): DayAvailability {
  return {
    isAvailable: false,
    slots: [],
    notes: undefined,
  };
}

/** Default empty pattern */
function createEmptyPattern(staffMemberId: string): WeeklyAvailabilityPattern {
  return {
    cp365_patternid: '',
    cp365_staffmemberid: staffMemberId,
    cp365_patternname: 'Default Pattern',
    monday: createEmptyDayAvailability(),
    tuesday: createEmptyDayAvailability(),
    wednesday: createEmptyDayAvailability(),
    thursday: createEmptyDayAvailability(),
    friday: createEmptyDayAvailability(),
    saturday: createEmptyDayAvailability(),
    sunday: createEmptyDayAvailability(),
    cp365_effectivefrom: format(new Date(), 'yyyy-MM-dd'),
    cp365_isactive: true,
  };
}

/** Convert availability records to weekly pattern */
function availabilityToPattern(
  staffMemberId: string,
  records: StaffAvailability[]
): WeeklyAvailabilityPattern {
  const pattern = createEmptyPattern(staffMemberId);
  
  // Group by day of week
  for (const record of records) {
    if (!record.cp365_dayofweek || record.statecode !== 0) continue;
    
    const dayIndex = record.cp365_dayofweek - 1; // 1-indexed to 0-indexed
    if (dayIndex < 0 || dayIndex > 6) continue;
    
    const dayKey = DAYS_OF_WEEK[dayIndex];
    const dayAvailability = pattern[dayKey];
    
    dayAvailability.isAvailable = true;
    dayAvailability.slots.push({
      startTime: record.cp365_availablefrom,
      endTime: record.cp365_availableto,
      type: record.cp365_availabilitytype,
      isPreferred: record.cp365_ispreferredtime,
    });
  }
  
  return pattern;
}

/** Check if a time falls within a slot */
function isTimeInSlot(hour: number, minute: number, slot: AvailabilitySlot): boolean {
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return timeStr >= slot.startTime && timeStr < slot.endTime;
}

/** Check if a time falls within a visit */
function isTimeInVisit(hour: number, minute: number, visit: Visit): boolean {
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return timeStr >= visit.cp365_scheduledstarttime && timeStr < visit.cp365_scheduledendtime;
}

/**
 * Hook for managing staff availability
 */
export function useStaffAvailability(options: UseStaffAvailabilityOptions): UseStaffAvailabilityResult {
  const { staffMemberId, weekStartDate } = options;
  const queryClient = useQueryClient();

  // Calculate week dates
  const weekStart = useMemo(() => startOfWeek(weekStartDate, { weekStartsOn: 1 }), [weekStartDate]);
  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch availability records
  const availabilityQuery = useQuery({
    queryKey: ['staffAvailability', staffMemberId],
    queryFn: () => staffAvailabilityRepository.getByStaffMember(staffMemberId),
    enabled: !!staffMemberId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch visits for the week
  const visitsQuery = useQuery({
    queryKey: ['staffVisits', staffMemberId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const _weekEnd = addDays(weekStart, 6);
      return visitRepository.getByStaffMember(staffMemberId, weekStart);
    },
    enabled: !!staffMemberId,
    staleTime: 1 * 60 * 1000,
  });

  // Convert to weekly pattern
  const pattern = useMemo(() => {
    if (!availabilityQuery.data) return null;
    return availabilityToPattern(staffMemberId, availabilityQuery.data);
  }, [availabilityQuery.data, staffMemberId]);

  // Build week data for display
  const weekData = useMemo<DaySlotData[]>(() => {
    if (!pattern) return [];

    return DAYS_OF_WEEK.map((day, dayIndex) => {
      const date = weekDates[dayIndex];
      const dayAvailability = pattern[day];
      const dayVisits = (visitsQuery.data || []).filter(v => {
        const visitDate = new Date(v.cp365_visitdate);
        return format(visitDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      // Generate 30-minute slots from 06:00 to 22:00
      const slots: TimeSlotData[] = [];
      for (let hour = 6; hour < 22; hour++) {
        for (const minute of [0, 30]) {
          // Check if this slot is in an availability window
          let slotType: AvailabilityType | null = null;
          let isPreferred = false;
          
          for (const slot of dayAvailability.slots) {
            if (isTimeInSlot(hour, minute, slot)) {
              slotType = slot.type;
              isPreferred = slot.isPreferred;
              break;
            }
          }

          // Check if this slot has a visit
          let isBooked = false;
          let visitId: string | undefined;
          let visitDetails: string | undefined;
          
          for (const visit of dayVisits) {
            if (isTimeInVisit(hour, minute, visit)) {
              isBooked = true;
              visitId = visit.cp365_visitid;
              visitDetails = visit.cp365_visitname;
              break;
            }
          }

          slots.push({
            hour,
            minute,
            type: slotType,
            isPreferred,
            isBooked,
            visitId,
            visitDetails,
          });
        }
      }

      // Calculate totals
      const availableSlots = slots.filter(s => s.type === AvailabilityType.Available || s.type === AvailabilityType.Preferred);
      const bookedSlots = slots.filter(s => s.isBooked);

      return {
        day,
        date,
        slots,
        totalAvailableHours: availableSlots.length * 0.5,
        totalBookedHours: bookedSlots.length * 0.5,
      };
    });
  }, [pattern, weekDates, visitsQuery.data]);

  // For now, we'll implement basic slot manipulation
  // In a full implementation, this would maintain local state and save to the repository
  const setSlotAvailability = useCallback((
    day: DayOfWeek,
    hour: number,
    minute: number,
    type: AvailabilityType | null,
    isPreferred = false
  ) => {
    console.log('Set slot availability:', { day, hour, minute, type, isPreferred });
    // TODO: Implement local state management for unsaved changes
  }, []);

  const clearDay = useCallback((day: DayOfWeek) => {
    console.log('Clear day:', day);
    // TODO: Implement
  }, []);

  const copyDay = useCallback((fromDay: DayOfWeek, toDay: DayOfWeek) => {
    console.log('Copy day:', fromDay, 'to', toDay);
    // TODO: Implement
  }, []);

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement save logic
      console.log('Saving changes...');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAvailability', staffMemberId] });
    },
  });

  const resetChanges = useCallback(() => {
    // TODO: Implement reset
    console.log('Reset changes');
  }, []);

  return {
    pattern,
    weekData,
    visits: visitsQuery.data || [],
    isLoading: availabilityQuery.isLoading || visitsQuery.isLoading,
    error: availabilityQuery.error || visitsQuery.error,
    setSlotAvailability,
    clearDay,
    copyDay,
    saveChanges: () => saveChangesMutation.mutateAsync(),
    hasUnsavedChanges: false, // TODO: Track unsaved changes
    resetChanges,
    isSaving: saveChangesMutation.isPending,
  };
}

export default useStaffAvailability;
