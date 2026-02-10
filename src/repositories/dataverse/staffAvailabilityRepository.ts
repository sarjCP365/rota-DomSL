/**
 * Dataverse Staff Availability Repository
 *
 * Dataverse Web API implementation of the Staff Availability repository.
 * TODO: Implement actual Dataverse integration in later phase.
 */

import type { QueryFilter } from '../baseRepository';
import type { StaffAvailabilityRepository } from '../staffAvailabilityRepository';
import type {
  StaffAvailability,
  WeeklyAvailabilityPattern,
  AvailabilityException,
  StaffAvailabilityForDate,
} from '@/types/domiciliary';

/**
 * Dataverse implementation of StaffAvailabilityRepository
 * Currently a stub - will be implemented when Dataverse tables are created
 */
export class DataverseStaffAvailabilityRepository implements StaffAvailabilityRepository {
  private throwNotImplemented(): never {
    throw new Error(
      'DataverseStaffAvailabilityRepository not yet implemented. Use VITE_DATA_SOURCE=dummy for development.'
    );
  }

  async getAll(): Promise<StaffAvailability[]> {
    this.throwNotImplemented();
  }

  async getById(_id: string): Promise<StaffAvailability | null> {
    this.throwNotImplemented();
  }

  async create(_entity: Partial<StaffAvailability>): Promise<StaffAvailability> {
    this.throwNotImplemented();
  }

  async update(_id: string, _entity: Partial<StaffAvailability>): Promise<StaffAvailability> {
    this.throwNotImplemented();
  }

  async delete(_id: string): Promise<void> {
    this.throwNotImplemented();
  }

  async query(_filter: QueryFilter): Promise<StaffAvailability[]> {
    this.throwNotImplemented();
  }

  async getPatternByStaffMember(_staffMemberId: string): Promise<WeeklyAvailabilityPattern | null> {
    this.throwNotImplemented();
  }

  async getByStaffMember(_staffMemberId: string): Promise<StaffAvailability[]> {
    this.throwNotImplemented();
  }

  async getAvailabilityForDate(
    _staffMemberId: string,
    _date: Date
  ): Promise<StaffAvailabilityForDate> {
    this.throwNotImplemented();
  }

  async getAvailabilityForDateMultiple(
    _staffMemberIds: string[],
    _date: Date
  ): Promise<Map<string, StaffAvailabilityForDate>> {
    this.throwNotImplemented();
  }

  async getAvailableStaff(
    _date: Date,
    _startTime: string,
    _endTime: string
  ): Promise<string[]> {
    this.throwNotImplemented();
  }

  async savePattern(_pattern: WeeklyAvailabilityPattern): Promise<WeeklyAvailabilityPattern> {
    this.throwNotImplemented();
  }

  async getExceptions(
    _staffMemberId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<AvailabilityException[]> {
    this.throwNotImplemented();
  }

  async createException(_exception: Partial<AvailabilityException>): Promise<AvailabilityException> {
    this.throwNotImplemented();
  }

  async deleteException(_exceptionId: string): Promise<void> {
    this.throwNotImplemented();
  }
}
