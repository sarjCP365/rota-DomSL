/**
 * Auth Store
 * Global authentication state using Zustand
 * Based on specification section 10.1
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StaffMember } from '../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Azure AD user account information from MSAL
 */
export interface AzureUser {
  /** Azure AD object ID */
  id: string;
  /** Display name */
  name: string;
  /** Email address */
  email: string;
  /** Username (usually email) */
  username: string;
}

/**
 * Authentication state interface
 */
interface AuthState {
  // =========================================================================
  // STATE
  // =========================================================================
  
  /** Azure AD user (from MSAL) */
  azureUser: AzureUser | null;
  
  /** CarePoint staff member record (from Dataverse) */
  staffMember: StaffMember | null;
  
  /** Current access token for API calls */
  accessToken: string | null;
  
  /** Token expiry timestamp */
  tokenExpiry: number | null;
  
  /** Whether user is authenticated with Azure AD */
  isAuthenticated: boolean;
  
  /** Whether auth is initialising */
  isLoading: boolean;
  
  /** Whether staff member is being loaded */
  isLoadingStaffMember: boolean;
  
  /** Whether the Dataverse client is initialised and ready */
  isDataverseReady: boolean;
  
  /** Authentication error message */
  error: string | null;

  // =========================================================================
  // ACTIONS
  // =========================================================================
  
  /** Set Azure AD user after login */
  setAzureUser: (user: AzureUser | null) => void;
  
  /** Set CarePoint staff member after Dataverse lookup */
  setStaffMember: (staffMember: StaffMember | null) => void;
  
  /** Set access token for API calls */
  setAccessToken: (token: string | null, expiresAt?: number) => void;
  
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  
  /** Set staff member loading state */
  setLoadingStaffMember: (isLoading: boolean) => void;
  
  /** Set error message */
  setError: (error: string | null) => void;
  
  /** Set Dataverse client ready state */
  setDataverseReady: (isReady: boolean) => void;
  
  /** Clear all auth state (logout) */
  logout: () => void;
  
  /** Check if token is expired */
  isTokenExpired: () => boolean;
}

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      azureUser: null,
      staffMember: null,
      accessToken: null,
      tokenExpiry: null,
      isAuthenticated: false,
      isLoading: true,
      isLoadingStaffMember: false,
      isDataverseReady: false,
      error: null,

      // Actions
      setAzureUser: (azureUser) =>
        set({
          azureUser,
          isAuthenticated: !!azureUser,
          error: null,
        }),

      setStaffMember: (staffMember) =>
        set({
          staffMember,
          isLoadingStaffMember: false,
        }),

      setAccessToken: (accessToken, expiresAt) =>
        set({
          accessToken,
          tokenExpiry: expiresAt || null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setLoadingStaffMember: (isLoadingStaffMember) => set({ isLoadingStaffMember }),

      setError: (error) =>
        set({ error, isLoading: false }),

      setDataverseReady: (isDataverseReady) =>
        set({ isDataverseReady }),

      logout: () =>
        set({
          azureUser: null,
          staffMember: null,
          accessToken: null,
          tokenExpiry: null,
          isAuthenticated: false,
          isLoading: false,
          isLoadingStaffMember: false,
          isDataverseReady: false,
          error: null,
        }),

      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        // Add 5 minute buffer
        return Date.now() > tokenExpiry - 5 * 60 * 1000;
      },
    }),
    {
      name: 'carepoint-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist basic user info, not tokens
        azureUser: state.azureUser,
        staffMember: state.staffMember
          ? {
              cp365_staffmemberid: state.staffMember.cp365_staffmemberid,
              cp365_staffmembername: state.staffMember.cp365_staffmembername,
              cp365_forename: state.staffMember.cp365_forename,
              cp365_surname: state.staffMember.cp365_surname,
              cp365_workemail: state.staffMember.cp365_workemail,
              cp365_staffstatus: state.staffMember.cp365_staffstatus,
            }
          : null,
      }),
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Get current user's display name
 */
export const selectUserDisplayName = (state: AuthState): string => {
  if (state.staffMember) {
    return (
      state.staffMember.cp365_staffmembername ||
      `${state.staffMember.cp365_forename} ${state.staffMember.cp365_surname}`
    );
  }
  return state.azureUser?.name || 'User';
};

/**
 * Get current user's email
 */
export const selectUserEmail = (state: AuthState): string => {
  return state.staffMember?.cp365_workemail || state.azureUser?.email || '';
};

/**
 * Get current staff member ID
 */
export const selectStaffMemberId = (state: AuthState): string | null => {
  return state.staffMember?.cp365_staffmemberid || null;
};

/**
 * Check if current user is a registered staff member
 */
export const selectIsStaffMember = (state: AuthState): boolean => {
  return !!state.staffMember;
};

/**
 * Check if auth is fully ready (authenticated and staff member loaded)
 */
export const selectIsAuthReady = (state: AuthState): boolean => {
  return state.isAuthenticated && !state.isLoading && !state.isLoadingStaffMember;
};
