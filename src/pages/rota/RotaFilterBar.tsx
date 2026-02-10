/**
 * RotaFilterBar Component
 * Location/sublocation selectors and display option checkboxes.
 * Extracted from RotaView.tsx.
 */

import type { Location, Sublocation, Rota } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

interface RotaFilterBarProps {
  locations: Location[] | undefined;
  sublocations: Sublocation[] | undefined;
  selectedLocationId: string;
  selectedSublocationId: string;
  onLocationChange: (id: string) => void;
  onSublocationChange: (id: string) => void;
  isLoadingSublocations: boolean;
  showExternalStaff: boolean;
  showOtherRotaShifts: boolean;
  onShowExternalStaffChange: (checked: boolean) => void;
  onShowOtherRotaShiftsChange: (checked: boolean) => void;
  activeRota: Rota | undefined;
}

// =============================================================================
// Component
// =============================================================================

export function RotaFilterBar({
  locations,
  sublocations,
  selectedLocationId,
  selectedSublocationId,
  onLocationChange,
  onSublocationChange,
  isLoadingSublocations,
  showExternalStaff,
  showOtherRotaShifts,
  onShowExternalStaffChange,
  onShowOtherRotaShiftsChange,
  activeRota,
}: RotaFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
      {/* Location Selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="location" className="text-sm font-medium text-slate-700">
          Location:
        </label>
        <select
          id="location"
          value={selectedLocationId}
          onChange={(e) => onLocationChange(e.target.value)}
          className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select location...</option>
          {locations?.map((location) => (
            <option key={location.cp365_locationid} value={location.cp365_locationid}>
              {location.cp365_locationname}
            </option>
          ))}
        </select>
      </div>

      {/* Sublocation Selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="sublocation" className="text-sm font-medium text-slate-700">
          Sublocation:
        </label>
        <select
          id="sublocation"
          value={selectedSublocationId}
          onChange={(e) => onSublocationChange(e.target.value)}
          disabled={!selectedLocationId || isLoadingSublocations}
          className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <option value="">
            {isLoadingSublocations ? 'Loading...' : 'Select sublocation...'}
          </option>
          {sublocations?.map((sublocation) => (
            <option
              key={sublocation.cp365_sublocationid}
              value={sublocation.cp365_sublocationid}
            >
              {sublocation.cp365_sublocationname}
            </option>
          ))}
        </select>
      </div>

      {/* Show external staff checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showExternalStaff"
          checked={showExternalStaff}
          onChange={(e) => onShowExternalStaffChange(e.target.checked)}
          disabled={!selectedSublocationId}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label
          htmlFor="showExternalStaff"
          className={`text-sm ${!selectedSublocationId ? 'text-slate-400' : 'text-slate-700'}`}
          title="Show shifts for staff who are assigned to other sublocations but working on this rota"
        >
          External staff
        </label>
      </div>

      {/* Show shifts from other rotas checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showOtherRotaShifts"
          checked={showOtherRotaShifts}
          onChange={(e) => onShowOtherRotaShiftsChange(e.target.checked)}
          disabled={!selectedSublocationId}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label
          htmlFor="showOtherRotaShifts"
          className={`text-sm ${!selectedSublocationId ? 'text-slate-400' : 'text-slate-700'}`}
          title="Show shifts that staff have at other locations/rotas"
        >
          Shifts from other rotas
        </label>
      </div>

      {/* Rota info */}
      {activeRota && (
        <div className="ml-auto text-sm text-slate-500">
          Rota: <span className="font-medium text-slate-700">{activeRota.cp365_rotaname}</span>
        </div>
      )}
    </div>
  );
}
