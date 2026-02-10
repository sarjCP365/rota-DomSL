/**
 * RotaGrid Component
 * Main rota scheduling grid showing staff rows and shift blocks
 * Based on specification section 5.1
 *
 * Supports multiple view modes:
 * - 'people': Flat list of staff members (default) - uses PeopleViewGrid
 * - 'team': Hierarchical Unit > Team > Staff grouping (coming soon)
 * - 'shiftReference': Coverage by shift type (coming soon)
 */

import { useMemo, useCallback, useState } from 'react';
import { format, addDays, isSameDay, differenceInDays } from 'date-fns';
import { AlertCircle, ArrowUpDown, ChevronDown, Clock } from 'lucide-react';
import type {
  ShiftViewData,
  SublocationStaffViewData,
  ShiftReference,
  Shift,
  StaffMember,
  HierarchicalRotaData,
  ShiftStatus,
  ShiftType,
  StaffStatus,
  YesNo,
} from '@/api/dataverse/types';
import type { ViewMode, DetailLevel } from '@/store/rotaStore';
import { PeopleViewGrid, type SortOption } from './PeopleViewGrid';
import { ShiftReferenceViewGrid, type StaffingRequirement } from './ShiftReferenceViewGrid';
import { TeamViewGrid } from './TeamViewGrid';

// =============================================================================
// TYPES
// =============================================================================

// Re-export SortOption from PeopleViewGrid for backwards compatibility
export type { SortOption };

interface RotaGridProps {
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
  /** View mode - defaults to 'people' */
  viewMode?: ViewMode;
  /** Detail level - defaults to 'detailed' */
  detailLevel?: DetailLevel;
  /** Shift references for Shift Reference View mode (optional) */
  shiftReferences?: ShiftReference[];
  /** Staffing requirements per shift type (optional) */
  staffingRequirements?: StaffingRequirement[];
  /** Callback when "Fill Gap" is clicked in Shift Reference View */
  onFillGap?: (shiftReferenceId: string, date: Date) => void;
  /** Callback when "Add Shift" is clicked in Shift Reference View (empty cell) */
  onAddShift?: (shiftReferenceId: string, date: Date) => void;
  /** Hierarchical rota data for Team View mode (optional) */
  hierarchicalData?: HierarchicalRotaData | null;
  /** Whether hierarchical data is loading */
  isHierarchicalDataLoading?: boolean;
  /** Absence types lookup map for showing leave reason */
  absenceTypes?: Map<string, import('../../api/dataverse/types').AbsenceType>;
}

interface ProcessedShift extends ShiftViewData {
  zone: string;
  dayIndex: number;
  shiftType: 'day' | 'night' | 'sleepIn';
  timeLabel: string;
  isPublished: boolean;
}

