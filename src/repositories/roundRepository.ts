/**
 * Round Repository
 *
 * Repository interface and instance for Round entities.
 * Provides CRUD operations plus round-specific query methods.
 */

import type { Repository } from './baseRepository';
import type { Round, VisitType, DateRange } from '@/types/domiciliary';
import { dataSource } from '@/services/dataSource';
import { DummyRoundRepository } from './dummy/roundRepository';
import { DataverseRoundRepository } from './dataverse/roundRepository';

/**
 * Extended repository interface with round-specific methods
 */
export interface RoundRepository extends Repository<Round> {
  getByDate(date: Date): Promise<Round[]>;
  getByDateRange(dateRange: DateRange): Promise<Round[]>;
  getByType(roundType: VisitType): Promise<Round[]>;
  getByStaffMember(staffMemberId: string, date?: Date): Promise<Round[]>;
  getUnassigned(date: Date): Promise<Round[]>;
  getTemplates(): Promise<Round[]>;
  getTemplatesByDay(dayOfWeek: number): Promise<Round[]>;
  addVisit(roundId: string, visitId: string, sequenceOrder?: number): Promise<Round>;
  removeVisit(roundId: string, visitId: string): Promise<Round>;
  reorderVisits(roundId: string, visitIds: string[]): Promise<Round>;
  assignStaff(roundId: string, staffMemberId: string): Promise<Round>;
  unassignStaff(roundId: string): Promise<Round>;
  createFromTemplate(templateId: string, date: Date): Promise<Round>;
  getWithVisits(roundId: string): Promise<Round | null>;
}

// Create the appropriate repository based on data source
function createRoundRepository(): RoundRepository {
  if (dataSource.type === 'dataverse') {
    return new DataverseRoundRepository();
  }
  return new DummyRoundRepository();
}

/**
 * Round repository singleton
 */
export const roundRepository: RoundRepository = createRoundRepository();
