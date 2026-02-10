/**
 * RotaView Page
 * Full rota management grid with edit capabilities.
 * Design aligned with cp365-complex-ld.
 *
 * Data logic is extracted into useRotaViewData hook.
 * Filter and action bars are separate components.
 */

import { Calendar, RefreshCw, AlertCircle, Menu } from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { Loading, Skeleton } from '@/components/common/Loading';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { ViewToggle } from '@/components/common/ViewToggle';
import { RotaGrid } from '@/components/rota/RotaGrid';
import { ShiftFlyout } from '@/components/rota/ShiftFlyout';
import { RotaFilterBar } from './rota/RotaFilterBar';
import { RotaActionBar } from './rota/RotaActionBar';
import { useRotaViewData } from './rota/useRotaViewData';

export function RotaView() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  const data = useRotaViewData();

  // Show loading while locations are loading
  if (data.isLoadingLocations) {
    return <Loading message="Loading locations..." />;
  }

  const pageSubtitle = 'Staff scheduling & shift management';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Dark Sidebar */}
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSideNav}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-xl font-bold">{data.pageTitle}</h1>
                <p className="text-sm text-emerald-100">{pageSubtitle}</p>
              </div>
              <h1 className="text-lg font-bold sm:hidden">{data.pageTitle}</h1>

              <ViewToggle
                currentView={data.navigationView}
                currentDate={data.weekStart}
                variant="emerald"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={data.handleRefresh}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${data.isFetchingRota ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Filters Bar */}
        <RotaFilterBar
          locations={data.locations}
          sublocations={data.sublocations}
          selectedLocationId={data.selectedLocationId}
          selectedSublocationId={data.selectedSublocationId}
          onLocationChange={data.setSelectedLocationId}
          onSublocationChange={data.setSelectedSublocationId}
          isLoadingSublocations={data.isLoadingSublocations}
          showExternalStaff={data.showExternalStaff}
          showOtherRotaShifts={data.showOtherRotaShifts}
          onShowExternalStaffChange={data.setShowExternalStaff}
          onShowOtherRotaShiftsChange={data.setShowOtherRotaShifts}
          activeRota={data.activeRota}
        />

        {/* Date Navigation & Actions Bar */}
        <RotaActionBar
          viewMode={data.viewMode}
          detailLevel={data.detailLevel}
          onViewModeChange={data.setViewMode}
          onDetailLevelChange={data.setDetailLevel}
          disabled={!data.selectedSublocationId}
          weekStart={data.weekStart}
          duration={data.duration}
          onPreviousWeek={data.handlePreviousWeek}
          onNextWeek={data.handleNextWeek}
          onToday={data.handleToday}
          selectedShiftCount={data.selectedShiftIds.size}
          onClearSelection={data.handleClearSelection}
          onCopyWeek={data.handleCopyWeek}
          onExportPDF={data.handleExportPDF}
          onAddShift={data.handleOpenCreateFlyout}
          activeRota={data.activeRota}
          isLoadingActiveRota={data.isLoadingActiveRota}
        />

        {/* Rota Grid */}
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          {/* Warning banner when sublocation selected but no rota */}
          {data.selectedSublocationId &&
            !data.activeRota &&
            !data.isLoadingRota &&
            !data.isLoadingActiveRota && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-700">No Active Rota Found</p>
                  <p className="text-sm text-slate-600">
                    This sublocation does not have an active rota. You won't be able to create
                    shifts until a rota is configured in Dataverse.
                  </p>
                </div>
              </div>
            )}

          {!data.selectedSublocationId ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="Select a Location"
              description="Choose a location and sublocation from the dropdowns above to view the rota."
            />
          ) : data.isLoadingRota ? (
            <LoadingGrid />
          ) : data.rotaData ? (
            <RotaGrid
              startDate={data.weekStart}
              duration={data.duration}
              staff={data.rotaData.staff}
              shifts={data.rotaData.shifts}
              otherRotaShifts={data.rotaData.otherRotaShifts}
              selectedShiftIds={data.selectedShiftIds}
              onShiftClick={data.handleShiftClick}
              onCellClick={data.handleCellClick}
              onSelectionChange={data.handleSelectionChange}
              viewMode={data.viewMode}
              detailLevel={data.detailLevel}
              shiftReferences={data.shiftReferences}
              onAddShift={data.handleAddShift}
              hierarchicalData={data.hierarchicalData}
              isHierarchicalDataLoading={data.isLoadingHierarchical}
              absenceTypes={data.rotaData.absenceTypes}
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
        isOpen={data.flyoutOpen}
        onClose={data.handleCloseFlyout}
        shiftId={data.selectedShift?.['Shift ID']}
        mode={data.flyoutMode}
        defaultDate={data.createShiftDate}
        defaultShiftReferenceId={data.createShiftReferenceId}
        defaultStaffMemberId={data.createShiftStaffId}
        locationId={data.selectedLocationId}
        sublocationId={data.selectedSublocationId}
        rotaId={data.activeRota?.cp365_rotaid}
        staffList={data.rotaData?.staff || []}
      />
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16">
      <div className="text-slate-300">{icon}</div>
      <h3 className="mt-4 text-lg font-medium text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

/**
 * Loading Grid Placeholder
 */
function LoadingGrid() {
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100">
        <div className="w-56 shrink-0 border-r border-slate-100 bg-slate-50 p-3">
          <Skeleton className="h-5 w-24" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-slate-100 bg-slate-50 p-3 text-center last:border-r-0"
          >
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
              {rowIndex % 2 === colIndex % 3 && <Skeleton className="h-14 w-full rounded-md" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
