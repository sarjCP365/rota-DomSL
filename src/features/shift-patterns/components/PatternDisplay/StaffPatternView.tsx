/**
 * Staff Pattern View Component
 * Displays a staff member's assigned patterns and provides management controls
 * 
 * Can be used on staff profile pages or as a panel on the rota view.
 */

import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, addWeeks, startOfWeek, addDays, isBefore, isAfter, isToday } from 'date-fns';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  StopCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Play,
  History,
  Layers,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  MoreVertical,
} from 'lucide-react';
import { useStaffPatternAssignments, useEndPatternAssignment, useDeletePatternAssignment } from '../../hooks/usePatternAssignments';
import { useStaffMember } from '../../../../hooks/useStaff';
import type { StaffPatternAssignment, PatternDayFormData } from '../../types';
import { DayOfWeek, DayOfWeekLabels, DayOfWeekShortLabels, AssignmentStatus, PatternPublishStatus } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface StaffPatternViewProps {
  /** Staff member ID to display patterns for */
  staffMemberId: string;
  /** Callback when "Add Pattern" is clicked */
  onAssignPattern: () => void;
  /** Callback when "Edit" is clicked on an assignment */
  onEditAssignment: (assignmentId: string) => void;
  /** Callback when "Generate Now" is clicked */
  onGenerateShifts?: (assignmentId: string) => void;
  /** Compact view mode for sidebars */
  compact?: boolean;
  /** Show staff header information */
  showHeader?: boolean;
}

// Colour palette for different patterns
const PATTERN_COLOURS = [
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700', dot: 'bg-cyan-500' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse appliestodays JSON field
 */
function parseAppliesToDays(appliesTo?: string): string[] {
  if (!appliesTo) return [];
  try {
    return JSON.parse(appliesTo);
  } catch {
    return [];
  }
}

/**
 * Get days covered by an assignment
 */
function getDaysCovered(appliesTo?: string): string {
  const days = parseAppliesToDays(appliesTo);
  if (days.length === 0 || days.length === 7) {
    return 'All days';
  }
  return days.map(d => d.substring(0, 3)).join(', ');
}

/**
 * Check if generation is behind schedule
 */
function isGenerationBehind(assignment: StaffPatternAssignment): boolean {
  const lastGenerated = assignment.cp365_sp_lastgenerateddate;
  if (!lastGenerated) return true;

  const lastGeneratedDate = parseISO(lastGenerated);
  const expectedDate = addWeeks(new Date(), 2); // Should have shifts 2 weeks ahead
  
  return isBefore(lastGeneratedDate, expectedDate);
}

/**
 * Get the date range for the 4-week calendar preview
 */
function getCalendarDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  
  for (let i = 0; i < 28; i++) {
    dates.push(addDays(weekStart, i));
  }
  
  return dates;
}

/**
 * Get which pattern applies on a given date (resolving by priority)
 */
function getPatternForDate(
  date: Date,
  assignments: StaffPatternAssignment[]
): StaffPatternAssignment | null {
  const activeAssignments = assignments
    .filter(a => {
      const startDate = parseISO(a.cp365_sp_startdate);
      const endDate = a.cp365_sp_enddate ? parseISO(a.cp365_sp_enddate) : null;
      
      if (isBefore(date, startDate)) return false;
      if (endDate && isAfter(date, endDate)) return false;
      
      // Check applies to days
      const appliesToDays = parseAppliesToDays(a.cp365_sp_appliestodays);
      if (appliesToDays.length > 0) {
        const dayName = DayOfWeekLabels[getDayOfWeek(date)];
        if (!appliesToDays.includes(dayName)) return false;
      }
      
      return true;
    })
    .sort((a, b) => a.cp365_sp_priority - b.cp365_sp_priority);

  return activeAssignments[0] || null;
}

function getDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DayOfWeek;
}

// =============================================================================
// ASSIGNMENT CARD COMPONENT
// =============================================================================

interface AssignmentCardProps {
  assignment: StaffPatternAssignment;
  colourIndex: number;
  onEdit: () => void;
  onEnd: () => void;
  onDelete: () => void;
  onGenerate?: () => void;
  isEnding: boolean;
  isDeleting: boolean;
  compact?: boolean;
}

