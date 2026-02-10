/**
 * Dataverse Round Repository
 *
 * Dataverse Web API implementation of the Round repository.
 * TODO: Implement actual Dataverse integration in later phase.
 */

import type { QueryFilter } from '../baseRepository';
import type { RoundRepository } from '../roundRepository';
import type { Round, VisitType, DateRange } from '@/types/domiciliary';

/**
 * Dataverse implementation of RoundRepository
 * Currently a stub - will be implemented when Dataverse tables are created
 */
export class DataverseRoundRepository implements RoundRepository {
  private throwNotImplemented(): never {
    throw new Error(
      'DataverseRoundRepository not yet implemented. Use VITE_DATA_SOURCE=dummy for development.'
    );
  }

  async getAll(): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getById(_id: string): Promise<Round | null> {
    this.throwNotImplemented();
  }

  async create(_entity: Partial<Round>): Promise<Round> {
    this.throwNotImplemented();
  }

  async update(_id: string, _entity: Partial<Round>): Promise<Round> {
    this.throwNotImplemented();
  }

  async delete(_id: string): Promise<void> {
    this.throwNotImplemented();
  }

  async query(_filter: QueryFilter): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getByDate(_date: Date): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getByDateRange(_dateRange: DateRange): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getByType(_roundType: VisitType): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getByStaffMember(_staffMemberId: string, _date?: Date): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getUnassigned(_date: Date): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getTemplates(): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async getTemplatesByDay(_dayOfWeek: number): Promise<Round[]> {
    this.throwNotImplemented();
  }

  async addVisit(_roundId: string, _visitId: string, _sequenceOrder?: number): Promise<Round> {
    this.throwNotImplemented();
  }

  async removeVisit(_roundId: string, _visitId: string): Promise<Round> {
    this.throwNotImplemented();
  }

  async reorderVisits(_roundId: string, _visitIds: string[]): Promise<Round> {
    this.throwNotImplemented();
  }

  async assignStaff(_roundId: string, _staffMemberId: string): Promise<Round> {
    this.throwNotImplemented();
  }

  async unassignStaff(_roundId: string): Promise<Round> {
    this.throwNotImplemented();
  }

  async createFromTemplate(_templateId: string, _date: Date): Promise<Round> {
    this.throwNotImplemented();
  }

  async getWithVisits(_roundId: string): Promise<Round | null> {
    this.throwNotImplemented();
  }
}
