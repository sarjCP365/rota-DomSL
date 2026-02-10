/**
 * DateNavigation Component
 * Date navigation with previous/next buttons, date picker, and keyboard shortcuts
 * Design aligned with cp365-complex-ld
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

interface DateNavigationProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Callback when date changes */
  onDateChange: (date: Date) => void;
  /** Whether data is currently loading */
  isLoading?: boolean;
}

/**
 * Generate calendar days for a month view
 */
function generateCalendarDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });

  const days: Date[] = [];
  let current = start;

  while (current <= end) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export function DateNavigation({
  selectedDate,
  onDateChange,
  isLoading = false,
}: DateNavigationProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(selectedDate);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // -------------------------------------------------------------------------
  // Navigation Handlers
  // -------------------------------------------------------------------------

  const handlePreviousDay = useCallback(() => {
    if (!isLoading) {
      onDateChange(subDays(selectedDate, 1));
    }
  }, [selectedDate, onDateChange, isLoading]);

  const handleNextDay = useCallback(() => {
    if (!isLoading) {
      onDateChange(addDays(selectedDate, 1));
    }
  }, [selectedDate, onDateChange, isLoading]);

  const handleToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onDateChange(today);
    setIsPickerOpen(false);
  }, [onDateChange]);

  const handleYesterday = useCallback(() => {
    const yesterday = subDays(new Date(), 1);
    yesterday.setHours(0, 0, 0, 0);
    onDateChange(yesterday);
    setIsPickerOpen(false);
  }, [onDateChange]);

  const handleTomorrow = useCallback(() => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(0, 0, 0, 0);
    onDateChange(tomorrow);
    setIsPickerOpen(false);
  }, [onDateChange]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      onDateChange(date);
      setIsPickerOpen(false);
    },
    [onDateChange]
  );

  const handlePreviousMonth = useCallback(() => {
    setViewMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Keyboard Shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousDay();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextDay();
          break;
        case 't':
        case 'T':
          event.preventDefault();
          handleToday();
          break;
        case 'Escape':
          if (isPickerOpen) {
            event.preventDefault();
            setIsPickerOpen(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousDay, handleNextDay, handleToday, isPickerOpen]);

  // -------------------------------------------------------------------------
  // Click Outside to Close
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isPickerOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  // Sync view month when selected date changes
  useEffect(() => {
    setViewMonth(selectedDate);
  }, [selectedDate]);

  // -------------------------------------------------------------------------
  // Generate Calendar Data
  // -------------------------------------------------------------------------

  const calendarDays = generateCalendarDays(viewMonth);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="relative flex items-center gap-2">
      {/* Previous Day Button */}
      <button
        onClick={handlePreviousDay}
        disabled={isLoading}
        className="rounded-md p-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        title="Previous day (← Left Arrow)"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Date Display / Picker Trigger */}
      <button
        ref={buttonRef}
        onClick={() => setIsPickerOpen(!isPickerOpen)}
        className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/30"
        aria-expanded={isPickerOpen}
        aria-haspopup="dialog"
      >
        <Calendar className="h-4 w-4" />
        <span>{format(selectedDate, 'EEEE, d MMMM yyyy')}</span>
      </button>

      {/* Next Day Button */}
      <button
        onClick={handleNextDay}
        disabled={isLoading}
        className="rounded-md p-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        title="Next day (→ Right Arrow)"
        aria-label="Next day"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Date Picker Popup */}
      {isPickerOpen && (
        <div
          ref={pickerRef}
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
          role="dialog"
          aria-label="Choose a date"
        >
          {/* Header with Month Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={handlePreviousMonth}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="font-semibold text-slate-800">{format(viewMonth, 'MMMM yyyy')}</span>

            <button
              onClick={handleNextMonth}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Date Buttons */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleYesterday}
              className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Yesterday
            </button>
            <button
              onClick={handleToday}
              className="flex-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Today
            </button>
            <button
              onClick={handleTomorrow}
              className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Tomorrow
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="w-64">
            {/* Weekday Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {weekDays.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const isCurrentMonth = isSameMonth(day, viewMonth);

                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      rounded-md py-2 text-sm transition-colors
                      ${
                        isSelected
                          ? 'bg-emerald-600 font-semibold text-white'
                          : isTodayDate
                            ? 'bg-emerald-50 font-semibold text-emerald-700'
                            : isCurrentMonth
                              ? 'text-slate-700 hover:bg-slate-100'
                              : 'text-slate-400 hover:bg-slate-50'
                      }
                    `}
                    aria-selected={isSelected}
                    aria-current={isTodayDate ? 'date' : undefined}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsPickerOpen(false)}
            className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close date picker"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Keyboard Shortcut Hints */}
          <div className="mt-3 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
            <span className="mr-3">← → Navigate days</span>
            <span>T = Today</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateNavigation;
