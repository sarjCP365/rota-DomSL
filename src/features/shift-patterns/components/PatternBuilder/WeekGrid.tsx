/**
 * WeekGrid Component
 * Core visual component for defining shifts for each day of the week
 * 
 * Features:
 * - 7-day grid (Mon-Sun) for a given week
 * - Different states: working day, rest day, empty
 * - Color-coded by shift type (day, evening, night)
 * - Click to open ShiftEditor
 * - Right-click context menu (Copy, Paste, Clear, Set as Rest Day)
 * - Validation indicators (rest period violations)
 * - Copy Week functionality
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  Moon, 
  Coffee,
  ChevronDown,
  AlertTriangle,
  Sun,
  Sunset,
  Check,
} from 'lucide-react';
import type { PatternDayFormData, DayOfWeek } from '../../types';
import { DayOfWeek as DayOfWeekEnum, DayOfWeekShortLabels } from '../../types';
import { ShiftEditor } from './ShiftEditor';
import type { ShiftReference, ShiftActivity } from '../../../../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface WeekGridProps {
  weekNumber: number;
  days: PatternDayFormData[];
  rotationCycleWeeks: number;
  shiftReferences: ShiftReference[];
  shiftActivities: ShiftActivity[];
  onDayChange: (dayIndex: DayOfWeek, data: PatternDayFormData) => void;
  onCopyWeek?: (targetWeek: number) => void;
  onDaysChange?: (days: PatternDayFormData[]) => void;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  dayOfWeek: DayOfWeek | null;
}

interface DayCellProps {
  dayOfWeek: DayOfWeek;
  dayData: PatternDayFormData | undefined;
  weekNumber: number;
  previousDayData: PatternDayFormData | undefined;
  onDayClick: (dayOfWeek: DayOfWeek) => void;
  onContextMenu: (e: React.MouseEvent, dayOfWeek: DayOfWeek) => void;
  isSelected: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine shift type based on start time
 * Day: 06:00 - 17:59
 * Evening: 18:00 - 21:59
 * Night: 22:00 - 05:59
 */
function getShiftType(startTime: string | undefined): 'day' | 'evening' | 'night' | null {
  if (!startTime) return null;
  
  const [hours] = startTime.split(':').map(Number);
  
  if (hours >= 6 && hours < 18) return 'day';
  if (hours >= 18 && hours < 22) return 'evening';
  return 'night';
}

/**
 * Get background colour based on shift type
 */
