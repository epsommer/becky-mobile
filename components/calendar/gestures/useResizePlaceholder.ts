/**
 * useResizePlaceholder - Hook for resizing the placeholder after creation
 * Handles resize gestures for editing mode with 15-minute snap behavior
 */
import { useCallback, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import {
  pixelsToMinutes,
  snapToGrid,
  triggerSnapHaptic,
  triggerDayBoundaryHaptic,
  clampDuration,
  PIXELS_PER_HOUR,
  SNAP_MINUTES,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
} from './gestureUtils';

export type ResizeHandle = 'top' | 'bottom' | 'left' | 'right';

export interface PlaceholderBounds {
  startHour: number;
  startMinutes: number;
  endHour: number;
  endMinutes: number;
  startDayIndex: number;
  daySpan: number;
}

export interface ResizeCallbacks {
  onBoundsChange: (bounds: PlaceholderBounds) => void;
  onResizeComplete: () => void;
}

export interface UseResizePlaceholderOptions {
  initialBounds: PlaceholderBounds;
  pixelsPerHour?: number;
  snapMinutes?: number;
  dayColumnWidth?: number;
  maxDays?: number;
  callbacks: ResizeCallbacks;
}

export interface UseResizePlaceholderResult {
  handleResizeStart: (handle: ResizeHandle) => void;
  handleResizeMove: (handle: ResizeHandle, delta: { x: number; y: number }) => void;
  handleResizeEnd: (handle: ResizeHandle) => void;
}

export function useResizePlaceholder({
  initialBounds,
  pixelsPerHour = PIXELS_PER_HOUR,
  snapMinutes = SNAP_MINUTES,
  dayColumnWidth = 50,
  maxDays = 7,
  callbacks,
}: UseResizePlaceholderOptions): UseResizePlaceholderResult {
  // Track the bounds at resize start
  const boundsAtStartRef = useRef<PlaceholderBounds>({ ...initialBounds });
  const activeHandleRef = useRef<ResizeHandle | null>(null);
  const lastSnappedDeltaRef = useRef({ x: 0, y: 0 });

  /**
   * Calculate minutes from vertical pixel delta
   */
  const pixelDeltaToMinutes = useCallback(
    (deltaY: number): number => {
      const rawMinutes = pixelsToMinutes(deltaY, pixelsPerHour);
      // Snap to intervals
      return Math.round(rawMinutes / snapMinutes) * snapMinutes;
    },
    [pixelsPerHour, snapMinutes]
  );

  /**
   * Calculate day change from horizontal pixel delta
   */
  const pixelDeltaToDays = useCallback(
    (deltaX: number): number => {
      return Math.round(deltaX / dayColumnWidth);
    },
    [dayColumnWidth]
  );

  /**
   * Convert hour/minutes to total minutes for easier math
   */
  const toTotalMinutes = (hour: number, minutes: number): number => {
    return hour * 60 + minutes;
  };

  /**
   * Convert total minutes back to hour/minutes
   */
  const fromTotalMinutes = (
    totalMinutes: number
  ): { hour: number; minutes: number } => {
    // Clamp to valid range (0:00 to 23:45)
    const clamped = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));
    return {
      hour: Math.floor(clamped / 60),
      minutes: clamped % 60,
    };
  };

  /**
   * Handle resize start
   */
  const handleResizeStart = useCallback((handle: ResizeHandle) => {
    boundsAtStartRef.current = { ...initialBounds };
    activeHandleRef.current = handle;
    lastSnappedDeltaRef.current = { x: 0, y: 0 };
  }, [initialBounds]);

  /**
   * Handle resize move - update bounds based on handle and delta
   */
  const handleResizeMove = useCallback(
    (handle: ResizeHandle, delta: { x: number; y: number }) => {
      const startBounds = boundsAtStartRef.current;
      let newBounds = { ...startBounds };

      // Snap the delta
      const snappedDeltaY =
        Math.round(delta.y / (pixelsPerHour / 4)) * (pixelsPerHour / 4);
      const snappedDeltaX =
        Math.round(delta.x / dayColumnWidth) * dayColumnWidth;

      // Check for snap boundary crossing for haptic
      const minuteDelta = pixelDeltaToMinutes(snappedDeltaY);
      const dayDelta = pixelDeltaToDays(snappedDeltaX);

      if (
        snappedDeltaY !== lastSnappedDeltaRef.current.y ||
        snappedDeltaX !== lastSnappedDeltaRef.current.x
      ) {
        if (snappedDeltaY !== lastSnappedDeltaRef.current.y) {
          triggerSnapHaptic();
        }
        if (snappedDeltaX !== lastSnappedDeltaRef.current.x && dayDelta !== 0) {
          triggerDayBoundaryHaptic();
        }
        lastSnappedDeltaRef.current = { x: snappedDeltaX, y: snappedDeltaY };
      }

      // Calculate new bounds based on handle
      switch (handle) {
        case 'top': {
          // Move start time (start earlier = negative delta, start later = positive delta)
          const startTotal = toTotalMinutes(
            startBounds.startHour,
            startBounds.startMinutes
          );
          const newStartTotal = startTotal + minuteDelta;
          const endTotal = toTotalMinutes(
            startBounds.endHour,
            startBounds.endMinutes
          );

          // Ensure minimum duration
          const maxNewStart = endTotal - MIN_DURATION_MINUTES;
          const clampedStartTotal = Math.min(newStartTotal, maxNewStart);

          const newStart = fromTotalMinutes(clampedStartTotal);
          newBounds.startHour = newStart.hour;
          newBounds.startMinutes = newStart.minutes;
          break;
        }

        case 'bottom': {
          // Move end time (end later = positive delta, end earlier = negative delta)
          const endTotal = toTotalMinutes(
            startBounds.endHour,
            startBounds.endMinutes
          );
          const newEndTotal = endTotal + minuteDelta;
          const startTotal = toTotalMinutes(
            startBounds.startHour,
            startBounds.startMinutes
          );

          // Ensure minimum duration
          const minNewEnd = startTotal + MIN_DURATION_MINUTES;
          const clampedEndTotal = Math.max(newEndTotal, minNewEnd);

          const newEnd = fromTotalMinutes(clampedEndTotal);
          newBounds.endHour = newEnd.hour;
          newBounds.endMinutes = newEnd.minutes;
          break;
        }

        case 'left': {
          // Move start day (earlier days = negative delta)
          const newStartDayIndex = Math.max(
            0,
            Math.min(maxDays - 1, startBounds.startDayIndex + dayDelta)
          );
          const dayChange = newStartDayIndex - startBounds.startDayIndex;

          // Recalculate daySpan
          const originalEndDayIndex =
            startBounds.startDayIndex + startBounds.daySpan - 1;
          const newDaySpan = originalEndDayIndex - newStartDayIndex + 1;

          if (newDaySpan >= 1) {
            newBounds.startDayIndex = newStartDayIndex;
            newBounds.daySpan = newDaySpan;
          }
          break;
        }

        case 'right': {
          // Move end day (later days = positive delta)
          const originalEndDayIndex =
            startBounds.startDayIndex + startBounds.daySpan - 1;
          const newEndDayIndex = Math.max(
            startBounds.startDayIndex,
            Math.min(maxDays - 1, originalEndDayIndex + dayDelta)
          );

          // Recalculate daySpan
          const newDaySpan = newEndDayIndex - startBounds.startDayIndex + 1;

          if (newDaySpan >= 1) {
            newBounds.daySpan = newDaySpan;
          }
          break;
        }
      }

      callbacks.onBoundsChange(newBounds);
    },
    [
      pixelsPerHour,
      dayColumnWidth,
      pixelDeltaToMinutes,
      pixelDeltaToDays,
      maxDays,
      callbacks,
    ]
  );

  /**
   * Handle resize end
   */
  const handleResizeEnd = useCallback(
    (handle: ResizeHandle) => {
      activeHandleRef.current = null;
      callbacks.onResizeComplete();
    },
    [callbacks]
  );

  return {
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
  };
}

export default useResizePlaceholder;
