/**
 * TeamViewGrid Component
 *
 * Displays the rota in a hierarchical Unit > Team > Staff structure.
 * Each level is collapsible and shows aggregated statistics.
 *
 * Features:
 * - Collapsible Unit sections
 * - Collapsible Team sections within units
 * - Staff rows with shift grid
 * - Stats badges (staff count, on leave, vacancies)
 * - Unassigned teams section
 * - Unassigned shifts row
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Layers,
  UserX,
  AlertCircle,
  Building2,
  Send,
  CheckSquare,
  XCircle,
  UserPlus,
  Loader2,
} from 'lucide-react';
import type {
  HierarchicalRotaData,
  UnitWithTeams,
  TeamWithStaff,
  StaffWithShifts,
  Shift,
  ShiftViewData,
  SublocationStaffViewData,
  ShiftReference,
} from '@/api/dataverse/types';
import { ShiftStatus } from '@/api/dataverse/types';
import type { DetailLevel } from '@/store/rotaStore';
import { usePublishShifts } from '@/hooks/useShifts';
import { QuickAssignPopover } from './QuickAssignPopover';
import { BulkAssignModal } from './BulkAssignModal';

// =============================================================================
// TYPES
// =============================================================================

interface TeamViewGridProps {
  /** Hierarchical rota data */
  data: HierarchicalRotaData;
  /** Start date for the grid */
  startDate: Date;
  /** Number of days to display */
  duration: number;
  /** Detail level for shift display */
  detailLevel?: DetailLevel;
  /** Callback when a shift is clicked */
  onShiftClick?: (shiftId: string) => void;
  /** Callback when an empty cell is clicked */
  onCellClick?: (date: Date, staffId?: string) => void;
  /** Staff list for quick assign popover */
  staff?: SublocationStaffViewData[];
  /** Shift references for lookup (optional) */
  shiftReferences?: ShiftReference[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamViewGrid({
  data,
  startDate,
  duration,
  detailLevel = 'detailed',
  onShiftClick,
  onCellClick,
  staff = [],
  shiftReferences = [],
}: TeamViewGridProps) {
  // Track expanded state for units and teams
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Publish selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForPublish, setSelectedForPublish] = useState<Set<string>>(new Set());
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const publishShiftsMutation = usePublishShifts();
  const publishMenuRef = useRef<HTMLDivElement>(null);

  // Quick assign popover state
  const [quickAssignShift, setQuickAssignShift] = useState<{
    shiftId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Bulk assign modal state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

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
      onShiftClick?.(quickAssignShift.shiftId);
    }
    setQuickAssignShift(null);
  }, [quickAssignShift, onShiftClick]);

  // Generate date columns
  const dateColumns = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < duration; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  }, [startDate, duration]);

  // Toggle unit expansion
  const toggleUnit = useCallback((unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  }, []);

  // Toggle team expansion
  const toggleTeam = useCallback((teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    const allUnitIds = new Set(data.units.map((u) => u.cp365_unitid));
    const allTeamIds = new Set<string>();
    data.units.forEach((u) => u.teams.forEach((t) => allTeamIds.add(t.cp365_staffteamid)));
    data.unassignedTeams.forEach((t) => allTeamIds.add(t.cp365_staffteamid));
    setExpandedUnits(allUnitIds);
    setExpandedTeams(allTeamIds);
  }, [data]);

  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedUnits(new Set());
    setExpandedTeams(new Set());
  }, []);

  // Check if any units/teams exist
  const hasUnits = data.units.length > 0;
  const hasUnassignedTeams = data.unassignedTeams.length > 0;
  const hasUnassignedShifts = data.unassignedShifts.length > 0;

  // Calculate overall stats
  const stats = useMemo(() => {
    let totalShifts = 0;
    const unassignedCount = data.unassignedShifts.length;
    let unpublishedCount = 0;
    const unpublishedShiftIds = new Set<string>();

    // Count shifts from units > teams > staff
    for (const unit of data.units) {
      for (const team of unit.teams) {
        const staffList = team.staffMembers || team.staff || [];
        for (const staff of staffList) {
          totalShifts += staff.shifts?.length || 0;
          for (const shift of staff.shifts || []) {
            if (shift.cp365_shiftstatus !== ShiftStatus.Published) {
              unpublishedCount++;
              unpublishedShiftIds.add(shift.cp365_shiftid);
            }
          }
        }
      }
    }

    // Count shifts from unassigned teams
    for (const team of data.unassignedTeams) {
      const staffList = team.staffMembers || team.staff || [];
      for (const staff of staffList) {
        totalShifts += staff.shifts?.length || 0;
        for (const shift of staff.shifts || []) {
          if (shift.cp365_shiftstatus !== ShiftStatus.Published) {
            unpublishedCount++;
            unpublishedShiftIds.add(shift.cp365_shiftid);
          }
        }
      }
    }

    // Count unassigned shifts
    totalShifts += data.unassignedShifts.length;
    for (const shift of data.unassignedShifts) {
      if (shift.cp365_shiftstatus !== ShiftStatus.Published) {
        unpublishedCount++;
        unpublishedShiftIds.add(shift.cp365_shiftid);
      }
    }

    return { totalShifts, unassignedCount, unpublishedCount, unpublishedShiftIds };
  }, [data]);

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
    return data.unassignedShifts.map((s) => ({
      'Shift ID': s.cp365_shiftid,
      'Shift Date': s.cp365_shiftdate,
      'Shift Start Time': s.cp365_shiftstarttime,
      'Shift End Time': s.cp365_shiftendtime,
      'Shift Reference Name': shiftRefNameMap.get(s._cp365_shiftreference_value || '') || '',
      'Staff Member ID': s._cp365_staffmember_value || '',
      'Staff Member Name': '',
      'Shift Status': s.cp365_shiftstatus || 0,
      'Shift Break Duration': s.cr1e2_shiftbreakduration || 0,
    })) as ShiftViewData[];
  }, [data.unassignedShifts, shiftRefNameMap]);

  // Publish handlers that need stats
  const handlePublishAll = async () => {
    if (stats.unpublishedShiftIds.size === 0) return;
    try {
      await publishShiftsMutation.mutateAsync(Array.from(stats.unpublishedShiftIds));
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

  if (!hasUnits && !hasUnassignedTeams && !hasUnassignedShifts) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No Units Found</h3>
          <p className="mt-2 text-sm text-slate-500">
            No units have been configured for this location. Units group teams together for better
            organization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header with expand/collapse controls */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {data.units.length} Unit{data.units.length !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-sm text-slate-500">
            {stats.totalShifts} Shift{stats.totalShifts !== 1 ? 's' : ''}
          </span>
          {/* Unassigned count - clickable to open bulk assign modal */}
          <button
            onClick={() => stats.unassignedCount > 0 && setShowBulkAssignModal(true)}
            disabled={stats.unassignedCount === 0}
            className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors ${
              stats.unassignedCount > 0
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                : 'bg-gray-100 text-gray-500 cursor-default'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{stats.unassignedCount} Unassigned</span>
            {stats.unassignedCount > 0 && <UserPlus className="h-3 w-3 ml-1" />}
          </button>
          {/* Publish controls */}
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-0.5 text-red-700">
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{selectedForPublish.size} selected</span>
              </div>
              <button
                onClick={handlePublishSelected}
                disabled={selectedForPublish.size === 0 || publishShiftsMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                Publish
              </button>
              <button
                onClick={handleCancelSelectionMode}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <XCircle className="h-3 w-3" />
                Cancel
              </button>
            </div>
          ) : stats.unpublishedCount > 0 ? (
            <div className="relative" ref={publishMenuRef}>
              <button
                onClick={() =>
                  !publishShiftsMutation.isPending && setShowPublishMenu(!showPublishMenu)
                }
                disabled={publishShiftsMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-700 disabled:opacity-75 disabled:cursor-wait"
              >
                {publishShiftsMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">
                  {publishShiftsMutation.isPending
                    ? 'Publishing...'
                    : `Publish (${stats.unpublishedCount})`}
                </span>
                {!publishShiftsMutation.isPending && <ChevronDown className="h-3 w-3" />}
              </button>
              {showPublishMenu && !publishShiftsMutation.isPending && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={handlePublishAll}
                    disabled={publishShiftsMutation.isPending}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publish All ({stats.unpublishedCount})
                  </button>
                  <button
                    onClick={handleStartSelectionMode}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Publish Selection...
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Grid content */}
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          {/* Date header */}
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="sticky left-0 z-20 min-w-[280px] border-b border-r border-slate-200 bg-slate-50 px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">
                Unit / Team / Staff
              </th>
              <th className="min-w-[60px] border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-500">
                Hours
              </th>
              {dateColumns.map((date, idx) => (
                <th
                  key={idx}
                  className={`min-w-[100px] border-b border-r border-slate-200 px-2 py-2 text-center text-xs ${
                    isSameDay(date, new Date())
                      ? 'bg-emerald-50 font-semibold text-emerald-700'
                      : 'bg-slate-50 font-medium text-slate-600'
                  }`}
                >
                  <div>{format(date, 'EEE')}</div>
                  <div className="text-[10px]">{format(date, 'd MMM')}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Units with teams */}
            {data.units.map((unit) => (
              <UnitSection
                key={unit.cp365_unitid}
                unit={unit}
                dateColumns={dateColumns}
                isExpanded={expandedUnits.has(unit.cp365_unitid)}
                expandedTeams={expandedTeams}
                onToggleUnit={() => toggleUnit(unit.cp365_unitid)}
                onToggleTeam={toggleTeam}
                detailLevel={detailLevel}
                onShiftClick={onShiftClick}
                onCellClick={onCellClick}
                isSelectionMode={isSelectionMode}
                selectedForPublish={selectedForPublish}
                onTogglePublishSelection={handleToggleShiftSelection}
              />
            ))}

            {/* Unassigned teams (not linked to any unit) */}
            {hasUnassignedTeams && (
              <>
                <tr className="bg-amber-50">
                  <td
                    colSpan={dateColumns.length + 2}
                    className="border-b border-t border-amber-200 px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        Teams Not Assigned to Units
                      </span>
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {data.unassignedTeams.length}
                      </span>
                    </div>
                  </td>
                </tr>
                {data.unassignedTeams.map((team) => (
                  <TeamSection
                    key={team.cp365_staffteamid}
                    team={team}
                    dateColumns={dateColumns}
                    isExpanded={expandedTeams.has(team.cp365_staffteamid)}
                    onToggle={() => toggleTeam(team.cp365_staffteamid)}
                    detailLevel={detailLevel}
                    onShiftClick={onShiftClick}
                    onCellClick={onCellClick}
                    isUnassignedSection
                    isSelectionMode={isSelectionMode}
                    selectedForPublish={selectedForPublish}
                    onTogglePublishSelection={handleToggleShiftSelection}
                  />
                ))}
              </>
            )}

            {/* Unassigned shifts (no staff member) */}
            {hasUnassignedShifts && (
              <UnassignedShiftsRow
                shifts={data.unassignedShifts}
                dateColumns={dateColumns}
                startDate={startDate}
                detailLevel={detailLevel}
                onShiftClick={onShiftClick}
                onCellClick={onCellClick}
                isSelectionMode={isSelectionMode}
                selectedForPublish={selectedForPublish}
                onTogglePublishSelection={handleToggleShiftSelection}
                onQuickAssignClick={handleQuickAssignClick}
              />
            )}
          </tbody>
        </table>
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
        staff={staff || []}
        onClose={() => setShowBulkAssignModal(false)}
        onAssigned={() => setShowBulkAssignModal(false)}
      />

      {/* Stats footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>
            <strong>{data.stats.totalShifts}</strong> shifts
          </span>
          <span>
            <strong>{data.stats.totalHours.toFixed(1)}</strong> hours
          </span>
          <span>
            <strong>{data.stats.assignedShifts}</strong> assigned
          </span>
          <span className={data.stats.unassignedShifts > 0 ? 'text-amber-600' : ''}>
            <strong>{data.stats.unassignedShifts}</strong> vacancies
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Coverage:{' '}
          <strong
            className={data.stats.coveragePercentage < 100 ? 'text-amber-600' : 'text-emerald-600'}
          >
            {data.stats.coveragePercentage}%
          </strong>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UNIT SECTION
// =============================================================================

interface UnitSectionProps {
  unit: UnitWithTeams;
  dateColumns: Date[];
  isExpanded: boolean;
  expandedTeams: Set<string>;
  onToggleUnit: () => void;
  onToggleTeam: (teamId: string) => void;
  detailLevel: DetailLevel;
  onShiftClick?: (shiftId: string) => void;
  onCellClick?: (date: Date, staffId?: string) => void;
  isSelectionMode?: boolean;
  selectedForPublish?: Set<string>;
  onTogglePublishSelection?: (shiftId: string) => void;
}

function UnitSection({
  unit,
  dateColumns,
  isExpanded,
  expandedTeams,
  onToggleUnit,
  onToggleTeam,
  detailLevel,
  onShiftClick,
  onCellClick,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
}: UnitSectionProps) {
  const totalStaff = unit.teams.reduce((sum, t) => sum + t.staffMembers.length, 0);

  return (
    <>
      {/* Unit header row */}
      <tr
        className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition-colors"
        onClick={onToggleUnit}
      >
        <td className="sticky left-0 z-10 border-b border-r border-emerald-200 bg-emerald-50 px-4 py-2">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-emerald-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-emerald-600" />
            )}
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-800">{unit.cp365_unitname}</span>
            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {unit.teams.length} teams
            </span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
              {totalStaff} staff
            </span>
            {unit.stats.staffOnLeave > 0 && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                {unit.stats.staffOnLeave} on leave
              </span>
            )}
          </div>
        </td>
        <td className="border-b border-r border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-sm font-medium text-emerald-700">
          {/* Could show unit total hours here */}
        </td>
        {dateColumns.map((_, idx) => (
          <td key={idx} className="border-b border-r border-emerald-200 bg-emerald-50 px-2 py-2" />
        ))}
      </tr>

      {/* Teams within unit */}
      {isExpanded &&
        unit.teams.map((team) => (
          <TeamSection
            key={team.cp365_staffteamid}
            team={team}
            dateColumns={dateColumns}
            isExpanded={expandedTeams.has(team.cp365_staffteamid)}
            onToggle={() => onToggleTeam(team.cp365_staffteamid)}
            detailLevel={detailLevel}
            onShiftClick={onShiftClick}
            onCellClick={onCellClick}
            isSelectionMode={isSelectionMode}
            selectedForPublish={selectedForPublish}
            onTogglePublishSelection={onTogglePublishSelection}
          />
        ))}
    </>
  );
}

// =============================================================================
// TEAM SECTION
// =============================================================================

interface TeamSectionProps {
  team: TeamWithStaff;
  dateColumns: Date[];
  isExpanded: boolean;
  onToggle: () => void;
  detailLevel: DetailLevel;
  onShiftClick?: (shiftId: string) => void;
  onCellClick?: (date: Date, staffId?: string) => void;
  isUnassignedSection?: boolean;
  isSelectionMode?: boolean;
  selectedForPublish?: Set<string>;
  onTogglePublishSelection?: (shiftId: string) => void;
}

function TeamSection({
  team,
  dateColumns,
  isExpanded,
  onToggle,
  detailLevel,
  onShiftClick,
  onCellClick,
  isUnassignedSection = false,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
}: TeamSectionProps) {
  const bgClass = isUnassignedSection ? 'bg-amber-50/50' : 'bg-slate-50';
  const hoverClass = isUnassignedSection ? 'hover:bg-amber-100/50' : 'hover:bg-slate-100';
  const borderClass = isUnassignedSection ? 'border-amber-200' : 'border-slate-200';

  return (
    <>
      {/* Team header row */}
      <tr
        className={`cursor-pointer ${bgClass} ${hoverClass} transition-colors`}
        onClick={onToggle}
      >
        <td
          className={`sticky left-0 z-10 border-b border-r ${borderClass} ${bgClass} px-4 py-2 pl-8`}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
            <Users className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-slate-700">{team.cp365_staffteamname}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
              {team.staffMembers.length} staff
            </span>
            {team.stats.onLeave > 0 && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                {team.stats.onLeave} on leave
              </span>
            )}
          </div>
        </td>
        <td
          className={`border-b border-r ${borderClass} ${bgClass} px-2 py-2 text-center text-sm text-slate-600`}
        >
          {/* Could show team total hours */}
        </td>
        {dateColumns.map((_, idx) => (
          <td key={idx} className={`border-b border-r ${borderClass} ${bgClass} px-2 py-2`} />
        ))}
      </tr>

      {/* Staff members within team */}
      {isExpanded &&
        team.staffMembers.map((staff) => (
          <StaffRow
            key={staff.cp365_staffmemberid}
            staff={staff}
            dateColumns={dateColumns}
            detailLevel={detailLevel}
            onShiftClick={onShiftClick}
            onCellClick={onCellClick}
            isSelectionMode={isSelectionMode}
            selectedForPublish={selectedForPublish}
            onTogglePublishSelection={onTogglePublishSelection}
          />
        ))}
    </>
  );
}

// =============================================================================
// STAFF ROW
// =============================================================================

interface StaffRowProps {
  staff: StaffWithShifts;
  dateColumns: Date[];
  detailLevel: DetailLevel;
  onShiftClick?: (shiftId: string) => void;
  onCellClick?: (date: Date, staffId?: string) => void;
  isSelectionMode?: boolean;
  selectedForPublish?: Set<string>;
  onTogglePublishSelection?: (shiftId: string) => void;
}

function StaffRow({
  staff,
  dateColumns,
  detailLevel,
  onShiftClick,
  onCellClick,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
}: StaffRowProps) {
  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of staff.shifts) {
      const dateKey = shift.cp365_shiftdate?.split('T')[0] || '';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(shift);
    }
    return map;
  }, [staff.shifts]);

  // Check if staff is on leave for a specific date
  const isOnLeave = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return staff.leave.some((leave) => {
      const start = leave.cp365_startdate.split('T')[0];
      const end = leave.cp365_enddate.split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  // Get initials
  const initials = (staff.cp365_forename?.[0] || '') + (staff.cp365_surname?.[0] || '');

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* Staff name cell */}
      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-2 pl-12">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
            {initials || '??'}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-800">{staff.cp365_staffmembername}</div>
            {detailLevel === 'detailed' && (
              <div className="text-xs text-slate-500">
                {staff.contractedHours > 0 ? `${staff.contractedHours}h contract` : 'No contract'}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Hours cell */}
      <td className="border-b border-r border-slate-200 bg-white px-2 py-2 text-center text-sm">
        <span
          className={
            staff.scheduledHours > staff.contractedHours
              ? 'text-amber-600 font-medium'
              : 'text-slate-600'
          }
        >
          {staff.scheduledHours}h
        </span>
      </td>

      {/* Date cells */}
      {dateColumns.map((date, idx) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayShifts = shiftsByDate.get(dateKey) || [];
        const onLeave = isOnLeave(date);
        const isToday = isSameDay(date, new Date());

        return (
          <td
            key={idx}
            onClick={() => onCellClick?.(date, staff.cp365_staffmemberid)}
            className={`border-b border-r border-slate-200 px-1 py-1 align-top cursor-pointer transition-colors ${
              isToday ? 'bg-emerald-50/50' : 'bg-white'
            } hover:bg-slate-100`}
          >
            {onLeave && (
              <div className="mb-1 rounded bg-red-100 px-1 py-0.5 text-center text-[10px] font-medium text-red-700">
                LEAVE
              </div>
            )}
            {dayShifts.map((shift) => {
              const shiftId = shift.cp365_shiftid;
              const isUnpublished = shift.cp365_shiftstatus !== ShiftStatus.Published;

              // In selection mode, clicking unpublished shifts toggles selection
              const handleClick = (_e: React.MouseEvent) => {
                if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                  onTogglePublishSelection(shiftId);
                } else {
                  onShiftClick?.(shiftId);
                }
              };

              return (
                <ShiftBlock
                  key={shiftId}
                  shift={shift}
                  detailLevel={detailLevel}
                  onClick={handleClick}
                  isSelectionMode={isSelectionMode}
                  isSelectedForPublish={selectedForPublish?.has(shiftId)}
                />
              );
            })}
          </td>
        );
      })}
    </tr>
  );
}

