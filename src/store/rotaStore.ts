/**
 * Rota Store
 * Rota-specific state using Zustand
 * Based on specification section 10.1 and 10.2
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { startOfWeek } from 'date-fns';
import type { 
  Location, 
  Sublocation, 
  Rota,
  ShiftViewData,
  SublocationStaffViewData,
  StaffAbsenceLog,
} from '../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * View mode for the rota grid
 * - team: Hierarchical view grouped by Unit > Team > Staff
 * - people: Flat list of staff members (current/existing view)
 * - shiftReference: Grouped by shift pattern/type for coverage planning
 */
export type ViewMode = 'team' | 'people' | 'shiftReference';

/**
 * Detail level for the rota grid
 * - detailed: Shows all information (default)
 * - compact: Minimal information
 * - hoursOnly: Just hours, no details
 */
export type DetailLevel = 'detailed' | 'compact' | 'hoursOnly';

/**
 * Processed staff row for the grid
 */
export interface StaffRow {
  staffMemberId: string;
  staffMemberName: string;
  jobTitle: string | null;
  department: string | null;
  staffTeams: string[];
  contractEndDate: string | null;
}

/**
 * Flyout mode type
 */
export type FlyoutMode = 'view' | 'edit' | 'create' | null;

/**
 * Rota state interface
 */
interface RotaState {
  // =========================================================================
  // LOCATION SELECTION
  // =========================================================================
  
  /** Selected location */
  selectedLocation: Location | null;
  
  /** Selected sublocation */
  selectedSublocation: Sublocation | null;
  
  /** Selected/active rota */
  selectedRota: Rota | null;

  // =========================================================================
  // DATE CONTEXT
  // =========================================================================
  
  /** Selected start date (should be a Monday) */
  selectedDate: Date;
  
  /** View duration in days */
  duration: 7 | 14 | 28;

  // =========================================================================
  // VIEW MODE
  // =========================================================================
  
  /** View mode (team hierarchy, people flat list, or shift reference coverage) */
  viewMode: ViewMode;
  
  /** Detail level (detailed, compact, or hours only) */
  detailLevel: DetailLevel;

  // =========================================================================
  // GRID DATA
  // =========================================================================
  
  /** Shifts from BuildNewRotaView flow */
  shifts: ShiftViewData[];
  
  /** Staff members from sublocationstaff response */
  staff: SublocationStaffViewData[];
  
  /** Processed staff rows for display */
  staffRows: StaffRow[];
  
  /** Staff absences (TAFW) */
  absences: StaffAbsenceLog[];
  
  /** Shifts from other rotas (dual-location) */
  otherRotaShifts: ShiftViewData[];

  // =========================================================================
  // SELECTION STATE
  // =========================================================================
  
  /** Currently selected shift IDs */
  selectedShiftIds: Set<string>;
  
  /** Shift ID for the flyout */
  flyoutShiftId: string | null;
  
  /** Flyout mode */
  flyoutMode: FlyoutMode;
  
  /** Cell being edited (for create mode) */
  flyoutCellData: {
    date: Date;
    staffMemberId: string | null;
  } | null;

  // =========================================================================
  // LOADING STATES
  // =========================================================================
  
  /** Whether rota data is loading */
  isLoadingRota: boolean;
  
  /** Whether absences are loading */
  isLoadingAbsences: boolean;
  
  /** Last data fetch timestamp */
  lastFetchTime: number | null;

  // =========================================================================
  // ACTIONS - LOCATION
  // =========================================================================
  
  /** Set selected location (clears sublocation and rota) */
  setLocation: (location: Location | null) => void;
  
  /** Set selected sublocation (clears rota) */
  setSublocation: (sublocation: Sublocation | null) => void;
  
  /** Set selected rota */
  setRota: (rota: Rota | null) => void;

  // =========================================================================
  // ACTIONS - DATE
  // =========================================================================
  
  /** Set selected date */
  setDate: (date: Date) => void;
  
  /** Set view duration */
  setDuration: (duration: 7 | 14 | 28) => void;
  
  /** Navigate to previous period */
  goToPreviousPeriod: () => void;
  
  /** Navigate to next period */
  goToNextPeriod: () => void;
  
  /** Go to current week */
  goToToday: () => void;

  // =========================================================================
  // ACTIONS - VIEW MODE
  // =========================================================================
  
  /** Set view mode */
  setViewMode: (mode: ViewMode) => void;
  
  /** Set detail level */
  setDetailLevel: (level: DetailLevel) => void;

  // =========================================================================
  // ACTIONS - GRID DATA
  // =========================================================================
  
  /** Set shifts data */
  setShifts: (shifts: ShiftViewData[]) => void;
  
