/**
 * AvailabilityGrid Component
 *
 * Visual weekly availability grid for staff members.
 * Allows viewing and editing availability patterns with time slots.
 */

import { useState, useCallback } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Save,
  RotateCcw,
  Star,
  Clock,
  Calendar,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';
import type { StaffMember } from '@/api/dataverse/types';
import { AvailabilityType } from '@/types/domiciliary';

interface AvailabilityGridProps {
  /** Staff member to display/edit availability for */
  staffMember: StaffMember;
  /** Initial week to display */
  initialWeekStart?: Date;
  /** Callback when changes are saved */
  onSave?: () => void;
  /** Callback to close/cancel */
  onCancel?: () => void;
}

/** Days of the week */
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** Time slots from 06:00 to 22:00 */
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = [];
for (let hour = 6; hour < 22; hour++) {
  TIME_SLOTS.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
  TIME_SLOTS.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
}

/** Get slot styling based on type */
function getSlotStyle(
  type: AvailabilityType | null,
  isPreferred: boolean,
  isBooked: boolean
): string {
  if (isBooked) {
    return 'bg-blue-500 hover:bg-blue-600';
  }
  
  switch (type) {
    case AvailabilityType.Available:
      return isPreferred 
        ? 'bg-green-400 hover:bg-green-500' 
        : 'bg-green-300 hover:bg-green-400';
    case AvailabilityType.Preferred:
      return 'bg-emerald-400 hover:bg-emerald-500';
    case AvailabilityType.Unavailable:
      return 'bg-gray-300 hover:bg-gray-400';
    case AvailabilityType.EmergencyOnly:
      return 'bg-amber-300 hover:bg-amber-400';
    default:
      return 'bg-gray-100 hover:bg-gray-200';
  }
}

/** Get slot tooltip */
function getSlotTooltip(
  type: AvailabilityType | null,
  isPreferred: boolean,
  isBooked: boolean,
  visitDetails?: string
): string {
  if (isBooked) {
    return `Booked: ${visitDetails || 'Visit'}`;
  }
  
  switch (type) {
    case AvailabilityType.Available:
      return isPreferred ? 'Preferred time' : 'Available';
    case AvailabilityType.Preferred:
      return 'Preferred time';
    case AvailabilityType.Unavailable:
      return 'Unavailable';
    case AvailabilityType.EmergencyOnly:
      return 'Emergency only';
    default:
      return 'Not set - Click to set availability';
  }
}

/**
 * AvailabilityGrid component
 */
