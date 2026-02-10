/**
 * ServiceUserList Component
 * Table view of service users with management actions
 */

import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

interface ServiceUserListProps {
  onSelectUser?: (userId: string) => void;
  onCreateUser?: () => void;
}

export function ServiceUserList({
  onSelectUser: _onSelectUser,
  onCreateUser,
}: ServiceUserListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // TODO: Implement data fetching

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Search and Add */}
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search service users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border-grey py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {onCreateUser && (
          <button
            onClick={onCreateUser}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Add Service User
          </button>
        )}
      </div>

      {/* Service Users Table */}
      <div className="overflow-hidden rounded-lg border border-border-grey">
        <table className="w-full">
          <thead className="bg-elevation-1">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-grey">
            {/* TODO: Map over service user data */}
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                No service users loaded
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
