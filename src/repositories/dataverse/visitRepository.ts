/**
 * Dataverse Visit Repository
 *
 * Dataverse Web API implementation of the Visit repository.
 * TODO: Implement actual Dataverse integration in later phase.
 */

import type { QueryFilter } from '../baseRepository';
import type { VisitRepository } from '../visitRepository';
import type { Visit, DateRange } from '@/types/domiciliary';

/**
 * Dataverse implementation of VisitRepository
 * Currently a stub - will be implemented when Dataverse tables are created
 */
export class DataverseVisitRepository implements VisitRepository {
  private throwNotImplemented(): never {
    throw new Error(
      'DataverseVisitRepository not yet implemented. Use VITE_DATA_SOURCE=dummy for development.'
    );
  }

  async getAll(): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getById(_id: string): Promise<Visit | null> {
    this.throwNotImplemented();
  }

  async create(_entity: Partial<Visit>): Promise<Visit> {
    this.throwNotImplemented();
  }

  async update(_id: string, _entity: Partial<Visit>): Promise<Visit> {
    this.throwNotImplemented();
  }

  async delete(_id: string): Promise<void> {
    this.throwNotImplemented();
  }

  async query(_filter: QueryFilter): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getByServiceUser(_serviceUserId: string, _dateRange: DateRange): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getByStaffMember(_staffMemberId: string, _date: Date): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getUnassigned(_dateRange: DateRange): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getByRound(_roundId: string): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getByLocation(_locationId: string, _dateRange: DateRange): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async getByStatus(_status: number, _dateRange: DateRange): Promise<Visit[]> {
    this.throwNotImplemented();
  }

  async assignStaff(_visitId: string, _staffMemberId: string): Promise<Visit> {
    this.throwNotImplemented();
  }

  async unassignStaff(_visitId: string): Promise<Visit> {
    this.throwNotImplemented();
  }

  async cancelVisit(_visitId: string, _reason: string): Promise<Visit> {
    this.throwNotImplemented();
  }

  async checkIn(_visitId: string, _latitude?: number, _longitude?: number): Promise<Visit> {
    this.throwNotImplemented();
  }

  async checkOut(_visitId: string, _latitude?: number, _longitude?: number): Promise<Visit> {
    this.throwNotImplemented();
  }
}
