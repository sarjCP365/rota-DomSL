/**
 * useHierarchicalRotaData Hook
 * Fetches hierarchical rota data (Unit > Team > Staff) for the Team View mode
 */

import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { fetchHierarchicalRotaData } from '@/api/dataverse/units';
import type { HierarchicalRotaData } from '@/api/dataverse/types';

// =============================================================================
// Hook Options
// =============================================================================

interface UseHierarchicalRotaDataOptions {
  /** Location ID to fetch data for */
  locationId: string | undefined;
  /** Sublocation ID to fetch data for */
  sublocationId: string | undefined;
  /** Rota ID (optional - for fetching shifts) */
  rotaId: string | undefined;
  /** Start date for the data range */
  startDate: Date;
  /** Duration in days (7, 14, or 28) */
  duration: number;
  /** Whether the query is enabled */
  enabled?: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to fetch hierarchical rota data for Team View
 * Returns Unit > Team > Staff structure with shifts and stats
 */
export function useHierarchicalRotaData({
  locationId,
  sublocationId,
  rotaId,
  startDate,
  duration,
  enabled = true,
}: UseHierarchicalRotaDataOptions) {
  const endDate = addDays(startDate, duration - 1);

  const query = useQuery<HierarchicalRotaData>({
    queryKey: [
      'hierarchicalRotaData',
      locationId,
      sublocationId,
      rotaId,
      format(startDate, 'yyyy-MM-dd'),
      duration,
    ],
    queryFn: async () => {
      if (!locationId || !sublocationId) {
        return {
          units: [],
          unassignedTeams: [],
          unassignedShifts: [],
          leaveData: [],
          stats: {
            totalShifts: 0,
            totalHours: 0,
            assignedShifts: 0,
            unassignedShifts: 0,
            publishedShifts: 0,
            unpublishedShifts: 0,
            staffOnLeave: 0,
            totalStaff: 0,
            coveragePercentage: 100,
          },
        };
      }

      const data = await fetchHierarchicalRotaData(
        locationId,
        sublocationId,
        rotaId,
        startDate,
        endDate
      );

      return data;
    },
    enabled: enabled && !!locationId && !!sublocationId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useHierarchicalRotaData;
