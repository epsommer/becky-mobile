/**
 * Gesture utility functions for calendar interactions
 * Provides time calculations, snapping, and coordinate conversion
 */
import * as Haptics from 'expo-haptics';

// Constants
export const PIXELS_PER_HOUR = 60;
export const SNAP_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 12 * 60; // 12 hours
export const LONG_PRESS_DURATION_MS = 400; // Reduced from 500ms for snappier feel
export const DRAG_THRESHOLD_PX = 5;

/**
 * Convert Y position to time (hours + minutes)
 */
export function yToTime(
  y: number,
  gridTop: number,
  pixelsPerHour: number = PIXELS_PER_HOUR,
  snapMinutes: number = SNAP_MINUTES
): { hour: number; minutes: number } {
  const relativeY = Math.max(0, y - gridTop);
  const totalMinutes = (relativeY / pixelsPerHour) * 60;
  const clampedMinutes = Math.min(totalMinutes, 23 * 60 + 45);

  const hour = Math.floor(clampedMinutes / 60);
  const rawMinutes = clampedMinutes % 60;
  const snappedMinutes = Math.round(rawMinutes / snapMinutes) * snapMinutes;

  // Handle overflow when snapping causes minutes to equal 60
  const finalHour = snappedMinutes === 60 ? hour + 1 : hour;
  const finalMinutes = snappedMinutes === 60 ? 0 : snappedMinutes;

  return {
    hour: Math.max(0, Math.min(23, finalHour)),
    minutes: Math.min(45, Math.max(0, finalMinutes)),
  };
}

/**
 * Convert time (hours + minutes) to Y position
 */
export function timeToY(
  hour: number,
  minutes: number,
  gridTop: number,
  pixelsPerHour: number = PIXELS_PER_HOUR
): number {
  const totalHours = hour + minutes / 60;
  return gridTop + totalHours * pixelsPerHour;
}

/**
 * Snap translation to time intervals
 */
export function snapToGrid(
  translation: number,
  pixelsPerHour: number = PIXELS_PER_HOUR,
  snapMinutes: number = SNAP_MINUTES
): number {
  const pixelsPerSnap = (pixelsPerHour / 60) * snapMinutes;
  return Math.round(translation / pixelsPerSnap) * pixelsPerSnap;
}

/**
 * Calculate duration in minutes from pixel offset
 */
export function pixelsToMinutes(
  pixels: number,
  pixelsPerHour: number = PIXELS_PER_HOUR
): number {
  return Math.round((pixels / pixelsPerHour) * 60);
}

/**
 * Calculate pixel offset from duration in minutes
 */
export function minutesToPixels(
  minutes: number,
  pixelsPerHour: number = PIXELS_PER_HOUR
): number {
  return (minutes / 60) * pixelsPerHour;
}

/**
 * Format time for display
 */
export function formatTime(hour: number, minutes: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHour}:${displayMinutes} ${period}`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Calculate date from day index in week view
 */
export function getDayFromIndex(
  startDate: Date,
  dayIndex: number
): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() - date.getDay() + dayIndex);
  return date;
}

/**
 * Convert X position to day index in week view
 */
export function xToDayIndex(
  x: number,
  gridLeft: number,
  timeColumnWidth: number,
  dayColumnWidth: number,
  maxDayIndex: number = 6
): number {
  const relativeX = x - gridLeft - timeColumnWidth;
  const dayIndex = Math.floor(relativeX / dayColumnWidth);
  return Math.max(0, Math.min(maxDayIndex, dayIndex));
}

/**
 * Clamp duration to valid range
 */
export function clampDuration(
  minutes: number,
  minMinutes: number = MIN_DURATION_MINUTES,
  maxMinutes: number = MAX_DURATION_MINUTES
): number {
  return Math.max(minMinutes, Math.min(maxMinutes, minutes));
}

/**
 * Check if new duration crosses a snap boundary (for haptic feedback)
 */
export function crossedSnapBoundary(
  oldMinutes: number,
  newMinutes: number,
  snapMinutes: number = SNAP_MINUTES
): boolean {
  const oldSnapped = Math.floor(oldMinutes / snapMinutes);
  const newSnapped = Math.floor(newMinutes / snapMinutes);
  return oldSnapped !== newSnapped;
}

// Haptic feedback helpers with throttling
let lastHapticTime = 0;
const HAPTIC_THROTTLE_MS = 50;

/**
 * Trigger haptic feedback for snap points
 */
export function triggerSnapHaptic(): void {
  const now = Date.now();
  if (now - lastHapticTime > HAPTIC_THROTTLE_MS) {
    Haptics.selectionAsync();
    lastHapticTime = now;
  }
}

/**
 * Trigger haptic feedback for long press activation
 */
export function triggerLongPressHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Trigger haptic feedback for day boundary crossing
 */
export function triggerDayBoundaryHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Trigger haptic feedback for event creation completion
 */
export function triggerCompletionHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Trigger haptic feedback for approaching limits
 */
export function triggerWarningHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Create a Date object from date string and time components
 */
export function createDateTime(
  dateStr: string,
  hour: number,
  minutes: number
): Date {
  const date = new Date(dateStr);
  date.setHours(hour, minutes, 0, 0);
  return date;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const end = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((end.getTime() - start.getTime()) / oneDay);
}
