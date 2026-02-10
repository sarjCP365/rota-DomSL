/**
 * SwapRequestCard Component
 *
 * Displays a single shift/visit swap request with:
 * - Staff members involved
 * - Assignments being swapped
 * - Status and urgency indicators
 * - Action buttons
 */

import { format, parseISO } from 'date-fns';
import { AlertTriangle, Check, X, Eye, ArrowLeftRight, User, Clock, MapPin, Calendar } from 'lucide-react';
import type { ShiftSwap, SwapAssignmentSummary } from '@/types/shiftSwap';
import { getSwapStatusColour, getSwapStatusDisplayText, isSwapUrgent } from '@/types/shiftSwap';

interface SwapRequestCardProps {
  /** The swap request to display */
  swap: ShiftSwap;
  /** Callback when approve button is clicked */
  onApprove?: (swapId: string) => void;
  /** Callback when reject button is clicked */
  onReject?: (swapId: string) => void;
  /** Callback when view details is clicked */
  onViewDetails?: (swapId: string) => void;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Compact mode for smaller display */
  compact?: boolean;
}

/**
 * Format a time range for display
 */
function formatTimeRange(startTime: string, endTime: string, durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const duration = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${startTime} - ${endTime} (${duration})`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE d MMM');
  } catch {
    return dateStr;
  }
}

/**
 * Assignment card component
 */
function AssignmentCard({
  assignment,
  label,
  isCompact: _isCompact,
}: {
  assignment?: SwapAssignmentSummary;
  label: string;
  isCompact: boolean;
}) {
  if (!assignment) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" role="region" aria-label={label}>
        <p className="text-sm text-slate-500">No assignment details</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3" role="region" aria-label={label}>
      <p className="mb-1 text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">
        <Calendar className="mr-1 inline h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Date: </span>
        {formatDate(assignment.date)}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        <Clock className="mr-1 inline h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Time: </span>
        {formatTimeRange(assignment.startTime, assignment.endTime, assignment.durationMinutes)}
      </p>
      {assignment.activityName && (
        <p className="mt-1 text-sm text-slate-500">
          <span className="sr-only">Activity: </span>
          {assignment.activityName}
        </p>
      )}
      {assignment.serviceUserName && (
        <p className="mt-1 text-xs text-slate-400">
          <User className="mr-1 inline h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Service user: </span>
          {assignment.serviceUserName}
        </p>
      )}
      {assignment.locationName && !assignment.serviceUserName && (
        <p className="mt-1 text-xs text-slate-400">
          <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Location: </span>
          {assignment.locationName}
        </p>
      )}
    </div>
  );
}

export function SwapRequestCard({
  swap,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false,
  showActions = true,
  compact = false,
}: SwapRequestCardProps) {
  const isUrgent = isSwapUrgent(swap);
  const statusColour = getSwapStatusColour(swap.cp365_requeststatus);
  const statusText = getSwapStatusDisplayText(swap.cp365_requeststatus);

  // Get the assignments being swapped
  const initiatorAssignment = swap.originalVisitDetails || swap.originalShiftDetails;
  const recipientAssignment = swap.requestedVisitDetails || swap.requestedShiftDetails;

  const cardId = `swap-card-${swap.cp365_swaprequestid}`;
  const urgentBannerId = `${cardId}-urgent`;
  const cardLabel = `Shift swap request from ${swap.requestFromName || 'Unknown'} to ${swap.requestToName || 'Unknown'}${isUrgent ? ', urgent' : ''}`;

  return (
    <article
      className={`rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        isUrgent ? 'border-amber-300' : 'border-slate-200'
      }`}
      aria-label={cardLabel}
      aria-describedby={isUrgent ? urgentBannerId : undefined}
    >
      {/* Urgent banner */}
      {isUrgent && (
        <div
          id={urgentBannerId}
          className="flex items-center gap-2 rounded-t-xl bg-amber-50 px-4 py-2 text-amber-700"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Urgent - Less than 7 days notice</span>
        </div>
      )}

      <div className="p-4">
        {/* Header with staff names */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3" role="group" aria-label="Staff members involved in swap">
            {/* Initiator */}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden="true">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{swap.requestFromName || 'Unknown'}</p>
                <p className="text-xs text-slate-500">{swap.requestFromJobTitle || 'Staff'}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="px-2" aria-hidden="true">
              <ArrowLeftRight className="h-5 w-5 text-slate-400" />
            </div>
            <span className="sr-only">swapping with</span>

            {/* Recipient */}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600" aria-hidden="true">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{swap.requestToName || 'Unknown'}</p>
                <p className="text-xs text-slate-500">{swap.requestToJobTitle || 'Staff'}</p>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColour}`} role="status">
            {statusText}
          </span>
        </div>

        {/* Assignment cards */}
        {!compact && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AssignmentCard
              assignment={initiatorAssignment}
              label={`${swap.requestFromName?.split(' ')[0] || 'Their'}'s ${swap.assignmentType}`}
              isCompact={compact}
            />
            <AssignmentCard
              assignment={recipientAssignment}
              label={`${swap.requestToName?.split(' ')[0] || 'Other'}'s ${swap.assignmentType}`}
              isCompact={compact}
            />
          </div>
        )}

        {/* Compact mode: inline assignments */}
        {compact && (
          <div className="mb-3 flex items-center gap-4 text-sm text-slate-600">
            <span>
              <Calendar className="mr-1 inline h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Initiator's date: </span>
              {initiatorAssignment ? formatDate(initiatorAssignment.date) : 'N/A'}
            </span>
            <ArrowLeftRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
            <span className="sr-only">swapping for</span>
            <span>
              <Calendar className="mr-1 inline h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Recipient's date: </span>
              {recipientAssignment ? formatDate(recipientAssignment.date) : 'N/A'}
            </span>
          </div>
        )}

        {/* Timeline info */}
        <div className="mb-4 text-xs text-slate-500">
          <p>
            Requested: {format(parseISO(swap.createdon), 'd MMM yyyy \'at\' HH:mm')}
          </p>
          {swap.cp365_recipientrespondeddate && (
            <p>
              Colleague accepted: {format(parseISO(swap.cp365_recipientrespondeddate), 'd MMM yyyy \'at\' HH:mm')}
            </p>
          )}
        </div>

        {/* Notes */}
        {swap.cp365_notesfrominitiator && (
          <div className="mb-4 rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium text-slate-500">
              Note from {swap.requestFromName?.split(' ')[0]}:
            </p>
            <p className="text-sm text-slate-700">{swap.cp365_notesfrominitiator}</p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4" role="group" aria-label="Swap request actions">
            {onReject && (
              <button
                onClick={() => onReject(swap.cp365_swaprequestid)}
                disabled={isLoading}
                aria-label={`Reject swap request from ${swap.requestFromName}`}
                aria-busy={isLoading}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => onApprove(swap.cp365_swaprequestid)}
                disabled={isLoading}
                aria-label={`Approve swap request from ${swap.requestFromName}`}
                aria-busy={isLoading}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Approve
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(swap.cp365_swaprequestid)}
                aria-label={`View details of swap request from ${swap.requestFromName}`}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                View Details
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default SwapRequestCard;
