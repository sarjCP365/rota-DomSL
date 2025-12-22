/**
 * PatternValidation Component
 * Displays validation messages and warnings for a pattern
 * 
 * Features:
 * - At least one working day defined
 * - All working days have start and end times
 * - Rest period warnings (< 11 hours between shifts)
 * - Consecutive working days warnings (> 6 days)
 * - Weekly hours exceed 48h (WTD warning)
 * - Invalid time configurations
 * - Click to navigate to problematic day
 */

import { useMemo, useCallback } from 'react';
import { 
  Check, 
  AlertTriangle, 
  XCircle, 
  ChevronRight,
  Info,
} from 'lucide-react';
import type { PatternDayFormData, DayOfWeek } from '../../types';
import { DayOfWeekLabels, DayOfWeek as DayOfWeekEnum } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface PatternValidationProps {
  days: PatternDayFormData[];
  rotationCycleWeeks: number;
  onNavigateToDay?: (weekNumber: number, dayOfWeek: DayOfWeek) => void;
}

type ValidationSeverity = 'error' | 'warning' | 'success' | 'info';

interface ValidationMessage {
  id: string;
  severity: ValidationSeverity;
  message: string;
  detail?: string;
  weekNumber?: number;
  dayOfWeek?: DayOfWeek;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_REST_PERIOD_HOURS = 11;
const MAX_CONSECUTIVE_WORKING_DAYS = 6;
const WTD_MAX_WEEKLY_HOURS = 48;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate shift duration in minutes
 */
function calculateShiftMinutes(
  startTime: string | undefined,
  endTime: string | undefined,
  breakMinutes: number | undefined,
  isOvernight: boolean
): number {
  if (!startTime || !endTime) return 0;
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;
  
  if (isOvernight || endMins <= startMins) {
    endMins += 24 * 60;
  }
  
  return endMins - startMins - (breakMinutes || 0);
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PatternValidation({
  days,
  rotationCycleWeeks,
  onNavigateToDay,
}: PatternValidationProps) {
  // Run all validations
  const validations = useMemo<ValidationMessage[]>(() => {
    const messages: ValidationMessage[] = [];
    
    // Get all working days with shifts
    const workingDays = days.filter(d => !d.isRestDay && d.startTime && d.endTime);
    
    // 1. Check for at least one working day
    if (workingDays.length === 0) {
      messages.push({
        id: 'no-working-days',
        severity: 'error',
        message: 'No working days defined',
        detail: 'Please add at least one working day with shift times.',
      });
    } else {
      messages.push({
        id: 'has-working-days',
        severity: 'success',
        message: `${workingDays.length} working day${workingDays.length !== 1 ? 's' : ''} defined`,
      });
    }
    
    // 2. Check for days without times
    const daysWithoutTimes = days.filter(d => !d.isRestDay && (!d.startTime || !d.endTime));
    if (daysWithoutTimes.length > 0) {
      for (const day of daysWithoutTimes) {
        messages.push({
          id: `missing-times-${day.weekNumber}-${day.dayOfWeek}`,
          severity: 'error',
          message: `Week ${day.weekNumber}, ${DayOfWeekLabels[day.dayOfWeek]}: Missing shift times`,
          detail: 'Working days must have start and end times.',
          weekNumber: day.weekNumber,
          dayOfWeek: day.dayOfWeek,
        });
      }
    }
    
    // 3. Check rest periods between consecutive days
    const dayOrder: DayOfWeek[] = [
      DayOfWeekEnum.Monday,
      DayOfWeekEnum.Tuesday,
      DayOfWeekEnum.Wednesday,
      DayOfWeekEnum.Thursday,
      DayOfWeekEnum.Friday,
      DayOfWeekEnum.Saturday,
      DayOfWeekEnum.Sunday,
    ];
    
    for (let week = 1; week <= rotationCycleWeeks; week++) {
      for (let i = 1; i < dayOrder.length; i++) {
        const prevDayOfWeek = dayOrder[i - 1];
        const currDayOfWeek = dayOrder[i];
        
        const prevDay = days.find(d => d.weekNumber === week && d.dayOfWeek === prevDayOfWeek);
        const currDay = days.find(d => d.weekNumber === week && d.dayOfWeek === currDayOfWeek);
        
        if (!prevDay || !currDay) continue;
        if (prevDay.isRestDay || currDay.isRestDay) continue;
        if (!prevDay.endTime || !currDay.startTime) continue;
        
        // Calculate rest period
        let prevEndMins = timeToMinutes(prevDay.endTime);
        let currStartMins = timeToMinutes(currDay.startTime);
        
        // If previous day is overnight, end time is next day
        if (prevDay.isOvernight) {
          // The end time is already on the same day as current day
          const restMinutes = currStartMins - prevEndMins;
          if (restMinutes >= 0 && restMinutes < MIN_REST_PERIOD_HOURS * 60) {
            messages.push({
              id: `rest-violation-${week}-${currDayOfWeek}`,
              severity: 'warning',
              message: `Week ${week}, ${DayOfWeekLabels[currDayOfWeek]}: Short rest period`,
              detail: `Only ${Math.round(restMinutes / 60)}h rest before this shift. UK minimum is ${MIN_REST_PERIOD_HOURS} hours.`,
              weekNumber: week,
              dayOfWeek: currDayOfWeek,
            });
          }
        } else {
          // Normal case: rest overnight
          const restMinutes = (24 * 60 - prevEndMins) + currStartMins;
          if (restMinutes < MIN_REST_PERIOD_HOURS * 60) {
            messages.push({
              id: `rest-violation-${week}-${currDayOfWeek}`,
              severity: 'warning',
              message: `Week ${week}, ${DayOfWeekLabels[currDayOfWeek]}: Short rest period`,
              detail: `Only ${Math.round(restMinutes / 60)}h rest before this shift. UK minimum is ${MIN_REST_PERIOD_HOURS} hours.`,
              weekNumber: week,
              dayOfWeek: currDayOfWeek,
            });
          }
        }
      }
    }
    
    // 4. Check for consecutive working days (> 6)
    for (let week = 1; week <= rotationCycleWeeks; week++) {
      let consecutiveCount = 0;
      let startDay: DayOfWeek | null = null;
      
      for (const dayOfWeek of dayOrder) {
        const day = days.find(d => d.weekNumber === week && d.dayOfWeek === dayOfWeek);
        const isWorking = day && !day.isRestDay && day.startTime && day.endTime;
        
        if (isWorking) {
          if (consecutiveCount === 0) {
            startDay = dayOfWeek;
          }
          consecutiveCount++;
        } else {
          if (consecutiveCount > MAX_CONSECUTIVE_WORKING_DAYS) {
            messages.push({
              id: `consecutive-days-${week}-${startDay}`,
              severity: 'warning',
              message: `Week ${week}: ${consecutiveCount} consecutive working days`,
              detail: `Working more than ${MAX_CONSECUTIVE_WORKING_DAYS} days in a row without rest.`,
              weekNumber: week,
              dayOfWeek: startDay || undefined,
            });
          }
          consecutiveCount = 0;
          startDay = null;
        }
      }
      
      // Check if week ends with long consecutive stretch
      if (consecutiveCount > MAX_CONSECUTIVE_WORKING_DAYS) {
        messages.push({
          id: `consecutive-days-${week}-${startDay}-end`,
          severity: 'warning',
          message: `Week ${week}: ${consecutiveCount} consecutive working days`,
          detail: `Working more than ${MAX_CONSECUTIVE_WORKING_DAYS} days in a row without rest.`,
          weekNumber: week,
          dayOfWeek: startDay || undefined,
        });
      }
    }
    
    // 5. Check weekly hours against WTD limit
    for (let week = 1; week <= rotationCycleWeeks; week++) {
      const weekDays = days.filter(d => d.weekNumber === week && !d.isRestDay);
      let totalMinutes = 0;
      
      for (const day of weekDays) {
        totalMinutes += calculateShiftMinutes(
          day.startTime,
          day.endTime,
          day.breakMinutes,
          day.isOvernight
        );
      }
      
      const totalHours = totalMinutes / 60;
      if (totalHours > WTD_MAX_WEEKLY_HOURS) {
        messages.push({
          id: `wtd-violation-${week}`,
          severity: 'warning',
          message: `Week ${week}: ${Math.round(totalHours)}h exceeds WTD limit`,
          detail: `Working Time Directive limits average weekly hours to ${WTD_MAX_WEEKLY_HOURS}h.`,
          weekNumber: week,
        });
      }
    }
    
    // 6. Check for overnight shifts without flag
    for (const day of days) {
      if (day.isRestDay || !day.startTime || !day.endTime) continue;
      
      const startMins = timeToMinutes(day.startTime);
      const endMins = timeToMinutes(day.endTime);
      
      // If end is before start but not marked as overnight
      if (endMins < startMins && !day.isOvernight) {
        messages.push({
          id: `overnight-flag-${day.weekNumber}-${day.dayOfWeek}`,
          severity: 'info',
          message: `Week ${day.weekNumber}, ${DayOfWeekLabels[day.dayOfWeek]}: Overnight shift detected`,
          detail: 'End time is before start time. Consider enabling the "Overnight" toggle.',
          weekNumber: day.weekNumber,
          dayOfWeek: day.dayOfWeek,
        });
      }
    }
    
    return messages;
  }, [days, rotationCycleWeeks]);
  
  // Handle click to navigate to day
  const handleNavigate = useCallback((weekNumber?: number, dayOfWeek?: DayOfWeek) => {
    if (onNavigateToDay && weekNumber && dayOfWeek) {
      onNavigateToDay(weekNumber, dayOfWeek);
    }
  }, [onNavigateToDay]);
  
  // Group messages by severity
  const { errors, warnings, successes, infos } = useMemo(() => {
    return {
      errors: validations.filter(v => v.severity === 'error'),
      warnings: validations.filter(v => v.severity === 'warning'),
      successes: validations.filter(v => v.severity === 'success'),
      infos: validations.filter(v => v.severity === 'info'),
    };
  }, [validations]);
  
  // Get status icon
  const StatusIcon = ({ severity }: { severity: ValidationSeverity }) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />;
      case 'success':
        return <Check className="h-4 w-4 shrink-0 text-emerald-500" />;
      case 'info':
        return <Info className="h-4 w-4 shrink-0 text-blue-500" />;
    }
  };
  
