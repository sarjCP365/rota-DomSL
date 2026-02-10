/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI.
 * Implements the coding standards for error handling.
 *
 * @see Cursor Rules/react-coding-standards.md - Error Handling section
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Callback when an error is caught - use for logging to external services */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show a compact inline error vs full page error */
  variant?: 'page' | 'section' | 'inline';
  /** Custom title for the error message */
  title?: string;
  /** Whether to show technical error details (for development) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

/**
 * Error Boundary Component
 *
 * Usage:
 * ```tsx
 * // Full page error boundary (for routes)
 * <ErrorBoundary variant="page">
 *   <MyPage />
 * </ErrorBoundary>
 *
 * // Section error boundary (for features)
 * <ErrorBoundary variant="section" title="Sidebar Error">
 *   <Sidebar />
 * </ErrorBoundary>
 *
 * // Inline error boundary (for widgets)
 * <ErrorBoundary variant="inline">
 *   <Widget />
 * </ErrorBoundary>
 *
 * // With custom error logging
 * <ErrorBoundary onError={(error) => logToService(error)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleGoBack = (): void => {
    window.history.back();
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, variant = 'page', title, showDetails = false } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback takes precedence
    if (fallback) {
      return fallback;
    }

    // Render appropriate error UI based on variant
    switch (variant) {
      case 'inline':
        return (
          <InlineErrorFallback
            error={error}
            title={title}
            showDetails={showDetails}
            onReset={this.handleReset}
          />
        );
      case 'section':
        return (
          <SectionErrorFallback
            error={error}
            title={title}
            showDetails={showDetails}
            onReset={this.handleReset}
            onReload={this.handleReload}
          />
        );
      case 'page':
      default:
        return (
          <PageErrorFallback
            error={error}
            title={title}
            showDetails={showDetails}
            onReset={this.handleReset}
            onReload={this.handleReload}
            onGoHome={this.handleGoHome}
            onGoBack={this.handleGoBack}
          />
        );
    }
  }
}

// ============================================================================
// Fallback Components
// ============================================================================

interface FallbackProps {
  error: Error | null;
  title?: string;
  showDetails?: boolean;
  onReset: () => void;
}

interface PageFallbackProps extends FallbackProps {
  onReload: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
}

interface SectionFallbackProps extends FallbackProps {
  onReload: () => void;
}

/**
 * Full page error fallback - used for route-level errors
 */
function PageErrorFallback({
  error,
  title = 'Something went wrong',
  showDetails,
  onReset,
  onReload,
  onGoHome,
  onGoBack,
}: PageFallbackProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-elevation-1 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-lg w-full rounded-xl bg-white p-8 shadow-lg">
        {/* Icon and Title */}
        <div className="flex items-center gap-4 text-error">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">An unexpected error has occurred</p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-6 text-gray-600">
          We're sorry, but something went wrong while loading this page. Please try one of the
          options below, or contact support if the problem persists.
        </p>

        {/* Error Details (Development) */}
        {showDetails && error && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Error Details
            </p>
            <pre className="overflow-auto text-xs text-gray-700 whitespace-pre-wrap">
              {error.message}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-primary-hover transition-colors"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>
          <button
            onClick={onReload}
            className="flex items-center gap-2 rounded-lg border border-border-grey px-4 py-2.5 hover:bg-elevation-1 transition-colors"
          >
            Refresh Page
          </button>
          <button
            onClick={onGoBack}
            className="flex items-center gap-2 rounded-lg border border-border-grey px-4 py-2.5 hover:bg-elevation-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go Back
          </button>
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 rounded-lg border border-border-grey px-4 py-2.5 hover:bg-elevation-1 transition-colors"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </button>
        </div>

        {/* Support Info */}
        <p className="mt-6 text-xs text-gray-400">
          If this problem continues, please contact your system administrator.
        </p>
      </div>
    </div>
  );
}

/**
 * Section error fallback - used for feature modules (sidebar, widgets)
 */
function SectionErrorFallback({
  error,
  title = 'Error loading section',
  showDetails,
  onReset,
  onReload,
}: SectionFallbackProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-6 bg-error/5 rounded-lg border border-error/20"
      role="alert"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
      </div>
      <h2 className="mt-3 font-medium text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500 text-center">This section failed to load</p>

      {showDetails && error && (
        <pre className="mt-3 max-w-full overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-600">
          {error.message}
        </pre>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
        <button
          onClick={onReload}
          className="rounded-md border border-border-grey px-3 py-1.5 text-sm hover:bg-elevation-1 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

/**
 * Inline error fallback - used for small widgets or components
 */
function InlineErrorFallback({ error, title = 'Error', showDetails, onReset }: FallbackProps) {
  return (
    <div
      className="flex items-center gap-2 p-3 bg-error/5 rounded border border-error/20 text-sm"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4 text-error flex-shrink-0" aria-hidden="true" />
      <span className="text-gray-700">
        {title}
        {showDetails && error ? `: ${error.message}` : ''}
      </span>
      <button
        onClick={onReset}
        className="ml-auto text-primary hover:text-primary-hover text-xs font-medium"
      >
        Retry
      </button>
    </div>
  );
}

// ============================================================================
// Route Error Boundary - Pre-configured for routes
// ============================================================================

interface RouteErrorBoundaryProps {
  children: ReactNode;
  /** Route name for better error context */
  routeName?: string;
}

/**
 * Pre-configured error boundary for route-level components
 *
 * Usage:
 * ```tsx
 * <RouteErrorBoundary routeName="Dashboard">
 *   <Dashboard />
 * </RouteErrorBoundary>
 * ```
 */
export function RouteErrorBoundary({ children, routeName }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      variant="page"
      title={routeName ? `Error loading ${routeName}` : 'Page Error'}
      showDetails={import.meta.env.DEV}
      onError={(error, errorInfo) => {
        // In production, you would send this to an error tracking service
        console.error(`[RouteError] ${routeName || 'Unknown route'}:`, error);
        console.error('[RouteError] Component stack:', errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================================================
// Feature Error Boundary - Pre-configured for feature sections
// ============================================================================

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  /** Feature name for better error context */
  featureName?: string;
}

/**
 * Pre-configured error boundary for feature modules
 *
 * Usage:
 * ```tsx
 * <FeatureErrorBoundary featureName="Sidebar">
 *   <Sidebar />
 * </FeatureErrorBoundary>
 * ```
 */
export function FeatureErrorBoundary({ children, featureName }: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      variant="section"
      title={featureName ? `${featureName} error` : 'Section error'}
      showDetails={import.meta.env.DEV}
      onError={(error) => {
        console.error(`[FeatureError] ${featureName || 'Unknown feature'}:`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
