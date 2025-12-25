/**
 * Event Conflict Detection Utilities
 * Detects and manages scheduling conflicts between calendar events
 */
import { Event } from '../lib/api/types';

// ============================================================================
// Types
// ============================================================================

export type ConflictSeverity = 'warning' | 'error';

export interface ConflictDetail {
  id: string;
  severity: ConflictSeverity;
  message: string;
  conflictingEvent: Event;
  proposedEvent: {
    title: string;
    startTime: string;
    endTime: string;
    clientId?: string;
    clientName?: string;
  };
  timeOverlap: {
    start: Date;
    end: Date;
    durationMinutes: number;
  };
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  canProceed: boolean;
}

export interface ProposedEventData {
  id?: string; // If editing an existing event
  title: string;
  startTime: string;
  endTime: string;
  clientId?: string;
  clientName?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a date string to a Date object
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Check if two time ranges overlap
 * Events overlap if one starts before the other ends
 */
function doTimeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Events overlap if: start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate the overlap between two time ranges
 */
function calculateOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): { start: Date; end: Date; durationMinutes: number } | null {
  if (!doTimeRangesOverlap(start1, end1, start2, end2)) {
    return null;
  }

  const overlapStart = start1 > start2 ? start1 : start2;
  const overlapEnd = end1 < end2 ? end1 : end2;
  const durationMinutes = Math.round(
    (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
  );

  return {
    start: overlapStart,
    end: overlapEnd,
    durationMinutes,
  };
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// Main Conflict Detection Functions
// ============================================================================

/**
 * Detect conflicts between a proposed event and existing events
 */
export function detectConflicts(
  proposedEvent: ProposedEventData,
  existingEvents: Event[]
): ConflictResult {
  const conflicts: ConflictDetail[] = [];

  const proposedStart = parseDate(proposedEvent.startTime);
  const proposedEnd = parseDate(proposedEvent.endTime);

  // Filter out the event being edited (if editing)
  const eventsToCheck = proposedEvent.id
    ? existingEvents.filter((e) => e.id !== proposedEvent.id)
    : existingEvents;

  for (const existingEvent of eventsToCheck) {
    const existingStart = parseDate(existingEvent.startTime);
    const existingEnd = parseDate(existingEvent.endTime);

    const overlap = calculateOverlap(
      proposedStart,
      proposedEnd,
      existingStart,
      existingEnd
    );

    if (overlap) {
      conflicts.push({
        id: `conflict_${existingEvent.id}`,
        severity: 'error',
        message: `Overlaps with "${existingEvent.title}" by ${formatDuration(overlap.durationMinutes)} (${formatTime(overlap.start)} - ${formatTime(overlap.end)})`,
        conflictingEvent: existingEvent,
        proposedEvent: {
          title: proposedEvent.title,
          startTime: proposedEvent.startTime,
          endTime: proposedEvent.endTime,
          clientId: proposedEvent.clientId,
          clientName: proposedEvent.clientName,
        },
        timeOverlap: overlap,
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    canProceed: true, // Users can always proceed, but with a warning
  };
}

/**
 * Check for conflicts during drag operations
 * Returns conflicts for a potential new time slot
 */
export function checkDragConflicts(
  draggedEvent: Event,
  newStartTime: Date,
  newEndTime: Date,
  existingEvents: Event[]
): ConflictResult {
  return detectConflicts(
    {
      id: draggedEvent.id,
      title: draggedEvent.title,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      clientId: draggedEvent.clientId,
      clientName: draggedEvent.clientName,
    },
    existingEvents
  );
}

/**
 * Get events that would conflict with a time range
 * Useful for highlighting conflict zones during drag
 */
export function getConflictingEvents(
  startTime: Date,
  endTime: Date,
  existingEvents: Event[],
  excludeEventId?: string
): Event[] {
  const eventsToCheck = excludeEventId
    ? existingEvents.filter((e) => e.id !== excludeEventId)
    : existingEvents;

  return eventsToCheck.filter((event) => {
    const eventStart = parseDate(event.startTime);
    const eventEnd = parseDate(event.endTime);
    return doTimeRangesOverlap(startTime, endTime, eventStart, eventEnd);
  });
}

/**
 * Check if a specific time slot has any conflicts
 * Used for quick conflict highlighting
 */
export function hasConflictAtTime(
  startTime: Date,
  endTime: Date,
  existingEvents: Event[],
  excludeEventId?: string
): boolean {
  return getConflictingEvents(startTime, endTime, existingEvents, excludeEventId).length > 0;
}

/**
 * Get all time slots that would conflict on a given day
 * Returns an array of { start, end } ranges that are occupied
 */
export function getOccupiedTimeSlots(
  date: Date,
  existingEvents: Event[]
): { start: Date; end: Date; eventId: string }[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return existingEvents
    .filter((event) => {
      const eventStart = parseDate(event.startTime);
      const eventEnd = parseDate(event.endTime);
      // Check if event overlaps with this day
      return eventStart <= dayEnd && eventEnd >= dayStart;
    })
    .map((event) => {
      const eventStart = parseDate(event.startTime);
      const eventEnd = parseDate(event.endTime);
      // Clamp to day boundaries
      return {
        start: eventStart < dayStart ? dayStart : eventStart,
        end: eventEnd > dayEnd ? dayEnd : eventEnd,
        eventId: event.id,
      };
    });
}

/**
 * Check if an event time change would cause conflicts
 * Used for resize operations
 */
export function checkResizeConflicts(
  event: Event,
  newStartTime: string,
  newEndTime: string,
  existingEvents: Event[]
): ConflictResult {
  return detectConflicts(
    {
      id: event.id,
      title: event.title,
      startTime: newStartTime,
      endTime: newEndTime,
      clientId: event.clientId,
      clientName: event.clientName,
    },
    existingEvents
  );
}

/**
 * Find the next available time slot after conflicts
 * Suggests alternative times when conflicts are detected
 */
export function findNextAvailableSlot(
  proposedStart: Date,
  duration: number, // in minutes
  existingEvents: Event[],
  options?: {
    maxSearchHours?: number;
    intervalMinutes?: number;
    workHoursStart?: number;
    workHoursEnd?: number;
  }
): Date | null {
  const {
    maxSearchHours = 24,
    intervalMinutes = 15,
    workHoursStart = 8,
    workHoursEnd = 18,
  } = options || {};

  const maxTime = new Date(proposedStart.getTime() + maxSearchHours * 60 * 60 * 1000);
  let currentStart = new Date(proposedStart);

  while (currentStart < maxTime) {
    // Skip non-working hours
    const hour = currentStart.getHours();
    if (hour < workHoursStart || hour >= workHoursEnd) {
      // Move to next working hours
      if (hour >= workHoursEnd) {
        currentStart.setDate(currentStart.getDate() + 1);
        currentStart.setHours(workHoursStart, 0, 0, 0);
      } else {
        currentStart.setHours(workHoursStart, 0, 0, 0);
      }
      continue;
    }

    const currentEnd = new Date(currentStart.getTime() + duration * 60 * 1000);

    // Check if this slot is available
    const conflicts = getConflictingEvents(currentStart, currentEnd, existingEvents);
    if (conflicts.length === 0) {
      return currentStart;
    }

    // Move to next interval
    currentStart = new Date(currentStart.getTime() + intervalMinutes * 60 * 1000);
  }

  return null;
}
