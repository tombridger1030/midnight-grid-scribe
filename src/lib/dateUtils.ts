/**
 * Date utility functions to handle local date formatting consistently
 * and avoid timezone offset issues that occur with toISOString()
 */

/**
 * Get current date in YYYY-MM-DD format using local timezone
 */
export const getCurrentLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Check if a date string represents today in local timezone
 */
export const isToday = (dateString: string): boolean => {
  return dateString === getCurrentLocalDate();
};

/**
 * Parse a YYYY-MM-DD date string to a Date object at local midnight
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Parse an ISO timestamp string and return local date string (YYYY-MM-DD).
 * Handles strings like "2026-01-12T23:30:00Z" or "2026-01-12T15:30:00-08:00"
 *
 * WARNING: Do NOT use isoTimestamp.split("T")[0] directly!
 * That gives the UTC date, not the local date.
 *
 * @example
 * // At PST (UTC-8), "2026-01-13T06:23:00Z" is actually Jan 12 at 10:23 PM local
 * isoToLocalDateString("2026-01-13T06:23:00Z") // Returns "2026-01-12" (correct)
 * "2026-01-13T06:23:00Z".split("T")[0] // Returns "2026-01-13" (wrong!)
 */
export const isoToLocalDateString = (isoTimestamp: string): string => {
  return formatLocalDate(new Date(isoTimestamp));
};

// Alias for clarity - toLocalDateString is more explicit about the operation
export const toLocalDateString = formatLocalDate;
