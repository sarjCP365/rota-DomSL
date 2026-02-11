/**
 * AuthProvider Component
 * Wraps the application with MSAL authentication provider
 */

import { ReactNode, useEffect, useState } from 'react';
import {
  MsalProvider,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from '@azure/msal-browser';
import { msalConfig, isMsalConfigured, getConfigurationWarnings } from '@/config/msal';
import { Loading } from '@/components/common/Loading';

// Create MSAL instance
let msalInstance: PublicClientApplication | null = null;
let msalInitPromise: Promise<void> | null = null;
let msalInitError: Error | null = null;

/**
 * Initialize MSAL instance
 */
function initializeMsal(): Promise<void> {
  if (msalInitPromise) {
    return msalInitPromise;
  }

  // Don't initialize if not configured
  if (!isMsalConfigured()) {
    msalInitPromise = Promise.resolve();
    return msalInitPromise;
  }

  msalInstance = new PublicClientApplication(msalConfig);

  msalInitPromise = msalInstance
    .initialize()
    .then(() => {
      // Handle redirect response
      return msalInstance!.handleRedirectPromise();
    })
    .then((response) => {
      if (response) {
        msalInstance!.setActiveAccount(response.account);
      }

      // Set active account if available
      const accounts = msalInstance!.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance!.setActiveAccount(accounts[0]);
      }

      // Listen for account changes
      msalInstance!.addEventCallback((event: EventMessage) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const payload = event.payload as AuthenticationResult;
          msalInstance!.setActiveAccount(payload.account);
        }
      });
    })
    .catch((error) => {
      console.error('[AuthProvider] MSAL initialization error:', error);
      msalInitError = error instanceof Error ? error : new Error(String(error));
    });

  return msalInitPromise;
}

// Start initialization immediately
void initializeMsal();

/**
 * Props for AuthProvider
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Main Auth Provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialised, setIsInitialised] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    initializeMsal()
      .then(() => {
        setIsInitialised(true);
        if (msalInitError) {
          setInitError(msalInitError);
        }
      })
      .catch((error: unknown) => {
        setInitError(error instanceof Error ? error : new Error(String(error)));
        setIsInitialised(true);
      });
  }, []);

  // Show loading while initialising
  if (!isInitialised) {
    return <Loading message="Initialising..." />;
  }

  // Check configuration
  if (!isMsalConfigured()) {
    const warnings = getConfigurationWarnings();
    return <ConfigurationError warnings={warnings} />;
  }

  // Show MSAL initialization error
  if (initError || !msalInstance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h1 className="text-xl font-semibold text-red-600">Initialisation Error</h1>
          <p className="mt-2 text-gray-600">
            Failed to initialise authentication. Please refresh the page or contact support.
          </p>
          {initError && (
            <pre className="mt-4 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700">
              {initError.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthStateHandler>{children}</AuthStateHandler>
    </MsalProvider>
  );
}

/**
 * Handles auth state transitions and shows loading states
 */
function AuthStateHandler({ children }: { children: ReactNode }) {
  const { inProgress } = useMsal();
  const [isInitialising, setIsInitialising] = useState(true);

  // Wait for MSAL to finish initialising - intentional state sync for auth flow
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (inProgress === 'none') {
      setIsInitialising(false);
    }
  }, [inProgress]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isInitialising || inProgress !== 'none') {
    return <Loading message="Authenticating..." />;
  }

  return <>{children}</>;
}

/**
 * Configuration error display
 */
function ConfigurationError({ warnings }: { warnings: string[] }) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '1rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626', margin: 0 }}>
          Configuration Required
        </h1>
        <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
          The application needs to be configured before it can run. Please create a{' '}
          <code
            style={{
              backgroundColor: '#e5e7eb',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
            }}
          >
            .env.local
          </code>{' '}
          file in the project root.
        </p>

        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
            Missing variables:
          </p>
          <ul
            style={{
              marginTop: '0.5rem',
              paddingLeft: '1.25rem',
              color: '#6b7280',
              fontSize: '0.875rem',
            }}
          >
            {warnings.map((warning, index) => (
              <li key={index} style={{ marginBottom: '0.25rem' }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            borderRadius: '0.5rem',
            backgroundColor: '#f3f4f6',
            padding: '1rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
            Example{' '}
            <code
              style={{
                backgroundColor: '#e5e7eb',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.25rem',
              }}
            >
              .env.local
            </code>{' '}
            file:
          </p>
          <pre
            style={{
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: '#1f2937',
              backgroundColor: '#e5e7eb',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {`# Azure AD / Entra ID Configuration
VITE_CLIENT_ID=your-azure-app-client-id
VITE_TENANT_ID=your-azure-tenant-id

# Dataverse Environment URL
VITE_DATAVERSE_URL=https://yourorg.crm11.dynamics.com

# Power Automate Flow URLs (HTTP Triggers)
VITE_FLOW_BUILD_ROTA_VIEW=https://prod-xx.westeurope.logic.azure.com/...
VITE_FLOW_CREATE_BULK_SHIFT=https://prod-xx.westeurope.logic.azure.com/...
VITE_FLOW_GET_TAFW=https://prod-xx.westeurope.logic.azure.com/...
VITE_FLOW_GET_OTHER_SHIFTS=https://prod-xx.westeurope.logic.azure.com/...`}
          </pre>
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.5rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
            <strong>Note:</strong> After creating the file, restart the development server with{' '}
            <code
              style={{
                backgroundColor: '#fde68a',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.25rem',
              }}
            >
              npm run dev
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Re-export MSAL template components for convenience
 */
export { AuthenticatedTemplate, UnauthenticatedTemplate };

/**
 * Export MSAL instance getter for advanced usage
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getMsalInstance(): PublicClientApplication | null {
  return msalInstance;
}
