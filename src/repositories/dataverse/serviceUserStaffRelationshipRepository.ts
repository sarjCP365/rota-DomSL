/**
 * Dataverse Service User Staff Relationship Repository
 *
 * Dataverse Web API implementation of the relationship repository.
 * TODO: Implement actual Dataverse integration in later phase.
 */

import type { QueryFilter } from '../baseRepository';
import type { ServiceUserStaffRelationshipRepository } from '../serviceUserStaffRelationshipRepository';
import type { ServiceUserStaffRelationship, RelationshipStatus } from '@/types/domiciliary';

/**
 * Dataverse implementation of ServiceUserStaffRelationshipRepository
 * Currently a stub - will be implemented when Dataverse tables are created
 */
export class DataverseServiceUserStaffRelationshipRepository
  implements ServiceUserStaffRelationshipRepository
{
  private throwNotImplemented(): never {
    throw new Error(
      'DataverseServiceUserStaffRelationshipRepository not yet implemented. Use VITE_DATA_SOURCE=dummy for development.'
    );
  }

  async getAll(): Promise<ServiceUserStaffRelationship[]> {
    this.throwNotImplemented();
  }

  async getById(_id: string): Promise<ServiceUserStaffRelationship | null> {
    this.throwNotImplemented();
  }

  async create(_entity: Partial<ServiceUserStaffRelationship>): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async update(
    _id: string,
    _entity: Partial<ServiceUserStaffRelationship>
  ): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async delete(_id: string): Promise<void> {
    this.throwNotImplemented();
  }

  async query(_filter: QueryFilter): Promise<ServiceUserStaffRelationship[]> {
    this.throwNotImplemented();
  }

  async getByServiceUser(_serviceUserId: string): Promise<ServiceUserStaffRelationship[]> {
    this.throwNotImplemented();
  }

  async getByStaffMember(_staffMemberId: string): Promise<ServiceUserStaffRelationship[]> {
    this.throwNotImplemented();
  }

  async getRelationship(
    _serviceUserId: string,
    _staffMemberId: string
  ): Promise<ServiceUserStaffRelationship | null> {
    this.throwNotImplemented();
  }

  async getPreferredCarers(_serviceUserId: string): Promise<string[]> {
    this.throwNotImplemented();
  }

  async getExcludedCarers(_serviceUserId: string): Promise<string[]> {
    this.throwNotImplemented();
  }

  async setPreferred(
    _serviceUserId: string,
    _staffMemberId: string
  ): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async removePreferred(
    _serviceUserId: string,
    _staffMemberId: string
  ): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async exclude(
    _serviceUserId: string,
    _staffMemberId: string,
    _reason: string
  ): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async removeExclusion(
    _serviceUserId: string,
    _staffMemberId: string
  ): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async recordVisit(
    _serviceUserId: string,
    _staffMemberId: string
  ): Promise<ServiceUserStaffRelationship> {
    this.throwNotImplemented();
  }

  async getByStatus(_status: RelationshipStatus): Promise<ServiceUserStaffRelationship[]> {
    this.throwNotImplemented();
  }

  async getHighContinuityServiceUsers(
    _staffMemberId: string,
    _minScore: number
  ): Promise<string[]> {
    this.throwNotImplemented();
  }

  async recalculateContinuityScores(): Promise<void> {
    this.throwNotImplemented();
  }
}
