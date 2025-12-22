/**
 * RotaView Page
 * Full rota management grid with edit capabilities
 * Design aligned with cp365-complex-ld
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { startOfWeek, format, addWeeks, subWeeks, parseISO, isValid } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  RefreshCw,
  Copy,
  Download,
  Plus,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { SideNav, useSideNav } from '../components/common/SideNav';
import { Loading, Skeleton } from '../components/common/Loading';
import { ViewToggle } from '../components/common/ViewToggle';
import { RotaGrid } from '../components/rota/RotaGrid';
import { ShiftFlyout } from '../components/rota/ShiftFlyout';
import { ViewModeSelector } from '../components/rota/ViewModeSelector';
import { useLocations, useSublocations, useActiveRota } from '../hooks/useLocations';
import { useRotaData } from '../hooks/useRotaData';
import { useShiftReferences } from '../hooks/useShifts';
import { useHierarchicalRotaData } from '../hooks/useHierarchicalRotaData';
import { useRotaStore } from '../store/rotaStore';
import { useLocationSettings, useViewPreferences, type ViewMode } from '../store/settingsStore';
import type { ShiftViewData } from '../api/dataverse/types';

/**
 * Get the Monday of the current week
 */
function getCurrentMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

/**
 * Get the Monday of the week containing the given date
 */
function getMondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Parse date from URL or return Monday of current week
 */
function parseDateFromUrl(dateStr: string | null): Date {
  if (!dateStr) return getCurrentMonday();
  const parsed = parseISO(dateStr);
  if (isValid(parsed)) {
    return getMondayOfWeek(parsed);
  }
  return getCurrentMonday();
}

