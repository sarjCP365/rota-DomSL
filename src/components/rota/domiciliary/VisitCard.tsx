/**
 * VisitCard Component
 *
 * Compact card displaying a visit in the rota grid.
 * Shows time, assigned carer, and activity progress.
 */

import { memo, useState } from 'react';
import { User, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { Visit, VisitActivity } from '@/types/domiciliary';
import {
  VisitStatus,
} from '@/types/domiciliary';

interface VisitCardProps {
  /** The visit to display */
  visit: Visit;
  /** Activities for this visit (optional) */
  activities?: VisitActivity[];
  /** Compact mode for smaller cells */
  compact?: boolean;
  /** Whether to show the carer name */
  showCarer?: boolean;
  /** Callback when card is selected */
  onSelect: (visit: Visit) => void;
  /** Callback for quick actions */
  onQuickAction?: (action: 'assign' | 'edit' | 'cancel', visit: Visit) => void;
}

/**
 * Get styling based on visit status
 */
function getStatusStyles(visit: Visit): string {
  const isUnassigned = !visit.cp365_staffmemberid;

  if (isUnassigned) {
    return 'bg-red-50 border-red-300 border-dashed';
  }

  switch (visit.cp365_visitstatus) {
    case VisitStatus.Scheduled:
      return 'bg-blue-50 border-blue-200';
    case VisitStatus.Assigned:
      return 'bg-blue-100 border-blue-300';
    case VisitStatus.InProgress:
      return 'bg-amber-50 border-amber-300 animate-pulse';
    case VisitStatus.Completed:
      return 'bg-green-50 border-green-200';
    case VisitStatus.Cancelled:
      return 'bg-gray-100 border-gray-300 opacity-60 line-through';
    case VisitStatus.Missed:
      return 'bg-red-50 border-red-300';
    case VisitStatus.Late:
      return 'bg-orange-50 border-orange-300';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

/**
 * Get text colour based on status
 */
function getTextColour(visit: Visit): string {
  if (!visit.cp365_staffmemberid) {
    return 'text-red-700';
  }

  switch (visit.cp365_visitstatus) {
    case VisitStatus.Completed:
      return 'text-green-700';
    case VisitStatus.Cancelled:
      return 'text-gray-500';
    case VisitStatus.Missed:
      return 'text-red-700';
    default:
      return 'text-gray-800';
  }
}

/**
 * VisitCard component
 */
export const VisitCard = memo(function VisitCard({
  visit,
  activities = [],
  compact = false,
  showCarer = true,
  onSelect,
  onQuickAction,
}: VisitCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const completedActivities = activities.filter(a => a.cp365_iscompleted).length;
  const totalActivities = activities.length;
  const carerName = visit.cp365_staffmember?.cp365_forename
    ? `${visit.cp365_staffmember.cp365_forename} ${visit.cp365_staffmember.cp365_surname?.charAt(0) || ''}.`
    : 'VACANT';

  const handleClick = () => {
    onSelect(visit);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(visit);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`
        relative p-2 rounded-md border cursor-pointer
        transition-all duration-150 ease-in-out
        ${getStatusStyles(visit)}
        ${isHovered ? 'shadow-md -translate-y-0.5' : 'shadow-sm'}
        ${compact ? 'text-xs' : 'text-sm'}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Visit for ${visit.cp365_serviceuser?.cp365_fullname || 'Unknown'} at ${visit.cp365_scheduledstarttime}, ${visit.cp365_staffmemberid ? `assigned to ${carerName}` : 'unassigned'}`}
    >
      {/* Time and duration */}
      <div className={`flex items-center justify-between gap-1 ${getTextColour(visit)}`}>
        <span className="font-semibold">{visit.cp365_scheduledstarttime}</span>
        <span className="text-xs opacity-70">{visit.cp365_durationminutes}m</span>
      </div>

      {/* Carer name */}
      {showCarer && (
        <div className={`mt-1 flex items-center gap-1 ${getTextColour(visit)}`}>
          <User className="w-3 h-3" />
          <span className={`truncate ${!visit.cp365_staffmemberid ? 'font-semibold text-red-600' : ''}`}>
            {carerName}
          </span>
        </div>
      )}

      {/* Activity progress (if activities provided) */}
      {totalActivities > 0 && !compact && (
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <div className="flex gap-0.5">
            {activities.slice(0, 3).map((activity) => (
              activity.cp365_iscompleted ? (
                <CheckCircle2 key={activity.cp365_visitactivityid} className="w-3 h-3 text-green-500" />
              ) : (
                <Circle key={activity.cp365_visitactivityid} className="w-3 h-3 text-gray-300" />
              )
            ))}
            {totalActivities > 3 && <span className="text-xs">+{totalActivities - 3}</span>}
          </div>
          <span className="ml-auto">{completedActivities}/{totalActivities}</span>
        </div>
      )}

      {/* Status indicator for special states */}
      {visit.cp365_visitstatus === VisitStatus.Late && (
        <div className="absolute -top-1 -right-1">
          <AlertCircle className="w-4 h-4 text-orange-500 fill-orange-100" />
        </div>
      )}

      {/* Quick actions on hover */}
      {isHovered && onQuickAction && (
        <div className="absolute -bottom-1 right-0 flex gap-1 bg-white rounded shadow-lg p-1 z-10">
          {!visit.cp365_staffmemberid && (
            <button
              className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('assign', visit);
              }}
            >
              Assign
            </button>
          )}
          <button
            className="px-2 py-0.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction('edit', visit);
            }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
});

export default VisitCard;
