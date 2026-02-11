/**
 * useDailyViewData Hook
 * Encapsulates all data fetching, state management, effects, computed values,
 * and handlers for the DailyView page.
 * Extracted from DailyView.tsx to keep the page component focused on rendering.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { useLocationSettings, useViewPreferences } from '@/store/settingsStore';
import type { DailyFilters, ShiftType } from '@/components/daily/DailyFilterBar';
import type { DepartmentType } from '@/components/daily/DepartmentSection';
import { useLocations, useSublocations, useActiveRota } from '@/hooks/useLocations';
import { useRotaData } from '@/hooks/useRotaData';
import { usePublishShifts } from '@/hooks/useShifts';
import { useQueryClient } from '@tanstack/react-query';
import {
  type AttendanceStatus,
  type ShiftWithAttendance,
  getAttendanceStatus as getAttendanceStatusUtil,
} from '@/utils/attendanceStatus';
import type { ShiftViewData } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

export interface DepartmentGroup {
  id: string;
  name: string;
  type: DepartmentType;
  shifts: ShiftViewData[];
  staffCount: number;
}

export interface StaffOnLeaveItem {
  id: string;
  name: string;
  jobTitle: string;
  leaveType: string;
  startDate: string | undefined;
  endDate: string | undefined;
  isSensitive: boolean | undefined;
}

export interface DailyStats {
  staffCount: number;
  totalHours: number;
  unassignedCount: number;
  unpublishedCount: number;
  staffOnLeave: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get today's date at midnight
 */
function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Parse date from URL or return today
 */
function parseDateFromUrl(dateStr: string | null): Date {
  if (!dateStr) return getToday();
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : getToday();
}

/**
 * Calculate working hours from shift times
 */
function calculateWorkingHours(shift: ShiftViewData): number {
  const start = shift['Shift Start Time'];
  const end = shift['Shift End Time'];
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  // Handle overnight shifts
  let diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }

  const hours = diffMs / (1000 * 60 * 60);
  const breakHours = (shift['Shift Break Duration'] || 0) / 60;
  return Math.max(0, hours - breakHours);
}

/**
 * Get shift type from shift data
 */
function getShiftType(shift: ShiftViewData): ShiftType {
  const startHour = shift['Shift Start Time'] ? new Date(shift['Shift Start Time']).getHours() : 8;

  if (shift['Sleep In']) return 'sleepin';
  if (startHour >= 20 || startHour < 6) return 'night';
  return 'day';
}

/**
 * Get attendance status for a shift
 */
function getAttendanceStatus(shift: ShiftViewData): AttendanceStatus {
  return getAttendanceStatusUtil(shift as ShiftWithAttendance);
}

// =============================================================================
// Hook
// =============================================================================

