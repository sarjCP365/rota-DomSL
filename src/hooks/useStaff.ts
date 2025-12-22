/**
 * useStaff Hooks
 * ==============
 * 
 * React Query hooks for fetching and mutating staff data.
 * 
 * Usage Guide:
 * - useStaffForSublocation: Primary hook for getting staff assigned to a sublocation
 * - useStaffMember: Get a single staff member by ID
 * - useAllStaffMembers: Get all staff members (for admin screens)
 * 
 * @module useStaff
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStaffForSublocation,
  getStaffViewDataForSublocation,
  getStaffMemberById,
  getAllStaffMembers,
  createStaffMember,
  updateStaffMember,
  // Legacy compatibility
  getStaffMembers,
  getSublocationStaff,
} from '../api/dataverse/staff';
import type { StaffMember, SublocationStaffViewData } from '../api/dataverse/types';

// =============================================================================
// PRIMARY HOOKS - USE THESE
// =============================================================================

/**
 * Hook to get staff members for a sublocation.
 * 
 * This is the PRIMARY hook for fetching staff by location.
 * Uses the cp365_sublocationstaffs junction table correctly.
 * 
 * @param sublocationId - The sublocation GUID
 * @param options - Optional configuration
 * @param options.activeOnly - If true, only return active staff
 * @returns React Query result with StaffMember[] data
 * 
 * @example
 * ```tsx
 * function StaffDropdown({ sublocationId }) {
 *   const { data: staff, isLoading } = useStaffForSublocation(sublocationId);
 *   
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <select>
 *       {staff?.map(s => (
 *         <option key={s.cp365_staffmemberid} value={s.cp365_staffmemberid}>
 *           {s.cp365_forename} {s.cp365_surname}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useStaffForSublocation(
  sublocationId: string | undefined,
  options: { activeOnly?: boolean } = {}
) {
  return useQuery({
    queryKey: ['staff', 'sublocation', sublocationId, options],
    queryFn: () => (sublocationId ? getStaffForSublocation(sublocationId, options) : []),
    enabled: !!sublocationId,
  });
}

/**
 * Hook to get staff view data for a sublocation (for RotaGrid display).
 * 
 * Returns SublocationStaffViewData format with display-friendly fields.
 * 
 * @param sublocationId - The sublocation GUID
 * @returns React Query result with SublocationStaffViewData[] data
 */
export function useStaffViewDataForSublocation(sublocationId: string | undefined) {
  return useQuery({
    queryKey: ['staff', 'sublocation', 'viewData', sublocationId],
    queryFn: () => (sublocationId ? getStaffViewDataForSublocation(sublocationId) : []),
    enabled: !!sublocationId,
  });
}

/**
 * Hook to get a single staff member by ID.
 * 
 * @param staffId - The staff member GUID
 * @returns React Query result with StaffMember data
 */
export function useStaffMember(staffId: string | undefined) {
  return useQuery({
    queryKey: ['staff', 'member', staffId],
    queryFn: () => (staffId ? getStaffMemberById(staffId) : null),
    enabled: !!staffId,
  });
}

/**
 * Hook to get all staff members (for admin/reporting).
 * 
 * @param options - Optional filters
 * @returns React Query result with StaffMember[] data
 */
export function useAllStaffMembers(options: { activeOnly?: boolean } = { activeOnly: true }) {
  return useQuery({
    queryKey: ['staff', 'all', options],
    queryFn: () => getAllStaffMembers(options),
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook to create a new staff member.
 * @todo Implement when staff management features are built
 */
export function useCreateStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<StaffMember>) => createStaffMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

/**
 * Hook to update an existing staff member.
 * @todo Implement when staff management features are built
 */
export function useUpdateStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staffId, data }: { staffId: string; data: Partial<StaffMember> }) =>
      updateStaffMember(staffId, data),
    onSuccess: (_, { staffId }) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'member', staffId] });
    },
  });
}

// =============================================================================
// LEGACY COMPATIBILITY HOOKS
// =============================================================================

/**
 * @deprecated Use useStaffForSublocation instead.
 * 
 * This hook is kept for backwards compatibility with existing components.
 * It delegates to getStaffMembers which handles sublocation filtering correctly.
 */
export function useStaffMembers(sublocationId?: string) {
  return useQuery({
    queryKey: ['staff', { sublocationId }],
    queryFn: () => getStaffMembers(sublocationId),
  });
}

/**
 * @deprecated Use useStaffForSublocation instead.
 * 
 * This hook is a stub that delegates to getStaffForSublocation.
 */
export function useSublocationStaff(
  sublocationId: string | undefined,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ['sublocationStaff', sublocationId, startDate, endDate],
    queryFn: () =>
      sublocationId ? getSublocationStaff(sublocationId, startDate, endDate) : [],
    enabled: !!sublocationId,
  });
}
