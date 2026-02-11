/**
 * StaffOnLeaveModal Component
 * Modal showing a list of staff members on leave for a given date.
 * Extracted from DailyView.tsx.
 */

import { format } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import type { StaffOnLeaveItem } from './useDailyViewData';

// =============================================================================
// Types
// =============================================================================

interface StaffOnLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  staffOnLeaveList: StaffOnLeaveItem[];
}

// =============================================================================
// Component
// =============================================================================

export function StaffOnLeaveModal({
  isOpen,
  onClose,
  selectedDate,
  staffOnLeaveList,
}: StaffOnLeaveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="button" tabIndex={0} aria-label="Close modal" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md max-h-[80vh] rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Calendar className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Staff on Leave</h2>
              <p className="text-sm text-slate-500">
                {format(selectedDate, 'EEEE, d MMMM yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {staffOnLeaveList.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No staff on leave for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {staffOnLeaveList.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                    {staff.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{staff.name}</div>
                    {staff.jobTitle && (
                      <div className="text-sm text-slate-500">{staff.jobTitle}</div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          staff.isSensitive
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {staff.leaveType}
                      </span>
                      {staff.startDate && staff.endDate && !staff.isSensitive && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(staff.startDate), 'd MMM')} -{' '}
                          {format(new Date(staff.endDate), 'd MMM')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="text-sm text-slate-500">
            {staffOnLeaveList.length} staff member{staffOnLeaveList.length !== 1 ? 's' : ''} on
            leave
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffOnLeaveModal;
