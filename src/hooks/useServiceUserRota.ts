/**
 * useServiceUserRota Hook
 *
 * Custom hook for fetching and managing service user rota data.
 * Combines service users with their visits for display in the rota grid.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns';
import { serviceUserRepository } from '@/repositories/serviceUserRepository';
import { visitRepository } from '@/repositories/visitRepository';
import { getDummyData } from '@/data/dummyDataGenerator';
import type {
  Visit,
  ServiceUserWithVisits,
  DateRange,
} from '@/types/domiciliary';
import type { StaffMember } from '@/api/dataverse/types';

interface UseServiceUserRotaOptions {
  /** Start date of the date range to display */
  startDate: Date;
  /** Number of days to display (default: 7) */
  days?: number;
  /** Optional search filter for service user name */
  searchTerm?: string;
}

interface UseServiceUserRotaResult {
  /** Service users with their visits */
  serviceUsersWithVisits: ServiceUserWithVisits[];
  /** Array of dates in the current range */
  dates: Date[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch data */
  refetch: () => void;
  /** Total visits in period */
  totalVisits: number;
  /** Unassigned visits count */
  unassignedCount: number;
  /** Coverage percentage */
  coveragePercentage: number;
  /** Total scheduled hours */
  totalScheduledHours: number;
  /** Assign staff to a visit */
  assignStaff: (visitId: string, staffMemberId: string) => Promise<void>;
  /** Unassign staff from a visit */
  unassignStaff: (visitId: string) => Promise<void>;
  /** Is mutation in progress */
  isMutating: boolean;
}

/**
 * Hook for fetching and managing service user rota data
 */
export function useServiceUserRota(options: UseServiceUserRotaOptions): UseServiceUserRotaResult {
  const { startDate, days = 7, searchTerm } = options;
  const queryClient = useQueryClient();

  // Calculate date range
  const dateRange: DateRange = useMemo(() => {
    const start = startOfWeek(startDate, { weekStartsOn: 1 });
    const end = addDays(start, days - 1);
    return { start, end: endOfWeek(end, { weekStartsOn: 1 }) };
  }, [startDate, days]);

  // Generate array of dates for display
  const dates = useMemo(() => {
    const result: Date[] = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [dateRange]);

  // Fetch active service users
  const serviceUsersQuery = useQuery({
    queryKey: ['domiciliary', 'serviceUsers', 'active'],
    queryFn: () => serviceUserRepository.getActive(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch visits for the date range
  const visitsQuery = useQuery({
    queryKey: ['domiciliary', 'visits', format(dateRange.start, 'yyyy-MM-dd'), format(dateRange.end, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Use getAll and filter since getByDateRange may not be in all implementations
      const allVisits = await visitRepository.getAll();
      
      // Use string comparison to avoid timezone issues
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');
      
      const filtered = allVisits.filter(v => {
        const visitDateStr = v.cp365_visitdate; // Already in yyyy-MM-dd format
        return visitDateStr >= startStr && visitDateStr <= endStr;
      });
      
      console.warn('📅 Date range:', startStr, 'to', endStr);
      console.warn('📊 Total visits:', allVisits.length, '| Filtered:', filtered.length);
      
      return filtered;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Fetch staff members for visit assignment display
  const staffQuery = useQuery({
    queryKey: ['domiciliary', 'staffMembers'],
    queryFn: async () => {
      const data = await getDummyData();
      return data.staffMembers;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create staff lookup map
  const staffMap = useMemo(() => {
    if (!staffQuery.data) return new Map<string, StaffMember>();
    const map = new Map<string, StaffMember>();
    for (const staff of staffQuery.data) {
      map.set(staff.cp365_staffmemberid, staff);
    }
    return map;
  }, [staffQuery.data]);

  // Combine service users with their visits
  const serviceUsersWithVisits = useMemo<ServiceUserWithVisits[]>(() => {
    if (!serviceUsersQuery.data || !visitsQuery.data) return [];

    let serviceUsers = serviceUsersQuery.data;

    // Apply search filter if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      serviceUsers = serviceUsers.filter(
        su =>
          su.cp365_fullname.toLowerCase().includes(term) ||
          su.cp365_preferredname?.toLowerCase().includes(term) ||
          su.cp365_currentaddress.toLowerCase().includes(term) ||
          su.cp365_postcode?.toLowerCase().includes(term)
      );
    }

    // Group visits by service user
    const visitsByServiceUser = new Map<string, Visit[]>();
    for (const visit of visitsQuery.data) {
      const existing = visitsByServiceUser.get(visit.cp365_serviceuserid) || [];
      existing.push(visit);
      visitsByServiceUser.set(visit.cp365_serviceuserid, existing);
    }

    // Create combined data
    return serviceUsers
      .map(serviceUser => {
        const rawVisits = visitsByServiceUser.get(serviceUser.cp365_serviceuserid) || [];
        
        // Inject service user and staff member into visits for easier access in components
        const visits = rawVisits.map(v => ({
          ...v,
          cp365_serviceuser: serviceUser,
          cp365_staffmember: v.cp365_staffmemberid ? staffMap.get(v.cp365_staffmemberid) : undefined,
        }));
        
        const totalScheduledMinutes = visits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
        const unassignedCount = visits.filter(v => !v.cp365_staffmemberid).length;

        // Calculate funded hours for the period (weekly hours * weeks)
        const weeksInPeriod = days / 7;
        const fundedHours = (serviceUser.cp365_weeklyfundedhours || 0) * weeksInPeriod;

        return {
          serviceUser,
          visits: visits.sort((a, b) => {
            // Sort by date then by time
            const dateCompare = a.cp365_visitdate.localeCompare(b.cp365_visitdate);
            if (dateCompare !== 0) return dateCompare;
            return a.cp365_scheduledstarttime.localeCompare(b.cp365_scheduledstarttime);
          }),
          totalScheduledHours: totalScheduledMinutes / 60,
          fundedHours,
          unassignedCount,
        };
      })
      .filter(su => su.visits.length > 0 || searchTerm) // Only show service users with visits unless searching
      .sort((a, b) => a.serviceUser.cp365_fullname.localeCompare(b.serviceUser.cp365_fullname));
  }, [serviceUsersQuery.data, visitsQuery.data, staffMap, searchTerm, days]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const allVisits = visitsQuery.data || [];
    const totalVisits = allVisits.length;
    const unassignedCount = allVisits.filter(v => !v.cp365_staffmemberid).length;
    const assignedCount = totalVisits - unassignedCount;
    const coveragePercentage = totalVisits > 0 ? Math.round((assignedCount / totalVisits) * 100) : 100;
    const totalScheduledHours = allVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0) / 60;

    return {
      totalVisits,
      unassignedCount,
      coveragePercentage,
      totalScheduledHours,
    };
  }, [visitsQuery.data]);

  // Mutation for assigning staff
  const assignStaffMutation = useMutation({
    mutationFn: async ({ visitId, staffMemberId }: { visitId: string; staffMemberId: string }) => {
      await visitRepository.assignStaff(visitId, staffMemberId);
    },
    onSuccess: () => {
      // Invalidate visits query to refetch
      void queryClient.invalidateQueries({ queryKey: ['domiciliary', 'visits'] });
    },
  });

  // Mutation for unassigning staff
  const unassignStaffMutation = useMutation({
    mutationFn: async (visitId: string) => {
      await visitRepository.unassignStaff(visitId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['domiciliary', 'visits'] });
    },
  });

  return {
    serviceUsersWithVisits,
    dates,
    isLoading: serviceUsersQuery.isLoading || visitsQuery.isLoading,
    error: serviceUsersQuery.error || visitsQuery.error,
    refetch: () => {
      void serviceUsersQuery.refetch();
      void visitsQuery.refetch();
      void staffQuery.refetch();
    },
    ...stats,
    assignStaff: async (visitId, staffMemberId) => {
      await assignStaffMutation.mutateAsync({ visitId, staffMemberId });
    },
    unassignStaff: async (visitId) => {
      await unassignStaffMutation.mutateAsync(visitId);
    },
    isMutating: assignStaffMutation.isPending || unassignStaffMutation.isPending,
  };
}

export default useServiceUserRota;
