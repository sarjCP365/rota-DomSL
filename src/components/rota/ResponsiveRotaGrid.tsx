/**
 * ResponsiveRotaGrid Component
 * 
 * Responsive wrapper for the rota grid that adapts to different screen sizes.
 * Provides mobile-optimized views with day selectors and card-based layouts.
 * 
 * Breakpoints:
 * - Desktop (>1200px): Full hierarchy visible
 * - Tablet (768-1200px): Condensed 3-4 day view
 * - Mobile (<768px): Single day view with day selector
 * 
 * Features:
 * - Responsive breakpoint detection
 * - Mobile day selector with swipe support
 * - Card-based staff display on mobile
 * - Touch interactions
 * - Virtual scrolling for large lists
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, addDays, isSameDay, startOfWeek, isToday } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  User,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { 
  ShiftViewData, 
  SublocationStaffViewData,
  Shift,
} from '../../api/dataverse/types';
import type { ViewMode, DetailLevel } from '../../store/rotaStore';

// =============================================================================
// TYPES
// =============================================================================

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveRotaGridProps {
  /** Start date for the grid */
  startDate: Date;
  /** Number of days to display (7, 14, or 28) */
  duration: 7 | 14 | 28;
  /** Staff members */
  staff: SublocationStaffViewData[];
  /** Shifts */
  shifts: ShiftViewData[];
  /** View mode */
  viewMode?: ViewMode;
  /** Detail level */
  detailLevel?: DetailLevel;
  /** Callback when a shift is clicked */
  onShiftClick?: (shift: ShiftViewData) => void;
  /** Callback when a cell is clicked */
  onCellClick?: (date: Date, staffMemberId: string | null) => void;
  /** Callback for pull-to-refresh */
  onRefresh?: () => void;
  /** Whether data is loading */
  isLoading?: boolean;
}

interface MobileStaffCardProps {
  staff: SublocationStaffViewData;
  shifts: ShiftViewData[];
  date: Date;
  onShiftClick?: (shift: ShiftViewData) => void;
  onAddShift?: () => void;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to detect current breakpoint
 */
function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1200) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Hook for swipe gestures
 */
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        onSwipeLeft(); // Swiped left (next)
      } else {
        onSwipeRight(); // Swiped right (prev)
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ResponsiveRotaGrid({
  startDate,
  duration,
  staff,
  shifts,
  viewMode = 'people',
  detailLevel = 'detailed',
  onShiftClick,
  onCellClick,
  onRefresh,
  isLoading = false,
}: ResponsiveRotaGridProps) {
  const breakpoint = useBreakpoint();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Generate dates
  const dates = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < duration; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, duration]);

  // Selected date for mobile view
  const selectedDate = dates[selectedDayIndex] || dates[0];

  // Navigate days
  const goToNextDay = useCallback(() => {
    setSelectedDayIndex((prev) => Math.min(prev + 1, dates.length - 1));
  }, [dates.length]);

  const goToPrevDay = useCallback(() => {
    setSelectedDayIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Swipe handlers
  const swipeHandlers = useSwipe(goToNextDay, goToPrevDay);

  // Find today's index and auto-select it on mobile
  useEffect(() => {
    if (breakpoint === 'mobile') {
      const todayIndex = dates.findIndex((d) => isToday(d));
      if (todayIndex >= 0) {
        setSelectedDayIndex(todayIndex);
      }
    }
  }, [breakpoint, dates]);

  // Get shifts for a specific date
  const getShiftsForDate = useCallback((date: Date, staffId?: string) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift['Shift Date']);
      const dateMatch = isSameDay(shiftDate, date);
      if (staffId) {
        return dateMatch && shift['Staff Member ID'] === staffId;
      }
      return dateMatch;
    });
  }, [shifts]);

  // Pull to refresh handler
  const handlePullRefresh = useCallback(() => {
    if (onRefresh && !isLoading) {
      setIsPulling(true);
      onRefresh();
      setTimeout(() => setIsPulling(false), 1000);
    }
  }, [onRefresh, isLoading]);

  // Render based on breakpoint
  if (breakpoint === 'mobile') {
    return (
      <MobileView
        dates={dates}
        selectedDayIndex={selectedDayIndex}
        onSelectDay={setSelectedDayIndex}
        staff={staff}
        shifts={shifts}
        getShiftsForDate={getShiftsForDate}
        onShiftClick={onShiftClick}
        onCellClick={onCellClick}
        swipeHandlers={swipeHandlers}
        onRefresh={handlePullRefresh}
        isLoading={isLoading || isPulling}
      />
    );
  }

  if (breakpoint === 'tablet') {
    return (
      <TabletView
        dates={dates}
        selectedDayIndex={selectedDayIndex}
        onSelectDay={setSelectedDayIndex}
        staff={staff}
        shifts={shifts}
        getShiftsForDate={getShiftsForDate}
        onShiftClick={onShiftClick}
        onCellClick={onCellClick}
        detailLevel={detailLevel}
      />
    );
  }

  // Desktop - return null to let parent use normal grid
  return null;
}

