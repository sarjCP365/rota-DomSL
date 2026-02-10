/**
 * Dashboard Data Hooks
 * Provides data for the redesigned dashboard:
 * - useTodaySnapshot: Real-time view of today's staffing
 * - usePeriodAttention: Alerts and issues for a date period
 * - useStaffContractedHours: Staff contracted hours for overtime calculation
 */

import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfDay, endOfDay, addHours, isSameDay } from 'date-fns';
import { getDataverseClient, isDataverseClientInitialised } from '@/api/dataverse/client';
import { ShiftStatus, AbsenceStatus } from '@/api/dataverse/types';
import type { Shift } from '@/api/dataverse/types';
import { useAuthStore } from '@/store/authStore';

// =============================================================================
// TYPES
// =============================================================================

export interface TodaySnapshotData {
  /** Staff currently on shift */
  onShiftNow: number;
  /** Total shifts scheduled for today */
  totalTodayShifts: number;
  /** Unfilled shifts today (no staff assigned) */
  unfilledToday: number;
  /** Coverage percentage (assigned / total) */
  coveragePercent: number;
  /** Shift changes in next 4 hours */
  upcomingChanges: {
    time: string;
    starting: number;
    ending: number;
  }[];
  /** Staff absent today */
  absentToday: {
    staffId: string;
    staffName: string;
    reason: string;
  }[];
}

export interface AttentionItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'unfilled-night' | 'unfilled-day' | 'overtime' | 'leave' | 'unpublished';
  title: string;
  description: string;
  count?: number;
  details?: string[];
}

export interface PeriodAttentionData {
  items: AttentionItem[];
  stats: {
    totalShifts: number;
    assignedShifts: number;
    unfilledShifts: number;
    staffOnLeave: number;
    unpublishedShifts: number;
    totalHours: number;
    contractedHours: number;
  };
}

export interface CoverageByDay {
  date: Date;
  dayShifts: { total: number; filled: number; percent: number };
  nightShifts: { total: number; filled: number; percent: number };
  sleepInShifts: { total: number; filled: number; percent: number };
}

export interface StaffOvertimeAlert {
  staffId: string;
  staffName: string;
  scheduledHours: number;
  contractedHours: number;
  percentUsed: number;
}

// =============================================================================
// TODAY'S SNAPSHOT HOOK
// =============================================================================

interface UseTodaySnapshotParams {
  sublocationId: string | undefined;
  rotaId: string | undefined;
  enabled?: boolean;
}

/**
 * Hook for fetching real-time "Today's Snapshot" data
 * This data is always for today, regardless of the period filter
 */
