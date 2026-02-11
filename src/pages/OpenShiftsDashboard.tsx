/**
 * OpenShiftsDashboard Page
 *
 * Dashboard for viewing and managing open shift offers.
 * Shows all open shifts with candidate responses and actions.
 */

import { useState, useMemo } from 'react';
import { format, parseISO, differenceInHours } from 'date-fns';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  MapPin,
  Filter,
} from 'lucide-react';
import { SideNav, useSideNav } from '@/components/common/SideNav';
import PageHeader from '@/components/common/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { getDummyData } from '@/data/dummyDataGenerator';
import type { OpenShift, OpenShiftOffer, OpenShiftsSummary } from '@/types/openShift';
import { 
  OpenShiftStatus, 
  OpenShiftOfferStatus,
  getOpenShiftStatusColour,
  getOpenShiftStatusText,
  getOfferStatusColour,
  getOfferStatusText,
  formatTimeRemaining,
} from '@/types/openShift';
import { addHours } from 'date-fns';

type StatusFilter = 'all' | 'open' | 'filled' | 'expired';

// Generate dummy open shifts for display
async function generateDummyOpenShifts(): Promise<OpenShift[]> {
  const data = await getDummyData();
  const today = new Date();
  
  // Create some dummy open shifts
  const openShifts: OpenShift[] = [];
  const visits = data.visits.filter(v => {
    const visitDate = new Date(v.cp365_visitdate);
    return visitDate >= today && !v.cp365_staffmemberid;
  }).slice(0, 5);

  visits.forEach((visit, index) => {
    const createdHoursAgo = [2, 5, 12, 24, 48][index] || 2;
    const status = index === 4 ? OpenShiftStatus.Expired : 
                   index === 3 ? OpenShiftStatus.Filled : 
                   OpenShiftStatus.Open;
    
    // Generate some dummy offers
    const offers: OpenShiftOffer[] = data.staffMembers.slice(0, 4 + index).map((staff, i) => ({
      cp365_openshiftofferid: `offer-${visit.cp365_visitid}-${i}`,
      _cp365_openshift_value: `open-${visit.cp365_visitid}`,
      _cp365_staffmember_value: staff.cp365_staffmemberid,
      staffMemberName: staff.cp365_staffmembername,
      staffMemberJobTitle: staff.cp365_jobtitle,
      cp365_matchscore: 90 - i * 5,
      cp365_offerstatus: i === 0 && status === OpenShiftStatus.Filled 
        ? OpenShiftOfferStatus.Accepted 
        : i === 1 
          ? OpenShiftOfferStatus.Declined 
          : OpenShiftOfferStatus.Pending,
      cp365_offereddate: addHours(today, -createdHoursAgo).toISOString(),
      cp365_respondeddate: i < 2 ? addHours(today, -(createdHoursAgo - 1)).toISOString() : undefined,
      cp365_responsenotes: i === 1 ? 'Already committed to another shift' : undefined,
      cp365_isexpired: false,
      statecode: 0,
    }));

    openShifts.push({
      cp365_openshiftid: `open-${visit.cp365_visitid}`,
      assignmentType: 'visit',
      _cp365_visit_value: visit.cp365_visitid,
      assignmentDetails: {
        id: visit.cp365_visitid,
        type: 'visit',
        date: String(visit.cp365_visitdate).split('T')[0],
        startTime: visit.cp365_scheduledstarttime,
        endTime: visit.cp365_scheduledendtime,
        durationMinutes: visit.cp365_durationminutes,
        staffMemberId: null,
        locationId: '',
        locationName: ['Central', 'North', 'South', 'East', 'West'][index % 5] || 'Central',
        activityName: ['Morning Care', 'Lunch', 'Afternoon', 'Tea', 'Evening'][index] || 'Visit',
        serviceUserId: visit.cp365_serviceuserid,
        serviceUserName: data.serviceUsers.find(su => su.cp365_serviceuserid === visit.cp365_serviceuserid)?.cp365_fullname,
        status: 7, // Open
      },
      cp365_status: status,
      cp365_notificationscope: 'location',
      cp365_minimummatchscore: 70,
      cp365_expiresat: addHours(today, 24 - createdHoursAgo).toISOString(),
      cp365_createddate: addHours(today, -createdHoursAgo).toISOString(),
      cp365_filleddate: status === OpenShiftStatus.Filled ? addHours(today, -(createdHoursAgo - 2)).toISOString() : undefined,
      _cp365_filledby_value: status === OpenShiftStatus.Filled ? offers[0]._cp365_staffmember_value : undefined,
      filledByName: status === OpenShiftStatus.Filled ? offers[0].staffMemberName : undefined,
      cp365_offercount: offers.length,
      cp365_acceptedcount: offers.filter(o => o.cp365_offerstatus === OpenShiftOfferStatus.Accepted).length,
      cp365_declinedcount: offers.filter(o => o.cp365_offerstatus === OpenShiftOfferStatus.Declined).length,
      cp365_pendingcount: offers.filter(o => o.cp365_offerstatus === OpenShiftOfferStatus.Pending).length,
      offers,
      locationName: ['Central', 'North', 'South', 'East', 'West'][index % 5] || 'Central',
      statecode: 0,
    });
  });

  return openShifts;
}