// =============================================================================
// MOBILE VIEW
// =============================================================================

interface MobileViewProps {
  dates: Date[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  staff: SublocationStaffViewData[];
  shifts: ShiftViewData[];
  getShiftsForDate: (date: Date, staffId?: string) => ShiftViewData[];
  onShiftClick?: (shift: ShiftViewData) => void;
  onCellClick?: (date: Date, staffMemberId: string | null) => void;
  swipeHandlers: ReturnType<typeof useSwipe>;
  onRefresh?: () => void;
  isLoading: boolean;
}

function MobileView({
  dates,
  selectedDayIndex,
  onSelectDay,
  staff,
  shifts,
  getShiftsForDate,
  onShiftClick,
  onCellClick,
  swipeHandlers,
  onRefresh,
  isLoading,
}: MobileViewProps) {
  const selectedDate = dates[selectedDayIndex];
  const dayShifts = getShiftsForDate(selectedDate);
  const unassignedShifts = dayShifts.filter((s) => !s['Staff Member ID']);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Day selector tabs */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex items-center justify-between px-2 py-1">
          <button
            onClick={() => onSelectDay(Math.max(0, selectedDayIndex - 1))}
            disabled={selectedDayIndex === 0}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="overflow-x-auto">
            <div className="flex gap-1 px-2">
              {dates.map((date, idx) => {
                const isSelected = idx === selectedDayIndex;
                const isTodayDate = isToday(date);
                const hasShifts = getShiftsForDate(date).length > 0;

                return (
                  <button
                    key={idx}
                    onClick={() => onSelectDay(idx)}
                    className={`
                      flex min-w-[48px] flex-col items-center rounded-lg px-2 py-1.5 transition-colors
                      ${isSelected 
                        ? 'bg-primary text-white' 
                        : isTodayDate 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-[10px] font-medium uppercase">
                      {format(date, 'EEE')}
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? '' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {hasShifts && !isSelected && (
                      <div className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onSelectDay(Math.min(dates.length - 1, selectedDayIndex + 1))}
            disabled={selectedDayIndex === dates.length - 1}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Selected date header */}
        <div className="border-t border-gray-100 px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(selectedDate, 'EEEE')}
              </h2>
              <p className="text-sm text-gray-500">
                {format(selectedDate, 'd MMMM yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                {dayShifts.length} shifts
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Staff cards with swipe */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        {...swipeHandlers}
      >
        {/* Unassigned section */}
        {unassignedShifts.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
              <span>⚠️</span>
              Unassigned ({unassignedShifts.length})
            </h3>
            <div className="space-y-2">
              {unassignedShifts.map((shift) => (
                <MobileShiftCard
                  key={shift['Shift ID']}
                  shift={shift}
                  isUnassigned
                  onClick={() => onShiftClick?.(shift)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Staff cards */}
        <div className="space-y-3">
          {staff.map((s) => {
            const staffShifts = getShiftsForDate(selectedDate, s['Staff Member ID']);
            
            return (
              <MobileStaffCard
                key={s['Staff Member ID']}
                staff={s}
                shifts={staffShifts}
                date={selectedDate}
                onShiftClick={onShiftClick}
                onAddShift={() => onCellClick?.(selectedDate, s['Staff Member ID'])}
              />
            );
          })}
        </div>

        {/* Empty state */}
        {staff.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">No staff members</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MOBILE STAFF CARD
// =============================================================================

function MobileStaffCard({
  staff,
  shifts,
  date,
  onShiftClick,
  onAddShift,
}: MobileStaffCardProps) {
  const displayName = staff['Staff Member Name'] || 'Unknown';
  const initial = displayName.charAt(0).toUpperCase();
  const hasShifts = shifts.length > 0;

  // Calculate total hours
  const totalHours = shifts.reduce((sum, shift) => {
    const start = new Date(shift['Shift Start Time']);
    const end = new Date(shift['Shift End Time']);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return sum + Math.max(0, hours - ((shift['Shift Break Duration'] || 0) / 60));
  }, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initial}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{displayName}</h3>
          <p className="text-xs text-gray-500">
            {staff['Job Title Name'] || 'Staff Member'}
          </p>
        </div>
        {hasShifts && (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {Math.round(totalHours * 10) / 10}h
          </span>
        )}
      </div>

      {/* Shifts or empty state */}
      <div className="p-3">
        {hasShifts ? (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <MobileShiftCard
                key={shift['Shift ID']}
                shift={shift}
                onClick={() => onShiftClick?.(shift)}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={onAddShift}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400 hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add Shift
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MOBILE SHIFT CARD
// =============================================================================

interface MobileShiftCardProps {
  shift: ShiftViewData;
  isUnassigned?: boolean;
  onClick?: () => void;
}

function MobileShiftCard({ shift, isUnassigned, onClick }: MobileShiftCardProps) {
  const startTime = format(new Date(shift['Shift Start Time']), 'HH:mm');
  const endTime = format(new Date(shift['Shift End Time']), 'HH:mm');
  
  // Calculate duration
  const start = new Date(shift['Shift Start Time']);
  const end = new Date(shift['Shift End Time']);
  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  // Determine shift type
  const shiftType = shift['Sleep In'] 
    ? 'sleepIn' 
    : start.getHours() >= 20 || start.getHours() < 6 
      ? 'night' 
      : 'day';

  const bgColors = {
    day: 'bg-[#FCE4B4]',
    night: 'bg-[#BEDAE3]',
    sleepIn: 'bg-[#D3C7E6]',
  };

  const icons = {
    day: '☀️',
    night: '🌙',
    sleepIn: '🛏️',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all
        ${bgColors[shiftType]}
        ${isUnassigned ? 'border-2 border-dashed border-red-400' : ''}
        hover:shadow-md active:scale-[0.98]
      `}
    >
      <span className="text-xl">{icons[shiftType]}</span>
      <div className="flex-1">
        <div className="font-semibold text-gray-900">
          {startTime} - {endTime}
        </div>
        <div className="text-xs text-gray-600">
          {Math.round(duration * 10) / 10}h
          {shift['Shift Reference Name'] && ` • ${shift['Shift Reference Name']}`}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {!shift['Shift Status'] && (
          <span className="rounded bg-gray-900/20 px-1.5 py-0.5 text-[10px] font-bold">*</span>
        )}
        {shift['Shift Leader'] && (
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">SL</span>
        )}
        {shift['Act Up'] && (
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">AU</span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// TABLET VIEW
// =============================================================================

interface TabletViewProps {
  dates: Date[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  staff: SublocationStaffViewData[];
  shifts: ShiftViewData[];
  getShiftsForDate: (date: Date, staffId?: string) => ShiftViewData[];
  onShiftClick?: (shift: ShiftViewData) => void;
  onCellClick?: (date: Date, staffMemberId: string | null) => void;
  detailLevel: DetailLevel;
}

function TabletView({
  dates,
  selectedDayIndex,
  onSelectDay,
  staff,
  shifts,
  getShiftsForDate,
  onShiftClick,
  onCellClick,
  detailLevel,
}: TabletViewProps) {
  // Show 4 days at a time on tablet
  const visibleDays = 4;
  const startIdx = Math.max(0, Math.min(selectedDayIndex, dates.length - visibleDays));
  const visibleDates = dates.slice(startIdx, startIdx + visibleDays);

  const canScrollLeft = startIdx > 0;
  const canScrollRight = startIdx + visibleDays < dates.length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border-grey bg-white">
      {/* Header with navigation */}
      <div className="flex items-center justify-between border-b border-border-grey bg-elevation-1 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectDay(Math.max(0, startIdx - 1))}
            disabled={!canScrollLeft}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-600">
            {format(visibleDates[0], 'd MMM')} - {format(visibleDates[visibleDates.length - 1], 'd MMM')}
          </span>
          <button
            onClick={() => onSelectDay(Math.min(dates.length - visibleDays, startIdx + 1))}
            disabled={!canScrollRight}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {staff.length} staff • {shifts.length} shifts
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-max border-collapse">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="sticky left-0 z-20 w-44 min-w-44 border-b border-r border-border-grey bg-elevation-1 px-3 py-2 text-left text-sm font-semibold text-gray-700">
                Staff
              </th>
              {visibleDates.map((date, idx) => {
                const isTodayDate = isToday(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                  <th
                    key={idx}
                    className={`min-w-32 border-b border-r border-border-grey px-2 py-2 text-center ${
                      isTodayDate ? 'bg-primary/10' : isWeekend ? 'bg-gray-50' : 'bg-elevation-1'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-500">
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-sm font-semibold ${isTodayDate ? 'text-primary' : 'text-gray-900'}`}>
                      {format(date, 'd MMM')}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s['Staff Member ID']} className="group hover:bg-gray-50/50">
                <td className="sticky left-0 z-10 w-44 min-w-44 border-b border-r border-border-grey bg-white px-3 py-2 group-hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {(s['Staff Member Name'] || 'U').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {s['Staff Member Name']}
                      </div>
                      {detailLevel !== 'hoursOnly' && s['Job Title Name'] && (
                        <div className="truncate text-xs text-gray-500">
                          {s['Job Title Name']}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {visibleDates.map((date, idx) => {
                  const staffShifts = getShiftsForDate(date, s['Staff Member ID']);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isTodayDate = isToday(date);

                  return (
                    <td
                      key={idx}
                      onClick={() => onCellClick?.(date, s['Staff Member ID'])}
                      className={`min-w-32 border-b border-r border-border-grey p-1 align-top ${
                        isTodayDate ? 'bg-primary/5' : isWeekend ? 'bg-gray-50/50' : ''
                      } cursor-pointer hover:bg-primary/10`}
                    >
                      <div className="flex flex-col gap-1">
                        {staffShifts.map((shift) => (
                          <TabletShiftCard
                            key={shift['Shift ID']}
                            shift={shift}
                            onClick={() => onShiftClick?.(shift)}
                            compact={detailLevel === 'compact' || detailLevel === 'hoursOnly'}
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// TABLET SHIFT CARD
// =============================================================================

interface TabletShiftCardProps {
  shift: ShiftViewData;
  onClick: () => void;
  compact?: boolean;
}

function TabletShiftCard({ shift, onClick, compact }: TabletShiftCardProps) {
  const startTime = format(new Date(shift['Shift Start Time']), 'HH:mm');
  const endTime = format(new Date(shift['Shift End Time']), 'HH:mm');
  const start = new Date(shift['Shift Start Time']);

  const shiftType = shift['Sleep In'] 
    ? 'sleepIn' 
    : start.getHours() >= 20 || start.getHours() < 6 
      ? 'night' 
      : 'day';

  const bgColors = {
    day: 'bg-[#FCE4B4]',
    night: 'bg-[#BEDAE3]',
    sleepIn: 'bg-[#D3C7E6]',
  };

  const icons = {
    day: '☀️',
    night: '🌙',
    sleepIn: '🛏️',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        w-full rounded-md px-2 py-1 text-left transition-all
        ${bgColors[shiftType]}
        hover:shadow-md hover:brightness-95
      `}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{icons[shiftType]}</span>
        <span className="text-xs font-semibold">
          {startTime}-{endTime}
        </span>
      </div>
      {!compact && shift['Shift Reference Name'] && (
        <div className="truncate text-[10px] text-gray-600">
          {shift['Shift Reference Name']}
        </div>
      )}
    </button>
  );
}

// =============================================================================
// RESPONSIVE WRAPPER HOOK
// =============================================================================

/**
 * Hook to determine if responsive mobile/tablet view should be used
 */
export function useResponsiveView() {
  const breakpoint = useBreakpoint();
  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    shouldUseResponsiveGrid: breakpoint !== 'desktop',
  };
}

// =============================================================================
// CSS UTILITIES (for parent components)
// =============================================================================

export const responsiveGridStyles = `
/* Mobile first */
.rota-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .rota-grid {
    display: grid;
    grid-template-columns: 200px repeat(7, 1fr);
  }
}

@media (min-width: 1200px) {
  .rota-grid {
    grid-template-columns: 250px repeat(7, minmax(100px, 1fr));
  }
}

/* Touch-friendly tap targets */
@media (max-width: 768px) {
  .shift-card {
    min-height: 44px;
    touch-action: manipulation;
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .rota-grid * {
    animation: none !important;
    transition: none !important;
  }
}
`;

// =============================================================================
// EXPORTS
// =============================================================================

export type { ResponsiveRotaGridProps, Breakpoint };

