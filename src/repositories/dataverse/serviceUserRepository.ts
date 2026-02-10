/**
 * Dataverse Service User Repository
 *
 * Dataverse Web API implementation of the Service User repository.
 * TODO: Implement actual Dataverse integration in later phase.
 */

import type { QueryFilter } from '../baseRepository';
import type { ServiceUserRepository } from '../serviceUserRepository';
import type { DomiciliaryServiceUser } from '@/types/domiciliary';

/**
 * Dataverse implementation of ServiceUserRepository
 * Currently a stub - will be implemented when Dataverse tables are created
 */
export class DataverseServiceUserRepository implements ServiceUserRepository {
  private throwNotImplemented(): never {
    throw new Error(
      'DataverseServiceUserRepository not yet implemented. Use VITE_DATA_SOURCE=dummy for development.'
    );
  }

  async getAll(): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async getById(_id: string): Promise<DomiciliaryServiceUser | null> {
    this.throwNotImplemented();
  }

  async create(_entity: Partial<DomiciliaryServiceUser>): Promise<DomiciliaryServiceUser> {
    this.throwNotImplemented();
  }

  async update(_id: string, _entity: Partial<DomiciliaryServiceUser>): Promise<DomiciliaryServiceUser> {
    this.throwNotImplemented();
  }

  async delete(_id: string): Promise<void> {
    this.throwNotImplemented();
  }

  async query(_filter: QueryFilter): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async getActive(): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async getByLocation(_locationId: string): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async searchByName(_searchTerm: string): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async getByPostcode(_postcodePrefix: string): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async getWithinRadius(
    _latitude: number,
    _longitude: number,
    _radiusMiles: number
  ): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }

  async getWithUnassignedVisits(_startDate: Date, _endDate: Date): Promise<DomiciliaryServiceUser[]> {
    this.throwNotImplemented();
  }
}
