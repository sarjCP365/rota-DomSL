/**
 * Visit Activity Repository
 *
 * Repository interface and instance for VisitActivity entities.
 * Provides CRUD operations plus activity-specific query methods.
 */

import type { Repository } from './baseRepository';
import type { VisitActivity } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';
import { DummyVisitActivityRepository } from './dummy/visitActivityRepository';
import { DataverseVisitActivityRepository } from './dataverse/visitActivityRepository';

/**
 * Extended repository interface with activity-specific methods
 */
export interface VisitActivityRepository extends Repository<VisitActivity> {
  getByVisit(visitId: string): Promise<VisitActivity[]>;
  getIncomplete(visitId: string): Promise<VisitActivity[]>;
  markComplete(activityId: string, notes?: string): Promise<VisitActivity>;
}

// Create the appropriate repository based on data source
function createVisitActivityRepository(): VisitActivityRepository {
  if (dataSource.type === 'dataverse') {
    return new DataverseVisitActivityRepository();
  }
  return new DummyVisitActivityRepository();
}

/**
 * Visit Activity repository singleton
 */
export const visitActivityRepository: VisitActivityRepository = createVisitActivityRepository();