  // Get status colour
  const getStatusBg = (severity: ValidationSeverity): string => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'bg-amber-50 hover:bg-amber-100';
      case 'success':
        return 'bg-emerald-50';
      case 'info':
        return 'bg-blue-50 hover:bg-blue-100';
    }
  };
  
  // Overall status
  const overallStatus = useMemo(() => {
    if (errors.length > 0) return 'error';
    if (warnings.length > 0) return 'warning';
    return 'success';
  }, [errors, warnings]);
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`border-b px-4 py-3 ${
        overallStatus === 'error' ? 'bg-red-50 border-red-200' :
        overallStatus === 'warning' ? 'bg-amber-50 border-amber-200' :
        'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-center gap-2">
          <StatusIcon severity={overallStatus} />
          <h3 className={`font-semibold ${
            overallStatus === 'error' ? 'text-red-900' :
            overallStatus === 'warning' ? 'text-amber-900' :
            'text-emerald-900'
          }`}>
            {overallStatus === 'error' && `${errors.length} Error${errors.length !== 1 ? 's' : ''}`}
            {overallStatus === 'warning' && `${warnings.length} Warning${warnings.length !== 1 ? 's' : ''}`}
            {overallStatus === 'success' && 'Pattern Valid'}
          </h3>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {/* Errors */}
        {errors.map((msg) => (
          <button
            key={msg.id}
            onClick={() => handleNavigate(msg.weekNumber, msg.dayOfWeek)}
            className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left ${getStatusBg(msg.severity)} ${
              msg.weekNumber && msg.dayOfWeek ? 'cursor-pointer' : ''
            }`}
          >
            <StatusIcon severity={msg.severity} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{msg.message}</p>
              {msg.detail && (
                <p className="mt-0.5 text-xs text-slate-500">{msg.detail}</p>
              )}
            </div>
            {msg.weekNumber && msg.dayOfWeek && (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>
        ))}
        
        {/* Warnings */}
        {warnings.map((msg) => (
          <button
            key={msg.id}
            onClick={() => handleNavigate(msg.weekNumber, msg.dayOfWeek)}
            className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left ${getStatusBg(msg.severity)} ${
              msg.weekNumber && msg.dayOfWeek ? 'cursor-pointer' : ''
            }`}
          >
            <StatusIcon severity={msg.severity} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{msg.message}</p>
              {msg.detail && (
                <p className="mt-0.5 text-xs text-slate-500">{msg.detail}</p>
              )}
            </div>
            {msg.weekNumber && msg.dayOfWeek && (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>
        ))}
        
        {/* Info */}
        {infos.map((msg) => (
          <button
            key={msg.id}
            onClick={() => handleNavigate(msg.weekNumber, msg.dayOfWeek)}
            className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left ${getStatusBg(msg.severity)} ${
              msg.weekNumber && msg.dayOfWeek ? 'cursor-pointer' : ''
            }`}
          >
            <StatusIcon severity={msg.severity} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{msg.message}</p>
              {msg.detail && (
                <p className="mt-0.5 text-xs text-slate-500">{msg.detail}</p>
              )}
            </div>
            {msg.weekNumber && msg.dayOfWeek && (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>
        ))}
        
        {/* Successes (shown at bottom) */}
        {successes.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 border-b border-slate-100 px-4 py-3 ${getStatusBg(msg.severity)}`}
          >
            <StatusIcon severity={msg.severity} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-700">{msg.message}</p>
            </div>
          </div>
        ))}
        
        {/* Empty state */}
        {validations.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No validation checks to display.
          </div>
        )}
      </div>
    </div>
  );
}

export default PatternValidation;

