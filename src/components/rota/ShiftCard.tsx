/**
 * ShiftCard Component
 * Individual shift block displayed in the rota grid
 */

import { Moon, Sun, Bed } from 'lucide-react';

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
}

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

export function ShiftCard({
  shiftId,
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
}: ShiftCardProps) {
  const Icon = shiftIcons[shiftType];
  const baseColor = isOvertime ? 'bg-shift-overtime' : shiftColors[shiftType];

  return (
    <button
      onClick={onClick}
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
        {isActUp && (
          <span className="rounded bg-secondary px-1 text-[10px] text-white">AU</span>
        )}
        {isSenior && (
          <span className="rounded bg-gray-600 px-1 text-[10px] text-white">SR</span>
        )}
      </div>

      {/* Unpublished indicator */}
      {!isPublished && (
        <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warning" />
      )}
    </button>
  );
}

