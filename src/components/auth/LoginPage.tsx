/**
 * LoginPage Component
 * Displayed when user is not authenticated
 */

import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { login, loginRedirect, isLoading, error } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="w-full max-w-md p-4">
        <div className="rounded-xl bg-white p-8 shadow-xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CarePoint 365</h1>
            <p className="mt-1 text-gray-600">Rota Management</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-lg bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}

          {/* Login buttons */}
          <div className="space-y-3">
            <button
              onClick={() => login()}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <MicrosoftLogo />
                  <span>Sign in with Microsoft</span>
                </>
              )}
            </button>

            <button
              onClick={() => loginRedirect()}
              disabled={isLoading}
              className="w-full rounded-lg border border-border-grey px-4 py-3 text-gray-700 transition-colors hover:bg-elevation-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign in with redirect
            </button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-500">
            By signing in, you agree to the CarePoint 365 terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Microsoft logo SVG
 */
function MicrosoftLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

/**
 * Loading spinner
 */
function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

