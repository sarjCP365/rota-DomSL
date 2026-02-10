/**
 * Dummy Visit Repository
 *
 * In-memory implementation using generated dummy data for development and testing.
 */

import type { Visit, DateRange } from '@/types/domiciliary';
import { VisitStatus } from '@/types/domiciliary';
import type { VisitRepository } from '../visitRepository';
import { getDummyData } from '@/data/dummyDataGenerator';

export class DummyVisitRepository implements VisitRepository {
  private visits: Map<string, Visit> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const data = await getDummyData();
      for (const visit of data.visits) {
        this.visits.set(visit.cp365_visitid, visit);
      }
      this.initialized = true;
    }
  }

  async getAll(): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values());
  }

  async getById(id: string): Promise<Visit | null> {
    await this.ensureInitialized();
    return this.visits.get(id) || null;
  }

  async create(entity: Partial<Visit>): Promise<Visit> {
    await this.ensureInitialized();
    const newVisit = {
      ...entity,
      cp365_visitid: crypto.randomUUID(),
      createdon: new Date().toISOString(),
      modifiedon: new Date().toISOString(),
      statecode: 0,
    } as Visit;
    this.visits.set(newVisit.cp365_visitid, newVisit);
    return newVisit;
  }

  async update(id: string, entity: Partial<Visit>): Promise<Visit> {
    await this.ensureInitialized();
    const existing = this.visits.get(id);
    if (!existing) throw new Error('Visit not found');
    const updated = {
      ...existing,
      ...entity,
      cp365_visitid: id,
      modifiedon: new Date().toISOString(),
    };
    this.visits.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.visits.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(visit => {
      for (const key in filter) {
        if (visit[key as keyof Visit] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async getByServiceUser(serviceUserId: string, dateRange: DateRange): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(v =>
      v.cp365_serviceuserid === serviceUserId &&
      new Date(v.cp365_visitdate) >= dateRange.start &&
      new Date(v.cp365_visitdate) <= dateRange.end
    );
  }

  async getByStaffMember(staffMemberId: string, date: Date): Promise<Visit[]> {
    await this.ensureInitialized();
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.visits.values()).filter(v =>
      v.cp365_staffmemberid === staffMemberId &&
      v.cp365_visitdate === dateStr
    );
  }

  async getUnassigned(dateRange: DateRange): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(v =>
      !v.cp365_staffmemberid &&
      new Date(v.cp365_visitdate) >= dateRange.start &&
      new Date(v.cp365_visitdate) <= dateRange.end
    );
  }

  async getByRound(roundId: string): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values())
      .filter(v => v.cp365_roundid === roundId)
      .sort((a, b) => (a.cp365_sequenceorder || 0) - (b.cp365_sequenceorder || 0));
  }

  async getByLocation(locationId: string, dateRange: DateRange): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(v =>
      v.cp365_serviceuser?._cp365_location_value === locationId &&
      new Date(v.cp365_visitdate) >= dateRange.start &&
      new Date(v.cp365_visitdate) <= dateRange.end
    );
  }

  async getByStatus(status: number, dateRange: DateRange): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(v =>
      v.cp365_visitstatus === status &&
      new Date(v.cp365_visitdate) >= dateRange.start &&
      new Date(v.cp365_visitdate) <= dateRange.end
    );
  }

  async assignStaff(visitId: string, staffMemberId: string): Promise<Visit> {
    await this.ensureInitialized();
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('Visit not found');

    const updated = {
      ...visit,
      cp365_staffmemberid: staffMemberId,
      cp365_visitstatus: VisitStatus.Assigned,
      modifiedon: new Date().toISOString(),
    };
    this.visits.set(visitId, updated);
    return updated;
  }

  async unassignStaff(visitId: string): Promise<Visit> {
    await this.ensureInitialized();
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('Visit not found');

    const updated = {
      ...visit,
      cp365_staffmemberid: undefined,
      cp365_staffmember: undefined,
      cp365_visitstatus: VisitStatus.Scheduled,
      modifiedon: new Date().toISOString(),
    };
    this.visits.set(visitId, updated);
    return updated;
  }

  async cancelVisit(visitId: string, reason: string): Promise<Visit> {
    await this.ensureInitialized();
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('Visit not found');

    const updated = {
      ...visit,
      cp365_visitstatus: VisitStatus.Cancelled,
      cp365_cancellationreason: reason,
      modifiedon: new Date().toISOString(),
    };
    this.visits.set(visitId, updated);
    return updated;
  }

  async checkIn(visitId: string, latitude?: number, longitude?: number): Promise<Visit> {
    await this.ensureInitialized();
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('Visit not found');

    const now = new Date();
    const updated = {
      ...visit,
      cp365_visitstatus: VisitStatus.InProgress,
      cp365_checkintime: now.toISOString(),
      cp365_actualstarttime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      cp365_checkinlatitude: latitude,
      cp365_checkinlongitude: longitude,
      modifiedon: now.toISOString(),
    };
    this.visits.set(visitId, updated);
    return updated;
  }

  async checkOut(visitId: string, latitude?: number, longitude?: number): Promise<Visit> {
    await this.ensureInitialized();
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('Visit not found');

    const now = new Date();
    const updated = {
      ...visit,
      cp365_visitstatus: VisitStatus.Completed,
      cp365_checkouttime: now.toISOString(),
      cp365_actualendtime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      cp365_checkoutlatitude: latitude,
      cp365_checkoutlongitude: longitude,
      modifiedon: now.toISOString(),
    };
    this.visits.set(visitId, updated);
    return updated;
  }

  // Additional helper method
  async getByDateRange(dateRange: DateRange): Promise<Visit[]> {
    await this.ensureInitialized();
    return Array.from(this.visits.values()).filter(v =>
      new Date(v.cp365_visitdate) >= dateRange.start &&
      new Date(v.cp365_visitdate) <= dateRange.end
    );
  }
}
