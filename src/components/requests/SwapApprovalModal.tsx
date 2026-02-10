/**
 * SwapApprovalModal Component
 *
 * Modal for approving a shift/visit swap request.
 * Shows what will change and allows optional notes.
 */

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format, parseISO } from 'date-fns';
import { X, AlertTriangle, Check, ArrowRight, Calendar, Clock, User, MapPin } from 'lucide-react';
import type { ShiftSwap, SwapAssignmentSummary } from '@/types/shiftSwap';
import { isSwapUrgent } from '@/types/shiftSwap';

interface SwapApprovalModalProps {
  /** The swap to approve */
  swap: ShiftSwap;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Approve handler with optional notes */
  onApprove: (notes?: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Assignment summary component
 */
function AssignmentSummary({
  assignment,
  staffName,
  title,
}: {
  assignment?: SwapAssignmentSummary;
  staffName?: string;
  title: string;
}) {
  if (!assignment) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" role="region" aria-label={title}>
        <p className="text-sm text-slate-500">No assignment details available</p>
      </div>
    );
  }

  const hours = Math.floor(assignment.durationMinutes / 60);
  const mins = assignment.durationMinutes % 60;
  const duration = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" role="region" aria-label={title}>
      <p className="mb-2 text-xs font-medium uppercase text-slate-500">{title}</p>
      <p className="font-medium text-slate-900">
        {staffName || 'Staff member'} will work:
      </p>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>
          <Calendar className="mr-1.5 inline h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Date: </span>
          {format(parseISO(assignment.date), 'EEEE d MMMM yyyy')}
        </p>
        <p>
          <Clock className="mr-1.5 inline h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Time: </span>
          {assignment.startTime} - {assignment.endTime} ({duration})
        </p>
        {assignment.activityName && (
          <p className="text-slate-500">
            <span className="sr-only">Activity: </span>
            {assignment.activityName}
          </p>
        )}
        {assignment.serviceUserName && (
          <p>
            <User className="mr-1.5 inline h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Service user: </span>
            {assignment.serviceUserName}
          </p>
        )}
        {assignment.locationName && !assignment.serviceUserName && (
          <p>
            <MapPin className="mr-1.5 inline h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Location: </span>
            {assignment.locationName}
          </p>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Previously: {assignment.staffMemberName ? `${assignment.staffMemberName}'s ${assignment.type}` : 'Unassigned'}
      </p>
    </div>
  );
}

export function SwapApprovalModal({
  swap,
  isOpen,
  onClose,
  onApprove,
  isLoading = false,
}: SwapApprovalModalProps) {
  const [notes, setNotes] = useState('');
  const isUrgent = isSwapUrgent(swap);

  const initiatorAssignment = swap.originalVisitDetails || swap.originalShiftDetails;
  const recipientAssignment = swap.requestedVisitDetails || swap.requestedShiftDetails;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApprove(notes.trim() || undefined);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-lg w-full rounded-xl bg-white shadow-xl">
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Approve Shift Swap
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
                  <p className="mb-4 text-sm text-slate-600">
                    This will swap the following assignments:
                  </p>

                  {/* What changes */}
                  <div className="space-y-4">
                    <AssignmentSummary
                      assignment={recipientAssignment}
                      staffName={swap.requestFromName}
                      title={`${swap.requestFromName?.split(' ')[0] || 'Initiator'} will work`}
                    />

                    <div className="flex justify-center">
                      <ArrowRight className="h-5 w-5 text-slate-300 rotate-90" />
                    </div>

                    <AssignmentSummary
                      assignment={initiatorAssignment}
                      staffName={swap.requestToName}
                      title={`${swap.requestToName?.split(' ')[0] || 'Recipient'} will work`}
                    />
                  </div>

                  {/* Urgent warning */}
                  {isUrgent && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 p-3" role="alert" aria-live="polite">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-amber-800">
                          This swap is within 7 days of the shift dates.
                        </p>
                        <p className="mt-1 text-sm text-amber-700">
                          Ensure adequate coverage and notify relevant staff.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notes from staff */}
                  {swap.cp365_notesfrominitiator && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Note from {swap.requestFromName?.split(' ')[0]}:
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{swap.cp365_notesfrominitiator}</p>
                    </div>
                  )}

                  {/* Manager notes */}
                  <div className="mt-4">
                    <label htmlFor="approval-notes" className="block text-sm font-medium text-slate-700">
                      Notes (optional)
                    </label>
                    <textarea
                      id="approval-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any notes for the staff members..."
                      aria-describedby="approval-notes-hint"
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <p id="approval-notes-hint" className="sr-only">
                      These notes will be visible to both staff members involved in the swap.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    aria-label={isLoading ? 'Approving swap request' : 'Confirm approval of swap request'}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Confirm Approval
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default SwapApprovalModal;
