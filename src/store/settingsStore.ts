/**
 * Settings Store
 * Shared store for app-wide settings that persist across views
 * Handles location, sublocation, and view preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

/**
 * Navigation view mode — which time-period view the user is on.
 * Distinct from RotaStore's ViewMode which controls grid layout
 * (team/people/shiftReference).
 */
export type NavigationView = 'day' | 'week' | 'month';

interface SettingsState {
  // Location settings
  selectedLocationId: string;
  selectedSublocationId: string;

  // View preferences
  lastViewMode: NavigationView;
  lastSelectedDate: string; // ISO date string

  // Actions
  setSelectedLocationId: (id: string) => void;
  setSelectedSublocationId: (id: string) => void;
  setLastViewMode: (mode: NavigationView) => void;
  setLastSelectedDate: (date: Date) => void;

  // Batch update
  setLocationAndSublocation: (locationId: string, sublocationId: string) => void;
}

// =============================================================================
// Store
// =============================================================================

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      selectedLocationId: '',
      selectedSublocationId: '',
      lastViewMode: 'week',
      lastSelectedDate: new Date().toISOString().split('T')[0],

      // Actions
      setSelectedLocationId: (id) => set({ selectedLocationId: id }),

      setSelectedSublocationId: (id) => set({ selectedSublocationId: id }),

      setLastViewMode: (mode) => set({ lastViewMode: mode }),

      setLastSelectedDate: (date) =>
        set({
          lastSelectedDate: date.toISOString().split('T')[0],
        }),

      setLocationAndSublocation: (locationId, sublocationId) =>
        set({
          selectedLocationId: locationId,
          selectedSublocationId: sublocationId,
        }),
    }),
    {
      name: 'carepoint-settings',
      // Only persist these fields
      partialize: (state) => ({
        selectedLocationId: state.selectedLocationId,
        selectedSublocationId: state.selectedSublocationId,
        lastViewMode: state.lastViewMode,
        lastSelectedDate: state.lastSelectedDate,
      }),
    }
  )
);

// =============================================================================
// Selectors (for performance optimisation)
// =============================================================================

export const useSelectedLocationId = () => useSettingsStore((state) => state.selectedLocationId);

export const useSelectedSublocationId = () =>
  useSettingsStore((state) => state.selectedSublocationId);

export const useLastViewMode = () => useSettingsStore((state) => state.lastViewMode);

export const useLastSelectedDate = () => useSettingsStore((state) => state.lastSelectedDate);

// =============================================================================
// Helper hooks
// =============================================================================

/**
 * Hook to get location settings with actions
 */
export function useLocationSettings() {
  const selectedLocationId = useSettingsStore((s) => s.selectedLocationId);
  const selectedSublocationId = useSettingsStore((s) => s.selectedSublocationId);
  const setSelectedLocationId = useSettingsStore((s) => s.setSelectedLocationId);
  const setSelectedSublocationId = useSettingsStore((s) => s.setSelectedSublocationId);
  const setLocationAndSublocation = useSettingsStore((s) => s.setLocationAndSublocation);

  return {
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
    setLocationAndSublocation,
  };
}

/**
 * Hook to get view preferences with actions
 */
export function useViewPreferences() {
  const lastViewMode = useSettingsStore((s) => s.lastViewMode);
  const lastSelectedDate = useSettingsStore((s) => s.lastSelectedDate);
  const setLastViewMode = useSettingsStore((s) => s.setLastViewMode);
  const setLastSelectedDate = useSettingsStore((s) => s.setLastSelectedDate);

  return {
    lastViewMode,
    lastSelectedDate,
    setLastViewMode,
    setLastSelectedDate,
  };
}

export default useSettingsStore;
