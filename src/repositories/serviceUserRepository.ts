/**
 * Service User Repository
 *
 * Repository interface and instance for DomiciliaryServiceUser entities.
 * Provides CRUD operations plus service user-specific query methods.
 */

import type { Repository } from './baseRepository';
import type { DomiciliaryServiceUser } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';
import { DummyServiceUserRepository } from './dummy/serviceUserRepository';
import { DataverseServiceUserRepository } from './dataverse/serviceUserRepository';

/**
 * Extended repository interface with service user-specific methods
 */
export interface ServiceUserRepository extends Repository<DomiciliaryServiceUser> {
  getActive(): Promise<DomiciliaryServiceUser[]>;
  getByLocation(locationId: string): Promise<DomiciliaryServiceUser[]>;
  searchByName(searchTerm: string): Promise<DomiciliaryServiceUser[]>;
  getByPostcode(postcodePrefix: string): Promise<DomiciliaryServiceUser[]>;
  getWithinRadius(latitude: number, longitude: number, radiusMiles: number): Promise<DomiciliaryServiceUser[]>;
  getWithUnassignedVisits(startDate: Date, endDate: Date): Promise<DomiciliaryServiceUser[]>;
}

// Create the appropriate repository based on data source
function createServiceUserRepository(): ServiceUserRepository {
  if (dataSource.type === 'dataverse') {
    return new DataverseServiceUserRepository();
  }
  return new DummyServiceUserRepository();
}

/**
 * Service User repository singleton
 */
export const serviceUserRepository: ServiceUserRepository = createServiceUserRepository();
