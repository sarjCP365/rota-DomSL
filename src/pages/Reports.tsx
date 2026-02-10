/**
 * Reports Page
 *
 * Analytics and reporting dashboard for domiciliary care operations.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, subWeeks, addDays, parseISO } from 'date-fns';
import {
  BarChart3,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Loader2,
  PoundSterling,
  UserX,
  Plane,
  HeartPulse,
} from 'lucide-react';
import { useSideNav, SideNav } from '@/components/common/SideNav';
import { FeatureErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/Header';
import { getDummyData } from '@/data/dummyDataGenerator';
import type { Visit, DomiciliaryServiceUser, VisitStatus } from '@/types/domiciliary';
import { VisitStatus as VS } from '@/types/domiciliary';

// =============================================================================
// TYPES
// =============================================================================

interface StaffLeaveRecord {
  staffId: string;
  staffName: string;
  type: 'sickness' | 'holiday' | 'other';
  startDate: string;
  endDate: string;
  days: number;
}

interface StaffHolidayBalance {
  staffId: string;
  staffName: string;
  entitlement: number;
  taken: number;
  booked: number;
  remaining: number;
}

interface ServiceUserHours {
  serviceUserId: string;
  serviceUserName: string;
  weeklyHours: number;
  fundedHours: number;
  variance: number;
  visitCount: number;
}

interface VisitStatusSummary {
  status: VisitStatus;
  count: number;
  percentage: number;
  avgDuration: number;
  totalCost: number;
}

// =============================================================================
// REPORT TAB TYPES
// =============================================================================

type ReportTab = 'staff-leave' | 'service-user-hours' | 'contracted-hours' | 'visit-status';

const REPORT_TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'staff-leave', label: 'Staff Leave & Sickness', icon: <HeartPulse className="w-4 h-4" /> },
  { id: 'service-user-hours', label: 'Service User Hours', icon: <Users className="w-4 h-4" /> },
  { id: 'contracted-hours', label: 'Contracted Hours', icon: <Clock className="w-4 h-4" /> },
  { id: 'visit-status', label: 'Visit Status', icon: <BarChart3 className="w-4 h-4" /> },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Seeded random for consistent dummy data
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Generate staff leave records
function generateLeaveRecords(staffMembers: { cp365_staffmemberid: string; cp365_staffmembername: string }[]): StaffLeaveRecord[] {
  const random = seededRandom(54321);
  const records: StaffLeaveRecord[] = [];
  const today = new Date();
  
  staffMembers.forEach(staff => {
    // Generate 0-3 leave records per staff member
    const numRecords = Math.floor(random() * 4);
    
    for (let i = 0; i < numRecords; i++) {
      const type = random() < 0.3 ? 'sickness' : random() < 0.8 ? 'holiday' : 'other';
      const daysAgo = Math.floor(random() * 60);
      const duration = type === 'sickness' ? Math.floor(random() * 5) + 1 : Math.floor(random() * 7) + 1;
      const startDate = format(addDays(today, -daysAgo), 'yyyy-MM-dd');
      const endDate = format(addDays(today, -daysAgo + duration - 1), 'yyyy-MM-dd');
      
      records.push({
        staffId: staff.cp365_staffmemberid,
        staffName: staff.cp365_staffmembername,
        type,
        startDate,
        endDate,
        days: duration,
      });
    }
  });
  
  return records.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

// Generate holiday balances
function generateHolidayBalances(staffMembers: { cp365_staffmemberid: string; cp365_staffmembername: string }[]): StaffHolidayBalance[] {
  const random = seededRandom(12345);
  
  return staffMembers.map(staff => {
    const entitlement = 28; // UK statutory minimum
    const taken = Math.floor(random() * 15);
    const booked = Math.floor(random() * 5);
    
    return {
      staffId: staff.cp365_staffmemberid,
      staffName: staff.cp365_staffmembername,
      entitlement,
      taken,
      booked,
      remaining: entitlement - taken - booked,
    };
  }).sort((a, b) => a.remaining - b.remaining);
}

// Calculate service user weekly hours
function calculateServiceUserHours(
  serviceUsers: DomiciliaryServiceUser[],
  visits: Visit[],
  weekStart: Date
): ServiceUserHours[] {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  
  return serviceUsers.map(su => {
    const userVisits = visits.filter(v => 
      v.cp365_serviceuserid === su.cp365_serviceuserid &&
      v.cp365_visitdate >= weekStartStr &&
      v.cp365_visitdate <= weekEndStr
    );
    
    const totalMinutes = userVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    const weeklyHours = Math.round(totalMinutes / 60 * 10) / 10;
    const fundedHours = su.cp365_weeklyfundedhours || 14;
    
    return {
      serviceUserId: su.cp365_serviceuserid,
      serviceUserName: su.cp365_fullname,
      weeklyHours,
      fundedHours,
      variance: weeklyHours - fundedHours,
      visitCount: userVisits.length,
    };
  }).sort((a, b) => b.variance - a.variance);
}

// Calculate contracted hours
function calculateContractedHours(
  staffMembers: { cp365_staffmemberid: string; cp365_staffmembername: string; cp365_jobtitle?: string }[],
  visits: Visit[],
  weekStart: Date
) {
  const random = seededRandom(99999);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  
  return staffMembers.map(staff => {
    const staffVisits = visits.filter(v =>
      v.cp365_staffmemberid === staff.cp365_staffmemberid &&
      v.cp365_visitdate >= weekStartStr &&
      v.cp365_visitdate <= weekEndStr
    );
    
    const actualMinutes = staffVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    const actualHours = Math.round(actualMinutes / 60 * 10) / 10;
    const contractedHours = Math.floor(random() * 20) + 20; // 20-40 hours
    
    return {
      staffId: staff.cp365_staffmemberid,
      staffName: staff.cp365_staffmembername,
      jobTitle: staff.cp365_jobtitle || 'Carer',
      contractedHours,
      actualHours,
      variance: actualHours - contractedHours,
      visitCount: staffVisits.length,
    };
  }).sort((a, b) => a.variance - b.variance);
}

// Calculate visit status summary
function calculateVisitStatusSummary(visits: Visit[]): VisitStatusSummary[] {
  const HOURLY_RATE = 15; // £15 per hour
  const statusGroups = new Map<VisitStatus, Visit[]>();
  
  visits.forEach(v => {
    const existing = statusGroups.get(v.cp365_visitstatus) || [];
    existing.push(v);
    statusGroups.set(v.cp365_visitstatus, existing);
  });
  
  const total = visits.length;
  
  return Array.from(statusGroups.entries()).map(([status, statusVisits]) => {
    const avgDuration = statusVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0) / statusVisits.length;
    const totalMinutes = statusVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    const totalCost = (totalMinutes / 60) * HOURLY_RATE;
    
    return {
      status,
      count: statusVisits.length,
      percentage: Math.round((statusVisits.length / total) * 100),
      avgDuration: Math.round(avgDuration),
      totalCost: Math.round(totalCost * 100) / 100,
    };
  }).sort((a, b) => b.count - a.count);
}

// Get status display info
function getStatusDisplay(status: VisitStatus): { label: string; colour: string; bgColour: string } {
  const displays: Record<VisitStatus, { label: string; colour: string; bgColour: string }> = {
    [VS.Scheduled]: { label: 'Scheduled', colour: 'text-blue-700', bgColour: 'bg-blue-100' },
    [VS.Assigned]: { label: 'Assigned', colour: 'text-indigo-700', bgColour: 'bg-indigo-100' },
    [VS.InProgress]: { label: 'In Progress', colour: 'text-amber-700', bgColour: 'bg-amber-100' },
    [VS.Completed]: { label: 'Completed', colour: 'text-green-700', bgColour: 'bg-green-100' },
    [VS.Cancelled]: { label: 'Cancelled', colour: 'text-gray-700', bgColour: 'bg-gray-100' },
    [VS.Missed]: { label: 'Missed', colour: 'text-red-700', bgColour: 'bg-red-100' },
    [VS.Late]: { label: 'Late', colour: 'text-orange-700', bgColour: 'bg-orange-100' },
  };
  return displays[status] || { label: 'Unknown', colour: 'text-gray-700', bgColour: 'bg-gray-100' };
}

// =============================================================================
// REPORT COMPONENTS
// =============================================================================

interface StaffLeaveReportProps {
  staffMembers: { cp365_staffmemberid: string; cp365_staffmembername: string }[];
}

function StaffLeaveReport({ staffMembers }: StaffLeaveReportProps) {
  const leaveRecords = useMemo(() => generateLeaveRecords(staffMembers), [staffMembers]);
  const holidayBalances = useMemo(() => generateHolidayBalances(staffMembers), [staffMembers]);
  
  // Sickness by day of week
  const sicknessByDay = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    leaveRecords
      .filter(r => r.type === 'sickness')
      .forEach(r => {
        const start = parseISO(r.startDate);
        for (let i = 0; i < r.days; i++) {
          const day = addDays(start, i);
          const dayOfWeek = (day.getDay() + 6) % 7; // Convert to Mon=0
          counts[dayOfWeek]++;
        }
      });
    
    const maxCount = Math.max(...counts, 1);
    return days.map((day, i) => ({ day, count: counts[i], percentage: (counts[i] / maxCount) * 100 }));
  }, [leaveRecords]);
  
  const totalSickDays = leaveRecords.filter(r => r.type === 'sickness').reduce((sum, r) => sum + r.days, 0);
  const staffWithUntakenLeave = holidayBalances.filter(b => b.remaining > 10).length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <HeartPulse className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sick Days</p>
              <p className="text-2xl font-bold text-gray-900">{totalSickDays}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <UserX className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">High Untaken Leave</p>
              <p className="text-2xl font-bold text-gray-900">{staffWithUntakenLeave}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Holiday Remaining</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(holidayBalances.reduce((sum, b) => sum + b.remaining, 0) / holidayBalances.length)} days
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Staff Members</p>
              <p className="text-2xl font-bold text-gray-900">{staffMembers.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sickness by Day Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sickness by Day of Week</h3>
        <div className="flex items-end gap-2 h-40">
          {sicknessByDay.map(({ day, count, percentage }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '120px' }}>
                <div
                  className="absolute bottom-0 w-full bg-red-500 rounded-t-lg transition-all"
                  style={{ height: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{day}</span>
              <span className="text-xs text-gray-500">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Holiday Balances Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Holiday Balances</h3>
          <p className="text-sm text-gray-500">Staff with lowest remaining leave highlighted</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff Member</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Entitlement</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Taken</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Booked</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {holidayBalances.map((balance, _index) => (
                <tr key={balance.staffId} className={balance.remaining > 15 ? 'bg-amber-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{balance.staffName}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{balance.entitlement}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{balance.taken}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{balance.booked}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      balance.remaining > 15 ? 'bg-amber-100 text-amber-700' :
                      balance.remaining < 5 ? 'bg-red-100 text-red-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {balance.remaining} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ServiceUserHoursReportProps {
  serviceUsers: DomiciliaryServiceUser[];
  visits: Visit[];
}

function ServiceUserHoursReport({ serviceUsers, visits }: ServiceUserHoursReportProps) {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const hoursData = useMemo(
    () => calculateServiceUserHours(serviceUsers, visits, selectedWeek),
    [serviceUsers, visits, selectedWeek]
  );
  
  const totalFunded = hoursData.reduce((sum, h) => sum + h.fundedHours, 0);
  const totalDelivered = hoursData.reduce((sum, h) => sum + h.weeklyHours, 0);
  const overDelivered = hoursData.filter(h => h.variance > 0).length;
  const underDelivered = hoursData.filter(h => h.variance < 0).length;
  
  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="font-medium">
            Week of {format(selectedWeek, 'd MMM yyyy')}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            This Week
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Funded Hours</p>
          <p className="text-2xl font-bold text-gray-900">{totalFunded}h</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Delivered</p>
          <p className="text-2xl font-bold text-gray-900">{totalDelivered}h</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Over-Delivered</p>
          <p className="text-2xl font-bold text-green-600">{overDelivered} clients</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Under-Delivered</p>
          <p className="text-2xl font-bold text-red-600">{underDelivered} clients</p>
        </div>
      </div>
      
      {/* Hours Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Hours by Service User</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service User</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Visits</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Funded</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Delivered</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hoursData.map(row => (
                <tr key={row.serviceUserId}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.serviceUserName}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.visitCount}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.fundedHours}h</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.weeklyHours}h</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      row.variance > 0 ? 'bg-green-100 text-green-700' :
                      row.variance < 0 ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.variance > 0 ? <TrendingUp className="w-3 h-3" /> : row.variance < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      {row.variance > 0 ? '+' : ''}{row.variance}h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ContractedHoursReportProps {
  staffMembers: { cp365_staffmemberid: string; cp365_staffmembername: string; cp365_jobtitle?: string }[];
  visits: Visit[];
}

function ContractedHoursReport({ staffMembers, visits }: ContractedHoursReportProps) {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const hoursData = useMemo(
    () => calculateContractedHours(staffMembers, visits, selectedWeek),
    [staffMembers, visits, selectedWeek]
  );
  
  const totalContracted = hoursData.reduce((sum, h) => sum + h.contractedHours, 0);
  const totalActual = hoursData.reduce((sum, h) => sum + h.actualHours, 0);
  const overWorked = hoursData.filter(h => h.variance > 0).length;
  const underWorked = hoursData.filter(h => h.variance < -5).length;
  
  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="font-medium">Week of {format(selectedWeek, 'd MMM yyyy')}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            This Week
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Contracted</p>
          <p className="text-2xl font-bold text-gray-900">{totalContracted}h</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Actual</p>
          <p className="text-2xl font-bold text-gray-900">{totalActual}h</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Over Contracted</p>
          <p className="text-2xl font-bold text-amber-600">{overWorked} staff</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Under Utilised</p>
          <p className="text-2xl font-bold text-blue-600">{underWorked} staff</p>
        </div>
      </div>
      
      {/* Hours Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Contracted vs Actual Hours</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Visits</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Contracted</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actual</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hoursData.map(row => (
                <tr key={row.staffId} className={row.variance > 5 ? 'bg-amber-50' : row.variance < -10 ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.staffName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.jobTitle}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.visitCount}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.contractedHours}h</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.actualHours}h</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      row.variance > 5 ? 'bg-amber-100 text-amber-700' :
                      row.variance < -5 ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {row.variance > 0 ? '+' : ''}{row.variance}h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface VisitStatusReportProps {
  visits: Visit[];
}

function VisitStatusReport({ visits }: VisitStatusReportProps) {
  const HOURLY_RATE = 15;
  
  const statusSummary = useMemo(() => calculateVisitStatusSummary(visits), [visits]);
  
  const totalVisits = visits.length;
  const totalMinutes = visits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const totalCost = Math.round((totalMinutes / 60) * HOURLY_RATE * 100) / 100;
  const missedVisits = visits.filter(v => v.cp365_visitstatus === VS.Missed).length;
  const avgDuration = Math.round(totalMinutes / totalVisits);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Visits</p>
          <p className="text-2xl font-bold text-gray-900">{totalVisits}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900">{totalHours}h</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Avg Duration</p>
          <p className="text-2xl font-bold text-gray-900">{avgDuration} min</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <PoundSterling className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Total Cost</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">£{totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Missed Visits</p>
          <p className="text-2xl font-bold text-red-600">{missedVisits}</p>
        </div>
      </div>
      
      {/* Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Visit Status Breakdown</h3>
        </div>
        
        {/* Visual Bar */}
        <div className="p-4">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {statusSummary.map(({ status, percentage }) => {
              const { bgColour } = getStatusDisplay(status);
              return (
                <div
                  key={status}
                  className={`${bgColour.replace('bg-', 'bg-')} transition-all`}
                  style={{ width: `${percentage}%` }}
                  title={`${getStatusDisplay(status).label}: ${percentage}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {statusSummary.map(({ status, percentage }) => {
              const { label, bgColour } = getStatusDisplay(status);
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${bgColour}`} />
                  <span className="text-sm text-gray-600">{label} ({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Detailed Table */}
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Count</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Percentage</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Avg Duration</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Avg Cost</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statusSummary.map(row => {
                const { label, bgColour, colour } = getStatusDisplay(row.status);
                const avgCost = row.count > 0 ? Math.round((row.totalCost / row.count) * 100) / 100 : 0;
                return (
                  <tr key={row.status}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColour} ${colour}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">{row.count}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.percentage}%</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.avgDuration} min</td>
                    <td className="px-4 py-3 text-center text-gray-600">£{avgCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">£{row.totalCost.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function Reports() {
  const { isOpen: sideNavOpen, toggle: toggleSideNav, close: closeSideNav } = useSideNav();
  const [activeTab, setActiveTab] = useState<ReportTab>('staff-leave');
  
  // Fetch data
  const dataQuery = useQuery({
    queryKey: ['reports', 'data'],
    queryFn: () => getDummyData(),
    staleTime: 5 * 60 * 1000,
  });
  
  if (dataQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }
  
  const { serviceUsers = [], staffMembers = [], visits = [] } = dataQuery.data || {};
  
  return (
    <div className="flex h-screen bg-slate-100">
      <FeatureErrorBoundary featureName="Navigation">
        <SideNav isOpen={sideNavOpen} onClose={closeSideNav} />
      </FeatureErrorBoundary>
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Reports"
          subtitle="Analytics and insights"
          onMenuToggle={toggleSideNav}
          onRefresh={() => dataQuery.refetch()}
          variant="emerald"
        />
        
        <main className="flex-1 overflow-auto p-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
            {REPORT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Report Content */}
          {activeTab === 'staff-leave' && (
            <StaffLeaveReport staffMembers={staffMembers} />
          )}
          
          {activeTab === 'service-user-hours' && (
            <ServiceUserHoursReport serviceUsers={serviceUsers} visits={visits} />
          )}
          
          {activeTab === 'contracted-hours' && (
            <ContractedHoursReport staffMembers={staffMembers} visits={visits} />
          )}
          
          {activeTab === 'visit-status' && (
            <VisitStatusReport visits={visits} />
          )}
        </main>
      </div>
    </div>
  );
}

export default Reports;
