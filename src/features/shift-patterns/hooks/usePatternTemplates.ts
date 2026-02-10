/**
 * CarePoint 365 - Pattern Templates React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPatternTemplates,
  fetchPatternTemplateById,
  createPatternTemplate,
  updatePatternTemplate,
  deletePatternTemplate,
  clonePatternTemplate,
  archivePatternTemplate,
  restorePatternTemplate,
  getPatternAssignmentSummaries,
} from '../api/patternTemplates';
import type { PatternFormData, PatternTemplateFilters } from '../types';
// Note: Add react-toastify or similar library for proper notifications

/**
 * Query key factory for pattern templates
 */
export const patternTemplateKeys = {
  all: ['patternTemplates'] as const,
  lists: () => [...patternTemplateKeys.all, 'list'] as const,
  list: (filters?: PatternTemplateFilters) => [...patternTemplateKeys.lists(), filters] as const,
  details: () => [...patternTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...patternTemplateKeys.details(), id] as const,
  summaries: () => [...patternTemplateKeys.all, 'summaries'] as const,
};

/**
 * Hook to fetch all pattern templates
 */
export function usePatternTemplates(filters?: PatternTemplateFilters) {
  return useQuery({
    queryKey: patternTemplateKeys.list(filters),
    queryFn: () => fetchPatternTemplates(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single pattern template with its days
 */
export function usePatternTemplate(id: string | undefined) {
  return useQuery({
    queryKey: patternTemplateKeys.detail(id!),
    queryFn: () => fetchPatternTemplateById(id!),
    enabled: !!id,
    staleTime: 0, // Always fetch fresh data for editing
  });
}

/**
 * Hook to get pattern assignment summaries
 */
export function usePatternAssignmentSummaries() {
  return useQuery({
    queryKey: patternTemplateKeys.summaries(),
    queryFn: () => getPatternAssignmentSummaries(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new pattern template
 */
export function useCreatePatternTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatternFormData) => createPatternTemplate(data),
    onSuccess: (newTemplate) => {
      // Invalidate the templates list
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.lists() });

      // Add the new template to the cache
      queryClient.setQueryData(
        patternTemplateKeys.detail(newTemplate.cp365_shiftpatterntemplatenewid),
        newTemplate
      );
    },
    onError: (error) => {
      console.error('[PatternTemplates] Failed to create:', error);
    },
  });
}

/**
 * Hook to update a pattern template
 */
export function useUpdatePatternTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatternFormData> }) =>
      updatePatternTemplate(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate the specific template and the list
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.lists() });
    },
    onError: (error) => {
      console.error('[PatternTemplates] Failed to update:', error);
    },
  });
}

/**
 * Hook to delete a pattern template
 */
export function useDeletePatternTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePatternTemplate(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: patternTemplateKeys.detail(id) });

      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.lists() });
    },
    onError: (error) => {
      console.error('[PatternTemplates] Failed to delete:', error);
    },
  });
}

/**
 * Hook to clone a pattern template
 */
export function useClonePatternTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId, newName }: { sourceId: string; newName: string }) =>
      clonePatternTemplate(sourceId, newName),
    onSuccess: (newTemplate) => {
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.lists() });

      // Add the new template to the cache
      queryClient.setQueryData(
        patternTemplateKeys.detail(newTemplate.cp365_shiftpatterntemplatenewid),
        newTemplate
      );
    },
    onError: (error) => {
      console.error('[PatternTemplates] Failed to clone:', error);
    },
  });
}

/**
 * Hook to archive a pattern template
 */
export function useArchivePatternTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archivePatternTemplate(id),
    onSuccess: (_, id) => {
      // Invalidate both the specific template and the list
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.lists() });
    },
    onError: (error) => {
      console.error('[PatternTemplates] Failed to archive:', error);
    },
  });
}

/**
 * Hook to restore an archived pattern template
 */
export function useRestorePatternTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restorePatternTemplate(id),
    onSuccess: (_, id) => {
      // Invalidate both the specific template and the list
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: patternTemplateKeys.lists() });
    },
    onError: (error) => {
      console.error('[PatternTemplates] Failed to restore:', error);
    },
  });
}
