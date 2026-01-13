/**
 * Date utility functions to handle local date formatting consistently
 * and avoid timezone offset issues that occur with toISOString()
 */

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
 * Get current date in YYYY-MM-DD format using local timezone
 */
export const getCurrentLocalDate = (): string => formatLocalDate(new Date());

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
