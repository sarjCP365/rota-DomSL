/**
 * Visit Repository
 *
 * Repository interface and instance for Visit entities.
 * Provides CRUD operations plus visit-specific query methods.
 */

import type { Repository } from './baseRepository';
import type { Visit, DateRange } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';
import { DummyVisitRepository } from './dummy/visitRepository';
import { DataverseVisitRepository } from './dataverse/visitRepository';

/**
 * Extended repository interface with visit-specific methods
 */
export interface VisitRepository extends Repository<Visit> {
  getByServiceUser(serviceUserId: string, dateRange: DateRange): Promise<Visit[]>;
  getByStaffMember(staffMemberId: string, date: Date): Promise<Visit[]>;
  getUnassigned(dateRange: DateRange): Promise<Visit[]>;
  getByRound(roundId: string): Promise<Visit[]>;
  getByLocation(locationId: string, dateRange: DateRange): Promise<Visit[]>;
  getByStatus(status: number, dateRange: DateRange): Promise<Visit[]>;
  assignStaff(visitId: string, staffMemberId: string): Promise<Visit>;
  unassignStaff(visitId: string): Promise<Visit>;
  cancelVisit(visitId: string, reason: string): Promise<Visit>;
  checkIn(visitId: string, latitude?: number, longitude?: number): Promise<Visit>;
  checkOut(visitId: string, latitude?: number, longitude?: number): Promise<Visit>;
}

// Create the appropriate repository based on data source
function createVisitRepository(): VisitRepository {
  if (dataSource.type === 'dataverse') {
    return new DataverseVisitRepository();
  }
  return new DummyVisitRepository();
}

/**
 * Visit repository singleton
 */
export const visitRepository: VisitRepository = createVisitRepository();
