/**
 * ShiftCard Component
 * Individual shift block displayed in the rota grid
 *
 * Supports:
 * - Regular shifts (day, night, sleepIn)
 * - Open shifts with notification status
 * - Recently filled shifts with highlight animation
 */

import { useState } from 'react';
import { Moon, Sun, Bed, Bell, Users } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface OpenShiftInfo {
  /** Number of staff notified */
  notifiedCount: number;
  /** Number who declined */
  declinedCount: number;
  /** Number with pending response */
  pendingCount: number;
  /** Hours until offer expires */
  expiresInHours?: number;
  /** Whether this was just filled (for animation) */
  justFilled?: boolean;
  /** Name of staff who accepted (if just filled) */
  acceptedByName?: string;
}

interface ShiftCardProps {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  shiftType: 'day' | 'night' | 'sleepIn';
  isOvertime?: boolean;
  isPublished?: boolean;
  isShiftLeader?: boolean;
  isActUp?: boolean;
  isSenior?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  /** Whether this is an open shift (unassigned and notified) */
  isOpenShift?: boolean;
  /** Open shift details for tooltip and display */
  openShiftInfo?: OpenShiftInfo;
  /** Callback when clicking on an open shift (opens candidates panel) */
  onOpenShiftClick?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const shiftColors = {
  day: 'bg-shift-day',
  night: 'bg-shift-night',
  sleepIn: 'bg-shift-sleepin',
};

const shiftIcons = {
  day: Sun,
  night: Moon,
  sleepIn: Bed,
};

// =============================================================================
// TOOLTIP COMPONENT
// =============================================================================

function OpenShiftTooltip({ info }: { info: OpenShiftInfo }) {
  const expiryText = info.expiresInHours
    ? info.expiresInHours > 24
      ? `${Math.round(info.expiresInHours / 24)} days`
      : `${info.expiresInHours}h`
    : 'N/A';

  return (
    <div className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
      <div className="font-semibold mb-1">Open Shift</div>
      <div className="border-t border-slate-700 my-1" />
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-slate-400">Notified:</span>
          <span>{info.notifiedCount} staff</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Responses:</span>
          <span>
            {info.declinedCount} declined, {info.pendingCount} pending
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Expires:</span>
          <span>{expiryText}</span>
        </div>
      </div>
      <div className="border-t border-slate-700 my-1" />
      <div className="text-slate-400 text-center">Click to view candidates</div>
      {/* Tooltip arrow */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ShiftCard({
  shiftId: _shiftId,
  shiftName,
  startTime,
  endTime,
  shiftType,
  isOvertime = false,
  isPublished = false,
  isShiftLeader = false,
  isActUp = false,
  isSenior = false,
  onClick,
  isSelected = false,
  isOpenShift = false,
  openShiftInfo,
  onOpenShiftClick,
}: ShiftCardProps) {
  const Icon = shiftIcons[shiftType];
  const [showJustFilledAnimation, setShowJustFilledAnimation] = useState(
    openShiftInfo?.justFilled ?? false
  );

  // Handle click - either open shift click or regular click
  const handleClick = () => {
    if (isOpenShift && onOpenShiftClick) {
      onOpenShiftClick();
    } else if (onClick) {
      onClick();
    }
  };

  // Just filled animation - show green pulse then fade
  if (showJustFilledAnimation && openShiftInfo?.acceptedByName) {
    return (
      <button
        onClick={handleClick}
        className="group relative w-full rounded-lg border-2 border-emerald-400 bg-emerald-50 p-2 text-left transition-all animate-pulse"
        onAnimationEnd={() => setShowJustFilledAnimation(false)}
      >
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 shrink-0 text-emerald-600" />
          <span className="truncate text-xs font-medium text-emerald-700">
            {openShiftInfo.acceptedByName}
          </span>
        </div>
        <div className="mt-1 text-xs text-emerald-600">
          {startTime} - {endTime}
        </div>
        <div className="mt-1 text-[10px] font-medium text-emerald-600">Just filled ✓</div>
      </button>
    );
  }

  // Open shift styling
  if (isOpenShift) {
    return (
      <button
        onClick={handleClick}
        className={`group relative w-full rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-2 text-left transition-all hover:border-amber-500 hover:bg-amber-100 ${
          isSelected ? 'ring-2 ring-amber-500 ring-offset-2' : ''
        }`}
      >
        {/* Open shift tooltip */}
        {openShiftInfo && <OpenShiftTooltip info={openShiftInfo} />}

        {/* Bell icon in corner */}
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
          <Bell className="h-3 w-3" />
        </div>

        {/* OPEN label */}
        <div className="flex items-center gap-1">
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            OPEN
          </span>
        </div>

        {/* Time */}
        <div className="mt-1 text-xs font-medium text-amber-700">
          {startTime} - {endTime}
        </div>

        {/* Notified count */}
        {openShiftInfo && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
            <Users className="h-3 w-3" />
            <span>{openShiftInfo.notifiedCount} notified</span>
          </div>
        )}
      </button>
    );
  }

  // Regular shift styling
  const baseColor = isOvertime ? 'bg-shift-overtime' : shiftColors[shiftType];

  return (
    <button
      onClick={handleClick}
      className={`group relative w-full rounded-lg p-2 text-left transition-all ${baseColor} ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${!isPublished ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate text-xs font-medium">{shiftName}</span>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        {startTime} - {endTime}
      </div>

      {/* Role indicators */}
      <div className="mt-1 flex gap-1">
        {isShiftLeader && (
          <span className="rounded bg-primary px-1 text-[10px] text-white">SL</span>
        )}
        {isActUp && <span className="rounded bg-secondary px-1 text-[10px] text-white">AU</span>}
        {isSenior && <span className="rounded bg-gray-600 px-1 text-[10px] text-white">SR</span>}
      </div>

      {/* Unpublished indicator */}
      {!isPublished && <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warning" />}
    </button>
  );
}
