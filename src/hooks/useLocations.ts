/**
 * useLocations Hook
 * Data fetching hooks for locations, sublocations, and rotas
 */

import { useQuery } from '@tanstack/react-query';
import {
  getLocations,
  getLocationById,
  getSublocations,
  getAllSublocations,
  getSublocationById,
  getRotas,
  getRotaById,
  getActiveRotaForSublocation,
} from '../api/dataverse/locations';
import { useAuthStore } from '../store/authStore';

/**
 * Fetch all active locations
 */
export function useLocations() {
  // Use reactive state from store instead of direct client check
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);
  
  console.log('[useLocations] Hook called, isDataverseReady:', isDataverseReady);
  
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      console.log('[useLocations] queryFn executing...');
      const result = await getLocations();
      console.log('[useLocations] queryFn result:', result);
      return result;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: isDataverseReady,
  });
}

/**
 * Fetch a single location by ID
 */
export function useLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location', locationId],
    queryFn: () => (locationId ? getLocationById(locationId) : null),
    enabled: !!locationId,
  });
}

/**
 * Fetch sublocations for a location
 */
export function useSublocations(locationId: string | undefined) {
  return useQuery({
    queryKey: ['sublocations', locationId],
    queryFn: () => (locationId ? getSublocations(locationId) : []),
    enabled: !!locationId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Fetch all sublocations across all locations
 */
export function useAllSublocations() {
  return useQuery({
    queryKey: ['sublocations', 'all'],
    queryFn: getAllSublocations,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Fetch a single sublocation by ID
 */
export function useSublocation(sublocationId: string | undefined) {
  return useQuery({
    queryKey: ['sublocation', sublocationId],
    queryFn: () => (sublocationId ? getSublocationById(sublocationId) : null),
    enabled: !!sublocationId,
  });
}

/**
 * Fetch rotas for a sublocation
 */
export function useRotas(sublocationId: string | undefined) {
  return useQuery({
    queryKey: ['rotas', sublocationId],
    queryFn: () => (sublocationId ? getRotas(sublocationId) : []),
    enabled: !!sublocationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single rota by ID
 */
export function useRota(rotaId: string | undefined) {
  return useQuery({
    queryKey: ['rota', rotaId],
    queryFn: () => (rotaId ? getRotaById(rotaId) : null),
    enabled: !!rotaId,
  });
}

/**
 * Fetch the active rota for a sublocation
 */
export function useActiveRota(sublocationId: string | undefined) {
  return useQuery({
    queryKey: ['activeRota', sublocationId],
    queryFn: () => (sublocationId ? getActiveRotaForSublocation(sublocationId) : null),
    enabled: !!sublocationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