export function RotaView() {
  const { duration: durationParam } = useParams<{ duration: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();

  // View mode state from store
  const viewMode = useRotaStore((state) => state.viewMode);
  const detailLevel = useRotaStore((state) => state.detailLevel);
  const setViewMode = useRotaStore((state) => state.setViewMode);
  const setDetailLevel = useRotaStore((state) => state.setDetailLevel);

  // Location/Sublocation from shared store (persisted across views)
  const {
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
  } = useLocationSettings();

  // View preferences from shared store
  const { setLastViewMode, setLastSelectedDate } = useViewPreferences();

  // Parse duration from URL
  const initialDuration = parseInt(durationParam || '7', 10) as 7 | 14 | 28;
  const validDuration = [7, 14, 28].includes(initialDuration) ? initialDuration : 7;

  // Determine current view mode from duration
  const currentViewMode: ViewMode = validDuration === 28 ? 'month' : 'week';

  // Date state - from URL or current week
  const [weekStart, setWeekStartState] = useState<Date>(() => 
    parseDateFromUrl(searchParams.get('date'))
  );
  const [duration, setDuration] = useState<7 | 14 | 28>(validDuration as 7 | 14 | 28);

  // Wrapper to update date and preferences
  const setWeekStart = useCallback((date: Date | ((prev: Date) => Date)) => {
    setWeekStartState(prev => {
      const newDate = typeof date === 'function' ? date(prev) : date;
      setLastSelectedDate(newDate);
      return newDate;
    });
  }, [setLastSelectedDate]);

  // Selection state
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  // Flyout state
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutMode, setFlyoutMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedShift, setSelectedShift] = useState<ShiftViewData | undefined>();
  const [createShiftDate, setCreateShiftDate] = useState<Date | undefined>();
  const [createShiftStaffId, setCreateShiftStaffId] = useState<string | undefined>();

  // Show staff working from other locations/sublocations
  const [showExternalStaff, setShowExternalStaff] = useState(false);
  
  // Show shifts from other rotas for staff who work at multiple locations
  const [showOtherRotaShifts, setShowOtherRotaShifts] = useState(false);

  // Fetch locations
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Fetch sublocations when location changes
  const { data: sublocations, isLoading: isLoadingSublocations } = useSublocations(
    selectedLocationId || undefined
  );

  // Fetch active rota for sublocation
  const { data: activeRota, isLoading: isLoadingActiveRota } = useActiveRota(selectedSublocationId || undefined);

  // Fetch rota data when sublocation is selected
  const { 
    data: rotaData, 
    isLoading: isLoadingRota,
    refetch: refetchRota,
    isFetching: isFetchingRota,
  } = useRotaData({
    sublocationId: selectedSublocationId || undefined,
    startDate: weekStart,
    duration,
    rotaId: activeRota?.cp365_rotaid,
    enabled: !!selectedSublocationId,
    showExternalStaff,
    showOtherRotaShifts,
  });

  // Fetch shift references for shift reference view
  const { data: shiftReferences = [] } = useShiftReferences(
    selectedSublocationId || undefined,
    selectedLocationId || undefined
  );

  // Fetch hierarchical data for team view
  const {
    data: hierarchicalData,
    isLoading: isLoadingHierarchical,
  } = useHierarchicalRotaData({
    locationId: selectedLocationId || undefined,
    sublocationId: selectedSublocationId || undefined,
    rotaId: activeRota?.cp365_rotaid,
    startDate: weekStart,
    duration,
    enabled: viewMode === 'team' && !!selectedLocationId && !!selectedSublocationId,
  });

  // Validate and auto-select location
  useEffect(() => {
    if (!locations?.length) return;
    
    // Check if saved location still exists
    const savedLocationExists = selectedLocationId && 
      locations.some(loc => loc.cp365_locationid === selectedLocationId);
    
    if (!savedLocationExists) {
      // Saved location doesn't exist or not set - select first
      setSelectedLocationId(locations[0].cp365_locationid);
    }
  }, [locations, selectedLocationId]);

  // Validate and auto-select sublocation when location changes
  useEffect(() => {
    if (!sublocations?.length) {
      if (selectedSublocationId) {
        setSelectedSublocationId('');
      }
      return;
    }
    
    // Check if saved sublocation still exists and belongs to this location
    const savedSublocationExists = selectedSublocationId && 
      sublocations.some(sub => sub.cp365_sublocationid === selectedSublocationId);
    
    if (!savedSublocationExists) {
      // Saved sublocation doesn't exist for this location - select first
      setSelectedSublocationId(sublocations[0].cp365_sublocationid);
    }
  }, [sublocations, selectedSublocationId]);

  // Sync duration state with URL parameter when it changes (e.g., from ViewToggle navigation)
  useEffect(() => {
    const urlDuration = parseInt(durationParam || '7', 10) as 7 | 14 | 28;
    const validUrlDuration = [7, 14, 28].includes(urlDuration) ? urlDuration : 7;
    // Always update state to match URL - this is the source of truth for view changes
    setDuration(validUrlDuration as 7 | 14 | 28);
  }, [durationParam]);

  // Update URL when date changes (to keep URL in sync for sharing)
  // Note: We don't update URL when duration changes because ViewToggle handles that navigation
  useEffect(() => {
    const dateStr = format(weekStart, 'yyyy-MM-dd');
    const currentDateInUrl = searchParams.get('date');
    // Only update URL if date changed (not duration)
    if (currentDateInUrl !== dateStr) {
      navigate(`/rota/${duration}?date=${dateStr}`, { replace: true });
    }
  }, [weekStart, duration, navigate, searchParams]);

  // Set current view mode on mount/change
  useEffect(() => {
    setLastViewMode(currentViewMode);
  }, [currentViewMode, setLastViewMode]);

  // Navigation handlers
  const handlePreviousWeek = useCallback(() => {
    setWeekStart((prev) => subWeeks(prev, duration === 28 ? 4 : duration === 14 ? 2 : 1));
  }, [duration]);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, duration === 28 ? 4 : duration === 14 ? 2 : 1));
  }, [duration]);

  const handleToday = useCallback(() => {
    setWeekStart(getCurrentMonday());
  }, []);

  const handleRefresh = useCallback(() => {
    refetchRota();
  }, [refetchRota]);

  // Shift handlers
  const handleShiftClick = useCallback((shift: ShiftViewData) => {
    setSelectedShift(shift);
    // Open in edit mode for unassigned shifts, view mode for assigned shifts
    const isUnassigned = !shift['Staff Member ID'];
    setFlyoutMode(isUnassigned ? 'edit' : 'view');
    setFlyoutOpen(true);
  }, []);

  const handleCellClick = useCallback((date: Date, staffMemberId: string | null) => {
    setSelectedShift(undefined);
    setCreateShiftDate(date);
    setCreateShiftStaffId(staffMemberId || undefined);
    setFlyoutMode('create');
    setFlyoutOpen(true);
  }, []);

  const handleSelectionChange = useCallback((shiftIds: Set<string>) => {
    setSelectedShiftIds(shiftIds);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedShiftIds(new Set());
  }, []);

  const handleCopyWeek = useCallback(() => {
    // TODO: Implement copy week
    console.log('Copy week');
  }, []);

  const handleExportPDF = useCallback(() => {
    // TODO: Implement PDF export
    console.log('Export PDF');
  }, []);

  // Show loading while locations are loading
  if (isLoadingLocations) {
    return <Loading message="Loading locations..." />;
  }

  const pageTitle = duration === 7 ? 'Weekly Rota' : duration === 14 ? '2-Week Rota' : 'Monthly Rota';
  const pageSubtitle = 'Staff scheduling & shift management';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Dark Sidebar */}
      <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ============================================================= */}
        {/* HEADER BAR - Emerald Gradient */}
        {/* ============================================================= */}
        <header className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title & View Toggle */}
            <div className="flex items-center gap-4">
              {/* Mobile menu toggle */}
              <button
                onClick={toggleSideNav}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold">{pageTitle}</h1>
                <p className="text-sm text-emerald-100">{pageSubtitle}</p>
              </div>
              <h1 className="text-lg font-bold sm:hidden">{pageTitle}</h1>
              
              <ViewToggle 
                currentView={currentViewMode} 
                currentDate={weekStart} 
                variant="emerald"
              />
            </div>

            {/* Right: Refresh & Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${isFetchingRota ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* FILTERS BAR */}
        {/* ============================================================= */}
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
          {/* Location Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="location" className="text-sm font-medium text-slate-700">
              Location:
            </label>
            <select
              id="location"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select location...</option>
              {locations?.map((location) => (
                <option key={location.cp365_locationid} value={location.cp365_locationid}>
                  {location.cp365_locationname}
                </option>
              ))}
            </select>
          </div>

          {/* Sublocation Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="sublocation" className="text-sm font-medium text-slate-700">
              Sublocation:
            </label>
            <select
              id="sublocation"
              value={selectedSublocationId}
              onChange={(e) => setSelectedSublocationId(e.target.value)}
              disabled={!selectedLocationId || isLoadingSublocations}
              className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">
                {isLoadingSublocations ? 'Loading...' : 'Select sublocation...'}
              </option>
              {sublocations?.map((sublocation) => (
                <option key={sublocation.cp365_sublocationid} value={sublocation.cp365_sublocationid}>
                  {sublocation.cp365_sublocationname}
                </option>
              ))}
            </select>
          </div>

          {/* Show external staff checkbox - staff from other sublocations */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showExternalStaff"
              checked={showExternalStaff}
              onChange={(e) => setShowExternalStaff(e.target.checked)}
              disabled={!selectedSublocationId}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label
              htmlFor="showExternalStaff"
              className={`text-sm ${!selectedSublocationId ? 'text-slate-400' : 'text-slate-700'}`}
              title="Show shifts for staff who are assigned to other sublocations but working on this rota"
            >
              External staff
            </label>
          </div>

          {/* Show shifts from other rotas checkbox - dual home staff */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOtherRotaShifts"
              checked={showOtherRotaShifts}
              onChange={(e) => setShowOtherRotaShifts(e.target.checked)}
              disabled={!selectedSublocationId}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label
              htmlFor="showOtherRotaShifts"
              className={`text-sm ${!selectedSublocationId ? 'text-slate-400' : 'text-slate-700'}`}
              title="Show shifts that staff have at other locations/rotas"
            >
              Shifts from other rotas
            </label>
          </div>

          {/* Rota info */}
          {activeRota && (
            <div className="ml-auto text-sm text-slate-500">
              Rota: <span className="font-medium text-slate-700">{activeRota.cp365_rotaname}</span>
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* DATE NAVIGATION & ACTIONS BAR */}
        {/* ============================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          {/* Left: View Mode & Date Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Selector (People/Shifts/Reference) */}
            <ViewModeSelector
              viewMode={viewMode}
              detailLevel={detailLevel}
              onViewModeChange={setViewMode}
              onDetailLevelChange={setDetailLevel}
              disabled={!selectedSublocationId}
            />

            {/* Separator */}
            <div className="hidden md:block h-6 w-px bg-slate-200" />

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200">
                <button
                  onClick={handlePreviousWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-l-lg hover:bg-slate-50"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
                <button
                  onClick={handleNextWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-r-lg border-l border-slate-200 hover:bg-slate-50"
                  aria-label="Next period"
                >
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-400" />
                <span className="font-medium text-slate-700">
                  {format(weekStart, 'd MMM')} - {format(addWeeks(weekStart, duration / 7), 'd MMM yyyy')}
                </span>
              </div>

              <button
                onClick={handleToday}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Today
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Selection info */}
            {selectedShiftIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
                <span className="text-sm font-medium text-emerald-700">
                  {selectedShiftIds.size} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            <button
              onClick={handleCopyWeek}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy Week</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => {
                setSelectedShift(undefined);
                setFlyoutMode('create');
                setFlyoutOpen(true);
              }}
              disabled={!activeRota || isLoadingActiveRota}
              title={
                isLoadingActiveRota 
                  ? 'Loading rota...' 
                  : !activeRota 
                    ? 'No active rota found. Select a sublocation with an active rota.' 
                    : 'Create a new shift'
              }
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                activeRota && !isLoadingActiveRota
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Shift</span>
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* ROTA GRID */}
        {/* ============================================================= */}
        <div className="flex-1 overflow-auto p-4">
          {/* Warning banner when sublocation selected but no rota */}
          {selectedSublocationId && !activeRota && !isLoadingRota && !isLoadingActiveRota && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-700">No Active Rota Found</p>
                <p className="text-sm text-slate-600">
                  This sublocation does not have an active rota. You won't be able to create shifts until a rota is configured in Dataverse.
                </p>
              </div>
            </div>
          )}
          
          {!selectedSublocationId ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="Select a Location"
              description="Choose a location and sublocation from the dropdowns above to view the rota."
            />
          ) : isLoadingRota ? (
            <LoadingGrid />
          ) : rotaData ? (
            <RotaGrid
              startDate={weekStart}
              duration={duration}
              staff={rotaData.staff}
              shifts={rotaData.shifts}
              otherRotaShifts={rotaData.otherRotaShifts}
              selectedShiftIds={selectedShiftIds}
              onShiftClick={handleShiftClick}
              onCellClick={handleCellClick}
              onSelectionChange={handleSelectionChange}
              viewMode={viewMode}
              detailLevel={detailLevel}
              shiftReferences={shiftReferences}
              hierarchicalData={hierarchicalData}
              isHierarchicalDataLoading={isLoadingHierarchical}
              absenceTypes={rotaData.absenceTypes}
            />
          ) : (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="No Data Available"
              description="No rota data found for the selected period."
            />
          )}
        </div>
      </div>

      {/* Shift Flyout */}
      <ShiftFlyout
        isOpen={flyoutOpen}
        onClose={() => {
          setFlyoutOpen(false);
          setSelectedShift(undefined);
          setCreateShiftDate(undefined);
          setCreateShiftStaffId(undefined);
        }}
        shiftId={selectedShift?.['Shift ID']}
        mode={flyoutMode}
        defaultDate={createShiftDate}
        defaultStaffMemberId={createShiftStaffId}
        locationId={selectedLocationId}
        sublocationId={selectedSublocationId}
        rotaId={activeRota?.cp365_rotaid}
        staffList={rotaData?.staff || []}
      />
    </div>
  );
}

/**
 * Empty State Component - matching cp365-complex-ld design
 */
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16">
      <div className="text-slate-300">{icon}</div>
      <h3 className="mt-4 text-lg font-medium text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

/**
 * Loading Grid Placeholder - matching cp365-complex-ld design
 */
function LoadingGrid() {
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100">
        <div className="w-56 shrink-0 border-r border-slate-100 bg-slate-50 p-3">
          <Skeleton className="h-5 w-24" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-slate-100 bg-slate-50 p-3 text-center last:border-r-0">
            <Skeleton className="mx-auto h-4 w-12" />
            <Skeleton className="mx-auto mt-1 h-5 w-16" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b border-slate-100 last:border-b-0">
          <div className="w-56 shrink-0 border-r border-slate-100 p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            </div>
          </div>
          {Array.from({ length: 7 }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 border-r border-slate-100 p-2 last:border-r-0">
              {rowIndex % 2 === colIndex % 3 && (
                <Skeleton className="h-14 w-full rounded-md" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
