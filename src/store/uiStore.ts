/**
 * UI Store
 * Global UI state using Zustand
 * Based on specification section 10.1
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Notification type
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  id: string;
  title?: string;
  data?: unknown;
}

/**
 * Confirmation dialog configuration
 */
export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * UI state interface
 */
interface UIState {
  // =========================================================================
  // NAVIGATION
  // =========================================================================
  
  /** Whether sidebar is open (desktop: always, mobile: toggleable) */
  sidebarOpen: boolean;
  
  /** Whether sidebar is collapsed (desktop only) */
  sidebarCollapsed: boolean;

  // =========================================================================
  // LOADING STATES
  // =========================================================================
  
  /** Global loading overlay */
  isLoading: boolean;
  
  /** Loading message */
  loadingMessage: string;
  
  /** Map of loading states by key */
  loadingStates: Map<string, boolean>;

  // =========================================================================
  // MODALS
  // =========================================================================
  
  /** Currently active modal */
  activeModal: ModalConfig | null;
  
  /** Confirmation dialog state */
  confirmDialog: ConfirmDialogConfig | null;

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  
  /** Active notifications */
  notifications: Notification[];

  // =========================================================================
  // PREFERENCES
  // =========================================================================
  
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  
  /** Compact mode for dense data display */
  compactMode: boolean;
  
  /** Show weekend columns */
  showWeekends: boolean;

  // =========================================================================
  // ACTIONS - NAVIGATION
  // =========================================================================
  
  /** Toggle sidebar open/closed */
  toggleSidebar: () => void;
  
  /** Set sidebar open state */
  setSidebarOpen: (open: boolean) => void;
  
  /** Toggle sidebar collapsed (desktop) */
  toggleSidebarCollapsed: () => void;

  // =========================================================================
  // ACTIONS - LOADING
  // =========================================================================
  
  /** Set global loading state */
  setLoading: (isLoading: boolean, message?: string) => void;
  
  /** Set named loading state */
  setLoadingState: (key: string, isLoading: boolean) => void;
  
  /** Check if any loading state is active */
  isAnyLoading: () => boolean;

  // =========================================================================
  // ACTIONS - MODALS
  // =========================================================================
  
  /** Open a modal */
  openModal: (config: ModalConfig) => void;
  
  /** Close the active modal */
  closeModal: () => void;
  
  /** Show confirmation dialog */
  showConfirmDialog: (config: ConfirmDialogConfig) => void;
  
  /** Close confirmation dialog */
  closeConfirmDialog: () => void;

  // =========================================================================
  // ACTIONS - NOTIFICATIONS
  // =========================================================================
  
  /** Add a notification */
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  
  /** Remove a notification */
  removeNotification: (id: string) => void;
  
  /** Clear all notifications */
  clearNotifications: () => void;
  
  /** Helper: Show success notification */
  showSuccess: (title: string, message?: string) => void;
  
  /** Helper: Show error notification */
  showError: (title: string, message?: string) => void;
  
  /** Helper: Show warning notification */
  showWarning: (title: string, message?: string) => void;
  
  /** Helper: Show info notification */
  showInfo: (title: string, message?: string) => void;

  // =========================================================================
  // ACTIONS - PREFERENCES
  // =========================================================================
  
  /** Set theme */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  /** Toggle compact mode */
  toggleCompactMode: () => void;
  
  /** Toggle show weekends */
  toggleShowWeekends: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state - Navigation
      sidebarOpen: false,
      sidebarCollapsed: false,

      // Initial state - Loading
      isLoading: false,
      loadingMessage: 'Loading...',
      loadingStates: new Map(),

      // Initial state - Modals
      activeModal: null,
      confirmDialog: null,

      // Initial state - Notifications
      notifications: [],

      // Initial state - Preferences
      theme: 'light',
      compactMode: false,
      showWeekends: true,

      // =====================================================================
      // NAVIGATION ACTIONS
      // =====================================================================

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // =====================================================================
      // LOADING ACTIONS
      // =====================================================================

      setLoading: (isLoading, message = 'Loading...') =>
        set({ isLoading, loadingMessage: message }),

      setLoadingState: (key, isLoading) =>
        set((state) => {
          const newStates = new Map(state.loadingStates);
          if (isLoading) {
            newStates.set(key, true);
          } else {
            newStates.delete(key);
          }
          return { loadingStates: newStates };
        }),

      isAnyLoading: () => {
        const { isLoading, loadingStates } = get();
        return isLoading || loadingStates.size > 0;
      },

      // =====================================================================
      // MODAL ACTIONS
      // =====================================================================

      openModal: (config) => set({ activeModal: config }),

      closeModal: () => set({ activeModal: null }),

      showConfirmDialog: (config) => set({ confirmDialog: config }),

      closeConfirmDialog: () => set({ confirmDialog: null }),

      // =====================================================================
      // NOTIFICATION ACTIONS
      // =====================================================================

      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          dismissible: notification.dismissible ?? true,
          duration: notification.duration ?? 5000,
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-dismiss after duration
        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      showSuccess: (title, message) => {
        get().addNotification({ type: 'success', title, message });
      },

      showError: (title, message) => {
        get().addNotification({ type: 'error', title, message, duration: 8000 });
      },

      showWarning: (title, message) => {
        get().addNotification({ type: 'warning', title, message });
      },

      showInfo: (title, message) => {
        get().addNotification({ type: 'info', title, message });
      },

      // =====================================================================
      // PREFERENCE ACTIONS
      // =====================================================================

      setTheme: (theme) => set({ theme }),

      toggleCompactMode: () =>
        set((state) => ({ compactMode: !state.compactMode })),

      toggleShowWeekends: () =>
        set((state) => ({ showWeekends: !state.showWeekends })),
    }),
    {
      name: 'carepoint-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist preferences
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        compactMode: state.compactMode,
        showWeekends: state.showWeekends,
      }),
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Check if sidebar is visible (open on mobile or not collapsed on desktop)
 */
export const selectIsSidebarVisible = (state: UIState): boolean => {
  // On mobile (sidebarOpen controls visibility)
  // On desktop, sidebar is always visible but may be collapsed
  return state.sidebarOpen || !state.sidebarCollapsed;
};

/**
 * Get active notifications count
 */
export const selectNotificationCount = (state: UIState): number => {
  return state.notifications.length;
};

/**
 * Check if there are any error notifications
 */
export const selectHasErrors = (state: UIState): boolean => {
  return state.notifications.some((n) => n.type === 'error');
};

/**
 * Get notifications by type
 */
export const selectNotificationsByType = (
  state: UIState,
  type: Notification['type']
): Notification[] => {
  return state.notifications.filter((n) => n.type === type);
};
