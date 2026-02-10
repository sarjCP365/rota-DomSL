/**
 * useDailyViewData Hook
 * Specialised hook for Daily View with real-time updates
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 13
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { getRotaGridData, type RotaGridData } from '@/api/dataverse/shifts';
import { useAuthStore } from '@/store/authStore';
import type { ShiftViewData } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

interface DailyViewDataParams {
  sublocationId: string | undefined;
  selectedDate: Date;
  rotaId?: string;
  enabled?: boolean;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  autoRefreshInterval?: number;
}

interface DailyViewDataResult {
  /** All shifts for the selected date */
  shifts: ShiftViewData[];
  /** Staff list from rota */
  staff: Array<{
    'Staff Member ID': string;
    'Staff Member Name': string;
    'Job Title Name': string | null;
  }>;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether data is being refreshed in background */
  isRefreshing: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Last successful update time */
  lastUpdated: Date | null;
  /** Human-readable last updated string */
  lastUpdatedText: string;
  /** Manual refresh function */
  refetch: () => void;
  /** Whether auto-refresh is enabled */
  isAutoRefreshEnabled: boolean;
  /** Toggle auto-refresh */
  setAutoRefreshEnabled: (enabled: boolean) => void;
  /** Whether the page is visible */
  isPageVisible: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_REFRESH_INTERVAL = 60000; // 60 seconds
const STALE_TIME = 30000; // 30 seconds

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDailyViewData({
  sublocationId,
  selectedDate,
  rotaId,
  enabled = true,
  autoRefreshInterval = DEFAULT_REFRESH_INTERVAL,
}: DailyViewDataParams): DailyViewDataResult {
  const queryClient = useQueryClient();
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);

  // Local state
  const [isAutoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefreshInterval > 0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('Never');

  // -------------------------------------------------------------------------
  // Page visibility tracking
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);

      // Refetch when page becomes visible again if auto-refresh is enabled
      if (visible && isAutoRefreshEnabled) {
        queryClient.invalidateQueries({
          queryKey: ['dailyViewData', sublocationId, format(selectedDate, 'yyyy-MM-dd')],
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient, sublocationId, selectedDate, isAutoRefreshEnabled]);

  // -------------------------------------------------------------------------
  // Update "last updated" text periodically
  // -------------------------------------------------------------------------

  useEffect(() => {
    const updateLastUpdatedText = () => {
      if (lastUpdated) {
        setLastUpdatedText(formatDistanceToNow(lastUpdated, { addSuffix: true }));
      }
    };

    // Update immediately
    updateLastUpdatedText();

    // Update every 30 seconds
    const interval = setInterval(updateLastUpdatedText, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // -------------------------------------------------------------------------
  // Main data query
  // -------------------------------------------------------------------------

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['dailyViewData', sublocationId, dateStr, rotaId],
    queryFn: async (): Promise<RotaGridData | null> => {
      if (!sublocationId) return null;

      try {
        // Fetch 1 day of data (use duration 7 to get context, then filter)
        const data = await getRotaGridData(sublocationId, selectedDate, 7, rotaId, false);
        return data;
      } catch (error) {
        console.error('[useDailyViewData] Error fetching data:', error);
        throw error;
      }
    },
    enabled: enabled && !!sublocationId && isDataverseReady,
    staleTime: STALE_TIME,
    // Only auto-refresh when page is visible and auto-refresh is enabled
    refetchInterval: isAutoRefreshEnabled && isPageVisible ? autoRefreshInterval : false,
    refetchOnWindowFocus: false,
    // Track successful fetches
    meta: {
      onSuccess: () => {
        setLastUpdated(new Date());
      },
    },
  });

  // Note: lastUpdated is updated via onSuccess callback in the query options

  // -------------------------------------------------------------------------
  // Filter shifts for selected date
  // -------------------------------------------------------------------------

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const shiftsForDate = useMemo(() => {
    if (!query.data?.shifts) return [];

    return query.data.shifts.filter((shift) => {
      const shiftDate = shift['Shift Date'];
      if (!shiftDate) return false;
      const shiftDateStr = format(new Date(shiftDate), 'yyyy-MM-dd');
      return shiftDateStr === dateStr;
    });
  }, [query.data?.shifts, dateStr]);

  // -------------------------------------------------------------------------
  // Manual refetch
  // -------------------------------------------------------------------------

  const refetch = useCallback(() => {
    query.refetch();
  }, [query]);

  // -------------------------------------------------------------------------
  // Return result
  // -------------------------------------------------------------------------

  return {
    shifts: shiftsForDate,
    staff: query.data?.staff || [],
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error,
    lastUpdated,
    lastUpdatedText,
    refetch,
    isAutoRefreshEnabled,
    setAutoRefreshEnabled,
    isPageVisible,
  };
}

// =============================================================================
// useLastUpdatedIndicator Hook
// =============================================================================

interface LastUpdatedIndicatorResult {
  text: string;
  isStale: boolean;
  refresh: () => void;
  isRefreshing: boolean;
}

/**
 * Hook to manage the "Last updated" indicator
 */
export function useLastUpdatedIndicator(
  lastUpdated: Date | null,
  isRefreshing: boolean,
  refetch: () => void,
  staleThreshold: number = 120000 // 2 minutes
): LastUpdatedIndicatorResult {
  const [text, setText] = useState('Never');
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!lastUpdated) {
        setText('Never');
        setIsStale(true);
        return;
      }

      const now = new Date();
      const diff = now.getTime() - lastUpdated.getTime();
      setIsStale(diff > staleThreshold);
      setText(formatDistanceToNow(lastUpdated, { addSuffix: true }));
    };

    update();
    const interval = setInterval(update, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [lastUpdated, staleThreshold]);

  return {
    text,
    isStale,
    refresh: refetch,
    isRefreshing,
  };
}

export default useDailyViewData;
