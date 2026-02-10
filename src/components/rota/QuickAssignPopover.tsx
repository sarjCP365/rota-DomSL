/**
 * QuickAssignPopover Component
 *
 * A compact popover for quickly assigning staff to unassigned shifts.
 * Shows a searchable list of available staff members.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Settings, Loader2 } from 'lucide-react';
import { useUpdateShift } from '@/hooks/useShifts';
import type { SublocationStaffViewData } from '@/api/dataverse/types';

// =============================================================================
// TYPES
// =============================================================================

interface QuickAssignPopoverProps {
  /** The shift ID to assign */
  shiftId: string;
  /** Available staff members to choose from */
  staff: SublocationStaffViewData[];
  /** Position for the popover */
  position: { x: number; y: number };
  /** Callback when popover should close */
  onClose: () => void;
  /** Callback when user wants full flyout (More options) */
  onOpenFlyout?: () => void;
  /** Callback after successful assignment */
  onAssigned?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function QuickAssignPopover({
  shiftId,
  staff,
  position,
  onClose,
  onOpenFlyout,
  onAssigned,
}: QuickAssignPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const updateShiftMutation = useUpdateShift();

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Filter staff by search query
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) {
      return staff.slice(0, 10); // Show first 10 by default
    }

    const query = searchQuery.toLowerCase();
    return staff
      .filter(
        (s) =>
          s['Staff Member Name']?.toLowerCase().includes(query) ||
          s['Job Title Name']?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [staff, searchQuery]);

  // Handle staff selection
  const handleSelectStaff = async (staffMember: SublocationStaffViewData) => {
    setIsAssigning(true);

    try {
      // IMPORTANT: For cp365_shifts, navigation property names MUST be PascalCase for @odata.bind
      await updateShiftMutation.mutateAsync({
        shiftId,
        data: {
          'cp365_StaffMember@odata.bind': `/cp365_staffmembers(${staffMember['Staff Member ID']})`,
        },
      });

      onAssigned?.();
      onClose();
    } catch (error) {
      console.error('[QuickAssign] Failed to assign shift:', error);
      setIsAssigning(false);
    }
  };

  // Handle "More options" click
  const handleMoreOptions = () => {
    onClose();
    onOpenFlyout?.();
  };

  // Calculate position (ensure popover stays within viewport)
  const popoverStyle = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = 280;
    const popoverHeight = 350;

    let left = position.x;
    let top = position.y;

    // Adjust horizontal position
    if (left + popoverWidth > viewportWidth - 20) {
      left = viewportWidth - popoverWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }

    // Adjust vertical position
    if (top + popoverHeight > viewportHeight - 20) {
      top = position.y - popoverHeight - 10;
    }
    if (top < 20) {
      top = 20;
    }

    return { left, top };
  }, [position]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] w-[280px] rounded-lg border border-slate-200 bg-white shadow-xl"
      style={popoverStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <span className="text-sm font-semibold text-slate-800">Assign Staff</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-slate-100 px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Staff list */}
      <div className="max-h-[220px] overflow-y-auto">
        {isAssigning ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-sm text-slate-600">Assigning...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-slate-500">
            {searchQuery ? 'No staff found' : 'No staff available'}
          </div>
        ) : (
          <div className="py-1">
            {filteredStaff.map((staffMember) => (
              <button
                key={staffMember['Staff Member ID']}
                onClick={() => handleSelectStaff(staffMember)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-emerald-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                  {getInitials(staffMember['Staff Member Name'] || 'U')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {staffMember['Staff Member Name']}
                  </div>
                  {staffMember['Job Title Name'] && (
                    <div className="truncate text-xs text-slate-500">
                      {staffMember['Job Title Name']}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {onOpenFlyout && (
        <div className="border-t border-slate-100 px-3 py-2">
          <button
            onClick={handleMoreOptions}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" />
            More options...
          </button>
        </div>
      )}
    </div>
  );
}

export default QuickAssignPopover;
