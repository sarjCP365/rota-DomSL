/**
 * PeopleViewGrid Component
 *
 * Displays the rota as a flat list of staff members without unit/team grouping.
 * This is the "View by People" mode - focuses on individual schedules.
 *
 * Features:
 * - Flat staff list sorted alphabetically by default
 * - Multiple sort options (name, hours, job title)
 * - Search/filter by name, team, job title
 * - Total hours per staff member
 * - Single Unassigned row at bottom
 * - Virtual scrolling for large lists (future)
 * - Export option (future)
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { format, addDays, isSameDay, differenceInDays } from 'date-fns';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  Search,
  X,
  Download,
  Filter,
  Send,
  CheckSquare,
  XCircle,
  Users,
  Loader2,
} from 'lucide-react';
import type { ShiftViewData, SublocationStaffViewData } from '@/api/dataverse/types';
import type { DetailLevel } from '@/store/rotaStore';
import { usePublishShifts } from '@/hooks/useShifts';
import { QuickAssignPopover } from './QuickAssignPopover';
import { BulkAssignModal } from './BulkAssignModal';

// =============================================================================
// TYPES
// =============================================================================

/** Sort options for people view */
export type SortOption = 'name-asc' | 'name-desc' | 'hours-high' | 'hours-low' | 'jobTitle';

/** Filter state */
export interface FilterState {
  searchQuery: string;
  jobTitle: string | null;
  team: string | null;
  showOnlyWithShifts: boolean;
}

interface PeopleViewGridProps {
  /** Start date for the grid */
  startDate: Date;
  /** Number of days to display (7, 14, or 28) */
  duration: 7 | 14 | 28;
  /** Staff members from sublocationstaff response */
  staff: SublocationStaffViewData[];
  /** Shifts from view response */
  shifts: ShiftViewData[];
  /** Shifts from other rotas for dual-home staff (optional) */
  otherRotaShifts?: ShiftViewData[];
  /** Currently selected shift IDs */
  selectedShiftIds?: Set<string>;
  /** Callback when a shift is clicked */
  onShiftClick?: (shift: ShiftViewData) => void;
  /** Callback when a cell is clicked (for creating new shifts) */
  onCellClick?: (date: Date, staffMemberId: string | null) => void;
  /** Callback when shift selection changes */
  onSelectionChange?: (shiftIds: Set<string>) => void;
  /** Detail level - defaults to 'detailed' */
  detailLevel?: DetailLevel;
  /** Optional external sort control */
  sortBy?: SortOption;
  /** Optional external sort change handler */
  onSortChange?: (sort: SortOption) => void;
  /** Optional external filter state */
  filters?: FilterState;
  /** Optional external filter change handler */
  onFilterChange?: (filters: FilterState) => void;
  /** Absence types lookup map for showing leave reason */
  absenceTypes?: Map<string, import('../../api/dataverse/types').AbsenceType>;
}

interface ProcessedShift extends ShiftViewData {
  zone: string;
  dayIndex: number;
  shiftType: 'day' | 'night' | 'sleepIn';
  timeLabel: string;
  isPublished: boolean;
  /** True if this shift is from another rota (dual home staff) */
  isFromOtherRota?: boolean;
}