interface StaffRowData {
  staffMemberId: string;
  staffMemberName: string;
  jobTitle: string | null;
  department: string | null;
  cells: Map<number, ProcessedShift[]>;
  /** Total scheduled hours for the period */
  totalHours: number;
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine shift type based on shift data
 */
function getShiftType(shift: ShiftViewData): 'day' | 'night' | 'sleepIn' {
  if (shift['Sleep In']) return 'sleepIn';

  const shiftType = shift['Shift Type']?.toLowerCase() || '';
  if (shiftType.includes('night')) return 'night';
  if (shiftType.includes('sleep')) return 'sleepIn';

  // Check start hour
  const startHour =
    shift['Shift Reference Start Hour'] ?? new Date(shift['Shift Start Time']).getHours();

  if (startHour >= 20 || startHour < 6) return 'night';
  return 'day';
}

/**
 * Format time from datetime string
 */
function formatTime(dateTimeStr: string): string {
  try {
    const date = new Date(dateTimeStr);
    return format(date, 'HH:mm');
  } catch {
    return '--:--';
  }
}

/**
 * Get time label for a shift
 */
function getTimeLabel(shift: ShiftViewData): string {
  const start = formatTime(shift['Shift Start Time']);
  const end = formatTime(shift['Shift End Time']);
  return `${start}-${end}`;
}

/**
 * Calculate zone string: "{dayIndex}|{staffMemberId}"
 */
function calculateZone(dayIndex: number, staffMemberId: string | null): string {
  return `${dayIndex}|${staffMemberId || 'unassigned'}`;
}

/**
 * Get day index from shift date and start date
 */
function getDayIndex(shiftDate: Date, startDate: Date): number {
  return differenceInDays(shiftDate, startDate) + 1;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RotaGrid({
  startDate,
  duration,
  staff,
  shifts,
  otherRotaShifts = [],
  selectedShiftIds = new Set(),
  onShiftClick,
  onCellClick,
  onSelectionChange,
  viewMode = 'people',
  detailLevel = 'detailed',
  shiftReferences = [],
  staffingRequirements = [],
  onFillGap,
  onAddShift,
  hierarchicalData,
  isHierarchicalDataLoading = false,
  absenceTypes,
}: RotaGridProps) {
  // Sort state for people view
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Generate date columns
  const dates = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < duration; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, duration]);

  // Process shifts into grid structure
  const { staffRows, unassignedShifts, unassignedCount } = useMemo(() => {
    // Process all shifts
    const processedShifts: ProcessedShift[] = shifts.map((shift) => {
      const shiftDate = new Date(shift['Shift Date']);
      const dayIndex = getDayIndex(shiftDate, startDate);
      // Normalize empty string to null for unassigned detection
      const staffMemberId = shift['Staff Member ID'] || null;

      return {
        ...shift,
        zone: calculateZone(dayIndex, staffMemberId),
        dayIndex,
        shiftType: getShiftType(shift),
        timeLabel: getTimeLabel(shift),
        isPublished: shift['Shift Status'] === 1001,
      };
    });

    // Group by staff member (using 'unassigned' key for null/empty staff IDs)
    const shiftsByStaff = new Map<string, ProcessedShift[]>();
    for (const shift of processedShifts) {
      // Normalize: treat null/empty string as 'unassigned'
      const staffId = shift['Staff Member ID'] || 'unassigned';
      const existing = shiftsByStaff.get(staffId) || [];
      existing.push(shift);
      shiftsByStaff.set(staffId, existing);
    }

    // Create staff rows
    const rows: StaffRowData[] = staff.map((s) => {
      const staffId = s['Staff Member ID'];
      const staffShifts = shiftsByStaff.get(staffId) || [];

      // Group shifts by day
      const cells = new Map<number, ProcessedShift[]>();
      for (const shift of staffShifts) {
        const existing = cells.get(shift.dayIndex) || [];
        existing.push(shift);
        cells.set(shift.dayIndex, existing);
      }

      // Calculate total hours for this staff member
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
        cells,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
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

    return {
      staffRows: rows,
      unassignedShifts: unassignedByDay,
      unassignedCount: unassigned.length,
    };
  }, [staff, shifts, startDate]);

  // Sort staff rows based on selected sort option
  const sortedStaffRows = useMemo(() => {
    const rows = [...staffRows];

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
  }, [staffRows, sortOption]);

  // Handle shift click
  const handleShiftClick = useCallback(
    (shift: ProcessedShift, event: React.MouseEvent) => {
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        // Multi-select
        const newSelection = new Set(selectedShiftIds);
        if (newSelection.has(shift['Shift ID'])) {
          newSelection.delete(shift['Shift ID']);
        } else {
          newSelection.add(shift['Shift ID']);
        }
        onSelectionChange?.(newSelection);
      } else {
        // Single select
        onShiftClick?.(shift);
      }
    },
    [selectedShiftIds, onShiftClick, onSelectionChange]
  );

  // Handle cell click
  const handleCellClick = useCallback(
    (date: Date, staffMemberId: string | null) => {
      onCellClick?.(date, staffMemberId);
    },
    [onCellClick]
  );

  // Sort menu options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'hours-high', label: 'Hours (High to Low)' },
    { value: 'hours-low', label: 'Hours (Low to High)' },
    { value: 'jobTitle', label: 'Job Title' },
  ];

