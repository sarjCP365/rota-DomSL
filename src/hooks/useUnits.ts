/**
 * useUnits Hook
 * Data fetching hooks for units and team-unit relationships
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnitsByLocation,
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deactivateUnit,
  getTeamsForUnit,
  getUnassignedTeams,
  assignTeamToUnit,
  assignUnitToShift,
  getUnitsWithStats,
} from '../api/dataverse/units';
import { useAuthStore } from '../store/authStore';
import type { Unit } from '../api/dataverse/types';

// =============================================================================
// UNIT QUERY HOOKS
// =============================================================================

/**
 * Fetch all active units for a location
 */
export function useUnitsByLocation(locationId: string | undefined) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  return useQuery({
    queryKey: ['units', 'byLocation', locationId],
    queryFn: () => (locationId ? getUnitsByLocation(locationId) : []),
    enabled: isDataverseReady && !!locationId,
    staleTime: 1000 * 60 * 10, // 10 minutes - units change infrequently
  });
}

/**
 * Fetch all active units across all locations
 */
export function useAllUnits() {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  return useQuery({
    queryKey: ['units', 'all'],
    queryFn: getAllUnits,
    enabled: isDataverseReady,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Fetch a single unit by ID
 */
export function useUnit(unitId: string | undefined) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  return useQuery({
    queryKey: ['unit', unitId],
    queryFn: () => (unitId ? getUnitById(unitId) : null),
    enabled: isDataverseReady && !!unitId,
  });
}

/**
 * Fetch units with aggregated statistics for the rota view
 */
export function useUnitsWithStats(
  locationId: string | undefined,
  sublocationId: string | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  return useQuery({
    queryKey: ['units', 'withStats', locationId, sublocationId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => {
      if (!locationId || !sublocationId || !startDate || !endDate) {
        return [];
      }
      return getUnitsWithStats(locationId, sublocationId, startDate, endDate);
    },
    enabled: isDataverseReady && !!locationId && !!sublocationId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 2, // 2 minutes - stats may change more frequently
  });
}

// =============================================================================
// UNIT MUTATION HOOKS
// =============================================================================

/**
 * Create a new unit
 */
export function useCreateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (unit: Partial<Unit>) => createUnit(unit),
    onSuccess: (newUnit) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['units'] });
      console.log('[useCreateUnit] Unit created successfully:', newUnit.cp365_unitid);
    },
    onError: (error) => {
      console.error('[useCreateUnit] Failed to create unit:', error);
    },
  });
}

/**
 * Update an existing unit
 */
export function useUpdateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ unitId, unit }: { unitId: string; unit: Partial<Unit> }) =>
      updateUnit(unitId, unit),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit', variables.unitId] });
      console.log('[useUpdateUnit] Unit updated successfully:', variables.unitId);
    },
    onError: (error) => {
      console.error('[useUpdateUnit] Failed to update unit:', error);
    },
  });
}

/**
 * Deactivate a unit
 */
export function useDeactivateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (unitId: string) => deactivateUnit(unitId),
    onSuccess: (_, unitId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      console.log('[useDeactivateUnit] Unit deactivated successfully:', unitId);
    },
    onError: (error) => {
      console.error('[useDeactivateUnit] Failed to deactivate unit:', error);
    },
  });
}

// =============================================================================
// TEAM-UNIT HOOKS
// =============================================================================

/**
 * Fetch teams for a specific unit
 */
export function useTeamsForUnit(unitId: string | undefined) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  return useQuery({
    queryKey: ['teams', 'byUnit', unitId],
    queryFn: () => (unitId ? getTeamsForUnit(unitId) : []),
    enabled: isDataverseReady && !!unitId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch teams that are not assigned to any unit
 */
export function useUnassignedTeams(locationId: string | undefined) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  return useQuery({
    queryKey: ['teams', 'unassigned', locationId],
    queryFn: () => (locationId ? getUnassignedTeams(locationId) : []),
    enabled: isDataverseReady && !!locationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Assign or unassign a team to/from a unit
 */
export function useAssignTeamToUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, unitId }: { teamId: string; unitId: string | null }) =>
      assignTeamToUnit(teamId, unitId),
    onSuccess: (_, variables) => {
      // Invalidate team queries
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      // Invalidate unit stats if we know the unit
      if (variables.unitId) {
        queryClient.invalidateQueries({ queryKey: ['units', 'withStats'] });
      }
      console.log('[useAssignTeamToUnit] Team assignment updated successfully');
    },
    onError: (error) => {
      console.error('[useAssignTeamToUnit] Failed to assign team to unit:', error);
    },
  });
}

// =============================================================================
// SHIFT-UNIT HOOKS
// =============================================================================

/**
 * Assign or unassign a unit to/from a shift
 */
export function useAssignUnitToShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shiftId, unitId }: { shiftId: string; unitId: string | null }) =>
      assignUnitToShift(shiftId, unitId),
    onSuccess: () => {
      // Invalidate shift and unit stats queries
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['rotaData'] });
      queryClient.invalidateQueries({ queryKey: ['units', 'withStats'] });
      console.log('[useAssignUnitToShift] Shift unit assignment updated successfully');
    },
    onError: (error) => {
      console.error('[useAssignUnitToShift] Failed to assign unit to shift:', error);
    },
  });
}

