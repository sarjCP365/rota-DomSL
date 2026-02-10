/**
 * StaffAvailability Page
 *
 * Page for viewing and managing staff availability patterns.
 * Shows a list of staff and allows viewing/editing their weekly availability.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useSideNav, SideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/Header';
import { AvailabilityGrid } from '@/components/staff/availability';
import { getDummyData } from '@/data/dummyDataGenerator';
import type { StaffMember } from '@/api/dataverse/types';

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * StaffAvailability page component
 */
export function StaffAvailability() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch staff members
  const staffQuery = useQuery({
    queryKey: ['domiciliary', 'staffMembers'],
    queryFn: async () => {
      const data = await getDummyData();
      return data.staffMembers;
    },
  });

  // Filter staff based on search
  const filteredStaff = useMemo(() => {
    if (!staffQuery.data) return [];
    if (!searchTerm) return staffQuery.data;

    const term = searchTerm.toLowerCase();
    return staffQuery.data.filter(
      staff =>
        staff.cp365_staffmembername.toLowerCase().includes(term) ||
        staff.cp365_jobtitle?.toLowerCase().includes(term)
    );
  }, [staffQuery.data, searchTerm]);

  return (
    <div className="flex h-screen bg-slate-100">
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Staff Availability"
          subtitle="Manage staff weekly availability patterns"
          onMenuToggle={toggleSideNav}
          onRefresh={() => staffQuery.refetch()}
          variant="blue"
        />

        <main className="flex-1 overflow-hidden p-4">
          <div className="flex gap-4 h-full">
            {/* Staff List Panel */}
            <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Staff List */}
              <div className="flex-1 overflow-y-auto">
                {staffQuery.isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : staffQuery.error ? (
                  <div className="flex flex-col items-center justify-center h-32 text-red-600">
                    <AlertTriangle className="w-6 h-6 mb-2" />
                    <p className="text-sm">Error loading staff</p>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <Users className="w-6 h-6 mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchTerm ? 'No staff found' : 'No staff members'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredStaff.map((staff) => (
                      <button
                        key={staff.cp365_staffmemberid}
                        onClick={() => setSelectedStaff(staff)}
                        className={`
                          w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors
                          ${selectedStaff?.cp365_staffmemberid === staff.cp365_staffmemberid ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                        `}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {getInitials(staff.cp365_staffmembername)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {staff.cp365_staffmembername}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {staff.cp365_jobtitle || 'Staff Member'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
                {filteredStaff.length} staff members
              </div>
            </div>

            {/* Availability Grid Panel */}
            <div className="flex-1 min-w-0">
              {selectedStaff ? (
                <AvailabilityGrid
                  staffMember={selectedStaff}
                  onSave={() => {
                    // Refresh data after save
                    staffQuery.refetch();
                  }}
                  onCancel={() => setSelectedStaff(null)}
                />
              ) : (
                <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a staff member</p>
                    <p className="text-sm mt-1">
                      Choose a staff member from the list to view and edit their availability
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default StaffAvailability;