  const currentSortLabel = sortOptions.find((opt) => opt.value === sortOption)?.label || 'Sort';

  // Team View - Hierarchical Unit > Team > Staff structure
  if (viewMode === 'team') {
    // Loading state
    if (isHierarchicalDataLoading) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm text-slate-600">Loading team structure...</p>
          </div>
        </div>
      );
    }

    // No hierarchical data available
    if (!hierarchicalData) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ArrowUpDown className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No Team Data Available</h3>
            <p className="mt-2 text-sm text-slate-500">
              Unable to load the Unit → Team → Staff hierarchy. Please check your location settings.
            </p>
          </div>
        </div>
      );
    }

    // Render the TeamViewGrid
    return (
      <TeamViewGrid
        data={hierarchicalData}
        startDate={startDate}
        duration={duration}
        detailLevel={detailLevel}
        staff={staff}
        shiftReferences={shiftReferences}
        onShiftClick={(shiftId) => {
          // Find the corresponding ShiftViewData and call onShiftClick
          const shift = shifts.find((s) => s['Shift ID'] === shiftId);
          if (shift && onShiftClick) {
            onShiftClick(shift);
          }
        }}
        onCellClick={(date, staffId) => {
          onCellClick?.(date, staffId ?? null);
        }}
      />
    );
  }

  if (viewMode === 'shiftReference') {
    // Create a set of staff IDs for this sublocation for filtering
    const sublocationStaffIds = new Set(staff.map((s) => s['Staff Member ID']));

    // Filter shifts to only include:
    // 1. Shifts for staff members assigned to this sublocation
    // 2. Unassigned shifts (no staff member)
    const filteredShifts = shifts.filter((s) => {
      const staffId = s['Staff Member ID'];
      // Include unassigned shifts or shifts for sublocation staff
      return !staffId || sublocationStaffIds.has(staffId);
    });

    // Convert ShiftViewData to Shift format for ShiftReferenceViewGrid
    // Include staff member name directly to avoid lookup issues
    const shiftsForRefView: Shift[] = filteredShifts.map((s) => ({
      cp365_shiftid: s['Shift ID'],
      cp365_shiftname: s['Shift Name'],
      cp365_shiftdate: s['Shift Date'],
      cp365_shiftstarttime: s['Shift Start Time'],
      cp365_shiftendtime: s['Shift End Time'],
      cp365_shiftstatus: s['Shift Status'] as ShiftStatus,
      cp365_shifttype: s['Shift Type'] as ShiftType,
      cp365_overtimeshift: s['Overtime Shift'],
      cr1e2_shiftbreakduration: s['Shift Break Duration'] || 0,
      cp365_communityhours: s['Community Hours'] || 0,
      cp365_sleepin: s['Sleep In'],
      cp365_shiftleader: s['Shift Leader'],
      cp365_actup: s['Act Up'],
      _cp365_staffmember_value: s['Staff Member ID'] || null,
      _cp365_rota_value: s['Rota ID'],
      _cp365_shiftreference_value: s['Shift Reference'] || null,
      _cp365_shiftactivity_value: null,
      _cp365_shiftpattern_value: null,
      _cp365_serviceuser_value: null,
      // Include staff name directly from the view data
      _staffMemberName: s['Staff Member Name'] || null,
    }));

    // Build staff map for name lookup
    const staffMap = new Map<string, StaffMember>();
    for (const s of staff) {
      staffMap.set(s['Staff Member ID'], {
        cp365_staffmemberid: s['Staff Member ID'],
        cp365_staffmembername: s['Staff Member Name'],
        cp365_forename: '',
        cp365_surname: '',
        cp365_staffnumber: '',
        cp365_workemail: '',
        cp365_personalemail: null,
        cp365_personalmobile: null,
        cp365_workmobile: null,
        cp365_dateofbirth: null,
        cp365_staffstatus: s['Staff Status'] as StaffStatus,
        cp365_agencyworker: 0 as YesNo,
        _cp365_defaultlocation_value: null,
        _cp365_linemanager_value: null,
        _cp365_useraccount_value: null,
        _cp365_gender_value: null,
        _cp365_title_value: null,
      });
    }

    // If no shift references provided, show message
    if (shiftReferences.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-border-grey bg-white p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Shift References Available</h3>
            <p className="mt-2 text-sm text-gray-500">
              Shift references need to be configured to use this view.
            </p>
          </div>
        </div>
      );
    }

    return (
      <ShiftReferenceViewGrid
        shiftReferences={shiftReferences}
        shifts={shiftsForRefView}
        dateRange={dates}
        staffingRequirements={staffingRequirements}
        staffMembers={staffMap}
        staff={staff}
        onFillGap={onFillGap}
        onAddShift={onAddShift}
        onShiftClick={(shift) => {
          // Convert back to ShiftViewData for the callback
          const original = shifts.find((s) => s['Shift ID'] === shift.cp365_shiftid);
          if (original) onShiftClick?.(original);
        }}
        detailLevel={detailLevel}
      />
    );
  }

  // Default: People View - use the dedicated PeopleViewGrid component
  // This provides a flat staff list with search, sort, and filter capabilities
  if (viewMode === 'people' || !viewMode) {
    return (
      <PeopleViewGrid
        startDate={startDate}
        duration={duration}
        staff={staff}
        shifts={shifts}
        otherRotaShifts={otherRotaShifts}
        selectedShiftIds={selectedShiftIds}
        onShiftClick={onShiftClick}
        onCellClick={onCellClick}
        onSelectionChange={onSelectionChange}
        detailLevel={detailLevel}
        absenceTypes={absenceTypes}
      />
    );
  }

  // Fallback render - shouldn't reach here but kept for safety
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border-grey bg-white">
      {/* Header stats bar */}
      <div className="flex items-center justify-between border-b border-border-grey bg-elevation-1 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{sortedStaffRows.length}</span> Staff
            Members
          </span>
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{shifts.length}</span> Total Shifts
          </span>

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
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-border-grey bg-white py-1 shadow-lg">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortOption(option.value);
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
        <div
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${unassignedCount > 0 ? 'bg-warning/10' : 'bg-gray-100'}`}
        >
          <AlertCircle
            className={`h-4 w-4 ${unassignedCount > 0 ? 'text-warning' : 'text-gray-400'}`}
          />
          <span
            className={`text-sm font-medium ${unassignedCount > 0 ? 'text-warning' : 'text-gray-500'}`}
          >
            Unassigned: {unassignedCount}
          </span>
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
            {/* Unassigned row at the top - sticky below header */}
            <UnassignedRow
              shifts={unassignedShifts}
              dates={dates}
              totalCount={unassignedCount}
              selectedShiftIds={selectedShiftIds}
              onShiftClick={handleShiftClick}
              onCellClick={handleCellClick}
              isSticky
            />

            {/* Staff rows */}
            {sortedStaffRows.map((row) => (
              <StaffRow
                key={row.staffMemberId}
                row={row}
                dates={dates}
                selectedShiftIds={selectedShiftIds}
                onShiftClick={handleShiftClick}
                onCellClick={handleCellClick}
                detailLevel={detailLevel}
              />
            ))}

            {/* Empty state */}
            {sortedStaffRows.length === 0 && unassignedCount === 0 && (
              <tr>
                <td colSpan={dates.length + 1} className="px-4 py-12 text-center text-gray-500">
                  No staff members assigned to this sublocation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// STAFF ROW COMPONENT
// =============================================================================

interface StaffRowProps {
  row: StaffRowData;
  dates: Date[];
  selectedShiftIds: Set<string>;
  onShiftClick: (shift: ProcessedShift, event: React.MouseEvent) => void;
  onCellClick: (date: Date, staffMemberId: string | null) => void;
  detailLevel: DetailLevel;
}

function StaffRow({
  row,
  dates,
  selectedShiftIds,
  onShiftClick,
  onCellClick,
  detailLevel,
}: StaffRowProps) {
  const displayName = row.staffMemberName || 'Unknown';
  const initial = displayName.charAt(0).toUpperCase();

  // Compact mode shows minimal info
  const isCompact = detailLevel === 'compact';
  const isHoursOnly = detailLevel === 'hoursOnly';

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
          </div>
          {/* Hours badge */}
          <div
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${
              row.totalHours > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {row.totalHours}h
          </div>
        </div>
      </td>

      {/* Shift cells */}
      {dates.map((date, index) => {
        const dayIndex = index + 1;
        const shifts = row.cells.get(dayIndex) || [];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = isSameDay(date, new Date());

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
              isToday ? 'bg-primary/5' : isWeekend ? 'bg-gray-50/50' : ''
            } cursor-pointer hover:bg-primary/10`}
          >
            {isHoursOnly ? (
              // Hours only mode - just show total hours for the day
              <div className="flex h-10 items-center justify-center">
                {shifts.length > 0 && (
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(dailyHours * 10) / 10}h
                  </span>
                )}
              </div>
            ) : (
              // Detailed or Compact mode - show shift cards
              <div className="flex flex-col gap-1">
                {shifts.map((shift) => (
                  <ShiftCard
                    key={shift['Shift ID']}
                    shift={shift}
                    isSelected={selectedShiftIds.has(shift['Shift ID'])}
                    onClick={(e) => onShiftClick(shift, e)}
                    isCompact={isCompact}
                  />
                ))}
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
  /** Whether this is the sticky bottom version */
  isSticky?: boolean;
}