export default function OpenShiftsDashboard() {
  const { isOpen, close, toggle } = useSideNav();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Modal states
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOpenShift, setSelectedOpenShift] = useState<OpenShift | null>(null);

  // Action handlers
  const handleResendOffers = (openShift: OpenShift) => {
    setSelectedOpenShift(openShift);
    setResendModalOpen(true);
  };

  const handleExtendExpiry = (openShift: OpenShift) => {
    setSelectedOpenShift(openShift);
    setExtendModalOpen(true);
  };

  const handleManuallyAssign = (openShift: OpenShift) => {
    setSelectedOpenShift(openShift);
    setAssignModalOpen(true);
  };

  const confirmResendOffers = async () => {
    if (!selectedOpenShift) return;
    // TODO: Implement API call to resend offers
    console.warn('Resending offers for:', selectedOpenShift.cp365_openshiftid);
    // In a real implementation, this would:
    // 1. Re-notify all pending candidates
    // 2. Optionally find new candidates
    // 3. Reset notification timestamps
    setResendModalOpen(false);
    setSelectedOpenShift(null);
    void refetch();
  };

  const confirmExtendExpiry = async (hours: number) => {
    if (!selectedOpenShift) return;
    // TODO: Implement API call to extend expiry
    console.warn('Extending expiry by', hours, 'hours for:', selectedOpenShift.cp365_openshiftid);
    // In a real implementation, this would:
    // 1. Update cp365_expiresat on the open shift record
    // 2. Notify candidates of extended deadline
    setExtendModalOpen(false);
    setSelectedOpenShift(null);
    void refetch();
  };

  const confirmManualAssign = async (staffMemberId: string) => {
    if (!selectedOpenShift) return;
    // TODO: Implement API call to manually assign
    console.warn('Manually assigning', staffMemberId, 'to:', selectedOpenShift.cp365_openshiftid);
    // In a real implementation, this would:
    // 1. Assign the staff member to the underlying shift/visit
    // 2. Update open shift status to Filled
    // 3. Cancel other pending offers
    // 4. Notify the assigned staff member
    setAssignModalOpen(false);
    setSelectedOpenShift(null);
    void refetch();
  };

  // Fetch data
  const { data: openShifts, isLoading, refetch } = useQuery({
    queryKey: ['openShifts'],
    queryFn: generateDummyOpenShifts,
    staleTime: 30000,
  });

  // Calculate summary
  const summary = useMemo<OpenShiftsSummary>(() => {
    if (!openShifts) {
      return {
        open: 0,
        filledToday: 0,
        expired: 0,
        byType: { shifts: 0, visits: 0 },
        expiringSoon: 0,
      };
    }

    const now = new Date();
    return {
      open: openShifts.filter(s => s.cp365_status === OpenShiftStatus.Open).length,
      filledToday: openShifts.filter(s => {
        if (s.cp365_status !== OpenShiftStatus.Filled || !s.cp365_filleddate) return false;
        const filledDate = parseISO(s.cp365_filleddate);
        return differenceInHours(now, filledDate) < 24;
      }).length,
      expired: openShifts.filter(s => s.cp365_status === OpenShiftStatus.Expired).length,
      byType: {
        shifts: openShifts.filter(s => s.assignmentType === 'shift').length,
        visits: openShifts.filter(s => s.assignmentType === 'visit').length,
      },
      expiringSoon: openShifts.filter(s => {
        if (s.cp365_status !== OpenShiftStatus.Open) return false;
        const expiresAt = parseISO(s.cp365_expiresat);
        return differenceInHours(expiresAt, now) < 24;
      }).length,
    };
  }, [openShifts]);

  // Filter data
  const filteredShifts = useMemo(() => {
    if (!openShifts) return [];
    
    switch (statusFilter) {
      case 'open':
        return openShifts.filter(s => s.cp365_status === OpenShiftStatus.Open);
      case 'filled':
        return openShifts.filter(s => s.cp365_status === OpenShiftStatus.Filled);
      case 'expired':
        return openShifts.filter(s => s.cp365_status === OpenShiftStatus.Expired);
      default:
        return openShifts;
    }
  }, [openShifts, statusFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <SideNav isOpen={isOpen} onClose={close} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Open Shifts"
          subtitle="Track and manage open shift notifications"
          onMenuClick={toggle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.open}</p>
                  <p className="text-sm text-slate-500">Currently Open</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.filledToday}</p>
                  <p className="text-sm text-slate-500">Filled Today</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  summary.expiringSoon > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${summary.expiringSoon > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {summary.expiringSoon}
                  </p>
                  <p className="text-sm text-slate-500">Expiring Soon</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.expired}</p>
                  <p className="text-sm text-slate-500">Expired</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="filled">Filled</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="ml-auto flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Open Shifts Table */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          )}

          {!isLoading && filteredShifts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No open shifts</h3>
              <p className="mt-1 text-sm text-slate-500">
                {statusFilter === 'all'
                  ? 'No shifts have been marked as open yet.'
                  : `No ${statusFilter} shifts found.`}
              </p>
            </div>
          )}

          {!isLoading && filteredShifts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-8 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Activity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Notified
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredShifts.map((openShift) => (
                    <>
                      <tr
                        key={openShift.cp365_openshiftid}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleExpanded(openShift.cp365_openshiftid)}
                      >
                        <td className="px-4 py-3">
                          {expandedId === openShift.cp365_openshiftid ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">
                              {openShift.assignmentDetails
                                ? format(parseISO(openShift.assignmentDetails.date), 'EEE d MMM')
                                : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {openShift.assignmentDetails?.startTime} - {openShift.assignmentDetails?.endTime}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {openShift.assignmentDetails?.activityName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {openShift.cp365_offercount}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getOpenShiftStatusColour(openShift.cp365_status)}`}>
                            {getOpenShiftStatusText(openShift.cp365_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {openShift.cp365_status === OpenShiftStatus.Open
                            ? formatTimeRemaining(openShift.cp365_expiresat)
                            : '-'}
                        </td>
                      </tr>

                      {/* Expanded details */}
                      {expandedId === openShift.cp365_openshiftid && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-6 py-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {openShift.assignmentDetails?.serviceUserName && (
                                    <>
                                      <User className="mr-1 inline h-4 w-4 text-slate-400" />
                                      {openShift.assignmentDetails.serviceUserName}
                                    </>
                                  )}
                                </p>
                                {openShift.locationName && (
                                  <p className="text-xs text-slate-500">
                                    <MapPin className="mr-1 inline h-3.5 w-3.5" />
                                    {openShift.locationName}
                                  </p>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                Notified {openShift.cp365_offercount} staff · 
                                {openShift.cp365_acceptedcount} accepted · 
                                {openShift.cp365_declinedcount} declined · 
                                {openShift.cp365_pendingcount} pending
                              </p>
                            </div>

                            <div className="space-y-2">
                              {openShift.offers?.map((offer) => (
                                <div
                                  key={offer.cp365_openshiftofferid}
                                  className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                      <User className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">
                                        {offer.staffMemberName}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {offer.staffMemberJobTitle}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      offer.cp365_matchscore >= 80
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : offer.cp365_matchscore >= 60
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {offer.cp365_matchscore}% match
                                    </span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getOfferStatusColour(offer.cp365_offerstatus)}`}>
                                      {getOfferStatusText(offer.cp365_offerstatus)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {format(parseISO(offer.cp365_offereddate), 'HH:mm')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {openShift.cp365_status === OpenShiftStatus.Open && (
                              <div className="mt-4 flex gap-2" role="group" aria-label="Open shift actions">
                                <button 
                                  onClick={() => handleResendOffers(openShift)}
                                  aria-label={`Resend offers for ${openShift.assignmentDetails?.activityName || 'this shift'}`}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Resend Offers
                                </button>
                                <button 
                                  onClick={() => handleExtendExpiry(openShift)}
                                  aria-label={`Extend expiry for ${openShift.assignmentDetails?.activityName || 'this shift'}`}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Extend Expiry
                                </button>
                                <button 
                                  onClick={() => handleManuallyAssign(openShift)}
                                  aria-label={`Manually assign staff to ${openShift.assignmentDetails?.activityName || 'this shift'}`}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                  Manually Assign
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Resend Offers Modal */}
      {resendModalOpen && selectedOpenShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-labelledby="resend-modal-title">
            <h2 id="resend-modal-title" className="text-lg font-semibold text-slate-900">Resend Offers</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will resend notifications to all staff who haven't yet responded to this open shift.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">
                {selectedOpenShift.assignmentDetails?.activityName || 'Shift'}
              </p>
              <p className="text-sm text-slate-600">
                {selectedOpenShift.assignmentDetails ? format(parseISO(selectedOpenShift.assignmentDetails.date), 'EEE d MMM') : ''} · {selectedOpenShift.assignmentDetails?.startTime} - {selectedOpenShift.assignmentDetails?.endTime}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedOpenShift.cp365_pendingcount || 0} pending responses
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setResendModalOpen(false);
                  setSelectedOpenShift(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmResendOffers}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Send Reminders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Expiry Modal */}
      {extendModalOpen && selectedOpenShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-labelledby="extend-modal-title">
            <h2 id="extend-modal-title" className="text-lg font-semibold text-slate-900">Extend Expiry</h2>
            <p className="mt-2 text-sm text-slate-600">
              How long would you like to extend the offer deadline?
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">
                {selectedOpenShift.assignmentDetails?.activityName || 'Shift'}
              </p>
              <p className="text-sm text-slate-600">
                Current expiry: {selectedOpenShift.cp365_expiresat ? formatTimeRemaining(selectedOpenShift.cp365_expiresat) : 'Unknown'}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[6, 12, 24].map((hours) => (
                <button
                  key={hours}
                  onClick={() => confirmExtendExpiry(hours)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                >
                  +{hours} hours
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setExtendModalOpen(false);
                  setSelectedOpenShift(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manually Assign Modal */}
      {assignModalOpen && selectedOpenShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-labelledby="assign-modal-title">
            <h2 id="assign-modal-title" className="text-lg font-semibold text-slate-900">Manually Assign Staff</h2>
            <p className="mt-2 text-sm text-slate-600">
              Select a staff member to assign to this shift.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">
                {selectedOpenShift.assignmentDetails?.activityName || 'Shift'}
              </p>
              <p className="text-sm text-slate-600">
                {selectedOpenShift.assignmentDetails ? format(parseISO(selectedOpenShift.assignmentDetails.date), 'EEE d MMM') : ''} · {selectedOpenShift.assignmentDetails?.startTime} - {selectedOpenShift.assignmentDetails?.endTime}
              </p>
            </div>
            <div className="mt-4 max-h-60 overflow-y-auto">
              <p className="mb-2 text-xs font-medium text-slate-500">Candidates who received offers:</p>
              <div className="space-y-2">
                {selectedOpenShift.offers?.map((offer) => (
                  <button
                    key={offer.cp365_openshiftofferid}
                    onClick={() => confirmManualAssign(offer._cp365_staffmember_value)}
                    disabled={offer.cp365_offerstatus === OpenShiftOfferStatus.Declined}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      offer.cp365_offerstatus === OpenShiftOfferStatus.Declined
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{offer.staffMemberName}</p>
                        <p className="text-xs text-slate-500">{offer.staffMemberJobTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        offer.cp365_matchscore >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : offer.cp365_matchscore >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {offer.cp365_matchscore}%
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getOfferStatusColour(offer.cp365_offerstatus)}`}>
                        {getOfferStatusText(offer.cp365_offerstatus)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedOpenShift(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
