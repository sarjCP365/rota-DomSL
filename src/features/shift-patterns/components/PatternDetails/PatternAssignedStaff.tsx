/**
 * Pattern Assigned Staff Component
 * Shows all staff members assigned to a pattern for auditing and management
 */

import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import {
  Users,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  Filter,
} from 'lucide-react';
import { usePatternAssignments } from '../../hooks/usePatternAssignments';
import type { StaffPatternAssignment } from '../../types';
import { AssignmentStatus, AssignmentStatusLabels } from '../../types';

interface PatternAssignedStaffProps {
  patternTemplateId: string;
  patternName: string;
}

type FilterStatus = 'all' | 'active' | 'ended' | 'future';

export function PatternAssignedStaff({ patternTemplateId, patternName }: PatternAssignedStaffProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  // Fetch assignments (include ended ones for auditing)
  const { data: assignments = [], isLoading, isError } = usePatternAssignments(
    patternTemplateId,
    false // activeOnly = false to include all assignments
  );

  // Filter and categorize assignments
  const categorizedAssignments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return assignments.map(assignment => {
      const startDate = assignment.cp365_sp_startdate ? parseISO(assignment.cp365_sp_startdate) : null;
      const endDate = assignment.cp365_sp_enddate ? parseISO(assignment.cp365_sp_enddate) : null;

      let status: FilterStatus = 'active';
      if (endDate && isBefore(endDate, today)) {
        status = 'ended';
      } else if (startDate && isAfter(startDate, today)) {
        status = 'future';
      }

      return {
        ...assignment,
        calculatedStatus: status,
      };
    });
  }, [assignments]);

  // Apply filters
  const filteredAssignments = useMemo(() => {
    return categorizedAssignments.filter(assignment => {
      // Status filter
      if (filterStatus !== 'all' && assignment.calculatedStatus !== filterStatus) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const staffName = assignment.cp365_staffmember?.cp365_staffmembername?.toLowerCase() || '';
        const forename = assignment.cp365_staffmember?.cp365_forename?.toLowerCase() || '';
        const surname = assignment.cp365_staffmember?.cp365_surname?.toLowerCase() || '';
        
        return staffName.includes(search) || forename.includes(search) || surname.includes(search);
      }

      return true;
    });
  }, [categorizedAssignments, filterStatus, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const active = categorizedAssignments.filter(a => a.calculatedStatus === 'active').length;
    const ended = categorizedAssignments.filter(a => a.calculatedStatus === 'ended').length;
    const future = categorizedAssignments.filter(a => a.calculatedStatus === 'future').length;
    const total = categorizedAssignments.length;
    const uniqueStaff = new Set(categorizedAssignments.map(a => a._cp365_staffmember_value)).size;

    return { active, ended, future, total, uniqueStaff };
  }, [categorizedAssignments]);

  const getStatusBadge = (status: FilterStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            <XCircle className="h-3 w-3" />
            Ended
          </span>
        );
      case 'future':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            <Clock className="h-3 w-3" />
            Scheduled
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
        <span className="ml-3 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-red-700">Failed to load assignments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.uniqueStaff}</p>
              <p className="text-sm text-slate-500">Unique Staff</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              <p className="text-sm text-slate-500">Active</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.future}</p>
              <p className="text-sm text-slate-500">Scheduled</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2">
              <XCircle className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.ended}</p>
              <p className="text-sm text-slate-500">Ended</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Assignments ({stats.total})</option>
              <option value="active">Active ({stats.active})</option>
              <option value="future">Scheduled ({stats.future})</option>
              <option value="ended">Ended ({stats.ended})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {filteredAssignments.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'No assignments match your filters'
                : 'No staff members assigned to this pattern yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.cp365_staffpatternassignmentid}
                assignment={assignment}
                calculatedStatus={assignment.calculatedStatus}
                isExpanded={expandedAssignment === assignment.cp365_staffpatternassignmentid}
                onToggle={() => 
                  setExpandedAssignment(
                    expandedAssignment === assignment.cp365_staffpatternassignmentid 
                      ? null 
                      : assignment.cp365_staffpatternassignmentid
                  )
                }
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AssignmentRowProps {
  assignment: StaffPatternAssignment & { calculatedStatus: FilterStatus };
  calculatedStatus: FilterStatus;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusBadge: (status: FilterStatus) => React.ReactNode;
}

function AssignmentRow({ assignment, calculatedStatus, isExpanded, onToggle, getStatusBadge }: AssignmentRowProps) {
  const staffName = assignment.cp365_staffmember?.cp365_staffmembername || 
    `${assignment.cp365_staffmember?.cp365_forename || ''} ${assignment.cp365_staffmember?.cp365_surname || ''}`.trim() ||
    'Unknown Staff';

  const startDate = assignment.cp365_sp_startdate 
    ? format(parseISO(assignment.cp365_sp_startdate), 'dd MMM yyyy')
    : 'No start date';
  
  const endDate = assignment.cp365_sp_enddate
    ? format(parseISO(assignment.cp365_sp_enddate), 'dd MMM yyyy')
    : 'Ongoing';

  const lastGenerated = assignment.cp365_sp_lastgenerateddate
    ? format(parseISO(assignment.cp365_sp_lastgenerateddate), 'dd MMM yyyy')
    : 'Never';

  return (
    <div className="bg-white">
      {/* Main Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Staff Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">{staffName}</span>
            {getStatusBadge(calculatedStatus)}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {startDate} → {endDate}
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Week {assignment.cp365_sp_rotationstartweek || 1} start
            </span>
          </div>
        </div>

        {/* Priority Badge */}
        {assignment.cp365_sp_priority && (
          <div className="hidden sm:block">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Priority {assignment.cp365_sp_priority}
            </span>
          </div>
        )}

        {/* Expand/Collapse */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <span className="block text-slate-500">Assignment ID</span>
              <span className="font-mono text-xs text-slate-700">
                {assignment.cp365_staffpatternassignmentid.slice(0, 8)}...
              </span>
            </div>
            <div>
              <span className="block text-slate-500">Rotation Start Week</span>
              <span className="text-slate-700">Week {assignment.cp365_sp_rotationstartweek || 1}</span>
            </div>
            <div>
              <span className="block text-slate-500">Last Generated</span>
              <span className="text-slate-700">{lastGenerated}</span>
            </div>
            <div>
              <span className="block text-slate-500">Assignment Status</span>
              <span className="text-slate-700">
                {AssignmentStatusLabels[assignment.cp365_sp_assignmentstatus] || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Staff Member ID for auditing */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-400">
              Staff Member ID: {assignment._cp365_staffmember_value}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

