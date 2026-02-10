/**
 * Dummy Staff Availability Repository
 *
 * In-memory implementation using generated dummy data for development and testing.
 */

import type { StaffAvailability } from '@/types/domiciliary';
import type { StaffAvailabilityRepository } from '../staffAvailabilityRepository';
import { getDummyData } from '@/data/dummyDataGenerator';

export class DummyStaffAvailabilityRepository implements StaffAvailabilityRepository {
  private availability: Map<string, StaffAvailability> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const data = await getDummyData();
      for (const avail of data.availability) {
        this.availability.set(avail.cp365_staffavailabilityid, avail);
      }
      this.initialized = true;
    }
  }

  async getAll(): Promise<StaffAvailability[]> {
    await this.ensureInitialized();
    return Array.from(this.availability.values());
  }

  async getById(id: string): Promise<StaffAvailability | null> {
    await this.ensureInitialized();
    return this.availability.get(id) || null;
  }

  async create(entity: Partial<StaffAvailability>): Promise<StaffAvailability> {
    await this.ensureInitialized();
    const newAvailability = {
      ...entity,
      cp365_staffavailabilityid: crypto.randomUUID(),
      statecode: 0,
    } as StaffAvailability;
    this.availability.set(newAvailability.cp365_staffavailabilityid, newAvailability);
    return newAvailability;
  }

  async update(id: string, entity: Partial<StaffAvailability>): Promise<StaffAvailability> {
    await this.ensureInitialized();
    const existing = this.availability.get(id);
    if (!existing) throw new Error('Staff availability not found');
    const updated = { ...existing, ...entity, cp365_staffavailabilityid: id };
    this.availability.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.availability.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<StaffAvailability[]> {
    await this.ensureInitialized();
    return Array.from(this.availability.values()).filter(avail => {
      for (const key in filter) {
        if (avail[key as keyof StaffAvailability] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async getByStaffMember(staffMemberId: string): Promise<StaffAvailability[]> {
    await this.ensureInitialized();
    return Array.from(this.availability.values()).filter(
      a => a.cp365_staffmemberid === staffMemberId && a.statecode === 0
    );
  }

  async getByDate(date: Date): Promise<StaffAvailability[]> {
    await this.ensureInitialized();
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday (0) to 7
    const dateStr = date.toISOString().split('T')[0];

    return Array.from(this.availability.values()).filter(a => {
      if (a.statecode !== 0) return false;

      // Check if it's a recurring pattern for this day of week
      if (a.cp365_isrecurring && a.cp365_dayofweek === dayOfWeek) {
        // Check if within effective date range
        if (a.cp365_effectivefrom && new Date(a.cp365_effectivefrom) > date) return false;
        if (a.cp365_effectiveto && new Date(a.cp365_effectiveto) < date) return false;
        return true;
      }

      // Check if it's a specific date availability
      if (a.cp365_specificdate === dateStr) {
        return true;
      }

      return false;
    });
  }

  async getByStaffMemberAndDate(staffMemberId: string, date: Date): Promise<StaffAvailability[]> {
    await this.ensureInitialized();
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    return Array.from(this.availability.values()).filter(a => {
      if (a.statecode !== 0) return false;
      if (a.cp365_staffmemberid !== staffMemberId) return false;

      // Check if it's a recurring pattern for this day of week
      if (a.cp365_isrecurring && a.cp365_dayofweek === dayOfWeek) {
        if (a.cp365_effectivefrom && new Date(a.cp365_effectivefrom) > date) return false;
        if (a.cp365_effectiveto && new Date(a.cp365_effectiveto) < date) return false;
        return true;
      }

      // Check if it's a specific date availability
      if (a.cp365_specificdate === dateStr) {
        return true;
      }

      return false;
    });
  }
}
