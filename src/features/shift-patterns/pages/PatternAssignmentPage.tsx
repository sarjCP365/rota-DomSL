/**
 * Pattern Assignment Page - Bulk Assignment Wizard
 *
 * A step-by-step wizard for assigning patterns to multiple staff members.
 * Steps:
 * 1. Select Pattern
 * 2. Select Staff
 * 3. Configure Assignment
 * 4. Review Conflicts
 * 5. Confirm and Assign
 */

import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addWeeks, startOfWeek, parseISO } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Check,
  AlertTriangle,
  Search,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Settings,
  Calendar,
  Clock,
  Layers,
  User,
  Building2,
} from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import { usePatternTemplates } from '../hooks/usePatternTemplates';
import { useStaffMembers } from '@/hooks/useStaff';
import { useBulkAssignPattern } from '../hooks/usePatternAssignments';
import { useLocationSettings } from '@/store/settingsStore';
import type { BulkAssignmentOptions, ShiftPatternTemplate } from '../types';
import { PatternStatus, PatternPublishStatus } from '../types';
import type { StaffMember } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface StaffSelection {
  staffId: string;
  staff: StaffMember;
  rotationStartWeek: number;
  hasExistingPattern: boolean;
}

interface SelectedPattern {
  cp365_shiftpatterntemplatenewid: string;
  cp365_name: string;
  cp365_sp_description?: string;
  cp365_sp_rotationcycleweeks: number;
  cp365_sp_averageweeklyhours?: number;
  cp365_sp_defaultpublishstatus: number;
  [key: string]: unknown;
}

interface WizardState {
  selectedPattern: SelectedPattern | null;
  selectedStaff: Map<string, StaffSelection>;
  startDate: string;
  staggerType: 'same' | 'stagger' | 'custom';
  publishStatus: 'pattern_default' | 'published' | 'unpublished';
  priority: number;
  generateShifts: boolean;
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

interface StepProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onNext: () => void;
  onBack: () => void;
}

