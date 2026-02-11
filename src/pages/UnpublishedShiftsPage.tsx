/**
 * Unpublished Shifts Management Page
 * Allows viewing, filtering, sorting, and bulk actions on unpublished shifts
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfWeek } from 'date-fns';
import {
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Send,
  Trash2,
  ExternalLink,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  Clock,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/common/Header';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { useLocations, useSublocations } from '@/hooks/useLocations';
import { useAllUnpublishedShifts, usePublishShifts, useBulkDeleteShifts } from '@/hooks/useShifts';
import type { UnpublishedShiftDetails, UnpublishedShiftsFilter } from '@/api/dataverse/shifts';

type SortField = 'date' | 'staff' | 'location' | 'time';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

export function UnpublishedShiftsPage() {
  const navigate = useNavigate();
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();

  // Filter state
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedSublocationId, setSelectedSublocationId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Selection state
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  // Fetch locations and sublocations
  const { data: locations } = useLocations();
  const { data: sublocations } = useSublocations(selectedLocationId || undefined);

  // Build filter for API
  const filters: UnpublishedShiftsFilter = useMemo(
    () => ({
      locationId: selectedLocationId || undefined,
      sublocationId: selectedSublocationId || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      searchTerm: searchTerm || undefined,
    }),
    [selectedLocationId, selectedSublocationId, dateFrom, dateTo, searchTerm]
  );

  // Fetch unpublished shifts
  const { data: shifts = [], isLoading, isError, refetch } = useAllUnpublishedShifts(filters);

  // Mutations
  const publishMutation = usePublishShifts();
  const deleteMutation = useBulkDeleteShifts();

  // Sort shifts
  const sortedShifts = useMemo(() => {
    const sorted = [...shifts].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison =
            new Date(a.cp365_shiftdate).getTime() - new Date(b.cp365_shiftdate).getTime();
          break;
        case 'staff': {
          const staffA = a.cp365_StaffMember
            ? `${a.cp365_StaffMember.cp365_forename} ${a.cp365_StaffMember.cp365_surname}`
            : 'ZZZZZ'; // Sort unassigned to end
          const staffB = b.cp365_StaffMember
            ? `${b.cp365_StaffMember.cp365_forename} ${b.cp365_StaffMember.cp365_surname}`
            : 'ZZZZZ';
          comparison = staffA.localeCompare(staffB);
          break;
        }
        case 'location': {
          const locA = a.cp365_Rota?.cp365_Sublocation?.cp365_Location?.cp365_locationname || '';
          const locB = b.cp365_Rota?.cp365_Sublocation?.cp365_Location?.cp365_locationname || '';
          comparison = locA.localeCompare(locB);
          break;
        }
        case 'time':
          comparison = (a.cp365_shiftstarttime || '').localeCompare(b.cp365_shiftstarttime || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [shifts, sortField, sortDirection]);

  // Paginate shifts
  const paginatedShifts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedShifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedShifts, currentPage]);

  const totalPages = Math.ceil(sortedShifts.length / ITEMS_PER_PAGE);

  // Handle sort
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  // Handle selection
  const handleSelectAll = useCallback(() => {
    if (selectedShiftIds.size === paginatedShifts.length) {
      setSelectedShiftIds(new Set());
    } else {
      setSelectedShiftIds(new Set(paginatedShifts.map((s) => s.cp365_shiftid)));
    }
  }, [paginatedShifts, selectedShiftIds]);

  const handleSelectShift = useCallback((shiftId: string) => {
    setSelectedShiftIds((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  }, []);

  // Handle bulk publish
  const handleBulkPublish = useCallback(async () => {
    if (selectedShiftIds.size === 0) return;

    try {
      await publishMutation.mutateAsync(Array.from(selectedShiftIds));
      setSelectedShiftIds(new Set());
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    }
  }, [selectedShiftIds, publishMutation]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedShiftIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedShiftIds.size} shift(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(Array.from(selectedShiftIds));
      setSelectedShiftIds(new Set());
    } catch (error) {
      console.error('Failed to delete shifts:', error);
    }
  }, [selectedShiftIds, deleteMutation]);

  // Navigate to rota view for a specific shift
  const handleViewInRota = useCallback(
    (shift: UnpublishedShiftDetails) => {
      const sublocationId = shift.cp365_Rota?.cp365_Sublocation?.cp365_sublocationid;
      const shiftDate = shift.cp365_shiftdate ? new Date(shift.cp365_shiftdate) : new Date();
      const weekStart = startOfWeek(shiftDate, { weekStartsOn: 1 });

      if (sublocationId) {
        // Navigate to the rota view with the shift's date
        void navigate(`/rota/7?date=${format(weekStart, 'yyyy-MM-dd')}`);
      }
    },
    [navigate]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedLocationId('');
    setSelectedSublocationId('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  }, []);

  // Format time from ISO string
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const isProcessing = publishMutation.isPending || deleteMutation.isPending;
  const hasActiveFilters =
    selectedLocationId || selectedSublocationId || dateFrom || dateTo || searchTerm;

  return (
    <div className="flex h-screen bg-slate-100">
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={toggleSideNav}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-800">Unpublished Shifts</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">Back to Dashboard</span>
                </button>
              </div>
              <PageHeader
                title="Unpublished Shifts"
                subtitle={`${shifts.length} shift${shifts.length !== 1 ? 's' : ''} pending publication`}
              />
            </div>

            {/* Filters Bar */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-4 p-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff, location, shift reference..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Toggle filters button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    hasActiveFilters
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                      {
                        [selectedLocationId, selectedSublocationId, dateFrom, dateTo].filter(
                          Boolean
                        ).length
                      }
                    </span>
                  )}
                </button>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}

                {/* Bulk actions */}
                {selectedShiftIds.size > 0 && (
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                    <span className="text-sm text-slate-600">{selectedShiftIds.size} selected</span>
                    <button
                      onClick={handleBulkPublish}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {publishMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Publish
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Location */}
                    <div>
                      <label htmlFor="unpublished-location" className="mb-1 block text-xs font-medium text-slate-600">
                        Location
                      </label>
                      <select
                        id="unpublished-location"
                        value={selectedLocationId}
                        onChange={(e) => {
                          setSelectedLocationId(e.target.value);
                          setSelectedSublocationId('');
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">All locations</option>
                        {locations?.map((loc) => (
                          <option key={loc.cp365_locationid} value={loc.cp365_locationid}>
                            {loc.cp365_locationname}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sublocation */}
                    <div>
                      <label htmlFor="unpublished-sublocation" className="mb-1 block text-xs font-medium text-slate-600">
                        Sublocation
                      </label>
                      <select
                        id="unpublished-sublocation"
                        value={selectedSublocationId}
                        onChange={(e) => {
                          setSelectedSublocationId(e.target.value);
                          setCurrentPage(1);
                        }}
                        disabled={!selectedLocationId}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                      >
                        <option value="">All sublocations</option>
                        {sublocations?.map((sub) => (
                          <option key={sub.cp365_sublocationid} value={sub.cp365_sublocationid}>
                            {sub.cp365_sublocationname}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date from */}
                    <div>
                      <label htmlFor="unpublished-date-from" className="mb-1 block text-xs font-medium text-slate-600">
                        From Date
                      </label>
                      <input
                        type="date"
                        id="unpublished-date-from"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Date to */}
                    <div>
                      <label htmlFor="unpublished-date-to" className="mb-1 block text-xs font-medium text-slate-600">
                        To Date
                      </label>
                      <input
                        type="date"
                        id="unpublished-date-to"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Table */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <span className="ml-3 text-lg text-slate-600">Loading shifts...</span>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center p-12 text-red-600">
                  <AlertCircle className="h-12 w-12 mb-3" />
                  <p className="text-lg font-medium">Failed to load shifts</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              ) : sortedShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <CheckSquare className="h-12 w-12 mb-3" />
                  <p className="text-lg font-medium">No unpublished shifts</p>
                  <p className="text-sm">
                    All shifts have been published or no shifts match your filters.
                  </p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                    <div className="col-span-1 flex items-center">
                      <button
                        onClick={handleSelectAll}
                        className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 hover:border-emerald-500"
                      >
                        {selectedShiftIds.size === paginatedShifts.length &&
                        paginatedShifts.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSort('date')}
                      className="col-span-2 flex items-center gap-1 hover:text-slate-700"
                    >
                      Date
                      {sortField === 'date' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        ))}
                    </button>
                    <button
                      onClick={() => handleSort('time')}
                      className="col-span-2 flex items-center gap-1 hover:text-slate-700"
                    >
                      Time
                      {sortField === 'time' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        ))}
                    </button>
                    <button
                      onClick={() => handleSort('staff')}
                      className="col-span-2 flex items-center gap-1 hover:text-slate-700"
                    >
                      Staff
                      {sortField === 'staff' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        ))}
                    </button>
                    <button
                      onClick={() => handleSort('location')}
                      className="col-span-3 flex items-center gap-1 hover:text-slate-700"
                    >
                      Location
                      {sortField === 'location' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        ))}
                    </button>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-100">
                    {paginatedShifts.map((shift) => (
                      <div
                        key={shift.cp365_shiftid}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 hover:bg-slate-50 ${
                          selectedShiftIds.has(shift.cp365_shiftid) ? 'bg-emerald-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="col-span-1 flex items-center">
                          <button
                            onClick={() => handleSelectShift(shift.cp365_shiftid)}
                            className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 hover:border-emerald-500"
                          >
                            {selectedShiftIds.has(shift.cp365_shiftid) ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>

                        {/* Date */}
                        <div className="col-span-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {shift.cp365_shiftdate
                              ? format(parseISO(shift.cp365_shiftdate), 'EEE, d MMM')
                              : 'No date'}
                          </span>
                        </div>

                        {/* Time */}
                        <div className="col-span-2 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {formatTime(shift.cp365_shiftstarttime)} -{' '}
                            {formatTime(shift.cp365_shiftendtime)}
                          </span>
                        </div>

                        {/* Staff */}
                        <div className="col-span-2 flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span
                            className={`text-sm ${shift.cp365_StaffMember ? 'text-slate-700' : 'text-amber-600 italic'}`}
                          >
                            {shift.cp365_StaffMember
                              ? `${shift.cp365_StaffMember.cp365_forename} ${shift.cp365_StaffMember.cp365_surname}`
                              : 'Unassigned'}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="col-span-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700">
                              {shift.cp365_Rota?.cp365_Sublocation?.cp365_Location
                                ?.cp365_locationname || 'Unknown'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {shift.cp365_Rota?.cp365_Sublocation?.cp365_sublocationname || ''}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewInRota(shift)}
                            title="View in Rota"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await publishMutation.mutateAsync([shift.cp365_shiftid]);
                              } catch (error) {
                                console.error('Failed to publish shift:', error);
                              }
                            }}
                            disabled={isProcessing}
                            title="Publish"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this shift?')) {
                                deleteMutation.mutate([shift.cp365_shiftid]);
                              }
                            }}
                            disabled={isProcessing}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                      <div className="text-sm text-slate-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                        {Math.min(currentPage * ITEMS_PER_PAGE, sortedShifts.length)} of{' '}
                        {sortedShifts.length} shifts
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1.5 text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