export function useTodaySnapshot({
  sublocationId,
  rotaId,
  enabled = true,
}: UseTodaySnapshotParams) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);

  return useQuery({
    queryKey: ['todaySnapshot', sublocationId, rotaId],
    queryFn: async (): Promise<TodaySnapshotData | null> => {
      if (!sublocationId || !rotaId || !isDataverseClientInitialised()) {
        return null;
      }

      const client = getDataverseClient();
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const now = new Date();

      // Fetch today's shifts
      const shifts = await client.get<Shift>('cp365_shifts', {
        filter: `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate eq ${todayStr} and (cp365_shiftstatus eq ${ShiftStatus.Published} or cp365_shiftstatus eq ${ShiftStatus.Unpublished})`,
        select: [
          'cp365_shiftid',
          'cp365_shiftstarttime',
          'cp365_shiftendtime',
          '_cp365_staffmember_value',
          'cp365_sleepin',
        ],
        top: 500,
      });

      // Calculate on shift now
      let onShiftNow = 0;
      for (const shift of shifts) {
        if (shift._cp365_staffmember_value) {
          const start = parseISO(shift.cp365_shiftstarttime);
          const end = parseISO(shift.cp365_shiftendtime);
          if (now >= start && now <= end) {
            onShiftNow++;
          }
        }
      }

      // Calculate unfilled
      const unfilledToday = shifts.filter((s) => !s._cp365_staffmember_value).length;
      const totalTodayShifts = shifts.length;
      const assignedShifts = totalTodayShifts - unfilledToday;
      const coveragePercent = totalTodayShifts > 0 ? Math.round((assignedShifts / totalTodayShifts) * 100) : 100;

      // Calculate upcoming shift changes (next 4 hours)
      const upcomingChanges: TodaySnapshotData['upcomingChanges'] = [];
      const checkTimes = [1, 2, 3, 4]; // Hours from now

      for (const hoursAhead of checkTimes) {
        const targetTime = addHours(now, hoursAhead);
        const targetHour = targetTime.getHours();
        
        // Only include if still today
        if (!isSameDay(targetTime, today)) continue;

        let starting = 0;
        let ending = 0;

        for (const shift of shifts) {
          if (!shift._cp365_staffmember_value) continue;
          
          const startHour = parseISO(shift.cp365_shiftstarttime).getHours();
          const endHour = parseISO(shift.cp365_shiftendtime).getHours();

          if (startHour === targetHour) starting++;
          if (endHour === targetHour) ending++;
        }

        if (starting > 0 || ending > 0) {
          upcomingChanges.push({
            time: format(targetTime, 'HH:00'),
            starting,
            ending,
          });
        }
      }

      // Fetch absences for today
      interface AbsenceRecord {
        cp365_staffabsencelogid: string;
        cp365_absencestart: string;
        cp365_absenceend: string;
        _cp365_staffmember_value: string;
        cp365_AbsenceType?: {
          cp365_absencetypename: string;
        };
      }

      const absences = await client.get<AbsenceRecord>('cp365_staffabsencelogs', {
        filter: `cp365_absencestatus eq ${AbsenceStatus.Approved} and cp365_absencestart le ${todayStr} and cp365_absenceend ge ${todayStr}`,
        select: [
          'cp365_staffabsencelogid',
          'cp365_absencestart',
          'cp365_absenceend',
          '_cp365_staffmember_value',
        ],
        expand: ['cp365_AbsenceType($select=cp365_absencetypename)'],
        top: 100,
      });

      // Get staff names for absences
      const absentToday: TodaySnapshotData['absentToday'] = [];
      
      if (absences.length > 0) {
        const staffIds = [...new Set(absences.map((a) => a._cp365_staffmember_value))];
        
        interface StaffRecord {
          cp365_staffmemberid: string;
          cp365_staffmembername: string;
        }
        
        const staffMembers = await client.get<StaffRecord>('cp365_staffmembers', {
          filter: staffIds.map((id) => `cp365_staffmemberid eq '${id}'`).join(' or '),
          select: ['cp365_staffmemberid', 'cp365_staffmembername'],
        });

        const staffMap = new Map(staffMembers.map((s) => [s.cp365_staffmemberid, s.cp365_staffmembername]));

        for (const absence of absences) {
          absentToday.push({
            staffId: absence._cp365_staffmember_value,
            staffName: staffMap.get(absence._cp365_staffmember_value) || 'Unknown',
            reason: absence.cp365_AbsenceType?.cp365_absencetypename || 'Leave',
          });
        }
      }

      return {
        onShiftNow,
        totalTodayShifts,
        unfilledToday,
        coveragePercent,
        upcomingChanges,
        absentToday,
      };
    },
    enabled: enabled && !!sublocationId && !!rotaId && isDataverseReady,
    staleTime: 1000 * 60, // 1 minute - refresh frequently for real-time data
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  });
}

// =============================================================================
// PERIOD ATTENTION HOOK
// =============================================================================

