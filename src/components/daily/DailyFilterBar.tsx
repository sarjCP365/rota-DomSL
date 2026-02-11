/**
 * DailyFilterBar Component
 * Filter bar for the Daily View with search, dropdowns, and action buttons
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 3
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type AttendanceStatus = 'all' | 'present' | 'scheduled' | 'worked' | 'absent' | 'late';
export type ShiftType = 'all' | 'day' | 'night' | 'sleepin';

export interface DailyFilters {
  search: string;
  department: string;
  status: AttendanceStatus;
  shiftType: ShiftType;
}

interface Location {
  cp365_locationid: string;
  cp365_locationname: string;
}

interface Sublocation {
  cp365_sublocationid: string;
  cp365_sublocationname: string;
}

interface DailyFilterBarProps {
  /** Current filter values */
  filters: DailyFilters;
  /** Callback when filters change */
  onFilterChange: (filters: DailyFilters) => void;
  /** Available locations */
  locations: Location[];
  /** Available sublocations for selected location */
  sublocations: Sublocation[];
  /** Selected location ID */
  selectedLocationId: string;
  /** Callback when location changes */
  onLocationChange: (locationId: string) => void;
  /** Selected sublocation ID */
  selectedSublocationId: string;
  /** Callback when sublocation changes */
  onSublocationChange: (sublocationId: string) => void;
  /** Available departments from current data */
  departments?: string[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether locations are loading */
  isLoadingLocations?: boolean;
  /** Whether sublocations are loading */
  isLoadingSublocations?: boolean;
  /** Callback to refresh data */
  onRefresh?: () => void;
  /** Callback to expand all departments */
  onExpandAll?: () => void;
  /** Callback to collapse all departments */
  onCollapseAll?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'present', label: 'Present' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'worked', label: 'Worked' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
];

const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'sleepin', label: 'Sleep In' },
];

// ============================================================================
// Component
// ============================================================================

