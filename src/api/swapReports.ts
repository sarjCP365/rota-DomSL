/**
 * Swap Reports API
 *
 * API functions for fetching shift swap history and generating reports.
 * PROMPT 10 from CURSOR-SHIFT-SWAP-DESKTOP-PROMPTS.md
 */

import type { ShiftSwap, ShiftSwapStatus, StaffSwapUsage } from '@/types/shiftSwap';
import { getShiftSwapRepository } from '@/repositories/shiftSwapRepository';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { DEFAULT_SWAP_CONFIGURATION } from '@/types/configuration';
import { getSwapConfiguration } from '@/services/configurationService';

// =============================================================================
// TYPES
// =============================================================================

export interface SwapHistoryQuery {
  dateFrom: string;
  dateTo: string;
  status?: ShiftSwapStatus[];
  staffMemberId?: string;
  locationId?: string;
}

export interface SwapHistorySummary {
  total: number;
  approved: number;
  rejectedByRecipient: number;
  rejectedByManager: number;
  cancelled: number;
  expired: number;
  avgProcessingHours: number;
  advanceNoticeBreaches: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch swap history with filters
 */
export async function getSwapHistory(query: SwapHistoryQuery): Promise<ShiftSwap[]> {
  const repository = getShiftSwapRepository();
  const allSwaps = await repository.getAll();

  // Filter by date range
  const filteredSwaps = allSwaps.filter((swap) => {
    try {
      const swapDate = parseISO(swap.createdon);
      const fromDate = parseISO(query.dateFrom);
      const toDate = parseISO(query.dateTo);
      
      if (!isWithinInterval(swapDate, { start: fromDate, end: toDate })) {
        return false;
      }
    } catch {
      return true; // Include if date parsing fails
    }

    // Filter by status
    if (query.status && query.status.length > 0) {
      if (!query.status.includes(swap.cp365_requeststatus)) {
        return false;
      }
    }

    // Filter by staff member (as initiator or recipient)
    if (query.staffMemberId) {
      if (
        swap._cp365_requestfrom_value !== query.staffMemberId &&
        swap._cp365_requestto_value !== query.staffMemberId
      ) {
        return false;
      }
    }

    // Filter by location
    if (query.locationId) {
      if (swap._cp365_location_value !== query.locationId) {
        return false;
      }
    }

    return true;
  });

  // Sort by date descending (newest first)
  return filteredSwaps.sort((a, b) => {
    return new Date(b.createdon).getTime() - new Date(a.createdon).getTime();
  });
}

/**
 * Get summary statistics for swap history
 */
export async function getSwapSummary(query: SwapHistoryQuery): Promise<SwapHistorySummary> {
  const swaps = await getSwapHistory(query);

  const { ShiftSwapStatus } = await import('../types/shiftSwap');

  const approved = swaps.filter((s) => s.cp365_requeststatus === ShiftSwapStatus.Approved);
  const rejectedByRecipient = swaps.filter(
    (s) => s.cp365_requeststatus === ShiftSwapStatus.RejectedByRecipient
  );
  const rejectedByManager = swaps.filter(
    (s) => s.cp365_requeststatus === ShiftSwapStatus.RejectedByManager
  );
  const cancelled = swaps.filter((s) => s.cp365_requeststatus === ShiftSwapStatus.Cancelled);
  const expired = swaps.filter((s) => s.cp365_requeststatus === ShiftSwapStatus.Expired);
  const advanceNoticeBreaches = swaps.filter((s) => s.cp365_advancenoticebreached).length;

  // Calculate average processing time for approved swaps
  let totalProcessingHours = 0;
  let processedCount = 0;

  for (const swap of approved) {
    if (swap.cp365_approveddate) {
      try {
        const created = new Date(swap.createdon);
        const approved = new Date(swap.cp365_approveddate);
        const hours = (approved.getTime() - created.getTime()) / (1000 * 60 * 60);
        totalProcessingHours += hours;
        processedCount++;
      } catch {
        // Skip if dates are invalid
      }
    }
  }

  const avgProcessingHours = processedCount > 0 ? totalProcessingHours / processedCount : 0;

  return {
    total: swaps.length,
    approved: approved.length,
    rejectedByRecipient: rejectedByRecipient.length,
    rejectedByManager: rejectedByManager.length,
    cancelled: cancelled.length,
    expired: expired.length,
    avgProcessingHours: Math.round(avgProcessingHours * 10) / 10,
    advanceNoticeBreaches,
  };
}

/**
 * Get staff swap usage for a location in a given month
 */
export async function getStaffSwapUsage(
  locationId: string | undefined,
  month: Date
): Promise<StaffSwapUsage[]> {
  const repository = getShiftSwapRepository();
  const [allSwaps, configResult] = await Promise.all([
    repository.getAll(),
    getSwapConfiguration().catch((): typeof DEFAULT_SWAP_CONFIGURATION => DEFAULT_SWAP_CONFIGURATION),
  ]);

  const config = configResult as { monthlyLimitPerStaff: number; [key: string]: unknown };
  const { ShiftSwapStatus } = await import('../types/shiftSwap');
  const monthlyLimit: number = config.monthlyLimitPerStaff;

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Filter swaps to the month
  const monthSwaps = allSwaps.filter((swap) => {
    try {
      const swapDate = parseISO(swap.createdon);
      if (!isWithinInterval(swapDate, { start: monthStart, end: monthEnd })) {
        return false;
      }
    } catch {
      return false;
    }

    // Filter by location if provided
    if (locationId && swap._cp365_location_value !== locationId) {
      return false;
    }

    // Only count pending or approved swaps
    return [
      ShiftSwapStatus.AwaitingRecipient,
      ShiftSwapStatus.AwaitingManagerApproval,
      ShiftSwapStatus.Approved,
    ].includes(swap.cp365_requeststatus);
  });

  // Count swaps per staff member (as initiator)
  const staffUsageMap = new Map<string, { name: string; count: number }>();

  for (const swap of monthSwaps) {
    const staffId = swap._cp365_requestfrom_value;
    const staffName = swap.requestFromName || 'Unknown';

    const existing = staffUsageMap.get(staffId);
    if (existing) {
      existing.count++;
    } else {
      staffUsageMap.set(staffId, { name: staffName, count: 1 });
    }
  }

  // Convert to array and sort by count descending
  const usage: StaffSwapUsage[] = Array.from(staffUsageMap.entries()).map(([staffId, data]) => ({
    staffMemberId: staffId,
    staffName: data.name,
    swapsThisMonth: data.count,
    monthlyLimit,
    limitReached: data.count >= monthlyLimit,
  }));

  return usage.sort((a, b) => b.swapsThisMonth - a.swapsThisMonth);
}

/**
 * Export swap history to Excel (returns a Blob)
 */
export async function exportSwapHistory(query: SwapHistoryQuery): Promise<Blob> {
  const swaps = await getSwapHistory(query);
  const { getSwapStatusDisplayText, getSwapAssignments } = await import('../types/shiftSwap');

  // Build CSV content
  const headers = [
    'Date',
    'Initiator',
    'Recipient',
    'Initiator Shift Date',
    'Initiator Shift Time',
    'Recipient Shift Date',
    'Recipient Shift Time',
    'Status',
    'Urgent',
    'Processing Time (hours)',
    'Initiator Notes',
    'Recipient Notes',
    'Manager Notes',
  ];

  const rows = swaps.map((swap) => {
    const { giving, receiving } = getSwapAssignments(swap);
    
    // Calculate processing time
    let processingHours = '';
    if (swap.cp365_approveddate) {
      try {
        const created = new Date(swap.createdon);
        const approved = new Date(swap.cp365_approveddate);
        const hours = (approved.getTime() - created.getTime()) / (1000 * 60 * 60);
        processingHours = hours.toFixed(1);
      } catch {
        processingHours = '';
      }
    }

    return [
      format(parseISO(swap.createdon), 'dd/MM/yyyy HH:mm'),
      swap.requestFromName || '',
      swap.requestToName || '',
      giving?.date || '',
      giving ? `${giving.startTime}-${giving.endTime}` : '',
      receiving?.date || '',
      receiving ? `${receiving.startTime}-${receiving.endTime}` : '',
      getSwapStatusDisplayText(swap.cp365_requeststatus),
      swap.cp365_advancenoticebreached ? 'Yes' : 'No',
      processingHours,
      (swap.cp365_notesfrominitiator || '').replace(/"/g, '""'),
      (swap.cp365_notesfromrecipient || '').replace(/"/g, '""'),
      (swap.cp365_managernotes || '').replace(/"/g, '""'),
    ];
  });

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
}
