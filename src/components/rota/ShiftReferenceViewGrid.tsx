/**
 * ShiftReferenceViewGrid Component
 *
 * Displays the rota grouped by shift references/patterns (e.g., Early, Late, Night).
 * Shows coverage status per day for each shift type.
 *
 * Features:
 * - Groups shifts by Shift Reference
 * - Shows coverage grid (required vs assigned)
 * - Visual indicators for coverage status
 * - Assigned staff list per day
 * - "Fill Gap" button for under-staffed days
 * - Statistics and coverage percentages
 * - Filters by unit/team
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  AlertCircle,
  Check,
  Plus,
  TrendingUp,
  Calendar,
  Send,
  CheckSquare,
  XCircle,
  UserPlus,
} from 'lucide-react';
import type {
  Shift,
  ShiftReference,
  StaffMember,
  ShiftViewData,
  SublocationStaffViewData,
} from '@/api/dataverse/types';
import { ShiftStatus } from '@/api/dataverse/types';
import { usePublishShifts } from '@/hooks/useShifts';
import { QuickAssignPopover } from './QuickAssignPopover';
import { BulkAssignModal } from './BulkAssignModal';

// Extended shift type that includes staff name directly
interface ShiftWithStaffName extends Shift {
  _staffMemberName?: string | null;
}

// =============================================================================
// TYPES
// =============================================================================

/** Detail level for display */
type DetailLevel = 'detailed' | 'compact' | 'hoursOnly';

interface ShiftReferenceViewGridProps {
  /** All shift references available */
  shiftReferences: ShiftReference[];
  /** All shifts for the period (may include _staffMemberName) */
  shifts: ShiftWithStaffName[];
  /** Array of dates to display */
  dateRange: Date[];
  /** Staffing requirements per shift reference per day */
  staffingRequirements?: StaffingRequirement[];
  /** Staff members (for name lookup - optional, used as fallback) */
  staffMembers?: Map<string, StaffMember>;
  /** Staff list for quick assign popover */
  staff?: SublocationStaffViewData[];
  /** Callback when "Fill Gap" is clicked */
  onFillGap?: (shiftReferenceId: string, date: Date) => void;
  /** Callback when "Add Shift" is clicked */
  onAddShift?: (shiftReferenceId: string, date: Date) => void;
  /** Callback when a shift is clicked */
  onShiftClick?: (shift: Shift) => void;
  /** Filter by unit ID */
  unitFilter?: string | null;
  /** Filter by team ID */
  teamFilter?: string | null;
  /** Detail level for display - defaults to 'detailed' */
  detailLevel?: DetailLevel;
}

interface StaffingRequirement {
  shiftReferenceId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  requiredCount: number;
}

interface ProcessedShiftReference {
  reference: ShiftReference;
  shiftsByDate: Map<string, ProcessedShift[]>;
  totalShifts: number;
  assignedShifts: number;
  unassignedShifts: number;
  coveragePercentage: number;
}

interface ProcessedShift {
  shift: ShiftWithStaffName;
  staffName: string | null;
  isAssigned: boolean;
}

