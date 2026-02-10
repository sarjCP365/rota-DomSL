/**
 * Dummy Service User Repository
 *
 * In-memory implementation using generated dummy data for development and testing.
 */

import type { DomiciliaryServiceUser } from '@/types/domiciliary';
import type { ServiceUserRepository } from '../serviceUserRepository';
import { getDummyData } from '@/data/dummyDataGenerator';

export class DummyServiceUserRepository implements ServiceUserRepository {
  private serviceUsers: Map<string, DomiciliaryServiceUser> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const data = await getDummyData();
      for (const su of data.serviceUsers) {
        this.serviceUsers.set(su.cp365_serviceuserid, su);
      }
      this.initialized = true;
    }
  }

  async getAll(): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    return Array.from(this.serviceUsers.values());
  }

  async getById(id: string): Promise<DomiciliaryServiceUser | null> {
    await this.ensureInitialized();
    return this.serviceUsers.get(id) || null;
  }

  async create(entity: Partial<DomiciliaryServiceUser>): Promise<DomiciliaryServiceUser> {
    await this.ensureInitialized();
    const newServiceUser = {
      ...entity,
      cp365_serviceuserid: crypto.randomUUID(),
      statecode: 0,
    } as DomiciliaryServiceUser;
    this.serviceUsers.set(newServiceUser.cp365_serviceuserid, newServiceUser);
    return newServiceUser;
  }

  async update(id: string, entity: Partial<DomiciliaryServiceUser>): Promise<DomiciliaryServiceUser> {
    await this.ensureInitialized();
    const existing = this.serviceUsers.get(id);
    if (!existing) throw new Error('Service user not found');
    const updated = { ...existing, ...entity, cp365_serviceuserid: id };
    this.serviceUsers.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.serviceUsers.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    return Array.from(this.serviceUsers.values()).filter(su => {
      for (const key in filter) {
        if (su[key as keyof DomiciliaryServiceUser] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async getActive(): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    return Array.from(this.serviceUsers.values()).filter(su => su.statecode === 0);
  }

  async getByLocation(locationId: string): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    return Array.from(this.serviceUsers.values()).filter(
      su => su._cp365_location_value === locationId && su.statecode === 0
    );
  }

  async getByPostcode(postcodePrefix: string): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    return Array.from(this.serviceUsers.values()).filter(
      su => su.cp365_postcode?.startsWith(postcodePrefix) && su.statecode === 0
    );
  }

  async searchByName(searchTerm: string): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    const term = searchTerm.toLowerCase();
    return Array.from(this.serviceUsers.values()).filter(
      su =>
        su.statecode === 0 &&
        (su.cp365_fullname.toLowerCase().includes(term) ||
          su.cp365_preferredname?.toLowerCase().includes(term) ||
          su.cp365_currentaddress.toLowerCase().includes(term) ||
          su.cp365_postcode?.toLowerCase().includes(term))
    );
  }

  async getWithinRadius(
    latitude: number,
    longitude: number,
    radiusMiles: number
  ): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();

    // Haversine formula to calculate distance
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3959; // Earth's radius in miles

    return Array.from(this.serviceUsers.values()).filter(su => {
      if (su.statecode !== 0) return false;
      if (!su.cp365_latitude || !su.cp365_longitude) return false;

      const dLat = toRad(su.cp365_latitude - latitude);
      const dLng = toRad(su.cp365_longitude - longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(latitude)) *
          Math.cos(toRad(su.cp365_latitude)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radiusMiles;
    });
  }

  async getWithUnassignedVisits(_startDate: Date, _endDate: Date): Promise<DomiciliaryServiceUser[]> {
    await this.ensureInitialized();
    // This would normally query visits, but for dummy data we'll return all active service users
    // In a real implementation, this would join with the visits table
    console.warn('DummyServiceUserRepository.getWithUnassignedVisits: Returning all active service users');
    return Array.from(this.serviceUsers.values()).filter(su => su.statecode === 0);
  }
}
