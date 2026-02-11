/**
 * AssignmentModal Component
 *
 * Modal dialog for assigning staff to vacant shifts.
 * Shows available staff filtered and sorted by suitability.
 *
 * Features:
 * - Shift details header
 * - Search and filter available staff
 * - Recommended staff section (same team, under hours)
 * - Other available staff section
 * - Staff cards with hours, qualifications
 * - One-click assignment
 * - Request Agency Worker option
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  X,
  Search,
  Clock,
  Users,
  User,
  Check,
  Building2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { Shift, StaffMember, Capability } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface AssignmentModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The shift to assign */
  shift: Shift | null;
  /** Team ID the shift belongs to */
  teamId?: string;
  /** Team name for display */
  teamName?: string;
  /** Unit name for display */
  unitName?: string;
  /** Available staff members */
  availableStaff: StaffMemberForAssignment[];
  /** Callback when staff is assigned */
  onAssign: (staffId: string) => void;
  /** Callback to request agency worker */
  onRequestAgency?: () => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Whether assignment is in progress */
  isAssigning?: boolean;
}

interface StaffMemberForAssignment extends StaffMember {
  /** Current scheduled hours this week */
  scheduledHours: number;
  /** Contracted hours per week */
  contractedHours: number;
  /** Staff qualifications */
  qualifications: Capability[];
  /** Team IDs this staff belongs to */
  teamIds: string[];
  /** Whether staff is in the same team as the shift */
  isSameTeam?: boolean;
  /** Reason for recommendation (if any) */
  recommendationReason?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTime(dateTimeStr: string): string {
  try {
    const date = new Date(dateTimeStr);
    return format(date, 'HH:mm');
  } catch {
    return '--:--';
  }
}

function calculateDuration(shift: Shift): number {
  try {
    const start = new Date(shift.cp365_shiftstarttime);
    const end = new Date(shift.cp365_shiftendtime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
  } catch {
    return 0;
  }
}

function getShiftTypeLabel(shift: Shift): string {
  if (shift.cp365_sleepin) return 'Sleep In';

  if (shift.cp365_shiftstarttime) {
    const startHour = new Date(shift.cp365_shiftstarttime).getHours();
    if (startHour >= 20 || startHour < 6) return 'Night Shift';
  }

  return 'Day Shift';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AssignmentModal({
  isOpen,
  shift,
  teamId,
  teamName,
  unitName,
  availableStaff,
  onAssign,
  onRequestAgency,
  onClose,
  isAssigning = false,
}: AssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes - intentional reset for clean modal state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedStaffId(null);
      setShowConfirmation(false);
      // Focus search input after a short delay
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Filter and sort staff
  const { recommendedStaff, otherStaff } = useMemo(() => {
    if (!shift) return { recommendedStaff: [], otherStaff: [] };

    // Filter by search query
    let filtered = availableStaff;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = availableStaff.filter(
        (s) =>
          s.cp365_staffmembername?.toLowerCase().includes(query) ||
          s.qualifications.some((q) => q.cp365_capabilityname.toLowerCase().includes(query))
      );
    }

    // Separate recommended vs other
    const recommended: StaffMemberForAssignment[] = [];
    const other: StaffMemberForAssignment[] = [];

    for (const staff of filtered) {
      const isSameTeam = teamId ? staff.teamIds.includes(teamId) : false;
      const isUnderHours = staff.scheduledHours < staff.contractedHours;

      // Build recommendation reason
      const reasons: string[] = [];
      if (isSameTeam) reasons.push('Same team');
      if (isUnderHours) {
        const diff = Math.round((staff.contractedHours - staff.scheduledHours) * 10) / 10;
        reasons.push(`${diff}h under contracted`);
      }

      const staffWithReason = {
        ...staff,
        isSameTeam,
        recommendationReason: reasons.length > 0 ? reasons.join(' • ') : undefined,
      };

      if (isSameTeam || isUnderHours) {
        recommended.push(staffWithReason);
      } else {
        other.push(staffWithReason);
      }
    }

    // Sort recommended: same team first, then by hours under contracted
    recommended.sort((a, b) => {
      if (a.isSameTeam && !b.isSameTeam) return -1;
      if (!a.isSameTeam && b.isSameTeam) return 1;
      return b.contractedHours - b.scheduledHours - (a.contractedHours - a.scheduledHours);
    });

    // Sort other alphabetically
    other.sort((a, b) =>
      (a.cp365_staffmembername || '').localeCompare(b.cp365_staffmembername || '')
    );

    return { recommendedStaff: recommended, otherStaff: other };
  }, [availableStaff, searchQuery, teamId, shift]);

  // Handle staff selection
  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    setShowConfirmation(true);
  };

  // Handle confirm assignment
  const handleConfirmAssign = () => {
    if (selectedStaffId) {
      onAssign(selectedStaffId);
    }
  };

  // Cancel confirmation
  const handleCancelConfirm = () => {
    setSelectedStaffId(null);
    setShowConfirmation(false);
  };

  // Get selected staff details
  const selectedStaff = selectedStaffId
    ? availableStaff.find((s) => s.cp365_staffmemberid === selectedStaffId)
    : null;

  if (!isOpen || !shift) return null;

  const shiftDate = new Date(shift.cp365_shiftdate);
  const duration = calculateDuration(shift);
  const shiftType = getShiftTypeLabel(shift);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="button"
      tabIndex={0}
    >
      <div
        ref={modalRef}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-grey px-6 py-4">
          <div>
            <h2 id="assignment-modal-title" className="text-lg font-semibold text-gray-900">
              Assign Staff to Shift
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {format(shiftDate, 'EEEE d MMMM')} • {formatTime(shift.cp365_shiftstarttime)}-
              {formatTime(shift.cp365_shiftendtime)} ({duration}h)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shift details */}
        <div className="border-b border-border-grey bg-gray-50 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{shiftType}</span>
            </div>
            {teamName && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{teamName}</span>
              </div>
            )}
            {unitName && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Building2 className="h-4 w-4" />
                <span>{unitName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation overlay */}
        {showConfirmation && selectedStaff && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95">
            <div className="max-w-sm p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Assign {selectedStaff.cp365_staffmembername}?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                This will assign {selectedStaff.cp365_staffmembername} to the{' '}
                {shiftType.toLowerCase()} on {format(shiftDate, 'd MMMM')}.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCancelConfirm}
                  disabled={isAssigning}
                  className="flex-1 rounded-lg border border-border-grey px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssign}
                  disabled={isAssigning}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-border-grey px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search staff by name or qualification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border-grey bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Staff list */}
        <div className="flex-1 overflow-y-auto">
          {/* Recommended section */}
          {recommendedStaff.length > 0 && (
            <div className="border-b border-border-grey">
              <div className="bg-green-50 px-6 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Recommended
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {recommendedStaff.map((staff) => (
                  <StaffCard
                    key={staff.cp365_staffmemberid}
                    staff={staff}
                    onSelect={() => handleSelectStaff(staff.cp365_staffmemberid)}
                    isRecommended
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other available section */}
          {otherStaff.length > 0 && (
            <div>
              <div className="bg-gray-50 px-6 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Other Available
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {otherStaff.map((staff) => (
                  <StaffCard
                    key={staff.cp365_staffmemberid}
                    staff={staff}
                    onSelect={() => handleSelectStaff(staff.cp365_staffmemberid)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {recommendedStaff.length === 0 && otherStaff.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-sm font-medium text-gray-900">No available staff</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? 'No staff match your search criteria'
                  : 'All staff are already scheduled or unavailable'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-grey bg-gray-50 px-6 py-4">
          <span className="text-xs text-gray-500">
            {recommendedStaff.length + otherStaff.length} staff available
          </span>

          {onRequestAgency && (
            <button
              onClick={onRequestAgency}
              className="flex items-center gap-1.5 rounded-lg border border-border-grey bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Request Agency Worker
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STAFF CARD COMPONENT
// =============================================================================

interface StaffCardProps {
  staff: StaffMemberForAssignment;
  onSelect: () => void;
  isRecommended?: boolean;
}

function StaffCard({ staff, onSelect, isRecommended }: StaffCardProps) {
  const displayName =
    staff.cp365_staffmembername ||
    `${staff.cp365_forename || ''} ${staff.cp365_surname || ''}`.trim() ||
    'Unknown';
  const initial = displayName.charAt(0).toUpperCase();

  const hoursText = `${Math.round(staff.scheduledHours * 10) / 10}h / ${staff.contractedHours}h`;
  const isUnderHours = staff.scheduledHours < staff.contractedHours;
  const isOverHours = staff.scheduledHours > staff.contractedHours;

  // Qualification badges (max 3)
  const qualBadges = staff.qualifications.slice(0, 3);
  const moreQuals = staff.qualifications.length - 3;

  return (
    <div
      className={`
        flex items-center justify-between px-6 py-3 transition-colors
        hover:bg-gray-50
      `}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`
          flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium
          ${isRecommended ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}
        `}
        >
          {initial}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{displayName}</span>
            {staff.isSameTeam && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                Same Team
              </span>
            )}
          </div>

          {/* Hours */}
          <div
            className={`text-xs ${
              isUnderHours ? 'text-green-600' : isOverHours ? 'text-amber-600' : 'text-gray-500'
            }`}
          >
            {hoursText}
            {staff.recommendationReason && (
              <span className="ml-2 text-gray-400">• {staff.recommendationReason}</span>
            )}
          </div>

          {/* Qualifications */}
          {qualBadges.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {qualBadges.map((qual) => (
                <span
                  key={qual.cp365_capabilityid}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                  title={qual.cp365_capabilityname}
                >
                  {qual.cp365_capabilityname.substring(0, 2).toUpperCase()}
                </span>
              ))}
              {moreQuals > 0 && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  +{moreQuals}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Select button */}
      <button
        onClick={onSelect}
        className={`
          rounded-lg px-4 py-2 text-sm font-medium transition-colors
          ${
            isRecommended
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        Select
      </button>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { AssignmentModalProps, StaffMemberForAssignment };
