/**
 * RequestsView Page
 *
 * Displays pending shift swap requests for manager review.
 * Shows both shift swaps (residential) and visit swaps (domiciliary).
 */

import { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  ArrowLeftRight,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import PageHeader from '@/components/common/PageHeader';
import { usePendingSwaps, usePendingSwapCount } from '@/hooks/usePendingSwapCount';
import { SwapRequestCard } from '@/components/requests/SwapRequestCard';
import type { ShiftSwap } from '@/types/shiftSwap';
import { ShiftSwapStatus, isSwapUrgent } from '@/types/shiftSwap';
import { getShiftSwapRepository } from '@/repositories/shiftSwapRepository';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Lazy load modals and panels
const SwapApprovalModal = lazy(() => import('@/components/requests/SwapApprovalModal'));
const SwapRejectionModal = lazy(() => import('@/components/requests/SwapRejectionModal'));
const SwapDetailsPanel = lazy(() => import('@/components/requests/SwapDetailsPanel'));

type DateRangeFilter = 'all' | 'thisWeek' | 'nextWeek' | 'thisMonth';
type StatusFilter = 'all' | 'awaitingApproval' | 'urgent';

export default function RequestsView() {
  const { isOpen, close, toggle } = useSideNav();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('awaitingApproval');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal and panel state
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Auto-dismiss notification after 5 seconds
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Data fetching
  const { data: allSwaps, isLoading, error, refetch } = usePendingSwaps();
  const { totalCount, urgentCount, hasUrgent } = usePendingSwapCount();

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ swapId, notes }: { swapId: string; notes?: string }) => {
      const repository = getShiftSwapRepository();
      return repository.approve(swapId, notes);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pendingSwaps'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSwapsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['awaitingApprovalSwaps'] });
      setShowApprovalModal(false);
      setSelectedSwapId(null);
      
      if (result.success) {
        showNotification('success', 'Swap request approved successfully. Both staff members will be notified.');
      } else {
        showNotification('error', result.error || 'Failed to approve swap request.');
      }
    },
    onError: (err: Error) => {
      showNotification('error', err.message || 'An error occurred while approving the swap request.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ swapId, reason }: { swapId: string; reason: string }) => {
      const repository = getShiftSwapRepository();
      return repository.reject(swapId, reason);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pendingSwaps'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSwapsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['awaitingApprovalSwaps'] });
      setShowRejectionModal(false);
      setSelectedSwapId(null);
      
      if (result.success) {
        showNotification('success', 'Swap request rejected. Both staff members will be notified.');
      } else {
        showNotification('error', result.error || 'Failed to reject swap request.');
      }
    },
    onError: (err: Error) => {
      showNotification('error', err.message || 'An error occurred while rejecting the swap request.');
    },
  });

  // Filter swaps
  const filteredSwaps = useMemo(() => {
    if (!allSwaps) return [];

    let result = [...allSwaps];

    // Status filter
    if (statusFilter === 'awaitingApproval') {
      result = result.filter(s => s.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval);
    } else if (statusFilter === 'urgent') {
      result = result.filter(s => isSwapUrgent(s));
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const today = new Date();
      let rangeStart: Date;
      let rangeEnd: Date;

      if (dateRangeFilter === 'thisWeek') {
        rangeStart = startOfWeek(today, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(today, { weekStartsOn: 1 });
      } else if (dateRangeFilter === 'nextWeek') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        rangeStart = startOfWeek(nextWeek, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(nextWeek, { weekStartsOn: 1 });
      } else {
        rangeStart = startOfMonth(today);
        rangeEnd = endOfMonth(today);
      }

      result = result.filter(swap => {
        const assignment = swap.originalVisitDetails || swap.originalShiftDetails;
        if (!assignment) return true;
        try {
          const assignmentDate = parseISO(assignment.date);
          return isWithinInterval(assignmentDate, { start: rangeStart, end: rangeEnd });
        } catch {
          return true;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(swap =>
        swap.requestFromName?.toLowerCase().includes(query) ||
        swap.requestToName?.toLowerCase().includes(query)
      );
    }

    // Sort: urgent first, then by creation date
    result.sort((a, b) => {
      const aUrgent = isSwapUrgent(a);
      const bUrgent = isSwapUrgent(b);
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return new Date(a.createdon).getTime() - new Date(b.createdon).getTime();
    });

    return result;
  }, [allSwaps, statusFilter, dateRangeFilter, searchQuery]);

  // Handlers
  const handleApprove = (swapId: string) => {
    setSelectedSwapId(swapId);
    setShowApprovalModal(true);
  };

  const handleReject = (swapId: string) => {
    setSelectedSwapId(swapId);
    setShowRejectionModal(true);
  };

  const handleViewDetails = (swapId: string) => {
    setSelectedSwapId(swapId);
    setShowDetailsPanel(true);
  };

  // Handle approve/reject from details panel
  const handleApproveFromDetails = (_swap: ShiftSwap) => {
    setShowDetailsPanel(false);
    setShowApprovalModal(true);
  };

  const handleRejectFromDetails = (_swap: ShiftSwap) => {
    setShowDetailsPanel(false);
    setShowRejectionModal(true);
  };

  const selectedSwap = selectedSwapId
    ? allSwaps?.find(s => s.cp365_swaprequestid === selectedSwapId) || null
    : null;

  return (
    <div className="flex h-screen bg-slate-100">
      <SideNav isOpen={isOpen} onClose={close} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Swap Requests"
          subtitle="Review and manage shift swap requests"
          onMenuClick={toggle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Notification Banner */}
          {notification && (
            <div
              role="alert"
              aria-live="polite"
              className={`mb-4 flex items-center gap-3 rounded-lg p-4 ${
                notification.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className={`ml-auto rounded-lg p-1 transition-colors ${
                  notification.type === 'success'
                    ? 'hover:bg-emerald-100'
                    : 'hover:bg-red-100'
                }`}
                aria-label="Dismiss notification"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                  <p className="text-sm text-slate-500">Awaiting Approval</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  hasUrgent ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${hasUrgent ? 'text-amber-600' : 'text-slate-900'}`}>
                    {urgentCount}
                  </p>
                  <p className="text-sm text-slate-500">Urgent ({"<"} 7 days)</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {allSwaps?.filter(s => s.cp365_requeststatus === ShiftSwapStatus.AwaitingRecipient).length || 0}
                  </p>
                  <p className="text-sm text-slate-500">Awaiting Colleague</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Pending</option>
                <option value="awaitingApproval">Awaiting Approval</option>
                <option value="urgent">Urgent Only</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Dates</option>
                <option value="thisWeek">This Week</option>
                <option value="nextWeek">Next Week</option>
                <option value="thisMonth">This Month</option>
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

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="ml-auto flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Content */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
              <p className="font-medium">Error loading swap requests</p>
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          {!isLoading && !error && filteredSwaps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No pending requests</h3>
              <p className="mt-1 text-sm text-slate-500">
                {statusFilter === 'urgent'
                  ? 'No urgent swap requests at this time.'
                  : 'All swap requests have been processed.'}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredSwaps.length > 0 && (
            <div className="space-y-4">
              {filteredSwaps.map((swap) => (
                <SwapRequestCard
                  key={swap.cp365_swaprequestid}
                  swap={swap}
                  onApprove={swap.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval ? handleApprove : undefined}
                  onReject={swap.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval ? handleReject : undefined}
                  onViewDetails={handleViewDetails}
                  isLoading={approveMutation.isPending || rejectMutation.isPending}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals and Panels */}
      <Suspense fallback={null}>
        {/* Swap Details Panel */}
        {showDetailsPanel && selectedSwap && (
          <SwapDetailsPanel
            isOpen={showDetailsPanel}
            onClose={() => {
              setShowDetailsPanel(false);
              setSelectedSwapId(null);
            }}
            swap={selectedSwap}
            onApprove={selectedSwap.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval ? handleApproveFromDetails : undefined}
            onReject={selectedSwap.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval ? handleRejectFromDetails : undefined}
          />
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedSwap && (
          <SwapApprovalModal
            swap={selectedSwap}
            isOpen={showApprovalModal}
            onClose={() => {
              setShowApprovalModal(false);
              setSelectedSwapId(null);
            }}
            onApprove={(notes) => approveMutation.mutate({ swapId: selectedSwap.cp365_swaprequestid, notes })}
            isLoading={approveMutation.isPending}
          />
        )}

        {/* Rejection Modal */}
        {showRejectionModal && selectedSwap && (
          <SwapRejectionModal
            swap={selectedSwap}
            isOpen={showRejectionModal}
            onClose={() => {
              setShowRejectionModal(false);
              setSelectedSwapId(null);
            }}
            onReject={(reason) => rejectMutation.mutate({ swapId: selectedSwap.cp365_swaprequestid, reason })}
            isLoading={rejectMutation.isPending}
          />
        )}
      </Suspense>
    </div>
  );
}