// =============================================================================
// SHIFT BLOCK
// =============================================================================

interface ShiftBlockProps {
  shift: Shift;
  detailLevel: DetailLevel;
  onClick?: (e: React.MouseEvent) => void;
  isSelectionMode?: boolean;
  isSelectedForPublish?: boolean;
}

function ShiftBlock({
  shift,
  detailLevel,
  onClick,
  isSelectionMode,
  isSelectedForPublish,
}: ShiftBlockProps) {
  // Parse times
  const startTime = shift.cp365_shiftstarttime
    ? format(new Date(shift.cp365_shiftstarttime), 'HH:mm')
    : '??:??';
  const endTime = shift.cp365_shiftendtime
    ? format(new Date(shift.cp365_shiftendtime), 'HH:mm')
    : '??:??';

  // Check if unpublished
  const isUnpublished = shift.cp365_shiftstatus !== ShiftStatus.Published;
  const canBeSelected = isSelectionMode && isUnpublished;

  // Determine background color based on shift type
  const getBgColor = () => {
    if (shift.cp365_sleepin) return 'bg-violet-100 border-violet-300';
    if (shift.cp365_shifttype === 'Night') return 'bg-blue-100 border-blue-300';
    return 'bg-amber-100 border-amber-300';
  };

  // Icon for shift type
  const getIcon = () => {
    if (shift.cp365_sleepin) return '🛏️';
    if (shift.cp365_shifttype === 'Night') return '🌙';
    return '☀️';
  };

  // Selection styling
  const getSelectionStyle = () => {
    if (isSelectedForPublish) return 'ring-2 ring-red-500';
    if (isUnpublished && !isSelectionMode) return 'border-dashed';
    if (canBeSelected) return 'hover:ring-2 hover:ring-red-300';
    return '';
  };

  if (detailLevel === 'hoursOnly') {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>); } }}
        role="button"
        tabIndex={0}
        title={
          isUnpublished
            ? isSelectionMode
              ? 'Click to select for publishing'
              : 'Unpublished shift'
            : undefined
        }
        className={`mb-1 rounded border px-1 py-0.5 text-center text-[10px] cursor-pointer hover:opacity-80 ${getBgColor()} ${getSelectionStyle()}`}
      >
        {startTime}-{endTime}
        {isUnpublished && !isSelectedForPublish && <span className="ml-1 font-bold">*</span>}
        {isSelectedForPublish && <span className="ml-1 text-red-500 font-bold">✓</span>}
      </div>
    );
  }

  const isLeader = shift.cp365_shiftleader;
  const isActUp = shift.cp365_actup;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>); } }}
      role="button"
      tabIndex={0}
      title={`${isUnpublished ? (isSelectionMode ? 'Click to select for publishing' : 'Unpublished shift') : ''}${isLeader ? ' (Shift Leader)' : ''}${isActUp ? ' (Act Up)' : ''}`}
      className={`mb-1 rounded border px-1 py-0.5 text-[10px] cursor-pointer hover:opacity-80 ${getBgColor()} ${getSelectionStyle()}`}
    >
      <div className="flex items-center gap-1">
        <span>{getIcon()}</span>
        <span className="font-medium">
          {startTime}-{endTime}
        </span>
        {/* Role badges - always show */}
        {isLeader && (
          <span className="shrink-0 rounded bg-orange-200 px-0.5 text-[8px] font-bold text-orange-700">
            SL
          </span>
        )}
        {isActUp && (
          <span className="shrink-0 rounded bg-purple-200 px-0.5 text-[8px] font-bold text-purple-700">
            AU
          </span>
        )}
        {isUnpublished && !isSelectedForPublish && (
          <span className="ml-auto font-bold text-gray-500">*</span>
        )}
        {isSelectedForPublish && <span className="ml-auto text-red-500 font-bold">✓</span>}
      </div>
    </div>
  );
}

