/**
 * useShifts Hook
 * Data fetching and mutations for shifts, shift references, and shift activities
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  publishShifts,
  unpublishShifts,
  unassignShift,
  getShiftReferences,
  getShiftActivities,
  getTotalUnpublishedCount,
  getAllUnpublishedShifts,
  bulkDeleteShifts,
  bulkCreateShifts,
  getTimesheetClocks,
} from '@/api/dataverse/shifts';
import type { UnpublishedShiftsFilter } from '@/api/dataverse/shifts';
import type { Shift, TimesheetClock } from '@/api/dataverse/types';

/**
 * Fetch timesheet clock records for a date range.
 * Returns clock-in/out records that can be matched to shifts.
 */
export function useTimesheetClocks(startDate: Date, endDate: Date, enabled = true) {
  return useQuery<TimesheetClock[]>({
    queryKey: ['timesheetClocks', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getTimesheetClocks(startDate, endDate),
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes — clock data refreshes frequently
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch shifts for a rota and date range
 */
export function useShifts(rotaId: string | undefined, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['shifts', rotaId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => (rotaId ? getShifts(rotaId, startDate, endDate) : []),
    enabled: !!rotaId,
  });
}

/**
 * Fetch a single shift by ID
 * Always fetches fresh data to ensure all fields are loaded
 */
export function useShift(shiftId: string | undefined) {
  return useQuery({
    queryKey: ['shift', shiftId],
    queryFn: () => (shiftId ? getShiftById(shiftId) : null),
    enabled: !!shiftId,
    staleTime: 0, // Always consider data stale - refetch on each open
    gcTime: 0, // Don't cache (was cacheTime in older React Query)
  });
}

/**
 * Fetch shift references for a sublocation/location
 * Tries sublocation first, then location, then all references
 */
export function useShiftReferences(sublocationId?: string, locationId?: string) {
  return useQuery({
    queryKey: ['shiftReferences', sublocationId, locationId],
    queryFn: () => getShiftReferences(sublocationId, locationId),
    staleTime: 1000 * 60 * 30, // 30 minutes - these rarely change
  });
}

/**
 * Fetch all shift activities
 */
export function useShiftActivities() {
  return useQuery({
    queryKey: ['shiftActivities'],
    queryFn: getShiftActivities,
    staleTime: 1000 * 60 * 30, // 30 minutes - these rarely change
  });
}

/**
 * Create a new shift
 */
export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Shift>) => createShift(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
    },
  });
}

/**
 * Update an existing shift
 */
export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: Partial<Shift> }) =>
      updateShift(shiftId, data),
    onSuccess: (_, { shiftId }) => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
    },
  });
}

/**
 * Delete a shift
 */
export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => deleteShift(shiftId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
    },
  });
}

/**
 * Publish multiple shifts
 */
export function usePublishShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftIds: string[]) => publishShifts(shiftIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
      void queryClient.invalidateQueries({ queryKey: ['allUnpublishedShifts'] });
      void queryClient.invalidateQueries({ queryKey: ['totalUnpublishedCount'] });
    },
  });
}

/**
 * Unpublish multiple shifts
 */
export function useUnpublishShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftIds: string[]) => unpublishShifts(shiftIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
    },
  });
}

/**
 * Unassign staff from a shift
 */
export function useUnassignShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => unassignShift(shiftId),
    onSuccess: (_, shiftId) => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
    },
  });
}

/**
 * Fetch total unpublished shift count across ALL rotas
 * Used for dashboard comparison metrics
 */
export function useTotalUnpublishedCount() {
  return useQuery({
    queryKey: ['totalUnpublishedCount'],
    queryFn: getTotalUnpublishedCount,
    staleTime: 1000 * 60 * 5, // 5 minutes - refresh reasonably often for accuracy
    refetchOnWindowFocus: true, // Refresh when user returns to the app
  });
}

/**
 * Fetch all unpublished shifts with details
 * Supports filtering by location, sublocation, staff member, and date range
 */
export function useAllUnpublishedShifts(filters?: UnpublishedShiftsFilter) {
  return useQuery({
    queryKey: ['allUnpublishedShifts', filters],
    queryFn: () => getAllUnpublishedShifts(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Bulk create multiple shifts (used by Copy Week)
 * Accepts an onProgress callback for real-time progress tracking.
 */
export function useBulkCreateShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shifts,
      onProgress,
    }: {
      shifts: Array<Partial<Shift>>;
      onProgress?: (completed: number, total: number) => void;
    }) => bulkCreateShifts(shifts, { onProgress }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
      void queryClient.invalidateQueries({ queryKey: ['allUnpublishedShifts'] });
      void queryClient.invalidateQueries({ queryKey: ['totalUnpublishedCount'] });
    },
  });
}

/**
 * Bulk delete multiple shifts
 */
export function useBulkDeleteShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftIds: string[]) => bulkDeleteShifts(shiftIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['rotaData'] });
      void queryClient.invalidateQueries({ queryKey: ['allUnpublishedShifts'] });
      void queryClient.invalidateQueries({ queryKey: ['totalUnpublishedCount'] });
    },
  });
}
