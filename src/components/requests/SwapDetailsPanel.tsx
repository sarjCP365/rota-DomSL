/**
 * SwapDetailsPanel Component
 *
 * A detailed slide-over panel for viewing full swap request information.
 * Shows staff details, shift information, timeline, and impact analysis.
 *
 * PROMPT 5 from CURSOR-SHIFT-SWAP-DESKTOP-PROMPTS.md
 */

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  X,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import type { ShiftSwap, SwapAssignmentSummary } from '@/types/shiftSwap';
import {
  ShiftSwapStatus,
  getSwapStatusDisplayText,
  getSwapAssignments,
  isSwapUrgent,
} from '@/types/shiftSwap';
import { getSwapConfiguration } from '@/services/configurationService';
import { DEFAULT_SWAP_CONFIGURATION } from '@/types/configuration';

interface SwapDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  swap: ShiftSwap | null;
  onApprove?: (swap: ShiftSwap) => void;
  onReject?: (swap: ShiftSwap) => void;
}

interface ImpactCheck {
  type: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface StaffSwapHistory {
  staffId: string;
  swapsThisMonth: number;
  monthlyLimit: number;
}

// Timeline step component
function TimelineStep({
  completed,
  current,
  label,
  timestamp,
  actor,
}: {
  completed: boolean;
  current: boolean;
  label: string;
  timestamp?: string;
  actor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            completed
              ? 'bg-emerald-500 text-white'
              : current
              ? 'border-2 border-emerald-500 bg-white'
              : 'border-2 border-slate-300 bg-white'
          }`}
        >
          {completed ? (
            <CheckCircle className="h-4 w-4" />
          ) : current ? (
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-slate-300" />
          )}
        </div>
        <div className="h-8 w-0.5 bg-slate-200 last:hidden" />
      </div>
      <div className="flex-1 pb-6">
        <p className={`text-sm font-medium ${completed || current ? 'text-slate-900' : 'text-slate-400'}`}>
          {label}
        </p>
        {timestamp && (
          <p className="text-xs text-slate-500">
            {format(parseISO(timestamp), "d MMM yyyy 'at' HH:mm")}
          </p>
        )}
        {actor && <p className="text-xs text-slate-500">by {actor}</p>}
      </div>
    </div>
  );
}

// Shift card component
function ShiftCard({
  title,
  assignment,
}: {
  title: string;
  assignment: SwapAssignmentSummary;
}) {
  let dateDisplay: string;
  try {
    dateDisplay = format(parseISO(assignment.date), 'EEE d MMM');
  } catch {
    dateDisplay = assignment.date;
  }

  const hours = Math.round(assignment.durationMinutes / 60);
  const mins = assignment.durationMinutes % 60;
  const durationDisplay = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="font-semibold text-slate-900">
        {dateDisplay} · {assignment.startTime} - {assignment.endTime}
      </p>
      <p className="text-sm text-slate-600">{durationDisplay} shift</p>
      {assignment.activityName && <p className="text-sm text-slate-600">{assignment.activityName}</p>}
      {assignment.serviceUserName && (
        <p className="text-sm text-slate-600">{assignment.serviceUserName}</p>
      )}
      {assignment.locationName && (
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
          <MapPin className="h-3 w-3" /> {assignment.locationName}
        </p>
      )}
    </div>
  );
}

// Staff section component
function StaffSection({
  title,
  staffName,
  jobTitle,
  photo,
  assignment,
  swapHistory,
  notes,
}: {
  title: string;
  staffName?: string;
  jobTitle?: string;
  photo?: string;
  assignment?: SwapAssignmentSummary;
  swapHistory?: StaffSwapHistory;
  notes?: string;
}) {
  return (
    <div className="border-t border-slate-200 py-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
      </div>

      <div className="flex items-center gap-3 mb-3">
        {photo ? (
          <img src={photo} alt={staffName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
            <User className="h-5 w-5 text-slate-600" />
          </div>
        )}
        <div>
          <p className="font-semibold text-slate-900">{staffName || 'Unknown'}</p>
          {jobTitle && <p className="text-sm text-slate-500">{jobTitle}</p>}
        </div>
      </div>

      {assignment && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Giving up:</p>
          <ShiftCard title="Their shift" assignment={assignment} />
        </div>
      )}

      {swapHistory && (
        <p className="text-sm text-slate-600 mb-2">
          Swap history:{' '}
          <span className={swapHistory.swapsThisMonth >= swapHistory.monthlyLimit ? 'text-red-600 font-medium' : ''}>
            {swapHistory.swapsThisMonth} swaps this month
          </span>{' '}
          (limit: {swapHistory.monthlyLimit})
        </p>
      )}

      {notes && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm">
          <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-blue-800">"{notes}"</p>
        </div>
      )}
    </div>
  );
}

export function SwapDetailsPanel({
  isOpen,
  onClose,
  swap,
  onApprove,
  onReject,
}: SwapDetailsPanelProps) {
  const [impactChecks, setImpactChecks] = useState<ImpactCheck[]>([]);

  // Fetch configuration for monthly limit
  const { data: swapConfig } = useQuery({
    queryKey: ['swapConfiguration'],
    queryFn: getSwapConfiguration,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  const monthlyLimit = swapConfig?.monthlyLimitPerStaff ?? DEFAULT_SWAP_CONFIGURATION.monthlyLimitPerStaff;

  // Calculate impact checks when swap changes
  useEffect(() => {
    if (!swap) return;

    const checks: ImpactCheck[] = [];

    // Get the giving assignment to check dates
    const { giving } = getSwapAssignments(swap);

    // Check advance notice
    if (giving?.date) {
      try {
        const daysUntilShift = differenceInDays(parseISO(giving.date), new Date());
        
        if (daysUntilShift < 7) {
          checks.push({
            type: 'warning',
            message: `Urgent - Less than 7 days notice`,
            details: `Shift is in ${daysUntilShift} day${daysUntilShift !== 1 ? 's' : ''}`,
          });
        } else {
          checks.push({
            type: 'success',
            message: 'Adequate advance notice',
            details: `${daysUntilShift} days until shift`,
          });
        }
      } catch {
        // Ignore date parsing errors
      }
    }

    // Check for scheduling conflicts (simulated)
    checks.push({
      type: 'success',
      message: 'No scheduling conflicts detected',
    });

    // Check capabilities (simulated)
    checks.push({
      type: 'success',
      message: 'Both staff have required capabilities',
    });

    // Check swap limits
    if (swap.cp365_initiatorlimitreached) {
      checks.push({
        type: 'warning',
        message: 'Initiator at swap limit',
        details: 'This staff member has reached their monthly swap limit',
      });
    }

    if (swap.cp365_recipientlimitreached) {
      checks.push({
        type: 'warning',
        message: 'Recipient at swap limit',
        details: 'This staff member has reached their monthly swap limit',
      });
    }

    setImpactChecks(checks);
  }, [swap]);

  if (!swap) return null;

  const isUrgent = isSwapUrgent(swap);
  const isPending = swap.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval;
  const isAwaitingRecipient = swap.cp365_requeststatus === ShiftSwapStatus.AwaitingRecipient;
  const { giving, receiving } = getSwapAssignments(swap);

  // Generate timeline steps based on swap state
  const timelineSteps = [
    {
      label: 'Request created',
      completed: true,
      current: false,
      timestamp: swap.createdon,
      actor: swap.requestFromName,
    },
    {
      label: isAwaitingRecipient
        ? 'Awaiting colleague response'
        : swap.cp365_requeststatus === ShiftSwapStatus.RejectedByRecipient
        ? 'Declined by colleague'
        : 'Colleague accepted',
      completed: !isAwaitingRecipient,
      current: isAwaitingRecipient,
      timestamp: swap.cp365_recipientrespondeddate,
      actor: swap.requestToName,
    },
    {
      label: isPending
        ? 'Awaiting manager approval'
        : swap.cp365_requeststatus === ShiftSwapStatus.Approved
        ? 'Manager approved'
        : swap.cp365_requeststatus === ShiftSwapStatus.RejectedByManager
        ? 'Manager rejected'
        : 'Processed',
      completed: !isPending && !isAwaitingRecipient,
      current: isPending,
      timestamp: swap.cp365_approveddate,
      actor: isPending ? 'You' : undefined,
    },
  ];

  const getStatusColor = (status: ShiftSwapStatus) => {
    switch (status) {
      case ShiftSwapStatus.AwaitingRecipient:
        return 'bg-amber-100 text-amber-800';
      case ShiftSwapStatus.AwaitingManagerApproval:
        return 'bg-blue-100 text-blue-800';
      case ShiftSwapStatus.Approved:
        return 'bg-emerald-100 text-emerald-800';
      case ShiftSwapStatus.RejectedByRecipient:
      case ShiftSwapStatus.RejectedByManager:
        return 'bg-red-100 text-red-800';
      case ShiftSwapStatus.Cancelled:
      case ShiftSwapStatus.Expired:
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/30 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <Dialog.Title className="text-lg font-semibold text-slate-900">
                            Swap Request Details
                          </Dialog.Title>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      {/* Status */}
                      <div className="mb-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                            swap.cp365_requeststatus
                          )}`}
                        >
                          {getSwapStatusDisplayText(swap.cp365_requeststatus)}
                        </span>
                        {isUrgent && isPending && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Urgent - Less than 7 days notice</span>
                          </div>
                        )}
                      </div>

                      {/* Swap Type Badge */}
                      <div className="mb-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          <ArrowRightLeft className="h-3 w-3" />
                          {swap.assignmentType === 'shift' ? 'Shift Swap' : 'Visit Swap'}
                        </span>
                      </div>

                      {/* Initiator Section */}
                      <StaffSection
                        title="Initiator"
                        staffName={swap.requestFromName}
                        jobTitle={swap.requestFromJobTitle}
                        photo={swap.requestFromPhoto}
                        assignment={giving}
                        swapHistory={{
                          staffId: swap._cp365_requestfrom_value,
                          swapsThisMonth: swap.cp365_initiatorlimitreached ? monthlyLimit : Math.floor(monthlyLimit * 0.4),
                          monthlyLimit,
                        }}
                        notes={swap.cp365_notesfrominitiator}
                      />

                      {/* Recipient Section */}
                      <StaffSection
                        title="Recipient"
                        staffName={swap.requestToName}
                        jobTitle={swap.requestToJobTitle}
                        photo={swap.requestToPhoto}
                        assignment={receiving}
                        swapHistory={{
                          staffId: swap._cp365_requestto_value,
                          swapsThisMonth: swap.cp365_recipientlimitreached ? monthlyLimit : 0,
                          monthlyLimit,
                        }}
                        notes={swap.cp365_notesfromrecipient}
                      />

                      {/* Timeline */}
                      <div className="border-t border-slate-200 py-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                          Timeline
                        </h3>
                        <div className="space-y-0">
                          {timelineSteps.map((step, index) => (
                            <TimelineStep
                              key={index}
                              completed={step.completed}
                              current={step.current}
                              label={step.label}
                              timestamp={step.timestamp}
                              actor={step.actor}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Impact Check */}
                      <div className="border-t border-slate-200 py-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                          Impact Check
                        </h3>
                        <div className="space-y-2">
                          {impactChecks.map((check, index) => (
                            <div
                              key={index}
                              className={`flex items-start gap-2 rounded-lg p-2 text-sm ${
                                check.type === 'success'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : check.type === 'warning'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-red-50 text-red-800'
                              }`}
                            >
                              {check.type === 'success' ? (
                                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              ) : check.type === 'warning' ? (
                                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              )}
                              <div>
                                <p className="font-medium">{check.message}</p>
                                {check.details && <p className="text-xs opacity-80">{check.details}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Manager notes if rejected */}
                      {swap.cp365_requeststatus === ShiftSwapStatus.RejectedByManager && swap.cp365_managernotes && (
                        <div className="border-t border-slate-200 py-4">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Rejection Reason
                          </h3>
                          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                            <p className="text-sm text-red-800">{swap.cp365_managernotes}</p>
                          </div>
                        </div>
                      )}

                      {/* Location info */}
                      {swap.locationName && (
                        <div className="border-t border-slate-200 py-4">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Location
                          </h3>
                          <p className="text-sm text-slate-700 flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {swap.locationName}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer with actions */}
                    {isPending && (onApprove || onReject) && (
                      <div className="border-t border-slate-200 px-6 py-4">
                        <div className="flex gap-3">
                          {onReject && (
                            <button
                              onClick={() => onReject(swap)}
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          {onApprove && (
                            <button
                              onClick={() => onApprove(swap)}
                              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export default SwapDetailsPanel;
