/**
 * LastUpdatedIndicator Component
 * Shows when data was last refreshed with manual refresh option
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 13
 */

import { RefreshCw, WifiOff, Wifi } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface LastUpdatedIndicatorProps {
  /** Text showing when last updated (e.g., "2 minutes ago") */
  lastUpdatedText: string;
  /** Whether data is currently being refreshed */
  isRefreshing: boolean;
  /** Callback to trigger manual refresh */
  onRefresh: () => void;
  /** Whether auto-refresh is enabled */
  isAutoRefreshEnabled?: boolean;
  /** Callback to toggle auto-refresh */
  onToggleAutoRefresh?: (enabled: boolean) => void;
  /** Whether the page/tab is visible */
  isPageVisible?: boolean;
  /** Whether the data is stale (optional visual indicator) */
  isStale?: boolean;
  /** Show compact version */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function LastUpdatedIndicator({
  lastUpdatedText,
  isRefreshing,
  onRefresh,
  isAutoRefreshEnabled = true,
  onToggleAutoRefresh,
  isPageVisible = true,
  isStale = false,
  compact = false,
}: LastUpdatedIndicatorProps) {
  if (compact) {
    return (
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={`
          flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors
          ${isStale ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}
          hover:bg-gray-200 disabled:opacity-50
        `}
        title={`Last updated ${lastUpdatedText}. Click to refresh.`}
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? 'Updating...' : lastUpdatedText}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-grey bg-white px-3 py-2 text-sm">
      {/* Connection Status */}
      <div className="flex items-center gap-1.5">
        {isPageVisible ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Last Updated Text */}
      <div className="flex flex-col">
        <span className={`text-xs ${isStale ? 'text-orange-600' : 'text-gray-500'}`}>
          Last updated: {lastUpdatedText}
        </span>
        {!isPageVisible && (
          <span className="text-[10px] text-gray-400">Updates paused (tab hidden)</span>
        )}
      </div>

      {/* Auto-refresh Toggle */}
      {onToggleAutoRefresh && (
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={isAutoRefreshEnabled}
            onChange={(e) => onToggleAutoRefresh(e.target.checked)}
            className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Auto
        </label>
      )}

      {/* Manual Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 rounded-md border border-border-grey px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        title="Refresh now"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Updating...' : 'Refresh'}
      </button>
    </div>
  );
}

// =============================================================================
// Compact Inline Version
// =============================================================================

interface LastUpdatedBadgeProps {
  text: string;
  isRefreshing: boolean;
  onClick: () => void;
}

export function LastUpdatedBadge({ text, isRefreshing, onClick }: LastUpdatedBadgeProps) {
  return (
    <button
      onClick={onClick}
      disabled={isRefreshing}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
      title={`Updated ${text}. Click to refresh.`}
    >
      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{text}</span>
    </button>
  );
}

export default LastUpdatedIndicator;
