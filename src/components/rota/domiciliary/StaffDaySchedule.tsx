/**
 * StaffDaySchedule Component
 *
 * Timeline view showing a staff member's daily schedule with visits and travel.
 */

import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import {
  Car,
  User,
  Home,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Play,
  Navigation,
  Printer,
  ChevronRight,
} from 'lucide-react';
import type { Visit, DomiciliaryServiceUser, VisitActivity } from '@/types/domiciliary';
import { VisitStatus, getVisitStatusDisplayName, getVisitTypeDisplayName } from '@/types/domiciliary';
import { calculateDistance, estimateTravelTime } from '@/services/roundPlanning';

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleItem {
  visit: Visit;
  serviceUser?: DomiciliaryServiceUser;
  activities: VisitActivity[];
  travelFromPrevious: {
    distanceMiles: number;
    durationMinutes: number;
  } | null;
}

interface StaffDayScheduleProps {
  staffMember: {
    cp365_staffmemberid: string;
    cp365_staffmembername: string;
    cp365_jobtitle?: string;
  };
  date: Date;
  visits: Visit[];
  serviceUsers: Map<string, DomiciliaryServiceUser>;
  activities: VisitActivity[];
  onVisitClick?: (visit: Visit) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusIcon(status: VisitStatus) {
  switch (status) {
    case VisitStatus.Completed:
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case VisitStatus.InProgress:
      return <Play className="w-4 h-4 text-amber-500" />;
    case VisitStatus.Missed:
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case VisitStatus.Cancelled:
      return <Circle className="w-4 h-4 text-gray-400" />;
    default:
      return <Circle className="w-4 h-4 text-blue-500" />;
  }
}

function getStatusColour(status: VisitStatus): string {
  switch (status) {
    case VisitStatus.Completed:
      return 'border-green-200 bg-green-50';
    case VisitStatus.InProgress:
      return 'border-amber-200 bg-amber-50';
    case VisitStatus.Missed:
      return 'border-red-200 bg-red-50';
    case VisitStatus.Cancelled:
      return 'border-gray-200 bg-gray-50 opacity-60';
    default:
      return 'border-blue-200 bg-blue-50';
  }
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StaffDaySchedule({
  staffMember,
  date,
  visits,
  serviceUsers,
  activities,
  onVisitClick,
}: StaffDayScheduleProps) {
  // Build schedule with travel calculations
  const schedule = useMemo((): ScheduleItem[] => {
    // Sort visits by start time
    const sorted = [...visits].sort((a, b) =>
      a.cp365_scheduledstarttime.localeCompare(b.cp365_scheduledstarttime)
    );

    return sorted.map((visit, index) => {
      const serviceUser = serviceUsers.get(visit.cp365_serviceuserid);
      const visitActivities = activities.filter(a => a.cp365_visitid === visit.cp365_visitid);

      // Calculate travel from previous visit
      let travelFromPrevious: { distanceMiles: number; durationMinutes: number } | null = null;

      if (index > 0) {
        const prevVisit = sorted[index - 1];
        const prevUser = serviceUsers.get(prevVisit.cp365_serviceuserid);

        if (
          serviceUser?.cp365_latitude &&
          serviceUser?.cp365_longitude &&
          prevUser?.cp365_latitude &&
          prevUser?.cp365_longitude
        ) {
          const distanceMiles = calculateDistance(
            prevUser.cp365_latitude,
            prevUser.cp365_longitude,
            serviceUser.cp365_latitude,
            serviceUser.cp365_longitude
          );
          travelFromPrevious = {
            distanceMiles: Math.round(distanceMiles * 10) / 10,
            durationMinutes: estimateTravelTime(distanceMiles),
          };
        }
      }

      return {
        visit,
        serviceUser,
        activities: visitActivities,
        travelFromPrevious,
      };
    });
  }, [visits, serviceUsers, activities]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalVisitMinutes = visits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    const totalTravelMinutes = schedule.reduce(
      (sum, item) => sum + (item.travelFromPrevious?.durationMinutes || 0),
      0
    );
    const totalMileage = schedule.reduce(
      (sum, item) => sum + (item.travelFromPrevious?.distanceMiles || 0),
      0
    );
    const completedVisits = visits.filter(v => v.cp365_visitstatus === VisitStatus.Completed).length;

    return {
      visitCount: visits.length,
      completedVisits,
      totalWorkMinutes: totalVisitMinutes,
      totalTravelMinutes,
      totalMileage: Math.round(totalMileage * 10) / 10,
      totalMinutes: totalVisitMinutes + totalTravelMinutes,
    };
  }, [visits, schedule]);

  // Current time for today's schedule - find where NOW falls in the schedule
  const currentTimeInfo = useMemo(() => {
    if (!isToday(date) || schedule.length === 0) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get the time range of the schedule
    const firstVisit = schedule[0];
    const lastVisit = schedule[schedule.length - 1];
    const startMinutes = timeToMinutes(firstVisit.visit.cp365_scheduledstarttime);
    const endMinutes = timeToMinutes(lastVisit.visit.cp365_scheduledendtime);

    // Check if current time is within or near the schedule range
    if (currentMinutes < startMinutes - 60 || currentMinutes > endMinutes + 60) {
      return null;
    }

    // Find which visit index the current time falls before/after
    let insertAfterIndex = -1; // -1 means before all visits
    
    for (let i = 0; i < schedule.length; i++) {
      const visitEndMinutes = timeToMinutes(schedule[i].visit.cp365_scheduledendtime);
      if (currentMinutes >= visitEndMinutes) {
        insertAfterIndex = i;
      }
    }

    return {
      minutes: currentMinutes,
      timeStr: currentTimeStr,
      insertAfterIndex,
    };
  }, [date, schedule]);

  // Generate time markers
  const _timeMarkers = useMemo(() => {
    if (schedule.length === 0) return [];

    const firstStart = timeToMinutes(schedule[0].visit.cp365_scheduledstarttime);
    const lastEnd = timeToMinutes(schedule[schedule.length - 1].visit.cp365_scheduledendtime);

    // Round to nearest hour
    const startHour = Math.floor(firstStart / 60);
    const endHour = Math.ceil(lastEnd / 60);

    const markers = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      markers.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        minutes: hour * 60,
      });
    }
    return markers;
  }, [schedule]);

  if (visits.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No visits scheduled</h3>
        <p className="text-gray-500">
          {staffMember.cp365_staffmembername} has no visits assigned for{' '}
          {format(date, 'EEEE d MMMM yyyy')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-700 to-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
              {getInitials(staffMember.cp365_staffmembername)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{staffMember.cp365_staffmembername}</h2>
              <p className="text-slate-300 text-sm">
                {staffMember.cp365_jobtitle || 'Carer'} • {format(date, 'EEEE d MMMM yyyy')}
              </p>
            </div>
          </div>
          <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.visitCount}</p>
          <p className="text-xs text-gray-500 uppercase">Visits</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completedVisits}</p>
          <p className="text-xs text-gray-500 uppercase">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(stats.totalWorkMinutes / 60)}h {stats.totalWorkMinutes % 60}m
          </p>
          <p className="text-xs text-gray-500 uppercase">Work Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.totalTravelMinutes}m</p>
          <p className="text-xs text-gray-500 uppercase">Travel Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.totalMileage} mi</p>
          <p className="text-xs text-gray-500 uppercase">Mileage</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {/* Schedule items */}
        <div className="space-y-2">
          {/* NOW marker before first visit if applicable */}
          {currentTimeInfo && currentTimeInfo.insertAfterIndex === -1 && (
            <div className="flex items-center gap-3 py-3">
              <div className="w-16 text-right">
                <span className="text-sm font-bold text-red-500">{currentTimeInfo.timeStr}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">NOW</div>
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}

          {schedule.map((item, index) => (
            <div key={item.visit.cp365_visitid}>
              {/* Travel segment */}
              {item.travelFromPrevious && (
                <div className="flex items-center gap-3 py-2 pl-16">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Car className="w-4 h-4" />
                    <span>
                      {item.travelFromPrevious.durationMinutes} min travel
                      <span className="text-gray-400 ml-1">
                        ({item.travelFromPrevious.distanceMiles} miles)
                      </span>
                    </span>
                  </div>
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>
              )}

              {/* Visit card */}
              <div
                onClick={() => onVisitClick?.(item.visit)}
                className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${getStatusColour(
                  item.visit.cp365_visitstatus
                )}`}
              >
                {/* Time column */}
                <div className="w-16 flex-shrink-0 text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {item.visit.cp365_scheduledstarttime}
                  </p>
                  <p className="text-xs text-gray-500">{item.visit.cp365_durationminutes} min</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {item.visit.cp365_scheduledendtime}
                  </p>
                </div>

                {/* Vertical line */}
                <div className="w-px bg-gray-300 self-stretch" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.visit.cp365_visitstatus)}
                      <h4 className="font-semibold text-gray-900">
                        {item.serviceUser?.cp365_fullname || 'Unknown Service User'}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 bg-white/50 rounded text-xs font-medium text-gray-600">
                      {getVisitTypeDisplayName(item.visit.cp365_visittypecode)}
                    </span>
                  </div>

                  {/* Address */}
                  {item.serviceUser?.cp365_currentaddress && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Home className="w-4 h-4 text-gray-400" />
                      <span>{item.serviceUser.cp365_currentaddress}</span>
                      {item.serviceUser.cp365_postcode && (
                        <span className="text-gray-400">{item.serviceUser.cp365_postcode}</span>
                      )}
                    </div>
                  )}

                  {/* Activities */}
                  {item.activities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.activities.slice(0, 4).map(activity => (
                        <span
                          key={activity.cp365_visitactivityid}
                          className={`px-2 py-0.5 rounded text-xs ${
                            activity.cp365_iscompleted
                              ? 'bg-green-100 text-green-700 line-through'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {activity.cp365_activityname}
                        </span>
                      ))}
                      {item.activities.length > 4 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          +{item.activities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50">
                    <span
                      className={`text-xs font-medium ${
                        item.visit.cp365_visitstatus === VisitStatus.Completed
                          ? 'text-green-600'
                          : item.visit.cp365_visitstatus === VisitStatus.InProgress
                            ? 'text-amber-600'
                            : item.visit.cp365_visitstatus === VisitStatus.Missed
                              ? 'text-red-600'
                              : 'text-gray-500'
                      }`}
                    >
                      {getVisitStatusDisplayName(item.visit.cp365_visitstatus)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* NOW marker after this visit if applicable */}
              {currentTimeInfo && currentTimeInfo.insertAfterIndex === index && (
                <div className="flex items-center gap-3 py-3 mt-2">
                  <div className="w-16 text-right">
                    <span className="text-sm font-bold text-red-500">{currentTimeInfo.timeStr}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded animate-pulse">NOW</div>
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total scheduled:{' '}
            <strong className="text-gray-900">
              {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
            </strong>
          </span>
          <a
            href="#"
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Navigation className="w-4 h-4" />
            View on map
          </a>
        </div>
      </div>
    </div>
  );
}

export default StaffDaySchedule;
