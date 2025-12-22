/**
 * AttendanceStatusBadge Component
 * Visual badge showing attendance status with clock times
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 7
 */

import { useMemo } from 'react';
import { Clock, Check, X, AlertTriangle, Circle } from 'lucide-react';
import {
  type AttendanceStatus,
  type AttendanceDetails,
  getStatusConfig,
  formatAttendanceTime,
  formatLateBy,
} from '../../utils/attendanceStatus';

// =============================================================================
// Types
// =============================================================================

interface AttendanceStatusBadgeProps {
  /** The attendance status */
  status: AttendanceStatus;
  /** Clock-in time (if available) */
  clockedIn?: Date | null;
  /** Clock-out time (if available) */
  clockedOut?: Date | null;
  /** Shift start time (for calculating late by) */
  shiftStartTime?: Date;
  /** Minutes late (pre-calculated) */
  minutesLate?: number;
  /** Show compact version (just dot and label) */
  compact?: boolean;
  /** Show full details including clock times */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface AttendanceStatusBadgeFromDetailsProps {
  /** Full attendance details object */
  details: AttendanceDetails;
  /** Show compact version */
  compact?: boolean;
  /** Show full details */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Status Icons
// =============================================================================

const StatusIcons: Record<AttendanceStatus, typeof Clock> = {
  present: Circle,
  scheduled: Clock,
  worked: Check,
  absent: X,
  late: AlertTriangle,
};

// =============================================================================
// Main Component
// =============================================================================

export function AttendanceStatusBadge({
  status,
  clockedIn,
  clockedOut,
  shiftStartTime,
  minutesLate = 0,
  compact = false,
  showDetails = true,
  className = '',
}: AttendanceStatusBadgeProps) {
  const config = useMemo(() => getStatusConfig(status), [status]);
  const Icon = StatusIcons[status];

  // Calculate minutes late if not provided
  const calculatedMinutesLate = useMemo(() => {
    if (minutesLate > 0) return minutesLate;
    if (status === 'late' && shiftStartTime) {
      const now = new Date();
      return Math.floor((now.getTime() - shiftStartTime.getTime()) / (1000 * 60));
    }
    if (status === 'present' && clockedIn && shiftStartTime) {
      const late = Math.floor((clockedIn.getTime() - shiftStartTime.getTime()) / (1000 * 60));
      return late > 0 ? late : 0;
    }
    return 0;
  }, [minutesLate, status, shiftStartTime, clockedIn]);

  // Compact version - just a coloured dot
  if (compact) {
    return (
      <span
        className={`inline-flex h-3 w-3 rounded-full ${config.dotColour} ${className}`}
        title={config.label}
        aria-label={config.label}
      />
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      {/* Main badge */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${config.bgColour} ${config.colour}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{config.label}</span>
        {status === 'late' && calculatedMinutesLate > 0 && (
          <span className="opacity-75">({formatLateBy(calculatedMinutesLate)})</span>
        )}
      </span>

      {/* Clock times (if showDetails) */}
      {showDetails && (clockedIn || clockedOut) && (
        <div className="mt-1 space-y-0.5 text-[10px] text-gray-500">
          {clockedIn && (
            <div className="flex items-center gap-1">
              <span className="font-medium">In:</span>
              <span>{formatAttendanceTime(clockedIn)}</span>
              {calculatedMinutesLate > 0 && status === 'present' && (
                <span className="text-orange-600">(+{formatLateBy(calculatedMinutesLate)})</span>
              )}
            </div>
          )}
          {clockedOut && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Out:</span>
              <span>{formatAttendanceTime(clockedOut)}</span>
            </div>
          )}
        </div>
      )}

      {/* Late message when not clocked in */}
      {showDetails && status === 'late' && !clockedIn && calculatedMinutesLate > 0 && (
        <div className="mt-1 text-[10px] text-orange-600">
          Late by {formatLateBy(calculatedMinutesLate)}
        </div>
      )}
    </div>
  );
}

/**
 * Alternative component that accepts AttendanceDetails directly
 */
export function AttendanceStatusBadgeFromDetails({
  details,
  compact = false,
  showDetails = true,
  className = '',
}: AttendanceStatusBadgeFromDetailsProps) {
  return (
    <AttendanceStatusBadge
      status={details.status}
      clockedIn={details.clockedInTime}
      clockedOut={details.clockedOutTime}
      shiftStartTime={details.shiftStartTime}
      minutesLate={details.minutesLate}
      compact={compact}
      showDetails={showDetails}
      className={className}
    />
  );
}

// =============================================================================
// Status Dot Component (for inline use)
// =============================================================================

interface StatusDotProps {
  status: AttendanceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusDot({ status, size = 'md', className = '' }: StatusDotProps) {
  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={`inline-block rounded-full ${config.dotColour} ${sizeClasses[size]} ${className}`}
      title={config.label}
      aria-label={config.label}
    />
  );
}

// =============================================================================
// Status Label Component (text only)
// =============================================================================

interface StatusLabelProps {
  status: AttendanceStatus;
  showDot?: boolean;
  className?: string;
}

export function StatusLabel({ status, showDot = true, className = '' }: StatusLabelProps) {
  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${config.colour} ${className}`}>
      {showDot && <StatusDot status={status} size="sm" />}
      <span>{config.label}</span>
    </span>
  );
}

// =============================================================================
// Status Summary Component (for stats)
// =============================================================================

interface StatusSummaryProps {
  counts: Record<AttendanceStatus, number>;
  showZero?: boolean;
  className?: string;
}

export function StatusSummary({ counts, showZero = false, className = '' }: StatusSummaryProps) {
  const statuses: AttendanceStatus[] = ['present', 'late', 'scheduled', 'worked', 'absent'];

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {statuses.map(status => {
        const count = counts[status];
        if (!showZero && count === 0) return null;
        
        const config = getStatusConfig(status);
        
        return (
          <div key={status} className="flex items-center gap-1.5">
            <StatusDot status={status} size="sm" />
            <span className="text-sm text-gray-600">
              {config.label}: <span className="font-medium">{count}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default AttendanceStatusBadge;

