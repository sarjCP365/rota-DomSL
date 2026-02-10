/**
 * SwapHistoryReport Page
 *
 * Historical view of shift swap requests with filtering and export.
 * PROMPT 10 from CURSOR-SHIFT-SWAP-DESKTOP-PROMPTS.md
 */

import { useState, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  Calendar,
  Download,
  Filter,
  Search,
  RefreshCw,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  ArrowLeftRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SideNav, useSideNav } from '../../components/common/SideNav';
import PageHeader from '../../components/common/PageHeader';
import {
  getSwapHistory,
  getSwapSummary,
  getStaffSwapUsage,
  exportSwapHistory,
  type SwapHistoryQuery,
} from '../../api/swapReports';
import type { ShiftSwap, StaffSwapUsage } from '../../types/shiftSwap';
import {
  ShiftSwapStatus,
  getSwapStatusDisplayText,
  getSwapStatusColour,
  getSwapAssignments,
} from '../../types/shiftSwap';

// =============================================================================
// TYPES
// =============================================================================

type DateRangePreset = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type SortField = 'date' | 'initiator' | 'recipient' | 'status';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDateRangeFromPreset(preset: DateRangePreset): { from: Date; to: Date } {
  const today = new Date();

  switch (preset) {
    case 'thisWeek':
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case 'lastWeek': {
      const lastWeek = subWeeks(today, 1);
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    }
    case 'thisMonth':
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    }
    default:
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
  }
}

// =============================================================================
// STAFF USAGE BAR COMPONENT
// =============================================================================

function StaffUsageBar({ usage }: { usage: StaffSwapUsage }) {
  const percentage = Math.min((usage.swapsThisMonth / usage.monthlyLimit) * 100, 100);
  const barColor = usage.limitReached ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 truncate text-sm text-slate-700">{usage.staffName}</span>
      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-16 text-right text-sm text-slate-600">
        {usage.swapsThisMonth}/{usage.monthlyLimit}
      </span>
    </div>
  );
}

// =============================================================================
// SWAP ROW COMPONENT
// =============================================================================

