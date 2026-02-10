/**
 * CarePoint 365 - Pattern Assignments React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStaffAssignments,
  fetchAssignmentsByPattern,
  fetchAssignmentById,
  createPatternAssignment,
  updatePatternAssignment,
  endPatternAssignment,
  deletePatternAssignment,
  getActivePatternForDate,
  bulkAssignPattern,
  getAssignmentsNeedingGeneration,
} from '../api/patternAssignments';
import type { AssignmentFormData, BulkAssignmentOptions } from '../types';
import { patternTemplateKeys } from './usePatternTemplates';
// Note: Add react-toastify or similar library for proper notifications

/**
 * Query key factory for pattern assignments
 */
export const patternAssignmentKeys = {
  all: ['patternAssignments'] as const,
  lists: () => [...patternAssignmentKeys.all, 'list'] as const,
  byStaff: (staffId: string, includeEnded?: boolean) =>
    [...patternAssignmentKeys.lists(), 'staff', staffId, includeEnded] as const,
  byPattern: (patternId: string, activeOnly?: boolean) =>
    [...patternAssignmentKeys.lists(), 'pattern', patternId, activeOnly] as const,
  details: () => [...patternAssignmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...patternAssignmentKeys.details(), id] as const,
  activeForDate: (staffId: string, date: string) =>
    [...patternAssignmentKeys.all, 'activeForDate', staffId, date] as const,
  needingGeneration: () => [...patternAssignmentKeys.all, 'needingGeneration'] as const,
};

/**
 * Hook to fetch all assignments for a staff member
 */
export function useStaffPatternAssignments(
  staffMemberId: string | undefined,
  includeEnded: boolean = false
) {
  return useQuery({
    queryKey: patternAssignmentKeys.byStaff(staffMemberId!, includeEnded),
    queryFn: () => fetchStaffAssignments(staffMemberId!, includeEnded),
    enabled: !!staffMemberId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch all assignments for a pattern template
 */
export function usePatternAssignments(
  patternTemplateId: string | undefined,
  activeOnly: boolean = true
) {
  return useQuery({
    queryKey: patternAssignmentKeys.byPattern(patternTemplateId!, activeOnly),
    queryFn: () => fetchAssignmentsByPattern(patternTemplateId!, activeOnly),
    enabled: !!patternTemplateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single assignment by ID
 */
export function usePatternAssignment(id: string | undefined) {
  return useQuery({
    queryKey: patternAssignmentKeys.detail(id!),
    queryFn: () => fetchAssignmentById(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

/**
 * Hook to get the active pattern for a staff member on a specific date
 */
export function useActivePatternForDate(staffMemberId: string | undefined, date: Date | undefined) {
  const dateStr = date ? date.toISOString().split('T')[0] : '';

  return useQuery({
    queryKey: patternAssignmentKeys.activeForDate(staffMemberId!, dateStr),
    queryFn: () => getActivePatternForDate(staffMemberId!, date!),
    enabled: !!staffMemberId && !!date,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all assignments that need generation
 */
export function useAssignmentsNeedingGeneration() {
  return useQuery({
    queryKey: patternAssignmentKeys.needingGeneration(),
    queryFn: () => getAssignmentsNeedingGeneration(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a pattern assignment
 */
export function useCreatePatternAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignmentFormData) => createPatternAssignment(data),
    onSuccess: (newAssignment, data) => {
      // Invalidate staff assignments
      queryClient.invalidateQueries({
        queryKey: patternAssignmentKeys.byStaff(data.staffMemberId),
      });

      // Invalidate pattern assignments
      queryClient.invalidateQueries({
        queryKey: patternAssignmentKeys.byPattern(data.patternTemplateId),
      });

      // Invalidate pattern summaries
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.summaries() });

      // Add to cache
      queryClient.setQueryData(
        patternAssignmentKeys.detail(newAssignment.cp365_staffpatternassignmentid),
        newAssignment
      );
    },
    onError: (error) => {
      console.error('[PatternAssignments] Failed to assign:', error);
    },
  });
}

/**
 * Hook to update a pattern assignment
 */
export function useUpdatePatternAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssignmentFormData> }) =>
      updatePatternAssignment(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate the specific assignment
      queryClient.invalidateQueries({ queryKey: patternAssignmentKeys.detail(id) });

      // Invalidate all assignment lists (we don't know which staff/pattern this belongs to)
      queryClient.invalidateQueries({ queryKey: patternAssignmentKeys.lists() });
    },
    onError: (error) => {
      console.error('[PatternAssignments] Failed to update:', error);
    },
  });
}

/**
 * Hook to end a pattern assignment
 */
export function useEndPatternAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      endPatternAssignment(id, endDate),
    onSuccess: (_, { id }) => {
      // Invalidate the specific assignment
      queryClient.invalidateQueries({ queryKey: patternAssignmentKeys.detail(id) });

      // Invalidate all assignment lists
      queryClient.invalidateQueries({ queryKey: patternAssignmentKeys.lists() });

      // Invalidate pattern summaries
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.summaries() });
    },
    onError: (error) => {
      console.error('[PatternAssignments] Failed to end:', error);
    },
  });
}

/**
 * Hook to delete a pattern assignment
 */
export function useDeletePatternAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePatternAssignment(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: patternAssignmentKeys.detail(id) });

      // Invalidate all assignment lists
      queryClient.invalidateQueries({ queryKey: patternAssignmentKeys.lists() });

      // Invalidate pattern summaries
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.summaries() });
    },
    onError: (error) => {
      console.error('[PatternAssignments] Failed to delete:', error);
    },
  });
}

/**
 * Hook to bulk assign a pattern to multiple staff members
 */
export function useBulkAssignPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: BulkAssignmentOptions) => bulkAssignPattern(options),
    onSuccess: (result, _options) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: patternAssignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.summaries() });

      if (result.errors.length > 0) {
        console.warn(
          `[PatternAssignments] Assigned to ${result.created.length}, ${result.errors.length} failed.`
        );
      }
    },
    onError: (error) => {
      console.error('[PatternAssignments] Failed to bulk assign:', error);
    },
  });
}