function AssignmentCard({
  assignment,
  colourIndex,
  onEdit,
  onEnd,
  onDelete,
  onGenerate,
  isEnding,
  isDeleting,
  compact,
}: AssignmentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const colour = PATTERN_COLOURS[colourIndex % PATTERN_COLOURS.length];
  const patternName = assignment.cp365_shiftpatterntemplate?.cp365_name || 'Unknown Pattern';
  const avgHours = assignment.cp365_shiftpatterntemplate?.cp365_sp_averageweeklyhours;
  const needsGeneration = isGenerationBehind(assignment);

  return (
    <div className={`rounded-lg border ${colour.border} ${colour.bg} p-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${colour.dot}`} />
            <h4 className="font-medium text-slate-800 truncate">{patternName}</h4>
            {assignment.cp365_sp_priority === 1 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                Primary
              </span>
            )}
          </div>
          
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(assignment.cp365_sp_startdate), 'd MMM yyyy')}
              {assignment.cp365_sp_enddate && (
                <> - {format(parseISO(assignment.cp365_sp_enddate), 'd MMM yyyy')}</>
              )}
            </span>
            
            {avgHours !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {avgHours.toFixed(1)} hrs/wk
              </span>
            )}
            
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {getDaysCovered(assignment.cp365_sp_appliestodays)}
            </span>
          </div>

          {/* Generation Status */}
          {!compact && (
            <div className="mt-2 flex items-center gap-2">
              {assignment.cp365_sp_lastgenerateddate ? (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Generated to {format(parseISO(assignment.cp365_sp_lastgenerateddate), 'd MMM')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  No shifts generated
                </span>
              )}
              
              {needsGeneration && onGenerate && (
                <button
                  onClick={onGenerate}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200"
                >
                  <Play className="h-3 w-3" />
                  Generate
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded text-slate-400 hover:bg-white/50 hover:text-slate-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEnd();
                  }}
                  disabled={isEnding}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {isEnding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <StopCircle className="h-3.5 w-3.5" />
                  )}
                  End Assignment
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PATTERN CALENDAR COMPONENT
// =============================================================================

interface PatternCalendarProps {
  assignments: StaffPatternAssignment[];
  compact?: boolean;
}

function PatternCalendar({ assignments, compact }: PatternCalendarProps) {
  const calendarDates = useMemo(() => getCalendarDates(new Date()), []);

  const assignmentColours = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((a, i) => {
      map.set(a.cp365_staffpatternassignmentid, i);
    });
    return map;
  }, [assignments]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {Object.values(DayOfWeekShortLabels).map((label) => (
          <div key={label} className="py-2 text-center text-xs font-medium text-slate-500">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {calendarDates.map((date, index) => {
          const assignment = getPatternForDate(date, assignments);
          const colourIndex = assignment 
            ? assignmentColours.get(assignment.cp365_staffpatternassignmentid) ?? 0
            : -1;
          const colour = colourIndex >= 0 
            ? PATTERN_COLOURS[colourIndex % PATTERN_COLOURS.length] 
            : null;
          const isCurrentDay = isToday(date);

          return (
            <div
              key={index}
              className={`min-h-10 p-1 text-center ${
                colour ? colour.bg : 'bg-slate-50'
              } ${isCurrentDay ? 'ring-2 ring-inset ring-emerald-500' : ''}`}
            >
              <span className={`text-xs font-medium ${
                colour ? colour.text : 'text-slate-400'
              } ${isCurrentDay ? 'font-bold' : ''}`}>
                {format(date, 'd')}
              </span>
              {!compact && colour && assignment && (
                <div className={`mt-0.5 h-1.5 w-1.5 mx-auto rounded-full ${colour.dot}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {!compact && assignments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
          {assignments.map((assignment, index) => {
            const colour = PATTERN_COLOURS[index % PATTERN_COLOURS.length];
            return (
              <div key={assignment.cp365_staffpatternassignmentid} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${colour.dot}`} />
                <span className="text-xs text-slate-600">
                  {assignment.cp365_shiftpatterntemplate?.cp365_name || 'Pattern'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HOURS SUMMARY COMPONENT
// =============================================================================

interface HoursSummaryProps {
  contractedHours?: number;
  patternHours: number;
}

function HoursSummary({ contractedHours, patternHours }: HoursSummaryProps) {
  const variance = contractedHours !== undefined ? patternHours - contractedHours : 0;
  const variancePercent = contractedHours ? ((variance / contractedHours) * 100).toFixed(0) : 0;

  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-700">
          {contractedHours?.toFixed(1) || '-'}
        </p>
        <p className="text-xs text-slate-500">Contracted</p>
      </div>
      <div className="text-center border-x border-slate-200">
        <p className="text-lg font-semibold text-emerald-600">
          {patternHours.toFixed(1)}
        </p>
        <p className="text-xs text-slate-500">Pattern</p>
      </div>
      <div className="text-center">
        <p className={`text-lg font-semibold ${
          variance === 0 
            ? 'text-slate-600' 
            : variance > 0 
            ? 'text-amber-600' 
            : 'text-red-600'
        }`}>
          {variance > 0 ? '+' : ''}{variance.toFixed(1)}
        </p>
        <p className="text-xs text-slate-500">Variance</p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StaffPatternView({
  staffMemberId,
  onAssignPattern,
  onEditAssignment,
  onGenerateShifts,
  compact = false,
  showHeader = true,
}: StaffPatternViewProps) {
  // ==========================================================================
  // STATE
  // ==========================================================================
  
  const [showHistory, setShowHistory] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  
  const { data: staffMember } = useStaffMember(staffMemberId);
  const { data: allAssignments = [], isLoading, refetch } = useStaffPatternAssignments(
    staffMemberId,
    true // Include ended assignments
  );

  const endAssignmentMutation = useEndPatternAssignment();
  const deleteAssignmentMutation = useDeletePatternAssignment();

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================
  
  const { activeAssignments, endedAssignments } = useMemo(() => {
    const active = allAssignments.filter(
      a => a.cp365_sp_assignmentstatus === AssignmentStatus.Active
    );
    const ended = allAssignments.filter(
      a => a.cp365_sp_assignmentstatus !== AssignmentStatus.Active
    );
    return { activeAssignments: active, endedAssignments: ended };
  }, [allAssignments]);

  const totalPatternHours = useMemo(() => {
    return activeAssignments.reduce((sum, a) => {
      return sum + (a.cp365_shiftpatterntemplate?.cp365_sp_averageweeklyhours || 0);
    }, 0);
  }, [activeAssignments]);

  const contractedHours = staffMember?.cp365_requiredhours;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const handleEndAssignment = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to end this pattern assignment? Future shifts will not be generated.')) {
      return;
    }
    
    setEndingId(id);
    try {
      await endAssignmentMutation.mutateAsync({
        id,
        endDate: format(new Date(), 'yyyy-MM-dd'),
      });
    } finally {
      setEndingId(null);
    }
  }, [endAssignmentMutation]);

  const handleDeleteAssignment = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this pattern assignment? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(id);
    try {
      await deleteAssignmentMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }, [deleteAssignmentMutation]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? 'p-2' : 'p-4'}`}>
      {/* Header */}
      {showHeader && staffMember && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                {staffMember.cp365_staffmembername}
              </h3>
              <p className="text-sm text-slate-500">
                {staffMember.cp365_jobtitle || 'Staff Member'}
              </p>
            </div>
          </div>
          <button
            onClick={onAssignPattern}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Pattern
          </button>
        </div>
      )}

      {/* Hours Summary */}
      {!compact && activeAssignments.length > 0 && (
        <HoursSummary 
          contractedHours={contractedHours} 
          patternHours={totalPatternHours} 
        />
      )}

      {/* No Patterns */}
      {activeAssignments.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Layers className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-600">No active patterns</p>
          <p className="mt-1 text-xs text-slate-500">
            Assign a shift pattern to automatically generate shifts.
          </p>
          <button
            onClick={onAssignPattern}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign Pattern
          </button>
        </div>
      )}

      {/* Active Assignments */}
      {activeAssignments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Active Patterns</h4>
          {activeAssignments.map((assignment, index) => (
            <AssignmentCard
              key={assignment.cp365_staffpatternassignmentid}
              assignment={assignment}
              colourIndex={index}
              onEdit={() => onEditAssignment(assignment.cp365_staffpatternassignmentid)}
              onEnd={() => handleEndAssignment(assignment.cp365_staffpatternassignmentid)}
              onDelete={() => handleDeleteAssignment(assignment.cp365_staffpatternassignmentid)}
              onGenerate={onGenerateShifts ? () => onGenerateShifts(assignment.cp365_staffpatternassignmentid) : undefined}
              isEnding={endingId === assignment.cp365_staffpatternassignmentid}
              isDeleting={deletingId === assignment.cp365_staffpatternassignmentid}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Pattern Calendar */}
      {!compact && activeAssignments.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-700">4-Week Preview</h4>
          <PatternCalendar assignments={activeAssignments} compact={compact} />
        </div>
      )}

      {/* History */}
      {endedAssignments.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between text-sm text-slate-500 hover:text-slate-700"
          >
            <span className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              Past Assignments ({endedAssignments.length})
            </span>
            {showHistory ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {showHistory && (
            <div className="mt-2 space-y-2">
              {endedAssignments.map((assignment) => (
                <div
                  key={assignment.cp365_staffpatternassignmentid}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-600">
                        {assignment.cp365_shiftpatterntemplate?.cp365_name || 'Unknown Pattern'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(assignment.cp365_sp_startdate), 'd MMM yyyy')}
                        {assignment.cp365_sp_enddate && (
                          <> - {format(parseISO(assignment.cp365_sp_enddate), 'd MMM yyyy')}</>
                        )}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <XCircle className="h-3 w-3" />
                      {assignment.cp365_sp_assignmentstatus === AssignmentStatus.Ended
                        ? 'Ended'
                        : 'Superseded'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

