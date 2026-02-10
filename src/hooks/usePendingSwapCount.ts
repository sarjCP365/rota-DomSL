/**
 * usePendingSwapCount Hook
 *
 * Fetches and provides the count of pending swap requests
 * for display in the navigation badge.
 */

import { useQuery } from '@tanstack/react-query';
import { getShiftSwapRepository } from '@/repositories/shiftSwapRepository';
import type { PendingSwapsSummary } from '@/types/shiftSwap';
import { ShiftSwapStatus } from '@/types/shiftSwap';

/**
 * Hook return type
 */
export interface PendingSwapCountResult {
  /** Number of shift swaps awaiting approval */
  shiftSwapCount: number;
  /** Number of visit swaps awaiting approval */
  visitSwapCount: number;
  /** Total pending count */
  totalCount: number;
  /** Whether any have advance notice breached (urgent) */
  hasUrgent: boolean;
  /** Number with advance notice breached */
  urgentCount: number;
  /** Full summary data */
  summary: PendingSwapsSummary | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Default stale time for badge count (30 seconds)
 */
const BADGE_STALE_TIME = 30 * 1000;

/**
 * Default refetch interval (60 seconds for background refresh)
 */
const BADGE_REFETCH_INTERVAL = 60 * 1000;

/**
 * Hook to get pending swap counts for navigation badge
 *
 * @param locationId - Optional location filter
 * @param sublocationId - Optional sublocation filter
 */
export function usePendingSwapCount(
  locationId?: string,
  sublocationId?: string
): PendingSwapCountResult {
  const repository = getShiftSwapRepository();

  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pendingSwapsSummary', locationId, sublocationId],
    queryFn: () => repository.getPendingSummary(locationId),
    staleTime: BADGE_STALE_TIME,
    refetchInterval: BADGE_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  return {
    shiftSwapCount: summary?.byType.shifts ?? 0,
    visitSwapCount: summary?.byType.visits ?? 0,
    totalCount: summary?.awaitingApproval ?? 0,
    hasUrgent: (summary?.advanceNoticeBreached ?? 0) > 0,
    urgentCount: summary?.advanceNoticeBreached ?? 0,
    summary: summary ?? null,
    isLoading,
    error: error,
    refetch,
  };
}

/**
 * Hook to get all pending swaps (not just count)
 *
 * Used by the Requests list view
 */
export function usePendingSwaps(locationId?: string) {
  const repository = getShiftSwapRepository();

  return useQuery({
    queryKey: ['pendingSwaps', locationId],
    queryFn: () => repository.getPendingForLocation(locationId || '', {
      status: [
        ShiftSwapStatus.AwaitingRecipient,
        ShiftSwapStatus.AwaitingManagerApproval,
      ],
    }),
    staleTime: BADGE_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get swaps awaiting manager approval only
 */
export function useAwaitingApprovalSwaps(locationId?: string) {
  const repository = getShiftSwapRepository();

  return useQuery({
    queryKey: ['awaitingApprovalSwaps', locationId],
    queryFn: () => repository.getAwaitingApproval(locationId),
    staleTime: BADGE_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get a single swap by ID
 */
export function useSwapDetail(swapId: string | null) {
  const repository = getShiftSwapRepository();

  return useQuery({
    queryKey: ['swapDetail', swapId],
    queryFn: () => repository.getById(swapId!),
    enabled: !!swapId,
    staleTime: 10 * 1000, // More frequent updates for detail view
  });
}

/**
 * Hook to get staff member's swap usage
 */
export function useStaffSwapUsage(staffMemberId: string | null) {
  const repository = getShiftSwapRepository();

  return useQuery({
    queryKey: ['staffSwapUsage', staffMemberId],
    queryFn: () => repository.getStaffSwapUsage(staffMemberId!),
    enabled: !!staffMemberId,
    staleTime: 60 * 1000, // Usage doesn't change frequently
  });
}
