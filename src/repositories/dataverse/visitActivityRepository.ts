/**
 * Dataverse Visit Activity Repository
 *
 * Dataverse Web API implementation of the Visit Activity repository.
 * TODO: Implement actual Dataverse integration in later phase.
 */

import type { QueryFilter } from '../baseRepository';
import type { VisitActivityRepository } from '../visitActivityRepository';
import type { VisitActivity, ActivityCategory } from '@/types/domiciliary';

/**
 * Dataverse implementation of VisitActivityRepository
 * Currently a stub - will be implemented when Dataverse tables are created
 */
export class DataverseVisitActivityRepository implements VisitActivityRepository {
  private throwNotImplemented(): never {
    throw new Error(
      'DataverseVisitActivityRepository not yet implemented. Use VITE_DATA_SOURCE=dummy for development.'
    );
  }

  async getAll(): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async getById(_id: string): Promise<VisitActivity | null> {
    this.throwNotImplemented();
  }

  async create(_entity: Partial<VisitActivity>): Promise<VisitActivity> {
    this.throwNotImplemented();
  }

  async update(_id: string, _entity: Partial<VisitActivity>): Promise<VisitActivity> {
    this.throwNotImplemented();
  }

  async delete(_id: string): Promise<void> {
    this.throwNotImplemented();
  }

  async query(_filter: QueryFilter): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async getByVisit(_visitId: string): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async getByCategory(_category: ActivityCategory): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async getIncomplete(_visitId: string): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async markComplete(
    _activityId: string,
    _notes?: string,
    _completedBy?: string
  ): Promise<VisitActivity> {
    this.throwNotImplemented();
  }

  async markIncomplete(_activityId: string): Promise<VisitActivity> {
    this.throwNotImplemented();
  }

  async createBulk(_visitId: string, _activities: Partial<VisitActivity>[]): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async reorder(_visitId: string, _activityIds: string[]): Promise<VisitActivity[]> {
    this.throwNotImplemented();
  }

  async deleteByVisit(_visitId: string): Promise<void> {
    this.throwNotImplemented();
  }

  async getCompletionStats(_visitId: string): Promise<{
    total: number;
    completed: number;
    percentage: number;
  }> {
    this.throwNotImplemented();
  }
}