interface StaffRowData {
  staffMemberId: string;
  staffMemberName: string;
  jobTitle: string | null;
  department: string | null;
  staffTeams: string[];
  cells: Map<number, ProcessedShift[]>;
  /** Total scheduled/allocated hours for the period */
  totalHours: number;
  /** Weekly contracted hours (if available) */
  contractedHours: number | null;
  /** Leave records for the date range */
  leave: import('../../api/dataverse/types').StaffAbsenceLog[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SHIFT_BG_CLASSES = {
  day: 'bg-[#FCE4B4]',
  night: 'bg-[#BEDAE3]',
  sleepIn: 'bg-[#D3C7E6]',
  overtime: 'bg-[#E3826F] text-white',
} as const;

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  jobTitle: null,
  team: null,
  showOnlyWithShifts: false,
};

// =============================================================================
// HOURS DISPLAY COMPONENT
// =============================================================================

interface HoursDisplayProps {
  allocated: number;
  contracted: number | null;
}

/**
 * Display allocated / contracted hours with colour coding
 */
function HoursDisplay({ allocated, contracted }: HoursDisplayProps) {
  // If no contracted hours, just show allocated
  if (contracted === null || contracted === 0) {
    return (
      <span className={`text-sm font-medium ${allocated > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
        {allocated}h
      </span>
    );
  }

  // Determine colour based on variance
  const isOver = allocated > contracted;
  const isUnder = allocated < contracted;
  const atTarget = allocated === contracted;

  let colorClass = 'text-gray-900';
  if (isOver) colorClass = 'text-amber-600';
  if (isUnder && allocated > 0) colorClass = 'text-emerald-600';
  if (atTarget) colorClass = 'text-emerald-600';

  return (
    <div className="flex flex-col items-center">
      <span className={`text-sm font-medium ${colorClass}`}>{allocated}h</span>
      <span className="text-[10px] text-gray-400">/ {contracted}h</span>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getShiftType(shift: ShiftViewData): 'day' | 'night' | 'sleepIn' {
  if (shift['Sleep In']) return 'sleepIn';

  const shiftType = shift['Shift Type']?.toLowerCase() || '';
  if (shiftType.includes('night')) return 'night';
  if (shiftType.includes('sleep')) return 'sleepIn';

  const startHour =
    shift['Shift Reference Start Hour'] ?? new Date(shift['Shift Start Time']).getHours();

  if (startHour >= 20 || startHour < 6) return 'night';
  return 'day';
}

function formatTime(dateTimeStr: string): string {
  try {
    const date = new Date(dateTimeStr);
    return format(date, 'HH:mm');
  } catch {
    return '--:--';
  }
}

function getTimeLabel(shift: ShiftViewData): string {
  const start = formatTime(shift['Shift Start Time']);
  const end = formatTime(shift['Shift End Time']);
  return `${start}-${end}`;
}

function calculateZone(dayIndex: number, staffMemberId: string | null): string {
  return `${dayIndex}|${staffMemberId || 'unassigned'}`;
}

function getDayIndex(shiftDate: Date, startDate: Date): number {
  return differenceInDays(shiftDate, startDate) + 1;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PeopleViewGrid({
  startDate,
  duration,
  staff,
  shifts,
  otherRotaShifts = [],
  selectedShiftIds = new Set(),
  onShiftClick,
  onCellClick,
  onSelectionChange,
  detailLevel = 'detailed',
  sortBy: externalSortBy,
  onSortChange,
  filters: externalFilters,
  onFilterChange,
  absenceTypes,
}: PeopleViewGridProps) {
  // Internal state (used when not controlled externally)
  const [internalSortOption, setInternalSortOption] = useState<SortOption>('name-asc');
  const [internalFilters, setInternalFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Publish selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForPublish, setSelectedForPublish] = useState<Set<string>>(new Set());
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const publishShiftsMutation = usePublishShifts();
  const publishMenuRef = useRef<HTMLDivElement>(null);

  // Quick assign popover state
  const [quickAssignShift, setQuickAssignShift] = useState<{
    shiftId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Bulk assign modal state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Close publish menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (publishMenuRef.current && !publishMenuRef.current.contains(event.target as Node)) {
        setShowPublishMenu(false);
      }
    };

    if (showPublishMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPublishMenu]);

  // Use external state if provided, otherwise internal
  const sortOption = externalSortBy ?? internalSortOption;
  const filters = externalFilters ?? internalFilters;

  const handleSortChange = (sort: SortOption) => {
    if (onSortChange) {
      onSortChange(sort);
    } else {
      setInternalSortOption(sort);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    if (onFilterChange) {
      onFilterChange(newFilters);
    } else {
      setInternalFilters(newFilters);
    }
  };

  // Publish handlers
  const handleStartSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedForPublish(new Set());
    setShowPublishMenu(false);
  };

  const handleCancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedForPublish(new Set());
  };

  const handleToggleShiftSelection = (shiftId: string) => {
    setSelectedForPublish((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const handlePublishAll = async () => {
    if (unpublishedShiftIds.size === 0) return;
    try {
      await publishShiftsMutation.mutateAsync(Array.from(unpublishedShiftIds));
      setShowPublishMenu(false);
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    }
  };

  const handlePublishSelected = async () => {
    if (selectedForPublish.size === 0) return;
    try {
      await publishShiftsMutation.mutateAsync(Array.from(selectedForPublish));
      setIsSelectionMode(false);
      setSelectedForPublish(new Set());
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    }
  };

  // Generate date columns
  const dates = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < duration; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, duration]);

  // Get unique job titles and teams for filter dropdowns
  const { jobTitles, teams } = useMemo(() => {
    const jobTitleSet = new Set<string>();
    const teamSet = new Set<string>();

    for (const s of staff) {
      if (s['Job Title Name']) {
        jobTitleSet.add(s['Job Title Name']);
      }
      for (const team of s['Staff Teams'] || []) {
        teamSet.add(team);
      }
    }

    return {
      jobTitles: Array.from(jobTitleSet).sort(),
      teams: Array.from(teamSet).sort(),
    };
  }, [staff]);

  // Process shifts into grid structure
  const {
    staffRows,
    unassignedShifts,
    unassignedShiftsList,
    unassignedCount,
    unpublishedCount,
    unpublishedShiftIds,
  } = useMemo(() => {
    // Process all shifts from current rota
    const processedShifts: ProcessedShift[] = shifts.map((shift) => {
      const shiftDate = new Date(shift['Shift Date']);
      const dayIndex = getDayIndex(shiftDate, startDate);
      const staffMemberId = shift['Staff Member ID'] || null;

      return {
        ...shift,
        zone: calculateZone(dayIndex, staffMemberId),
        dayIndex,
        shiftType: getShiftType(shift),
        timeLabel: getTimeLabel(shift),
        isPublished: shift['Shift Status'] === 1001,
        isFromOtherRota: false,
      };
    });

    // Process shifts from other rotas (dual home staff)
    const processedOtherRotaShifts: ProcessedShift[] = otherRotaShifts.map((shift) => {
      const shiftDate = new Date(shift['Shift Date']);
      const dayIndex = getDayIndex(shiftDate, startDate);
      const staffMemberId = shift['Staff Member ID'] || null;

      return {
        ...shift,
        zone: calculateZone(dayIndex, staffMemberId),
        dayIndex,
        shiftType: getShiftType(shift),
        timeLabel: getTimeLabel(shift),
        isPublished: shift['Shift Status'] === 1001,
        isFromOtherRota: true, // Mark as from another rota
      };
    });

    // Combine all processed shifts, deduplicating by Shift ID
    // (a shift may appear in both arrays if a staff member belongs to multiple sublocations)
    const seenShiftIds = new Set(processedShifts.map((s) => s['Shift ID']));
    const uniqueOtherShifts = processedOtherRotaShifts.filter(
      (s) => !seenShiftIds.has(s['Shift ID'])
    );
    const allProcessedShifts = [...processedShifts, ...uniqueOtherShifts];

    // Group by staff member
    const shiftsByStaff = new Map<string, ProcessedShift[]>();
    for (const shift of allProcessedShifts) {
      const staffId = shift['Staff Member ID'] || 'unassigned';
      const existing = shiftsByStaff.get(staffId) || [];
      existing.push(shift);
      shiftsByStaff.set(staffId, existing);
    }

    // Create staff rows (filter out staff with null IDs - they shouldn't be displayed)
    const rows: StaffRowData[] = staff
      .filter((s) => !!s['Staff Member ID']) // Skip staff with null/undefined IDs
      .map((s) => {
        const staffId = s['Staff Member ID']; // Non-null after filter
        const staffShifts = shiftsByStaff.get(staffId) || [];

        // Group shifts by day
        const cells = new Map<number, ProcessedShift[]>();
        for (const shift of staffShifts) {
          const existing = cells.get(shift.dayIndex) || [];
          existing.push(shift);
          cells.set(shift.dayIndex, existing);
        }

        // Calculate total hours
        const totalHours = staffShifts.reduce((sum, shift) => {
          const start = new Date(shift['Shift Start Time']);
          const end = new Date(shift['Shift End Time']);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const breakHours = (shift['Shift Break Duration'] || 0) / 60;
          return sum + Math.max(0, hours - breakHours);
        }, 0);

        return {
          staffMemberId: staffId,
          staffMemberName: s['Staff Member Name'],
          jobTitle: s['Job Title Name'],
          department: s['Department'],
          staffTeams: s['Staff Teams'] || [],
          cells,
          totalHours: Math.round(totalHours * 10) / 10,
          contractedHours: s['Contracted Hours'] ?? null,
          leave: s['Leave'] || [],
        };
      });

    // Get unassigned shifts grouped by day
    const unassigned = shiftsByStaff.get('unassigned') || [];
    const unassignedByDay = new Map<number, ProcessedShift[]>();
    for (const shift of unassigned) {
      const existing = unassignedByDay.get(shift.dayIndex) || [];
      existing.push(shift);
      unassignedByDay.set(shift.dayIndex, existing);
    }

    // Get the original unassigned shifts (for bulk assign modal)
    const unassignedShiftsList = shifts.filter(
      (s) => !s['Staff Member ID'] || s['Staff Member ID'].trim() === ''
    );

    // Get unpublished shift IDs
    const unpublishedShifts = processedShifts.filter((s) => !s.isPublished);
    const unpublishedCount = unpublishedShifts.length;
    const unpublishedShiftIds = new Set(unpublishedShifts.map((s) => s['Shift ID']));

    return {
      staffRows: rows,
      unassignedShifts: unassignedByDay,
      unassignedShiftsList,
      unassignedCount: unassigned.length,
      unpublishedCount,
      unpublishedShiftIds,
    };
  }, [staff, shifts, otherRotaShifts, startDate]);

  // Filter staff rows
  const filteredStaffRows = useMemo(() => {
    let rows = [...staffRows];

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.staffMemberName.toLowerCase().includes(query) ||
          (row.jobTitle?.toLowerCase().includes(query) ?? false) ||
          row.staffTeams.some((team) => team.toLowerCase().includes(query))
      );
    }

    // Job title filter
    if (filters.jobTitle) {
      rows = rows.filter((row) => row.jobTitle === filters.jobTitle);
    }

    // Team filter
    if (filters.team) {
      rows = rows.filter((row) => row.staffTeams.includes(filters.team!));
    }

    // Show only with shifts filter
    if (filters.showOnlyWithShifts) {
      rows = rows.filter((row) => row.cells.size > 0);
    }

    return rows;
  }, [staffRows, filters]);

  // Sort filtered staff rows
  const sortedStaffRows = useMemo(() => {
    const rows = [...filteredStaffRows];

    switch (sortOption) {
      case 'name-asc':
        return rows.sort((a, b) => a.staffMemberName.localeCompare(b.staffMemberName));
      case 'name-desc':
        return rows.sort((a, b) => b.staffMemberName.localeCompare(a.staffMemberName));
      case 'hours-high':
        return rows.sort((a, b) => b.totalHours - a.totalHours);
      case 'hours-low':
        return rows.sort((a, b) => a.totalHours - b.totalHours);
      case 'jobTitle':
        return rows.sort((a, b) => (a.jobTitle || '').localeCompare(b.jobTitle || ''));
      default:
        return rows;
    }
  }, [filteredStaffRows, sortOption]);

  // Handle shift click
  const handleShiftClick = useCallback(
    (shift: ProcessedShift, event: React.MouseEvent) => {
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        const newSelection = new Set(selectedShiftIds);
        if (newSelection.has(shift['Shift ID'])) {
          newSelection.delete(shift['Shift ID']);
        } else {
          newSelection.add(shift['Shift ID']);
        }
        onSelectionChange?.(newSelection);
      } else {
        // Check if shift is unassigned - show quick assign popover
        const isUnassigned = !shift['Staff Member ID'] || shift['Staff Member ID'].trim() === '';

        if (isUnassigned) {
          // Show quick assign popover at click position
          setQuickAssignShift({
            shiftId: shift['Shift ID'],
            position: { x: event.clientX, y: event.clientY },
          });
        } else {
          onShiftClick?.(shift);
        }
      }
    },
    [selectedShiftIds, onShiftClick, onSelectionChange]
  );

  // Handle quick assign completion
  const handleQuickAssignComplete = useCallback(() => {
    setQuickAssignShift(null);
    // Trigger data refresh if needed
  }, []);

  // Handle opening full flyout from quick assign
  const handleOpenFlyoutFromQuickAssign = useCallback(() => {
    if (quickAssignShift) {
      // Find the shift and call onShiftClick
      const allShifts = [...shifts];
      const shift = allShifts.find((s) => s['Shift ID'] === quickAssignShift.shiftId);
      if (shift) {
        onShiftClick?.(shift);
      }
    }
    setQuickAssignShift(null);
  }, [quickAssignShift, shifts, onShiftClick]);

  // Handle cell click
  const handleCellClick = useCallback(
    (date: Date, staffMemberId: string | null) => {
      onCellClick?.(date, staffMemberId);
    },
    [onCellClick]
  );

  // Clear search
  const clearSearch = () => {
    handleFilterChange({ ...filters, searchQuery: '' });
  };

  // Clear all filters
  const clearAllFilters = () => {
    handleFilterChange(DEFAULT_FILTERS);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.searchQuery || filters.jobTitle || filters.team || filters.showOnlyWithShifts;

  // Sort menu options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'hours-high', label: 'Hours (High to Low)' },
    { value: 'hours-low', label: 'Hours (Low to High)' },
    { value: 'jobTitle', label: 'Job Title' },
  ];

  const currentSortLabel = sortOptions.find((opt) => opt.value === sortOption)?.label || 'Sort';

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border-grey bg-white">
      {/* Header bar with search, sort, and stats */}
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border-grey bg-elevation-1 px-4 py-2">
        {/* Left side: Search and filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange({ ...filters, searchQuery: e.target.value })}
              className="h-8 w-48 rounded-md border border-border-grey bg-white pl-8 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {filters.searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors ${
                hasActiveFilters
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-grey bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {
                    [filters.jobTitle, filters.team, filters.showOnlyWithShifts].filter(Boolean)
                      .length
                  }
                </span>
              )}
            </button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowFilterMenu(false);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Close filter menu"
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border-grey bg-white p-3 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Filters</span>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Job Title filter */}
                  <div className="mb-3">
                    <label
                      htmlFor="people-filter-job-title"
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      Job Title
                    </label>
                    <select
                      id="people-filter-job-title"
                      value={filters.jobTitle || ''}
                      onChange={(e) =>
                        handleFilterChange({ ...filters, jobTitle: e.target.value || null })
                      }
                      className="w-full rounded-md border border-border-grey bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">All Job Titles</option>
                      {jobTitles.map((jt) => (
                        <option key={jt} value={jt}>
                          {jt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team filter */}
                  <div className="mb-3">
                    <label
                      htmlFor="people-filter-team"
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      Team
                    </label>
                    <select
                      id="people-filter-team"
                      value={filters.team || ''}
                      onChange={(e) =>
                        handleFilterChange({ ...filters, team: e.target.value || null })
                      }
                      className="w-full rounded-md border border-border-grey bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">All Teams</option>
                      {teams.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Show only with shifts */}
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.showOnlyWithShifts}
                      onChange={(e) =>
                        handleFilterChange({ ...filters, showOnlyWithShifts: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Show only staff with shifts</span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 rounded-md border border-border-grey bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showSortMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowSortMenu(false);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Close sort menu"
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-border-grey bg-white py-1 shadow-lg">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleSortChange(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        sortOption === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side: Stats and export */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{sortedStaffRows.length}</span>
            {sortedStaffRows.length !== staffRows.length && (
              <span className="text-gray-400"> of {staffRows.length}</span>
            )}{' '}
            Staff
          </span>
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{shifts.length}</span> Shifts
          </span>

          {/* Unassigned count - clickable to open bulk assign modal */}
          <button
            onClick={() => unassignedCount > 0 && setShowBulkAssignModal(true)}
            disabled={unassignedCount === 0}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
              unassignedCount > 0
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                : 'bg-gray-100 text-gray-500 cursor-default'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{unassignedCount} Unassigned</span>
            {unassignedCount > 0 && <Users className="h-3.5 w-3.5 ml-1" />}
          </button>

          {/* Publish controls */}
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-red-700">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">{selectedForPublish.size} selected</span>
              </div>
              <button
                onClick={handlePublishSelected}
                disabled={selectedForPublish.size === 0 || publishShiftsMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Publish
              </button>
              <button
                onClick={handleCancelSelectionMode}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          ) : unpublishedCount > 0 ? (
            <div className="relative" ref={publishMenuRef}>
              <button
                onClick={() =>
                  !publishShiftsMutation.isPending && setShowPublishMenu(!showPublishMenu)
                }
                disabled={publishShiftsMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-wait"
              >
                {publishShiftsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span className="text-sm font-medium">
                  {publishShiftsMutation.isPending
                    ? 'Publishing...'
                    : `Publish (${unpublishedCount})`}
                </span>
                {!publishShiftsMutation.isPending && <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showPublishMenu && !publishShiftsMutation.isPending && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={handlePublishAll}
                    disabled={publishShiftsMutation.isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Publish All ({unpublishedCount})
                  </button>
                  <button
                    onClick={handleStartSelectionMode}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Publish Selection...
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Export button (placeholder for future) */}
          <button
            className="flex items-center gap-1.5 rounded-md border border-border-grey bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
            title="Export (coming soon)"
            disabled
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Scrollable container */}
      <div className="relative flex-1 overflow-auto">
        <table className="w-full min-w-max border-collapse">
          {/* Header row with dates */}
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              {/* Staff column header */}
              <th className="sticky left-0 z-30 w-56 min-w-56 border-b border-r border-border-grey bg-elevation-1 px-3 py-2 text-left">
                <span className="text-sm font-semibold text-gray-700">Staff Member</span>
              </th>

              {/* Total hours column - allocated / contracted */}
              <th className="w-24 min-w-24 border-b border-r border-border-grey bg-elevation-1 px-2 py-2 text-center">
                <div className="text-xs font-semibold text-gray-600">Total</div>
                <div className="text-[10px] text-gray-400">Alloc / Cont</div>
              </th>

              {/* Date headers */}
              {dates.map((date, index) => {
                const isToday = isSameDay(date, new Date());
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <th
                    key={index}
                    className={`min-w-28 border-b border-r border-border-grey px-2 py-2 text-center ${
                      isToday ? 'bg-primary/10' : isWeekend ? 'bg-gray-50' : 'bg-elevation-1'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-500">{format(date, 'EEE')}</div>
                    <div
                      className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-gray-900'}`}
                    >
                      {format(date, 'd MMM')}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Staff rows */}
            {sortedStaffRows.map((row) => (
              <PeopleStaffRow
                key={row.staffMemberId}
                row={row}
                dates={dates}
                selectedShiftIds={selectedShiftIds}
                onShiftClick={handleShiftClick}
                onCellClick={handleCellClick}
                detailLevel={detailLevel}
                isSelectionMode={isSelectionMode}
                selectedForPublish={selectedForPublish}
                onTogglePublishSelection={handleToggleShiftSelection}
                absenceTypes={absenceTypes}
              />
            ))}

            {/* Empty state */}
            {sortedStaffRows.length === 0 && (
              <tr>
                <td colSpan={dates.length + 2} className="px-4 py-12 text-center text-gray-500">
                  {hasActiveFilters
                    ? 'No staff members match your filters.'
                    : 'No staff members assigned to this sublocation.'}
                </td>
              </tr>
            )}

            {/* Unassigned row at bottom */}
            {sortedStaffRows.length > 0 && (
              <UnassignedRow
                shifts={unassignedShifts}
                dates={dates}
                totalCount={unassignedCount}
                selectedShiftIds={selectedShiftIds}
                onShiftClick={handleShiftClick}
                onCellClick={handleCellClick}
                isSelectionMode={isSelectionMode}
                selectedForPublish={selectedForPublish}
                onTogglePublishSelection={handleToggleShiftSelection}
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Assign Popover */}
      {quickAssignShift && (
        <QuickAssignPopover
          shiftId={quickAssignShift.shiftId}
          staff={staff}
          position={quickAssignShift.position}
          onClose={() => setQuickAssignShift(null)}
          onOpenFlyout={handleOpenFlyoutFromQuickAssign}
          onAssigned={handleQuickAssignComplete}
        />
      )}

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={showBulkAssignModal}
        unassignedShifts={unassignedShiftsList}
        staff={staff}
        onClose={() => setShowBulkAssignModal(false)}
        onAssigned={() => setShowBulkAssignModal(false)}
      />
    </div>
  );
}

// =============================================================================
// STAFF ROW COMPONENT
// =============================================================================

interface PeopleStaffRowProps {
  row: StaffRowData;
  dates: Date[];
  selectedShiftIds: Set<string>;
  onShiftClick: (shift: ProcessedShift, event: React.MouseEvent) => void;
  onCellClick: (date: Date, staffMemberId: string | null) => void;
  detailLevel: DetailLevel;
  /** Whether we're in publish selection mode */
  isSelectionMode?: boolean;
  /** Set of shift IDs selected for publishing */
  selectedForPublish?: Set<string>;
  /** Handler to toggle shift selection for publish */
  onTogglePublishSelection?: (shiftId: string) => void;
  /** Absence types lookup map for showing leave reason */
  absenceTypes?: Map<string, import('../../api/dataverse/types').AbsenceType>;
}

function PeopleStaffRow({
  row,
  dates,
  selectedShiftIds,
  onShiftClick,
  onCellClick,
  detailLevel,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
  absenceTypes,
}: PeopleStaffRowProps) {
  const displayName = row.staffMemberName || 'Unknown';
  const initial = displayName.charAt(0).toUpperCase();

  const isCompact = detailLevel === 'compact';
  const isHoursOnly = detailLevel === 'hoursOnly';

  // Check if staff is on leave for a specific date
  const getLeaveForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return row.leave.find((leave) => {
        const start = leave.cp365_startdate.split('T')[0];
        const end = leave.cp365_enddate.split('T')[0];
        return dateStr >= start && dateStr <= end;
      });
    },
    [row.leave]
  );

  return (
    <tr className="group hover:bg-gray-50/50">
      {/* Staff info cell */}
      <td className="sticky left-0 z-10 w-56 min-w-56 border-b border-r border-border-grey bg-white px-3 py-2 group-hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">{displayName}</div>
            {!isHoursOnly && row.jobTitle && (
              <div className="truncate text-xs text-gray-500">{row.jobTitle}</div>
            )}
            {!isHoursOnly && !isCompact && row.staffTeams.length > 0 && (
              <div className="truncate text-xs text-gray-400">{row.staffTeams.join(', ')}</div>
            )}
          </div>
        </div>
      </td>

      {/* Total hours cell - allocated / contracted */}
      <td className="w-24 min-w-24 border-b border-r border-border-grey bg-white px-2 py-2 text-center group-hover:bg-gray-50">
        <HoursDisplay allocated={row.totalHours} contracted={row.contractedHours} />
      </td>

      {/* Shift cells */}
      {dates.map((date, index) => {
        const dayIndex = index + 1;
        const shifts = row.cells.get(dayIndex) || [];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = isSameDay(date, new Date());
        const leaveRecord = getLeaveForDate(date);
        const isOnLeave = !!leaveRecord;

        // Calculate daily hours for hoursOnly mode
        const dailyHours = shifts.reduce((sum, shift) => {
          const start = new Date(shift['Shift Start Time']);
          const end = new Date(shift['Shift End Time']);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const breakHours = (shift['Shift Break Duration'] || 0) / 60;
          return sum + Math.max(0, hours - breakHours);
        }, 0);

        return (
          <td
            key={index}
            onClick={() => onCellClick(date, row.staffMemberId)}
            className={`min-w-28 border-b border-r border-border-grey p-1 align-top ${
              isOnLeave ? 'bg-red-50' : isToday ? 'bg-primary/5' : isWeekend ? 'bg-gray-50/50' : ''
            } cursor-pointer hover:bg-primary/10`}
          >
            {/* Leave indicator */}
            {isOnLeave && (
              <div
                className="mb-1 truncate rounded bg-red-100 px-1.5 py-0.5 text-center text-[10px] font-semibold text-red-700"
                title={
                  leaveRecord?.cp365_sensitive
                    ? 'On Leave (Sensitive)'
                    : leaveRecord?._cp365_absencetype_value &&
                        absenceTypes?.get(leaveRecord._cp365_absencetype_value)
                          ?.cp365_absencetypename
                      ? absenceTypes.get(leaveRecord._cp365_absencetype_value)!
                          .cp365_absencetypename
                      : 'On Leave'
                }
              >
                {leaveRecord?.cp365_sensitive
                  ? 'LEAVE'
                  : leaveRecord?._cp365_absencetype_value &&
                      absenceTypes?.get(leaveRecord._cp365_absencetype_value)
                    ? absenceTypes
                        .get(leaveRecord._cp365_absencetype_value)!
                        .cp365_absencetypename.toUpperCase()
                    : 'LEAVE'}
              </div>
            )}
            {isHoursOnly ? (
              <div className="flex h-10 items-center justify-center">
                {shifts.length > 0 && (
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(dailyHours * 10) / 10}h
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {shifts.map((shift) => {
                  const shiftId = shift['Shift ID'];
                  const isUnpublished = !shift.isPublished;

                  // In selection mode, clicking unpublished shifts toggles selection
                  const handleClick = (e: React.MouseEvent) => {
                    if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                      e.stopPropagation();
                      onTogglePublishSelection(shiftId);
                    } else {
                      onShiftClick(shift, e);
                    }
                  };

                  return (
                    <PeopleShiftCard
                      key={shiftId}
                      shift={shift}
                      isSelected={selectedShiftIds.has(shiftId)}
                      onClick={handleClick}
                      isCompact={isCompact}
                      isSelectionMode={isSelectionMode}
                      isSelectedForPublish={selectedForPublish?.has(shiftId)}
                    />
                  );
                })}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// =============================================================================
// UNASSIGNED ROW COMPONENT
// =============================================================================

interface UnassignedRowProps {
  shifts: Map<number, ProcessedShift[]>;
  dates: Date[];
  totalCount: number;
  selectedShiftIds: Set<string>;
  onShiftClick: (shift: ProcessedShift, event: React.MouseEvent) => void;
  onCellClick: (date: Date, staffMemberId: string | null) => void;
  /** Whether we're in publish selection mode */
  isSelectionMode?: boolean;
  /** Set of shift IDs selected for publishing */
  selectedForPublish?: Set<string>;
  /** Handler to toggle shift selection for publish */
  onTogglePublishSelection?: (shiftId: string) => void;
}

function UnassignedRow({
  shifts,
  dates,
  totalCount,
  selectedShiftIds,
  onShiftClick,
  onCellClick,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
}: UnassignedRowProps) {
  const hasUnassigned = totalCount > 0;

  return (
    <tr className={`bg-[#f5f5f5] ${hasUnassigned ? '' : ''}`}>
      {/* Unassigned label */}
      <td
        className={`sticky left-0 z-10 w-56 min-w-56 border-b border-r ${
          hasUnassigned ? 'border-b-warning border-b-2' : 'border-border-grey'
        } bg-[#f5f5f5] px-3 py-2`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              hasUnassigned ? 'bg-warning/20' : 'bg-gray-200'
            }`}
          >
            <span className="text-lg" role="img" aria-label="unassigned">
              {hasUnassigned ? '⚠️' : '📋'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${hasUnassigned ? 'text-gray-900' : 'text-gray-600'}`}
            >
              Unassigned
            </span>
            {hasUnassigned && (
              <span className="inline-flex items-center justify-center rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-white">
                {totalCount}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Empty total cell */}
      <td
        className={`w-24 min-w-24 border-b border-r ${
          hasUnassigned ? 'border-b-warning border-b-2' : 'border-border-grey'
        } border-r-border-grey bg-[#f5f5f5] px-2 py-2`}
      />

      {/* Unassigned shift cells */}
      {dates.map((date, index) => {
        const dayIndex = index + 1;
        const dayShifts = shifts.get(dayIndex) || [];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = isSameDay(date, new Date());

        return (
          <td
            key={index}
            onClick={() => onCellClick(date, null)}
            className={`min-w-28 border-r ${
              hasUnassigned ? 'border-b-2 border-b-warning' : 'border-b border-border-grey'
            } border-r-border-grey p-1 align-top ${
              isToday ? 'bg-[#ebebeb]' : isWeekend ? 'bg-[#ebebeb]' : 'bg-[#f5f5f5]'
            } cursor-pointer hover:bg-gray-200`}
          >
            <div className="flex flex-col gap-1">
              {dayShifts.map((shift) => {
                const shiftId = shift['Shift ID'];
                const isUnpublished = !shift.isPublished;

                // In selection mode, clicking unpublished shifts toggles selection
                const handleClick = (e: React.MouseEvent) => {
                  if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                    e.stopPropagation();
                    onTogglePublishSelection(shiftId);
                  } else {
                    onShiftClick(shift, e);
                  }
                };

                return (
                  <PeopleShiftCard
                    key={shiftId}
                    shift={shift}
                    isSelected={selectedShiftIds.has(shiftId)}
                    onClick={handleClick}
                    isUnassigned
                    isSelectionMode={isSelectionMode}
                    isSelectedForPublish={selectedForPublish?.has(shiftId)}
                  />
                );
              })}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// =============================================================================
// SHIFT CARD COMPONENT
// =============================================================================

interface PeopleShiftCardProps {
  shift: ProcessedShift;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => void;
  isUnassigned?: boolean;
  isCompact?: boolean;
  /** Whether we're in publish selection mode */
  isSelectionMode?: boolean;
  /** Whether this shift is selected for publishing */
  isSelectedForPublish?: boolean;
}

function PeopleShiftCard({
  shift,
  isSelected,
  onClick,
  isUnassigned,
  isCompact,
  isSelectionMode,
  isSelectedForPublish,
}: PeopleShiftCardProps) {
  const isOvertime = shift['Overtime Shift'];
  const shiftType = shift.shiftType;
  const isExternalStaff = shift['Is External Staff'] === true;
  const isFromOtherRota = shift.isFromOtherRota === true;

  // Determine background class based on shift source:
  // - Other rota shifts: light gray with distinct styling
  // - External staff shifts (same rota, different sublocation): gray
  // - Regular shifts: colored by shift type
  const bgClass = isFromOtherRota
    ? 'bg-slate-100 text-slate-600'
    : isExternalStaff
      ? 'bg-gray-200 text-gray-600'
      : isOvertime
        ? SHIFT_BG_CLASSES.overtime
        : SHIFT_BG_CLASSES[shiftType];

  const iconEmoji = isFromOtherRota
    ? '🔗' // Chain link to indicate linked from another rota
    : shiftType === 'night'
      ? '🌙'
      : shiftType === 'sleepIn'
        ? '🛏️'
        : '☀️';

  // In selection mode, only unpublished shifts can be selected
  const canBeSelected = isSelectionMode && !shift.isPublished;

  // Get the title/tooltip text
  const getTooltipText = () => {
    if (isFromOtherRota) {
      return `Working at: ${shift['Rota Name'] || 'Other Location'}`;
    }
    if (isExternalStaff) {
      return 'External staff (from another sublocation)';
    }
    if (!shift.isPublished) {
      return isSelectionMode ? 'Click to select for publishing' : 'Unpublished shift';
    }
    return undefined;
  };

  // Compact view
  if (isCompact) {
    return (
      <button
        onClick={isFromOtherRota ? undefined : onClick} // Other rota shifts are read-only
        title={getTooltipText()}
        className={`
          group/card relative w-full rounded-md px-2 py-1 text-left transition-all
          ${bgClass}
          ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
          ${isSelectedForPublish ? 'ring-2 ring-red-500 ring-offset-1' : ''}
          ${isUnassigned ? 'border-2 border-dashed border-gray-500' : ''}
          ${isFromOtherRota ? 'border border-solid border-slate-300 cursor-default' : ''}
          ${isExternalStaff && !isFromOtherRota ? 'border border-dashed border-gray-400 opacity-80' : ''}
          ${!shift.isPublished && !isUnassigned && !isExternalStaff && !isFromOtherRota && !isSelectedForPublish ? 'border-2 border-dashed border-gray-400' : ''}
          ${canBeSelected && !isFromOtherRota ? 'cursor-pointer hover:ring-2 hover:ring-red-300' : ''}
          ${!isFromOtherRota ? 'hover:shadow-md hover:brightness-95' : ''}
        `}
      >
        <div className="flex items-center gap-1">
          <span
            className="text-sm"
            role="img"
            aria-label={isFromOtherRota ? 'other-rota' : shiftType}
          >
            {iconEmoji}
          </span>
          <span className="text-xs font-semibold">{shift.timeLabel}</span>
          {!shift.isPublished && !isFromOtherRota && (
            <span className="ml-auto text-[9px] font-bold text-gray-600">*</span>
          )}
        </div>
        {/* Show rota name for other rota shifts */}
        {isFromOtherRota && shift['Rota Name'] && (
          <div className="mt-0.5 text-[10px] text-slate-500 truncate">{shift['Rota Name']}</div>
        )}
        {isSelected && (
          <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-white">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>
    );
  }

  // Detailed view
  return (
    <button
      onClick={isFromOtherRota ? undefined : onClick} // Other rota shifts are read-only
      title={getTooltipText()}
      className={`
        group/card relative w-full rounded-md px-2 py-1.5 text-left transition-all
        ${bgClass}
        ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
        ${isSelectedForPublish ? 'ring-2 ring-red-500 ring-offset-1' : ''}
        ${isUnassigned ? 'border-2 border-dashed border-gray-500' : ''}
        ${isFromOtherRota ? 'border border-solid border-slate-300 cursor-default' : ''}
        ${isExternalStaff && !isFromOtherRota ? 'border border-dashed border-gray-400 opacity-80' : ''}
        ${!shift.isPublished && !isUnassigned && !isExternalStaff && !isFromOtherRota && !isSelectedForPublish ? 'border-2 border-dashed border-gray-400' : ''}
        ${canBeSelected && !isFromOtherRota ? 'cursor-pointer hover:ring-2 hover:ring-red-300' : ''}
        ${!isFromOtherRota ? 'hover:shadow-md hover:brightness-95' : ''}
      `}
    >
      {/* Time and icon row */}
      <div className="flex items-center gap-1">
        <span
          className="text-base"
          role="img"
          aria-label={isFromOtherRota ? 'other-rota' : shiftType}
        >
          {iconEmoji}
        </span>
        <span className="text-xs font-semibold">{shift.timeLabel}</span>
      </div>

      {/* Show rota name for other rota shifts */}
      {isFromOtherRota && shift['Rota Name'] && (
        <div className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
          📍 {shift['Rota Name']}
        </div>
      )}

      {/* Shift name/reference (only for regular shifts) */}
      {!isFromOtherRota && shift['Shift Reference Name'] && (
        <div className="mt-0.5 truncate text-[10px] text-gray-700">
          {shift['Shift Reference Name']}
        </div>
      )}

      {/* Shift Activity - shows activity type with care/non-care indicator (detailed view only) */}
      {!isFromOtherRota && shift['Shift Activity'] && (
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className={`inline-flex items-center truncate rounded px-1 py-0.5 text-[9px] font-semibold ${
              shift['Shift Activity Care Type'] === 'Non-Care'
                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}
            title={`Activity: ${shift['Shift Activity']}${shift['Shift Activity Care Type'] ? ` (${shift['Shift Activity Care Type']})` : ''}`}
          >
            {shift['Shift Activity Care Type'] === 'Non-Care' ? '○' : '●'} {shift['Shift Activity']}
          </span>
        </div>
      )}

      {/* Badges row - only show for regular shifts, not other rota shifts */}
      {!isFromOtherRota && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {!shift.isPublished && (
            <span className="rounded bg-gray-900/20 px-1 text-[9px] font-bold text-gray-800">
              *
            </span>
          )}

          {shift['Shift Leader'] && (
            <span className="rounded bg-primary/30 px-1 text-[9px] font-medium text-primary-pressed">
              SL
            </span>
          )}

          {shift['Act Up'] && (
            <span className="rounded bg-secondary/30 px-1 text-[9px] font-medium text-secondary-pressed">
              AU
            </span>
          )}

          {shift['Senior'] && (
            <span className="rounded bg-gray-500/30 px-1 text-[9px] font-medium text-gray-700">
              SR
            </span>
          )}

          {shift['Community Hours'] > 0 && (
            <span className="rounded bg-stats-community-bold/50 px-1 text-[9px] font-medium">
              {shift['Community Hours']}h
            </span>
          )}
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { PeopleViewGridProps };
