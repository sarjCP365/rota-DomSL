/**
 * MarkOpenShiftModal Component
 *
 * Modal for marking a shift/visit as open and configuring notifications.
 * Shows preview of candidates who will be notified.
 */

import { useState, Fragment, useMemo } from 'react';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { format, parseISO, addHours } from 'date-fns';
import { X, Bell, Users, Clock, MapPin, Calendar, CheckCircle2, ChevronDown } from 'lucide-react';
import type { SwappableAssignment } from '@/types/assignment';
import type { OpenShiftConfig, CandidateSummary, NotificationScope } from '@/types/openShift';
import { useQuery } from '@tanstack/react-query';
import { findMatchingStaff } from '@/services/staffMatching';
import { getDummyData } from '@/data/dummyDataGenerator';
import { getOpenShiftConfiguration } from '@/services/configurationService';

interface MarkOpenShiftModalProps {
  /** The assignment to mark as open */
  assignment: SwappableAssignment;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm handler with configuration */
  onConfirm: (config: OpenShiftConfig) => void;
  /** Loading state */
  isLoading?: boolean;
}

const NOTIFICATION_SCOPES: { value: NotificationScope; label: string; description: string }[] = [
  { value: 'sublocation', label: 'This sublocation only', description: 'Notify staff assigned to this floor/unit only' },
  { value: 'location', label: 'This location', description: 'Notify all staff at this location' },
  { value: 'all', label: 'All locations', description: 'Notify all eligible staff across the organisation' },
];

const EXPIRY_OPTIONS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
];

const MATCH_SCORE_OPTIONS = [
  { value: 50, label: '50%' },
  { value: 60, label: '60%' },
  { value: 70, label: '70%' },
  { value: 80, label: '80%' },
];

