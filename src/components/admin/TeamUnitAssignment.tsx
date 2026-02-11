/**
 * TeamUnitAssignment Component
 * Modal for managing which teams are assigned to a unit
 */

import { useState } from 'react';
import { X, Users, Plus, Minus, Loader2, Search, AlertCircle } from 'lucide-react';
import { useTeamsForUnit, useUnassignedTeams, useAssignTeamToUnit } from '@/hooks/useUnits';
import type { Unit, StaffTeam } from '@/api/dataverse/types';

interface TeamUnitAssignmentProps {
  /** The unit to manage teams for */
  unit: Unit;
  /** Callback when modal is closed */
  onClose: () => void;
}

export function TeamUnitAssignment({ unit, onClose }: TeamUnitAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Data fetching
  const { data: assignedTeams = [], isLoading: isLoadingAssigned } = useTeamsForUnit(
    unit.cp365_unitid
  );
  const { data: unassignedTeams = [], isLoading: isLoadingUnassigned } = useUnassignedTeams(
    unit._cp365_location_value
  );

  // Mutation
  const assignTeamMutation = useAssignTeamToUnit();

  const isLoading = isLoadingAssigned || isLoadingUnassigned;

  // Filter unassigned teams by search
  const filteredUnassignedTeams = unassignedTeams.filter((team) =>
    team.cp365_staffteamname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle assigning a team to the unit
  const handleAssignTeam = async (team: StaffTeam) => {
    try {
      await assignTeamMutation.mutateAsync({
        teamId: team.cp365_staffteamid,
        unitId: unit.cp365_unitid,
      });
    } catch (error) {
      console.error('Failed to assign team:', error);
    }
  };

  // Handle removing a team from the unit
  const handleRemoveTeam = async (team: StaffTeam) => {
    try {
      await assignTeamMutation.mutateAsync({
        teamId: team.cp365_staffteamid,
        unitId: null,
      });
    } catch (error) {
      console.error('Failed to remove team:', error);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="button"
      tabIndex={0}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-grey px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Teams</h2>
            <p className="mt-0.5 text-sm text-gray-500">{unit.cp365_unitname}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid h-full grid-cols-2 gap-6">
              {/* Assigned Teams */}
              <div className="flex flex-col">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 text-primary" />
                  Assigned Teams ({assignedTeams.length})
                </h3>
                <div className="flex-1 overflow-y-auto rounded-lg border border-border-grey">
                  {assignedTeams.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
                      No teams assigned to this unit yet.
                      <br />
                      Add teams from the right panel.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-grey">
                      {assignedTeams.map((team) => (
                        <li
                          key={team.cp365_staffteamid}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {team.cp365_staffteamname}
                          </span>
                          <button
                            onClick={() => handleRemoveTeam(team)}
                            disabled={assignTeamMutation.isPending}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                            title="Remove from unit"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Available Teams */}
              <div className="flex flex-col">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 text-gray-400" />
                  Available Teams ({filteredUnassignedTeams.length})
                </h3>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-border-grey py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-border-grey">
                  {unassignedTeams.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
                      All teams are assigned to units.
                    </div>
                  ) : filteredUnassignedTeams.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
                      No teams match your search.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-grey">
                      {filteredUnassignedTeams.map((team) => (
                        <li
                          key={team.cp365_staffteamid}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                        >
                          <span className="text-sm text-gray-700">{team.cp365_staffteamname}</span>
                          <button
                            onClick={() => handleAssignTeam(team)}
                            disabled={assignTeamMutation.isPending}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                            title="Add to unit"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Notice */}
        <div className="border-t border-border-grey px-6 py-4">
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Teams assigned to this unit will be grouped together in the hierarchical rota view. A
              team can only belong to one unit at a time. Unassigned teams appear in a separate
              "Other Teams" section.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border-grey px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
