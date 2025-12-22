/**
 * Formatters
 * General-purpose formatting utilities
 */

/**
 * Format a number as hours (e.g., 7.5 -> "7.5 hrs")
 */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hrs`;
}

/**
 * Format a number as currency (GBP)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Format a phone number for UK
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as UK number
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  return phone;
}

/**
 * Format a postcode
 */
export function formatPostcode(postcode: string): string {
  const clean = postcode.replace(/\s/g, '').toUpperCase();
  if (clean.length < 5) return clean;
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
}

/**
 * Format a name (capitalise each word)
 */
export function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format a file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format staff ID with leading zeros
 */
export function formatStaffId(id: string | number, length: number = 6): string {
  return String(id).padStart(length, '0');
}

/**
 * Pluralise a word
 */
export function pluralise(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${pluralise(diffMin, 'minute')} ago`;
  if (diffHour < 24) return `${diffHour} ${pluralise(diffHour, 'hour')} ago`;
  if (diffDay < 7) return `${diffDay} ${pluralise(diffDay, 'day')} ago`;

  return date.toLocaleDateString('en-GB');
}

