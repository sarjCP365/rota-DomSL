/**
 * useRotaViewData Hook
 * Encapsulates all data fetching and state management for the RotaView page.
 * Extracted from RotaView.tsx to keep the page component focused on rendering.
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { startOfWeek, format, addWeeks, subWeeks, parseISO, isValid } from 'date-fns';
import { useLocations, useSublocations, useActiveRota } from '@/hooks/useLocations';
import { useRotaData } from '@/hooks/useRotaData';
import { useShiftReferences } from '@/hooks/useShifts';
import { useHierarchicalRotaData } from '@/hooks/useHierarchicalRotaData';
import { useRotaStore } from '@/store/rotaStore';
import {
  useLocationSettings,
  useViewPreferences,
  type NavigationView,
} from '@/store/settingsStore';
import type { ShiftViewData } from '@/api/dataverse/types';

// =============================================================================
// Helpers
// =============================================================================

function getCurrentMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

function getMondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function parseDateFromUrl(dateStr: string | null): Date {
  if (!dateStr) return getCurrentMonday();
  const parsed = parseISO(dateStr);
  if (isValid(parsed)) {
    return getMondayOfWeek(parsed);
  }
  return getCurrentMonday();
}

// =============================================================================
// Flyout State
// =============================================================================

export interface FlyoutState {
  flyoutOpen: boolean;
  flyoutMode: 'view' | 'edit' | 'create';
  selectedShift: ShiftViewData | undefined;
  createShiftDate: Date | undefined;
  createShiftStaffId: string | undefined;
  createShiftReferenceId: string | undefined;
}

// =============================================================================
// Hook
// =============================================================================

export function useRotaViewData() {
  const { duration: durationParam } = useParams<{ duration: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // View mode state from rota store (grid layout: team/people/shiftReference)
  const viewMode = useRotaStore((state) => state.viewMode);
  const detailLevel = useRotaStore((state) => state.detailLevel);
  const setViewMode = useRotaStore((state) => state.setViewMode);
  const setDetailLevel = useRotaStore((state) => state.setDetailLevel);

  // Location/Sublocation from shared settings store (persisted across views)
  const {
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
  } = useLocationSettings();

  // View preferences from shared store
  const { setLastViewMode, setLastSelectedDate } = useViewPreferences();

  // Parse duration from URL
  const initialDuration = parseInt(durationParam || '7', 10) as 7 | 14 | 28;
  const validDuration = [7, 14, 28].includes(initialDuration) ? initialDuration : 7;

  // Navigation view mode (day/week/month) derived from URL duration
  const navigationView: NavigationView = validDuration === 28 ? 'month' : 'week';

  // Date state — from URL or current week
  const [weekStart, setWeekStartState] = useState<Date>(() =>
    parseDateFromUrl(searchParams.get('date'))
  );
  // Duration is derived directly from the URL — no separate state needed
  const duration = validDuration;

  // Simple wrapper — just updates React state.
  // Preference syncing is handled by the useEffect below.
  const setWeekStart = useCallback((date: Date | ((prev: Date) => Date)) => {
    setWeekStartState(date);
  }, []);

  // Sync weekStart to the preferences store *after* render (avoids setState-during-render)
  useEffect(() => {
    setLastSelectedDate(weekStart);
  }, [weekStart, setLastSelectedDate]);

  // Selection state
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  // Flyout state
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutMode, setFlyoutMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selectedShift, setSelectedShift] = useState<ShiftViewData | undefined>();
  const [createShiftDate, setCreateShiftDate] = useState<Date | undefined>();
  const [createShiftStaffId, setCreateShiftStaffId] = useState<string | undefined>();
  const [createShiftReferenceId, setCreateShiftReferenceId] = useState<string | undefined>();

  // Display options
  const [showExternalStaff, setShowExternalStaff] = useState(false);
  const [showOtherRotaShifts, setShowOtherRotaShifts] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  const { data: sublocations, isLoading: isLoadingSublocations } = useSublocations(
    selectedLocationId || undefined
  );

  const { data: activeRota, isLoading: isLoadingActiveRota } = useActiveRota(
    selectedSublocationId || undefined
  );

  const {
    data: rotaData,
    isLoading: isLoadingRota,
    refetch: refetchRota,
    isFetching: isFetchingRota,
  } = useRotaData({
    sublocationId: selectedSublocationId || undefined,
    startDate: weekStart,
    duration,
    rotaId: activeRota?.cp365_rotaid,
    enabled: !!selectedSublocationId,
    showExternalStaff,
    showOtherRotaShifts,
  });

  const { data: shiftReferences = [] } = useShiftReferences(
    selectedSublocationId || undefined,
    selectedLocationId || undefined
  );

  const { data: hierarchicalData, isLoading: isLoadingHierarchical } = useHierarchicalRotaData({
    locationId: selectedLocationId || undefined,
    sublocationId: selectedSublocationId || undefined,
    rotaId: activeRota?.cp365_rotaid,
    startDate: weekStart,
    duration,
    enabled: viewMode === 'team' && !!selectedLocationId && !!selectedSublocationId,
  });

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Auto-select location
  useEffect(() => {
    if (!locations?.length) return;
    const savedLocationExists =
      selectedLocationId && locations.some((loc) => loc.cp365_locationid === selectedLocationId);
    if (!savedLocationExists) {
      setSelectedLocationId(locations[0].cp365_locationid);
    }
  }, [locations, selectedLocationId, setSelectedLocationId]);

  // Auto-select sublocation
  useEffect(() => {
    if (!sublocations?.length) {
      if (selectedSublocationId) {
        setSelectedSublocationId('');
      }
      return;
    }
    const savedSublocationExists =
      selectedSublocationId &&
      sublocations.some((sub) => sub.cp365_sublocationid === selectedSublocationId);
    if (!savedSublocationExists) {
      setSelectedSublocationId(sublocations[0].cp365_sublocationid);
    }
  }, [sublocations, selectedSublocationId, setSelectedSublocationId]);

  // Duration is derived from URL in validDuration above — no sync needed

  // Keep URL in sync with date
  useEffect(() => {
    const dateStr = format(weekStart, 'yyyy-MM-dd');
    const currentDateInUrl = searchParams.get('date');
    if (currentDateInUrl !== dateStr) {
      void navigate(`/rota/${duration}?date=${dateStr}`, { replace: true });
    }
  }, [weekStart, duration, navigate, searchParams]);

  // Save navigation view preference
  useEffect(() => {
    setLastViewMode(navigationView);
  }, [navigationView, setLastViewMode]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePreviousWeek = useCallback(() => {
    setWeekStart((prev) => subWeeks(prev, duration === 28 ? 4 : duration === 14 ? 2 : 1));
  }, [duration, setWeekStart]);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => addWeeks(prev, duration === 28 ? 4 : duration === 14 ? 2 : 1));
  }, [duration, setWeekStart]);

  const handleToday = useCallback(() => {
    setWeekStart(getCurrentMonday());
  }, [setWeekStart]);

  const handleRefresh = useCallback(() => {
    void refetchRota();
  }, [refetchRota]);

  const handleShiftClick = useCallback((shift: ShiftViewData) => {
    setSelectedShift(shift);
    const isUnassigned = !shift['Staff Member ID'];
    setFlyoutMode(isUnassigned ? 'edit' : 'view');
    setFlyoutOpen(true);
  }, []);

  const handleCellClick = useCallback((date: Date, staffMemberId: string | null) => {
    setSelectedShift(undefined);
    setCreateShiftDate(date);
    setCreateShiftStaffId(staffMemberId || undefined);
    setCreateShiftReferenceId(undefined);
    setFlyoutMode('create');
    setFlyoutOpen(true);
  }, []);

  const handleAddShift = useCallback((shiftReferenceId: string, date: Date) => {
    setSelectedShift(undefined);
    setCreateShiftDate(date);
    setCreateShiftStaffId(undefined);
    setCreateShiftReferenceId(shiftReferenceId);
    setFlyoutMode('create');
    setFlyoutOpen(true);
  }, []);

  const handleSelectionChange = useCallback((shiftIds: Set<string>) => {
    setSelectedShiftIds(shiftIds);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedShiftIds(new Set());
  }, []);

  const handleOpenCreateFlyout = useCallback(() => {
    setSelectedShift(undefined);
    setFlyoutMode('create');
    setFlyoutOpen(true);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setSelectedShift(undefined);
    setCreateShiftDate(undefined);
    setCreateShiftStaffId(undefined);
    setCreateShiftReferenceId(undefined);
  }, []);

  // Copy Week dialog state
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);

  const handleCopyWeek = useCallback(() => {
    setCopyWeekOpen(true);
  }, []);

  const handleCloseCopyWeek = useCallback(() => {
    setCopyWeekOpen(false);
  }, []);

  const handleExportPDF = useCallback(() => {
    // TODO: Implement PDF export
  }, []);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const pageTitle =
    duration === 7 ? 'Weekly Rota' : duration === 14 ? '2-Week Rota' : 'Monthly Rota';

  return {
    // Location
    locations,
    sublocations,
    selectedLocationId,
    selectedSublocationId,
    setSelectedLocationId,
    setSelectedSublocationId,
    isLoadingLocations,
    isLoadingSublocations,

    // Rota
    activeRota,
    isLoadingActiveRota,
    rotaData,
    isLoadingRota,
    isFetchingRota,
    shiftReferences,
    hierarchicalData,
    isLoadingHierarchical,

    // View
    viewMode,
    detailLevel,
    setViewMode,
    setDetailLevel,
    navigationView,
    pageTitle,

    // Date
    weekStart,
    duration,

    // Selection
    selectedShiftIds,

    // Flyout
    flyoutOpen,
    flyoutMode,
    selectedShift,
    createShiftDate,
    createShiftStaffId,
    createShiftReferenceId,

    // Display options
    showExternalStaff,
    showOtherRotaShifts,
    setShowExternalStaff,
    setShowOtherRotaShifts,

    // Handlers
    handlePreviousWeek,
    handleNextWeek,
    handleToday,
    handleRefresh,
    handleShiftClick,
    handleCellClick,
    handleAddShift,
    handleSelectionChange,
    handleClearSelection,
    handleOpenCreateFlyout,
    handleCloseFlyout,
    handleCopyWeek,
    handleCloseCopyWeek,
    handleExportPDF,

    // Copy Week dialog
    copyWeekOpen,
  };
}
