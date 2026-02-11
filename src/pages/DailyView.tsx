/**
 * DailyView Page
 * Daily rota management view showing all shifts for a single day
 * Focused on day-of operations and attendance tracking
 * Design aligned with cp365-complex-ld
 */

import { Calendar, Download, ChevronLeft } from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { Loading } from '@/components/common/Loading';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { ViewToggle } from '@/components/common/ViewToggle';
import { DateNavigation } from '@/components/daily/DateNavigation';
import { DailyFilterBar } from '@/components/daily/DailyFilterBar';
import { DepartmentSection } from '@/components/daily/DepartmentSection';
import { ShiftCard } from '@/components/daily/ShiftCard';
import { DailyShiftFlyout } from '@/components/daily/DailyShiftFlyout';
import { ShiftLeaderModal } from '@/components/daily/ShiftLeaderModal';
import { ExportModal } from '@/components/daily/ExportModal';
import { BulkAssignModal } from '@/components/rota/BulkAssignModal';
import { useDailyViewData } from './daily/useDailyViewData';
import { DailyStatsBar } from './daily/DailyStatsBar';
import { StaffOnLeaveModal } from './daily/StaffOnLeaveModal';

// =============================================================================
// Main Component
// =============================================================================

export function DailyView() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  const data = useDailyViewData();

  const hasActiveFilters =
    data.filters.search ||
    data.filters.department !== 'all' ||
    data.filters.status !== 'all' ||
    data.filters.shiftType !== 'all';

  return (
    <div className="flex h-screen bg-slate-100">
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar - Emerald Gradient */}
        <header className="shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3">
          {/* Mobile Layout: Stacked */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleSideNav}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-500 transition-colors lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold">Daily Rota</h1>
              <button
                onClick={() => data.setExportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5 text-xs font-medium hover:bg-white/30"
                title="Export PDF"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-center">
              <ViewToggle currentView="day" currentDate={data.selectedDate} size="sm" variant="emerald" />
            </div>
            <DateNavigation selectedDate={data.selectedDate} onDateChange={data.setSelectedDate} isLoading={data.isLoading} />
          </div>
          {/* Desktop Layout: Single Row */}
          <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold">Daily Rota</h1>
                <p className="text-sm text-emerald-100">Day-of operations & attendance</p>
              </div>
              <ViewToggle currentView="day" currentDate={data.selectedDate} variant="emerald" />
            </div>
            <DateNavigation selectedDate={data.selectedDate} onDateChange={data.setSelectedDate} isLoading={data.isLoading} />
            <button
              onClick={() => data.setExportModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
              title="Export PDF"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <DailyFilterBar
          filters={data.filters}
          onFilterChange={data.handleFiltersChange}
          locations={data.locations || []}
          sublocations={data.sublocations || []}
          selectedLocationId={data.selectedLocationId}
          onLocationChange={data.setSelectedLocationId}
          selectedSublocationId={data.selectedSublocationId}
          onSublocationChange={data.setSelectedSublocationId}
          departments={data.departmentGroups.map((d) => d.name)}
          isLoading={data.isLoading}
          isLoadingLocations={data.isLoadingLocations}
          isLoadingSublocations={data.isLoadingSublocations}
          onRefresh={() => data.refetchRota()}
          onExpandAll={data.expandAll}
          onCollapseAll={data.collapseAll}
        />

        {/* Statistics Row */}
        <DailyStatsBar
          stats={data.stats}
          lastUpdatedText={data.lastUpdatedText}
          isRefreshing={data.isRefreshing}
          isLoadingRota={data.isLoadingRota}
          isAutoRefreshEnabled={data.isAutoRefreshEnabled}
          isPageVisible={data.isPageVisible}
          onRefresh={() => data.refetchRota()}
          onToggleAutoRefresh={data.setIsAutoRefreshEnabled}
          onShowBulkAssignModal={() => data.setShowBulkAssignModal(true)}
          onShowStaffOnLeaveModal={() => data.setShowStaffOnLeaveModal(true)}
          onPublishAll={data.handlePublishAll}
          isPublishing={data.isPublishing}
          refetchRota={() => data.refetchRota()}
        />

        {/* Department Sections (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {data.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading message="Loading shifts..." />
            </div>
          ) : data.filteredShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 px-4 text-center">
              <Calendar className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">No shifts for this date</p>
              <p className="text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'There are no shifts scheduled for this day'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {data.departmentGroups.map((dept) => (
                <DepartmentSection
                  key={dept.id}
                  department={{ id: dept.id, name: dept.name, type: dept.type }}
                  staffCount={dept.staffCount}
                  isExpanded={data.expandedDepartments.has(dept.id) || data.expandedDepartments.has('all')}
                  onToggle={() => data.toggleDepartment(dept.id)}
                >
                  {dept.shifts.map((shift) => (
                    <ShiftCard
                      key={shift['Shift ID']}
                      shift={shift}
                      onEdit={data.handleEditShift}
                      onAssignLeader={data.handleAssignLeader}
                      isAgency={dept.type === 'agency'}
                      isExternal={dept.type === 'other-locations'}
                      isUnpublished={shift['Shift Status'] !== 1001}
                      dateOfBirth={
                        shift['Staff Member ID']
                          ? data.staffDateOfBirthMap.get(shift['Staff Member ID'])
                          : null
                      }
                      currentDate={data.selectedDate}
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
        isOpen={data.flyoutOpen}
        onClose={data.handleCloseFlyout}
        shiftId={data.selectedShiftId}
        shiftData={data.selectedShiftData}
        locationId={data.selectedLocationId}
        sublocationId={data.selectedSublocationId}
        onSave={data.handleShiftSaved}
        onDelete={data.handleShiftDeleted}
      />

      {/* Shift Leader Modal */}
      <ShiftLeaderModal
        isOpen={data.leaderModalOpen}
        onClose={data.handleCloseLeaderModal}
        shift={data.leaderModalShift}
        onSave={data.handleLeaderSaved}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={data.exportModalOpen}
        onClose={() => data.setExportModalOpen(false)}
        selectedDate={data.selectedDate}
        sublocationName={
          data.sublocations?.find((s) => s.cp365_sublocationid === data.selectedSublocationId)
            ?.cp365_sublocationname || 'Unknown Location'
        }
        sublocationId={data.selectedSublocationId}
        rotaId={data.activeRota?.cp365_rotaid}
        shifts={data.filteredShifts}
        stats={data.stats}
      />

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={data.showBulkAssignModal}
        unassignedShifts={data.unassignedShiftsList}
        staff={data.rotaData?.staff || []}
        onClose={() => data.setShowBulkAssignModal(false)}
        onAssigned={() => {
          data.setShowBulkAssignModal(false);
          void data.refetchRota();
        }}
      />

      {/* Staff on Leave Modal */}
      <StaffOnLeaveModal
        isOpen={data.showStaffOnLeaveModal}
        onClose={() => data.setShowStaffOnLeaveModal(false)}
        selectedDate={data.selectedDate}
        staffOnLeaveList={data.staffOnLeaveList}
      />
    </div>
  );
}

export default DailyView;
