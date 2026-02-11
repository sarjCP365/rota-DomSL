/**
 * VisitDetailFlyout Component
 *
 * Flyout panel for viewing and editing visit details.
 * Slides in from the right when a visit is selected.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  X,
  Edit2,
  Save,
  Phone,
  MapPin,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  Circle,
  Key,
  FileText,
  History,
  Ban,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Visit } from '@/types/domiciliary';
import {
  VisitStatus,
  getVisitStatusDisplayName,
  getVisitTypeDisplayName,
  getActivityCategoryDisplayName,
} from '@/types/domiciliary';
import { visitRepository } from '@/repositories/visitRepository';
import { visitActivityRepository } from '@/repositories/visitActivityRepository';
import { getStaffMatchScore } from '@/services/staffMatching';
import { StaffSuitabilityBadge } from './StaffSuitabilityBadge';

interface VisitDetailFlyoutProps {
  /** The visit to display (null when closed) */
  visit: Visit | null;
  /** Whether the flyout is open */
  isOpen: boolean;
  /** Callback to close the flyout */
  onClose: () => void;
  /** Callback after successful save */
  onSave?: (visit: Visit) => void;
  /** Callback to open assignment modal */
  onAssign?: (visit: Visit) => void;
}

/**
 * Get status badge styling
 */
