/**
 * AssignStaffModal Component
 *
 * Modal for assigning staff to a visit using the smart matching algorithm.
 * Shows recommended carers sorted by match score with detailed breakdown.
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  X,
  Search,
  RefreshCw,
  Star,
  Check,
  AlertTriangle,
  Clock,
  User,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
  Award,
} from 'lucide-react';
import type { Visit, DomiciliaryServiceUser } from '@/types/domiciliary';
import { getVisitTypeDisplayName } from '@/types/domiciliary';
import { findMatchingStaff, type MatchResult, type MatchingOptions } from '@/services/staffMatching';
import { visitRepository } from '@/repositories/visitRepository';

interface AssignStaffModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The visit to assign staff to */
  visit: Visit;
  /** The service user for the visit */
  serviceUser: DomiciliaryServiceUser;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback after successful assignment */
  onAssign?: (staffMemberId: string) => void;
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
 * Get score colour based on value
 */
function getScoreColour(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-blue-600 bg-blue-50';
  if (score >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Staff Match Card component
 */
function StaffMatchCard({
  match,
  isExpanded,
  onToggleExpand,
  onAssign,
  isAssigning,
}: {
  match: MatchResult;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAssign: () => void;
  isAssigning: boolean;
}) {
  const { staffMember, score, breakdown, isAvailable, hasRequiredSkills, warnings } = match;

  return (
    <div className={`
      border rounded-lg overflow-hidden transition-all
      ${isAvailable ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}
    `}>
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {getInitials(staffMember.cp365_staffmembername)}
            </div>
            {breakdown.continuityScore >= 20 && (
              <Star className="absolute -top-1 -right-1 w-4 h-4 text-amber-500 fill-amber-500" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 truncate">
                {staffMember.cp365_staffmembername}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColour(score)}`}>
                {score}/100
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {staffMember.cp365_jobtitle || 'Carer'}
            </p>

            {/* Quick indicators */}
            <div className="flex flex-wrap gap-2 mt-2">
              {isAvailable ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  <Check className="w-3 h-3" />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Limited
                </span>
              )}
              {breakdown.continuityScore >= 15 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  <History className="w-3 h-3" />
                  {breakdown.continuityScore >= 20 ? 'Regular' : 'Visited'}
                </span>
              )}
              {hasRequiredSkills && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  <Award className="w-3 h-3" />
                  Skilled
                </span>
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-600">
                {warnings.map((warning, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign button */}
          <button
            onClick={onAssign}
            disabled={isAssigning}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isAssigning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Assign'
            )}
          </button>
        </div>

        {/* Expand/collapse toggle */}
        <button
          onClick={onToggleExpand}
          className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show score breakdown
            </>
          )}
        </button>
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <h5 className="text-xs font-semibold text-gray-500 uppercase mb-3">Score Breakdown</h5>
          <div className="grid grid-cols-5 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{breakdown.availabilityScore}</div>
              <div className="text-xs text-gray-500">Availability</div>
              <div className="text-xs text-gray-400">/30</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{breakdown.continuityScore}</div>
              <div className="text-xs text-gray-500">Continuity</div>
              <div className="text-xs text-gray-400">/25</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{breakdown.skillsScore}</div>
              <div className="text-xs text-gray-500">Skills</div>
              <div className="text-xs text-gray-400">/20</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{breakdown.preferenceScore}</div>
              <div className="text-xs text-gray-500">Preference</div>
              <div className="text-xs text-gray-400">/15</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{breakdown.travelScore}</div>
              <div className="text-xs text-gray-500">Travel</div>
              <div className="text-xs text-gray-400">/10</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AssignStaffModal component
 */
export function AssignStaffModal({
  isOpen,
  visit,
  serviceUser,
  onClose,
  onAssign,
}: AssignStaffModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [includeOvertime, setIncludeOvertime] = useState(false);
  const [includeUnavailable, setIncludeUnavailable] = useState(false);

  // Build matching options
  const matchingOptions: MatchingOptions = useMemo(() => ({
    limit: showAllStaff ? 50 : 10,
    includeOvertime,
    includeUnavailable,
  }), [showAllStaff, includeOvertime, includeUnavailable]);

  // Fetch matching staff
  const matchesQuery = useQuery({
    queryKey: ['staffMatches', visit.cp365_visitid, matchingOptions],
    queryFn: () => findMatchingStaff(
      { visit, serviceUser },
      matchingOptions
    ),
    enabled: isOpen,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Filter matches by search term
  const filteredMatches = useMemo(() => {
    if (!matchesQuery.data) return [];
    if (!searchTerm) return matchesQuery.data;

    const term = searchTerm.toLowerCase();
    return matchesQuery.data.filter(
      m => m.staffMember.cp365_staffmembername.toLowerCase().includes(term)
    );
  }, [matchesQuery.data, searchTerm]);

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (staffMemberId: string) => {
      await visitRepository.assignStaff(visit.cp365_visitid, staffMemberId);
    },
    onSuccess: (_, staffMemberId) => {
      void queryClient.invalidateQueries({ queryKey: ['domiciliary', 'visits'] });
      onAssign?.(staffMemberId);
      onClose();
    },
  });

  // Reset state when modal opens (adjust state during render)
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearchTerm('');
      setExpandedCardId(null);
      setShowAllStaff(false);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-modal-title"
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 id="assign-modal-title" className="text-xl font-semibold text-gray-900">
              Assign Carer to Visit
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Visit Summary */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{serviceUser.cp365_fullname}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {format(new Date(visit.cp365_visitdate), 'EEE d MMM')} at {visit.cp365_scheduledstarttime} - {visit.cp365_scheduledendtime}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                {getVisitTypeDisplayName(visit.cp365_visittypecode)}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => matchesQuery.refetch()}
              disabled={matchesQuery.isFetching}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${matchesQuery.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Options */}
          <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeOvertime}
                onChange={(e) => setIncludeOvertime(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-gray-600">Include staff requiring overtime</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeUnavailable}
                onChange={(e) => setIncludeUnavailable(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-gray-600">Include unavailable staff</span>
            </label>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {matchesQuery.isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  <p className="text-gray-500">Finding best matches...</p>
                </div>
              </div>
            ) : matchesQuery.error ? (
              <div className="flex items-center justify-center h-48">
                <div className="flex flex-col items-center gap-4 text-red-600">
                  <AlertTriangle className="w-8 h-8" />
                  <p>Error loading staff matches</p>
                  <button
                    onClick={() => matchesQuery.refetch()}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {searchTerm ? 'No staff found' : 'No matching staff available'}
                  </p>
                  <p className="text-sm mt-1">
                    {searchTerm
                      ? 'Try adjusting your search'
                      : 'Try enabling overtime or unavailable staff options'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Recommended Carers ({filteredMatches.length})
                  </h3>
                </div>

                {filteredMatches.map((match) => (
                  <StaffMatchCard
                    key={match.staffMember.cp365_staffmemberid}
                    match={match}
                    isExpanded={expandedCardId === match.staffMember.cp365_staffmemberid}
                    onToggleExpand={() =>
                      setExpandedCardId(
                        expandedCardId === match.staffMember.cp365_staffmemberid
                          ? null
                          : match.staffMember.cp365_staffmemberid
                      )
                    }
                    onAssign={() => assignMutation.mutate(match.staffMember.cp365_staffmemberid)}
                    isAssigning={assignMutation.isPending}
                  />
                ))}

                {!showAllStaff && (matchesQuery.data?.length || 0) > 5 && (
                  <button
                    onClick={() => setShowAllStaff(true)}
                    className="w-full py-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Show all staff ({matchesQuery.data?.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <Users className="w-4 h-4 inline mr-1" />
              {matchesQuery.data?.length || 0} staff members matched
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AssignStaffModal;
