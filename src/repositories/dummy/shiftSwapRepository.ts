/**
 * Dummy Shift Swap Repository
 *
 * In-memory implementation for development and testing.
 * Generates realistic swap data and simulates approval workflows.
 */

import type { ShiftSwapRepository } from '../shiftSwapRepository';
import type {
  ShiftSwap,
  CreateSwapRequest,
  SwapApprovalResult,
  PendingSwapsFilter,
  PendingSwapsSummary,
  StaffSwapUsage,
  SwapAssignmentSummary,
} from '@/types/shiftSwap';
import { ShiftSwapStatus, getSwapStatusLabel } from '@/types/shiftSwap';
import type { DateRange } from '@/types/domiciliary';
import { getDummyData } from '@/data/dummyDataGenerator';
import { getSwapConfiguration } from '@/services/configurationService';
import { addDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';

// =============================================================================
// DUMMY DATA GENERATION
// =============================================================================

interface DummySwapData {
  swaps: Map<string, ShiftSwap>;
  initialized: boolean;
}

const dummyData: DummySwapData = {
  swaps: new Map(),
  initialized: false,
};

/**
 * Generate mock shift data for shift swaps
 * These represent residential care shifts (not domiciliary visits)
 */
function generateMockShifts(staffMembers: Record<string, unknown>[], today: Date): SwapAssignmentSummary[] {
  const shiftTypes = [
    { name: 'Early Shift', start: '07:00', end: '15:00', duration: 480 },
    { name: 'Late Shift', start: '14:00', end: '22:00', duration: 480 },
    { name: 'Long Day', start: '07:00', end: '19:30', duration: 750 },
    { name: 'Night Shift', start: '21:30', end: '07:30', duration: 600 },
    { name: 'Twilight Shift', start: '17:00', end: '22:00', duration: 300 },
  ];

  const locations = ['Oak House', 'Maple Lodge', 'Willow Court', 'Cedar View'];
  const shifts: SwapAssignmentSummary[] = [];

  // Generate shifts for the next 14 days
  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const shiftDate = addDays(today, dayOffset);
    const dateStr = format(shiftDate, 'yyyy-MM-dd');

    // Generate 2-3 shifts per day
    const numShifts = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numShifts; i++) {
      const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      shifts.push({
        id: crypto.randomUUID(),
        type: 'shift',
        date: dateStr,
        startTime: shiftType.start,
        endTime: shiftType.end,
        durationMinutes: shiftType.duration,
        activityName: shiftType.name,
        locationName: location,
      });
    }
  }

  return shifts;
}

/**
 * Ensure dummy data is initialised
 */
