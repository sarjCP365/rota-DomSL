/**
 * ServiceUserRotaGrid Component
 *
 * Main grid container for the service user rota view.
 * Displays service users with their scheduled visits across a week.
 */

import { useState, useCallback } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  Loader2,
} from 'lucide-react';
import type { Visit, DomiciliaryServiceUser } from '@/types/domiciliary';
import { useServiceUserRota } from '@/hooks/useServiceUserRota';
import { ServiceUserRow } from './ServiceUserRow';
import { VisitDetailFlyout } from './VisitDetailFlyout';
import { CreateVisitModal } from './CreateVisitModal';
import { AssignStaffModal } from './AssignStaffModal';

interface ServiceUserRotaGridProps {
  /** Optional location ID filter */
  locationId?: string;
  /** Initial date to display */
  initialDate?: Date;
  /** Callback when date range changes */
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
}

/**
 * ServiceUserRotaGrid component
 */
export function ServiceUserRotaGrid({
  locationId: _locationId,
  initialDate = new Date(),
  onDateRangeChange,
}: ServiceUserRotaGridProps) {
  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(initialDate, { weekStartsOn: 1 })
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createContext, setCreateContext] = useState<{
    serviceUserId: string;
    date: Date;
  } | null>(null);
  const [visitToAssign, setVisitToAssign] = useState<Visit | null>(null);

  // Fetch data using custom hook
  const {
    serviceUsersWithVisits,
    dates,
    isLoading,
    error,
    refetch,
    totalVisits,
    unassignedCount,
    coveragePercentage,
    totalScheduledHours,
  } = useServiceUserRota({
    startDate: currentWeekStart,
    days: 7,
    searchTerm: searchTerm || undefined,
  });

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    const newStart = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newStart);
    onDateRangeChange?.({
      start: newStart,
      end: addWeeks(newStart, 1),
    });
  }, [currentWeekStart, onDateRangeChange]);

  const goToNextWeek = useCallback(() => {
    const newStart = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newStart);
    onDateRangeChange?.({
      start: newStart,
      end: addWeeks(newStart, 1),
    });
  }, [currentWeekStart, onDateRangeChange]);

  const goToToday = useCallback(() => {
    const newStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    setCurrentWeekStart(newStart);
    onDateRangeChange?.({
      start: newStart,
      end: addWeeks(newStart, 1),
    });
  }, [onDateRangeChange]);

  // Event handlers
  const handleVisitClick = useCallback((visit: Visit) => {
    setSelectedVisit(visit);
  }, []);

  const handleCreateVisit = useCallback((serviceUserId: string, date: Date) => {
    setCreateContext({ serviceUserId, date });
    setShowCreateModal(true);
  }, []);

  const handleServiceUserClick = useCallback((serviceUser: DomiciliaryServiceUser) => {
    // TODO: Navigate to service user detail view
    console.log('Service user clicked:', serviceUser.cp365_fullname);
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading rota data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-red-600">
          <AlertTriangle className="w-8 h-8" />
          <p>Error loading rota data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="font-semibold text-gray-900">
              Week of {format(currentWeekStart, 'd MMMM yyyy')}
            </span>
          </div>

          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search service users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Add Visit */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Visit
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            <strong>{serviceUsersWithVisits.length}</strong> service users
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            <strong>{totalVisits}</strong> visits
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            <strong>{totalScheduledHours.toFixed(1)}</strong> hours
          </span>
        </div>

        {unassignedCount > 0 && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span>
              <strong>{unassignedCount}</strong> unassigned
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-gray-600">Coverage:</span>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                coveragePercentage >= 90
                  ? 'bg-green-500'
                  : coveragePercentage >= 70
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
          <span className="font-semibold">{coveragePercentage}%</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        {/* Service User column header */}
        <div className="w-56 min-w-56 flex-shrink-0 px-4 py-3 border-r border-gray-200 font-semibold text-gray-700">
          Service User
        </div>

        {/* Day column headers */}
        {dates.map((date) => {
          const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={format(date, 'yyyy-MM-dd')}
              className={`
                flex-1 min-w-24 px-2 py-3 text-center border-r border-gray-100 last:border-r-0
                ${isToday ? 'bg-blue-100' : isWeekend ? 'bg-gray-100' : ''}
              `}
            >
              <div className={`font-semibold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                {format(date, 'EEE')}
              </div>
              <div className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                {format(date, 'd MMM')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Service User Rows */}
      <div className="flex-1 overflow-auto">
        {serviceUsersWithVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchTerm ? 'No service users found' : 'No visits scheduled'}
            </p>
            <p className="text-sm mt-1">
              {searchTerm
                ? 'Try adjusting your search term'
                : 'Click "Add Visit" to schedule a visit'}
            </p>
          </div>
        ) : (
          serviceUsersWithVisits.map(({ serviceUser, visits }) => (
            <ServiceUserRow
              key={serviceUser.cp365_serviceuserid}
              serviceUser={serviceUser}
              visits={visits}
              dateRange={dates}
              onVisitClick={handleVisitClick}
              onCreateVisit={handleCreateVisit}
              onServiceUserClick={handleServiceUserClick}
            />
          ))
        )}
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
        <div className="text-gray-600">
          Showing {serviceUsersWithVisits.length} service users with {totalVisits} visits
        </div>

        {unassignedCount > 0 && (
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <AlertTriangle className="w-4 h-4" />
            {unassignedCount} visits need assignment
          </div>
        )}
      </div>

      {/* Visit Detail Flyout */}
      <VisitDetailFlyout
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onSave={(_visit) => {
          refetch();
          setSelectedVisit(null);
        }}
        onAssign={(visit) => {
          setVisitToAssign(visit);
          setSelectedVisit(null); // Close flyout when opening assign modal
        }}
      />

      {/* Assign Staff Modal */}
      {visitToAssign && visitToAssign.cp365_serviceuser && (
        <AssignStaffModal
          isOpen={!!visitToAssign}
          visit={visitToAssign}
          serviceUser={visitToAssign.cp365_serviceuser}
          onClose={() => setVisitToAssign(null)}
          onAssign={(_staffMemberId) => {
            refetch();
            setVisitToAssign(null);
          }}
        />
      )}

      {/* Create Visit Modal */}
      <CreateVisitModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateContext(null);
        }}
        onCreate={(_visits) => {
          refetch();
          setShowCreateModal(false);
          setCreateContext(null);
        }}
        defaultServiceUserId={createContext?.serviceUserId}
        defaultDate={createContext?.date}
      />
    </div>
  );
}

export default ServiceUserRotaGrid;
