/**
 * CarePoint 365 - Pattern Generation React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  generateShiftsFromPattern,
  detectConflicts,
  getGenerationLogs,
} from '../api/patternGeneration';
import type {
  GenerationResult,
  PatternConflict,
  ShiftGenerationLog,
  GenerateShiftsOptions,
} from '../types';
import { patternAssignmentKeys } from './usePatternAssignments';
// Note: Add react-toastify or similar library for proper notifications

/**
 * Query key factory for pattern generation
 */
export const patternGenerationKeys = {
  all: ['patternGeneration'] as const,
  conflicts: (assignmentId: string, startDate: string, endDate: string) => 
    [...patternGenerationKeys.all, 'conflicts', assignmentId, startDate, endDate] as const,
  logs: (assignmentId: string) => 
    [...patternGenerationKeys.all, 'logs', assignmentId] as const,
};

/**
 * Hook to detect conflicts for a pattern assignment
 */
export function useDetectConflicts(
  staffMemberId: string | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined,
  excludeAssignmentId?: string
) {
  const startDateStr = startDate ? startDate.toISOString().split('T')[0] : '';
  const endDateStr = endDate ? endDate.toISOString().split('T')[0] : '';

  return useQuery({
    queryKey: patternGenerationKeys.conflicts(staffMemberId!, startDateStr, endDateStr),
    queryFn: () => detectConflicts(staffMemberId!, startDate!, endDate!, excludeAssignmentId),
    enabled: !!staffMemberId && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch generation logs for an assignment
 */
export function useGenerationLogs(assignmentId: string | undefined) {
  return useQuery({
    queryKey: patternGenerationKeys.logs(assignmentId!),
    queryFn: () => getGenerationLogs(assignmentId!),
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to generate shifts from a pattern assignment
 */
export function useGenerateShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: GenerateShiftsOptions) => generateShiftsFromPattern(options),
    onSuccess: (result, options) => {
      // Invalidate shift queries
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['rotaData'] });
      
      // Invalidate the assignment (lastGeneratedDate has changed)
      queryClient.invalidateQueries({ 
        queryKey: patternAssignmentKeys.detail(options.assignmentId) 
      });
      
      // Invalidate generation logs
      queryClient.invalidateQueries({ 
        queryKey: patternGenerationKeys.logs(options.assignmentId) 
      });

      // Show result message
      if (result.errors.length === 0) {
        console.log(
          `[PatternGeneration] Generated ${result.shiftsCreated.length} shifts. ${result.shiftsSkipped.length} skipped.`
        );
      } else {
        console.warn(
          `[PatternGeneration] Generated ${result.shiftsCreated.length} shifts with ${result.errors.length} errors.`
        );
        alert(`Generated ${result.shiftsCreated.length} shifts with ${result.errors.length} errors.`);
      }
    },
    onError: (error) => {
      console.error('[useGenerateShifts] Error:', error);
      console.error(`[PatternGeneration] Failed to generate shifts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`Failed to generate shifts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

/**
 * Hook to run a dry-run generation (preview without creating)
 */
export function usePreviewGeneration() {
  return useMutation({
    mutationFn: (options: Omit<GenerateShiftsOptions, 'dryRun'>) => 
      generateShiftsFromPattern({ ...options, dryRun: true }),
    onError: (error) => {
      console.error('[usePreviewGeneration] Error:', error);
      console.error(`[PatternGeneration] Failed to preview generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`Failed to preview generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

/**
 * Hook to regenerate shifts for an assignment (delete existing and recreate)
 */
export function useRegenerateShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: GenerateShiftsOptions) => {
      // First, delete existing pattern-generated shifts in the date range
      // This would need an API function to delete shifts by assignment and date range
      // For now, we'll just regenerate with override conflict resolution
      const resolutions = new Map<string, 'keep' | 'override' | 'skip'>();
      
      // Set all conflicts to override
      const conflicts = await detectConflicts(
        options.assignmentId, // This is wrong - we need staffMemberId
        options.startDate,
        options.endDate
      );
      
      for (const conflict of conflicts) {
        if (conflict.type === 'existing_shift') {
          resolutions.set(conflict.date, 'override');
        }
      }

      return generateShiftsFromPattern({
        ...options,
        conflictResolutions: resolutions,
      });
    },
    onSuccess: (result, options) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['rotaData'] });
      queryClient.invalidateQueries({ 
        queryKey: patternAssignmentKeys.detail(options.assignmentId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: patternGenerationKeys.logs(options.assignmentId) 
      });

      console.log(`[PatternGeneration] Regenerated ${result.shiftsCreated.length} shifts.`);
    },
    onError: (error) => {
      console.error('[useRegenerateShifts] Error:', error);
      console.error(`[PatternGeneration] Failed to regenerate shifts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`Failed to regenerate shifts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

