/**
 * Dummy Round Repository
 *
 * In-memory implementation using generated dummy data for development and testing.
 */

import type { Round, DateRange, VisitType } from '@/types/domiciliary';
import type { RoundRepository } from '../roundRepository';
import { getDummyData } from '@/data/dummyDataGenerator';

export class DummyRoundRepository implements RoundRepository {
  private rounds: Map<string, Round> = new Map();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const data = await getDummyData();
      for (const round of data.rounds) {
        this.rounds.set(round.cp365_roundid, round);
      }
      this.initialized = true;
    }
  }

  async getAll(): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values());
  }

  async getById(id: string): Promise<Round | null> {
    await this.ensureInitialized();
    return this.rounds.get(id) || null;
  }

  async create(entity: Partial<Round>): Promise<Round> {
    await this.ensureInitialized();
    const newRound = {
      ...entity,
      cp365_roundid: crypto.randomUUID(),
      statecode: 0,
    } as Round;
    this.rounds.set(newRound.cp365_roundid, newRound);
    return newRound;
  }

  async update(id: string, entity: Partial<Round>): Promise<Round> {
    await this.ensureInitialized();
    const existing = this.rounds.get(id);
    if (!existing) throw new Error('Round not found');
    const updated = { ...existing, ...entity, cp365_roundid: id };
    this.rounds.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.rounds.delete(id);
  }

  async query(filter: Record<string, unknown>): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values()).filter(round => {
      for (const key in filter) {
        if (round[key as keyof Round] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async getByDate(date: Date): Promise<Round[]> {
    await this.ensureInitialized();
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.rounds.values()).filter(r => {
      if (r.statecode !== 0) return false;
      if (!r.visits || r.visits.length === 0) return false;
      return r.visits.some(v => v.cp365_visitdate === dateStr);
    });
  }

  async getByDateRange(dateRange: DateRange): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values()).filter(r => {
      if (r.statecode !== 0) return false;
      if (!r.visits || r.visits.length === 0) return false;

      return r.visits.some(v => {
        const visitDate = new Date(v.cp365_visitdate);
        return visitDate >= dateRange.start && visitDate <= dateRange.end;
      });
    });
  }

  async getByType(roundType: VisitType): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values()).filter(
      r => r.cp365_roundtype === roundType && r.statecode === 0
    );
  }

  async getByStaffMember(staffMemberId: string, date?: Date): Promise<Round[]> {
    await this.ensureInitialized();
    let rounds = Array.from(this.rounds.values()).filter(
      r => r.cp365_staffmemberid === staffMemberId && r.statecode === 0
    );

    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      rounds = rounds.filter(r =>
        r.visits?.some(v => v.cp365_visitdate === dateStr)
      );
    }

    return rounds;
  }

  async getUnassigned(date: Date): Promise<Round[]> {
    await this.ensureInitialized();
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.rounds.values()).filter(r => {
      if (r.statecode !== 0) return false;
      if (r.cp365_staffmemberid) return false;
      return r.visits?.some(v => v.cp365_visitdate === dateStr);
    });
  }

  async getTemplates(): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values()).filter(
      r => r.cp365_istemplate && r.statecode === 0
    );
  }

  async getTemplatesByDay(dayOfWeek: number): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values()).filter(
      r => r.cp365_istemplate && r.cp365_dayofweek === dayOfWeek && r.statecode === 0
    );
  }

  async addVisit(roundId: string, _visitId: string, _sequenceOrder?: number): Promise<Round> {
    await this.ensureInitialized();
    const round = this.rounds.get(roundId);
    if (!round) throw new Error('Round not found');

    // This would need integration with visit repository in real implementation
    console.warn('DummyRoundRepository.addVisit: Would add visit to round');
    return round;
  }

  async removeVisit(roundId: string, _visitId: string): Promise<Round> {
    await this.ensureInitialized();
    const round = this.rounds.get(roundId);
    if (!round) throw new Error('Round not found');

    // This would need integration with visit repository in real implementation
    console.warn('DummyRoundRepository.removeVisit: Would remove visit from round');
    return round;
  }

  async reorderVisits(roundId: string, _visitIds: string[]): Promise<Round> {
    await this.ensureInitialized();
    const round = this.rounds.get(roundId);
    if (!round) throw new Error('Round not found');

    // This would need integration with visit repository in real implementation
    console.warn('DummyRoundRepository.reorderVisits: Would reorder visits in round');
    return round;
  }

  async assignStaff(roundId: string, staffMemberId: string): Promise<Round> {
    await this.ensureInitialized();
    const round = this.rounds.get(roundId);
    if (!round) throw new Error('Round not found');

    const updated = { ...round, cp365_staffmemberid: staffMemberId };
    this.rounds.set(roundId, updated);
    return updated;
  }

  async unassignStaff(roundId: string): Promise<Round> {
    await this.ensureInitialized();
    const round = this.rounds.get(roundId);
    if (!round) throw new Error('Round not found');

    const updated = { ...round, cp365_staffmemberid: undefined, cp365_staffmember: undefined };
    this.rounds.set(roundId, updated);
    return updated;
  }

  async createFromTemplate(templateId: string, _date: Date): Promise<Round> {
    await this.ensureInitialized();
    const template = this.rounds.get(templateId);
    if (!template) throw new Error('Template not found');
    if (!template.cp365_istemplate) throw new Error('Not a template');

    const newRound: Round = {
      ...template,
      cp365_roundid: crypto.randomUUID(),
      cp365_istemplate: false,
      visits: [], // Would need to create visits for the date
    };

    this.rounds.set(newRound.cp365_roundid, newRound);
    return newRound;
  }

  async getWithVisits(roundId: string): Promise<Round | null> {
    await this.ensureInitialized();
    return this.rounds.get(roundId) || null;
  }

  async getByArea(areaId: string): Promise<Round[]> {
    await this.ensureInitialized();
    return Array.from(this.rounds.values()).filter(
      r => r.cp365_areaid === areaId && r.statecode === 0
    );
  }
}