function SwapHistoryRow({ swap }: { swap: ShiftSwap }) {
  const { giving, receiving } = getSwapAssignments(swap);

  let createdDate: string;
  try {
    createdDate = format(parseISO(swap.createdon), 'dd MMM yyyy');
  } catch {
    createdDate = swap.createdon;
  }

  const getStatusIcon = (status: ShiftSwapStatus) => {
    switch (status) {
      case ShiftSwapStatus.Approved:
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case ShiftSwapStatus.RejectedByRecipient:
      case ShiftSwapStatus.RejectedByManager:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ShiftSwapStatus.AwaitingRecipient:
      case ShiftSwapStatus.AwaitingManagerApproval:
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <XCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 text-sm text-slate-600">{createdDate}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-900">{swap.requestFromName || 'Unknown'}</div>
        {swap.requestFromJobTitle && (
          <div className="text-xs text-slate-500">{swap.requestFromJobTitle}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-900">{swap.requestToName || 'Unknown'}</div>
        {swap.requestToJobTitle && (
          <div className="text-xs text-slate-500">{swap.requestToJobTitle}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-700">
          {giving?.date ? format(parseISO(giving.date), 'EEE dd') : '-'}
          {' ↔ '}
          {receiving?.date ? format(parseISO(receiving.date), 'EEE dd') : '-'}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(swap.cp365_requeststatus)}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSwapStatusColour(
              swap.cp365_requeststatus
            )}`}
          >
            {getSwapStatusDisplayText(swap.cp365_requeststatus)}
          </span>
        </div>
        {swap.cp365_advancenoticebreached && (
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Urgent
          </div>
        )}
      </td>
    </tr>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SwapHistoryReport() {
  const { isOpen, close, toggle } = useSideNav();

  // Filter state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('thisMonth');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ShiftSwapStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Calculate date range
  const dateRange = useMemo(() => {
    if (dateRangePreset === 'custom' && customDateFrom && customDateTo) {
      return { from: parseISO(customDateFrom), to: parseISO(customDateTo) };
    }
    return getDateRangeFromPreset(dateRangePreset);
  }, [dateRangePreset, customDateFrom, customDateTo]);

  // Build query
  const query: SwapHistoryQuery = useMemo(
    () => ({
      dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
      dateTo: format(dateRange.to, 'yyyy-MM-dd'),
      status: statusFilter === 'all' ? undefined : [statusFilter],
    }),
    [dateRange, statusFilter]
  );

  // Fetch data
  const {
    data: swaps,
    isLoading: swapsLoading,
    error: swapsError,
    refetch,
  } = useQuery({
    queryKey: ['swapHistory', query],
    queryFn: () => getSwapHistory(query),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['swapSummary', query],
    queryFn: () => getSwapSummary(query),
  });

  const { data: staffUsage } = useQuery({
    queryKey: ['staffSwapUsage', dateRange.from],
    queryFn: () => getStaffSwapUsage(undefined, dateRange.from),
  });

  // Filter and sort swaps
  const filteredSwaps = useMemo(() => {
    if (!swaps) return [];

    let result = [...swaps];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (swap) =>
          swap.requestFromName?.toLowerCase().includes(q) ||
          swap.requestToName?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.createdon).getTime() - new Date(b.createdon).getTime();
          break;
        case 'initiator':
          comparison = (a.requestFromName || '').localeCompare(b.requestFromName || '');
          break;
        case 'recipient':
          comparison = (a.requestToName || '').localeCompare(b.requestToName || '');
          break;
        case 'status':
          comparison = a.cp365_requeststatus - b.cp365_requeststatus;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [swaps, searchQuery, sortField, sortDirection]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await exportSwapHistory(query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swap-history-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(
        dateRange.to,
        'yyyy-MM-dd'
      )}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const isLoading = swapsLoading || summaryLoading;

  return (
    <div className="flex h-screen bg-slate-100">
      <SideNav isOpen={isOpen} onClose={close} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Shift Swap History"
          subtitle="View and analyze historical swap requests"
          onMenuClick={toggle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRangePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as ShiftSwapStatus))
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value={ShiftSwapStatus.Approved}>Approved</option>
                <option value={ShiftSwapStatus.RejectedByRecipient}>Declined by Colleague</option>
                <option value={ShiftSwapStatus.RejectedByManager}>Rejected by Manager</option>
                <option value={ShiftSwapStatus.Cancelled}>Cancelled</option>
                <option value={ShiftSwapStatus.Expired}>Expired</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Export to Excel
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Summary</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
                  <p className="text-xs text-slate-500">Total Requests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{summary.approved}</p>
                  <p className="text-xs text-slate-500">Approved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {summary.rejectedByRecipient + summary.rejectedByManager}
                  </p>
                  <p className="text-xs text-slate-500">Rejected</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-600">{summary.cancelled}</p>
                  <p className="text-xs text-slate-500">Cancelled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-600">{summary.expired}</p>
                  <p className="text-xs text-slate-500">Expired</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{summary.avgProcessingHours}h</p>
                  <p className="text-xs text-slate-500">Avg Processing</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{summary.advanceNoticeBreaches}</p>
                  <p className="text-xs text-slate-500">Urgent Requests</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Swap History Table */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                  Swap History ({filteredSwaps.length})
                </h3>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              )}

              {swapsError && (
                <div className="p-4 text-center text-red-600">
                  Error loading swap history
                </div>
              )}

              {!isLoading && !swapsError && filteredSwaps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ArrowLeftRight className="mb-4 h-12 w-12 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900">No swap records</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    No swap requests found for the selected period.
                  </p>
                </div>
              )}

              {!isLoading && !swapsError && filteredSwaps.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            {sortField === 'date' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100"
                          onClick={() => handleSort('initiator')}
                        >
                          <div className="flex items-center gap-1">
                            Initiator
                            {sortField === 'initiator' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100"
                          onClick={() => handleSort('recipient')}
                        >
                          <div className="flex items-center gap-1">
                            Recipient
                            {sortField === 'recipient' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Shifts
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === 'status' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSwaps.map((swap) => (
                        <SwapHistoryRow key={swap.cp365_swaprequestid} swap={swap} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Staff Usage Chart */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                  Staff Usage This Month
                </h3>
              </div>

              <div className="p-4">
                {staffUsage && staffUsage.length > 0 ? (
                  <div className="space-y-3">
                    {staffUsage.slice(0, 10).map((usage) => (
                      <StaffUsageBar key={usage.staffMemberId} usage={usage} />
                    ))}
                    {staffUsage.length > 10 && (
                      <p className="text-center text-xs text-slate-500 mt-4">
                        +{staffUsage.length - 10} more staff members
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart3 className="mb-4 h-12 w-12 text-slate-300" />
                    <p className="text-sm text-slate-500">No swap usage data</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 text-center">
                    Shows swaps initiated per staff member vs. monthly limit (5)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
