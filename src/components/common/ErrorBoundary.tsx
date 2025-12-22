/**
 * ErrorBoundary Component
 * Global error boundary with logging to Power Automate flow
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // TODO: Log error to Power Automate ErrorHandlingCanvasApp flow
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-elevation-1 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3 text-error">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            <p className="mt-4 text-gray-600">
              An unexpected error occurred. Please try refreshing the page or contact support if
              the problem persists.
            </p>
            {this.state.error && (
              <pre className="mt-4 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="rounded-lg border border-border-grey px-4 py-2 hover:bg-elevation-1"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

