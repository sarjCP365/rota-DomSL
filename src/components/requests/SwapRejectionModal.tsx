/**
 * SwapRejectionModal Component
 *
 * Modal for rejecting a shift/visit swap request.
 * Requires a reason for the rejection.
 */

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format, parseISO } from 'date-fns';
import { X, AlertCircle, Calendar, ArrowLeftRight } from 'lucide-react';
import type { ShiftSwap } from '@/types/shiftSwap';

interface SwapRejectionModalProps {
  /** The swap to reject */
  swap: ShiftSwap;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Reject handler with required reason */
  onReject: (reason: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

export function SwapRejectionModal({
  swap,
  isOpen,
  onClose,
  onReject,
  isLoading = false,
}: SwapRejectionModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const initiatorAssignment = swap.originalVisitDetails || swap.originalShiftDetails;
  const recipientAssignment = swap.requestedVisitDetails || swap.requestedShiftDetails;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for rejecting this swap request.');
      return;
    }
    
    setError('');
    onReject(reason.trim());
  };

  // Common rejection reasons for quick selection
  const quickReasons = [
    'Insufficient coverage on the affected date',
    'Skills mismatch for the assignment',
    'Monthly swap limit reached',
    'Operational requirements',
  ];

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
            <Dialog.Panel className="mx-auto max-w-md w-full rounded-xl bg-white shadow-xl">
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Reject Shift Swap
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
                <div className="px-6 py-4">
                  <p className="mb-4 text-sm text-slate-600">
                    Are you sure you want to reject this swap request?
                  </p>

                  {/* Swap summary */}
                  <div className="mb-4 rounded-lg bg-slate-50 p-4" role="region" aria-label="Swap request summary">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {swap.requestFromName}
                        </p>
                        {initiatorAssignment && (
                          <p className="text-sm text-slate-500">
                            <Calendar className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Date: </span>
                            {format(parseISO(initiatorAssignment.date), 'EEE d MMM')}
                          </p>
                        )}
                      </div>
                      <ArrowLeftRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span className="sr-only">swapping with</span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {swap.requestToName}
                        </p>
                        {recipientAssignment && (
                          <p className="text-sm text-slate-500">
                            <Calendar className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Date: </span>
                            {format(parseISO(recipientAssignment.date), 'EEE d MMM')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason input */}
                  <div>
                    <label htmlFor="rejection-reason" className="block text-sm font-medium text-slate-700">
                      Reason for rejection <span className="text-red-500" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <textarea
                      id="rejection-reason"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (error) setError('');
                      }}
                      rows={3}
                      placeholder="Please provide a reason..."
                      required
                      aria-required="true"
                      aria-invalid={!!error}
                      aria-describedby={error ? 'rejection-error' : 'rejection-hint'}
                      className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 ${
                        error
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                      }`}
                    />
                    <p id="rejection-hint" className="sr-only">
                      This reason will be shared with both staff members.
                    </p>
                    {error && (
                      <p id="rejection-error" className="mt-1 flex items-center gap-1 text-sm text-red-600" role="alert">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        {error}
                      </p>
                    )}
                  </div>

                  {/* Quick reasons */}
                  <div className="mt-3" role="group" aria-labelledby="quick-reasons-label">
                    <p id="quick-reasons-label" className="mb-2 text-xs font-medium text-slate-500">Quick select:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickReasons.map((quickReason) => (
                        <button
                          key={quickReason}
                          type="button"
                          onClick={() => setReason(quickReason)}
                          aria-pressed={reason === quickReason}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            reason === quickReason
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {quickReason}
                        </button>
                      ))}
                    </div>
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
                    aria-label={isLoading ? 'Rejecting swap request' : 'Confirm rejection of swap request'}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" aria-hidden="true" />
                        Confirm Rejection
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

export default SwapRejectionModal;