interface DayCoverage {
  required: number;
  assigned: number;
  unassigned: number;
  totalScheduled: number;
  status: 'full' | 'partial' | 'critical' | 'over' | 'none';
  shifts: ProcessedShift[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Dataverse stores time values as option sets with a base value
const DATAVERSE_TIME_OPTIONSET_BASE = 599250000;

const COVERAGE_STYLES = {
  full: {
    icon: Check,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  partial: {
    icon: AlertCircle,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  critical: {
    icon: AlertCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
  over: {
    icon: TrendingUp,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  none: {
    icon: Calendar,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-200',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert a Dataverse option set value to actual time value
 * Dataverse stores time as option sets with base value 599250000
 * e.g., 599250007 = 7, 599250012 = 12
 */
function convertTimeValue(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  // If value is greater than the base, it's an option set value
  if (value >= DATAVERSE_TIME_OPTIONSET_BASE) {
    return value - DATAVERSE_TIME_OPTIONSET_BASE;
  }
  // Otherwise it's already a plain number
  return value;
}

function getShiftReferenceTimeLabel(ref: ShiftReference): string {
  const startHour = convertTimeValue(ref.cp365_shiftreferencestarthour);
  const startMin = convertTimeValue(ref.cp365_shiftreferencestartminute);
  const endHour = convertTimeValue(ref.cp365_shiftreferenceendhour);
  const endMin = convertTimeValue(ref.cp365_shiftreferenceendminute);

  const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
  const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
  return `${start} - ${end}`;
}

function getCoverageStatus(
  required: number,
  assigned: number,
  totalScheduled: number
): DayCoverage['status'] {
  // No shifts scheduled - show neutral grey
  if (totalScheduled === 0) return 'none';

  // If we have a requirement set, compare against it
  if (required > 0) {
    if (assigned > required) return 'over';
    if (assigned === required) return 'full';
    if (assigned >= required - 1) return 'partial'; // Under by 1
    return 'critical'; // Under by 2+
  }

  // No requirement set - compare scheduled vs assigned
  if (assigned === totalScheduled) return 'full'; // All scheduled are assigned
  if (assigned > 0) return 'partial'; // Some assigned
  return 'critical'; // None assigned but shifts scheduled
}

/**
 * Calculate duration and return as formatted string hh:mm
 */
function calculateDuration(ref: ShiftReference): string {
  const startHour = convertTimeValue(ref.cp365_shiftreferencestarthour);
  const startMin = convertTimeValue(ref.cp365_shiftreferencestartminute);
  const endHour = convertTimeValue(ref.cp365_shiftreferenceendhour);
  const endMin = convertTimeValue(ref.cp365_shiftreferenceendminute);

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

  if (ref.cp365_endonnextday) {
    hours += 24;
  }

  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }

  // Format as hh:mm
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ShiftReferenceViewGrid({
  shiftReferences,
  shifts,
  dateRange,
  staffingRequirements = [],
  staffMembers = new Map(),
  staff = [],
  onFillGap,
  onAddShift,
  onShiftClick,
  unitFilter: _unitFilter,
  teamFilter: _teamFilter,
  detailLevel = 'detailed',
}: ShiftReferenceViewGridProps) {
  // Start with all refs expanded by default so users can see coverage immediately
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(
    () => new Set(shiftReferences.map((r) => r.cp365_shiftreferenceid))
  );
  const [showFullyCovered, setShowFullyCovered] = useState(true);

  // Quick assign popover state
  const [quickAssignShift, setQuickAssignShift] = useState<{
    shiftId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Bulk assign modal state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Publish selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForPublish, setSelectedForPublish] = useState<Set<string>>(new Set());
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const publishShiftsMutation = usePublishShifts();
  const publishMenuRef = useRef<HTMLDivElement>(null);

  // Close publish menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (publishMenuRef.current && !publishMenuRef.current.contains(event.target as Node)) {
        setShowPublishMenu(false);
      }
    };

    if (showPublishMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPublishMenu]);

  // Publish handlers
  const handleStartSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedForPublish(new Set());
    setShowPublishMenu(false);
  };

  const handleCancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedForPublish(new Set());
  };

  const handleToggleShiftSelection = useCallback((shiftId: string) => {
    setSelectedForPublish((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  }, []);

  // Quick assign handlers
  const handleQuickAssignClick = useCallback((shiftId: string, event: React.MouseEvent) => {
    setQuickAssignShift({
      shiftId,
      position: { x: event.clientX, y: event.clientY },
    });
  }, []);

  const handleQuickAssignComplete = useCallback(() => {
    setQuickAssignShift(null);
  }, []);

  const handleOpenFlyoutFromQuickAssign = useCallback(() => {
    if (quickAssignShift) {
      const shift = shifts.find((s) => s.cp365_shiftid === quickAssignShift.shiftId);
      if (shift) {
        onShiftClick?.(shift);
      }
    }
    setQuickAssignShift(null);
  }, [quickAssignShift, shifts, onShiftClick]);

  // Toggle expansion
  const toggleExpanded = useCallback((refId: string) => {
    setExpandedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(refId)) {
        next.delete(refId);
      } else {
        next.add(refId);
      }
      return next;
    });
  }, []);

  // Process shift references with their shifts
  const processedRefs = useMemo(() => {
    const result: ProcessedShiftReference[] = [];

    // Create a set of valid date keys for the current date range
    const validDateKeys = new Set(dateRange.map((d) => format(d, 'yyyy-MM-dd')));

    for (const ref of shiftReferences) {
      // Get shifts for this reference that are within the date range
      const refShifts = shifts.filter((s) => {
        if (s._cp365_shiftreference_value !== ref.cp365_shiftreferenceid) {
          return false;
        }
        // Check if shift date is within the date range
        const rawDate = s.cp365_shiftdate;
        const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
        return validDateKeys.has(dateKey);
      });

      // Group by date
      const shiftsByDate = new Map<string, ProcessedShift[]>();

      for (const shift of refShifts) {
        // Normalise date key to yyyy-MM-dd format (strip time component)
        const rawDate = shift.cp365_shiftdate;
        const dateKey = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

        if (!shiftsByDate.has(dateKey)) {
          shiftsByDate.set(dateKey, []);
        }

        // Use staff name directly from the shift (passed from ShiftViewData)
        // Fall back to lookup if not available
        const staffMemberId = shift._cp365_staffmember_value;
        let staffName: string | null = shift._staffMemberName || null;

        // Fallback to lookup if name not directly available
        if (!staffName && staffMemberId && staffMembers.has(staffMemberId)) {
          staffName = staffMembers.get(staffMemberId)?.cp365_staffmembername || null;
        }

        const isAssigned = !!staffMemberId && staffMemberId.trim() !== '';

        shiftsByDate.get(dateKey)!.push({
          shift,
          staffName,
          isAssigned,
        });
      }

      // Calculate stats
      const assignedShifts = refShifts.filter((s) => s._cp365_staffmember_value).length;
      const unassignedShifts = refShifts.length - assignedShifts;
      const coveragePercentage =
        refShifts.length > 0 ? Math.round((assignedShifts / refShifts.length) * 100) : 100;

      result.push({
        reference: ref,
        shiftsByDate,
        totalShifts: refShifts.length,
        assignedShifts,
        unassignedShifts,
        coveragePercentage,
      });
    }

    // Sort by name
    result.sort((a, b) =>
      a.reference.cp365_shiftreferencename.localeCompare(b.reference.cp365_shiftreferencename)
    );

    return result;
  }, [shiftReferences, shifts, staffMembers, dateRange]);

  // Get staffing requirement for a reference on a specific day
  const getRequirement = useCallback(
    (refId: string, date: Date): number => {
      const dayOfWeek = date.getDay();
      const req = staffingRequirements.find(
        (r) => r.shiftReferenceId === refId && r.dayOfWeek === dayOfWeek
      );
      return req?.requiredCount ?? 0;
    },
    [staffingRequirements]
  );

  // Calculate overall stats
  const overallStats = useMemo(() => {
    let totalRequired = 0;
    let totalAssigned = 0;
    let totalShifts = 0;
    let totalUnassigned = 0;
    let totalUnpublished = 0;
    const unpublishedShiftIds = new Set<string>();
    const unassignedShiftIds = new Set<string>();

    for (const ref of processedRefs) {
      totalShifts += ref.totalShifts;
      totalAssigned += ref.assignedShifts;
      totalUnassigned += ref.unassignedShifts;

      // Count unpublished shifts and collect IDs
      for (const [, dayShifts] of ref.shiftsByDate) {
        for (const s of dayShifts) {
          if (s.shift.cp365_shiftstatus !== ShiftStatus.Published) {
            totalUnpublished++;
            unpublishedShiftIds.add(s.shift.cp365_shiftid);
          }
          if (!s.isAssigned) {
            unassignedShiftIds.add(s.shift.cp365_shiftid);
          }
        }
      }

      for (const date of dateRange) {
        totalRequired += getRequirement(ref.reference.cp365_shiftreferenceid, date);
      }
    }

    // Calculate coverage percentage based on scheduled shifts (not requirements)
    // Coverage = assigned / total scheduled
    const coveragePercentage =
      totalShifts > 0 ? Math.round((totalAssigned / totalShifts) * 100) : 100; // No shifts = nothing to cover

    return {
      totalShifts,
      totalAssigned,
      totalUnassigned,
      totalUnpublished,
      unpublishedShiftIds,
      unassignedShiftIds,
      totalRequired,
      coveragePercentage,
    };
  }, [processedRefs, dateRange, getRequirement]);

  // Create a map of shift reference IDs to names for quick lookup
  const shiftRefNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ref of shiftReferences) {
      map.set(ref.cp365_shiftreferenceid, ref.cp365_shiftreferencename);
    }
    return map;
  }, [shiftReferences]);

  // Get unassigned shifts for bulk assign modal (converted to ShiftViewData format)
  const unassignedShiftsList = useMemo(() => {
    const unassignedShifts = shifts.filter((s) =>
      overallStats.unassignedShiftIds.has(s.cp365_shiftid)
    );
    // Convert to ShiftViewData format for BulkAssignModal
    return unassignedShifts.map((s) => ({
      'Shift ID': s.cp365_shiftid,
      'Shift Date': s.cp365_shiftdate,
      'Shift Start Time': s.cp365_shiftstarttime,
      'Shift End Time': s.cp365_shiftendtime,
      'Shift Reference Name': shiftRefNameMap.get(s._cp365_shiftreference_value || '') || '',
      'Staff Member ID': s._cp365_staffmember_value || '',
      'Staff Member Name': s._staffMemberName || '',
      'Shift Status': s.cp365_shiftstatus || 0,
      'Shift Break Duration': s.cr1e2_shiftbreakduration || 0,
    })) as ShiftViewData[];
  }, [shifts, overallStats.unassignedShiftIds, shiftRefNameMap]);

  // Publish handlers that need overallStats
  const handlePublishAll = async () => {
    if (overallStats.unpublishedShiftIds.size === 0) return;
    try {
      await publishShiftsMutation.mutateAsync(Array.from(overallStats.unpublishedShiftIds));
      setShowPublishMenu(false);
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    }
  };

  const handlePublishSelected = async () => {
    if (selectedForPublish.size === 0) return;
    try {
      await publishShiftsMutation.mutateAsync(Array.from(selectedForPublish));
      setIsSelectionMode(false);
      setSelectedForPublish(new Set());
    } catch (error) {
      console.error('Failed to publish shifts:', error);
    }
  };

  // Filter refs based on showFullyCovered
  const visibleRefs = useMemo(() => {
    if (showFullyCovered) return processedRefs;
    return processedRefs.filter((r) => r.coveragePercentage < 100);
  }, [processedRefs, showFullyCovered]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border-grey bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-grey bg-elevation-1 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{shiftReferences.length}</span> Shift Types
          </span>
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{overallStats.totalShifts}</span> Total
            Shifts
          </span>
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
              overallStats.coveragePercentage === 100
                ? 'bg-green-100 text-green-700'
                : overallStats.coveragePercentage >= 80
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              Coverage: {overallStats.coveragePercentage}%
            </span>
          </div>
          {/* Unassigned count - clickable to open bulk assign modal */}
          <button
            onClick={() => overallStats.totalUnassigned > 0 && setShowBulkAssignModal(true)}
            disabled={overallStats.totalUnassigned === 0}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
              overallStats.totalUnassigned > 0
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                : 'bg-gray-100 text-gray-500 cursor-default'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{overallStats.totalUnassigned} Unassigned</span>
            {overallStats.totalUnassigned > 0 && <UserPlus className="h-3.5 w-3.5 ml-1" />}
          </button>
          {/* Publish controls */}
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-red-700">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">{selectedForPublish.size} selected</span>
              </div>
              <button
                onClick={handlePublishSelected}
                disabled={selectedForPublish.size === 0 || publishShiftsMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Publish
              </button>
              <button
                onClick={handleCancelSelectionMode}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          ) : overallStats.totalUnpublished > 0 ? (
            <div className="relative" ref={publishMenuRef}>
              <button
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">
                  Publish ({overallStats.totalUnpublished})
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showPublishMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={handlePublishAll}
                    disabled={publishShiftsMutation.isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Publish All ({overallStats.totalUnpublished})
                  </button>
                  <button
                    onClick={handleStartSelectionMode}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Publish Selection...
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showFullyCovered}
              onChange={(e) => setShowFullyCovered(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Show fully covered
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {visibleRefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Check className="mb-4 h-12 w-12 text-green-400" />
            <h3 className="text-sm font-medium text-gray-900">All shifts fully covered</h3>
            <p className="mt-1 text-sm text-gray-500">There are no gaps in your rota coverage.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visibleRefs.map((processed) => (
              <ShiftReferenceSection
                key={processed.reference.cp365_shiftreferenceid}
                processed={processed}
                dateRange={dateRange}
                isExpanded={expandedRefs.has(processed.reference.cp365_shiftreferenceid)}
                onToggle={() => toggleExpanded(processed.reference.cp365_shiftreferenceid)}
                getRequirement={getRequirement}
                onFillGap={onFillGap}
                onAddShift={onAddShift}
                onShiftClick={onShiftClick}
                isSelectionMode={isSelectionMode}
                selectedForPublish={selectedForPublish}
                onTogglePublishSelection={handleToggleShiftSelection}
                onQuickAssignClick={handleQuickAssignClick}
                detailLevel={detailLevel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Assign Popover */}
      {quickAssignShift && (
        <QuickAssignPopover
          shiftId={quickAssignShift.shiftId}
          staff={staff}
          position={quickAssignShift.position}
          onClose={() => setQuickAssignShift(null)}
          onOpenFlyout={handleOpenFlyoutFromQuickAssign}
          onAssigned={handleQuickAssignComplete}
        />
      )}

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={showBulkAssignModal}
        unassignedShifts={unassignedShiftsList}
        staff={staff}
        onClose={() => setShowBulkAssignModal(false)}
        onAssigned={() => setShowBulkAssignModal(false)}
      />
    </div>
  );
}

// =============================================================================
// SHIFT REFERENCE SECTION
// =============================================================================

interface ShiftReferenceSectionProps {
  processed: ProcessedShiftReference;
  dateRange: Date[];
  isExpanded: boolean;
  onToggle: () => void;
  getRequirement: (refId: string, date: Date) => number;
  onFillGap?: (shiftReferenceId: string, date: Date) => void;
  onAddShift?: (shiftReferenceId: string, date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  isSelectionMode?: boolean;
  selectedForPublish?: Set<string>;
  onTogglePublishSelection?: (shiftId: string) => void;
  onQuickAssignClick?: (shiftId: string, event: React.MouseEvent) => void;
  detailLevel?: DetailLevel;
}

function ShiftReferenceSection({
  processed,
  dateRange,
  isExpanded,
  onToggle,
  getRequirement,
  onFillGap,
  onAddShift,
  onShiftClick,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
  onQuickAssignClick,
  detailLevel = 'detailed',
}: ShiftReferenceSectionProps) {
  const { reference, shiftsByDate, coveragePercentage, totalShifts, unassignedShifts } = processed;

  const timeLabel = getShiftReferenceTimeLabel(reference);
  const duration = calculateDuration(reference);

  // Calculate coverage per day
  const dayCoverages = useMemo(() => {
    return dateRange.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayShifts = shiftsByDate.get(dateKey) || [];
      const required = getRequirement(reference.cp365_shiftreferenceid, date);
      const totalScheduled = dayShifts.length;
      const assigned = dayShifts.filter((s) => s.isAssigned).length;
      const unassigned = dayShifts.filter((s) => !s.isAssigned).length;

      return {
        date,
        required,
        assigned,
        unassigned,
        totalScheduled,
        status: getCoverageStatus(required, assigned, totalScheduled),
        shifts: dayShifts,
      };
    });
  }, [dateRange, shiftsByDate, getRequirement, reference.cp365_shiftreferenceid]);

  return (
    <div className="bg-white">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}

          {/* Icon and name */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {reference.cp365_shiftreferencename}
              </span>
              <span className="text-sm text-gray-500">({timeLabel})</span>
              {reference.cp365_endonnextday && (
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  Overnight
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {duration} duration • {totalShifts} shifts scheduled
            </div>
          </div>
        </div>

        {/* Coverage badge */}
        <div className="flex items-center gap-3">
          {/* Assigned / Total */}
          <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {processed.assignedShifts} / {totalShifts}
            </span>
            <span className="text-xs text-gray-500">assigned</span>
          </div>

          {/* Coverage percentage badge */}
          <div
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${
              coveragePercentage === 100
                ? 'bg-green-100 text-green-700'
                : coveragePercentage >= 80
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {coveragePercentage === 100 ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{coveragePercentage}%</span>
          </div>

          {/* Unassigned count */}
          {unassignedShifts > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{unassignedShifts} unassigned</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {/* Coverage grid */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr>
                  <th className="w-24 px-2 py-2 text-left text-xs font-medium text-gray-500">
                    Need
                  </th>
                  {dateRange.map((date, idx) => {
                    const isToday = isSameDay(date, new Date());
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <th
                        key={idx}
                        className={`min-w-24 px-2 py-2 text-center ${
                          isToday ? 'bg-primary/10' : isWeekend ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-500">
                          {format(date, 'EEE')}
                        </div>
                        <div
                          className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-gray-900'}`}
                        >
                          {format(date, 'd MMM')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Coverage status row */}
                <tr>
                  <td className="px-2 py-2 align-top text-sm text-gray-600">
                    <div className="text-xs">
                      <div className="font-medium text-gray-700">Assigned /</div>
                      <div className="text-gray-500">Scheduled</div>
                    </div>
                  </td>
                  {dayCoverages.map((coverage, idx) => (
                    <CoverageCell
                      key={idx}
                      coverage={coverage}
                      shiftReferenceId={reference.cp365_shiftreferenceid}
                      onFillGap={onFillGap}
                      onAddShift={onAddShift}
                      onShiftClick={onShiftClick}
                      isSelectionMode={isSelectionMode}
                      selectedForPublish={selectedForPublish}
                      onTogglePublishSelection={onTogglePublishSelection}
                      onQuickAssignClick={onQuickAssignClick}
                      detailLevel={detailLevel}
                    />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Weekly summary - shows unassigned shifts needing attention */}
          {dayCoverages.some((c) => c.required > c.assigned) && (
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                Shifts Needing Cover
              </h4>
              <div className="flex flex-wrap gap-2">
                {dayCoverages
                  .filter((c) => c.required > c.assigned)
                  .map((coverage, idx) => {
                    const gap = coverage.required - coverage.assigned;
                    return (
                      <button
                        key={idx}
                        onClick={() => onFillGap?.(reference.cp365_shiftreferenceid, coverage.date)}
                        className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50 hover:shadow transition-all"
                      >
                        <span className="font-medium text-gray-900">
                          {format(coverage.date, 'EEE d')}
                        </span>
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">
                          Need {gap}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COVERAGE CELL
// =============================================================================

interface CoverageCellProps {
  coverage: DayCoverage & { date: Date };
  shiftReferenceId: string;
  onFillGap?: (shiftReferenceId: string, date: Date) => void;
  onAddShift?: (shiftReferenceId: string, date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  isSelectionMode?: boolean;
  selectedForPublish?: Set<string>;
  onTogglePublishSelection?: (shiftId: string) => void;
  onQuickAssignClick?: (shiftId: string, event: React.MouseEvent) => void;
  detailLevel?: DetailLevel;
}

function CoverageCell({
  coverage,
  shiftReferenceId,
  onFillGap,
  onAddShift,
  onShiftClick,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
  onQuickAssignClick,
  detailLevel = 'detailed',
}: CoverageCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { required, assigned, totalScheduled, status, date, shifts } = coverage;
  const style = COVERAGE_STYLES[status];
  const Icon = style.icon;

  // Determine if action is needed
  const hasUnassigned = totalScheduled > assigned;

  // Get assigned and unassigned staff
  const assignedStaff = shifts.filter((s) => s.isAssigned);
  const unassignedShifts = shifts.filter((s) => !s.isAssigned);

  // Use requirement if set, otherwise use total scheduled
  const displayDenominator = required > 0 ? required : totalScheduled;
  const showDenominator = displayDenominator > 0;

  // Determine how many staff to show
  const visibleStaff = isExpanded ? assignedStaff : assignedStaff.slice(0, 4);
  const hasMore = assignedStaff.length > 4;

  // Hours Only view - just show count/hours
  if (detailLevel === 'hoursOnly') {
    return (
      <td className="px-2 py-2 align-top">
        <div
          className={`
            flex flex-col items-center justify-center rounded-lg border p-2 min-h-[60px]
            ${style.bgColor} ${style.borderColor}
          `}
        >
          <div className="flex items-center gap-1">
            <span className={`text-xl font-bold ${style.textColor}`}>{assigned}</span>
            {showDenominator && (
              <span className="text-sm text-gray-500">/ {displayDenominator}</span>
            )}
          </div>
          <Icon className={`h-4 w-4 mt-1 ${style.textColor}`} />
          {/* Show unassigned count if any */}
          {unassignedShifts.length > 0 && (
            <span className="mt-1 text-[10px] font-medium text-red-600">
              {unassignedShifts.length} unassigned
            </span>
          )}
          {/* Always show Add button */}
          {onAddShift && (
            <button
              onClick={() => onAddShift(shiftReferenceId, date)}
              className="mt-1 flex items-center justify-center gap-0.5 rounded bg-white/30 px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-white/60 hover:text-gray-600 transition-all"
            >
              <Plus className="h-2.5 w-2.5" />
              Add
            </button>
          )}
        </div>
      </td>
    );
  }

  // Compact view - show count and initials only
  if (detailLevel === 'compact') {
    return (
      <td className="px-2 py-2 align-top">
        <div
          className={`
            flex flex-col rounded-lg border p-2 min-h-[60px]
            ${style.bgColor} ${style.borderColor}
          `}
        >
          {/* Count display and status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${style.textColor}`}>{assigned}</span>
              {showDenominator && (
                <span className="text-sm text-gray-500">/ {displayDenominator}</span>
              )}
            </div>
            <Icon className={`h-4 w-4 ${style.textColor}`} />
          </div>

          {/* Compact staff display - just initials */}
          {assignedStaff.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {assignedStaff.slice(0, 6).map((s, idx) => {
                const shiftId = s.shift.cp365_shiftid;
                const isUnpublished = s.shift.cp365_shiftstatus !== ShiftStatus.Published;
                const isSelectedForPublish = selectedForPublish?.has(shiftId);

                const handleClick = () => {
                  if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                    onTogglePublishSelection(shiftId);
                  } else {
                    onShiftClick?.(s.shift);
                  }
                };

                return (
                  <button
                    key={idx}
                    onClick={handleClick}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all hover:scale-110 ${
                      isSelectedForPublish
                        ? 'bg-red-500 text-white ring-2 ring-red-500'
                        : isUnpublished
                          ? 'bg-white/80 text-primary border border-dashed border-gray-400'
                          : 'bg-primary/20 text-primary'
                    }`}
                    title={s.staffName || 'Unknown'}
                  >
                    {(s.staffName || 'U').charAt(0).toUpperCase()}
                  </button>
                );
              })}
              {assignedStaff.length > 6 && (
                <span className="flex h-6 items-center text-[10px] text-gray-500 font-medium">
                  +{assignedStaff.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Unassigned count */}
          {unassignedShifts.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                ⚠️ {unassignedShifts.length} unassigned
              </span>
            </div>
          )}

          {/* Action buttons - compact - always show Add */}
          {onAddShift && (
            <button
              onClick={() => onAddShift(shiftReferenceId, date)}
              className="mt-1 flex w-full items-center justify-center gap-0.5 rounded bg-white/50 px-2 py-1 text-xs font-medium text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm transition-all"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>
      </td>
    );
  }

  // Detailed view (default) - show all staff names and details
  return (
    <td className="px-2 py-2 align-top">
      <div
        className={`
          flex flex-col rounded-lg border p-2 min-h-[60px]
          ${style.bgColor} ${style.borderColor}
        `}
      >
        {/* Count display and status */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1">
            <span className={`text-lg font-bold ${style.textColor}`}>{assigned}</span>
            {showDenominator && (
              <span className="text-sm text-gray-500">/ {displayDenominator}</span>
            )}
          </div>
          <Icon className={`h-4 w-4 ${style.textColor}`} />
        </div>

        {/* Assigned staff names - shown directly in cell */}
        {assignedStaff.length > 0 && (
          <div className="space-y-0.5">
            {visibleStaff.map((s, idx) => {
              const shiftId = s.shift.cp365_shiftid;
              const isUnpublished = s.shift.cp365_shiftstatus !== ShiftStatus.Published;
              const isSelectedForPublish = selectedForPublish?.has(shiftId);

              // In selection mode, clicking unpublished shifts toggles selection
              const handleClick = () => {
                if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                  onTogglePublishSelection(shiftId);
                } else {
                  onShiftClick?.(s.shift);
                }
              };

              const isLeader = s.shift.cp365_shiftleader;
              const isActUp = s.shift.cp365_actup;

              return (
                <button
                  key={idx}
                  onClick={handleClick}
                  className={`flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left hover:bg-white hover:shadow-sm transition-all ${
                    isSelectedForPublish
                      ? 'bg-white ring-2 ring-red-500'
                      : isUnpublished
                        ? 'bg-white/80 border border-dashed border-gray-400'
                        : 'bg-white/60'
                  } ${isSelectionMode && isUnpublished ? 'cursor-pointer hover:ring-2 hover:ring-red-300' : ''}`}
                  title={`${isUnpublished ? (isSelectionMode ? 'Click to select for publishing' : '[Unpublished] ') : ''}${!isSelectionMode ? `Click to view shift for ${s.staffName || 'Unknown'}` : ''}${isLeader ? ' (Shift Leader)' : ''}${isActUp ? ' (Act Up)' : ''}`}
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-medium text-primary">
                    {(s.staffName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-xs text-gray-700">{s.staffName || 'Unknown'}</span>
                  {/* Role badges */}
                  {isLeader && (
                    <span className="shrink-0 rounded bg-orange-100 px-1 text-[8px] font-bold text-orange-700">
                      SL
                    </span>
                  )}
                  {isActUp && (
                    <span className="shrink-0 rounded bg-purple-100 px-1 text-[8px] font-bold text-purple-700">
                      AU
                    </span>
                  )}
                  {isUnpublished && !isSelectedForPublish && (
                    <span className="ml-auto text-[9px] font-bold text-gray-500">*</span>
                  )}
                  {isSelectedForPublish && (
                    <span className="ml-auto text-[9px] font-bold text-red-500">✓</span>
                  )}
                </button>
              );
            })}
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-[10px] text-primary font-medium text-center hover:text-primary/80 hover:underline transition-all py-0.5"
              >
                {isExpanded ? 'Show less' : `+${assignedStaff.length - 4} more`}
              </button>
            )}
          </div>
        )}

        {/* Unassigned shifts indicator */}
        {unassignedShifts.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {unassignedShifts.slice(0, 2).map((s, idx) => {
              const shiftId = s.shift.cp365_shiftid;
              const isUnpublished = s.shift.cp365_shiftstatus !== ShiftStatus.Published;
              const isSelectedForPublish = selectedForPublish?.has(shiftId);

              // Handle click - selection mode for publish, otherwise quick assign
              const handleClick = (e: React.MouseEvent) => {
                if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                  onTogglePublishSelection(shiftId);
                } else if (onQuickAssignClick) {
                  // Show quick assign popover for unassigned shifts
                  onQuickAssignClick(shiftId, e);
                } else {
                  onShiftClick?.(s.shift);
                }
              };

              return (
                <button
                  key={idx}
                  onClick={handleClick}
                  className={`rounded border-2 border-dashed px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                    isSelectedForPublish
                      ? 'border-red-500 bg-red-100 text-red-700 ring-2 ring-red-500'
                      : 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                  } ${isSelectionMode && isUnpublished ? 'cursor-pointer hover:ring-2 hover:ring-red-300' : ''}`}
                  title={`${isUnpublished ? (isSelectionMode ? 'Click to select for publishing' : '[Unpublished] ') : ''}${!isSelectionMode ? 'Click to quickly assign staff' : ''}`}
                >
                  {isSelectedForPublish
                    ? '✓ Selected'
                    : `⚠️ Unassigned${isUnpublished && !isSelectedForPublish ? ' *' : ''}`}
                </button>
              );
            })}
            {unassignedShifts.length > 2 && (
              <span className="text-[10px] text-red-500 font-medium">
                +{unassignedShifts.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        {hasUnassigned && onFillGap && (
          <button
            onClick={() => onFillGap(shiftReferenceId, date)}
            className="mt-1.5 w-full rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Assign Staff
          </button>
        )}

        {/* Always show Add button to create new shifts */}
        {onAddShift && (
          <button
            onClick={() => onAddShift(shiftReferenceId, date)}
            className={`mt-1 flex w-full items-center justify-center gap-0.5 rounded px-2 py-1 text-xs font-medium transition-all ${
              totalScheduled === 0
                ? 'bg-white/50 text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm'
                : 'bg-white/30 text-gray-400 hover:bg-white/60 hover:text-gray-600'
            }`}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>
    </td>
  );
}

// =============================================================================
// STATISTICS CARD
// =============================================================================

interface ShiftReferenceStatsProps {
  shiftReferences: ShiftReference[];
  shifts: Shift[];
  dateRange: Date[];
}

/**
 * Summary statistics for shift reference coverage
 */
export function ShiftReferenceStats({
  shiftReferences,
  shifts,
  dateRange: _dateRange,
}: ShiftReferenceStatsProps) {
  const stats = useMemo(() => {
    const byRef = new Map<string, { total: number; assigned: number }>();

    for (const ref of shiftReferences) {
      byRef.set(ref.cp365_shiftreferenceid, { total: 0, assigned: 0 });
    }

    for (const shift of shifts) {
      const refId = shift._cp365_shiftreference_value;
      if (refId && byRef.has(refId)) {
        const stats = byRef.get(refId)!;
        stats.total++;
        if (shift._cp365_staffmember_value) {
          stats.assigned++;
        }
      }
    }

    let totalShifts = 0;
    let totalAssigned = 0;
    const refStats: { name: string; coverage: number }[] = [];

    for (const ref of shiftReferences) {
      const s = byRef.get(ref.cp365_shiftreferenceid)!;
      totalShifts += s.total;
      totalAssigned += s.assigned;

      refStats.push({
        name: ref.cp365_shiftreferencename,
        coverage: s.total > 0 ? Math.round((s.assigned / s.total) * 100) : 100,
      });
    }

    return {
      totalShifts,
      totalAssigned,
      overallCoverage: totalShifts > 0 ? Math.round((totalAssigned / totalShifts) * 100) : 100,
      refStats,
    };
  }, [shiftReferences, shifts]);

  return (
    <div className="rounded-lg border border-border-grey bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Coverage by Shift Type</h3>

      {/* Overall */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
        <span className="text-sm font-medium text-gray-700">Overall Coverage</span>
        <span
          className={`text-lg font-bold ${
            stats.overallCoverage === 100
              ? 'text-green-600'
              : stats.overallCoverage >= 80
                ? 'text-amber-600'
                : 'text-red-600'
          }`}
        >
          {stats.overallCoverage}%
        </span>
      </div>

      {/* Per reference */}
      <div className="space-y-2">
        {stats.refStats.map((ref, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{ref.name}</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${
                    ref.coverage === 100
                      ? 'bg-green-500'
                      : ref.coverage >= 80
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${ref.coverage}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm font-medium text-gray-700">
                {ref.coverage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  ShiftReferenceViewGridProps,
  StaffingRequirement,
  ProcessedShiftReference,
  DayCoverage,
};
