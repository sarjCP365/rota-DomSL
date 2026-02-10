/**
 * useRotaData Hook
 * Fetches rota data directly from Dataverse
 */

import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { getRotaGridData, type RotaGridData } from '@/api/dataverse/shifts';
import { useAuthStore } from '@/store/authStore';

interface RotaDataParams {
  sublocationId: string | undefined;
  startDate: Date;
  duration: 7 | 14 | 28;
  rotaId?: string;
  enabled?: boolean;
  /** When true, include shifts for staff from other sublocations (marked as external) */
  showExternalStaff?: boolean;
  /** When true, also fetch shifts from other rotas for staff who work at multiple locations */
  showOtherRotaShifts?: boolean;
}

/**
 * Hook to fetch rota data from Dataverse
 */
export function useRotaData({
  sublocationId,
  startDate,
  duration,
  rotaId,
  enabled = true,
  showExternalStaff = false,
  showOtherRotaShifts = false,
}: RotaDataParams) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);

  return useQuery({
    queryKey: [
      'rotaData',
      sublocationId,
      startDate.toISOString(),
      duration,
      rotaId,
      showExternalStaff,
      showOtherRotaShifts,
    ],
    queryFn: async (): Promise<RotaGridData | null> => {
      if (!sublocationId) {
        return null;
      }

      const data = await getRotaGridData(
        sublocationId,
        startDate,
        duration,
        rotaId,
        showExternalStaff,
        showOtherRotaShifts
      );
      return data;
    },
    enabled: enabled && !!sublocationId && isDataverseReady,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Get date range for a given start date and duration
 */
export function getDateRange(startDate: Date, duration: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < duration; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}
