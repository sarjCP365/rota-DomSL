/**
 * DailyView Page
 * Daily rota management view showing all shifts for a single day
 * Focused on day-of operations and attendance tracking
 * Design aligned with cp365-complex-ld
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import {
  Calendar,
  Download,
  Users,
  Clock,
  ChevronLeft,
  AlertCircle,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { SideNav, useSideNav } from '../components/common/SideNav';
import { Loading } from '../components/common/Loading';
import { ViewToggle } from '../components/common/ViewToggle';
import { DateNavigation } from '../components/daily/DateNavigation';
import { useLocationSettings, useViewPreferences } from '../store/settingsStore';
import { DailyFilterBar, type DailyFilters, type ShiftType } from '../components/daily/DailyFilterBar';
import { DepartmentSection, type DepartmentType } from '../components/daily/DepartmentSection';
import { ShiftCard } from '../components/daily/ShiftCard';
import { DailyShiftFlyout } from '../components/daily/DailyShiftFlyout';
import { ShiftLeaderModal } from '../components/daily/ShiftLeaderModal';
import { LastUpdatedIndicator } from '../components/daily/LastUpdatedIndicator';
import { ExportModal } from '../components/daily/ExportModal';
import { BulkAssignModal } from '../components/rota/BulkAssignModal';
import { useLocations, useSublocations, useActiveRota } from '../hooks/useLocations';
import { useRotaData } from '../hooks/useRotaData';
import { usePublishShifts } from '../hooks/useShifts';
import { useQueryClient } from '@tanstack/react-query';
import {
  type AttendanceStatus,
  type ShiftWithAttendance,
  getAttendanceStatus as getAttendanceStatusUtil,
} from '../utils/attendanceStatus';
import type { ShiftViewData } from '../api/dataverse/types';

// ============================================================================
// Types
// ============================================================================

interface DepartmentGroup {
  id: string;
  name: string;
  type: DepartmentType;
  shifts: ShiftViewData[];
  staffCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

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
  const startHour = shift['Shift Start Time'] 
    ? new Date(shift['Shift Start Time']).getHours() 
    : 8;
  
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

// ============================================================================
// Main Component
// ============================================================================

export function DailyView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

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
  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date);
    setLastSelectedDate(date);
  }, [setLastSelectedDate]);

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

  // Filter panel visibility (mobile) - TODO: implement in Prompt 14
  // const [showFilters, setShowFilters] = useState(false);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const { data: locations, isLoading: isLoadingLocations } = useLocations();
  const { data: sublocations, isLoading: isLoadingSublocations } = useSublocations(selectedLocationId);
  const { data: activeRota, isLoading: isLoadingActiveRota } = useActiveRota(selectedSublocationId);

  // Query client for manual invalidation
  const queryClient = useQueryClient();

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

  // Debug: Log when rota data changes
  useEffect(() => {
    console.log('[DailyView] Rota data received:', {
      hasData: !!rotaData,
      shiftsCount: rotaData?.shifts?.length ?? 0,
      staffCount: rotaData?.staff?.length ?? 0,
      stats: rotaData?.stats,
      activeRotaId: activeRota?.cp365_rotaid,
      selectedDate: format(selectedDate, 'yyyy-MM-dd'),
    });
  }, [rotaData, activeRota, selectedDate]);

  // -------------------------------------------------------------------------
  // Auto-select Location/Sublocation
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!locations?.length) return;
    const savedLocationExists = selectedLocationId && 
      locations.some(loc => loc.cp365_locationid === selectedLocationId);
    if (!savedLocationExists) {
      setSelectedLocationId(locations[0].cp365_locationid);
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);

  useEffect(() => {
    if (!sublocations?.length) {
      setSelectedSublocationId('');
      return;
    }
    const savedSublocationExists = selectedSublocationId &&
      sublocations.some(sub => sub.cp365_sublocationid === selectedSublocationId);
    if (!savedSublocationExists) {
      setSelectedSublocationId(sublocations[0].cp365_sublocationid);
    }
  }, [sublocations, selectedSublocationId, setSelectedSublocationId]);

  // -------------------------------------------------------------------------
  // URL Sync
  // -------------------------------------------------------------------------

  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (searchParams.get('date') !== dateStr) {
      setSearchParams({ date: dateStr }, { replace: true });
    }
  }, [selectedDate, searchParams, setSearchParams]);

  // -------------------------------------------------------------------------
  // Real-time Updates (Prompt 13)
  // -------------------------------------------------------------------------

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      
      // Refetch when page becomes visible again
      if (visible && isAutoRefreshEnabled) {
        refetchRota();
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
      refetchRota();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, isPageVisible, refetchRota]);

  // -------------------------------------------------------------------------
  // Navigation Handlers
  // -------------------------------------------------------------------------

  // Set current view mode on mount
  useEffect(() => {
    setLastViewMode('day');
  }, [setLastViewMode]);

  // -------------------------------------------------------------------------
  // Filter Handlers
  // -------------------------------------------------------------------------

  const handleFiltersChange = useCallback((newFilters: DailyFilters) => {
    setFilters(newFilters);
  }, []);

  // -------------------------------------------------------------------------
  // Department Expand/Collapse
  // -------------------------------------------------------------------------

  const toggleDepartment = useCallback((deptId: string) => {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allDeptIds = departmentGroups.map(d => d.id);
    setExpandedDepartments(new Set(allDeptIds));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedDepartments(new Set());
  }, []);

  // -------------------------------------------------------------------------
  // Computed Data
  // -------------------------------------------------------------------------

  // Filter shifts for selected date
  const shiftsForDate = useMemo(() => {
    if (!rotaData?.shifts) {
      console.log('[DailyView] No rota data available');
      return [];
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    console.log('[DailyView] Filtering shifts for date:', dateStr);
    console.log('[DailyView] Total shifts in rotaData:', rotaData.shifts.length);
    
    const filtered = rotaData.shifts.filter(shift => {
      const shiftDate = shift['Shift Date'];
      if (!shiftDate) return false;
      const shiftDateStr = format(new Date(shiftDate), 'yyyy-MM-dd');
      return shiftDateStr === dateStr;
    });
    
    console.log('[DailyView] Shifts for selected date:', filtered.length);
    if (filtered.length > 0) {
      console.log('[DailyView] Sample shift:', {
        id: filtered[0]['Shift ID']?.slice(-8),
        date: filtered[0]['Shift Date'],
        status: filtered[0]['Shift Status'],
        staffId: filtered[0]['Staff Member ID'],
      });
    }
    
    return filtered;
  }, [rotaData?.shifts, selectedDate]);

  // Apply filters
  const filteredShifts = useMemo(() => {
    let result = shiftsForDate;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(shift => {
        const staffName = shift['Staff Member Name']?.toLowerCase() || '';
        return staffName.includes(searchLower);
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(shift => getAttendanceStatus(shift) === filters.status);
    }

    // Shift type filter
    if (filters.shiftType !== 'all') {
      result = result.filter(shift => getShiftType(shift) === filters.shiftType);
    }

    return result;
  }, [shiftsForDate, filters]);

  // -------------------------------------------------------------------------
  // Shift Action Handlers (must be after filteredShifts is defined)
  // -------------------------------------------------------------------------

  const handleEditShift = useCallback((shiftId: string) => {
    // Find the shift data for the flyout
    const shift = filteredShifts.find(s => s['Shift ID'] === shiftId);
    setSelectedShiftId(shiftId);
    setSelectedShiftData(shift);
    setFlyoutOpen(true);
  }, [filteredShifts]);

  const handleCloseFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setSelectedShiftId(undefined);
    setSelectedShiftData(undefined);
  }, []);

  const handleShiftSaved = useCallback(() => {
    // Refetch data after save
    refetchRota();
  }, [refetchRota]);

  const handleShiftDeleted = useCallback(() => {
    // Refetch data after delete
    refetchRota();
  }, [refetchRota]);

  const handleAssignLeader = useCallback((shiftId: string) => {
    const shift = filteredShifts.find(s => s['Shift ID'] === shiftId);
    if (shift) {
      setLeaderModalShift(shift);
      setLeaderModalOpen(true);
    }
  }, [filteredShifts]);

  const handleCloseLeaderModal = useCallback(() => {
    setLeaderModalOpen(false);
    setLeaderModalShift(null);
  }, []);

  const handleLeaderSaved = useCallback(() => {
    refetchRota();
  }, [refetchRota]);

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
      const dept = shift['Department'] || 
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
        staffCount: new Set(shifts.map(s => s['Staff Member ID']).filter(Boolean)).size,
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
    if (externalShifts.length > 0 && (filters.department === 'all' || filters.department === 'other-locations')) {
      result.push({
        id: 'other-locations',
        name: 'Shifts From Other Locations',
        type: 'other-locations',
        shifts: externalShifts,
        staffCount: new Set(externalShifts.map(s => s['Staff Member ID']).filter(Boolean)).size,
      });
    }

    return result;
  }, [filteredShifts, filters.department]);

  // Statistics
  const stats = useMemo(() => {
    const uniqueStaff = new Set(
      filteredShifts
        .map(s => s['Staff Member ID'])
        .filter(Boolean)
    );
    
    const totalHours = filteredShifts.reduce((sum, shift) => {
      return sum + calculateWorkingHours(shift);
    }, 0);

    // Count unassigned shifts
    const unassignedCount = filteredShifts.filter(
      s => !s['Staff Member ID']
    ).length;

    // Count unpublished shifts (status !== 1001 Published)
    const unpublishedShifts = filteredShifts.filter(
      s => s['Shift Status'] !== 1001
    );
    const unpublishedCount = unpublishedShifts.length;

    // Count staff on leave for the selected date
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const staffOnLeaveCount = (rotaData?.staff || []).filter(s => {
      const leaveRecords = s['Leave'] || [];
      return leaveRecords.some(leave => {
        const start = leave.cp365_startdate?.split('T')[0];
        const end = leave.cp365_enddate?.split('T')[0];
        return start && end && dateStr >= start && dateStr <= end;
      });
    }).length;

    // Debug: Log shift statuses
    console.log('[DailyView] Stats calculation:', {
      totalShifts: filteredShifts.length,
      shiftsForDateCount: shiftsForDate.length,
      unpublishedCount,
      unassignedCount,
      staffOnLeave: staffOnLeaveCount,
      shiftStatuses: filteredShifts.map(s => ({
        id: s['Shift ID']?.slice(-8),
        date: s['Shift Date']?.split('T')[0],
        status: s['Shift Status'],
        isPublished: s['Shift Status'] === 1001,
      })),
    });

    return {
      staffCount: uniqueStaff.size,
      totalHours: Math.round(totalHours * 10) / 10,
      unassignedCount,
      unpublishedCount,
      staffOnLeave: staffOnLeaveCount,
    };
  }, [filteredShifts, shiftsForDate, selectedDate, rotaData?.staff]);

  // Get detailed list of staff on leave for the modal
  const staffOnLeaveList = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return (rotaData?.staff || [])
      .map(s => {
        const leaveRecords = s['Leave'] || [];
        const activeLeave = leaveRecords.find(leave => {
          const start = leave.cp365_startdate?.split('T')[0];
          const end = leave.cp365_enddate?.split('T')[0];
          return start && end && dateStr >= start && dateStr <= end;
        });
        if (!activeLeave) return null;
        
        // Get absence type name
        const absenceTypeName = activeLeave.cp365_absencetype?.cp365_absencetypename || 'Leave';
        const isSensitive = activeLeave.cp365_sensitive || activeLeave.cp365_absencetype?.cp365_sensitive;
        
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
    (rotaData?.staff || []).forEach(s => {
      map.set(s['Staff Member ID'], s['Date of Birth'] || null);
    });
    return map;
  }, [rotaData?.staff]);

  // Get unassigned shifts for bulk assign modal
  const unassignedShiftsList = useMemo(() => {
    return filteredShifts.filter(s => !s['Staff Member ID']);
  }, [filteredShifts]);

  // Get unpublished shifts for publish functionality
  const unpublishedShiftIds = useMemo(() => {
    return filteredShifts
      .filter(s => s['Shift Status'] !== 1001)
      .map(s => s['Shift ID']);
  }, [filteredShifts]);

  // Handler to publish all unpublished shifts for the day
  const handlePublishAll = useCallback(async () => {
    if (unpublishedShiftIds.length === 0) return;
    
    setIsPublishing(true);
    try {
      await publishShiftsMutation.mutateAsync(unpublishedShiftIds);
      refetchRota();
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [unpublishedShiftIds, publishShiftsMutation, refetchRota]);

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  const isLoading = isLoadingLocations || isLoadingSublocations || isLoadingActiveRota || isLoadingRota;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Dark Sidebar */}
      <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ============================================================= */}
        {/* HEADER BAR - Emerald Gradient (matching cp365-complex-ld) */}
        {/* ============================================================= */}
        <header className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          {/* Mobile Layout: Stacked */}
          <div className="flex flex-col gap-2 md:hidden">
            {/* Top Row: Menu + Title + Export */}
            <div className="flex items-center justify-between">
              <button
                onClick={toggleSideNav}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold">Daily Rota</h1>
              <button
                onClick={() => setExportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5 text-xs font-medium hover:bg-white/30"
                title="Export PDF"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Second Row: View Toggle */}
            <div className="flex items-center justify-center">
              <ViewToggle currentView="day" currentDate={selectedDate} size="sm" variant="emerald" />
            </div>
            {/* Third Row: Date Navigation */}
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              isLoading={isLoading}
            />
          </div>

          {/* Desktop Layout: Single Row */}
          <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
            {/* Left: Title + View Toggle */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold">Daily Rota</h1>
                <p className="text-sm text-emerald-100">Day-of operations & attendance</p>
              </div>
              <ViewToggle currentView="day" currentDate={selectedDate} variant="emerald" />
            </div>

            {/* Centre: Date Navigation */}
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              isLoading={isLoading}
            />

            {/* Right: Export Button */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
              title="Export PDF"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* ============================================================= */}
        {/* FILTER BAR - White Background */}
        {/* ============================================================= */}
        <DailyFilterBar
          filters={filters}
          onFilterChange={handleFiltersChange}
          locations={locations || []}
          sublocations={sublocations || []}
          selectedLocationId={selectedLocationId}
          onLocationChange={setSelectedLocationId}
          selectedSublocationId={selectedSublocationId}
          onSublocationChange={setSelectedSublocationId}
          departments={departmentGroups.map(d => d.name)}
          isLoading={isLoading}
          isLoadingLocations={isLoadingLocations}
          isLoadingSublocations={isLoadingSublocations}
          onRefresh={() => refetchRota()}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

        {/* ============================================================= */}
        {/* STATISTICS ROW */}
        {/* ============================================================= */}
        <div className="border-b border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="flex items-center justify-between gap-3">
              {/* Compact Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <div>
                    <span className="text-lg font-bold text-emerald-600">{stats.staffCount}</span>
                    <span className="ml-1 text-xs text-slate-500">staff</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <div>
                    <span className="text-lg font-bold text-emerald-600">{stats.totalHours}</span>
                    <span className="ml-1 text-xs text-slate-500">hours</span>
                  </div>
                </div>
                {/* Unassigned Count - Clickable for Bulk Assign */}
                {stats.unassignedCount > 0 && (
                  <button
                    onClick={() => setShowBulkAssignModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 hover:bg-amber-200 transition-colors"
                  >
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <div>
                      <span className="text-lg font-bold text-amber-600">{stats.unassignedCount}</span>
                      <span className="ml-1 text-xs text-amber-700">unassigned</span>
                    </div>
                  </button>
                )}
                {/* Staff on Leave - Clickable to show list */}
                {stats.staffOnLeave > 0 && (
                  <button
                    onClick={() => setShowStaffOnLeaveModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 hover:bg-red-200 transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-red-600" />
                    <div>
                      <span className="text-lg font-bold text-red-600">{stats.staffOnLeave}</span>
                      <span className="ml-1 text-xs text-red-700">on leave</span>
                    </div>
                  </button>
                )}
                {/* Unpublished Count - Clickable to Publish All */}
                {stats.unpublishedCount > 0 && (
                  <button
                    onClick={handlePublishAll}
                    disabled={isPublishing}
                    className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 text-emerald-600" />
                    )}
                    <div>
                      <span className="text-lg font-bold text-emerald-600">{stats.unpublishedCount}</span>
                      <span className="ml-1 text-xs text-emerald-700">
                        {isPublishing ? 'publishing...' : 'publish'}
                      </span>
                    </div>
                  </button>
                )}
              </div>
              {/* Compact Last Updated */}
              <LastUpdatedIndicator
                lastUpdatedText={lastUpdatedText}
                isRefreshing={isRefreshing && !isLoadingRota}
                onRefresh={() => refetchRota()}
                compact
              />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between gap-4">
            <div className="flex gap-4">
              {/* Staff Count Card */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.staffCount}</div>
                  <div className="text-xs text-slate-500">Staff on Shifts</div>
                </div>
              </div>

              {/* Total Hours Card */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.totalHours}</div>
                  <div className="text-xs text-slate-500">Total Rostered Hours</div>
                </div>
              </div>

              {/* Unassigned Shifts Card - Clickable for Bulk Assign */}
              {stats.unassignedCount > 0 && (
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm hover:bg-amber-100 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{stats.unassignedCount}</div>
                    <div className="text-xs text-amber-700">Unassigned Shifts</div>
                  </div>
                </button>
              )}

              {/* Staff on Leave Card - Clickable to show list */}
              {stats.staffOnLeave > 0 && (
                <button
                  onClick={() => setShowStaffOnLeaveModal(true)}
                  className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm hover:bg-red-100 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Calendar className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-red-600">{stats.staffOnLeave}</div>
                    <div className="text-xs text-red-700">On Leave</div>
                  </div>
                </button>
              )}

              {/* Unpublished Shifts Card - Clickable to Publish All */}
              {stats.unpublishedCount > 0 && (
                <button
                  onClick={handlePublishAll}
                  disabled={isPublishing}
                  className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    {isPublishing ? (
                      <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{stats.unpublishedCount}</div>
                    <div className="text-xs text-emerald-700">
                      {isPublishing ? 'Publishing...' : 'Publish All'}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Last Updated Indicator */}
            <LastUpdatedIndicator
              lastUpdatedText={lastUpdatedText}
              isRefreshing={isRefreshing && !isLoadingRota}
              onRefresh={() => refetchRota()}
              isAutoRefreshEnabled={isAutoRefreshEnabled}
              onToggleAutoRefresh={setIsAutoRefreshEnabled}
              isPageVisible={isPageVisible}
            />
          </div>
        </div>

        {/* ============================================================= */}
        {/* DEPARTMENT SECTIONS (Scrollable) */}
        {/* ============================================================= */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading message="Loading shifts..." />
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 px-4 text-center">
              <Calendar className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">No shifts for this date</p>
              <p className="text-sm">
                {filters.search || filters.department !== 'all' || filters.status !== 'all' || filters.shiftType !== 'all'
                  ? 'Try adjusting your filters' 
                  : 'There are no shifts scheduled for this day'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {departmentGroups.map((dept) => (
                <DepartmentSection
                  key={dept.id}
                  department={{ id: dept.id, name: dept.name, type: dept.type }}
                  staffCount={dept.staffCount}
                  isExpanded={expandedDepartments.has(dept.id) || expandedDepartments.has('all')}
                  onToggle={() => toggleDepartment(dept.id)}
                >
                  {dept.shifts.map((shift) => (
                    <ShiftCard
                      key={shift['Shift ID']}
                      shift={shift}
                      onEdit={handleEditShift}
                      onAssignLeader={handleAssignLeader}
                      isAgency={dept.type === 'agency'}
                      isExternal={dept.type === 'other-locations'}
                      isUnpublished={shift['Shift Status'] !== 1001}
                      dateOfBirth={shift['Staff Member ID'] ? staffDateOfBirthMap.get(shift['Staff Member ID']) : null}
                      currentDate={selectedDate}
                    />
                  ))}
                </DepartmentSection>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Shift Flyout */}
      <DailyShiftFlyout
        isOpen={flyoutOpen}
        onClose={handleCloseFlyout}
        shiftId={selectedShiftId}
        shiftData={selectedShiftData}
        locationId={selectedLocationId}
        sublocationId={selectedSublocationId}
        onSave={handleShiftSaved}
        onDelete={handleShiftDeleted}
      />

      {/* Shift Leader Modal */}
      <ShiftLeaderModal
        isOpen={leaderModalOpen}
        onClose={handleCloseLeaderModal}
        shift={leaderModalShift}
        onSave={handleLeaderSaved}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        selectedDate={selectedDate}
        sublocationName={sublocations?.find(s => s.cp365_sublocationid === selectedSublocationId)?.cp365_sublocationname || 'Unknown Location'}
        sublocationId={selectedSublocationId}
        rotaId={activeRota?.cp365_rotaid}
        shifts={filteredShifts}
        stats={stats}
      />

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={showBulkAssignModal}
        unassignedShifts={unassignedShiftsList}
        staff={rotaData?.staff || []}
        onClose={() => setShowBulkAssignModal(false)}
        onAssigned={() => {
          setShowBulkAssignModal(false);
          refetchRota();
        }}
      />

      {/* Staff on Leave Modal */}
      {showStaffOnLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowStaffOnLeaveModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md max-h-[80vh] rounded-lg bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Staff on Leave</h2>
                  <p className="text-sm text-slate-500">
                    {format(selectedDate, 'EEEE, d MMMM yyyy')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStaffOnLeaveModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {staffOnLeaveList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No staff on leave for this date.
                </div>
              ) : (
                <div className="space-y-3">
                  {staffOnLeaveList.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                        {staff.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800">{staff.name}</div>
                        {staff.jobTitle && (
                          <div className="text-sm text-slate-500">{staff.jobTitle}</div>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            staff.isSensitive
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {staff.leaveType}
                          </span>
                          {staff.startDate && staff.endDate && !staff.isSensitive && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(staff.startDate), 'd MMM')} - {format(new Date(staff.endDate), 'd MMM')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4">
              <div className="text-sm text-slate-500">
                {staffOnLeaveList.length} staff member{staffOnLeaveList.length !== 1 ? 's' : ''} on leave
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyView;

