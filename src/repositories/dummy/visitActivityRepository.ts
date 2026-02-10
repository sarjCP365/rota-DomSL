/**
 * Dummy Visit Activity Repository
 *
 * In-memory implementation using generated dummy data for development and testing.
 */

import type { VisitActivity } from '@/types/domiciliary';
import type { VisitActivityRepository } from '../visitActivityRepository';
import { getDummyData } from '@/data/dummyDataGenerator';

export class DummyVisitActivityRepository implements VisitActivityRepository {
  private activities: Map<string, VisitActivity> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const data = await getDummyData();
      for (const activity of data.activities) {
        this.activities.set(activity.cp365_visitactivityid, activity);
      }
      this.initialized = true;
    }
  }

  async getAll(): Promise<VisitActivity[]> {
    await this.ensureInitialized();
    return Array.from(this.activities.values());
  }

  async getById(id: string): Promise<VisitActivity | null> {
    await this.ensureInitialized();
    return this.activities.get(id) || null;
  }

  async create(entity: Partial<VisitActivity>): Promise<VisitActivity> {
    await this.ensureInitialized();
    const newActivity = {
      ...entity,
      cp365_visitactivityid: crypto.randomUUID(),
      statecode: 0,
    } as VisitActivity;
    this.activities.set(newActivity.cp365_visitactivityid, newActivity);
    return newActivity;
  }

  async update(id: string, entity: Partial<VisitActivity>): Promise<VisitActivity> {
    await this.ensureInitialized();
    const existing = this.activities.get(id);
    if (!existing) throw new Error('Visit activity not found');
    const updated = { ...existing, ...entity, cp365_visitactivityid: id };
    this.activities.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.activities.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<VisitActivity[]> {
    await this.ensureInitialized();
    return Array.from(this.activities.values()).filter(activity => {
      for (const key in filter) {
        if (activity[key as keyof VisitActivity] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async getByVisit(visitId: string): Promise<VisitActivity[]> {
    await this.ensureInitialized();
    return Array.from(this.activities.values())
      .filter(a => a.cp365_visitid === visitId && a.statecode === 0)
      .sort((a, b) => a.cp365_displayorder - b.cp365_displayorder);
  }

  async getIncomplete(visitId: string): Promise<VisitActivity[]> {
    await this.ensureInitialized();
    return Array.from(this.activities.values())
      .filter(a => a.cp365_visitid === visitId && !a.cp365_iscompleted && a.statecode === 0)
      .sort((a, b) => a.cp365_displayorder - b.cp365_displayorder);
  }

  async markComplete(activityId: string, notes?: string): Promise<VisitActivity> {
    await this.ensureInitialized();
    const activity = this.activities.get(activityId);
    if (!activity) throw new Error('Activity not found');

    const updated = {
      ...activity,
      cp365_iscompleted: true,
      cp365_completedtime: new Date().toISOString(),
      cp365_completednotes: notes,
    };
    this.activities.set(activityId, updated);
    return updated;
  }
}
