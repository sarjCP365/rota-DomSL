/**
 * Leave Entitlement Card Component
 * 
 * Displays annual leave entitlement for a staff member based on their
 * assigned patterns. Shows total, used, and remaining leave with
 * breakdown by calculation period.
 */

import { useState, useMemo } from 'react';
import { format, getYear, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import {
  calculateAnnualLeaveEntitlement,
  calculatePublicHolidayEntitlement,
  type LeaveEntitlement,
  type LeaveEntitlementPeriod,
  type PublicHolidayEntitlement,
  UK_STATUTORY_LEAVE_WEEKS,
} from '../../utils/leaveCalculations';
import type {
  StaffPatternAssignment,
  ShiftPatternTemplate,
  ShiftPatternDay,
} from '../../types';
import type { StaffAbsenceLog, Contract } from '../../../../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface LeaveEntitlementCardProps {
  /** Staff member's pattern assignments */
  assignments: Array<{
    assignment: StaffPatternAssignment;
    template: ShiftPatternTemplate;
    patternDays: ShiftPatternDay[];
  }>;
  /** Leave records for the staff member */
  leaveRecords?: StaffAbsenceLog[];
  /** Staff member's contract */
  contract?: Contract;
  /** Year to show (defaults to current year) */
  year?: number;
  /** Bank holidays for the year */
  bankHolidays?: string[];
  /** Compact mode for sidebars */
  compact?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function ProgressRing({ percentage, size = 80, strokeWidth = 8, className = '' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <svg width={size} height={size} className={className}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-200"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={
          percentage > 80
            ? 'text-emerald-500'
            : percentage > 40
            ? 'text-amber-500'
            : 'text-red-500'
        }
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: 'stroke-dashoffset 0.5s ease',
        }}
      />
    </svg>
  );
}

interface PeriodBreakdownProps {
  periods: LeaveEntitlementPeriod[];
}

function PeriodBreakdown({ periods }: PeriodBreakdownProps) {
  if (periods.length === 0) return null;

  return (
    <div className="space-y-2">
      {periods.map((period, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-700 truncate">
              {period.patternName || 'Contract hours'}
            </p>
            <p className="text-xs text-slate-500">
              {format(parseISO(period.startDate), 'd MMM')} -{' '}
              {format(parseISO(period.endDate), 'd MMM yyyy')}
            </p>
          </div>
          <div className="ml-3 text-right">
            <p className="text-sm font-medium text-slate-700">
              {period.leaveHours.toFixed(1)} hrs
            </p>
            <p className="text-xs text-slate-500">{period.weeklyHours}h/week</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface BankHolidaySummaryProps {
  entitlement: PublicHolidayEntitlement;
}

function BankHolidaySummary({ entitlement }: BankHolidaySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-slate-700">Bank Holidays</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            {entitlement.holidaysOnWorkingDays} on working days
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="space-y-2">
            {entitlement.holidayBreakdown.map((holiday) => (
              <div
                key={holiday.date}
                className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                  holiday.isWorkingDay
                    ? 'bg-purple-50 text-purple-700'
                    : 'bg-slate-50 text-slate-500'
                }`}
              >
                <span>{holiday.name}</span>
                <span className="text-xs">
                  {format(parseISO(holiday.date), 'd MMM')}
                  {holiday.isWorkingDay && holiday.shiftHours && (
                    <> ({holiday.shiftHours}h)</>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {entitlement.entitlementHours} hours of bank holiday entitlement based on
            working days pattern.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LeaveEntitlementCard({
  assignments,
  leaveRecords = [],
  contract,
  year = getYear(new Date()),
  bankHolidays,
  compact = false,
  isLoading = false,
}: LeaveEntitlementCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate leave entitlement
  const entitlement = useMemo<LeaveEntitlement>(() => {
    return calculateAnnualLeaveEntitlement(
      year,
      assignments,
      leaveRecords,
      contract
    );
  }, [year, assignments, leaveRecords, contract]);

  // Calculate public holiday entitlement
  const holidayEntitlement = useMemo<PublicHolidayEntitlement>(() => {
    return calculatePublicHolidayEntitlement(year, assignments, bankHolidays);
  }, [year, assignments, bankHolidays]);

  // Calculate progress percentage
  const usedPercentage = useMemo(() => {
    if (entitlement.totalHours <= 0) return 0;
    return (entitlement.usedHours / entitlement.totalHours) * 100;
  }, [entitlement]);

  const remainingPercentage = 100 - usedPercentage;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-700">Annual Leave</h4>
            <p className="text-xs text-slate-500">{year}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600">
              {entitlement.remainingDays}
            </p>
            <p className="text-xs text-slate-500">days left</p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              remainingPercentage > 50
                ? 'bg-emerald-500'
                : remainingPercentage > 20
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 text-center">
          {entitlement.usedDays} / {entitlement.totalDays} days used
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Annual Leave Entitlement</h3>
        </div>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
          {year}
        </span>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Visual Summary */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <ProgressRing percentage={remainingPercentage} size={90} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-slate-700">
                {entitlement.remainingDays}
              </span>
              <span className="text-xs text-slate-500">days</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Entitlement</span>
              <span className="font-medium text-slate-700">
                {entitlement.totalDays} days ({entitlement.totalHours}h)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Used</span>
              <span className="font-medium text-amber-600">
                {entitlement.usedDays} days ({entitlement.usedHours}h)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Remaining</span>
              <span className="font-medium text-emerald-600">
                {entitlement.remainingDays} days ({entitlement.remainingHours}h)
              </span>
            </div>
          </div>
        </div>

        {/* Calculation Method */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div className="text-xs text-slate-600">
            <span className="font-medium">Calculation: </span>
            {entitlement.calculationMethod === 'pattern' ? (
              <>
                Based on pattern ({entitlement.averageShiftHours}h avg shift × {UK_STATUTORY_LEAVE_WEEKS}{' '}
                weeks statutory)
              </>
            ) : entitlement.calculationMethod === 'contract' ? (
              <>Based on contract hours (no active pattern)</>
            ) : (
              <>Based on actual worked hours</>
            )}
          </div>
        </div>

        {/* Period Breakdown Toggle */}
        {entitlement.periodBreakdown && entitlement.periodBreakdown.length > 1 && (
          <div className="mt-4">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View Period Breakdown
              </span>
              {showBreakdown ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {showBreakdown && (
              <div className="mt-3">
                <PeriodBreakdown periods={entitlement.periodBreakdown} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bank Holidays Section */}
      <div className="border-t border-slate-200 p-4">
        <BankHolidaySummary entitlement={holidayEntitlement} />
      </div>

      {/* Status Indicators */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          {remainingPercentage > 50 ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Good leave balance
            </span>
          ) : remainingPercentage > 20 ? (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Consider booking leave
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Low leave balance
            </span>
          )}
          <span className="text-slate-500">
            1 day = {entitlement.averageShiftHours} hours
          </span>
        </div>
      </div>
    </div>
  );
}

