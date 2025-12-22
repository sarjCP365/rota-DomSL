/**
 * BulkAssignModal Component
 * 
 * A modal for bulk assigning multiple unassigned shifts to different staff members.
 * Shows a table of unassigned shifts with individual staff dropdowns.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Users, Loader2, ChevronDown, Wand2, AlertCircle } from 'lucide-react';
import { useUpdateShift } from '../../hooks/useShifts';
import type { ShiftViewData, SublocationStaffViewData } from '../../api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface BulkAssignModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Unassigned shifts to assign */
  unassignedShifts: ShiftViewData[];
  /** Available staff members */
  staff: SublocationStaffViewData[];
  /** Callback when modal closes */
  onClose: () => void;
  /** Callback after successful assignment */
  onAssigned?: () => void;
}

interface ShiftAssignment {
  shiftId: string;
  staffMemberId: string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BulkAssignModal({
  isOpen,
  unassignedShifts,
  staff,
  onClose,
  onAssigned,
}: BulkAssignModalProps) {
  // Track assignments for each shift
  const [assignments, setAssignments] = useState<Map<string, string | null>>(() => {
    const map = new Map<string, string | null>();
    unassignedShifts.forEach(shift => {
      map.set(shift['Shift ID'], null);
    });
    return map;
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const updateShiftMutation = useUpdateShift();
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset assignments when shifts change
  useMemo(() => {
    const map = new Map<string, string | null>();
    unassignedShifts.forEach(shift => {
      map.set(shift['Shift ID'], assignments.get(shift['Shift ID']) ?? null);
    });
    setAssignments(map);
  }, [unassignedShifts]);

  // Get assigned count
  const assignedCount = useMemo(() => {
    return Array.from(assignments.values()).filter(v => v !== null).length;
  }, [assignments]);

  // Handle assignment change for a shift
  const handleAssignmentChange = (shiftId: string, staffMemberId: string | null) => {
    setAssignments(prev => {
      const next = new Map(prev);
      next.set(shiftId, staffMemberId);
      return next;
    });
  };

  // Auto-suggest assignments - distributes shifts evenly across staff
  // using round-robin to give each staff member one shift before anyone gets a second
  const handleAutoSuggest = () => {
    if (staff.length === 0) return;
    
    const newAssignments = new Map<string, string | null>();
    
    // Track how many shifts each staff member has been assigned
    const assignmentCount = new Map<string, number>();
    staff.forEach(s => assignmentCount.set(s['Staff Member ID'], 0));
    
    // Sort shifts by date then time for logical ordering
    const sortedShifts = [...unassignedShifts].sort((a, b) => {
      const dateCompare = (a['Shift Date'] || '').localeCompare(b['Shift Date'] || '');
      if (dateCompare !== 0) return dateCompare;
      return (a['Shift Start Time'] || '').localeCompare(b['Shift Start Time'] || '');
    });
    
    // Assign each shift to the staff member with fewest assignments
    sortedShifts.forEach(shift => {
      // Find staff with lowest assignment count
      let minCount = Infinity;
      let selectedStaffId: string | null = null;
      
      for (const [staffId, count] of assignmentCount) {
        if (count < minCount) {
          minCount = count;
          selectedStaffId = staffId;
        }
      }
      
      if (selectedStaffId) {
        newAssignments.set(shift['Shift ID'], selectedStaffId);
        assignmentCount.set(selectedStaffId, minCount + 1);
      } else {
        newAssignments.set(shift['Shift ID'], null);
      }
    });
    
    setAssignments(newAssignments);
  };

  // Clear all assignments
  const handleClearAll = () => {
    const map = new Map<string, string | null>();
    unassignedShifts.forEach(shift => {
      map.set(shift['Shift ID'], null);
    });
    setAssignments(map);
  };

  // Save all assignments
  const handleSaveAll = async () => {
    const assignmentsToSave = Array.from(assignments.entries())
      .filter(([_, staffId]) => staffId !== null) as [string, string][];
    
    if (assignmentsToSave.length === 0) {
      setError('Please assign at least one shift before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveProgress(0);

    console.log('[BulkAssign] Starting to save', assignmentsToSave.length, 'assignments');

    let successCount = 0;
    const errors: string[] = [];

    try {
      // Process assignments sequentially to avoid rate limiting
      for (let i = 0; i < assignmentsToSave.length; i++) {
        const [shiftId, staffMemberId] = assignmentsToSave[i];
        
        try {
          console.log('[BulkAssign] Saving assignment', i + 1, 'of', assignmentsToSave.length);
          // IMPORTANT: For cp365_shifts, navigation property names MUST be PascalCase for @odata.bind
          await updateShiftMutation.mutateAsync({
            shiftId,
            data: {
              'cp365_StaffMember@odata.bind': `/cp365_staffmembers(${staffMemberId})`,
            },
          });
          successCount++;
          console.log('[BulkAssign] Assignment', i + 1, 'saved successfully');
        } catch (err) {
          console.error('[BulkAssign] Failed to save assignment', i + 1, ':', err);
          errors.push(`Shift ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        
        // Update progress only if still mounted
        if (isMountedRef.current) {
          setSaveProgress(Math.round(((i + 1) / assignmentsToSave.length) * 100));
        }
      }

      console.log('[BulkAssign] Save complete. Success:', successCount, 'Errors:', errors.length);

      // Only update state if still mounted
      if (isMountedRef.current) {
        if (errors.length > 0) {
          setError(`Saved ${successCount} shifts. ${errors.length} failed: ${errors.join(', ')}`);
          setIsSaving(false);
          setSaveProgress(0);
        } else {
          // All successful - close the modal
          setIsSaving(false);
          setSaveProgress(0);
          onAssigned?.();
          onClose();
        }
      }
    } catch (err) {
      console.error('[BulkAssign] Unexpected error:', err);
      // Only update state if still mounted
      if (isMountedRef.current) {
        setError('An unexpected error occurred. Please try again.');
        setIsSaving(false);
        setSaveProgress(0);
      }
    }
  };

  // Get staff name by ID
  const getStaffName = (staffId: string | null): string => {
    if (!staffId) return '';
    const staffMember = staff.find(s => s['Staff Member ID'] === staffId);
    return staffMember?.['Staff Member Name'] ?? 'Unknown';
  };

  // Sort shifts by date and time
  const sortedShifts = useMemo(() => {
    return [...unassignedShifts].sort((a, b) => {
      const dateCompare = (a['Shift Date'] || '').localeCompare(b['Shift Date'] || '');
      if (dateCompare !== 0) return dateCompare;
      return (a['Shift Start Time'] || '').localeCompare(b['Shift Start Time'] || '');
    });
  }, [unassignedShifts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[80vh] rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bulk Assign Shifts</h2>
              <p className="text-sm text-gray-500">
                {unassignedShifts.length} unassigned shift{unassignedShifts.length !== 1 ? 's' : ''} • {assignedCount} assigned
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {sortedShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-sm font-medium text-gray-900">No Unassigned Shifts</h3>
              <p className="mt-1 text-sm text-gray-500">
                All shifts have been assigned.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-3 pr-4">Shift Reference</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3">Assign To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedShifts.map((shift) => {
                  const shiftId = shift['Shift ID'];
                  const assignedStaffId = assignments.get(shiftId) ?? null;
                  
                  return (
                    <tr key={shiftId} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-gray-900">
                          {shift['Shift Reference Name'] || 'No Reference'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">
                        {shift['Shift Date'] 
                          ? format(new Date(shift['Shift Date']), 'EEE, d MMM')
                          : '-'}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">
                        {shift['Shift Start Time'] && shift['Shift End Time']
                          ? `${format(new Date(shift['Shift Start Time']), 'HH:mm')} - ${format(new Date(shift['Shift End Time']), 'HH:mm')}`
                          : '-'}
                      </td>
                      <td className="py-3">
                        <StaffDropdown
                          staff={staff}
                          selectedStaffId={assignedStaffId}
                          onChange={(staffId) => handleAssignmentChange(shiftId, staffId)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="group relative">
              <button
                onClick={handleAutoSuggest}
                disabled={isSaving || staff.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" />
                Auto-Suggest
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Distributes shifts evenly across all staff members. Each person gets one shift before anyone gets a second.
                <div className="absolute left-4 top-full h-2 w-2 -translate-y-1 rotate-45 bg-gray-900" />
              </div>
            </div>
            <button
              onClick={handleClearAll}
              disabled={isSaving || assignedCount === 0}
              className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving || assignedCount === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving... {saveProgress}%
                </>
              ) : (
                <>Save {assignedCount > 0 ? `(${assignedCount})` : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STAFF DROPDOWN COMPONENT
// =============================================================================

interface StaffDropdownProps {
  staff: SublocationStaffViewData[];
  selectedStaffId: string | null;
  onChange: (staffId: string | null) => void;
}

function StaffDropdown({ staff, selectedStaffId, onChange }: StaffDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedStaff = staff.find(s => s['Staff Member ID'] === selectedStaffId);
  
  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staff;
    const query = search.toLowerCase();
    return staff.filter(s => 
      s['Staff Member Name']?.toLowerCase().includes(query) ||
      s['Job Title Name']?.toLowerCase().includes(query)
    );
  }, [staff, search]);

  const handleSelect = (staffId: string | null) => {
    onChange(staffId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full min-w-[200px] items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
          selectedStaffId 
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800' 
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
        }`}
      >
        <span className="truncate">
          {selectedStaff ? selectedStaff['Staff Member Name'] : 'Select staff...'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Search */}
            <div className="border-b border-gray-100 p-2">
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto py-1">
              {/* Unassign option */}
              {selectedStaffId && (
                <button
                  onClick={() => handleSelect(null)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  Unassign
                </button>
              )}
              
              {filteredStaff.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No staff found
                </div>
              ) : (
                filteredStaff.map((staffMember) => (
                  <button
                    key={staffMember['Staff Member ID']}
                    onClick={() => handleSelect(staffMember['Staff Member ID'])}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-emerald-50 ${
                      staffMember['Staff Member ID'] === selectedStaffId ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                      {getInitials(staffMember['Staff Member Name'] || 'U')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {staffMember['Staff Member Name']}
                      </div>
                      {staffMember['Job Title Name'] && (
                        <div className="truncate text-xs text-gray-500">
                          {staffMember['Job Title Name']}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function
function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default BulkAssignModal;