export function AvailabilityGrid({
  staffMember,
  initialWeekStart = new Date(),
  onSave,
  onCancel: _onCancel,
}: AvailabilityGridProps) {
  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(initialWeekStart, { weekStartsOn: 1 })
  );
  const [selectedTool, setSelectedTool] = useState<'available' | 'preferred' | 'unavailable' | 'clear'>('available');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Load availability data
  const {
    pattern: _pattern,
    weekData,
    visits: _visits,
    isLoading,
    error,
    setSlotAvailability,
    clearDay,
    copyDay,
    saveChanges,
    hasUnsavedChanges,
    resetChanges,
    isSaving,
  } = useStaffAvailability({
    staffMemberId: staffMember.cp365_staffmemberid,
    weekStartDate: currentWeekStart,
  });

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const goToThisWeek = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  // Slot click handler
  const handleSlotClick = useCallback((dayKey: string, hour: number, minute: number) => {
    const toolToType: Record<string, AvailabilityType | null> = {
      available: AvailabilityType.Available,
      preferred: AvailabilityType.Preferred,
      unavailable: AvailabilityType.Unavailable,
      clear: null,
    };
    
    setSlotAvailability(
      dayKey as any,
      hour,
      minute,
      toolToType[selectedTool],
      selectedTool === 'preferred'
    );
  }, [selectedTool, setSlotAvailability]);

  // Handle save
  const handleSave = useCallback(async () => {
    await saveChanges();
    onSave?.();
  }, [saveChanges, onSave]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading availability...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-red-600">
          <AlertTriangle className="w-8 h-8" />
          <p>Error loading availability</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* Staff info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            {staffMember.cp365_staffmembername.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{staffMember.cp365_staffmembername}</h2>
            <p className="text-sm text-gray-500">{staffMember.cp365_jobtitle || 'Staff Member'}</p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">
              Week of {format(currentWeekStart, 'd MMM yyyy')}
            </span>
          </div>

          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={goToThisWeek}
            className="ml-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            This Week
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 mr-2">Unsaved changes</span>
          )}
          <button
            onClick={resetChanges}
            disabled={!hasUnsavedChanges}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Reset changes"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Tool:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedTool('available')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedTool === 'available' ? 'bg-green-100 text-green-800 ring-2 ring-green-500' : 'bg-white hover:bg-gray-100'}
            `}
          >
            <div className="w-3 h-3 rounded bg-green-300" />
            Available
          </button>
          <button
            onClick={() => setSelectedTool('preferred')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedTool === 'preferred' ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500' : 'bg-white hover:bg-gray-100'}
            `}
          >
            <div className="w-3 h-3 rounded bg-emerald-400" />
            <Star className="w-3 h-3" />
            Preferred
          </button>
          <button
            onClick={() => setSelectedTool('unavailable')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedTool === 'unavailable' ? 'bg-gray-200 text-gray-800 ring-2 ring-gray-500' : 'bg-white hover:bg-gray-100'}
            `}
          >
            <div className="w-3 h-3 rounded bg-gray-300" />
            Unavailable
          </button>
          <button
            onClick={() => setSelectedTool('clear')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedTool === 'clear' ? 'bg-red-100 text-red-800 ring-2 ring-red-500' : 'bg-white hover:bg-gray-100'}
            `}
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Booked</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Column headers */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            {/* Time column header */}
            <div className="w-20 flex-shrink-0 px-2 py-3 text-center border-r border-gray-200">
              <Clock className="w-4 h-4 mx-auto text-gray-400" />
            </div>

            {/* Day column headers */}
            {weekData.map((dayData, index) => {
              const isToday = format(dayData.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isWeekend = index >= 5;

              return (
                <div
                  key={dayData.day}
                  className={`
                    flex-1 min-w-24 px-2 py-2 text-center border-r border-gray-100 last:border-r-0
                    ${isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-100' : ''}
                  `}
                  onMouseEnter={() => setHoveredDay(dayData.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className={`font-semibold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                    {DAYS_OF_WEEK[index]}
                  </div>
                  <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {format(dayData.date, 'd MMM')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {dayData.totalAvailableHours}h avail / {dayData.totalBookedHours}h booked
                  </div>

                  {/* Day actions on hover */}
                  {hoveredDay === dayData.day && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <button
                        onClick={() => clearDay(dayData.day as any)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Clear day"
                      >
                        <Trash2 className="w-3 h-3 text-gray-500" />
                      </button>
                      {index > 0 && (
                        <button
                          onClick={() => copyDay(DAY_KEYS[index - 1], dayData.day as any)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Copy from previous day"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          {TIME_SLOTS.map((timeSlot, _slotIndex) => (
            <div
              key={`${timeSlot.hour}-${timeSlot.minute}`}
              className={`flex border-b border-gray-100 ${timeSlot.minute === 0 ? 'border-t border-gray-200' : ''}`}
            >
              {/* Time label */}
              <div className="w-20 flex-shrink-0 px-2 py-1 text-center border-r border-gray-200 text-xs text-gray-500">
                {timeSlot.minute === 0 && timeSlot.label}
              </div>

              {/* Day slots */}
              {weekData.map((dayData, dayIndex) => {
                const slot = dayData.slots.find(s => s.hour === timeSlot.hour && s.minute === timeSlot.minute);
                if (!slot) return <div key={dayData.day} className="flex-1 min-w-24 h-6 border-r border-gray-100" />;

                const isWeekend = dayIndex >= 5;
                const slotStyle = getSlotStyle(slot.type, slot.isPreferred, slot.isBooked);
                const tooltip = getSlotTooltip(slot.type, slot.isPreferred, slot.isBooked, slot.visitDetails);

                return (
                  <div
                    key={dayData.day}
                    className={`
                      flex-1 min-w-24 h-6 border-r border-gray-100 last:border-r-0 cursor-pointer
                      ${isWeekend ? 'bg-gray-50' : ''}
                    `}
                    onClick={() => handleSlotClick(dayData.day, timeSlot.hour, timeSlot.minute)}
                    title={tooltip}
                  >
                    <div className={`h-full ${slotStyle} transition-colors`}>
                      {slot.isPreferred && slot.type !== null && !slot.isBooked && (
                        <Star className="w-3 h-3 text-white mx-auto mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-300" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-400 flex items-center justify-center">
              <Star className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-gray-600">Preferred</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300" />
            <span className="text-gray-600">Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-gray-600">Booked</span>
          </div>
        </div>

        <div className="text-gray-600">
          Total available:{' '}
          <strong>
            {weekData.reduce((sum, d) => sum + d.totalAvailableHours, 0)}h
          </strong>
          {' '} | Booked:{' '}
          <strong>
            {weekData.reduce((sum, d) => sum + d.totalBookedHours, 0)}h
          </strong>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityGrid;
