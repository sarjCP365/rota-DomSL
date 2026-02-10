/**
 * Staff Availability Repository
 *
 * Repository interface and instance for StaffAvailability entities.
 * Provides CRUD operations plus availability-specific query methods.
 */

import type { Repository } from './baseRepository';
import type { StaffAvailability } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';
import { DummyStaffAvailabilityRepository } from './dummy/staffAvailabilityRepository';
import { DataverseStaffAvailabilityRepository } from './dataverse/staffAvailabilityRepository';

/**
 * Extended repository interface with availability-specific methods
 */
export interface StaffAvailabilityRepository extends Repository<StaffAvailability> {
  getByStaffMember(staffMemberId: string): Promise<StaffAvailability[]>;
  getByDate(date: Date): Promise<StaffAvailability[]>;
  getByStaffMemberAndDate(staffMemberId: string, date: Date): Promise<StaffAvailability[]>;
}

// Create the appropriate repository based on data source
function createStaffAvailabilityRepository(): StaffAvailabilityRepository {
  if (dataSource.type === 'dataverse') {
    return new DataverseStaffAvailabilityRepository();
  }
  return new DummyStaffAvailabilityRepository();
}

/**
 * Staff Availability repository singleton
 */
export const staffAvailabilityRepository: StaffAvailabilityRepository = createStaffAvailabilityRepository();