// Step 1: Select Pattern
function Step1PatternSelection({ state, setState, onNext: _onNext }: StepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedLocationId } = useLocationSettings();
  const { data: patterns = [], isLoading } = usePatternTemplates({
    status: PatternStatus.Active,
    locationId: selectedLocationId || undefined,
  });

  const filteredPatterns = useMemo(() => {
    if (!searchTerm) return patterns;
    const search = searchTerm.toLowerCase();
    return patterns.filter(
      (p) =>
        p.cp365_name.toLowerCase().includes(search) ||
        p.cp365_sp_description?.toLowerCase().includes(search)
    );
  }, [patterns, searchTerm]);

  const handleSelectPattern = (pattern: ShiftPatternTemplate) => {
    setState((prev) => ({ ...prev, selectedPattern: pattern as unknown as SelectedPattern }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Select a Pattern Template</h2>
        <p className="text-sm text-slate-500">
          Choose the shift pattern you want to assign to staff
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patterns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Pattern Grid */}
      {!selectedLocationId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Building2 className="h-4 w-4" />
          <span>Please select a location in the header to see patterns for that location</span>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          {selectedLocationId
            ? 'No patterns found for this location. Create a pattern first.'
            : 'Select a location to view available patterns.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredPatterns.map((pattern) => (
            <button
              key={pattern.cp365_shiftpatterntemplatenewid}
              onClick={() => handleSelectPattern(pattern)}
              className={`rounded-lg border p-4 text-left transition-all ${
                state.selectedPattern?.cp365_shiftpatterntemplatenewid ===
                pattern.cp365_shiftpatterntemplatenewid
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{pattern.cp365_name}</h3>
                  {pattern.cp365_sp_description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {pattern.cp365_sp_description}
                    </p>
                  )}
                </div>
                {state.selectedPattern?.cp365_shiftpatterntemplatenewid ===
                  pattern.cp365_shiftpatterntemplatenewid && (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                  {pattern.cp365_sp_rotationcycleweeks} week
                  {pattern.cp365_sp_rotationcycleweeks > 1 ? 's' : ''}
                </span>
                {pattern.cp365_sp_averageweeklyhours && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                    {pattern.cp365_sp_averageweeklyhours.toFixed(1)} hrs/wk
                  </span>
                )}
                {pattern.cp365_sp_isstandardtemplate && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                    Standard
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 2: Select Staff
function Step2StaffSelection({ state, setState }: StepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedSublocationId } = useLocationSettings();
  const { data: allStaff = [], isLoading } = useStaffMembers(selectedSublocationId);

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return allStaff;
    const search = searchTerm.toLowerCase();
    return allStaff.filter(
      (s) =>
        s.cp365_staffmembername.toLowerCase().includes(search) ||
        s.cp365_jobtitle?.toLowerCase().includes(search)
    );
  }, [allStaff, searchTerm]);

  const handleToggleStaff = (staff: StaffMember) => {
    setState((prev) => {
      const newSelected = new Map(prev.selectedStaff);
      if (newSelected.has(staff.cp365_staffmemberid)) {
        newSelected.delete(staff.cp365_staffmemberid);
      } else {
        newSelected.set(staff.cp365_staffmemberid, {
          staffId: staff.cp365_staffmemberid,
          staff,
          rotationStartWeek: 1,
          hasExistingPattern: false, // Would need to check this
        });
      }
      return { ...prev, selectedStaff: newSelected };
    });
  };

  const handleSelectAll = () => {
    setState((prev) => {
      const newSelected = new Map<string, StaffSelection>();
      filteredStaff.forEach((staff) => {
        newSelected.set(staff.cp365_staffmemberid, {
          staffId: staff.cp365_staffmemberid,
          staff,
          rotationStartWeek: 1,
          hasExistingPattern: false,
        });
      });
      return { ...prev, selectedStaff: newSelected };
    });
  };

  const handleClearAll = () => {
    setState((prev) => ({ ...prev, selectedStaff: new Map() }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Select Staff Members</h2>
          <p className="text-sm text-slate-500">
            Choose staff to receive the pattern ({state.selectedStaff.size} selected)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="py-12 text-center text-slate-500">No staff found for this location.</div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
          {filteredStaff.map((staff) => {
            const isSelected = state.selectedStaff.has(staff.cp365_staffmemberid);
            return (
              <button
                key={staff.cp365_staffmemberid}
                onClick={() => handleToggleStaff(staff)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                  {staff.cp365_staffmembername
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {staff.cp365_staffmembername}
                  </p>
                  <p className="text-xs text-slate-500">{staff.cp365_jobtitle || 'Staff Member'}</p>
                </div>
                {staff.cp365_requiredhours && (
                  <span className="text-xs text-slate-500">{staff.cp365_requiredhours} hrs</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Step 3: Configure
function Step3Configuration({ state, setState }: StepProps) {
  const rotationWeeks = state.selectedPattern?.cp365_sp_rotationcycleweeks || 1;

  // Apply stagger when option changes
  const handleStaggerChange = (staggerType: 'same' | 'stagger' | 'custom') => {
    setState((prev) => {
      const newSelected = new Map(prev.selectedStaff);

      if (staggerType === 'same') {
        // All start at week 1
        newSelected.forEach((selection, id) => {
          newSelected.set(id, { ...selection, rotationStartWeek: 1 });
        });
      } else if (staggerType === 'stagger') {
        // Distribute evenly across rotation weeks
        let index = 0;
        newSelected.forEach((selection, id) => {
          const week = (index % rotationWeeks) + 1;
          newSelected.set(id, { ...selection, rotationStartWeek: week });
          index++;
        });
      }
      // 'custom' - leave as is

      return { ...prev, staggerType, selectedStaff: newSelected };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Configure Assignment</h2>
        <p className="text-sm text-slate-500">Set start date and options for the assignment</p>
      </div>

      {/* Start Date */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-medium text-slate-800">
          <Calendar className="h-4 w-4 text-emerald-600" />
          Start Date
        </h3>
        <p className="mt-1 text-xs text-slate-500">When should the pattern start?</p>
        <input
          type="date"
          value={state.startDate}
          onChange={(e) => setState((prev) => ({ ...prev, startDate: e.target.value }))}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Stagger Options */}
      {rotationWeeks > 1 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 font-medium text-slate-800">
            <Layers className="h-4 w-4 text-emerald-600" />
            Rotation Stagger
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Distribute staff across rotation weeks for balanced coverage
          </p>
          <div className="mt-3 space-y-2">
            {[
              {
                value: 'same' as const,
                label: 'All start same week',
                desc: 'Everyone starts at Week 1',
              },
              {
                value: 'stagger' as const,
                label: 'Auto-stagger',
                desc: `Distribute evenly across ${rotationWeeks} weeks`,
              },
              {
                value: 'custom' as const,
                label: 'Custom per staff',
                desc: 'Set rotation week for each person',
              },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                  state.staggerType === option.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="stagger"
                  value={option.value}
                  checked={state.staggerType === option.value}
                  onChange={() => handleStaggerChange(option.value)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="block font-medium text-slate-700">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Custom week selection */}
          {state.staggerType === 'custom' && (
            <div className="mt-4 max-h-48 space-y-2 overflow-auto">
              {Array.from(state.selectedStaff.entries()).map(([id, selection]) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">
                    {selection.staff.cp365_staffmembername}
                  </span>
                  <select
                    value={selection.rotationStartWeek}
                    onChange={(e) =>
                      setState((prev) => {
                        const newSelected = new Map(prev.selectedStaff);
                        const sel = newSelected.get(id);
                        if (sel) {
                          newSelected.set(id, {
                            ...sel,
                            rotationStartWeek: parseInt(e.target.value),
                          });
                        }
                        return { ...prev, selectedStaff: newSelected };
                      })
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-sm"
                  >
                    {Array.from({ length: rotationWeeks }, (_, i) => i + 1).map((week) => (
                      <option key={week} value={week}>
                        Week {week}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Publish Status */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-medium text-slate-800">
          <Clock className="h-4 w-4 text-emerald-600" />
          Publish Status
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Should generated shifts be published immediately?
        </p>
        <div className="mt-3 space-y-2">
          {[
            {
              value: 'pattern_default' as const,
              label: 'Use pattern default',
              desc:
                state.selectedPattern?.cp365_sp_defaultpublishstatus ===
                PatternPublishStatus.Published
                  ? 'Published'
                  : 'Unpublished',
            },
            {
              value: 'published' as const,
              label: 'Published',
              desc: 'Shifts visible to staff immediately',
            },
            {
              value: 'unpublished' as const,
              label: 'Unpublished',
              desc: 'Draft mode - publish manually later',
            },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                state.publishStatus === option.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="publish"
                value={option.value}
                checked={state.publishStatus === option.value}
                onChange={() => setState((prev) => ({ ...prev, publishStatus: option.value }))}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <span className="block font-medium text-slate-700">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-medium text-slate-800">
          <Settings className="h-4 w-4 text-emerald-600" />
          Priority
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          For staff with multiple patterns, lower number = higher priority
        </p>
        <input
          type="number"
          min="1"
          max="99"
          value={state.priority}
          onChange={(e) =>
            setState((prev) => ({ ...prev, priority: parseInt(e.target.value) || 1 }))
          }
          className="mt-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}

// Step 4: Review Conflicts
function Step4Review({ state }: StepProps) {
  // In a full implementation, this would check for conflicts
  // For now, show a summary

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Review Summary</h2>
        <p className="text-sm text-slate-500">Review the assignment before confirming</p>
      </div>

      {/* Pattern Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-800">Pattern</h3>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{state.selectedPattern?.cp365_name}</p>
            <p className="text-xs text-slate-500">
              {state.selectedPattern?.cp365_sp_rotationcycleweeks} week rotation •{' '}
              {state.selectedPattern?.cp365_sp_averageweeklyhours?.toFixed(1) || '?'} hrs/week
            </p>
          </div>
        </div>
      </div>

      {/* Staff Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-800">Staff ({state.selectedStaff.size})</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from(state.selectedStaff.values())
            .slice(0, 10)
            .map((selection) => (
              <span
                key={selection.staffId}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                <User className="h-3 w-3" />
                {selection.staff.cp365_staffmembername}
                {state.staggerType !== 'same' && (
                  <span className="text-slate-500">(W{selection.rotationStartWeek})</span>
                )}
              </span>
            ))}
          {state.selectedStaff.size > 10 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
              +{state.selectedStaff.size - 10} more
            </span>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-800">Configuration</h3>
        <dl className="mt-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Start Date</dt>
            <dd className="font-medium text-slate-700">
              {state.startDate ? format(parseISO(state.startDate), 'd MMMM yyyy') : 'Not set'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Stagger</dt>
            <dd className="font-medium text-slate-700">
              {state.staggerType === 'same'
                ? 'All same week'
                : state.staggerType === 'stagger'
                  ? 'Auto-distributed'
                  : 'Custom'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Publish Status</dt>
            <dd className="font-medium text-slate-700">
              {state.publishStatus === 'pattern_default'
                ? 'Pattern default'
                : state.publishStatus === 'published'
                  ? 'Published'
                  : 'Unpublished'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Priority</dt>
            <dd className="font-medium text-slate-700">{state.priority}</dd>
          </div>
        </dl>
      </div>

      {/* Info Note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Conflict Detection</p>
            <p className="mt-1">
              The system will check for existing shifts and leave before generating. Any conflicts
              will be skipped by default.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 5: Confirm and Execute
function Step5Confirm({
  state,
  onComplete,
  isProcessing,
  result,
}: {
  state: WizardState;
  onComplete: (generateShifts: boolean) => void;
  isProcessing: boolean;
  result: { success: boolean; message: string; created: number; errors: number } | null;
}) {
  if (result) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            result.success ? 'bg-emerald-100' : 'bg-red-100'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          {result.success ? 'Assignment Complete!' : 'Assignment Failed'}
        </h2>
        <p className="mt-2 text-slate-500">{result.message}</p>
        {result.created > 0 && (
          <p className="mt-2 text-sm text-emerald-600">{result.created} assignments created</p>
        )}
        {result.errors > 0 && (
          <p className="mt-1 text-sm text-red-600">{result.errors} errors occurred</p>
        )}
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="mt-4 text-lg font-medium text-slate-700">Creating Assignments...</p>
        <p className="mt-1 text-sm text-slate-500">
          Processing {state.selectedStaff.size} staff members
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900">Ready to Assign</h2>
        <p className="text-sm text-slate-500">
          Assign "{state.selectedPattern?.cp365_name}" to {state.selectedStaff.size} staff members
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-emerald-600">{state.selectedStaff.size}</p>
            <p className="text-sm text-slate-500">Staff Members</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-700">
              {state.selectedPattern?.cp365_sp_rotationcycleweeks || 1}
            </p>
            <p className="text-sm text-slate-500">Week Rotation</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onComplete(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
        >
          <Play className="h-5 w-5" />
          Assign and Generate Shifts
        </button>
        <button
          onClick={() => onComplete(false)}
          className="rounded-lg border border-slate-200 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          Assign Only (Generate Later)
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Shift generation can take a few moments depending on the number of staff.
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PatternAssignmentPage() {
  const _navigate = useNavigate();
  const { isOpen: isSideNavOpen, close: closeSideNav } = useSideNav();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    created: number;
    errors: number;
  } | null>(null);

  const [wizardState, setWizardState] = useState<WizardState>({
    selectedPattern: null,
    selectedStaff: new Map(),
    startDate: format(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    staggerType: 'same',
    publishStatus: 'pattern_default',
    priority: 1,
    generateShifts: true,
  });

  const bulkAssignMutation = useBulkAssignPattern();

  const steps = [
    { number: 1 as const, title: 'Select Pattern', canProceed: !!wizardState.selectedPattern },
    { number: 2 as const, title: 'Select Staff', canProceed: wizardState.selectedStaff.size > 0 },
    { number: 3 as const, title: 'Configure', canProceed: !!wizardState.startDate },
    { number: 4 as const, title: 'Review', canProceed: true },
    { number: 5 as const, title: 'Confirm', canProceed: true },
  ];

  const currentStepData = steps.find((s) => s.number === currentStep)!;
  const canProceed = currentStepData.canProceed;
  const isLastStep = currentStep === 5;

  const handleNext = useCallback(() => {
    if (currentStep < 5 && canProceed) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  }, [currentStep, canProceed]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  }, [currentStep]);

  const handleComplete = useCallback(
    async (_generateShifts: boolean) => {
      if (!wizardState.selectedPattern) return;

      setIsProcessing(true);
      try {
        const options: BulkAssignmentOptions = {
          patternTemplateId: wizardState.selectedPattern.cp365_shiftpatterntemplatenewid,
          staffMemberIds: Array.from(wizardState.selectedStaff.keys()),
          startDate: wizardState.startDate,
          staggerType: wizardState.staggerType,
          staggerSettings:
            wizardState.staggerType === 'custom'
              ? new Map(
                  Array.from(wizardState.selectedStaff.entries()).map(([id, sel]) => [
                    id,
                    sel.rotationStartWeek,
                  ])
                )
              : undefined,
          overridePublishStatus: wizardState.publishStatus !== 'pattern_default',
          publishStatus:
            wizardState.publishStatus === 'published'
              ? PatternPublishStatus.Published
              : wizardState.publishStatus === 'unpublished'
                ? PatternPublishStatus.Unpublished
                : undefined,
        };

        const result = await bulkAssignMutation.mutateAsync(options);

        setResult({
          success: result.errors.length === 0,
          message:
            result.errors.length === 0
              ? `Successfully assigned pattern to ${result.created.length} staff members.`
              : `Completed with ${result.errors.length} errors.`,
          created: result.created.length,
          errors: result.errors.length,
        });
      } catch (error) {
        setResult({
          success: false,
          message: error instanceof Error ? error.message : 'An error occurred',
          created: 0,
          errors: 1,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [wizardState, bulkAssignMutation]
  );

  const stepProps: StepProps = {
    state: wizardState,
    setState: setWizardState,
    onNext: handleNext,
    onBack: handleBack,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav isOpen={isSideNavOpen} onClose={closeSideNav} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/patterns" className="rounded-lg p-2 hover:bg-white/10">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Bulk Pattern Assignment</h1>
                <p className="text-sm text-emerald-100">
                  Assign patterns to multiple staff members
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-center gap-1">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => step.number < currentStep && setCurrentStep(step.number)}
                  disabled={step.number > currentStep}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    step.number === currentStep
                      ? 'bg-emerald-100 text-emerald-700'
                      : step.number < currentStep
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      step.number === currentStep
                        ? 'bg-emerald-600 text-white'
                        : step.number < currentStep
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.number < currentStep ? <Check className="h-3 w-3" /> : step.number}
                  </div>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="mx-1 h-4 w-4 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-2xl">
            {currentStep === 1 && <Step1PatternSelection {...stepProps} />}
            {currentStep === 2 && <Step2StaffSelection {...stepProps} />}
            {currentStep === 3 && <Step3Configuration {...stepProps} />}
            {currentStep === 4 && <Step4Review {...stepProps} />}
            {currentStep === 5 && (
              <Step5Confirm
                state={wizardState}
                onComplete={handleComplete}
                isProcessing={isProcessing}
                result={result}
              />
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        {!result && (
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="mx-auto flex max-w-2xl items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 1 || isProcessing}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {!isLastStep && (
                <button
                  onClick={handleNext}
                  disabled={!canProceed || isProcessing}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result Actions */}
        {result && (
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="mx-auto flex max-w-2xl items-center justify-center gap-4">
              <Link
                to="/patterns"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Back to Library
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setCurrentStep(1);
                  setWizardState({
                    selectedPattern: null,
                    selectedStaff: new Map(),
                    startDate: format(
                      startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
                      'yyyy-MM-dd'
                    ),
                    staggerType: 'same',
                    publishStatus: 'pattern_default',
                    priority: 1,
                    generateShifts: true,
                  });
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Assign More
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
