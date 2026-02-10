/**
 * Settings Store Tests
 * Tests for Zustand settings store actions and state management
 */

import { useSettingsStore } from './settingsStore';
import { act } from '@testing-library/react';

// Reset store between tests
beforeEach(() => {
  act(() => {
    useSettingsStore.setState({
      selectedLocationId: '',
      selectedSublocationId: '',
      lastViewMode: 'week',
      lastSelectedDate: '2026-02-10',
    });
  });
});

describe('settingsStore', () => {
  describe('initial state', () => {
    it('has empty location IDs', () => {
      const state = useSettingsStore.getState();
      expect(state.selectedLocationId).toBe('');
      expect(state.selectedSublocationId).toBe('');
    });

    it('defaults to week view mode', () => {
      const state = useSettingsStore.getState();
      expect(state.lastViewMode).toBe('week');
    });
  });

  describe('setSelectedLocationId', () => {
    it('updates the location ID', () => {
      act(() => {
        useSettingsStore.getState().setSelectedLocationId('loc-123');
      });
      expect(useSettingsStore.getState().selectedLocationId).toBe('loc-123');
    });
  });

  describe('setSelectedSublocationId', () => {
    it('updates the sublocation ID', () => {
      act(() => {
        useSettingsStore.getState().setSelectedSublocationId('sub-456');
      });
      expect(useSettingsStore.getState().selectedSublocationId).toBe('sub-456');
    });
  });

  describe('setLastViewMode', () => {
    it('updates the view mode', () => {
      act(() => {
        useSettingsStore.getState().setLastViewMode('day');
      });
      expect(useSettingsStore.getState().lastViewMode).toBe('day');
    });

    it('accepts all valid view modes', () => {
      const modes = ['day', 'week', 'month'] as const;
      for (const mode of modes) {
        act(() => {
          useSettingsStore.getState().setLastViewMode(mode);
        });
        expect(useSettingsStore.getState().lastViewMode).toBe(mode);
      }
    });
  });

  describe('setLastSelectedDate', () => {
    it('stores date as ISO date string', () => {
      const testDate = new Date(2026, 2, 15); // 15 March 2026
      act(() => {
        useSettingsStore.getState().setLastSelectedDate(testDate);
      });
      expect(useSettingsStore.getState().lastSelectedDate).toBe('2026-03-15');
    });
  });

  describe('setLocationAndSublocation', () => {
    it('updates both IDs in a single action', () => {
      act(() => {
        useSettingsStore.getState().setLocationAndSublocation('loc-abc', 'sub-xyz');
      });
      const state = useSettingsStore.getState();
      expect(state.selectedLocationId).toBe('loc-abc');
      expect(state.selectedSublocationId).toBe('sub-xyz');
    });
  });
});