async function ensureInitialized(): Promise<void> {
  if (dummyData.initialized) return;

  const data = await getDummyData();
  const today = new Date();

  // Create some sample swap requests
  const staffMembers = data.staffMembers.slice(0, 8);
  const visits = data.visits.filter(v => {
    const visitDate = new Date(v.cp365_visitdate);
    return visitDate >= today && visitDate <= addDays(today, 14);
  });

  // Generate mock shifts for shift swaps
  const mockShifts = generateMockShifts(staffMembers, today);

  if (staffMembers.length >= 4 && visits.length >= 4) {
    // =========================================================================
    // VISIT SWAPS (Domiciliary)
    // =========================================================================

    // Visit Swap 1: Awaiting manager approval (urgent)
    const visitSwap1: ShiftSwap = {
      cp365_swaprequestid: crypto.randomUUID(),
      cp365_name: `${staffMembers[0].cp365_staffmembername} ⇄ ${staffMembers[1].cp365_staffmembername}`,
      _cp365_requestfrom_value: staffMembers[0].cp365_staffmemberid,
      requestFromName: staffMembers[0].cp365_staffmembername,
      requestFromJobTitle: staffMembers[0].cp365_jobtitle || 'Carer',
      _cp365_requestto_value: staffMembers[1].cp365_staffmemberid,
      requestToName: staffMembers[1].cp365_staffmembername,
      requestToJobTitle: staffMembers[1].cp365_jobtitle || 'Carer',
      assignmentType: 'visit',
      _cp365_originalvisit_value: visits[0]?.cp365_visitid,
      originalVisitDetails: visitToSummary(visits[0]),
      _cp365_requestedvisit_value: visits[1]?.cp365_visitid,
      requestedVisitDetails: visitToSummary(visits[1]),
      cp365_requeststatus: ShiftSwapStatus.AwaitingManagerApproval,
      swapStatusLabel: 'AwaitingManagerApproval',
      cp365_advancenoticebreached: true,
      cp365_notesfrominitiator: 'Medical appointment on this day, would really appreciate the swap.',
      cp365_notesfromrecipient: 'Happy to help!',
      createdon: addDays(today, -2).toISOString(),
      cp365_recipientrespondeddate: addDays(today, -1).toISOString(),
      _cp365_rota_value: 'dummy-rota-1',
      locationName: 'Central Location',
      statecode: 0,
    };
    dummyData.swaps.set(visitSwap1.cp365_swaprequestid, visitSwap1);

    // Visit Swap 2: Awaiting recipient
    if (visits.length >= 8) {
      const visitSwap2: ShiftSwap = {
        cp365_swaprequestid: crypto.randomUUID(),
        cp365_name: `${staffMembers[4].cp365_staffmembername} ⇄ ${staffMembers[5].cp365_staffmembername}`,
        _cp365_requestfrom_value: staffMembers[4].cp365_staffmemberid,
        requestFromName: staffMembers[4].cp365_staffmembername,
        requestFromJobTitle: staffMembers[4].cp365_jobtitle || 'Carer',
        _cp365_requestto_value: staffMembers[5].cp365_staffmemberid,
        requestToName: staffMembers[5].cp365_staffmembername,
        requestToJobTitle: staffMembers[5].cp365_jobtitle || 'Carer',
        assignmentType: 'visit',
        _cp365_originalvisit_value: visits[6]?.cp365_visitid,
        originalVisitDetails: visitToSummary(visits[6]),
        _cp365_requestedvisit_value: visits[7]?.cp365_visitid,
        requestedVisitDetails: visitToSummary(visits[7]),
        cp365_requeststatus: ShiftSwapStatus.AwaitingRecipient,
        swapStatusLabel: 'AwaitingRecipient',
        cp365_advancenoticebreached: false,
        cp365_notesfrominitiator: 'Would prefer afternoon visits this week.',
        createdon: addDays(today, -1).toISOString(),
        _cp365_rota_value: 'dummy-rota-1',
        locationName: 'Central Location',
        statecode: 0,
      };
      dummyData.swaps.set(visitSwap2.cp365_swaprequestid, visitSwap2);
    }

    // =========================================================================
    // SHIFT SWAPS (Residential)
    // =========================================================================

    if (mockShifts.length >= 8 && staffMembers.length >= 8) {
      // Shift Swap 1: Awaiting manager approval (urgent) - Early/Late swap
      const shiftSwap1: ShiftSwap = {
        cp365_swaprequestid: crypto.randomUUID(),
        cp365_name: `${staffMembers[2].cp365_staffmembername} ⇄ ${staffMembers[3].cp365_staffmembername}`,
        _cp365_requestfrom_value: staffMembers[2].cp365_staffmemberid,
        requestFromName: staffMembers[2].cp365_staffmembername,
        requestFromJobTitle: staffMembers[2].cp365_jobtitle || 'Senior Carer',
        _cp365_requestto_value: staffMembers[3].cp365_staffmemberid,
        requestToName: staffMembers[3].cp365_staffmembername,
        requestToJobTitle: staffMembers[3].cp365_jobtitle || 'Support Worker',
        assignmentType: 'shift',
        _cp365_originalshift_value: mockShifts[0].id,
        originalShiftDetails: mockShifts[0],
        _cp365_requestedshift_value: mockShifts[1].id,
        requestedShiftDetails: mockShifts[1],
        cp365_requeststatus: ShiftSwapStatus.AwaitingManagerApproval,
        swapStatusLabel: 'AwaitingManagerApproval',
        cp365_advancenoticebreached: true,
        cp365_notesfrominitiator: 'Childcare issues - need to do school drop-off that day.',
        cp365_notesfromrecipient: 'No problem, I can cover.',
        createdon: addDays(today, -1).toISOString(),
        cp365_recipientrespondeddate: addDays(today, -0.5).toISOString(),
        _cp365_rota_value: 'dummy-rota-2',
        locationName: mockShifts[0].locationName,
        statecode: 0,
      };
      dummyData.swaps.set(shiftSwap1.cp365_swaprequestid, shiftSwap1);

      // Shift Swap 2: Awaiting manager approval (not urgent) - Night shift swap
      const shiftSwap2: ShiftSwap = {
        cp365_swaprequestid: crypto.randomUUID(),
        cp365_name: `${staffMembers[6].cp365_staffmembername} ⇄ ${staffMembers[7].cp365_staffmembername}`,
        _cp365_requestfrom_value: staffMembers[6].cp365_staffmemberid,
        requestFromName: staffMembers[6].cp365_staffmembername,
        requestFromJobTitle: staffMembers[6].cp365_jobtitle || 'Night Carer',
        _cp365_requestto_value: staffMembers[7].cp365_staffmemberid,
        requestToName: staffMembers[7].cp365_staffmembername,
        requestToJobTitle: staffMembers[7].cp365_jobtitle || 'Support Worker',
        assignmentType: 'shift',
        _cp365_originalshift_value: mockShifts[4].id,
        originalShiftDetails: mockShifts[4],
        _cp365_requestedshift_value: mockShifts[5].id,
        requestedShiftDetails: mockShifts[5],
        cp365_requeststatus: ShiftSwapStatus.AwaitingManagerApproval,
        swapStatusLabel: 'AwaitingManagerApproval',
        cp365_advancenoticebreached: false,
        cp365_notesfrominitiator: 'Anniversary dinner - would prefer a day shift that week.',
        cp365_notesfromrecipient: 'Works better for me anyway!',
        createdon: addDays(today, -4).toISOString(),
        cp365_recipientrespondeddate: addDays(today, -3).toISOString(),
        _cp365_rota_value: 'dummy-rota-2',
        locationName: mockShifts[4].locationName,
        statecode: 0,
      };
      dummyData.swaps.set(shiftSwap2.cp365_swaprequestid, shiftSwap2);

      // Shift Swap 3: Awaiting recipient - Long day swap
      if (mockShifts.length >= 10) {
        const shiftSwap3: ShiftSwap = {
          cp365_swaprequestid: crypto.randomUUID(),
          cp365_name: `${staffMembers[1].cp365_staffmembername} ⇄ ${staffMembers[4].cp365_staffmembername}`,
          _cp365_requestfrom_value: staffMembers[1].cp365_staffmemberid,
          requestFromName: staffMembers[1].cp365_staffmembername,
          requestFromJobTitle: staffMembers[1].cp365_jobtitle || 'Carer',
          _cp365_requestto_value: staffMembers[4].cp365_staffmemberid,
          requestToName: staffMembers[4].cp365_staffmembername,
          requestToJobTitle: staffMembers[4].cp365_jobtitle || 'Senior Carer',
          assignmentType: 'shift',
          _cp365_originalshift_value: mockShifts[8].id,
          originalShiftDetails: mockShifts[8],
          _cp365_requestedshift_value: mockShifts[9].id,
          requestedShiftDetails: mockShifts[9],
          cp365_requeststatus: ShiftSwapStatus.AwaitingRecipient,
          swapStatusLabel: 'AwaitingRecipient',
          cp365_advancenoticebreached: false,
          cp365_notesfrominitiator: 'Training course booked for that day - can we swap?',
          createdon: addDays(today, -0.5).toISOString(),
          _cp365_rota_value: 'dummy-rota-2',
          locationName: mockShifts[8].locationName,
          statecode: 0,
        };
        dummyData.swaps.set(shiftSwap3.cp365_swaprequestid, shiftSwap3);
      }
    }
  }

  dummyData.initialized = true;
  const shiftSwaps = Array.from(dummyData.swaps.values()).filter(s => s.assignmentType === 'shift').length;
  const visitSwaps = Array.from(dummyData.swaps.values()).filter(s => s.assignmentType === 'visit').length;
  console.warn(`📋 Generated ${dummyData.swaps.size} dummy swap requests (${shiftSwaps} shifts, ${visitSwaps} visits)`);
}

