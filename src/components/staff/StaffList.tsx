/**
 * StaffList Component
 * Table view of all staff members with search and filtering
 */

import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface StaffListProps {
  onSelectStaff?: (staffId: string) => void;
}

export function StaffList({ onSelectStaff: _onSelectStaff }: StaffListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [includeLeavers, setIncludeLeavers] = useState(false);

  // TODO: Implement data fetching with useStaff hook

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or staff number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border-grey py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeLeavers}
            onChange={(e) => setIncludeLeavers(e.target.checked)}
            className="h-4 w-4 rounded border-border-grey text-primary focus:ring-primary"
          />
          Include Leavers
        </label>

        <button className="flex items-center gap-2 rounded-lg border border-border-grey px-4 py-2 hover:bg-elevation-1">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-lg border border-border-grey">
        <table className="w-full">
          <thead className="bg-elevation-1">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Staff ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Department</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Manager</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-grey">
            {/* TODO: Map over staff data */}
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No staff members loaded
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