export function useDailyViewData() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Date state - from URL or today
  const [selectedDate, setSelectedDateState] = useState<Date>(() =>
    parseDateFromUrl(searchParams.get('date'))
  );

  // Location/Sublocation from shared store (persisted across views)
  const {
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
  } = useLocationSettings();

  // View preferences from shared store
  const { setLastViewMode, setLastSelectedDate } = useViewPreferences();

  // Update view preferences when date changes
  const setSelectedDate = useCallback(
    (date: Date) => {
      setSelectedDateState(date);
      setLastSelectedDate(date);
    },
    [setLastSelectedDate]
  );

  // Filters
  const [filters, setFilters] = useState<DailyFilters>({
    search: '',
    department: 'all',
    status: 'all',
    shiftType: 'all',
  });

  // Expanded departments
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set(['all']));

  // Flyout state
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | undefined>();
  const [selectedShiftData, setSelectedShiftData] = useState<ShiftViewData | undefined>();

  // Leader modal state
  const [leaderModalOpen, setLeaderModalOpen] = useState(false);
  const [leaderModalShift, setLeaderModalShift] = useState<ShiftViewData | null>(null);

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Bulk assign modal state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Staff on leave modal state
  const [showStaffOnLeaveModal, setShowStaffOnLeaveModal] = useState(false);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const publishShiftsMutation = usePublishShifts();

  // Real-time update state (Prompt 13)
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('Never');
  const lastDataUpdateRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const { data: locations, isLoading: isLoadingLocations } = useLocations();
  const { data: sublocations, isLoading: isLoadingSublocations } =
    useSublocations(selectedLocationId);
  const { data: activeRota, isLoading: isLoadingActiveRota } = useActiveRota(selectedSublocationId);

  // Query client for manual invalidation
  const _queryClient = useQueryClient();

  // Auto-refresh interval (60 seconds when enabled and page visible)
  const AUTO_REFRESH_INTERVAL = 60000;

  const {
    data: rotaData,
    isLoading: isLoadingRota,
    isFetching: isRefreshing,
    refetch: refetchRota,
    dataUpdatedAt,
  } = useRotaData({
    rotaId: activeRota?.cp365_rotaid,
    sublocationId: selectedSublocationId,
    startDate: selectedDate,
    duration: 7, // Fetch a week and filter to single day
    showExternalStaff: false,
  });

  // ---------------------------------------------------------------------------
  // Effects: Auto-select Location/Sublocation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!locations?.length) return;
    const savedLocationExists =
      selectedLocationId && locations.some((loc) => loc.cp365_locationid === selectedLocationId);
    if (!savedLocationExists) {
      setSelectedLocationId(locations[0].cp365_locationid);
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);

  useEffect(() => {
    if (!sublocations?.length) {
      setSelectedSublocationId('');
      return;
    }
    const savedSublocationExists =
      selectedSublocationId &&
      sublocations.some((sub) => sub.cp365_sublocationid === selectedSublocationId);
    if (!savedSublocationExists) {
      setSelectedSublocationId(sublocations[0].cp365_sublocationid);
    }
  }, [sublocations, selectedSublocationId, setSelectedSublocationId]);

  // ---------------------------------------------------------------------------
  // Effects: URL Sync
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (searchParams.get('date') !== dateStr) {
      setSearchParams({ date: dateStr }, { replace: true });
    }
  }, [selectedDate, searchParams, setSearchParams]);

  // ---------------------------------------------------------------------------
  // Effects: Real-time Updates (Prompt 13)
  // ---------------------------------------------------------------------------

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);

      // Refetch when page becomes visible again
      if (visible && isAutoRefreshEnabled) {
        void refetchRota();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAutoRefreshEnabled, refetchRota]);

  // Update "last updated" timestamp
  useEffect(() => {
    if (dataUpdatedAt && dataUpdatedAt !== lastDataUpdateRef.current) {
      lastDataUpdateRef.current = dataUpdatedAt;
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Update "last updated" text periodically
  useEffect(() => {
    const updateText = () => {
      if (lastUpdated) {
        setLastUpdatedText(formatDistanceToNow(lastUpdated, { addSuffix: true }));
      }
    };

    updateText();
    const interval = setInterval(updateText, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Auto-refresh interval
  useEffect(() => {
    if (!isAutoRefreshEnabled || !isPageVisible) return;

    const interval = setInterval(() => {
      void refetchRota();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, isPageVisible, refetchRota]);

  // ---------------------------------------------------------------------------
  // Effects: Navigation / View Mode
  // ---------------------------------------------------------------------------

  // Set current view mode on mount
  useEffect(() => {
    setLastViewMode('day');
  }, [setLastViewMode]);

  // ---------------------------------------------------------------------------
  // Filter Handlers
  // ---------------------------------------------------------------------------

  const handleFiltersChange = useCallback((newFilters: DailyFilters) => {
    setFilters(newFilters);
  }, []);

  // ---------------------------------------------------------------------------
  // Department Expand/Collapse
  // ---------------------------------------------------------------------------

  const toggleDepartment = useCallback((deptId: string) => {
    setExpandedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Computed Data
  // ---------------------------------------------------------------------------

  // Filter shifts for selected date
  const shiftsForDate = useMemo(() => {
    if (!rotaData?.shifts) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    return rotaData.shifts.filter((shift) => {
      const shiftDate = shift['Shift Date'];
      if (!shiftDate) return false;
      const shiftDateStr = format(new Date(shiftDate), 'yyyy-MM-dd');
      return shiftDateStr === dateStr;
    });
  }, [rotaData?.shifts, selectedDate]);

  // Apply filters
  const filteredShifts = useMemo(() => {
    let result = shiftsForDate;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((shift) => {
        const staffName = shift['Staff Member Name']?.toLowerCase() || '';
        return staffName.includes(searchLower);
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((shift) => getAttendanceStatus(shift) === filters.status);
    }

    // Shift type filter
    if (filters.shiftType !== 'all') {
      result = result.filter((shift) => getShiftType(shift) === filters.shiftType);
    }

    return result;
  }, [shiftsForDate, filters]);

  // Group by department
  const departmentGroups = useMemo((): DepartmentGroup[] => {
    const regularGroups = new Map<string, ShiftViewData[]>();
    const agencyShifts: ShiftViewData[] = [];
    const externalShifts: ShiftViewData[] = [];
    const unassignedShifts: ShiftViewData[] = [];

    for (const shift of filteredShifts) {
      // Check for unassigned shifts first
      if (!shift['Staff Member ID']) {
        unassignedShifts.push(shift);
        continue;
      }

      // Check for external/agency shifts
      if (shift['Is External Staff']) {
        externalShifts.push(shift);
        continue;
      }

      // Use Department field if available, otherwise use team or 'General'
      const dept =
        shift['Department'] ||
        (shift['Staff Teams']?.length > 0 ? shift['Staff Teams'][0] : 'General');

      if (!regularGroups.has(dept)) {
        regularGroups.set(dept, []);
      }
      regularGroups.get(dept)!.push(shift);
    }

    // Build result array
    const result: DepartmentGroup[] = [];

    // Add unassigned section FIRST if there are unassigned shifts (most important)
    if (unassignedShifts.length > 0) {
      result.push({
        id: 'unassigned-shifts',
        name: 'Unassigned Shifts',
        type: 'unassigned' as DepartmentType,
        shifts: unassignedShifts,
        staffCount: unassignedShifts.length,
      });
    }

    // Add regular departments
    const regularDepts: DepartmentGroup[] = [];
    for (const [name, shifts] of regularGroups) {
      regularDepts.push({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        type: 'regular',
        shifts,
        staffCount: new Set(shifts.map((s) => s['Staff Member ID']).filter(Boolean)).size,
      });
    }

    // Sort regular departments by name
    regularDepts.sort((a, b) => a.name.localeCompare(b.name));
    result.push(...regularDepts);

    // Add agency section if there are agency shifts
    if (agencyShifts.length > 0) {
      result.push({
        id: 'agency-workers',
        name: 'Agency Workers',
        type: 'agency',
        shifts: agencyShifts,
        staffCount: agencyShifts.length,
      });
    }

    // Add external location section if showing
    if (
      externalShifts.length > 0 &&
      (filters.department === 'all' || filters.department === 'other-locations')
    ) {
      result.push({
        id: 'other-locations',
        name: 'Shifts From Other Locations',
        type: 'other-locations',
        shifts: externalShifts,
        staffCount: new Set(externalShifts.map((s) => s['Staff Member ID']).filter(Boolean)).size,
      });
    }

    return result;
  }, [filteredShifts, filters.department]);

  // expandAll / collapseAll depend on departmentGroups
  const expandAll = useCallback(() => {
    const allDeptIds = departmentGroups.map((d) => d.id);
    setExpandedDepartments(new Set(allDeptIds));
  }, [departmentGroups]);

  const collapseAll = useCallback(() => {
    setExpandedDepartments(new Set());
  }, []);

  // Statistics
  const stats = useMemo((): DailyStats => {
    const uniqueStaff = new Set(filteredShifts.map((s) => s['Staff Member ID']).filter(Boolean));

    const totalHours = filteredShifts.reduce((sum, shift) => {
      return sum + calculateWorkingHours(shift);
    }, 0);

    // Count unassigned shifts
    const unassignedCount = filteredShifts.filter((s) => !s['Staff Member ID']).length;

    // Count unpublished shifts (status !== 1001 Published)
    const unpublishedShifts = filteredShifts.filter((s) => s['Shift Status'] !== 1001);
    const unpublishedCount = unpublishedShifts.length;

    // Count staff on leave for the selected date
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const staffOnLeaveCount = (rotaData?.staff || []).filter((s) => {
      const leaveRecords = s['Leave'] || [];
      return leaveRecords.some((leave) => {
        const start = leave.cp365_startdate?.split('T')[0];
        const end = leave.cp365_enddate?.split('T')[0];
        return start && end && dateStr >= start && dateStr <= end;
      });
    }).length;

    return {
      staffCount: uniqueStaff.size,
      totalHours: Math.round(totalHours * 10) / 10,
      unassignedCount,
      unpublishedCount,
      staffOnLeave: staffOnLeaveCount,
    };
  }, [filteredShifts, selectedDate, rotaData?.staff]);

  // Get detailed list of staff on leave for the modal
  const staffOnLeaveList = useMemo((): StaffOnLeaveItem[] => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return (rotaData?.staff || [])
      .map((s) => {
        const leaveRecords = s['Leave'] || [];
        const activeLeave = leaveRecords.find((leave) => {
          const start = leave.cp365_startdate?.split('T')[0];
          const end = leave.cp365_enddate?.split('T')[0];
          return start && end && dateStr >= start && dateStr <= end;
        });
        if (!activeLeave) return null;

        // Get absence type name
        const absenceTypeName = activeLeave.cp365_absencetype?.cp365_absencetypename || 'Leave';
        const isSensitive =
          activeLeave.cp365_sensitive || activeLeave.cp365_absencetype?.cp365_sensitive;

        return {
          id: s['Staff Member ID'],
          name: s['Staff Member Name'],
          jobTitle: s['Job Title Name'] || '',
          leaveType: isSensitive ? 'Sensitive Leave' : absenceTypeName,
          startDate: activeLeave.cp365_startdate,
          endDate: activeLeave.cp365_enddate,
          isSensitive,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedDate, rotaData?.staff]);

  // Create a lookup map from staff ID to date of birth for birthday display
  const staffDateOfBirthMap = useMemo(() => {
    const map = new Map<string, string | null>();
    (rotaData?.staff || []).forEach((s) => {
      map.set(s['Staff Member ID'], s['Date of Birth'] || null);
    });
    return map;
  }, [rotaData?.staff]);

  // Get unassigned shifts for bulk assign modal
  const unassignedShiftsList = useMemo(() => {
    return filteredShifts.filter((s) => !s['Staff Member ID']);
  }, [filteredShifts]);

  // Get unpublished shifts for publish functionality
  const unpublishedShiftIds = useMemo(() => {
    return filteredShifts.filter((s) => s['Shift Status'] !== 1001).map((s) => s['Shift ID']);
  }, [filteredShifts]);

  // ---------------------------------------------------------------------------
  // Shift Action Handlers (must be after filteredShifts is defined)
  // ---------------------------------------------------------------------------

  const handleEditShift = useCallback(
    (shiftId: string) => {
      // Find the shift data for the flyout
      const shift = filteredShifts.find((s) => s['Shift ID'] === shiftId);
      setSelectedShiftId(shiftId);
      setSelectedShiftData(shift);
      setFlyoutOpen(true);
    },
    [filteredShifts]
  );

  const handleCloseFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setSelectedShiftId(undefined);
    setSelectedShiftData(undefined);
  }, []);

  const handleShiftSaved = useCallback(() => {
    // Refetch data after save
    void refetchRota();
  }, [refetchRota]);

  const handleShiftDeleted = useCallback(() => {
    // Refetch data after delete
    void refetchRota();
  }, [refetchRota]);

  const handleAssignLeader = useCallback(
    (shiftId: string) => {
      const shift = filteredShifts.find((s) => s['Shift ID'] === shiftId);
      if (shift) {
        setLeaderModalShift(shift);
        setLeaderModalOpen(true);
      }
    },
    [filteredShifts]
  );

  const handleCloseLeaderModal = useCallback(() => {
    setLeaderModalOpen(false);
    setLeaderModalShift(null);
  }, []);

  const handleLeaderSaved = useCallback(() => {
    void refetchRota();
  }, [refetchRota]);

  // Handler to publish all unpublished shifts for the day
  const handlePublishAll = useCallback(async () => {
    if (unpublishedShiftIds.length === 0) return;

    setIsPublishing(true);
    try {
      await publishShiftsMutation.mutateAsync(unpublishedShiftIds);
      void refetchRota();
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [unpublishedShiftIds, publishShiftsMutation, refetchRota]);

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  const isLoading =
    isLoadingLocations || isLoadingSublocations || isLoadingActiveRota || isLoadingRota;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Date
    selectedDate,
    setSelectedDate,

    // Location / Sublocation
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
    locations,
    sublocations,
    activeRota,

    // Filters
    filters,
    handleFiltersChange,

    // Expand / Collapse
    expandedDepartments,
    toggleDepartment,
    expandAll,
    collapseAll,

    // Flyout
    flyoutOpen,
    selectedShiftId,
    selectedShiftData,
    handleEditShift,
    handleCloseFlyout,
    handleShiftSaved,
    handleShiftDeleted,

    // Leader modal
    leaderModalOpen,
    leaderModalShift,
    handleAssignLeader,
    handleCloseLeaderModal,
    handleLeaderSaved,

    // Export modal
    exportModalOpen,
    setExportModalOpen,

    // Bulk assign modal
    showBulkAssignModal,
    setShowBulkAssignModal,

    // Staff on leave modal
    showStaffOnLeaveModal,
    setShowStaffOnLeaveModal,

    // Publish
    isPublishing,
    handlePublishAll,

    // Auto-refresh
    isAutoRefreshEnabled,
    setIsAutoRefreshEnabled,
    isPageVisible,
    lastUpdatedText,

    // Data
    rotaData,
    filteredShifts,
    departmentGroups,
    stats,
    staffOnLeaveList,
    staffDateOfBirthMap,
    unassignedShiftsList,

    // Loading
    isLoading,
    isLoadingLocations,
    isLoadingSublocations,
    isLoadingRota,
    isRefreshing,

    // Refetch
    refetchRota,
  };
}