  /** Set staff data */
  setStaff: (staff: SublocationStaffViewData[]) => void;
  
  /** Set absences data */
  setAbsences: (absences: StaffAbsenceLog[]) => void;
  
  /** Set other rota shifts */
  setOtherRotaShifts: (shifts: ShiftViewData[]) => void;
  
  /** Set loading state */
  setLoadingRota: (isLoading: boolean) => void;
  
  /** Clear all rota data */
  clearRotaData: () => void;

  // =========================================================================
  // ACTIONS - SELECTION
  // =========================================================================
  
  /** Select a single shift */
  selectShift: (shiftId: string) => void;
  
  /** Deselect a shift */
  deselectShift: (shiftId: string) => void;
  
  /** Toggle shift selection */
  toggleShiftSelection: (shiftId: string) => void;
  
  /** Clear all selections */
  clearSelection: () => void;
  
  /** Select all shifts */
  selectAllShifts: () => void;
  
  /** Select shifts by staff member */
  selectShiftsByStaff: (staffMemberId: string) => void;

  // =========================================================================
  // ACTIONS - FLYOUT
  // =========================================================================
  
  /** Open flyout for viewing/editing a shift */
  openFlyout: (shiftId: string, mode: 'view' | 'edit') => void;
  
  /** Open flyout for creating a new shift */
  openCreateFlyout: (date: Date, staffMemberId: string | null) => void;
  
  /** Close flyout */
  closeFlyout: () => void;
  
  /** Set flyout mode */
  setFlyoutMode: (mode: FlyoutMode) => void;

  // =========================================================================
  // COMPUTED
  // =========================================================================
  
  /** Get selected shifts */
  getSelectedShifts: () => ShiftViewData[];
  
  /** Get unassigned shifts */
  getUnassignedShifts: () => ShiftViewData[];
  
