/**
 * Shift Swap Repository
 *
 * Data access layer for shift swap operations.
 * Supports both residential shifts and domiciliary visits.
 */

import type { Repository } from './baseRepository';
import type {
  ShiftSwap,
  CreateSwapRequest,
  SwapApprovalResult,
  PendingSwapsFilter,
  PendingSwapsSummary,
  StaffSwapUsage,
} from '@/types/shiftSwap';
import type { DateRange } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';

// =============================================================================
// INTERFACE
// =============================================================================

/**
 * Extended repository interface for shift swaps
 */
export interface ShiftSwapRepository extends Repository<ShiftSwap> {
  /**
   * Get pending swaps for a location (manager view)
   */
  getPendingForLocation(locationId: string, filter?: PendingSwapsFilter): Promise<ShiftSwap[]>;

  /**
   * Get swaps for a specific staff member
   */
  getByStaffMember(staffMemberId: string, dateRange?: DateRange): Promise<ShiftSwap[]>;

  /**
   * Get swaps awaiting manager approval
   */
  getAwaitingApproval(locationId?: string): Promise<ShiftSwap[]>;

  /**
   * Get swap count summary for badge display
   */
  getPendingSummary(locationId?: string): Promise<PendingSwapsSummary>;

  /**
   * Get staff member's swap usage for the current month
   */
  getStaffSwapUsage(staffMemberId: string): Promise<StaffSwapUsage>;

  /**
   * Create a new swap request
   */
  createSwapRequest(request: CreateSwapRequest): Promise<ShiftSwap>;

  /**
   * Approve a swap request
   */
  approve(swapId: string, managerNotes?: string): Promise<SwapApprovalResult>;

  /**
   * Reject a swap request
   */
  reject(swapId: string, managerNotes: string): Promise<SwapApprovalResult>;

  /**
   * Cancel a swap request (by initiator)
   */
  cancel(swapId: string, reason?: string): Promise<SwapApprovalResult>;

  /**
   * Accept a swap request (by recipient)
   */
  acceptAsRecipient(swapId: string, notes?: string): Promise<SwapApprovalResult>;

  /**
   * Decline a swap request (by recipient)
   */
  declineAsRecipient(swapId: string, reason: string): Promise<SwapApprovalResult>;
}

// =============================================================================
// REPOSITORY IMPLEMENTATION LOADING
// =============================================================================

// Import implementations
import { DummyShiftSwapRepository } from './dummy/shiftSwapRepository';
import { DataverseShiftSwapRepository } from './dataverse/shiftSwapRepository';

// Create lazy-loaded instance
let _repository: ShiftSwapRepository | null = null;

/**
 * Get the shift swap repository instance
 */
export function getShiftSwapRepository(): ShiftSwapRepository {
  if (!_repository) {
    if (dataSource.type === 'dataverse') {
      _repository = new DataverseShiftSwapRepository();
    } else {
      _repository = new DummyShiftSwapRepository();
    }
  }
  return _repository;
}

/**
 * Export singleton instance
 */
export const shiftSwapRepository = {
  get instance(): ShiftSwapRepository {
    return getShiftSwapRepository();
  },
};