// =============================================================================
// UNASSIGNED SHIFTS ROW
// =============================================================================

interface UnassignedShiftsRowProps {
  shifts: Shift[];
  dateColumns: Date[];
  startDate: Date;
  detailLevel: DetailLevel;
  onShiftClick?: (shiftId: string) => void;
  onCellClick?: (date: Date, staffId?: string) => void;
  isSelectionMode?: boolean;
  selectedForPublish?: Set<string>;
  onTogglePublishSelection?: (shiftId: string) => void;
  onQuickAssignClick?: (shiftId: string, event: React.MouseEvent) => void;
}

function UnassignedShiftsRow({
  shifts,
  dateColumns,
  startDate: _startDate,
  detailLevel,
  onShiftClick,
  onCellClick,
  isSelectionMode,
  selectedForPublish,
  onTogglePublishSelection,
  onQuickAssignClick,
}: UnassignedShiftsRowProps) {
  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const dateKey = shift.cp365_shiftdate?.split('T')[0] || '';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(shift);
    }
    return map;
  }, [shifts]);

  return (
    <tr className="bg-red-50/50">
      <td className="sticky left-0 z-10 border-b border-r border-red-200 bg-red-50/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-red-500" />
          <span className="font-medium text-red-700">Unassigned Shifts</span>
          <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-red-800">
            {shifts.length}
          </span>
        </div>
      </td>
      <td className="border-b border-r border-red-200 bg-red-50/50 px-2 py-2 text-center text-sm text-red-600">
        {/* Hours could be calculated */}
      </td>
      {dateColumns.map((date, idx) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayShifts = shiftsByDate.get(dateKey) || [];
        const isToday = isSameDay(date, new Date());

        return (
          <td
            key={idx}
            onClick={() => onCellClick?.(date)}
            className={`border-b border-r border-red-200 px-1 py-1 align-top cursor-pointer transition-colors ${
              isToday ? 'bg-red-100/50' : 'bg-red-50/30'
            } hover:bg-red-100`}
          >
            {dayShifts.map((shift) => {
              const shiftId = shift.cp365_shiftid;
              const isUnpublished = shift.cp365_shiftstatus !== ShiftStatus.Published;

              // Handle click - selection mode for publish, otherwise quick assign
              const handleClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (isSelectionMode && isUnpublished && onTogglePublishSelection) {
                  onTogglePublishSelection(shiftId);
                } else if (onQuickAssignClick) {
                  // Show quick assign popover for unassigned shifts
                  onQuickAssignClick(shiftId, e);
                } else {
                  onShiftClick?.(shiftId);
                }
              };

              return (
                <ShiftBlock
                  key={shiftId}
                  shift={shift}
                  detailLevel={detailLevel}
                  onClick={handleClick}
                  isSelectionMode={isSelectionMode}
                  isSelectedForPublish={selectedForPublish?.has(shiftId)}
                />
              );
            })}
          </td>
        );
      })}
    </tr>
  );
}

export default TeamViewGrid;
