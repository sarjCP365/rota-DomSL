/**
 * Units Management Page
 * Admin interface for managing units within locations
 * Part of hierarchical rota view feature (Unit > Team > Staff)
 */

import { useState, useMemo } from 'react';
import { Header } from '../../components/common/Header';
import { SideNav } from '../../components/common/SideNav';
import { useLocations } from '../../hooks/useLocations';
import { useUnitsByLocation, useDeactivateUnit } from '../../hooks/useUnits';
import { UnitForm } from '../../components/admin/UnitForm';
import { TeamUnitAssignment } from '../../components/admin/TeamUnitAssignment';
import type { Unit } from '../../api/dataverse/types';
import { UnitTypeCode } from '../../api/dataverse/types';
import { 
  Search, 
  Plus, 
  Building2, 
  Edit2, 
  Trash2, 
  Users,
  ChevronDown,
  AlertCircle,
  Layers,
} from 'lucide-react';

/**
 * Get display name for unit type code
 */
function getUnitTypeName(typeCode: number | null): string {
  switch (typeCode) {
    case UnitTypeCode.Dementia:
      return 'Dementia';
    case UnitTypeCode.Residential:
      return 'Residential';
    case UnitTypeCode.ComplexCare:
      return 'Complex Care';
    case UnitTypeCode.Nursing:
      return 'Nursing';
    case UnitTypeCode.Other:
      return 'Other';
    default:
      return '—';
  }
}

export function UnitsManagement() {
  const [sideNavOpen, setSideNavOpen] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [selectedUnitForTeams, setSelectedUnitForTeams] = useState<Unit | null>(null);

  // Data fetching
  const { data: locations = [], isLoading: isLoadingLocations } = useLocations();
  const { data: units = [], isLoading: isLoadingUnits } = useUnitsByLocation(selectedLocationId);
  const deactivateUnitMutation = useDeactivateUnit();

  // Filter units by search term
  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return units;
    const search = searchTerm.toLowerCase();
    return units.filter(
      (unit) => unit.cp365_unitname.toLowerCase().includes(search)
    );
  }, [units, searchTerm]);

  // Handlers
  const handleCreateUnit = () => {
    setEditingUnit(null);
    setShowUnitForm(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowUnitForm(true);
  };

  const handleDeactivateUnit = async (unit: Unit) => {
    if (window.confirm(`Are you sure you want to deactivate "${unit.cp365_unitname}"?`)) {
      try {
        await deactivateUnitMutation.mutateAsync(unit.cp365_unitid);
      } catch (error) {
        console.error('Failed to deactivate unit:', error);
        alert('Failed to deactivate unit. Please try again.');
      }
    }
  };

  const handleManageTeams = (unit: Unit) => {
    setSelectedUnitForTeams(unit);
    setShowTeamAssignment(true);
  };

  const handleFormClose = () => {
    setShowUnitForm(false);
    setEditingUnit(null);
  };

  const handleTeamAssignmentClose = () => {
    setShowTeamAssignment(false);
    setSelectedUnitForTeams(null);
  };

  return (
    <div className="flex h-screen flex-col bg-elevation-1">
      <Header title="Units Management" showBackButton onBack={() => window.history.back()} />

      <div className="flex flex-1 overflow-hidden">
        <SideNav isOpen={sideNavOpen} />

        <main className="flex flex-1 flex-col overflow-auto bg-white p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Units</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage organizational units within locations. Units group teams and staff for the hierarchical rota view.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {/* Location Selector */}
            <div className="relative min-w-[250px]">
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <div className="relative">
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  disabled={isLoadingLocations}
                  className="w-full appearance-none rounded-lg border border-border-grey bg-white py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100"
                >
                  <option value="">Select a location...</option>
                  {locations.map((loc) => (
                    <option key={loc.cp365_locationid} value={loc.cp365_locationid}>
                      {loc.cp365_locationname}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedLocationId}
                  className="w-full rounded-lg border border-border-grey py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Add Unit Button */}
            <div className="flex items-end">
              <button
                onClick={handleCreateUnit}
                disabled={!selectedLocationId}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Unit
              </button>
            </div>
          </div>

          {/* Content Area */}
          {!selectedLocationId ? (
            // No location selected
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Select a Location</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a location from the dropdown above to view and manage its units.
                </p>
              </div>
            </div>
          ) : isLoadingUnits ? (
            // Loading state
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-sm text-gray-500">Loading units...</p>
              </div>
            </div>
          ) : filteredUnits.length === 0 ? (
            // Empty state
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Layers className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {searchTerm ? 'No units found' : 'No units yet'}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm
                    ? 'Try adjusting your search term.'
                    : 'Create your first unit to start organizing teams.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateUnit}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Unit
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Units Table
            <div className="overflow-hidden rounded-lg border border-border-grey">
              <table className="w-full">
                <thead className="bg-elevation-1">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unit Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {filteredUnits.map((unit) => (
                    <tr key={unit.cp365_unitid} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Layers className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{unit.cp365_unitname}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            unit.statecode === 0
                              ? 'bg-success/10 text-success'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {unit.statecode === 0 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleManageTeams(unit)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
                            title="Manage Teams"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditUnit(unit)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
                            title="Edit Unit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivateUnit(unit)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-error"
                            title="Deactivate Unit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Info Box */}
          {selectedLocationId && filteredUnits.length > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">About Units</p>
                <p className="mt-1">
                  Units represent organizational groupings within a location (e.g., Dementia Unit, Ward A).
                  Teams can be assigned to units, and the rota view will group staff by Unit → Team → Staff.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Unit Form Modal */}
      {showUnitForm && (
        <UnitForm
          unit={editingUnit}
          locationId={selectedLocationId}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}

      {/* Team Assignment Modal */}
      {showTeamAssignment && selectedUnitForTeams && (
        <TeamUnitAssignment
          unit={selectedUnitForTeams}
          onClose={handleTeamAssignmentClose}
        />
      )}
    </div>
  );
}