function getShiftTypeStyles(type: 'day' | 'evening' | 'night' | null): {
  bg: string;
  border: string;
  text: string;
  icon: typeof Sun;
} {
  switch (type) {
    case 'day':
      return { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-900', icon: Sun };
    case 'evening':
      return { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', icon: Sunset };
    case 'night':
      return { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900', icon: Moon };
    default:
      return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', icon: Sun };
  }
}

/**
 * Calculate shift duration in hours (excluding break)
 */
function calculateDuration(
  startTime: string | undefined,
  endTime: string | undefined,
  breakMinutes: number | undefined,
  isOvernight: boolean
): string {
  if (!startTime || !endTime) return '0h 00m';
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight shifts
  if (isOvernight || endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const totalMinutes = endMinutes - startMinutes - (breakMinutes || 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

/**
 * Check for rest period violation (< 11 hours from previous shift)
 */
function hasRestPeriodViolation(
  currentDay: PatternDayFormData | undefined,
  previousDay: PatternDayFormData | undefined
): boolean {
  if (!currentDay || !previousDay) return false;
  if (currentDay.isRestDay || previousDay.isRestDay) return false;
  if (!currentDay.startTime || !previousDay.endTime) return false;
  
  const [prevEndH, prevEndM] = previousDay.endTime.split(':').map(Number);
  const [currStartH, currStartM] = currentDay.startTime.split(':').map(Number);
  
  let prevEndMinutes = prevEndH * 60 + prevEndM;
  let currStartMinutes = currStartH * 60 + currStartM;
  
  // If previous shift is overnight, end time is next day
  if (previousDay.isOvernight) {
    // Rest period spans to next day
    currStartMinutes += 24 * 60;
  }
  
  // Calculate rest period
  const restMinutes = currStartMinutes - prevEndMinutes;
  const restHours = restMinutes / 60;
  
  // UK Working Time Regulations: minimum 11 hours rest
  return restHours > 0 && restHours < 11;
}

// =============================================================================
// DAY CELL COMPONENT
// =============================================================================

function DayCell({
  dayOfWeek,
  dayData,
  weekNumber,
  previousDayData,
  onDayClick,
  onContextMenu,
  isSelected,
}: DayCellProps) {
  const isRestDay = dayData?.isRestDay ?? true;
  const hasShiftData = dayData && !isRestDay && dayData.startTime && dayData.endTime;
  const shiftType = hasShiftData ? getShiftType(dayData.startTime) : null;
  const styles = getShiftTypeStyles(shiftType);
  const hasViolation = hasRestPeriodViolation(dayData, previousDayData);
  
  const isWeekend = dayOfWeek === DayOfWeekEnum.Saturday || dayOfWeek === DayOfWeekEnum.Sunday;
  
  return (
    <div
      onClick={() => onDayClick(dayOfWeek)}
      onContextMenu={(e) => onContextMenu(e, dayOfWeek)}
      className={`
        relative min-h-32 cursor-pointer rounded-lg border-2 p-3 transition-all
        ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
        ${hasViolation ? 'border-red-400' : ''}
        ${isRestDay 
          ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' 
          : hasShiftData 
            ? `${styles.border} ${styles.bg} hover:brightness-95` 
            : 'border-dashed border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'
        }
      `}
    >
      {/* Day Header */}
      <div className={`mb-2 flex items-center justify-between text-xs font-medium ${
        isWeekend ? 'text-slate-600' : 'text-slate-700'
      }`}>
        <span>{DayOfWeekShortLabels[dayOfWeek]}</span>
        {hasViolation && (
          <span title="Rest period violation (< 11 hours)">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          </span>
        )}
      </div>
      
      {/* Content */}
      {isRestDay ? (
        <div className="flex h-20 flex-col items-center justify-center">
          <Coffee className="h-5 w-5 text-slate-400" />
          <span className="mt-1 text-xs font-medium text-slate-400">REST</span>
        </div>
      ) : hasShiftData ? (
        <div className="space-y-1">
          {/* Shift Type Icon */}
          <div className="flex items-center gap-1.5">
            <styles.icon className={`h-4 w-4 ${styles.text}`} />
            <span className={`text-xs font-semibold ${styles.text}`}>
              {shiftType === 'day' && 'Day Shift'}
              {shiftType === 'evening' && 'Evening'}
              {shiftType === 'night' && 'Night'}
            </span>
          </div>
          
          {/* Times */}
          <div className={`text-sm font-medium ${styles.text}`}>
            {dayData.startTime} - {dayData.endTime}
            {dayData.isOvernight && (
              <span className="ml-1 text-xs font-normal opacity-75">(+1)</span>
            )}
          </div>
          
          {/* Duration */}
          <div className={`text-xs ${styles.text} opacity-75`}>
            {calculateDuration(dayData.startTime, dayData.endTime, dayData.breakMinutes, dayData.isOvernight)}
          </div>
          
          {/* Break indicator */}
          {dayData.breakMinutes && dayData.breakMinutes > 0 && (
            <div className={`text-xs ${styles.text} opacity-60`}>
              {dayData.breakMinutes}m break
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-20 flex-col items-center justify-center text-slate-400">
          <span className="text-2xl">+</span>
          <span className="text-xs">Add Shift</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONTEXT MENU COMPONENT
// =============================================================================

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onSetRestDay: () => void;
  onSetWorkingDay: () => void;
  hasClipboard: boolean;
  isCurrentlyRestDay: boolean;
}

function ContextMenu({
  state,
  onClose,
  onCopy,
  onPaste,
  onClear,
  onSetRestDay,
  onSetWorkingDay,
  hasClipboard,
  isCurrentlyRestDay,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.isOpen, onClose]);
  
  if (!state.isOpen) return null;
  
  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      style={{ left: state.x, top: state.y }}
    >
      <button
        onClick={onCopy}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
      >
        <Copy className="h-4 w-4" />
        Copy
      </button>
      <button
        onClick={onPaste}
        disabled={!hasClipboard}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ClipboardPaste className="h-4 w-4" />
        Paste
      </button>
      <div className="my-1 border-t border-slate-100" />
      {isCurrentlyRestDay ? (
        <button
          onClick={onSetWorkingDay}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          <Sun className="h-4 w-4" />
          Set as Working Day
        </button>
      ) : (
        <button
          onClick={onSetRestDay}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          <Coffee className="h-4 w-4" />
          Set as Rest Day
        </button>
      )}
      <button
        onClick={onClear}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WeekGrid({
  weekNumber,
  days,
  rotationCycleWeeks,
  shiftReferences,
  shiftActivities,
  onDayChange,
  onCopyWeek,
  onDaysChange,
}: WeekGridProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    dayOfWeek: null,
  });
  const [clipboard, setClipboard] = useState<PatternDayFormData | null>(null);
  const [showCopyWeekMenu, setShowCopyWeekMenu] = useState(false);
  const copyWeekRef = useRef<HTMLDivElement>(null);
  const editorAnchorRef = useRef<HTMLDivElement>(null);
  
  // Days of week in order
  const daysOfWeekOrder: DayOfWeek[] = [
    DayOfWeekEnum.Monday,
    DayOfWeekEnum.Tuesday,
    DayOfWeekEnum.Wednesday,
    DayOfWeekEnum.Thursday,
    DayOfWeekEnum.Friday,
    DayOfWeekEnum.Saturday,
    DayOfWeekEnum.Sunday,
  ];
  
  // Get day data by day of week
  const getDayData = useCallback((dayOfWeek: DayOfWeek): PatternDayFormData | undefined => {
    return days.find(d => d.dayOfWeek === dayOfWeek);
  }, [days]);
  
  // Calculate weekly hours
  const weeklyHours = useMemo(() => {
    let totalMinutes = 0;
    
    for (const day of days) {
      if (day.isRestDay || !day.startTime || !day.endTime) continue;
      
      const [startH, startM] = day.startTime.split(':').map(Number);
      const [endH, endM] = day.endTime.split(':').map(Number);
      
      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;
      
      if (day.isOvernight || endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }
      
      totalMinutes += endMinutes - startMinutes - (day.breakMinutes || 0);
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }, [days]);
  
  // Count working days
  const workingDaysCount = useMemo(() => {
    return days.filter(d => !d.isRestDay && d.startTime && d.endTime).length;
  }, [days]);
  
  // Handle day click
  const handleDayClick = useCallback((dayOfWeek: DayOfWeek) => {
    setSelectedDay(dayOfWeek);
    setEditingDay(dayOfWeek);
  }, []);
  
  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, dayOfWeek: DayOfWeek) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      dayOfWeek,
    });
  }, []);
  
  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  // Context menu actions
  const handleCopy = useCallback(() => {
    if (contextMenu.dayOfWeek) {
      const dayData = getDayData(contextMenu.dayOfWeek);
      if (dayData) {
        setClipboard({ ...dayData });
      }
    }
    closeContextMenu();
  }, [contextMenu.dayOfWeek, getDayData, closeContextMenu]);
  
  const handlePaste = useCallback(() => {
    if (contextMenu.dayOfWeek && clipboard) {
      onDayChange(contextMenu.dayOfWeek, {
        ...clipboard,
        weekNumber,
        dayOfWeek: contextMenu.dayOfWeek,
      });
    }
    closeContextMenu();
  }, [contextMenu.dayOfWeek, clipboard, onDayChange, weekNumber, closeContextMenu]);
  
  const handleClear = useCallback(() => {
    if (contextMenu.dayOfWeek) {
      onDayChange(contextMenu.dayOfWeek, {
        weekNumber,
        dayOfWeek: contextMenu.dayOfWeek,
        isRestDay: true,
        isOvernight: false,
      });
    }
    closeContextMenu();
  }, [contextMenu.dayOfWeek, onDayChange, weekNumber, closeContextMenu]);
  
  const handleSetRestDay = useCallback(() => {
    if (contextMenu.dayOfWeek) {
      onDayChange(contextMenu.dayOfWeek, {
        weekNumber,
        dayOfWeek: contextMenu.dayOfWeek,
        isRestDay: true,
        isOvernight: false,
      });
    }
    closeContextMenu();
  }, [contextMenu.dayOfWeek, onDayChange, weekNumber, closeContextMenu]);
  
  const handleSetWorkingDay = useCallback(() => {
    if (contextMenu.dayOfWeek) {
      const existingData = getDayData(contextMenu.dayOfWeek);
      onDayChange(contextMenu.dayOfWeek, {
        weekNumber,
        dayOfWeek: contextMenu.dayOfWeek,
        isRestDay: false,
        isOvernight: existingData?.isOvernight ?? false,
        startTime: existingData?.startTime || '09:00',
        endTime: existingData?.endTime || '17:00',
        breakMinutes: existingData?.breakMinutes || 30,
      });
    }
    closeContextMenu();
  }, [contextMenu.dayOfWeek, getDayData, onDayChange, weekNumber, closeContextMenu]);
  
  // Handle shift editor save
  const handleShiftSave = useCallback((data: PatternDayFormData) => {
    if (editingDay) {
      onDayChange(editingDay, {
        ...data,
        weekNumber,
        dayOfWeek: editingDay,
      });
    }
    setEditingDay(null);
  }, [editingDay, onDayChange, weekNumber]);
  
  // Handle shift editor close
  const handleShiftClose = useCallback(() => {
    setEditingDay(null);
  }, []);
  
  // Close copy week menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (copyWeekRef.current && !copyWeekRef.current.contains(event.target as Node)) {
        setShowCopyWeekMenu(false);
      }
    }
    
    if (showCopyWeekMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCopyWeekMenu]);
  
  // Get editing day data for ShiftEditor
  const editingDayData = editingDay ? getDayData(editingDay) : undefined;
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-slate-900">
            Week {weekNumber} of {rotationCycleWeeks}
          </h3>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-700">{workingDaysCount}</span>
              working days
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-700">{weeklyHours}</span>
              total
            </span>
          </div>
        </div>
        
        {/* Copy Week Button */}
        {rotationCycleWeeks > 1 && onCopyWeek && (
          <div className="relative" ref={copyWeekRef}>
            <button
              type="button"
              onClick={() => setShowCopyWeekMenu(!showCopyWeekMenu)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              Copy to Week
              <ChevronDown className={`h-4 w-4 transition-transform ${showCopyWeekMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showCopyWeekMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {Array.from({ length: rotationCycleWeeks }, (_, i) => i + 1)
                  .filter(w => w !== weekNumber)
                  .map(targetWeek => (
                    <button
                      key={targetWeek}
                      onClick={() => {
                        onCopyWeek(targetWeek);
                        setShowCopyWeekMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Check className="h-4 w-4 opacity-0" />
                      Week {targetWeek}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 p-4" ref={editorAnchorRef}>
        {daysOfWeekOrder.map((dayOfWeek, index) => {
          const prevDayOfWeek = index > 0 ? daysOfWeekOrder[index - 1] : null;
          return (
            <DayCell
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              dayData={getDayData(dayOfWeek)}
              weekNumber={weekNumber}
              previousDayData={prevDayOfWeek ? getDayData(prevDayOfWeek) : undefined}
              onDayClick={handleDayClick}
              onContextMenu={handleContextMenu}
              isSelected={selectedDay === dayOfWeek}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />
          <span>Day (06:00-17:59)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-blue-300 bg-blue-100" />
          <span>Evening (18:00-21:59)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-purple-300 bg-purple-100" />
          <span>Night (22:00-05:59)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-slate-200 bg-slate-50" />
          <span>Rest Day</span>
        </div>
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        state={contextMenu}
        onClose={closeContextMenu}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onClear={handleClear}
        onSetRestDay={handleSetRestDay}
        onSetWorkingDay={handleSetWorkingDay}
        hasClipboard={!!clipboard}
        isCurrentlyRestDay={contextMenu.dayOfWeek ? (getDayData(contextMenu.dayOfWeek)?.isRestDay ?? true) : false}
      />
      
      {/* Shift Editor Modal */}
      {editingDay && (
        <ShiftEditor
          dayData={editingDayData || {
            weekNumber,
            dayOfWeek: editingDay,
            isRestDay: true,
            isOvernight: false,
          }}
          weekNumber={weekNumber}
          dayOfWeek={editingDay}
          shiftReferences={shiftReferences}
          shiftActivities={shiftActivities}
          onSave={handleShiftSave}
          onClose={handleShiftClose}
        />
      )}
    </div>
  );
}

export default WeekGrid;

