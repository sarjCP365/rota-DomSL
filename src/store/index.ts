/**
 * Store Exports
 * Central export for all Zustand stores
 */

// Auth Store
export {
  useAuthStore,
  selectUserDisplayName,
  selectUserEmail,
  selectStaffMemberId,
  selectIsStaffMember,
  selectIsAuthReady,
  type AzureUser,
} from './authStore';

// Rota Store
export {
  useRotaStore,
  selectShiftCount,
  selectUnassignedCount,
  selectSelectedCount,
  selectIsFlyoutOpen,
  type StaffRow,
  type FlyoutMode,
} from './rotaStore';

// Settings Store
export {
  useSettingsStore,
  useLocationSettings,
  useViewPreferences,
  useSelectedLocationId,
  useSelectedSublocationId,
  useLastViewMode,
  useLastSelectedDate,
  type NavigationView,
} from './settingsStore';

// UI Store
export {
  useUIStore,
  selectIsSidebarVisible,
  selectNotificationCount,
  selectHasErrors,
  selectNotificationsByType,
  type Notification,
  type ModalConfig,
  type ConfirmDialogConfig,
} from './uiStore';