export function MarkOpenShiftModal({
  assignment,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: MarkOpenShiftModalProps) {
  // Load default configuration
  const { data: defaultConfig } = useQuery({
    queryKey: ['openShiftConfig'],
    queryFn: () => getOpenShiftConfiguration(),
  });

  // Form state
  const [notificationScope, setNotificationScope] = useState<NotificationScope>(
    defaultConfig?.defaultNotificationScope || 'location'
  );
  const [minimumMatchScore, setMinimumMatchScore] = useState(
    defaultConfig?.minimumMatchScore || 70
  );
  const [expiresInHours, setExpiresInHours] = useState(
    defaultConfig?.defaultExpiryHours || 24
  );
  const [includeStaffOnLeave, setIncludeStaffOnLeave] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);

  // Fetch candidate preview
  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ['openShiftCandidates', assignment.id, notificationScope, minimumMatchScore],
    queryFn: async () => {
      const dummyData = await getDummyData();
      
      // For visits, get actual matching data
      if (assignment.type === 'visit' && assignment._sourceVisit) {
        const serviceUser = dummyData.serviceUsers.find(
          su => su.cp365_serviceuserid === assignment.serviceUserId
        );
        
        if (serviceUser) {
          const results = await findMatchingStaff(
            { visit: assignment._sourceVisit, serviceUser },
            { limit: 20, includeUnavailable: false }
          );
          
          return results.map(r => ({
            staffMemberId: r.staffMember.cp365_staffmemberid,
            staffName: r.staffMember.cp365_staffmembername,
            jobTitle: r.staffMember.cp365_jobtitle,
            matchScore: r.score,
            isAvailable: r.isAvailable,
            offerSent: r.score >= minimumMatchScore,
            warnings: r.warnings,
          } as CandidateSummary));
        }
      }
      
      // For shifts, return simplified matching
      return dummyData.staffMembers.slice(0, 10).map((s, i) => ({
        staffMemberId: s.cp365_staffmemberid,
        staffName: s.cp365_staffmembername,
        jobTitle: s.cp365_jobtitle,
        matchScore: 85 - i * 5,
        isAvailable: i < 6,
        offerSent: (85 - i * 5) >= minimumMatchScore,
        warnings: i >= 6 ? ['Not available at this time'] : [],
      } as CandidateSummary));
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  // Filter candidates by minimum score
  const eligibleCandidates = useMemo(() => {
    if (!candidatesData) return [];
    return candidatesData.filter(c => c.matchScore >= minimumMatchScore);
  }, [candidatesData, minimumMatchScore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      notificationScope,
      minimumMatchScore,
      expiresInHours,
      includeStaffOnLeave,
    });
  };

  const expiryDate = addHours(new Date(), expiresInHours);

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
                  <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Bell className="h-5 w-5 text-amber-500" />
                    Mark as Open Shift
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
                  {/* Assignment details */}
                  <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                      {assignment.type === 'shift' ? 'Shift' : 'Visit'} Details
                    </p>
                    <p className="font-medium text-slate-900">
                      <Calendar className="mr-1.5 inline h-4 w-4 text-slate-400" />
                      {format(parseISO(assignment.date), 'EEEE d MMMM yyyy')}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <Clock className="mr-1.5 inline h-4 w-4 text-slate-400" />
                      {assignment.startTime} - {assignment.endTime} ({Math.floor(assignment.durationMinutes / 60)}h)
                    </p>
                    {assignment.activityName && (
                      <p className="mt-1 text-sm text-slate-600">{assignment.activityName}</p>
                    )}
                    {assignment.serviceUserName && (
                      <p className="mt-1 text-sm text-slate-500">
                        Client: {assignment.serviceUserName}
                      </p>
                    )}
                    {assignment.locationName && (
                      <p className="mt-1 text-sm text-slate-500">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" />
                        {assignment.locationName}
                      </p>
                    )}
                  </div>

                  {/* Notification Settings */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notify staff from:
                    </label>
                    <RadioGroup value={notificationScope} onChange={setNotificationScope}>
                      <div className="space-y-2">
                        {NOTIFICATION_SCOPES.map((scope) => (
                          <RadioGroup.Option
                            key={scope.value}
                            value={scope.value}
                            className={({ checked }) =>
                              `relative flex cursor-pointer rounded-lg border p-3 transition-colors ${
                                checked
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`
                            }
                          >
                            {({ checked }) => (
                              <>
                                <div className="flex w-full items-center justify-between">
                                  <div>
                                    <RadioGroup.Label
                                      as="p"
                                      className={`font-medium ${checked ? 'text-emerald-900' : 'text-slate-900'}`}
                                    >
                                      {scope.label}
                                    </RadioGroup.Label>
                                    <RadioGroup.Description
                                      as="span"
                                      className={`text-xs ${checked ? 'text-emerald-700' : 'text-slate-500'}`}
                                    >
                                      {scope.description}
                                    </RadioGroup.Description>
                                  </div>
                                  <div
                                    className={`h-5 w-5 shrink-0 rounded-full border ${
                                      checked
                                        ? 'border-emerald-500 bg-emerald-500'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {checked && (
                                      <CheckCircle2 className="h-full w-full text-white" />
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </RadioGroup.Option>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Minimum match score */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Minimum match score:
                    </label>
                    <select
                      value={minimumMatchScore}
                      onChange={(e) => setMinimumMatchScore(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {MATCH_SCORE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expiry */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Offer expires in:
                    </label>
                    <select
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {EXPIRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Expires: {format(expiryDate, 'EEE d MMM \'at\' HH:mm')}
                    </p>
                  </div>

                  {/* Include staff on leave */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeStaffOnLeave}
                        onChange={(e) => setIncludeStaffOnLeave(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">Include staff on annual leave</span>
                    </label>
                  </div>

                  {/* Candidate preview */}
                  <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <button
                      type="button"
                      onClick={() => setShowCandidates(!showCandidates)}
                      className="flex w-full items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-900">
                          {candidatesLoading
                            ? 'Loading candidates...'
                            : `${eligibleCandidates.length} staff will be notified`}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 transition-transform ${
                          showCandidates ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {showCandidates && (
                      <div className="mt-3 max-h-48 overflow-y-auto">
                        {candidatesLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                          </div>
                        ) : eligibleCandidates.length === 0 ? (
                          <p className="py-2 text-sm text-slate-500">
                            No staff members meet the minimum match score.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {eligibleCandidates.map((candidate) => (
                              <div
                                key={candidate.staffMemberId}
                                className="flex items-center justify-between rounded-lg bg-white p-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {candidate.staffName}
                                  </p>
                                  <p className="text-xs text-slate-500">{candidate.jobTitle}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      candidate.matchScore >= 80
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : candidate.matchScore >= 60
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {candidate.matchScore}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                    disabled={isLoading || eligibleCandidates.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" />
                        Send Notifications
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

export default MarkOpenShiftModal;