export function DailyFilterBar({
  filters,
  onFilterChange,
  locations,
  sublocations,
  selectedLocationId,
  onLocationChange,
  selectedSublocationId,
  onSublocationChange,
  departments = [],
  isLoading = false,
  isLoadingLocations = false,
  isLoadingSublocations = false,
  onRefresh,
  onExpandAll,
  onCollapseAll,
}: DailyFilterBarProps) {
  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync search input with filters - intentional controlled/uncontrolled hybrid for debouncing
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new debounced update
      searchTimeoutRef.current = setTimeout(() => {
        onFilterChange({ ...filters, search: value });
      }, 300);
    },
    [filters, onFilterChange]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filter change handlers
  const handleDepartmentChange = useCallback(
    (department: string) => {
      onFilterChange({ ...filters, department });
    },
    [filters, onFilterChange]
  );

  const handleStatusChange = useCallback(
    (status: AttendanceStatus) => {
      onFilterChange({ ...filters, status });
    },
    [filters, onFilterChange]
  );

  const handleShiftTypeChange = useCallback(
    (shiftType: ShiftType) => {
      onFilterChange({ ...filters, shiftType });
    },
    [filters, onFilterChange]
  );

  const clearSearch = useCallback(() => {
    setSearchInput('');
    onFilterChange({ ...filters, search: '' });
  }, [filters, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    onFilterChange({
      search: '',
      department: 'all',
      status: 'all',
      shiftType: 'all',
    });
  }, [onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.department !== 'all' ||
    filters.status !== 'all' ||
    filters.shiftType !== 'all';

  // Build department options
  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map((dept) => ({ value: dept, label: dept })),
    { value: 'agency', label: 'Agency Workers' },
    { value: 'other-locations', label: 'Shifts From Other Locations' },
  ];

  // Mobile filter panel state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Count active filters for badge
  const activeFilterCount = [
    filters.search,
    filters.department !== 'all',
    filters.status !== 'all',
    filters.shiftType !== 'all',
  ].filter(Boolean).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="border-b border-border-grey bg-white">
      {/* ================================================================== */}
      {/* MOBILE LAYOUT (< 768px) */}
      {/* ================================================================== */}
      <div className="md:hidden px-4 py-3">
        {/* Mobile Top Row: Search + Filter Button */}
        <div className="flex items-center gap-2">
          {/* Search Input - Full Width */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-border-grey bg-white pl-9 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`
              relative flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium
              ${
                showMobileFilters
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border-grey text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded-lg border border-border-grey p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Mobile Expandable Filter Panel */}
        {showMobileFilters && (
          <div className="mt-3 space-y-3 rounded-lg border border-border-grey bg-gray-50 p-3">
            {/* Location */}
            <div>
              <label htmlFor="mobile-location-filter" className="mb-1 block text-xs font-medium text-gray-600">Location</label>
              <select
                id="mobile-location-filter"
                value={selectedLocationId}
                onChange={(e) => onLocationChange(e.target.value)}
                disabled={isLoadingLocations}
                className="h-10 w-full rounded-lg border border-border-grey bg-white px-3 text-sm"
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc.cp365_locationid} value={loc.cp365_locationid}>
                    {loc.cp365_locationname}
                  </option>
                ))}
              </select>
            </div>

            {/* Sublocation */}
            <div>
              <label htmlFor="mobile-sublocation-filter" className="mb-1 block text-xs font-medium text-gray-600">Sublocation</label>
              <select
                id="mobile-sublocation-filter"
                value={selectedSublocationId}
                onChange={(e) => onSublocationChange(e.target.value)}
                disabled={isLoadingSublocations || !selectedLocationId}
                className="h-10 w-full rounded-lg border border-border-grey bg-white px-3 text-sm"
              >
                <option value="">Select sublocation...</option>
                {sublocations.map((sub) => (
                  <option key={sub.cp365_sublocationid} value={sub.cp365_sublocationid}>
                    {sub.cp365_sublocationname}
                  </option>
                ))}
              </select>
            </div>

            {/* Two-column grid for smaller dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              {/* Department */}
              <div>
                <label htmlFor="mobile-department-filter" className="mb-1 block text-xs font-medium text-gray-600">Department</label>
                <select
                  id="mobile-department-filter"
                  value={filters.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border-grey bg-white px-3 text-sm"
                >
                  {departmentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="mobile-status-filter" className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                <select
                  id="mobile-status-filter"
                  value={filters.status}
                  onChange={(e) => handleStatusChange(e.target.value as AttendanceStatus)}
                  className="h-10 w-full rounded-lg border border-border-grey bg-white px-3 text-sm"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shift Type */}
            <div>
              <label htmlFor="mobile-shifttype-filter" className="mb-1 block text-xs font-medium text-gray-600">Shift Type</label>
              <select
                id="mobile-shifttype-filter"
                value={filters.shiftType}
                onChange={(e) => handleShiftTypeChange(e.target.value as ShiftType)}
                className="h-10 w-full rounded-lg border border-border-grey bg-white px-3 text-sm"
              >
                {SHIFT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border-grey">
              <div className="flex gap-2">
                {onCollapseAll && (
                  <button
                    onClick={onCollapseAll}
                    className="flex items-center gap-1 rounded-lg border border-border-grey px-3 py-2 text-sm text-gray-600"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Collapse
                  </button>
                )}
                {onExpandAll && (
                  <button
                    onClick={onExpandAll}
                    className="flex items-center gap-1 rounded-lg border border-border-grey px-3 py-2 text-sm text-gray-600"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Expand
                  </button>
                )}
              </div>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-sm text-primary font-medium">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Active Filters (shown when panel is closed) */}
        {!showMobileFilters && hasActiveFilters && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {filters.search && <FilterChip label={`"${filters.search}"`} onRemove={clearSearch} />}
            {filters.department !== 'all' && (
              <FilterChip
                label={filters.department}
                onRemove={() => handleDepartmentChange('all')}
              />
            )}
            {filters.status !== 'all' && (
              <FilterChip
                label={STATUS_OPTIONS.find((o) => o.value === filters.status)?.label || ''}
                onRemove={() => handleStatusChange('all')}
              />
            )}
            {filters.shiftType !== 'all' && (
              <FilterChip
                label={SHIFT_TYPE_OPTIONS.find((o) => o.value === filters.shiftType)?.label || ''}
                onRemove={() => handleShiftTypeChange('all')}
              />
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* DESKTOP LAYOUT (≥768px) */}
      {/* ================================================================== */}
      <div className="hidden md:block px-4 py-3">
        {/* Main Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff by name..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-56 rounded-lg border border-border-grey bg-white pl-9 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Location Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="desktop-location-filter" className="text-sm text-gray-600">Location:</label>
            <select
              id="desktop-location-filter"
              value={selectedLocationId}
              onChange={(e) => onLocationChange(e.target.value)}
              disabled={isLoadingLocations}
              className="h-9 min-w-[140px] rounded-lg border border-border-grey bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select location...</option>
              {locations.map((loc) => (
                <option key={loc.cp365_locationid} value={loc.cp365_locationid}>
                  {loc.cp365_locationname}
                </option>
              ))}
            </select>
          </div>

          {/* Sublocation Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="desktop-sublocation-filter" className="text-sm text-gray-600">Sublocation:</label>
            <select
              id="desktop-sublocation-filter"
              value={selectedSublocationId}
              onChange={(e) => onSublocationChange(e.target.value)}
              disabled={isLoadingSublocations || !selectedLocationId}
              className="h-9 min-w-[160px] rounded-lg border border-border-grey bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select sublocation...</option>
              {sublocations.map((sub) => (
                <option key={sub.cp365_sublocationid} value={sub.cp365_sublocationid}>
                  {sub.cp365_sublocationname}
                </option>
              ))}
            </select>
          </div>

          {/* Department Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="desktop-department-filter" className="text-sm text-gray-600">Department:</label>
            <select
              id="desktop-department-filter"
              value={filters.department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="h-9 min-w-[140px] rounded-lg border border-border-grey bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {departmentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="desktop-status-filter" className="text-sm text-gray-600">Status:</label>
            <select
              id="desktop-status-filter"
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value as AttendanceStatus)}
              className="h-9 min-w-[120px] rounded-lg border border-border-grey bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Type Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="desktop-shifttype-filter" className="text-sm text-gray-600">Type:</label>
            <select
              id="desktop-shifttype-filter"
              value={filters.shiftType}
              onChange={(e) => handleShiftTypeChange(e.target.value as ShiftType)}
              className="h-9 min-w-[100px] rounded-lg border border-border-grey bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SHIFT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Collapse All Button */}
          {onCollapseAll && (
            <button
              onClick={onCollapseAll}
              className="flex items-center gap-1.5 rounded-lg border border-border-grey px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              title="Collapse all departments"
            >
              <ChevronUp className="h-4 w-4" />
              <span className="hidden lg:inline">Collapse All</span>
            </button>
          )}

          {/* Expand All Button */}
          {onExpandAll && (
            <button
              onClick={onExpandAll}
              className="flex items-center gap-1.5 rounded-lg border border-border-grey px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              title="Expand all departments"
            >
              <ChevronDown className="h-4 w-4" />
              <span className="hidden lg:inline">Expand All</span>
            </button>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded-lg border border-border-grey p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>

            {filters.search && (
              <FilterChip label={`Search: ${filters.search}`} onRemove={clearSearch} />
            )}

            {filters.department !== 'all' && (
              <FilterChip
                label={`Department: ${filters.department}`}
                onRemove={() => handleDepartmentChange('all')}
              />
            )}

            {filters.status !== 'all' && (
              <FilterChip
                label={`Status: ${STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}`}
                onRemove={() => handleStatusChange('all')}
              />
            )}

            {filters.shiftType !== 'all' && (
              <FilterChip
                label={`Type: ${SHIFT_TYPE_OPTIONS.find((o) => o.value === filters.shiftType)?.label}`}
                onRemove={() => handleShiftTypeChange('all')}
              />
            )}

            <button onClick={clearAllFilters} className="text-xs text-primary hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Filter Chip Component
// ============================================================================

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-primary-hover"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default DailyFilterBar;