interface UsePeriodAttentionParams {
  sublocationId: string | undefined;
  rotaId: string | undefined;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Hook for fetching attention items and stats for a date period
 */
export function usePeriodAttention({
  sublocationId,
  rotaId,
  startDate,
  endDate,
  enabled = true,
}: UsePeriodAttentionParams) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);

  return useQuery({
    queryKey: ['periodAttention', sublocationId, rotaId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<PeriodAttentionData | null> => {
      if (!sublocationId || !rotaId || !isDataverseClientInitialised()) {
        return null;
      }

      const client = getDataverseClient();
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch shifts for the period
      const shifts = await client.get<Shift>('cp365_shifts', {
        filter: `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr} and (cp365_shiftstatus eq ${ShiftStatus.Published} or cp365_shiftstatus eq ${ShiftStatus.Unpublished})`,
        select: [
          'cp365_shiftid',
          'cp365_shiftdate',
          'cp365_shiftstarttime',
          'cp365_shiftendtime',
          'cp365_shiftstatus',
          '_cp365_staffmember_value',
          'cp365_sleepin',
        ],
        top: 1000,
      });

      // Fetch absences for the period
      interface AbsenceRecord {
        cp365_staffabsencelogid: string;
        _cp365_staffmember_value: string;
      }

      const absences = await client.get<AbsenceRecord>('cp365_staffabsencelogs', {
        filter: `cp365_absencestatus eq ${AbsenceStatus.Approved} and cp365_absencestart le ${endDateStr} and cp365_absenceend ge ${startDateStr}`,
        select: ['cp365_staffabsencelogid', '_cp365_staffmember_value'],
        top: 500,
      });

      // Calculate stats
      const totalShifts = shifts.length;
      const unfilledShifts = shifts.filter((s) => !s._cp365_staffmember_value).length;
      const assignedShifts = totalShifts - unfilledShifts;
      const unpublishedShifts = shifts.filter((s) => s.cp365_shiftstatus === ShiftStatus.Unpublished).length;
      const staffOnLeave = new Set(absences.map((a) => a._cp365_staffmember_value)).size;

      // Calculate total hours
      let totalHours = 0;
      for (const shift of shifts) {
        const start = parseISO(shift.cp365_shiftstarttime);
        const end = parseISO(shift.cp365_shiftendtime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }

      // Get contracted hours for assigned staff
      const staffIds = [...new Set(shifts.filter((s) => s._cp365_staffmember_value).map((s) => s._cp365_staffmember_value!))];
      let contractedHours = 0;

      if (staffIds.length > 0) {
        const contractMap = await fetchContractedHours(staffIds);
        for (const hours of contractMap.values()) {
          contractedHours += hours;
        }
      }

      // Build attention items
      const items: AttentionItem[] = [];

      // Critical: Unfilled Night/Sleep-In shifts
      const unfilledNightShifts = shifts.filter((s) => {
        if (s._cp365_staffmember_value) return false;
        if (s.cp365_sleepin) return true;
        const startHour = parseISO(s.cp365_shiftstarttime).getHours();
        return startHour >= 18 || startHour < 6; // Night shift
      });

      if (unfilledNightShifts.length > 0) {
        const dates = [...new Set(unfilledNightShifts.map((s) => format(parseISO(s.cp365_shiftdate), 'EEE d MMM')))];
        items.push({
          id: 'unfilled-night',
          type: 'critical',
          category: 'unfilled-night',
          title: `${unfilledNightShifts.length} Unfilled Night/Sleep-In Shift${unfilledNightShifts.length > 1 ? 's' : ''}`,
          description: 'Critical coverage gaps requiring immediate attention',
          count: unfilledNightShifts.length,
          details: dates.slice(0, 5),
        });
      }

      // Warning: Unfilled Day shifts
      const unfilledDayShifts = shifts.filter((s) => {
        if (s._cp365_staffmember_value) return false;
        if (s.cp365_sleepin) return false;
        const startHour = parseISO(s.cp365_shiftstarttime).getHours();
        return startHour >= 6 && startHour < 18;
      });

      if (unfilledDayShifts.length > 0) {
        const dates = [...new Set(unfilledDayShifts.map((s) => format(parseISO(s.cp365_shiftdate), 'EEE d MMM')))];
        items.push({
          id: 'unfilled-day',
          type: 'warning',
          category: 'unfilled-day',
          title: `${unfilledDayShifts.length} Unfilled Day Shift${unfilledDayShifts.length > 1 ? 's' : ''}`,
          description: 'Day shifts requiring staff assignment',
          count: unfilledDayShifts.length,
          details: dates.slice(0, 5),
        });
      }

      // Info: Staff on leave
      if (staffOnLeave > 0) {
        items.push({
          id: 'staff-leave',
          type: 'info',
          category: 'leave',
          title: `${staffOnLeave} Staff on Leave`,
          description: 'Staff members with approved leave during this period',
          count: staffOnLeave,
        });
      }

      // Info: Unpublished shifts
      if (unpublishedShifts > 0) {
        items.push({
          id: 'unpublished',
          type: 'info',
          category: 'unpublished',
          title: `${unpublishedShifts} Unpublished Shift${unpublishedShifts > 1 ? 's' : ''}`,
          description: 'Shifts awaiting publication to staff',
          count: unpublishedShifts,
        });
      }

      return {
        items,
        stats: {
          totalShifts,
          assignedShifts,
          unfilledShifts,
          staffOnLeave,
          unpublishedShifts,
          totalHours: Math.round(totalHours),
          contractedHours: Math.round(contractedHours),
        },
      };
    },
    enabled: enabled && !!sublocationId && !!rotaId && isDataverseReady,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// =============================================================================
// OVERTIME ALERTS HOOK
// =============================================================================

interface UseOvertimeAlertsParams {
  sublocationId: string | undefined;
  rotaId: string | undefined;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Hook for fetching staff approaching overtime
 */
export function useOvertimeAlerts({
  sublocationId,
  rotaId,
  startDate,
  endDate,
  enabled = true,
}: UseOvertimeAlertsParams) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);

  return useQuery({
    queryKey: ['overtimeAlerts', sublocationId, rotaId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<StaffOvertimeAlert[]> => {
      if (!sublocationId || !rotaId || !isDataverseClientInitialised()) {
        return [];
      }

      const client = getDataverseClient();
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch shifts for the period
      const shifts = await client.get<Shift>('cp365_shifts', {
        filter: `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr} and (cp365_shiftstatus eq ${ShiftStatus.Published} or cp365_shiftstatus eq ${ShiftStatus.Unpublished})`,
        select: [
          'cp365_shiftid',
          'cp365_shiftstarttime',
          'cp365_shiftendtime',
          '_cp365_staffmember_value',
        ],
        top: 1000,
      });

      // Group hours by staff
      const staffHours = new Map<string, number>();
      for (const shift of shifts) {
        if (!shift._cp365_staffmember_value) continue;
        
        const start = parseISO(shift.cp365_shiftstarttime);
        const end = parseISO(shift.cp365_shiftendtime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        const current = staffHours.get(shift._cp365_staffmember_value) || 0;
        staffHours.set(shift._cp365_staffmember_value, current + hours);
      }

      if (staffHours.size === 0) {
        return [];
      }

      // Fetch contracted hours
      const staffIds = [...staffHours.keys()];
      const contractMap = await fetchContractedHours(staffIds);

      // Fetch staff names
      interface StaffRecord {
        cp365_staffmemberid: string;
        cp365_staffmembername: string;
      }
      
      const staffMembers = await client.get<StaffRecord>('cp365_staffmembers', {
        filter: staffIds.map((id) => `cp365_staffmemberid eq '${id}'`).join(' or '),
        select: ['cp365_staffmemberid', 'cp365_staffmembername'],
      });

      const staffNameMap = new Map(staffMembers.map((s) => [s.cp365_staffmemberid, s.cp365_staffmembername]));

      // Find staff approaching overtime (>= 90% of contracted hours)
      const alerts: StaffOvertimeAlert[] = [];

      for (const [staffId, scheduledHours] of staffHours) {
        const contractedHours = contractMap.get(staffId) || 0;
        if (contractedHours === 0) continue;

        const percentUsed = (scheduledHours / contractedHours) * 100;
        
        if (percentUsed >= 90) {
          alerts.push({
            staffId,
            staffName: staffNameMap.get(staffId) || 'Unknown',
            scheduledHours: Math.round(scheduledHours * 10) / 10,
            contractedHours,
            percentUsed: Math.round(percentUsed),
          });
        }
      }

      // Sort by percentage (highest first)
      alerts.sort((a, b) => b.percentUsed - a.percentUsed);

      return alerts;
    },
    enabled: enabled && !!sublocationId && !!rotaId && isDataverseReady,
    staleTime: 1000 * 60 * 2,
  });
}

// =============================================================================
// COVERAGE BY DAY HOOK
// =============================================================================

interface UseCoverageByDayParams {
  sublocationId: string | undefined;
  rotaId: string | undefined;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

/**
 * Hook for fetching coverage breakdown by day and shift type
 */
export function useCoverageByDay({
  sublocationId,
  rotaId,
  startDate,
  endDate,
  enabled = true,
}: UseCoverageByDayParams) {
  const isDataverseReady = useAuthStore((state) => state.isDataverseReady);

  return useQuery({
    queryKey: ['coverageByDay', sublocationId, rotaId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<CoverageByDay[]> => {
      if (!sublocationId || !rotaId || !isDataverseClientInitialised()) {
        return [];
      }

      const client = getDataverseClient();
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch shifts for the period
      const shifts = await client.get<Shift>('cp365_shifts', {
        filter: `_cp365_rota_value eq '${rotaId}' and cp365_shiftdate ge ${startDateStr} and cp365_shiftdate le ${endDateStr} and (cp365_shiftstatus eq ${ShiftStatus.Published} or cp365_shiftstatus eq ${ShiftStatus.Unpublished})`,
        select: [
          'cp365_shiftid',
          'cp365_shiftdate',
          'cp365_shiftstarttime',
          '_cp365_staffmember_value',
          'cp365_sleepin',
        ],
        top: 1000,
      });

      // Group by date
      const dateMap = new Map<string, Shift[]>();
      for (const shift of shifts) {
        const dateKey = shift.cp365_shiftdate.split('T')[0];
        const existing = dateMap.get(dateKey) || [];
        existing.push(shift);
        dateMap.set(dateKey, existing);
      }

      // Build coverage data for each day in the range
      const coverage: CoverageByDay[] = [];
      let currentDate = startOfDay(startDate);
      const end = endOfDay(endDate);

      while (currentDate <= end) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        const dayShifts = dateMap.get(dateKey) || [];

        // Categorise shifts
        let dayTotal = 0, dayFilled = 0;
        let nightTotal = 0, nightFilled = 0;
        let sleepInTotal = 0, sleepInFilled = 0;

        for (const shift of dayShifts) {
          const isFilled = !!shift._cp365_staffmember_value;
          const startHour = parseISO(shift.cp365_shiftstarttime).getHours();

          if (shift.cp365_sleepin) {
            sleepInTotal++;
            if (isFilled) sleepInFilled++;
          } else if (startHour >= 6 && startHour < 18) {
            dayTotal++;
            if (isFilled) dayFilled++;
          } else {
            nightTotal++;
            if (isFilled) nightFilled++;
          }
        }

        coverage.push({
          date: new Date(currentDate),
          dayShifts: {
            total: dayTotal,
            filled: dayFilled,
            percent: dayTotal > 0 ? Math.round((dayFilled / dayTotal) * 100) : 100,
          },
          nightShifts: {
            total: nightTotal,
            filled: nightFilled,
            percent: nightTotal > 0 ? Math.round((nightFilled / nightTotal) * 100) : 100,
          },
          sleepInShifts: {
            total: sleepInTotal,
            filled: sleepInFilled,
            percent: sleepInTotal > 0 ? Math.round((sleepInFilled / sleepInTotal) * 100) : 100,
          },
        });

        currentDate = addHours(currentDate, 24);
      }

      return coverage;
    },
    enabled: enabled && !!sublocationId && !!rotaId && isDataverseReady,
    staleTime: 1000 * 60 * 2,
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Fetch contracted hours for a list of staff members
 * Returns a map of staffId -> total contracted hours
 */
async function fetchContractedHours(staffIds: string[]): Promise<Map<string, number>> {
  if (!isDataverseClientInitialised() || staffIds.length === 0) {
    return new Map();
  }

  const client = getDataverseClient();

  interface StaffContractData {
    cp365_staffcontractid: string;
    _cp365_staffmember_value: string;
    _cp365_contract_value: string;
    cp365_active: boolean;
  }

  interface ContractData {
    cp365_contractid: string;
    cp365_requiredhours: number | null;
  }

  try {
    // Fetch active staff contracts
    const staffContracts = await client.get<StaffContractData>('cp365_staffcontracts', {
      filter: 'cp365_active eq true',
      select: [
        'cp365_staffcontractid',
        '_cp365_staffmember_value',
        '_cp365_contract_value',
        'cp365_active',
      ],
    });

    // Get unique contract IDs
    const contractIds = [...new Set(staffContracts.map((sc) => sc._cp365_contract_value).filter(Boolean))];

    if (contractIds.length === 0) {
      return new Map();
    }

    // Fetch contract details
    const contracts = await client.get<ContractData>('cp365_contracts', {
      filter: contractIds.map((id) => `cp365_contractid eq '${id}'`).join(' or '),
      select: ['cp365_contractid', 'cp365_requiredhours'],
    });

    // Build contract hours map
    const contractHoursMap = new Map<string, number>();
    for (const contract of contracts) {
      contractHoursMap.set(contract.cp365_contractid, contract.cp365_requiredhours || 0);
    }

    // Sum hours per staff member (staff can have multiple contracts)
    const staffHoursMap = new Map<string, number>();
    for (const sc of staffContracts) {
      if (!staffIds.includes(sc._cp365_staffmember_value)) continue;
      
      const contractHours = contractHoursMap.get(sc._cp365_contract_value) || 0;
      const existing = staffHoursMap.get(sc._cp365_staffmember_value) || 0;
      staffHoursMap.set(sc._cp365_staffmember_value, existing + contractHours);
    }

    return staffHoursMap;
  } catch (error) {
    console.error('[fetchContractedHours] Error:', error);
    return new Map();
  }
}
