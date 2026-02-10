/**
 * UnitHeader Component
 *
 * Displays a collapsible header for a Unit section in the hierarchical Team View.
 * Shows unit name, ward/floor info, and aggregated statistics.
 *
 * Features:
 * - Collapsible with smooth animation
 * - Unit name and subtitle (ward + floor)
 * - Statistics: total shifts, staff on leave, vacancies
 * - "Weekly Overview" link for detailed stats modal
 * - Teal accent border
 * - Keyboard accessible
 * - Remembers collapsed state in localStorage
 */

import { useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  AlertCircle,
  ExternalLink,
  Building2,
} from 'lucide-react';
import type { UnitWithTeams, UnitTypeCode } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface UnitHeaderProps {
  /** Unit data with teams and statistics */
  unit: UnitWithTeams;
  /** Whether the unit section is expanded */
  isExpanded: boolean;
  /** Callback when expand/collapse is toggled */
  onToggle: () => void;
  /** Callback when "Weekly Overview" is clicked */
  onViewOverview?: () => void;
  /** Date range being displayed */
  dateRange: { start: Date; end: Date };
  /** Whether to persist expanded state */
  persistState?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get display label for unit type code
 */
function getUnitTypeLabel(typeCode: UnitTypeCode | null): string | null {
  if (!typeCode) return null;

  const labels: Record<number, string> = {
    1: 'Dementia',
    2: 'Residential',
    3: 'Complex Care',
    4: 'Nursing',
    99: 'Other',
  };

  return labels[typeCode] || null;
}

/**
 * Get accent colour for unit type
 */
function getUnitTypeAccent(typeCode: UnitTypeCode | null): string {
  if (!typeCode) return 'border-l-primary';

  const accents: Record<number, string> = {
    1: 'border-l-purple-500', // Dementia
    2: 'border-l-green-500', // Residential
    3: 'border-l-orange-500', // Complex Care
    4: 'border-l-blue-500', // Nursing
    99: 'border-l-gray-500', // Other
  };

  return accents[typeCode] || 'border-l-primary';
}

/**
 * Get storage key for unit collapsed state
 */
function getStorageKey(unitId: string): string {
  return `rota-unit-expanded-${unitId}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function UnitHeader({
  unit,
  isExpanded,
  onToggle,
  onViewOverview,
  dateRange: _dateRange,
  persistState = true,
}: UnitHeaderProps) {
  // Load persisted state on mount
  useEffect(() => {
    if (persistState) {
      const stored = localStorage.getItem(getStorageKey(unit.cp365_unitid));
      if (stored !== null) {
        const shouldBeExpanded = stored === 'true';
        if (shouldBeExpanded !== isExpanded) {
          onToggle();
        }
      }
    }
  }, [unit.cp365_unitid, persistState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save state on change
  useEffect(() => {
    if (persistState) {
      localStorage.setItem(getStorageKey(unit.cp365_unitid), String(isExpanded));
    }
  }, [isExpanded, unit.cp365_unitid, persistState]);

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
  const { totalShifts, staffOnLeave, vacancies } = unit.stats;
  const hasVacancies = vacancies > 0;
  const teamsCount = unit.teams.length;

  // Build subtitle
  const subtitleParts: string[] = [];
  // cp365_wardname removed from Dataverse schema
  // cp365_floorlevel removed from Dataverse schema
  const subtitle = subtitleParts.join(' - ');

  // Unit type label
  const typeLabel = getUnitTypeLabel(unit.cp365_unittypecode);
  const accentClass = getUnitTypeAccent(unit.cp365_unittypecode);

  return (
    <div
      className={`
        mb-2 overflow-hidden rounded-lg border-l-4 bg-[#F8F9FA] 
        shadow-sm transition-all hover:shadow-md
        ${accentClass}
      `}
    >
      {/* Main header row - clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        aria-expanded={isExpanded}
        aria-controls={`unit-content-${unit.cp365_unitid}`}
      >
        {/* Left side: Chevron, name, subtitle */}
        <div className="flex items-center gap-3">
          {/* Expand/collapse chevron */}
          <div className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-200">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>

          {/* Unit icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>

          {/* Unit name and subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{unit.cp365_unitname}</h3>
              {typeLabel && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {typeLabel}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>

        {/* Right side: Stats and overview link */}
        <div className="flex items-center gap-4">
          {/* Statistics */}
          <div className="hidden items-center gap-4 text-sm md:flex">
            {/* Teams count */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                {teamsCount} {teamsCount === 1 ? 'team' : 'teams'}
              </span>
            </div>

            {/* Shifts count */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {totalShifts} {totalShifts === 1 ? 'shift' : 'shifts'}
              </span>
            </div>

            {/* Staff on leave */}
            {staffOnLeave > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <Users className="h-4 w-4" />
                <span>{staffOnLeave} on leave</span>
              </div>
            )}

            {/* Vacancies */}
            {hasVacancies && (
              <div className="flex items-center gap-1.5 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {vacancies} {vacancies === 1 ? 'vacancy' : 'vacancies'}
                </span>
              </div>
            )}
          </div>

          {/* Weekly Overview link */}
          {onViewOverview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewOverview();
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <span className="hidden sm:inline">Weekly Overview</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile stats row - only visible on small screens when expanded */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-4 py-2 text-sm md:hidden">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{teamsCount} teams</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{totalShifts} shifts</span>
          </div>
          {staffOnLeave > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <span>{staffOnLeave} on leave</span>
            </div>
          )}
          {hasVacancies && (
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{vacancies} vacancies</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface UnitEmptyStateProps {
  unitName: string;
  onHideEmptyUnits?: () => void;
}

/**
 * Displayed when a unit has no shifts scheduled for the period
 */
export function UnitEmptyState({ unitName, onHideEmptyUnits }: UnitEmptyStateProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
          <Calendar className="h-4 w-4 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">No shifts scheduled</p>
          <p className="text-xs text-gray-500">{unitName} has no shifts for this period</p>
        </div>
      </div>
      {onHideEmptyUnits && (
        <button
          onClick={onHideEmptyUnits}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          Hide empty units
        </button>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UnitHeaderProps, UnitEmptyStateProps };
