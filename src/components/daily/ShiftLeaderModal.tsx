/**
 * ShiftLeaderModal Component
 * Quick action modal for assigning shift leader status
 * Based on CURSOR-DAILY-VIEW-PROMPTS.md Prompt 9
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useUpdateShift } from '@/hooks/useShifts';
import type { ShiftViewData } from '@/api/dataverse/types';

// =============================================================================
// Types
// =============================================================================

interface ShiftLeaderModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Shift data */
  shift: ShiftViewData | null;
  /** Callback when shift is updated */
  onSave?: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  if (!name || name === 'Unassigned') return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatShiftTime(shift: ShiftViewData): string {
  const start = shift['Shift Start Time']
    ? format(new Date(shift['Shift Start Time']), 'HH:mm')
    : '--:--';
  const end = shift['Shift End Time']
    ? format(new Date(shift['Shift End Time']), 'HH:mm')
    : '--:--';
  return `${start} - ${end}`;
}

// =============================================================================
// Component
// =============================================================================

export function ShiftLeaderModal({ isOpen, onClose, shift, onSave }: ShiftLeaderModalProps) {
  const [isShiftLeader, setIsShiftLeader] = useState(false);
  const [isActUp, setIsActUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateShiftMutation = useUpdateShift();
  const isSubmitting = updateShiftMutation.isPending;

  // Reset state when shift changes - intentional sync for modal form editing
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (shift) {
      setIsShiftLeader(shift['Shift Leader'] || false);
      setIsActUp(shift['Act Up'] || false);
      setError(null);
    }
  }, [shift]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle confirm
  const handleConfirm = async () => {
    if (!shift) return;
    setError(null);

    try {
      const shiftId = shift['Shift ID'];
      const updateData: Record<string, unknown> = {
        cp365_shiftleader: isShiftLeader,
        cp365_actup: isActUp,
      };

      await updateShiftMutation.mutateAsync({ shiftId, data: updateData });
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Failed to update shift leader status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update shift');
    }
  };

  if (!isOpen || !shift) return null;

  const staffName = shift['Staff Member Name'] || 'Unassigned';
  const initials = getInitials(staffName);
  const shiftTime = formatShiftTime(shift);
  const hasChanges =
    isShiftLeader !== (shift['Shift Leader'] || false) || isActUp !== (shift['Act Up'] || false);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-grey px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                Assign Shift Leader
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Error Alert */}
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Shift Info */}
            <div className="mb-5 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  {initials}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{staffName}</div>
                  <div className="text-sm text-gray-500">{shiftTime}</div>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-grey p-4 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isShiftLeader}
                  onChange={(e) => setIsShiftLeader(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span>
                  <span className="font-medium text-gray-900">Make Shift Leader</span>
                  <span className="block text-sm text-gray-500">
                    This person will be responsible for the shift
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-grey p-4 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isActUp}
                  onChange={(e) => setIsActUp(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  <span className="font-medium text-gray-900">Act Up (temporary manager)</span>
                  <span className="block text-sm text-gray-500">
                    Temporarily taking on management responsibilities
                  </span>
                </span>
              </label>
            </div>

            {/* Note */}
            <p className="mt-4 text-xs text-gray-500">
              {isShiftLeader || isActUp
                ? 'The staff member will be notified of their new responsibilities.'
                : 'Select an option to assign leadership responsibilities.'}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border-grey px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-grey px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !hasChanges}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ShiftLeaderModal;