function getStatusBadge(status: VisitStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case VisitStatus.Scheduled:
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
    case VisitStatus.Assigned:
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
    case VisitStatus.InProgress:
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' };
    case VisitStatus.Completed:
      return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
    case VisitStatus.Cancelled:
      return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
    case VisitStatus.Missed:
      return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
    case VisitStatus.Late:
      return { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
  }
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * VisitDetailFlyout component
 */
export function VisitDetailFlyout({
  visit,
  isOpen,
  onClose,
  onSave,
  onAssign,
}: VisitDetailFlyoutProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch activities for this visit
  const activitiesQuery = useQuery({
    queryKey: ['visitActivities', visit?.cp365_visitid],
    queryFn: () => visitActivityRepository.getByVisit(visit!.cp365_visitid),
    enabled: !!visit?.cp365_visitid,
  });

  // Fetch staff match score for the assigned carer
  const staffMatchQuery = useQuery({
    queryKey: ['staffMatch', visit?.cp365_visitid, visit?.cp365_staffmemberid],
    queryFn: async () => {
      if (!visit?.cp365_staffmemberid || !visit?.cp365_serviceuser) return null;
      return getStaffMatchScore(visit.cp365_staffmemberid, visit, visit.cp365_serviceuser);
    },
    enabled: !!visit?.cp365_staffmemberid && !!visit?.cp365_serviceuser,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Visit>) =>
      visitRepository.update(visit!.cp365_visitid, data),
    onSuccess: (updatedVisit) => {
      void queryClient.invalidateQueries({ queryKey: ['domiciliary', 'visits'] });
      onSave?.(updatedVisit);
      setIsEditing(false);
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      visitRepository.cancelVisit(visit!.cp365_visitid, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['domiciliary', 'visits'] });
      setShowCancelConfirm(false);
      onClose();
    },
  });

  // Toggle activity completion
  const toggleActivityMutation = useMutation({
    mutationFn: async ({ activityId, completed }: { activityId: string; completed: boolean }) => {
      if (completed) {
        return visitActivityRepository.markComplete(activityId);
      } else {
        return visitActivityRepository.update(activityId, { cp365_iscompleted: false });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitActivities', visit?.cp365_visitid] });
    },
  });

  // Reset state when visit changes (derived state from props, not via effect)
  const prevVisitIdRef = useRef<string | undefined>();
  const visitId = visit?.cp365_visitid;
  if (visitId !== prevVisitIdRef.current) {
    prevVisitIdRef.current = visitId;
    if (visit) {
      setEditedNotes(visit.cp365_visitnotes || '');
      setIsEditing(false);
      setShowCancelConfirm(false);
      setCancelReason('');
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!visit) return;
    updateMutation.mutate({ cp365_visitnotes: editedNotes });
  }, [visit, editedNotes, updateMutation]);

  // Handle cancel visit
  const handleCancelVisit = useCallback(() => {
    if (!cancelReason.trim()) return;
    cancelMutation.mutate(cancelReason);
  }, [cancelReason, cancelMutation]);

  if (!isOpen || !visit) return null;

  const serviceUser = visit.cp365_serviceuser;
  const staffMember = visit.cp365_staffmember;
  const activities = activitiesQuery.data || [];
  const completedActivities = activities.filter(a => a.cp365_iscompleted).length;
  const statusBadge = getStatusBadge(visit.cp365_visitstatus);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[1000] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Flyout Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-[1001] flex flex-col transform transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flyout-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 id="flyout-title" className="text-lg font-semibold text-gray-900">
              {getVisitTypeDisplayName(visit.cp365_visittypecode)} Visit
            </h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
              {getVisitStatusDisplayName(visit.cp365_visitstatus)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Edit visit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                aria-label="Save changes"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Service User Section */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Service User
            </h3>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {serviceUser?.cp365_photo ? (
                  <img
                    src={serviceUser.cp365_photo}
                    alt={serviceUser.cp365_fullname}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(serviceUser?.cp365_fullname || 'SU')
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">
                  {serviceUser?.cp365_fullname || 'Unknown'}
                </h4>
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{serviceUser?.cp365_currentaddress || 'No address'}</span>
                </div>
                {serviceUser?.cp365_phonenumber && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${serviceUser.cp365_phonenumber}`} className="hover:text-teal-600">
                      {serviceUser.cp365_phonenumber}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visit Details Section */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Visit Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">
                  {format(new Date(visit.cp365_visitdate), 'EEEE d MMMM yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">
                  {visit.cp365_scheduledstarttime} - {visit.cp365_scheduledendtime}
                  <span className="text-gray-500 ml-2">({visit.cp365_durationminutes} mins)</span>
                </span>
              </div>
              {visit.cp365_actualstarttime && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-4" />
                  <span className="text-green-600">
                    Actual: {visit.cp365_actualstarttime}
                    {visit.cp365_actualendtime && ` - ${visit.cp365_actualendtime}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Carer Section */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Assigned Carer
            </h3>
            {staffMember ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {getInitials(staffMember.cp365_staffmembername)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {staffMember.cp365_staffmembername}
                    </h4>
                    {staffMember.cp365_jobtitle && (
                      <p className="text-sm text-gray-600">{staffMember.cp365_jobtitle}</p>
                    )}
                    {staffMember.cp365_personalmobile && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        <a href={`tel:${staffMember.cp365_personalmobile}`} className="hover:text-blue-600">
                          {staffMember.cp365_personalmobile}
                        </a>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onAssign?.(visit)}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Change
                  </button>
                </div>

                {/* Staff Suitability Score */}
                {staffMatchQuery.data && (
                  <StaffSuitabilityBadge matchResult={staffMatchQuery.data} variant="detailed" />
                )}
                {staffMatchQuery.isLoading && (
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">Calculating suitability...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 border-dashed rounded-lg text-center">
                <User className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-700 font-medium">Unassigned</p>
                <p className="text-sm text-red-600 mt-1">This visit needs a carer</p>
                <button
                  onClick={() => onAssign?.(visit)}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Assign Carer
                </button>
              </div>
            )}
          </div>

          {/* Activities Section */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Care Activities ({completedActivities}/{activities.length})
              </h3>
              {activities.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(completedActivities / activities.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round((completedActivities / activities.length) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {activitiesQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No activities scheduled</p>
            ) : (
              <div className="space-y-2">
                {activities.map(activity => (
                  <div
                    key={activity.cp365_visitactivityid}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      activity.cp365_iscompleted ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <button
                      onClick={() =>
                        toggleActivityMutation.mutate({
                          activityId: activity.cp365_visitactivityid,
                          completed: !activity.cp365_iscompleted,
                        })
                      }
                      disabled={toggleActivityMutation.isPending}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {activity.cp365_iscompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-green-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${activity.cp365_iscompleted ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                        {activity.cp365_activityname}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getActivityCategoryDisplayName(activity.cp365_activitycategorycode)}
                        {activity.cp365_isrequired && (
                          <span className="ml-2 text-red-500">• Required</span>
                        )}
                      </p>
                      {activity.cp365_iscompleted && activity.cp365_completedtime && (
                        <p className="text-xs text-green-600 mt-1">
                          Completed at {format(new Date(activity.cp365_completedtime), 'HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Access Notes Section */}
          {(serviceUser?.cp365_keysafelocation || serviceUser?.cp365_accessnotes) && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Access Information
              </h3>
              {serviceUser?.cp365_keysafelocation && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg mb-2">
                  <Key className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Key Safe</p>
                    <p className="text-sm text-amber-700">{serviceUser.cp365_keysafelocation}</p>
                  </div>
                </div>
              )}
              {serviceUser?.cp365_accessnotes && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Access Notes</p>
                    <p className="text-sm text-blue-700">{serviceUser.cp365_accessnotes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visit Notes Section */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Visit Notes
            </h3>
            {isEditing ? (
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add notes about this visit..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                rows={4}
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg min-h-[80px]">
                {visit.cp365_visitnotes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.cp365_visitnotes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No notes</p>
                )}
              </div>
            )}
          </div>

          {/* History Section */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Visit History
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <span>Created: {format(new Date(visit.createdon), 'd MMM yyyy HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <span>Modified: {format(new Date(visit.modifiedon), 'd MMM yyyy HH:mm')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {showCancelConfirm ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Cancel this visit?</p>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCancelVisit}
                  disabled={!cancelReason.trim() || cancelMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={visit.cp365_visitstatus === VisitStatus.Cancelled}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Ban className="w-4 h-4" />
                Cancel Visit
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default VisitDetailFlyout;
