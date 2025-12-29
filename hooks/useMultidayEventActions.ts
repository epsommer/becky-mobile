/**
 * useMultidayEventActions - Hook for managing multiday event validation and conflicts
 *
 * Features:
 * - Validate date ranges (end after start)
 * - Check for conflicts with existing events
 * - Show conflict warning modal
 * - Calculate event duration
 */
import { useState, useCallback, useMemo } from 'react';
import { Event } from '../lib/api/types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ConflictEvent {
  event: Event;
  overlapStart: Date;
  overlapEnd: Date;
}

interface MultidayConflictState {
  visible: boolean;
  conflicts: ConflictEvent[];
  proposedStart: Date | null;
  proposedEnd: Date | null;
}

interface UseMultidayEventActionsOptions {
  /** All existing events for conflict checking */
  events: Event[];
  /** Event ID to exclude from conflict check (when editing) */
  excludeEventId?: string;
}

interface UseMultidayEventActionsReturn {
  /** State for conflict warning modal */
  conflictState: MultidayConflictState;
  /** Validate that end date is after start date */
  validateDateRange: (start: Date, end: Date) => ValidationResult;
  /** Check for conflicts with existing events */
  checkConflicts: (start: Date, end: Date) => ConflictEvent[];
  /** Show conflict warning modal */
  showConflictWarning: (conflicts: ConflictEvent[], start: Date, end: Date) => void;
  /** Dismiss conflict warning */
  dismissConflictWarning: () => void;
  /** Calculate duration in days between two dates */
  calculateDurationDays: (start: Date, end: Date) => number;
  /** Format duration for display */
  formatDuration: (start: Date, end: Date) => string;
  /** Check if event spans multiple days */
  isMultiDay: (start: Date, end: Date) => boolean;
}

export function useMultidayEventActions({
  events,
  excludeEventId,
}: UseMultidayEventActionsOptions): UseMultidayEventActionsReturn {
  const [conflictState, setConflictState] = useState<MultidayConflictState>({
    visible: false,
    conflicts: [],
    proposedStart: null,
    proposedEnd: null,
  });

  // Filter events that can conflict (exclude the event being edited)
  const conflictableEvents = useMemo(() => {
    if (!excludeEventId) return events;
    return events.filter(e => e.id !== excludeEventId);
  }, [events, excludeEventId]);

  // Validate date range
  const validateDateRange = useCallback((start: Date, end: Date): ValidationResult => {
    // Ensure both are valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        isValid: false,
        error: 'Invalid date format',
      };
    }

    // Check end is after start
    if (end <= start) {
      return {
        isValid: false,
        error: 'End date must be after start date',
      };
    }

    // Check reasonable range (max 30 days for now)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      return {
        isValid: false,
        error: 'Event cannot span more than 30 days',
      };
    }

    return { isValid: true };
  }, []);

  // Check for conflicts
  const checkConflicts = useCallback((start: Date, end: Date): ConflictEvent[] => {
    const conflicts: ConflictEvent[] = [];

    for (const event of conflictableEvents) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Check for overlap: events overlap if start1 < end2 AND end1 > start2
      if (start < eventEnd && end > eventStart) {
        // Calculate overlap period
        const overlapStart = start > eventStart ? start : eventStart;
        const overlapEnd = end < eventEnd ? end : eventEnd;

        conflicts.push({
          event,
          overlapStart,
          overlapEnd,
        });
      }
    }

    return conflicts;
  }, [conflictableEvents]);

  // Show conflict warning modal
  const showConflictWarning = useCallback((
    conflicts: ConflictEvent[],
    start: Date,
    end: Date
  ) => {
    setConflictState({
      visible: true,
      conflicts,
      proposedStart: start,
      proposedEnd: end,
    });
  }, []);

  // Dismiss conflict warning
  const dismissConflictWarning = useCallback(() => {
    setConflictState({
      visible: false,
      conflicts: [],
      proposedStart: null,
      proposedEnd: null,
    });
  }, []);

  // Calculate duration in days
  const calculateDurationDays = useCallback((start: Date, end: Date): number => {
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Format duration for display
  const formatDuration = useCallback((start: Date, end: Date): string => {
    const days = calculateDurationDays(start, end);

    if (days === 1) {
      // Same day - show hours
      const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      if (hours === 1) return '1 hour';
      return `${hours} hours`;
    }

    if (days === 2) return '2 days';
    return `${days} days`;
  }, [calculateDurationDays]);

  // Check if event spans multiple days
  const isMultiDay = useCallback((start: Date, end: Date): boolean => {
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    return endDay.getTime() > startDay.getTime();
  }, []);

  return {
    conflictState,
    validateDateRange,
    checkConflicts,
    showConflictWarning,
    dismissConflictWarning,
    calculateDurationDays,
    formatDuration,
    isMultiDay,
  };
}
