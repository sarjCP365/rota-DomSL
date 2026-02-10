/**
 * Dummy Service User Staff Relationship Repository
 *
 * In-memory implementation using generated dummy data for development and testing.
 */

import type { ServiceUserStaffRelationship } from '@/types/domiciliary';
import type { ServiceUserStaffRelationshipRepository } from '../serviceUserStaffRelationshipRepository';
import { getDummyData } from '@/data/dummyDataGenerator';

export class DummyServiceUserStaffRelationshipRepository implements ServiceUserStaffRelationshipRepository {
  private relationships: Map<string, ServiceUserStaffRelationship> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const data = await getDummyData();
      for (const rel of data.relationships) {
        this.relationships.set(rel.cp365_relationshipid, rel);
      }
      this.initialized = true;
    }
  }

  async getAll(): Promise<ServiceUserStaffRelationship[]> {
    await this.ensureInitialized();
    return Array.from(this.relationships.values());
  }

  async getById(id: string): Promise<ServiceUserStaffRelationship | null> {
    await this.ensureInitialized();
    return this.relationships.get(id) || null;
  }

  async create(entity: Partial<ServiceUserStaffRelationship>): Promise<ServiceUserStaffRelationship> {
    await this.ensureInitialized();
    const newRelationship = {
      ...entity,
      cp365_relationshipid: crypto.randomUUID(),
      statecode: 0,
    } as ServiceUserStaffRelationship;
    this.relationships.set(newRelationship.cp365_relationshipid, newRelationship);
    return newRelationship;
  }

  async update(id: string, entity: Partial<ServiceUserStaffRelationship>): Promise<ServiceUserStaffRelationship> {
    await this.ensureInitialized();
    const existing = this.relationships.get(id);
    if (!existing) throw new Error('Relationship not found');
    const updated = { ...existing, ...entity, cp365_relationshipid: id };
    this.relationships.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.relationships.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<ServiceUserStaffRelationship[]> {
    await this.ensureInitialized();
    return Array.from(this.relationships.values()).filter(rel => {
      for (const key in filter) {
        if (rel[key as keyof ServiceUserStaffRelationship] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async getByServiceUser(serviceUserId: string): Promise<ServiceUserStaffRelationship[]> {
    await this.ensureInitialized();
    return Array.from(this.relationships.values()).filter(
      r => r.cp365_serviceuserid === serviceUserId && r.statecode === 0
    );
  }

  async getByStaffMember(staffMemberId: string): Promise<ServiceUserStaffRelationship[]> {
    await this.ensureInitialized();
    return Array.from(this.relationships.values()).filter(
      r => r.cp365_staffmemberid === staffMemberId && r.statecode === 0
    );
  }

  async getPreferredCarers(serviceUserId: string): Promise<ServiceUserStaffRelationship[]> {
    await this.ensureInitialized();
    return Array.from(this.relationships.values()).filter(
      r =>
        r.cp365_serviceuserid === serviceUserId &&
        r.cp365_ispreferredcarer &&
        r.statecode === 0
    );
  }

  async getExcludedCarers(serviceUserId: string): Promise<ServiceUserStaffRelationship[]> {
    await this.ensureInitialized();
    return Array.from(this.relationships.values()).filter(
      r =>
        r.cp365_serviceuserid === serviceUserId &&
        r.cp365_isexcluded &&
        r.statecode === 0
    );
  }

  async getByServiceUserAndStaff(
    serviceUserId: string,
    staffMemberId: string
  ): Promise<ServiceUserStaffRelationship | null> {
    await this.ensureInitialized();
    return (
      Array.from(this.relationships.values()).find(
        r =>
          r.cp365_serviceuserid === serviceUserId &&
          r.cp365_staffmemberid === staffMemberId &&
          r.statecode === 0
      ) || null
    );
  }
}
