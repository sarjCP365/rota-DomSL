/**
 * Loading Component
 * Full-screen overlay with spinner
 * Based on specification section 6.3
 */

interface LoadingProps {
  /** Loading message to display */
  message?: string;
  /** Whether to show as full-screen overlay */
  fullScreen?: boolean;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Full-screen loading overlay with spinner
 */
export function Loading({ message = 'Loading...', fullScreen = true, size = 'lg' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-14 w-14 border-4',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8">
        <Spinner className={sizeClasses[size]} />
        {message && (
          <p className={`font-medium text-gray-600 ${textSizeClasses[size]}`}>{message}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <svg className="h-9 w-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Spinner */}
        <Spinner className={sizeClasses[size]} />

        {/* Message */}
        {message && (
          <p className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>{message}</p>
        )}

        {/* Brand text */}
        <p className="text-sm text-gray-400">CarePoint 365</p>
      </div>
    </div>
  );
}

/**
 * Spinner component
 */
function Spinner({ className = 'h-10 w-10 border-3' }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-primary border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Inline loading spinner (for buttons, etc.)
 */
export function LoadingSpinner({
  className = 'h-5 w-5',
  color = 'currentColor',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
      <path
        className="opacity-75"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Skeleton loading placeholder
 */
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} aria-hidden="true" />;
}

/**
 * Loading card placeholder
 */
export function LoadingCard() {
  return (
    <div className="rounded-lg border border-border-grey bg-white p-4">
      <Skeleton className="mb-3 h-6 w-3/4" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/**
 * Loading table rows placeholder
 */
export function LoadingTableRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </td>
        </tr>
      ))}
    </>
  );
}
