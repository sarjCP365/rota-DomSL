/**
 * TeamSubHeader Component
 *
 * Displays a collapsible sub-header for a Team within a Unit.
 * Shows team name, staff count, and statistics.
 *
 * Features:
 * - Collapsible independent of parent Unit
 * - Team name with staff count
 * - On leave count (amber)
 * - Unassigned shifts count (red)
 * - Quick actions on hover
 * - Indented under Unit header
 */

import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  UserPlus,
  Plus,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import type { TeamWithStaff } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface TeamSubHeaderProps {
  /** Team data with staff and statistics */
  team: TeamWithStaff;
  /** Whether the team section is expanded */
  isExpanded: boolean;
  /** Callback when expand/collapse is toggled */
  onToggle: () => void;
  /** Callback when "Add Staff" is clicked */
  onAddStaff?: () => void;
  /** Callback when "Add Shift" is clicked */
  onAddShift?: () => void;
  /** Callback when "View Team Details" is clicked */
  onViewDetails?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TeamSubHeader({
  team,
  isExpanded,
  onToggle,
  onAddStaff,
  onAddShift,
  onViewDetails,
}: TeamSubHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  // Calculate stats
  const staffCount = team.staffMembers.length;
  const onLeaveCount = team.stats.onLeave;
  const unassignedCount = team.stats.unassigned;
  const hasIssues = onLeaveCount > 0 || unassignedCount > 0;

  return (
    <div
      className="ml-6 mb-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          flex items-center justify-between rounded-md bg-[#FAFAFA] px-3 py-2
          border-l-[3px] border-l-primary/40
          transition-all
          ${isHovered ? 'bg-gray-100 shadow-sm' : ''}
        `}
      >
        {/* Left side: Chevron, team name, staff count */}
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          className="flex flex-1 cursor-pointer items-center gap-2"
          aria-expanded={isExpanded}
          aria-controls={`team-content-${team.cp365_staffteamid}`}
        >
          {/* Expand/collapse chevron */}
          <div className="flex h-5 w-5 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>

          {/* Team icon */}
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>

          {/* Team name and staff count */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{team.cp365_staffteamname}</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              {staffCount} {staffCount === 1 ? 'staff' : 'staff'}
            </span>
          </div>
        </div>

        {/* Right side: Stats and quick actions */}
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            {/* On leave count */}
            {onLeaveCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-amber-600">
                On leave: {onLeaveCount}
              </span>
            )}

            {/* Unassigned count */}
            {unassignedCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Scroll to unassigned row (future enhancement)
                }}
                className="flex items-center gap-1 font-medium text-red-600 hover:underline"
                title="Click to view unassigned shifts"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Unassigned: {unassignedCount}
              </button>
            )}

            {/* No issues indicator */}
            {!hasIssues && staffCount > 0 && <span className="text-gray-400">All covered</span>}
          </div>

          {/* Quick actions - visible on hover */}
          <div
            className={`
              flex items-center gap-1 transition-opacity
              ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
          >
            {onAddStaff && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStaff();
                }}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                title="Add staff to team"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Add Staff</span>
              </button>
            )}

            {onAddShift && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddShift();
                }}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                title="Add shift for team"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Add Shift</span>
              </button>
            )}

            {onViewDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                title="View team details"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TEAM EMPTY STATE
// =============================================================================

interface TeamEmptyStateProps {
  teamName: string;
  onAddStaff?: () => void;
}

/**
 * Displayed when a team has no staff members
 */
export function TeamEmptyState({ teamName, onAddStaff }: TeamEmptyStateProps) {
  return (
    <div className="ml-6 mb-2">
      <div className="flex items-center justify-between rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">No staff members in {teamName}</span>
        </div>
        {onAddStaff && (
          <button
            onClick={onAddStaff}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// UNASSIGNED TEAMS SECTION HEADER
// =============================================================================

interface UnassignedTeamsHeaderProps {
  teamsCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Header for the "Unassigned Teams" section (teams not linked to any unit)
 */
export function UnassignedTeamsHeader({
  teamsCount,
  isExpanded,
  onToggle,
}: UnassignedTeamsHeaderProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  return (
    <div className="mb-2">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 hover:bg-gray-100"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          <div className="flex h-6 w-6 items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </div>

          {/* Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200">
            <Users className="h-4 w-4 text-gray-500" />
          </div>

          {/* Title */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Unassigned Teams</h3>
            <p className="text-xs text-gray-500">Teams not linked to any unit</p>
          </div>
        </div>

        {/* Teams count */}
        <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-sm font-medium text-gray-600">
          {teamsCount} {teamsCount === 1 ? 'team' : 'teams'}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { TeamSubHeaderProps, TeamEmptyStateProps, UnassignedTeamsHeaderProps };