function UnassignedRow({
  shifts,
  dates,
  totalCount,
  selectedShiftIds,
  onShiftClick,
  onCellClick,
  isSticky,
}: UnassignedRowProps) {
  const hasUnassigned = totalCount > 0;

  // When sticky, the row should stick below the header (which is ~44px tall)
  // Using top-[44px] to position it right below the header
  const stickyClass = isSticky ? 'sticky top-[44px] z-10' : '';

  return (
    <tr className={`bg-[#f5f5f5] ${stickyClass} ${hasUnassigned ? 'shadow-sm' : ''}`}>
      {/* Unassigned label */}
      <td
        className={`sticky left-0 z-20 w-56 min-w-56 border-b border-r ${hasUnassigned ? 'border-b-warning border-b-2' : 'border-border-grey'} bg-[#f5f5f5] px-3 py-2`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${hasUnassigned ? 'bg-warning/20' : 'bg-gray-200'}`}
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
            className={`min-w-28 border-r ${hasUnassigned ? 'border-b-2 border-b-warning' : 'border-b border-border-grey'} border-r-border-grey p-1 align-top ${
              isToday ? 'bg-[#ebebeb]' : isWeekend ? 'bg-[#ebebeb]' : 'bg-[#f5f5f5]'
            } cursor-pointer hover:bg-gray-200`}
          >
            <div className="flex flex-col gap-1">
              {dayShifts.map((shift) => (
                <ShiftCard
                  key={shift['Shift ID']}
                  shift={shift}
                  isSelected={selectedShiftIds.has(shift['Shift ID'])}
                  onClick={(e) => onShiftClick(shift, e)}
                  isUnassigned
                />
              ))}
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

interface ShiftCardProps {
  shift: ProcessedShift;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => void;
  isUnassigned?: boolean;
  isCompact?: boolean;
}

function ShiftCard({ shift, isSelected, onClick, isUnassigned, isCompact }: ShiftCardProps) {
  const isOvertime = shift['Overtime Shift'];
  const shiftType = shift.shiftType;

  // Determine background class
  const bgClass = isOvertime ? SHIFT_BG_CLASSES.overtime : SHIFT_BG_CLASSES[shiftType];

  // Get icon
  const iconEmoji = shiftType === 'night' ? '🌙' : shiftType === 'sleepIn' ? '🛏️' : '☀️';

  // Compact view - minimal info
  if (isCompact) {
    return (
      <button
        onClick={onClick}
        className={`
          group/card relative w-full rounded-md px-2 py-1 text-left transition-all
          ${bgClass}
          ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
          ${isUnassigned ? 'border-2 border-dashed border-gray-500' : ''}
          hover:shadow-md hover:brightness-95
        `}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm" role="img" aria-label={shiftType}>
            {iconEmoji}
          </span>
          <span className="text-xs font-semibold">{shift.timeLabel}</span>
          {!shift.isPublished && (
            <span className="ml-auto text-[9px] font-bold text-gray-600">*</span>
          )}
        </div>
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

  // Detailed view - full info
  return (
    <button
      onClick={onClick}
      className={`
        group/card relative w-full rounded-md px-2 py-1.5 text-left transition-all
        ${bgClass}
        ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
        ${isUnassigned ? 'border-2 border-dashed border-gray-500' : ''}
        hover:shadow-md hover:brightness-95
      `}
    >
      {/* Time and icon row */}
      <div className="flex items-center gap-1">
        <span className="text-base" role="img" aria-label={shiftType}>
          {iconEmoji}
        </span>
        <span className="text-xs font-semibold">{shift.timeLabel}</span>
      </div>

      {/* Shift name/reference */}
      {shift['Shift Reference Name'] && (
        <div className="mt-0.5 truncate text-[10px] text-gray-700">
          {shift['Shift Reference Name']}
        </div>
      )}

      {/* Shift Activity - shows activity type with care/non-care indicator (detailed view only) */}
      {shift['Shift Activity'] && (
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className={`inline-flex items-center truncate rounded px-1 py-0.5 text-[9px] font-semibold ${
              shift['Shift Activity Care Type'] === 'Non-Care'
                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
            }`}
            title={`Activity: ${shift['Shift Activity']}${shift['Shift Activity Care Type'] ? ` (${shift['Shift Activity Care Type']})` : ''}`}
          >
            {shift['Shift Activity Care Type'] === 'Non-Care' ? '○' : '●'}{' '}
            {shift['Shift Activity']}
          </span>
        </div>
      )}

      {/* Badges row */}
      <div className="mt-1 flex flex-wrap gap-0.5">
        {/* Unpublished indicator */}
        {!shift.isPublished && (
          <span className="rounded bg-gray-900/20 px-1 text-[9px] font-bold text-gray-800">*</span>
        )}

        {/* Shift Leader badge */}
        {shift['Shift Leader'] && (
          <span className="rounded bg-primary/30 px-1 text-[9px] font-medium text-primary-pressed">
            SL
          </span>
        )}

        {/* Act Up badge */}
        {shift['Act Up'] && (
          <span className="rounded bg-secondary/30 px-1 text-[9px] font-medium text-secondary-pressed">
            AU
          </span>
        )}

        {/* Senior badge */}
        {shift['Senior'] && (
          <span className="rounded bg-gray-500/30 px-1 text-[9px] font-medium text-gray-700">
            SR
          </span>
        )}

        {/* Community hours */}
        {shift['Community Hours'] > 0 && (
          <span className="rounded bg-stats-community-bold/50 px-1 text-[9px] font-medium">
            {shift['Community Hours']}h
          </span>
        )}
      </div>

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

export type { RotaGridProps, ProcessedShift, StaffRowData };
