/**
 * Shift Utilities Tests
 */

import {
  getShiftType,
  formatTime,
  calculateShiftDuration,
  getShiftColour,
  hasTimeClash,
  buildTimeFromReference,
} from './shiftUtils';
import type { ShiftReference } from '@/api/dataverse/types';

describe('getShiftType', () => {
  it('returns day for morning hours (6-13)', () => {
    expect(getShiftType(6)).toBe('day');
    expect(getShiftType(8)).toBe('day');
    expect(getShiftType(13)).toBe('day');
  });

  it('returns night for afternoon/evening hours (14-21)', () => {
    expect(getShiftType(14)).toBe('night');
    expect(getShiftType(18)).toBe('night');
    expect(getShiftType(21)).toBe('night');
  });

  it('returns sleepIn for late night/early morning', () => {
    expect(getShiftType(22)).toBe('sleepIn');
    expect(getShiftType(0)).toBe('sleepIn');
    expect(getShiftType(5)).toBe('sleepIn');
  });
});

describe('formatTime', () => {
  it('formats a valid datetime string to HH:mm', () => {
    expect(formatTime('2026-02-10T08:30:00Z')).toMatch(/\d{2}:\d{2}/);
  });

  it('returns --:-- for invalid input', () => {
    expect(formatTime('not-a-date')).toBe('--:--');
  });
});

describe('calculateShiftDuration', () => {
  it('calculates duration without breaks', () => {
    const start = '2026-02-10T08:00:00Z';
    const end = '2026-02-10T16:00:00Z';
    expect(calculateShiftDuration(start, end)).toBe(8);
  });

  it('subtracts break minutes', () => {
    const start = '2026-02-10T08:00:00Z';
    const end = '2026-02-10T16:00:00Z';
    expect(calculateShiftDuration(start, end, 30)).toBe(7.5);
  });

  it('returns NaN for invalid dates (handled by try/catch)', () => {
    // Invalid date strings produce NaN from differenceInMinutes
    expect(calculateShiftDuration('invalid', 'invalid')).toBeNaN();
  });

  it('returns 0 when end is before start', () => {
    const start = '2026-02-10T16:00:00Z';
    const end = '2026-02-10T08:00:00Z';
    expect(calculateShiftDuration(start, end)).toBe(0);
  });
});

describe('getShiftColour', () => {
  it('returns overtime colour for overtime shifts', () => {
    expect(getShiftColour({ shiftType: 'day', isOvertime: true })).toBe('bg-shift-overtime');
  });

  it('returns day colour', () => {
    expect(getShiftColour({ shiftType: 'day' })).toBe('bg-shift-day');
  });

  it('returns night colour', () => {
    expect(getShiftColour({ shiftType: 'night' })).toBe('bg-shift-night');
  });

  it('returns sleep-in colour', () => {
    expect(getShiftColour({ shiftType: 'sleepIn' })).toBe('bg-shift-sleepin');
  });
});

describe('hasTimeClash', () => {
  it('detects overlapping shifts', () => {
    const shift1 = {
      startTime: new Date('2026-02-10T08:00:00'),
      endTime: new Date('2026-02-10T16:00:00'),
    };
    const shift2 = {
      startTime: new Date('2026-02-10T14:00:00'),
      endTime: new Date('2026-02-10T22:00:00'),
    };
    expect(hasTimeClash(shift1, shift2)).toBe(true);
  });

  it('returns false for non-overlapping shifts', () => {
    const shift1 = {
      startTime: new Date('2026-02-10T06:00:00'),
      endTime: new Date('2026-02-10T14:00:00'),
    };
    const shift2 = {
      startTime: new Date('2026-02-10T14:00:00'),
      endTime: new Date('2026-02-10T22:00:00'),
    };
    expect(hasTimeClash(shift1, shift2)).toBe(false);
  });

  it('detects containment (one shift inside another)', () => {
    const shift1 = {
      startTime: new Date('2026-02-10T06:00:00'),
      endTime: new Date('2026-02-10T22:00:00'),
    };
    const shift2 = {
      startTime: new Date('2026-02-10T10:00:00'),
      endTime: new Date('2026-02-10T14:00:00'),
    };
    expect(hasTimeClash(shift1, shift2)).toBe(true);
  });
});

describe('buildTimeFromReference', () => {
  const mockRef = {
    cp365_shiftreferencestarthour: 8,
    cp365_shiftreferencestartminute: 30,
    cp365_shiftreferenceendhour: 16,
    cp365_shiftreferenceendminute: 0,
  } as ShiftReference;

  it('builds start time string', () => {
    expect(buildTimeFromReference(mockRef, 'start')).toBe('08:30');
  });

  it('builds end time string', () => {
    expect(buildTimeFromReference(mockRef, 'end')).toBe('16:00');
  });

  it('pads single digit hours and minutes', () => {
    const ref = {
      cp365_shiftreferencestarthour: 7,
      cp365_shiftreferencestartminute: 5,
      cp365_shiftreferenceendhour: 9,
      cp365_shiftreferenceendminute: 0,
    } as ShiftReference;
    expect(buildTimeFromReference(ref, 'start')).toBe('07:05');
  });
});
