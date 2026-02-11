/**
 * Dashboard Page
 * Redesigned dashboard with:
 * - Location filter at top
 * - Today's Snapshot (respects location only)
 * - Period section with date filter (respects location + period)
 *   - Attention Required
 *   - Period Stats
 *   - Coverage Heatmap
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, format, addWeeks, subWeeks, addDays } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  CalendarCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/common/Header';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { Loading } from '@/components/common/Loading';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { useLocations, useSublocations, useActiveRota } from '@/hooks/useLocations';
import {
  useTodaySnapshot,
  usePeriodAttention,
  useOvertimeAlerts,
  useCoverageByDay,
} from '@/hooks/useDashboardData';
import { useLocationSettings } from '@/store/settingsStore';
import {
  TodaySnapshot,
  AttentionRequired,
  PeriodStats,
  CoverageHeatmap,
} from '@/components/dashboard';

/**
 * Get the Monday of the current week
 */
function getCurrentMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export function Dashboard() {
  const navigate = useNavigate();
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();

  // Location/Sublocation from shared store (persisted across views)
  const {
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
  } = useLocationSettings();

  // Local state for date navigation
  const [weekStart, setWeekStart] = useState<Date>(getCurrentMonday);
  const [duration, setDuration] = useState<7 | 14 | 28>(7);

  // Computed end date
  const endDate = addDays(weekStart, duration - 1);

  // Fetch locations
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Fetch sublocations when location changes
  const { data: sublocations, isLoading: isLoadingSublocations } = useSublocations(
    selectedLocationId || undefined
  );

  // Fetch active rota for sublocation
  const { data: activeRota } = useActiveRota(selectedSublocationId || undefined);
  const rotaId = activeRota?.cp365_rotaid;

  // Dashboard data hooks
  const {
    data: todayData,
    isLoading: isLoadingToday,
    refetch: refetchToday,
  } = useTodaySnapshot({
    sublocationId: selectedSublocationId || undefined,
    rotaId,
    enabled: !!selectedSublocationId && !!rotaId,
  });

  const {
    data: periodData,
    isLoading: isLoadingPeriod,
    refetch: refetchPeriod,
  } = usePeriodAttention({
    sublocationId: selectedSublocationId || undefined,
    rotaId,
    startDate: weekStart,
    endDate,
    enabled: !!selectedSublocationId && !!rotaId,
  });

  const {
    data: overtimeAlerts = [],
    isLoading: isLoadingOvertime,
    refetch: refetchOvertime,
  } = useOvertimeAlerts({
    sublocationId: selectedSublocationId || undefined,
    rotaId,
    startDate: weekStart,
    endDate,
    enabled: !!selectedSublocationId && !!rotaId,
  });

  const {
    data: coverageData = [],
    isLoading: isLoadingCoverage,
    refetch: refetchCoverage,
  } = useCoverageByDay({
    sublocationId: selectedSublocationId || undefined,
    rotaId,
    startDate: weekStart,
    endDate,
    enabled: !!selectedSublocationId && !!rotaId,
  });

  const isFetching =
    isLoadingToday || isLoadingPeriod || isLoadingOvertime || isLoadingCoverage;

  // Auto-select first location (only if none selected) - intentional auto-selection UX
   
  useEffect(() => {
    if (!locations?.length) return;

    const savedLocationExists =
      selectedLocationId && locations.some((loc) => loc.cp365_locationid === selectedLocationId);

    if (!savedLocationExists) {
      setSelectedLocationId(locations[0].cp365_locationid);
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);
   

  // Auto-select first sublocation (only if none selected or invalid) - intentional auto-selection UX
   
  useEffect(() => {
    if (!sublocations?.length) {
      if (selectedSublocationId) {
        setSelectedSublocationId('');
      }
      return;
    }

    const savedSublocationExists =
      selectedSublocationId &&
      sublocations.some((sub) => sub.cp365_sublocationid === selectedSublocationId);

    if (!savedSublocationExists) {
      setSelectedSublocationId(sublocations[0].cp365_sublocationid);
    }
  }, [sublocations, selectedSublocationId, setSelectedSublocationId]);
   

  // Navigation handlers
   
  const handlePreviousWeek = useCallback(() => {
    setWeekStart((prev) => subWeeks(prev, duration === 28 ? 4 : 1));
  }, [duration]);

   
  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, duration === 28 ? 4 : 1));
  }, [duration]);

   
  const handleToday = useCallback(() => {
    setWeekStart(getCurrentMonday());
  }, []);

  const handleRefresh = useCallback(() => {
    void refetchToday();
    void refetchPeriod();
    void refetchOvertime();
    void refetchCoverage();
  }, [refetchToday, refetchPeriod, refetchOvertime, refetchCoverage]);

  // Show loading while locations are loading
  if (isLoadingLocations) {
    return <Loading message="Loading locations..." />;
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Dark Sidebar */}
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={toggleSideNav}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-800">Dashboard</span>
          <div className="w-9" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* Page Header with Location Filter */}
            <PageHeader
              title="Dashboard"
              subtitle="Rota Management Overview"
              rightContent={
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">
                    <Calendar size={16} />
                    {format(new Date(), 'EEEE, d MMMM yyyy')}
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              }
            />

            {/* Location Filter Card */}
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
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
                      <option
                        key={sublocation.cp365_sublocationid}
                        value={sublocation.cp365_sublocationid}
                      >
                        {sublocation.cp365_sublocationname}
                      </option>
                    ))}
                  </select>
                </div>

                {activeRota && (
                  <span className="text-sm text-slate-500">
                    Rota:{' '}
                    <span className="font-medium text-slate-700">{activeRota.cp365_rotaname}</span>
                  </span>
                )}
              </div>
            </div>

            {/* ================================================================= */}
            {/* TODAY'S SNAPSHOT SECTION - Respects location only */}
            {/* ================================================================= */}
            <FeatureErrorBoundary featureName="Today's Snapshot">
              <TodaySnapshot data={todayData} isLoading={isLoadingToday} />
            </FeatureErrorBoundary>

            {/* ================================================================= */}
            {/* PERIOD SECTION - Respects location + date period */}
            {/* ================================================================= */}
            <div className="space-y-4">
              {/* Period Filter Header */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
                  {/* Date Navigation */}
                  <div className="flex items-center gap-3">
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

                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {format(weekStart, 'd MMM')} - {format(endDate, 'd MMM yyyy')}
                      </span>
                    </div>

                    <button
                      onClick={handleToday}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Today
                    </button>
                  </div>

                  {/* Duration Selector & Actions */}
                  <div className="flex items-center gap-2">
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value) as 7 | 14 | 28)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      aria-label="Select period duration"
                    >
                      <option value={7}>Weekly</option>
                      <option value={14}>Fortnightly</option>
                      <option value={28}>Monthly</option>
                    </select>

                    <button
                      onClick={() => navigate('/daily')}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <CalendarCheck size={16} />
                      Open Daily View
                    </button>
                  </div>
                </div>
              </div>

              {/* Period Content Grid */}
              {!selectedSublocationId ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16">
                  <Calendar className="h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800">Select a Location</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a location and sublocation to view period data.
                  </p>
                </div>
              ) : (
                <>
                  {/* Attention Required + Period Stats Row */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <FeatureErrorBoundary featureName="Attention Required">
                        <AttentionRequired
                          items={periodData?.items ?? []}
                          overtimeAlerts={overtimeAlerts}
                          isLoading={isLoadingPeriod || isLoadingOvertime}
                        />
                      </FeatureErrorBoundary>
                    </div>
                    <div>
                      <FeatureErrorBoundary featureName="Period Stats">
                        <PeriodStats stats={periodData?.stats ?? null} isLoading={isLoadingPeriod} />
                      </FeatureErrorBoundary>
                    </div>
                  </div>

                  {/* Coverage Heatmap */}
                  <FeatureErrorBoundary featureName="Coverage Heatmap">
                    <CoverageHeatmap data={coverageData} isLoading={isLoadingCoverage} />
                  </FeatureErrorBoundary>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
