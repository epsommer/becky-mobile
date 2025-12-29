/**
 * useDragToCreate - Hook for long-press + pan gesture to create calendar events
 * Handles day view, week view, and month view creation patterns
 */
import { useCallback, useRef, useState, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import {
  yToTime,
  snapToGrid,
  pixelsToMinutes,
  minutesToPixels,
  clampDuration,
  crossedSnapBoundary,
  triggerSnapHaptic,
  triggerLongPressHaptic,
  triggerCompletionHaptic,
  triggerDayBoundaryHaptic,
  xToDayIndex,
  getDayFromIndex,
  PIXELS_PER_HOUR,
  SNAP_MINUTES,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  LONG_PRESS_DURATION_MS,
} from './gestureUtils';

export type DragViewType = 'day' | 'week' | 'month';

export interface DragState {
  isDragging: boolean;
  startDate: string;
  startHour: number;
  startMinutes: number;
  endDate: string;
  endHour: number;
  endMinutes: number;
  durationMinutes: number;
  isMultiDay: boolean;
  daySpan: number;
}

export interface UseDragToCreateOptions {
  viewType: DragViewType;
  pixelsPerHour?: number;
  snapMinutes?: number;
  gridTop?: number;
  gridLeft?: number;
  timeColumnWidth?: number;
  dayColumnWidth?: number;
  startDate: Date;
  onDragStart?: (state: DragState) => void;
  onDragUpdate?: (state: DragState) => void;
  onDragEnd?: (state: DragState) => void;
  onDragCancel?: () => void;
  enabled?: boolean;
}

export interface UseDragToCreateResult {
  gesture: ReturnType<typeof Gesture.LongPress | typeof Gesture.Pan>;
  composedGesture: ReturnType<typeof Gesture.Simultaneous>;
  dragState: DragState | null;
  isDragging: boolean;
  cancelDrag: () => void;
}

const initialDragState: DragState = {
  isDragging: false,
  startDate: '',
  startHour: 0,
  startMinutes: 0,
  endDate: '',
  endHour: 0,
  endMinutes: 0,
  durationMinutes: MIN_DURATION_MINUTES,
  isMultiDay: false,
  daySpan: 1,
};

export function useDragToCreate({
  viewType,
  pixelsPerHour = PIXELS_PER_HOUR,
  snapMinutes = SNAP_MINUTES,
  gridTop = 0,
  gridLeft = 0,
  timeColumnWidth = 40,
  dayColumnWidth = 50,
  startDate,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDragCancel,
  enabled = true,
}: UseDragToCreateOptions): UseDragToCreateResult {
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Refs for tracking gesture state (avoid stale closures in worklets)
  const dragStateRef = useRef<DragState | null>(null);
  const lastDurationRef = useRef(MIN_DURATION_MINUTES);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startDayIndexRef = useRef(0);

  // Shared values for smooth animations
  const isDraggingShared = useSharedValue(false);

  // Cancel drag
  const cancelDrag = useCallback(() => {
    setDragState(null);
    dragStateRef.current = null;
    isDraggingShared.value = false;
    onDragCancel?.();
  }, [isDraggingShared, onDragCancel]);

  // Calculate new duration based on drag
  const calculateDuration = useCallback(
    (translationY: number): number => {
      const rawMinutes = pixelsToMinutes(translationY, pixelsPerHour);
      // Snap to intervals
      const snappedMinutes = Math.round(rawMinutes / snapMinutes) * snapMinutes;
      // Add to initial 15-minute duration
      const newDuration = MIN_DURATION_MINUTES + snappedMinutes;
      // Clamp to valid range
      return clampDuration(newDuration, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES);
    },
    [pixelsPerHour, snapMinutes]
  );

  // Update drag state with new duration
  const updateDragState = useCallback(
    (duration: number, dayIndex?: number) => {
      if (!dragStateRef.current) return;

      const currentState = dragStateRef.current;
      const currentDayIndex = dayIndex ?? startDayIndexRef.current;

      // Check for snap boundary crossing for haptic
      if (crossedSnapBoundary(lastDurationRef.current, duration, snapMinutes)) {
        triggerSnapHaptic();
      }
      lastDurationRef.current = duration;

      // Calculate end time
      const startMinutesTotal = currentState.startHour * 60 + currentState.startMinutes;
      const endMinutesTotal = startMinutesTotal + duration;

      // Clamp to not exceed midnight
      const clampedEndMinutes = Math.min(endMinutesTotal, 24 * 60 - snapMinutes);
      const endHour = Math.floor(clampedEndMinutes / 60);
      const endMinutes = clampedEndMinutes % 60;

      // Handle multi-day for week view
      let endDate = currentState.startDate;
      let isMultiDay = false;
      let daySpan = 1;

      if (viewType === 'week' && dayIndex !== undefined && dayIndex !== startDayIndexRef.current) {
        // Multi-day event in week view
        triggerDayBoundaryHaptic();
        const newDate = getDayFromIndex(startDate, dayIndex);
        endDate = newDate.toISOString().split('T')[0];
        isMultiDay = true;
        daySpan = Math.abs(dayIndex - startDayIndexRef.current) + 1;
      }

      const newState: DragState = {
        ...currentState,
        endDate,
        endHour,
        endMinutes,
        durationMinutes: duration,
        isMultiDay,
        daySpan,
      };

      dragStateRef.current = newState;
      setDragState(newState);
      onDragUpdate?.(newState);
    },
    [snapMinutes, viewType, startDate, onDragUpdate]
  );

  // Handle long press start
  const handleLongPressStart = useCallback(
    (y: number, x: number) => {
      if (!enabled) return;

      // Trigger haptic feedback
      triggerLongPressHaptic();

      // Calculate time from Y position
      const { hour, minutes } = yToTime(y, gridTop, pixelsPerHour, snapMinutes);

      // Calculate day index for week view
      let dayIndex = 0;
      let eventDate = startDate.toISOString().split('T')[0];

      if (viewType === 'week') {
        dayIndex = xToDayIndex(x, gridLeft, timeColumnWidth, dayColumnWidth);
        const date = getDayFromIndex(startDate, dayIndex);
        eventDate = date.toISOString().split('T')[0];
        startDayIndexRef.current = dayIndex;
      }

      // For month view, use the provided date directly
      if (viewType === 'month') {
        // Hour defaults to 9 AM for month view
        const monthHour = 9;
        const monthMinutes = 0;

        const newState: DragState = {
          isDragging: true,
          startDate: eventDate,
          startHour: monthHour,
          startMinutes: monthMinutes,
          endDate: eventDate,
          endHour: monthHour + 1,
          endMinutes: monthMinutes,
          durationMinutes: 60,
          isMultiDay: false,
          daySpan: 1,
        };

        dragStateRef.current = newState;
        setDragState(newState);
        isDraggingShared.value = true;
        startYRef.current = y;
        startXRef.current = x;
        lastDurationRef.current = 60;
        onDragStart?.(newState);
        return;
      }

      // Day and week view initial state
      const newState: DragState = {
        isDragging: true,
        startDate: eventDate,
        startHour: hour,
        startMinutes: minutes,
        endDate: eventDate,
        endHour: hour,
        endMinutes: minutes + MIN_DURATION_MINUTES,
        durationMinutes: MIN_DURATION_MINUTES,
        isMultiDay: false,
        daySpan: 1,
      };

      // Handle end minutes overflow
      if (newState.endMinutes >= 60) {
        newState.endHour += 1;
        newState.endMinutes -= 60;
      }

      dragStateRef.current = newState;
      setDragState(newState);
      isDraggingShared.value = true;
      startYRef.current = y;
      startXRef.current = x;
      lastDurationRef.current = MIN_DURATION_MINUTES;
      onDragStart?.(newState);
    },
    [
      enabled,
      gridTop,
      gridLeft,
      pixelsPerHour,
      snapMinutes,
      timeColumnWidth,
      dayColumnWidth,
      startDate,
      viewType,
      isDraggingShared,
      onDragStart,
    ]
  );

  // Handle pan update
  const handlePanUpdate = useCallback(
    (translationY: number, translationX: number, absoluteX: number) => {
      if (!dragStateRef.current) return;

      if (viewType === 'month') {
        // Month view: horizontal drag for multi-day selection
        const dayChange = Math.round(translationX / dayColumnWidth);
        if (dayChange !== 0) {
          const currentState = dragStateRef.current;
          const startDayIndex = startDayIndexRef.current;
          const newDayIndex = startDayIndex + dayChange;

          if (newDayIndex >= 0 && newDayIndex <= 6) {
            const daySpan = Math.abs(dayChange) + 1;
            const endDate = getDayFromIndex(startDate, newDayIndex);

            const newState: DragState = {
              ...currentState,
              endDate: endDate.toISOString().split('T')[0],
              isMultiDay: daySpan > 1,
              daySpan,
            };

            if (currentState.daySpan !== daySpan) {
              triggerDayBoundaryHaptic();
            }

            dragStateRef.current = newState;
            setDragState(newState);
            onDragUpdate?.(newState);
          }
        }
        return;
      }

      // Day/Week view: vertical drag for duration
      const newDuration = calculateDuration(translationY);

      // Week view: also check for horizontal movement (day change)
      if (viewType === 'week') {
        const currentDayIndex = xToDayIndex(
          absoluteX,
          gridLeft,
          timeColumnWidth,
          dayColumnWidth
        );
        updateDragState(newDuration, currentDayIndex);
      } else {
        updateDragState(newDuration);
      }
    },
    [
      viewType,
      dayColumnWidth,
      startDate,
      calculateDuration,
      updateDragState,
      gridLeft,
      timeColumnWidth,
      onDragUpdate,
    ]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!dragStateRef.current) return;

    const finalState = dragStateRef.current;
    triggerCompletionHaptic();

    // Reset state
    isDraggingShared.value = false;

    // Call completion callback
    onDragEnd?.(finalState);

    // Keep the state for transition animation, parent will clear it
  }, [isDraggingShared, onDragEnd]);

  // Long press gesture
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(LONG_PRESS_DURATION_MS)
        .enabled(enabled)
        .onStart((event) => {
          runOnJS(handleLongPressStart)(event.y, event.x);
        }),
    [enabled, handleLongPressStart]
  );

  // Pan gesture (activated after long press)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_DURATION_MS)
        .enabled(enabled)
        .activeOffsetY([-5, 5])
        .activeOffsetX([-5, 5])
        .onUpdate((event) => {
          runOnJS(handlePanUpdate)(event.translationY, event.translationX, event.absoluteX);
        })
        .onEnd(() => {
          runOnJS(handleDragEnd)();
        })
        .onFinalize(() => {
          // Handle cancellation if needed
        }),
    [enabled, handlePanUpdate, handleDragEnd]
  );

  // Compose gestures to run simultaneously
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(longPressGesture, panGesture),
    [longPressGesture, panGesture]
  );

  return {
    gesture: panGesture,
    composedGesture,
    dragState,
    isDragging: dragState?.isDragging ?? false,
    cancelDrag,
  };
}

export default useDragToCreate;