/**
 * Convert a visit to a summary for swap display
 */
function visitToSummary(visit: Record<string, unknown> | undefined): SwapAssignmentSummary | undefined {
  if (!visit) return undefined;
  const visitDate = visit.cp365_visitdate as string;
  const dateStr = typeof visitDate === 'string'
    ? visitDate.split('T')[0]
    : String(visitDate).split('T')[0];
  return {
    id: visit.cp365_visitid as string,
    type: 'visit',
    date: dateStr,
    startTime: visit.cp365_scheduledstarttime as string,
    endTime: visit.cp365_scheduledendtime as string,
    durationMinutes: visit.cp365_durationminutes as number,
    activityName: getVisitTypeName(visit.cp365_visittypecode as number),
    serviceUserName: (visit.cp365_serviceuser as Record<string, string>)?.cp365_fullname,
  };
}

function getVisitTypeName(code: number): string {
  const names: Record<number, string> = {
    1: 'Morning Care', 2: 'Lunch', 3: 'Afternoon', 4: 'Tea',
    5: 'Evening', 6: 'Bedtime', 7: 'Night', 8: 'Waking Night',
  };
  return names[code] || 'Visit';
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export class DummyShiftSwapRepository implements ShiftSwapRepository {
  // Base Repository methods
  async getAll(): Promise<ShiftSwap[]> {
    await ensureInitialized();
    return Array.from(dummyData.swaps.values());
  }

  async getById(id: string): Promise<ShiftSwap | null> {
    await ensureInitialized();
    return dummyData.swaps.get(id) || null;
  }

  async create(entity: Partial<ShiftSwap>): Promise<ShiftSwap> {
    await ensureInitialized();
    const swap: ShiftSwap = {
      cp365_swaprequestid: crypto.randomUUID(),
      cp365_name: entity.cp365_name || 'New Swap Request',
      _cp365_requestfrom_value: entity._cp365_requestfrom_value || '',
      _cp365_requestto_value: entity._cp365_requestto_value || '',
      assignmentType: entity.assignmentType || 'shift',
      cp365_requeststatus: ShiftSwapStatus.AwaitingRecipient,
      swapStatusLabel: 'AwaitingRecipient',
      createdon: new Date().toISOString(),
      _cp365_rota_value: entity._cp365_rota_value || '',
      statecode: 0,
      ...entity,
    } as ShiftSwap;
    dummyData.swaps.set(swap.cp365_swaprequestid, swap);
    return swap;
  }

  async update(id: string, entity: Partial<ShiftSwap>): Promise<ShiftSwap> {
    await ensureInitialized();
    const existing = dummyData.swaps.get(id);
    if (!existing) {
      throw new Error(`Swap not found: ${id}`);
    }
    const updated = { ...existing, ...entity };
    dummyData.swaps.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await ensureInitialized();
    dummyData.swaps.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<ShiftSwap[]> {
    await ensureInitialized();
    let results = Array.from(dummyData.swaps.values());

    if (filter.status) {
      const statusArray = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(s => statusArray.includes(s.cp365_requeststatus));
    }

    if (filter.locationId) {
      results = results.filter(s => s._cp365_location_value === filter.locationId);
    }

    return results;
  }

  // Extended methods
  async getPendingForLocation(locationId: string, filter?: PendingSwapsFilter): Promise<ShiftSwap[]> {
    await ensureInitialized();
    let results = Array.from(dummyData.swaps.values());

    // Filter by active state
    results = results.filter(s => s.statecode === 0);

    // Filter by status if specified
    if (filter?.status && filter.status.length > 0) {
      results = results.filter(s => filter.status!.includes(s.cp365_requeststatus));
    } else {
      // Default to pending statuses
      results = results.filter(s =>
        s.cp365_requeststatus === ShiftSwapStatus.AwaitingRecipient ||
        s.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval
      );
    }

    // Filter by advance notice breached
    if (filter?.advanceNoticeBreachedOnly) {
      results = results.filter(s => s.cp365_advancenoticebreached);
    }

    // Filter by assignment type
    if (filter?.assignmentType) {
      results = results.filter(s => s.assignmentType === filter.assignmentType);
    }

    // Sort: urgent first, then by creation date
    results.sort((a, b) => {
      if (a.cp365_advancenoticebreached && !b.cp365_advancenoticebreached) return -1;
      if (!a.cp365_advancenoticebreached && b.cp365_advancenoticebreached) return 1;
      return new Date(a.createdon).getTime() - new Date(b.createdon).getTime();
    });

    return results;
  }

  async getByStaffMember(staffMemberId: string, dateRange?: DateRange): Promise<ShiftSwap[]> {
    await ensureInitialized();
    let results = Array.from(dummyData.swaps.values()).filter(
      s => s._cp365_requestfrom_value === staffMemberId || s._cp365_requestto_value === staffMemberId
    );

    if (dateRange) {
      const start = parseISO(dateRange.start.toISOString().split('T')[0]);
      const end = parseISO(dateRange.end.toISOString().split('T')[0]);
      results = results.filter(s => {
        const createdDate = parseISO(s.createdon.split('T')[0]);
        return isWithinInterval(createdDate, { start, end });
      });
    }

    return results;
  }

  async getAwaitingApproval(_locationId?: string): Promise<ShiftSwap[]> {
    await ensureInitialized();
    return Array.from(dummyData.swaps.values()).filter(
      s => s.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval && s.statecode === 0
    );
  }

  async getPendingSummary(_locationId?: string): Promise<PendingSwapsSummary> {
    await ensureInitialized();
    const allSwaps = Array.from(dummyData.swaps.values()).filter(s => s.statecode === 0);

    const awaitingApproval = allSwaps.filter(
      s => s.cp365_requeststatus === ShiftSwapStatus.AwaitingManagerApproval
    );

    const today = new Date();
    const weekEnd = addDays(today, 7);
    const monthEnd = endOfMonth(today);

    return {
      awaitingApproval: awaitingApproval.length,
      advanceNoticeBreached: awaitingApproval.filter(s => s.cp365_advancenoticebreached).length,
      thisWeek: allSwaps.filter(s => {
        const details = s.originalVisitDetails || s.originalShiftDetails;
        if (!details) return false;
        const assignmentDate = parseISO(details.date);
        return assignmentDate >= today && assignmentDate <= weekEnd;
      }).length,
      thisMonth: allSwaps.filter(s => {
        const details = s.originalVisitDetails || s.originalShiftDetails;
        if (!details) return false;
        const assignmentDate = parseISO(details.date);
        return assignmentDate >= today && assignmentDate <= monthEnd;
      }).length,
      byType: {
        shifts: allSwaps.filter(s => s.assignmentType === 'shift').length,
        visits: allSwaps.filter(s => s.assignmentType === 'visit').length,
      },
    };
  }

  async getStaffSwapUsage(staffMemberId: string): Promise<StaffSwapUsage> {
    await ensureInitialized();
    const config = await getSwapConfiguration();
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const swapsThisMonth = Array.from(dummyData.swaps.values()).filter(s => {
      const isInvolved = s._cp365_requestfrom_value === staffMemberId;
      const createdDate = parseISO(s.createdon);
      const inMonth = isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      const countable = [
        ShiftSwapStatus.AwaitingRecipient,
        ShiftSwapStatus.AwaitingManagerApproval,
        ShiftSwapStatus.Approved,
      ].includes(s.cp365_requeststatus);
      return isInvolved && inMonth && countable;
    }).length;

    const data = await getDummyData();
    const staff = data.staffMembers.find(s => s.cp365_staffmemberid === staffMemberId);

    return {
      staffMemberId,
      staffName: staff?.cp365_staffmembername || 'Unknown',
      swapsThisMonth,
      monthlyLimit: config.monthlyLimitPerStaff as number,
      limitReached: swapsThisMonth >= (config.monthlyLimitPerStaff as number),
    };
  }

  async createSwapRequest(request: CreateSwapRequest): Promise<ShiftSwap> {
    await ensureInitialized();
    const data = await getDummyData();

    const initiator = data.staffMembers.find(s => s.cp365_staffmemberid === request.initiatorStaffId);
    const recipient = data.staffMembers.find(s => s.cp365_staffmemberid === request.recipientStaffId);

    const swap: ShiftSwap = {
      cp365_swaprequestid: crypto.randomUUID(),
      cp365_name: `${initiator?.cp365_staffmembername || 'Unknown'} ⇄ ${recipient?.cp365_staffmembername || 'Unknown'}`,
      _cp365_requestfrom_value: request.initiatorStaffId,
      requestFromName: initiator?.cp365_staffmembername,
      requestFromJobTitle: initiator?.cp365_jobtitle || undefined,
      _cp365_requestto_value: request.recipientStaffId,
      requestToName: recipient?.cp365_staffmembername,
      requestToJobTitle: recipient?.cp365_jobtitle || undefined,
      assignmentType: request.initiatorAssignment.type,
      cp365_requeststatus: ShiftSwapStatus.AwaitingRecipient,
      swapStatusLabel: 'AwaitingRecipient',
      cp365_notesfrominitiator: request.notes,
      createdon: new Date().toISOString(),
      _cp365_rota_value: 'dummy-rota-1',
      locationName: request.initiatorAssignment.locationName,
      statecode: 0,
    };

    // Set assignment-specific fields
    if (request.initiatorAssignment.type === 'visit') {
      swap._cp365_originalvisit_value = request.initiatorAssignment.id;
      swap.originalVisitDetails = {
        id: request.initiatorAssignment.id,
        type: 'visit',
        date: request.initiatorAssignment.date,
        startTime: request.initiatorAssignment.startTime,
        endTime: request.initiatorAssignment.endTime,
        durationMinutes: request.initiatorAssignment.durationMinutes,
        activityName: request.initiatorAssignment.activityName,
        serviceUserName: request.initiatorAssignment.serviceUserName,
      };
      swap._cp365_requestedvisit_value = request.recipientAssignment.id;
      swap.requestedVisitDetails = {
        id: request.recipientAssignment.id,
        type: 'visit',
        date: request.recipientAssignment.date,
        startTime: request.recipientAssignment.startTime,
        endTime: request.recipientAssignment.endTime,
        durationMinutes: request.recipientAssignment.durationMinutes,
        activityName: request.recipientAssignment.activityName,
        serviceUserName: request.recipientAssignment.serviceUserName,
      };
    } else {
      swap._cp365_originalshift_value = request.initiatorAssignment.id;
      swap.originalShiftDetails = {
        id: request.initiatorAssignment.id,
        type: 'shift',
        date: request.initiatorAssignment.date,
        startTime: request.initiatorAssignment.startTime,
        endTime: request.initiatorAssignment.endTime,
        durationMinutes: request.initiatorAssignment.durationMinutes,
        activityName: request.initiatorAssignment.activityName,
        locationName: request.initiatorAssignment.locationName,
      };
      swap._cp365_requestedshift_value = request.recipientAssignment.id;
      swap.requestedShiftDetails = {
        id: request.recipientAssignment.id,
        type: 'shift',
        date: request.recipientAssignment.date,
        startTime: request.recipientAssignment.startTime,
        endTime: request.recipientAssignment.endTime,
        durationMinutes: request.recipientAssignment.durationMinutes,
        activityName: request.recipientAssignment.activityName,
        locationName: request.recipientAssignment.locationName,
      };
    }

    // Check advance notice
    const config = await getSwapConfiguration();
    const assignmentDate = parseISO(request.initiatorAssignment.date);
    const daysUntil = Math.floor((assignmentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    swap.cp365_advancenoticebreached = daysUntil < config.advanceNoticeDays;

    dummyData.swaps.set(swap.cp365_swaprequestid, swap);
    console.warn(`📋 Created swap request: ${swap.cp365_name}`);

    return swap;
  }

  async approve(swapId: string, managerNotes?: string): Promise<SwapApprovalResult> {
    await ensureInitialized();
    const swap = dummyData.swaps.get(swapId);

    if (!swap) {
      return { success: false, error: 'Swap not found', swapId, newStatus: ShiftSwapStatus.AwaitingManagerApproval };
    }

    if (swap.cp365_requeststatus !== ShiftSwapStatus.AwaitingManagerApproval) {
      return { success: false, error: 'Swap is not awaiting approval', swapId, newStatus: swap.cp365_requeststatus };
    }

    swap.cp365_requeststatus = ShiftSwapStatus.Approved;
    swap.swapStatusLabel = getSwapStatusLabel(ShiftSwapStatus.Approved);
    swap.cp365_managernotes = managerNotes;
    swap.cp365_approveddate = new Date().toISOString();
    swap.cp365_completeddate = new Date().toISOString();

    console.warn(`✅ Approved swap: ${swap.cp365_name}`);

    return { success: true, swapId, newStatus: ShiftSwapStatus.Approved };
  }

  async reject(swapId: string, managerNotes: string): Promise<SwapApprovalResult> {
    await ensureInitialized();
    const swap = dummyData.swaps.get(swapId);

    if (!swap) {
      return { success: false, error: 'Swap not found', swapId, newStatus: ShiftSwapStatus.AwaitingManagerApproval };
    }

    if (swap.cp365_requeststatus !== ShiftSwapStatus.AwaitingManagerApproval) {
      return { success: false, error: 'Swap is not awaiting approval', swapId, newStatus: swap.cp365_requeststatus };
    }

    swap.cp365_requeststatus = ShiftSwapStatus.RejectedByManager;
    swap.swapStatusLabel = getSwapStatusLabel(ShiftSwapStatus.RejectedByManager);
    swap.cp365_managernotes = managerNotes;

    console.warn(`❌ Rejected swap: ${swap.cp365_name}`);

    return { success: true, swapId, newStatus: ShiftSwapStatus.RejectedByManager };
  }

  async cancel(swapId: string, reason?: string): Promise<SwapApprovalResult> {
    await ensureInitialized();
    const swap = dummyData.swaps.get(swapId);

    if (!swap) {
      return { success: false, error: 'Swap not found', swapId, newStatus: ShiftSwapStatus.Cancelled };
    }

    swap.cp365_requeststatus = ShiftSwapStatus.Cancelled;
    swap.swapStatusLabel = getSwapStatusLabel(ShiftSwapStatus.Cancelled);
    if (reason) {
      swap.cp365_notesfrominitiator = (swap.cp365_notesfrominitiator || '') + ` [Cancelled: ${reason}]`;
    }

    console.warn(`🚫 Cancelled swap: ${swap.cp365_name}`);

    return { success: true, swapId, newStatus: ShiftSwapStatus.Cancelled };
  }

  async acceptAsRecipient(swapId: string, notes?: string): Promise<SwapApprovalResult> {
    await ensureInitialized();
    const swap = dummyData.swaps.get(swapId);

    if (!swap) {
      return { success: false, error: 'Swap not found', swapId, newStatus: ShiftSwapStatus.AwaitingRecipient };
    }

    if (swap.cp365_requeststatus !== ShiftSwapStatus.AwaitingRecipient) {
      return { success: false, error: 'Swap is not awaiting recipient response', swapId, newStatus: swap.cp365_requeststatus };
    }

    swap.cp365_requeststatus = ShiftSwapStatus.AwaitingManagerApproval;
    swap.swapStatusLabel = getSwapStatusLabel(ShiftSwapStatus.AwaitingManagerApproval);
    swap.cp365_notesfromrecipient = notes;
    swap.cp365_recipientrespondeddate = new Date().toISOString();

    console.warn(`👍 Recipient accepted swap: ${swap.cp365_name}`);

    return { success: true, swapId, newStatus: ShiftSwapStatus.AwaitingManagerApproval };
  }

  async declineAsRecipient(swapId: string, reason: string): Promise<SwapApprovalResult> {
    await ensureInitialized();
    const swap = dummyData.swaps.get(swapId);

    if (!swap) {
      return { success: false, error: 'Swap not found', swapId, newStatus: ShiftSwapStatus.RejectedByRecipient };
    }

    if (swap.cp365_requeststatus !== ShiftSwapStatus.AwaitingRecipient) {
      return { success: false, error: 'Swap is not awaiting recipient response', swapId, newStatus: swap.cp365_requeststatus };
    }

    swap.cp365_requeststatus = ShiftSwapStatus.RejectedByRecipient;
    swap.swapStatusLabel = getSwapStatusLabel(ShiftSwapStatus.RejectedByRecipient);
    swap.cp365_notesfromrecipient = reason;
    swap.cp365_recipientrespondeddate = new Date().toISOString();

    console.warn(`👎 Recipient declined swap: ${swap.cp365_name}`);

    return { success: true, swapId, newStatus: ShiftSwapStatus.RejectedByRecipient };
  }
}
