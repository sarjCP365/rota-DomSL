/**
 * MSAL Configuration
 * Azure AD / Entra ID authentication setup
 * Based on specification section 8
 */

import { Configuration, LogLevel } from '@azure/msal-browser';

/**
 * MSAL configuration for Azure AD authentication
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL]', message);
            break;
          case LogLevel.Warning:
            console.warn('[MSAL]', message);
            break;
          case LogLevel.Info:
            // Uncomment for debugging
            // console.info('[MSAL]', message);
            break;
          case LogLevel.Verbose:
            // console.debug('[MSAL]', message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
  },
};

/**
 * Scopes required for Dataverse API access
 */
export const dataverseScopes = [`${import.meta.env.VITE_DATAVERSE_URL}/.default`];

/**
 * Login request configuration
 */
export const loginRequest = {
  scopes: dataverseScopes,
};

/**
 * Silent token request configuration
 */
export const silentRequest = {
  scopes: dataverseScopes,
  forceRefresh: false,
};

/**
 * Check if MSAL is properly configured
 */
export function isMsalConfigured(): boolean {
  return !!(
    import.meta.env.VITE_CLIENT_ID &&
    import.meta.env.VITE_TENANT_ID &&
    import.meta.env.VITE_DATAVERSE_URL
  );
}

/**
 * Get configuration warnings
 */
export function getConfigurationWarnings(): string[] {
  const warnings: string[] = [];

  if (!import.meta.env.VITE_CLIENT_ID) {
    warnings.push('VITE_CLIENT_ID is not set');
  }
  if (!import.meta.env.VITE_TENANT_ID) {
    warnings.push('VITE_TENANT_ID is not set');
  }
  if (!import.meta.env.VITE_DATAVERSE_URL) {
    warnings.push('VITE_DATAVERSE_URL is not set');
  }

  return warnings;
}
