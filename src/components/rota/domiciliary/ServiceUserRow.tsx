/**
 * ServiceUserRow Component
 *
 * A row in the service user rota grid displaying a service user's
 * information and their visits across a week.
 */

import { memo, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { MapPin, Clock, Key, Users } from 'lucide-react';
import type { DomiciliaryServiceUser, Visit } from '@/types/domiciliary';
import { FundingType } from '@/types/domiciliary';
import { VisitCard } from './VisitCard';

interface ServiceUserRowProps {
  /** The service user to display */
  serviceUser: DomiciliaryServiceUser;
  /** Visits for this service user */
  visits: Visit[];
  /** Array of dates to display as columns */
  dateRange: Date[];
  /** Callback when a visit is clicked */
  onVisitClick: (visit: Visit) => void;
  /** Callback to create a new visit */
  onCreateVisit: (serviceUserId: string, date: Date) => void;
  /** Callback when service user info is clicked */
  onServiceUserClick: (serviceUser: DomiciliaryServiceUser) => void;
  /** Whether this row is expanded to show details */
  isExpanded?: boolean;
  /** Toggle expanded state */
  onToggleExpanded?: () => void;
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get funding type badge colour
 */
function getFundingBadgeColour(fundingType?: number): string {
  switch (fundingType) {
    case FundingType.LocalAuthority:
      return 'bg-blue-100 text-blue-800';
    case FundingType.NhsChc:
      return 'bg-green-100 text-green-800';
    case FundingType.Private:
      return 'bg-purple-100 text-purple-800';
    case FundingType.Mixed:
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get funding type label
 */
function getFundingLabel(fundingType?: number): string {
  switch (fundingType) {
    case FundingType.LocalAuthority:
      return 'LA';
    case FundingType.NhsChc:
      return 'CHC';
    case FundingType.Private:
      return 'Private';
    case FundingType.Mixed:
      return 'Mixed';
    default:
      return '';
  }
}

/**
 * ServiceUserRow component
 */
export const ServiceUserRow = memo(function ServiceUserRow({
  serviceUser,
  visits,
  dateRange,
  onVisitClick,
  onCreateVisit,
  onServiceUserClick,
}: ServiceUserRowProps) {
  // Group visits by date
  const visitsByDate = useMemo(() => {
    const grouped = new Map<string, Visit[]>();

    for (const date of dateRange) {
      const dateStr = format(date, 'yyyy-MM-dd');
      grouped.set(dateStr, []);
    }

    for (const visit of visits) {
      const existing = grouped.get(visit.cp365_visitdate) || [];
      existing.push(visit);
      grouped.set(visit.cp365_visitdate, existing);
    }

    // Sort visits within each day by time
    for (const [_dateStr, dayVisits] of grouped) {
      dayVisits.sort((a, b) =>
        a.cp365_scheduledstarttime.localeCompare(b.cp365_scheduledstarttime)
      );
    }

    return grouped;
  }, [visits, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVisits = visits.length;
    const unassignedCount = visits.filter(v => !v.cp365_staffmemberid).length;
    const totalMinutes = visits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    const totalHours = totalMinutes / 60;

    return { totalVisits, unassignedCount, totalHours };
  }, [visits]);

  const hasKeySafe = !!serviceUser.cp365_keysafelocation;
  const needsTwoCarers = visits.some(v =>
    v.cp365_visitnotes?.toLowerCase().includes('two carer') ||
    v.cp365_visitnotes?.toLowerCase().includes('2 carer')
  );

  return (
    <div className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {/* Service User Info Column */}
      <div
        className="w-56 min-w-56 flex-shrink-0 p-3 border-r border-gray-200 cursor-pointer hover:bg-blue-50"
        onClick={() => onServiceUserClick(serviceUser)}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {serviceUser.cp365_photo ? (
              <img
                src={serviceUser.cp365_photo}
                alt={serviceUser.cp365_fullname}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(serviceUser.cp365_fullname)
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {serviceUser.cp365_preferredname || serviceUser.cp365_fullname}
            </h3>

            {/* Address */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{serviceUser.cp365_currentaddress.split(',')[0]}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {/* Funding badge */}
              {serviceUser.cp365_fundingtype && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getFundingBadgeColour(serviceUser.cp365_fundingtype)}`}>
                  {getFundingLabel(serviceUser.cp365_fundingtype)}
                </span>
              )}

              {/* Hours badge */}
              {serviceUser.cp365_weeklyfundedhours && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {serviceUser.cp365_weeklyfundedhours}h/wk
                </span>
              )}

              {/* Key safe indicator */}
              {hasKeySafe && (
                <span className="p-0.5 bg-amber-100 text-amber-700 rounded" title="Has key safe">
                  <Key className="w-3 h-3" />
                </span>
              )}

              {/* Two carer indicator */}
              {needsTwoCarers && (
                <span className="p-0.5 bg-purple-100 text-purple-700 rounded" title="Requires 2 carers">
                  <Users className="w-3 h-3" />
                </span>
              )}
            </div>

            {/* Unassigned warning */}
            {stats.unassignedCount > 0 && (
              <div className="mt-1 text-xs text-red-600 font-medium">
                {stats.unassignedCount} unassigned
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visit Cells - one per day */}
      {dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayVisits = visitsByDate.get(dateStr) || [];
        const isToday = isSameDay(date, new Date());
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        return (
          <div
            key={dateStr}
            className={`
              flex-1 min-w-24 p-1.5 border-r border-gray-100 last:border-r-0
              ${isToday ? 'bg-blue-50/50' : isWeekend ? 'bg-gray-50' : ''}
            `}
          >
            {dayVisits.length > 0 ? (
              <div className="flex flex-col gap-1">
                {dayVisits.map(visit => (
                  <VisitCard
                    key={visit.cp365_visitid}
                    visit={visit}
                    compact={dayVisits.length > 2}
                    onSelect={onVisitClick}
                    onQuickAction={(action, v) => {
                      if (action === 'assign' || action === 'edit') {
                        onVisitClick(v);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <button
                className="w-full h-full min-h-12 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded border border-dashed border-transparent hover:border-blue-200 transition-colors"
                onClick={() => onCreateVisit(serviceUser.cp365_serviceuserid, date)}
                aria-label={`Add visit for ${serviceUser.cp365_fullname} on ${format(date, 'EEEE d MMMM')}`}
              >
                <span className="text-xs">+ Add</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default ServiceUserRow;
