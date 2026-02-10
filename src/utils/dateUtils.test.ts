/**
 * Date Utilities Tests
 */

import {
  getWeekStart,
  getDateRange,
  calculateZone,
  parseZone,
  formatDisplayDate,
  formatDataverseDate,
  formatFlowDate,
  parseDataverseDate,
  isDateInRange,
  getDayName,
  getShortDayName,
  getNextPeriod,
  getPreviousPeriod,
} from './dateUtils';

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday date', () => {
    const wed = new Date(2026, 1, 11); // Wed 11 Feb 2026
    const result = getWeekStart(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(9); // Mon 9 Feb
  });

  it('returns same date when given a Monday', () => {
    const mon = new Date(2026, 1, 9); // Mon 9 Feb 2026
    const result = getWeekStart(mon);
    expect(result.getDate()).toBe(9);
  });

  it('returns previous Monday for a Sunday', () => {
    const sun = new Date(2026, 1, 15); // Sun 15 Feb 2026
    const result = getWeekStart(sun);
    expect(result.getDate()).toBe(9);
  });
});

describe('getDateRange', () => {
  it('returns correct number of dates for a 7-day range', () => {
    const start = new Date(2026, 1, 9);
    const range = getDateRange(start, 7);
    expect(range).toHaveLength(7);
  });

  it('returns correct number of dates for a 28-day range', () => {
    const start = new Date(2026, 1, 9);
    const range = getDateRange(start, 28);
    expect(range).toHaveLength(28);
  });

  it('first date matches start date', () => {
    const start = new Date(2026, 1, 9);
    const range = getDateRange(start, 7);
    expect(range[0].getDate()).toBe(9);
  });

  it('last date is start + days - 1', () => {
    const start = new Date(2026, 1, 9);
    const range = getDateRange(start, 7);
    expect(range[6].getDate()).toBe(15);
  });
});

describe('calculateZone / parseZone', () => {
  it('calculates zone with staff member', () => {
    const start = new Date(2026, 1, 9); // Mon
    const shiftDate = new Date(2026, 1, 11); // Wed (day index 3)
    const zone = calculateZone(shiftDate, start, 'staff-123');
    expect(zone).toBe('3|staff-123');
  });

  it('calculates zone for unassigned shift', () => {
    const start = new Date(2026, 1, 9);
    const shiftDate = new Date(2026, 1, 9); // Same day (index 1)
    const zone = calculateZone(shiftDate, start);
    expect(zone).toBe('1|unassigned');
  });

  it('parseZone round-trips with calculateZone', () => {
    const zone = '3|staff-123';
    const parsed = parseZone(zone);
    expect(parsed.dayIndex).toBe(3);
    expect(parsed.staffMemberId).toBe('staff-123');
  });

  it('parseZone returns null staffMemberId for unassigned', () => {
    const parsed = parseZone('1|unassigned');
    expect(parsed.staffMemberId).toBeNull();
  });
});

describe('date formatting', () => {
  const testDate = new Date(2026, 1, 10); // 10 Feb 2026

  it('formatDisplayDate uses default format', () => {
    expect(formatDisplayDate(testDate)).toBe('10 Feb 2026');
  });

  it('formatDisplayDate uses custom format', () => {
    expect(formatDisplayDate(testDate, 'dd/MM/yyyy')).toBe('10/02/2026');
  });

  it('formatDataverseDate returns yyyy-MM-dd', () => {
    expect(formatDataverseDate(testDate)).toBe('2026-02-10');
  });

  it('formatFlowDate returns dd/MM/yyyy', () => {
    expect(formatFlowDate(testDate)).toBe('10/02/2026');
  });
});

describe('parseDataverseDate', () => {
  it('parses a valid Dataverse date string', () => {
    const parsed = parseDataverseDate('2026-02-10');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1); // 0-indexed
    expect(parsed.getDate()).toBe(10);
  });
});

describe('isDateInRange', () => {
  const start = new Date(2026, 1, 9);
  const end = new Date(2026, 1, 15);

  it('returns true for date within range', () => {
    expect(isDateInRange(new Date(2026, 1, 12), start, end)).toBe(true);
  });

  it('returns true for start boundary', () => {
    expect(isDateInRange(start, start, end)).toBe(true);
  });

  it('returns true for end boundary', () => {
    expect(isDateInRange(end, start, end)).toBe(true);
  });

  it('returns false for date before range', () => {
    expect(isDateInRange(new Date(2026, 1, 8), start, end)).toBe(false);
  });

  it('returns false for date after range', () => {
    expect(isDateInRange(new Date(2026, 1, 16), start, end)).toBe(false);
  });
});

describe('day names', () => {
  it('getDayName returns full name', () => {
    const mon = new Date(2026, 1, 9); // Monday
    expect(getDayName(mon)).toBe('Monday');
  });

  it('getShortDayName returns abbreviated name', () => {
    const mon = new Date(2026, 1, 9);
    expect(getShortDayName(mon)).toBe('Mon');
  });
});

describe('period navigation', () => {
  const monday = new Date(2026, 1, 9);

  it('getNextPeriod advances by 1 week for 7-day duration', () => {
    const next = getNextPeriod(monday, 7);
    expect(next.getDate()).toBe(16);
  });

  it('getNextPeriod advances by 2 weeks for 14-day duration', () => {
    const next = getNextPeriod(monday, 14);
    expect(next.getDate()).toBe(23);
  });

  it('getNextPeriod advances by 4 weeks for 28-day duration', () => {
    const next = getNextPeriod(monday, 28);
    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(9);
  });

  it('getPreviousPeriod goes back by 1 week for 7-day duration', () => {
    const prev = getPreviousPeriod(monday, 7);
    expect(prev.getDate()).toBe(2);
  });

  it('getPreviousPeriod goes back by 4 weeks for 28-day duration', () => {
    const prev = getPreviousPeriod(monday, 28);
    expect(prev.getMonth()).toBe(0); // January
    expect(prev.getDate()).toBe(12);
  });
});