  /** Get shifts for a staff member */
  getShiftsForStaff: (staffMemberId: string) => ShiftViewData[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Monday of the current week
 */
function getCurrentMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

/**
 * Process staff data into rows
 */
function processStaffRows(staff: SublocationStaffViewData[]): StaffRow[] {
  return staff.map((s) => ({
    staffMemberId: s['Staff Member ID'],
    staffMemberName: s['Staff Member Name'],
    jobTitle: s['Job Title Name'],
    department: s['Department'],
    staffTeams: s['Staff Teams'] || [],
    contractEndDate: s['Contract End Date'],
  }));
}

// =============================================================================
// STORE
// =============================================================================

export const useRotaStore = create<RotaState>()(
  persist(
    (set, get) => ({
      // Initial state - Location
      selectedLocation: null,
      selectedSublocation: null,
      selectedRota: null,

      // Initial state - Date
      selectedDate: getCurrentMonday(),
      duration: 7,

      // Initial state - View Mode
      viewMode: 'people',
      detailLevel: 'detailed',

      // Initial state - Grid data
      shifts: [],
      staff: [],
      staffRows: [],
      absences: [],
      otherRotaShifts: [],

      // Initial state - Selection
      selectedShiftIds: new Set(),
      flyoutShiftId: null,
      flyoutMode: null,
      flyoutCellData: null,

      // Initial state - Loading
      isLoadingRota: false,
      isLoadingAbsences: false,
      lastFetchTime: null,

      // =====================================================================
      // LOCATION ACTIONS
      // =====================================================================

      setLocation: (location) =>
        set({
          selectedLocation: location,
          selectedSublocation: null,
          selectedRota: null,
          shifts: [],
          staff: [],
          staffRows: [],
          selectedShiftIds: new Set(),
        }),

      setSublocation: (sublocation) =>
        set({
          selectedSublocation: sublocation,
          selectedRota: null,
          shifts: [],
          staff: [],
          staffRows: [],
          selectedShiftIds: new Set(),
        }),

      setRota: (rota) => set({ selectedRota: rota }),

      // =====================================================================
      // DATE ACTIONS
      // =====================================================================

      setDate: (date) => set({ selectedDate: date }),

      setDuration: (duration) => set({ duration }),

      goToPreviousPeriod: () => {
        const { selectedDate, duration } = get();
        const days = duration === 28 ? 28 : duration === 14 ? 14 : 7;
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - days);
        set({ selectedDate: newDate });
      },

      goToNextPeriod: () => {
        const { selectedDate, duration } = get();
        const days = duration === 28 ? 28 : duration === 14 ? 14 : 7;
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        set({ selectedDate: newDate });
      },

      goToToday: () => set({ selectedDate: getCurrentMonday() }),

      // =====================================================================
      // VIEW MODE ACTIONS
      // =====================================================================

      setViewMode: (viewMode) => set({ viewMode }),

      setDetailLevel: (detailLevel) => set({ detailLevel }),

      // =====================================================================
      // GRID DATA ACTIONS
      // =====================================================================

      setShifts: (shifts) => set({ shifts, lastFetchTime: Date.now() }),

      setStaff: (staff) =>
        set({
          staff,
          staffRows: processStaffRows(staff),
        }),

      setAbsences: (absences) => set({ absences, isLoadingAbsences: false }),

      setOtherRotaShifts: (shifts) => set({ otherRotaShifts: shifts }),

      setLoadingRota: (isLoadingRota) => set({ isLoadingRota }),

      clearRotaData: () =>
        set({
          shifts: [],
          staff: [],
          staffRows: [],
          absences: [],
          otherRotaShifts: [],
          selectedShiftIds: new Set(),
          lastFetchTime: null,
        }),

      // =====================================================================
      // SELECTION ACTIONS
      // =====================================================================

      selectShift: (shiftId) =>
        set((state) => ({
          selectedShiftIds: new Set([...state.selectedShiftIds, shiftId]),
        })),

      deselectShift: (shiftId) =>
        set((state) => {
          const newSet = new Set(state.selectedShiftIds);
          newSet.delete(shiftId);
          return { selectedShiftIds: newSet };
        }),

      toggleShiftSelection: (shiftId) =>
        set((state) => {
          const newSet = new Set(state.selectedShiftIds);
          if (newSet.has(shiftId)) {
            newSet.delete(shiftId);
          } else {
            newSet.add(shiftId);
          }
          return { selectedShiftIds: newSet };
        }),

      clearSelection: () => set({ selectedShiftIds: new Set() }),

      selectAllShifts: () =>
        set((state) => ({
          selectedShiftIds: new Set(state.shifts.map((s) => s['Shift ID'])),
        })),

      selectShiftsByStaff: (staffMemberId) =>
        set((state) => ({
          selectedShiftIds: new Set(
            state.shifts
              .filter((s) => s['Staff Member ID'] === staffMemberId)
              .map((s) => s['Shift ID'])
          ),
        })),

      // =====================================================================
      // FLYOUT ACTIONS
      // =====================================================================

      openFlyout: (shiftId, mode) =>
        set({
          flyoutShiftId: shiftId,
          flyoutMode: mode,
          flyoutCellData: null,
        }),

      openCreateFlyout: (date, staffMemberId) =>
        set({
          flyoutShiftId: null,
          flyoutMode: 'create',
          flyoutCellData: { date, staffMemberId },
        }),

      closeFlyout: () =>
        set({
          flyoutShiftId: null,
          flyoutMode: null,
          flyoutCellData: null,
        }),

      setFlyoutMode: (mode) => set({ flyoutMode: mode }),

      // =====================================================================
      // COMPUTED / GETTERS
      // =====================================================================

      getSelectedShifts: () => {
        const { shifts, selectedShiftIds } = get();
        return shifts.filter((s) => selectedShiftIds.has(s['Shift ID']));
      },

      getUnassignedShifts: () => {
        const { shifts } = get();
        return shifts.filter((s) => !s['Staff Member ID']);
      },

      getShiftsForStaff: (staffMemberId) => {
        const { shifts } = get();
        return shifts.filter((s) => s['Staff Member ID'] === staffMemberId);
      },
    }),
    {
      name: 'carepoint-rota',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist location selection, date, and view preferences - not data
        selectedLocation: state.selectedLocation,
        selectedSublocation: state.selectedSublocation,
        selectedDate: state.selectedDate,
        duration: state.duration,
        viewMode: state.viewMode,
        detailLevel: state.detailLevel,
      }),
      // Handle Set serialisation
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<RotaState>),
        // Ensure selectedShiftIds is a Set
        selectedShiftIds: new Set(),
        // Convert date string back to Date
        selectedDate: persisted && typeof (persisted as RotaState).selectedDate === 'string'
          ? new Date((persisted as RotaState).selectedDate)
          : current.selectedDate,
      }),
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Check if location is selected
 */
export const selectHasLocation = (state: RotaState): boolean => {
  return !!state.selectedLocation && !!state.selectedSublocation;
};

/**
 * Get total shift count
 */
export const selectShiftCount = (state: RotaState): number => {
  return state.shifts.length;
};

/**
 * Get unassigned shift count
 */
export const selectUnassignedCount = (state: RotaState): number => {
  return state.shifts.filter((s) => !s['Staff Member ID']).length;
};

/**
 * Get selected shift count
 */
export const selectSelectedCount = (state: RotaState): number => {
  return state.selectedShiftIds.size;
};

/**
 * Check if flyout is open
 */
export const selectIsFlyoutOpen = (state: RotaState): boolean => {
  return state.flyoutMode !== null;
};
