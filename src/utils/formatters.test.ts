/**
 * Formatters Tests
 */

import {
  formatHours,
  formatCurrency,
  formatPhoneNumber,
  formatPostcode,
  formatName,
  getInitials,
  truncate,
  formatFileSize,
  formatStaffId,
  pluralise,
} from './formatters';

describe('formatHours', () => {
  it('formats whole hours', () => {
    expect(formatHours(8)).toBe('8 hrs');
  });

  it('formats fractional hours', () => {
    expect(formatHours(7.5)).toBe('7.5 hrs');
  });

  it('rounds to one decimal place', () => {
    expect(formatHours(7.25)).toBe('7.3 hrs');
  });

  it('handles zero', () => {
    expect(formatHours(0)).toBe('0 hrs');
  });
});

describe('formatCurrency', () => {
  it('formats GBP correctly', () => {
    expect(formatCurrency(1234.5)).toBe('£1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('£0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-50)).toBe('-£50.00');
  });
});

describe('formatPhoneNumber', () => {
  it('formats a clean 11-digit UK number', () => {
    expect(formatPhoneNumber('01234567890')).toBe('01234 567 890');
  });

  it('strips non-digit chars and formats', () => {
    // '01onal612345678' → digits '01612345678' (11 digits starting with 0)
    expect(formatPhoneNumber('01onal612345678')).toBe('01612 345 678');
  });

  it('returns unchanged for non-UK format', () => {
    expect(formatPhoneNumber('+1 555 123 4567')).toBe('+1 555 123 4567');
  });
});

describe('formatPostcode', () => {
  it('formats a postcode with correct spacing', () => {
    expect(formatPostcode('SW1A1AA')).toBe('SW1A 1AA');
  });

  it('handles already-spaced postcodes', () => {
    expect(formatPostcode('SW1A 1AA')).toBe('SW1A 1AA');
  });

  it('uppercases lowercase input', () => {
    expect(formatPostcode('sw1a1aa')).toBe('SW1A 1AA');
  });

  it('handles short postcodes', () => {
    expect(formatPostcode('AB1')).toBe('AB1');
  });
});

describe('formatName', () => {
  it('capitalises each word', () => {
    expect(formatName('john smith')).toBe('John Smith');
  });

  it('handles all-caps input', () => {
    expect(formatName('JOHN SMITH')).toBe('John Smith');
  });

  it('handles single name', () => {
    expect(formatName('jane')).toBe('Jane');
  });
});

describe('getInitials', () => {
  it('returns first two initials', () => {
    expect(getInitials('John Smith')).toBe('JS');
  });

  it('returns single initial for one word', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('limits to two characters', () => {
    expect(getInitials('John Michael Smith')).toBe('JM');
  });

  it('uppercases the result', () => {
    expect(getInitials('john smith')).toBe('JS');
  });
});

describe('truncate', () => {
  it('returns original if shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns original if exactly max length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates with ellipsis if longer', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });
});

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('formats with decimal', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('formatStaffId', () => {
  it('pads with leading zeros', () => {
    expect(formatStaffId('42')).toBe('000042');
  });

  it('handles numeric input', () => {
    expect(formatStaffId(7)).toBe('000007');
  });

  it('uses custom length', () => {
    expect(formatStaffId('42', 4)).toBe('0042');
  });

  it('does not truncate longer IDs', () => {
    expect(formatStaffId('1234567')).toBe('1234567');
  });
});

describe('pluralise', () => {
  it('returns singular for count of 1', () => {
    expect(pluralise(1, 'shift')).toBe('shift');
  });

  it('appends s for plural by default', () => {
    expect(pluralise(2, 'shift')).toBe('shifts');
  });

  it('uses custom plural form', () => {
    expect(pluralise(2, 'person', 'people')).toBe('people');
  });

  it('returns plural for zero', () => {
    expect(pluralise(0, 'shift')).toBe('shifts');
  });
});
