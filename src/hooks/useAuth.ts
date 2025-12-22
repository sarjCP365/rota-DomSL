/**
 * useAuth Hook
 * Handles Azure AD/Entra ID authentication using MSAL
 * and fetches current user's staff member record from Dataverse
 * 
 * Based on specification section 8
 */

import { useCallback, useEffect, useRef } from 'react';
import { useMsal, useAccount, useIsAuthenticated } from '@azure/msal-react';
import { 
  InteractionRequiredAuthError,
  InteractionStatus,
  AccountInfo,
} from '@azure/msal-browser';
import { useAuthStore, type AzureUser } from '../store/authStore';
import { loginRequest, silentRequest } from '../config/msal';
import { initDataverseClient, getDataverseClient, isDataverseClientInitialised } from '../api/dataverse/client';
import type { StaffMember } from '../api/dataverse/types';

/**
 * Main authentication hook
 * Provides login/logout functions and manages auth state
 */
export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || null);
  const isAuthenticated = useIsAuthenticated();
  const initialisedRef = useRef(false);

  const {
    azureUser,
    staffMember,
    isLoading,
    isLoadingStaffMember,
    isDataverseReady,
    error,
    setAzureUser,
    setStaffMember,
    setLoading,
    setLoadingStaffMember,
    setDataverseReady,
    setError,
    logout: clearAuthStore,
  } = useAuthStore();

  /**
   * Acquire access token silently, falling back to popup if needed
   */
  const acquireToken = useCallback(async (): Promise<string | null> => {
    if (!account) {
      return null;
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...silentRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(loginRequest);
          return response.accessToken;
        } catch (popupError) {
          console.error('Token acquisition via popup failed:', popupError);
          setError('Failed to acquire access token');
          return null;
        }
      }
      console.error('Token acquisition failed:', error);
      setError('Failed to acquire access token');
      return null;
    }
  }, [instance, account, setError]);

  /**
   * Initialise the Dataverse client with token provider
   */
  const initialiseDataverseClient = useCallback(() => {
    console.log('[useAuth] initialiseDataverseClient called');
    console.log('[useAuth] isDataverseClientInitialised:', isDataverseClientInitialised());
    console.log('[useAuth] isDataverseReady (store):', isDataverseReady);
    
    if (!isDataverseClientInitialised()) {
      console.log('[useAuth] Creating new Dataverse client...');
      initDataverseClient(async () => {
        console.log('[useAuth] Token provider called, acquiring token...');
        const token = await acquireToken();
        if (!token) {
          console.error('[useAuth] Failed to acquire access token');
          throw new Error('Failed to acquire access token');
        }
        console.log('[useAuth] Token acquired successfully');
        return token;
      });
      console.log('[useAuth] Setting isDataverseReady to true');
      setDataverseReady(true);
    } else if (!isDataverseReady) {
      console.log('[useAuth] Client exists but store not ready, setting isDataverseReady to true');
      setDataverseReady(true);
    } else {
      console.log('[useAuth] Dataverse client already initialized and ready');
    }
  }, [acquireToken, isDataverseReady, setDataverseReady]);

  /**
   * Fetch the current user's staff member record from Dataverse
   */
  const fetchStaffMember = useCallback(async (email: string): Promise<StaffMember | null> => {
    try {
      setLoadingStaffMember(true);
      initialiseDataverseClient();

      const client = getDataverseClient();
      const staffMembers = await client.get<StaffMember>('cp365_staffmembers', {
        filter: `cp365_workemail eq '${email}'`,
        top: 1,
        select: [
          'cp365_staffmemberid',
          'cp365_staffmembername',
          'cp365_forename',
          'cp365_surname',
          'cp365_staffnumber',
          'cp365_workemail',
          'cp365_staffstatus',
          'cp365_agencyworker',
          '_cp365_defaultlocation_value',
        ],
      });

      if (staffMembers.length > 0) {
        return staffMembers[0];
      }

      console.warn(`No staff member found for email: ${email}`);
      return null;
    } catch (error) {
      console.error('Failed to fetch staff member:', error);
      setError('Failed to load user profile from CarePoint');
      return null;
    } finally {
      setLoadingStaffMember(false);
    }
  }, [initialiseDataverseClient, setLoadingStaffMember, setError]);

  /**
   * Convert MSAL account to AzureUser
   */
  const accountToAzureUser = (account: AccountInfo): AzureUser => ({
    id: account.localAccountId,
    name: account.name || '',
    email: account.username,
    username: account.username,
  });

  /**
   * Login with popup
   */
  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }, [instance, setLoading, setError]);

  /**
   * Login with redirect
   */
  const loginRedirect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login redirect failed:', error);
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }, [instance, setLoading, setError]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      clearAuthStore();
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if logout fails
      clearAuthStore();
    }
  }, [instance, clearAuthStore]);

  /**
   * Logout with redirect
   */
  const logoutRedirect = useCallback(async () => {
    try {
      clearAuthStore();
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout redirect failed:', error);
      clearAuthStore();
    }
  }, [instance, clearAuthStore]);

  /**
   * Handle account changes and fetch staff member
   */
  useEffect(() => {
    // Don't process while MSAL is busy
    if (inProgress !== InteractionStatus.None) {
      setLoading(true);
      return;
    }

    // Prevent double initialisation
    if (initialisedRef.current && azureUser) {
      setLoading(false);
      return;
    }

    if (account && isAuthenticated) {
      const user = accountToAzureUser(account);
      setAzureUser(user);
      initialisedRef.current = true;

      // Initialize Dataverse client FIRST (before fetching staff member)
      console.log('[useAuth] Initializing Dataverse client...');
      initialiseDataverseClient();
      console.log('[useAuth] Dataverse client initialized, isDataverseReady should now be true');

      // Fetch staff member if not already loaded
      if (!staffMember || staffMember.cp365_workemail !== user.email) {
        console.log('[useAuth] Fetching staff member for:', user.email);
        fetchStaffMember(user.email).then((member) => {
          if (member) {
            console.log('[useAuth] Staff member found:', member.cp365_staffmembername);
            setStaffMember(member);
          } else {
            console.log('[useAuth] No staff member found for email');
          }
          setLoading(false);
        }).catch((error) => {
          console.error('[useAuth] Error fetching staff member:', error);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } else {
      setAzureUser(null);
      setStaffMember(null);
      setDataverseReady(false);
      setLoading(false);
      initialisedRef.current = false;
    }
  }, [
    account,
    isAuthenticated,
    inProgress,
    azureUser,
    staffMember,
    setAzureUser,
    setStaffMember,
    setLoading,
    setDataverseReady,
    fetchStaffMember,
    initialiseDataverseClient,
  ]);

  return {
    // State
    isAuthenticated,
    isLoading,
    isLoadingStaffMember,
    error,
    azureUser,
    staffMember,

    // Actions
    login,
    loginRedirect,
    logout,
    logoutRedirect,
    acquireToken,

    // Utilities
    initialiseDataverseClient,
  };
}

/**
 * Hook to get the current user's display name
 */
export function useUserDisplayName(): string {
  const { staffMember, azureUser } = useAuthStore();
  
  if (staffMember) {
    return staffMember.cp365_staffmembername || 
      `${staffMember.cp365_forename} ${staffMember.cp365_surname}`;
  }
  
  return azureUser?.name || 'User';
}

/**
 * Hook to get the current staff member ID
 */
export function useStaffMemberId(): string | null {
  const { staffMember } = useAuthStore();
  return staffMember?.cp365_staffmemberid || null;
}

/**
 * Hook to check if current user is a staff member
 */
export function useIsStaffMember(): boolean {
  const { staffMember } = useAuthStore();
  return !!staffMember;
}
