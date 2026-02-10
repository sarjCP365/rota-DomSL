/**
 * Staff Schedule Page
 *
 * View showing a staff member's daily schedule with visits and travel.
 * Allows selecting different staff members and navigating between dates.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Users,
  Search,
  Loader2,
} from 'lucide-react';
import { useSideNav, SideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/Header';
import { StaffDaySchedule } from '@/components/rota/domiciliary/StaffDaySchedule';
import { VisitDetailFlyout } from '@/components/rota/domiciliary';
import { getDummyData } from '@/data/dummyDataGenerator';
import type { Visit } from '@/types/domiciliary';

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StaffSchedule() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Fetch data
  const dataQuery = useQuery({
    queryKey: ['staffSchedule', 'data'],
    queryFn: () => getDummyData(),
    staleTime: 5 * 60 * 1000,
  });

  const { staffMembers = [], serviceUsers = [], visits = [], activities = [] } = dataQuery.data || {};

  // Filter staff by search
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return staffMembers;
    const search = staffSearch.toLowerCase();
    return staffMembers.filter(
      s =>
        s.cp365_staffmembername.toLowerCase().includes(search) ||
        s.cp365_jobtitle?.toLowerCase().includes(search)
    );
  }, [staffMembers, staffSearch]);

  // Selected staff member
  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return staffMembers[0] || null;
    return staffMembers.find(s => s.cp365_staffmemberid === selectedStaffId) || null;
  }, [staffMembers, selectedStaffId]);

  // Filter visits for selected staff and date
  const staffVisits = useMemo(() => {
    if (!selectedStaff) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return visits.filter(
      v => v.cp365_staffmemberid === selectedStaff.cp365_staffmemberid && v.cp365_visitdate === dateStr
    );
  }, [visits, selectedStaff, selectedDate]);

  // Service users map
  const serviceUsersMap = useMemo(
    () => new Map(serviceUsers.map(su => [su.cp365_serviceuserid, su])),
    [serviceUsers]
  );

  // Staff visit counts for the selected date
  const staffVisitCounts = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const counts = new Map<string, number>();
    visits
      .filter(v => v.cp365_visitdate === dateStr)
      .forEach(v => {
        if (v.cp365_staffmemberid) {
          counts.set(v.cp365_staffmemberid, (counts.get(v.cp365_staffmemberid) || 0) + 1);
        }
      });
    return counts;
  }, [visits, selectedDate]);

  // Week days for quick navigation
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Navigation handlers
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  if (dataQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-gray-500">Loading staff schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Staff Schedule"
          subtitle="Daily schedule view for carers"
          onMenuToggle={toggleSideNav}
          onRefresh={() => dataQuery.refetch()}
          variant="emerald"
        />

        <main className="flex-1 flex overflow-hidden">
          {/* Staff List Sidebar */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Staff List */}
            <div className="flex-1 overflow-y-auto">
              {filteredStaff.map(staff => {
                const visitCount = staffVisitCounts.get(staff.cp365_staffmemberid) || 0;
                const isSelected = selectedStaff?.cp365_staffmemberid === staff.cp365_staffmemberid;

                return (
                  <div
                    key={staff.cp365_staffmemberid}
                    onClick={() => setSelectedStaffId(staff.cp365_staffmemberid)}
                    className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-50 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                        isSelected ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    >
                      {getInitials(staff.cp365_staffmembername)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{staff.cp365_staffmembername}</p>
                      <p className="text-xs text-gray-500">{staff.cp365_jobtitle || 'Carer'}</p>
                    </div>
                    {visitCount > 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        {visitCount}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">0</span>
                    )}
                  </div>
                );
              })}

              {filteredStaff.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No staff found</p>
                </div>
              )}
            </div>

            {/* Staff Count */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Date Navigation */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                {/* Date selector */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">{format(selectedDate, 'EEEE d MMMM yyyy')}</span>
                    {isToday(selectedDate) && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                        Today
                      </span>
                    )}
                  </div>

                  <button
                    onClick={goToNextDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {!isToday(selectedDate) && (
                    <button
                      onClick={goToToday}
                      className="px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Week quick nav */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {weekDays.map(day => (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        isSameDay(day, selectedDate)
                          ? 'bg-white shadow text-gray-900 font-medium'
                          : isToday(day)
                            ? 'text-emerald-600 hover:bg-gray-200'
                            : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {format(day, 'EEE')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedStaff ? (
                <StaffDaySchedule
                  staffMember={selectedStaff}
                  date={selectedDate}
                  visits={staffVisits}
                  serviceUsers={serviceUsersMap}
                  activities={activities}
                  onVisitClick={setSelectedVisit}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a staff member</h3>
                  <p className="text-gray-500">
                    Choose a carer from the list to view their schedule
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Visit Detail Flyout */}
      <VisitDetailFlyout
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onSave={() => setSelectedVisit(null)}
        onAssign={() => {}}
      />
    </div>
  );
}

export default StaffSchedule;
