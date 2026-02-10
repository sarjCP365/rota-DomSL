/**
 * Service User Staff Relationship Repository
 *
 * Repository interface and instance for ServiceUserStaffRelationship entities.
 * Provides CRUD operations plus relationship-specific query methods.
 */

import type { Repository } from './baseRepository';
import type { ServiceUserStaffRelationship } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';
import { DummyServiceUserStaffRelationshipRepository } from './dummy/serviceUserStaffRelationshipRepository';
import { DataverseServiceUserStaffRelationshipRepository } from './dataverse/serviceUserStaffRelationshipRepository';

/**
 * Extended repository interface with relationship-specific methods
 */
export interface ServiceUserStaffRelationshipRepository extends Repository<ServiceUserStaffRelationship> {
  getByServiceUser(serviceUserId: string): Promise<ServiceUserStaffRelationship[]>;
  getByStaffMember(staffMemberId: string): Promise<ServiceUserStaffRelationship[]>;
  getPreferredCarers(serviceUserId: string): Promise<ServiceUserStaffRelationship[]>;
  getExcludedCarers(serviceUserId: string): Promise<ServiceUserStaffRelationship[]>;
  getByServiceUserAndStaff(serviceUserId: string, staffMemberId: string): Promise<ServiceUserStaffRelationship | null>;
}

// Create the appropriate repository based on data source
function createServiceUserStaffRelationshipRepository(): ServiceUserStaffRelationshipRepository {
  if (dataSource.type === 'dataverse') {
    return new DataverseServiceUserStaffRelationshipRepository();
  }
  return new DummyServiceUserStaffRelationshipRepository();
}

/**
 * Service User Staff Relationship repository singleton
 */
export const serviceUserStaffRelationshipRepository: ServiceUserStaffRelationshipRepository = createServiceUserStaffRelationshipRepository();
