/**
 * Dashboard Page
 * Main entry point showing rota overview and quick stats
 * Design aligned with cp365-complex-ld
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, format, addWeeks, subWeeks } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronRight as ChevronRightIcon,
  CalendarCheck,
  UserX,
  Building2,
} from 'lucide-react';
import { PageHeader } from '../components/common/Header';
import { SideNav, useSideNav } from '../components/common/SideNav';
import { Loading, Skeleton } from '../components/common/Loading';
import { useLocations, useSublocations, useActiveRota } from '../hooks/useLocations';
import { useRotaData } from '../hooks/useRotaData';
import { useTotalUnpublishedCount } from '../hooks/useShifts';
import { useLocationSettings } from '../store/settingsStore';
import { debugGetAllRotas } from '../api/dataverse/locations';
import type { RotaGridData } from '../api/dataverse/shifts';

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

  // Fetch locations
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Fetch sublocations when location changes
  const { data: sublocations, isLoading: isLoadingSublocations } = useSublocations(
    selectedLocationId || undefined
  );

  // Fetch active rota for sublocation
  const { data: activeRota } = useActiveRota(selectedSublocationId || undefined);

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
  });

  // Fetch total unpublished count across ALL rotas (for comparison)
  const { data: totalUnpublishedCount = 0 } = useTotalUnpublishedCount();

  // DEBUG: Check all rotas on mount
  useEffect(() => {
    debugGetAllRotas();
  }, []);

  // DEBUG: Log query parameters and results
  useEffect(() => {
    console.log('[Dashboard] Query parameters:', {
      selectedLocationId,
      selectedSublocationId,
      activeRotaId: activeRota?.cp365_rotaid,
      activeRotaName: activeRota?.cp365_rotaname,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      duration,
      isLoadingRota,
    });
  }, [selectedLocationId, selectedSublocationId, activeRota, weekStart, duration, isLoadingRota]);

  // DEBUG: Log stats when data changes
  useEffect(() => {
    if (rotaData) {
      console.log('[Dashboard] Stats received:', {
        totalShifts: rotaData.shifts.length,
        staffCount: rotaData.staff.length,
        stats: rotaData.stats,
        unassignedInShifts: rotaData.shifts.filter(s => !s['Staff Member ID']).length,
        unpublishedInShifts: rotaData.shifts.filter(s => s['Shift Status'] !== 1001).length,
      });
      
      // Log each shift's staff assignment status
      if (rotaData.shifts.length > 0) {
        console.log('[Dashboard] Shift staff assignments:', rotaData.shifts.map(s => ({
          id: s['Shift ID']?.slice(-8),
          date: s['Shift Date']?.split('T')[0],
          staffId: s['Staff Member ID'],
          staffName: s['Staff Member Name'],
          hasStaff: !!s['Staff Member ID'],
        })));
      }
    } else {
      console.log('[Dashboard] No rota data available');
    }
  }, [rotaData]);

  // Auto-select first location (only if none selected)
  useEffect(() => {
    if (!locations?.length) return;
    
    // Check if saved location still exists
    const savedLocationExists = selectedLocationId && 
      locations.some(loc => loc.cp365_locationid === selectedLocationId);
    
    // Only auto-select if no valid selection exists
    if (!savedLocationExists) {
      setSelectedLocationId(locations[0].cp365_locationid);
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);

  // Auto-select first sublocation (only if none selected or invalid)
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
    
    // Only auto-select if no valid selection exists
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
    refetchRota();
  }, [refetchRota]);

  // Navigate to full rota view
  const handleViewRota = useCallback((viewDuration: 7 | 14 | 28) => {
    navigate(`/rota/${viewDuration}`);
  }, [navigate]);

  // Show loading while locations are loading
  if (isLoadingLocations) {
    return <Loading message="Loading locations..." />;
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Dark Sidebar */}
      <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={toggleSideNav}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-800">Dashboard</span>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Page Header */}
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
                    <RefreshCw size={16} className={isFetchingRota ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              }
            />

            {/* Stat Cards - Gradient style matching cp365-complex-ld */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <GradientStatCard
                label="Staff on Rota"
                value={rotaData?.staff?.length ?? 0}
                icon={<Users size={28} />}
                gradient="from-emerald-500 to-emerald-600"
                isLoading={isLoadingRota}
                onClick={() => handleViewRota(7)}
              />
              <GradientStatCard
                label="Published Hours"
                value={rotaData?.stats?.publishedHours ?? 0}
                suffix="hrs"
                icon={<Clock size={28} />}
                gradient="from-blue-500 to-blue-600"
                isLoading={isLoadingRota}
              />
              <GradientStatCard
                label="Unassigned"
                value={rotaData?.stats?.unassignedCount ?? 0}
                icon={<UserX size={28} />}
                gradient="from-amber-500 to-amber-600"
                isLoading={isLoadingRota}
              />
              <GradientStatCard
                label="Agency Hours"
                value={rotaData?.stats?.agencyHours ?? 0}
                suffix="hrs"
                icon={<Building2 size={28} />}
                gradient="from-purple-500 to-purple-600"
                isLoading={isLoadingRota}
              />
              <GradientStatCard
                label="Unpublished"
                value={rotaData?.stats?.unpublishedCount ?? 0}
                totalValue={totalUnpublishedCount}
                icon={<AlertCircle size={28} />}
                gradient="from-red-500 to-red-600"
                isLoading={isLoadingRota}
                onClick={() => navigate('/shifts/unpublished')}
              />
            </div>

            {/* Filter & Date Navigation Card */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                {/* Location Selectors */}
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
                        <option key={sublocation.cp365_sublocationid} value={sublocation.cp365_sublocationid}>
                          {sublocation.cp365_sublocationname}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeRota && (
                    <span className="text-sm text-slate-500">
                      Rota: <span className="font-medium text-slate-700">{activeRota.cp365_rotaname}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
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

                <div className="flex items-center gap-2">
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

            {/* Main Content Area */}
            {!selectedSublocationId ? (
              <EmptyState
                icon={<Calendar className="h-12 w-12" />}
                title="Select a Location"
                description="Choose a location and sublocation from the dropdowns above to view the rota."
              />
            ) : isLoadingRota ? (
              <LoadingRotaGrid />
            ) : rotaData ? (
              <RotaSummaryGrid data={rotaData} weekStart={weekStart} duration={duration} />
            ) : (
              <EmptyState
                icon={<AlertCircle className="h-12 w-12" />}
                title="No Data Available"
                description="No rota data found for the selected period. Try selecting a different date range."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Gradient Stat Card Component - matching cp365-complex-ld design
 */
interface GradientStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  /** Optional total value to show as comparison (displays as "value / total") */
  totalValue?: number;
  suffix?: string;
  gradient: string;
  isLoading?: boolean;
  onClick?: () => void;
}

function GradientStatCard({ icon, label, value, totalValue, suffix, gradient, isLoading, onClick }: GradientStatCardProps) {
  return (
    <div 
      className={`rounded-lg bg-gradient-to-br ${gradient} p-4 text-white cursor-pointer hover:scale-105 transition-all shadow-sm`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/80">{label}</p>
          {isLoading ? (
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-white/20" />
          ) : (
            <p className="text-2xl font-bold">
              {value.toLocaleString()}
              {totalValue !== undefined && (
                <span className="text-lg font-normal text-white/70"> / {totalValue.toLocaleString()}</span>
              )}
              {suffix && <span className="ml-1 text-sm font-normal text-white/80">{suffix}</span>}
            </p>
          )}
        </div>
        <div className="text-white/60">
          {icon}
        </div>
      </div>
      {totalValue !== undefined ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-white/60">
          Filtered / All locations <ChevronRightIcon size={12} />
        </p>
      ) : (
        <p className="mt-2 flex items-center gap-1 text-xs text-white/60">
          View details <ChevronRightIcon size={12} />
        </p>
      )}
    </div>
  );
}

/**
 * Empty State Component - matching cp365-complex-ld design
 */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16">
      <div className="text-slate-300">{icon}</div>
      <h3 className="mt-4 text-lg font-medium text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

/**
 * Loading Rota Grid Placeholder - matching cp365-complex-ld design
 */
function LoadingRotaGrid() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Rota Summary Grid Component - matching cp365-complex-ld design
 */
interface RotaSummaryGridProps {
  data: RotaGridData;
  weekStart: Date;
  duration: number;
}

function RotaSummaryGrid({ data }: RotaSummaryGridProps) {
  const navigate = useNavigate();
  
  // Group shifts by staff member
  const staffShifts = new Map<string, typeof data.shifts>();

  for (const shift of data.shifts) {
    const staffId = shift['Staff Member ID'] || 'unassigned';
    const existing = staffShifts.get(staffId) || [];
    existing.push(shift);
    staffShifts.set(staffId, existing);
  }

  // Create staff list with shifts
  const staffList = data.staff.map((staff) => ({
    id: staff['Staff Member ID'],
    name: staff['Staff Member Name'] || 'Unknown',
    jobTitle: staff['Job Title Name'],
    shifts: staffShifts.get(staff['Staff Member ID']) || [],
  }));

  // Get unassigned shifts
  const unassignedShifts = staffShifts.get('unassigned') || [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="font-semibold text-slate-800">
          Staff Overview ({staffList.length} staff members)
        </h3>
        <button 
          onClick={() => navigate('/rota/7')}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          View All <ChevronRightIcon size={16} />
        </button>
      </div>

      {staffList.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          No staff members assigned to this sublocation.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {staffList.slice(0, 10).map((staff) => (
            <div 
              key={staff.id} 
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => navigate('/rota/7')}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                {staff.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-700">{staff.name}</p>
                <p className="text-sm text-slate-500">{staff.jobTitle || 'No job title'}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-700">{staff.shifts.length} shifts</p>
                <p className="text-sm text-slate-500">this period</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-slate-400" />
            </div>
          ))}

          {staffList.length > 10 && (
            <div className="px-4 py-3 text-center text-sm text-slate-500">
              +{staffList.length - 10} more staff members
            </div>
          )}
        </div>
      )}

      {/* Unassigned shifts section */}
      {unassignedShifts.length > 0 && (
        <div className="border-t-2 border-amber-400 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-700">Unassigned Shifts</span>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              {unassignedShifts.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
