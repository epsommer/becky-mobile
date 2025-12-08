/**
 * Timezone-safe date utilities for EST (Toronto, ON Canada) and other timezones
 */

/**
 * Creates a proper local date for the current user's timezone
 * This avoids UTC timezone issues that can cause dates to be off by one day
 * @returns Local date with time set to 00:00:00
 */
export const createLocalDate = (): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Creates a local date for a specific year, month, and day
 * @param year - Full year (e.g., 2025)
 * @param month - Month (0-11, where 0 = January)
 * @param date - Day of the month (1-31)
 * @returns Local date with time set to 00:00:00
 */
export const createLocalDateFromParts = (year: number, month: number, date: number): Date => {
  return new Date(year, month, date)
}

/**
 * Checks if a date is today in the local timezone
 * @param date - Date to check
 * @returns True if the date is today in local timezone
 */
export const isLocalToday = (date: Date): boolean => {
  const today = createLocalDate()
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

/**
 * Gets the start of today in local timezone (00:00:00)
 * @returns Date object set to start of today
 */
export const getStartOfLocalToday = (): Date => {
  return createLocalDate()
}

/**
 * Gets the end of today in local timezone (23:59:59.999)
 * @returns Date object set to end of today
 */
export const getEndOfLocalToday = (): Date => {
  const today = createLocalDate()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
}