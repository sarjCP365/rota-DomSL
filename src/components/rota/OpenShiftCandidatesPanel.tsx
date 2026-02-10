/**
 * OpenShiftCandidatesPanel Component
 *
 * Slide-over panel showing candidates for an open shift.
 * Shows notification status, responses, and allows manual assignment.
 *
 * PROMPT 9 from CURSOR-SHIFT-SWAP-DESKTOP-PROMPTS.md
 */

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  X,
  User,
  Clock,
  Bell,
  RefreshCw,
  Calendar,
  MapPin,
  Check,
  XCircle,
  AlertCircle,
  UserPlus,
  Send,
  Timer,
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface OpenShiftCandidate {
  staffMemberId: string;
  staffMemberName: string;
  jobTitle?: string;
  photo?: string;
  matchScore: number;
  responseStatus: 'pending' | 'accepted' | 'declined';
  responseTime?: string;
  declineReason?: string;
  notifiedAt: string;
}

export interface OpenShiftDetails {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  activityName?: string;
  locationName?: string;
  sublocationName?: string;
  notifiedAt: string;
  expiresAt?: string;
  candidates: OpenShiftCandidate[];
}

interface OpenShiftCandidatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shift: OpenShiftDetails | null;
  onResendNotifications?: () => void;
  onExtendExpiry?: (hours: number) => void;
  onManuallyAssign?: (staffMemberId: string) => void;
  isLoading?: boolean;
}

// =============================================================================
// CANDIDATE CARD COMPONENT
// =============================================================================

function CandidateCard({
  candidate,
  onAssign,
}: {
  candidate: OpenShiftCandidate;
  onAssign?: (staffMemberId: string) => void;
}) {
  const getStatusBadge = () => {
    switch (candidate.responseStatus) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Check className="h-3 w-3" /> Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50';
    if (score >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const notifiedAgo = formatDistanceToNow(parseISO(candidate.notifiedAt), { addSuffix: true });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {candidate.photo ? (
            <img
              src={candidate.photo}
              alt={candidate.staffMemberName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <User className="h-5 w-5 text-slate-600" />
            </div>
          )}
          <div>
            <p className="font-medium text-slate-900">{candidate.staffMemberName}</p>
            {candidate.jobTitle && (
              <p className="text-xs text-slate-500">{candidate.jobTitle}</p>
            )}
          </div>
        </div>

        <div
          className={`rounded-full px-2 py-1 text-sm font-semibold ${getMatchScoreColor(
            candidate.matchScore
          )}`}
        >
          {candidate.matchScore}%
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-xs text-slate-400">Notified {notifiedAgo}</span>
        </div>

        {candidate.responseStatus === 'pending' && onAssign && (
          <button
            onClick={() => onAssign(candidate.staffMemberId)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="h-3 w-3" /> Assign
          </button>
        )}
      </div>

      {candidate.responseStatus === 'declined' && candidate.declineReason && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          "{candidate.declineReason}"
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OpenShiftCandidatesPanel({
  isOpen,
  onClose,
  shift,
  onResendNotifications,
  onExtendExpiry,
  onManuallyAssign,
  isLoading = false,
}: OpenShiftCandidatesPanelProps) {
  const [extendHours, _setExtendHours] = useState(24);

  if (!shift) return null;

  // Parse shift date for display
  let shiftDateDisplay: string;
  try {
    shiftDateDisplay = format(parseISO(shift.date), 'EEEE, d MMMM yyyy');
  } catch {
    shiftDateDisplay = shift.date;
  }

  // Calculate time until expiry
  let expiryDisplay: string | null = null;
  if (shift.expiresAt) {
    try {
      expiryDisplay = formatDistanceToNow(parseISO(shift.expiresAt), { addSuffix: false });
    } catch {
      expiryDisplay = null;
    }
  }

  // Group candidates by status
  const acceptedCandidates = shift.candidates.filter((c) => c.responseStatus === 'accepted');
  const pendingCandidates = shift.candidates.filter((c) => c.responseStatus === 'pending');
  const declinedCandidates = shift.candidates.filter((c) => c.responseStatus === 'declined');

  const durationHours = Math.floor(shift.durationMinutes / 60);
  const durationMins = shift.durationMinutes % 60;
  const durationDisplay = durationMins > 0 ? `${durationHours}h ${durationMins}m` : `${durationHours}h`;

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
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Bell className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <Dialog.Title className="text-lg font-semibold text-slate-900">
                              Open Shift Candidates
                            </Dialog.Title>
                            <p className="text-sm text-slate-500">
                              {shift.candidates.length} staff notified
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={onClose}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Shift Details */}
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{shiftDateDisplay}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700">
                            {shift.startTime} - {shift.endTime} ({durationDisplay})
                          </span>
                        </div>
                        {shift.activityName && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-700">{shift.activityName}</span>
                          </div>
                        )}
                        {shift.locationName && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-700">
                              {shift.locationName}
                              {shift.sublocationName && ` - ${shift.sublocationName}`}
                            </span>
                          </div>
                        )}
                        {expiryDisplay && (
                          <div className="flex items-center gap-2 text-sm">
                            <Timer className="h-4 w-4 text-amber-500" />
                            <span className="text-amber-700 font-medium">
                              Expires in {expiryDisplay}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Accepted */}
                          {acceptedCandidates.length > 0 && (
                            <div>
                              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                <Check className="h-4 w-4" />
                                Accepted ({acceptedCandidates.length})
                              </h3>
                              <div className="space-y-2">
                                {acceptedCandidates.map((candidate) => (
                                  <CandidateCard
                                    key={candidate.staffMemberId}
                                    candidate={candidate}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pending */}
                          {pendingCandidates.length > 0 && (
                            <div>
                              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                                <Clock className="h-4 w-4" />
                                Pending Response ({pendingCandidates.length})
                              </h3>
                              <div className="space-y-2">
                                {pendingCandidates.map((candidate) => (
                                  <CandidateCard
                                    key={candidate.staffMemberId}
                                    candidate={candidate}
                                    onAssign={onManuallyAssign}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Declined */}
                          {declinedCandidates.length > 0 && (
                            <div>
                              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
                                <XCircle className="h-4 w-4" />
                                Declined ({declinedCandidates.length})
                              </h3>
                              <div className="space-y-2">
                                {declinedCandidates.map((candidate) => (
                                  <CandidateCard
                                    key={candidate.staffMemberId}
                                    candidate={candidate}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Empty state */}
                          {shift.candidates.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <Bell className="mb-4 h-12 w-12 text-slate-300" />
                              <h3 className="text-lg font-medium text-slate-900">No candidates yet</h3>
                              <p className="mt-1 text-sm text-slate-500">
                                No staff have been notified about this open shift.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div className="border-t border-slate-200 px-6 py-4">
                      <div className="flex flex-col gap-3">
                        {/* Quick actions */}
                        <div className="flex gap-2">
                          {onResendNotifications && (
                            <button
                              onClick={onResendNotifications}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Send className="h-4 w-4" />
                              Resend Offers
                            </button>
                          )}
                          {onExtendExpiry && (
                            <button
                              onClick={() => onExtendExpiry(extendHours)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Timer className="h-4 w-4" />
                              Extend Expiry
                            </button>
                          )}
                        </div>

                        {/* Manual assign button */}
                        {onManuallyAssign && (
                          <button
                            onClick={() => {
                              // This would typically open a staff picker modal
                              // For now, just show as available action
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                          >
                            <UserPlus className="h-4 w-4" />
                            Manually Assign Staff
                          </button>
                        )}
                      </div>
                    </div>
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

export default OpenShiftCandidatesPanel;
