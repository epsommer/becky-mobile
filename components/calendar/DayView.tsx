/**
 * DayView - Daily calendar view with hour slots and drag-drop events
 * Includes conflict highlighting during drag operations
 * Supports long-press drag-to-create for new events with persistent placeholder
 */
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import EventBlock, { PIXELS_PER_HOUR } from './EventBlock';
import { getConflictingEvents } from '../../utils/eventConflicts';
import PlaceholderContainer, { ResizeHandleType } from './PlaceholderContainer';
import { useDragToCreate, DragState, minutesToPixels, timeToY } from './gestures';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORKING_HOURS_START = 6;
const WORKING_HOURS_END = 22;

interface DayViewProps {
  date: Date;
  events: Event[];
  onEventPress?: (event: Event) => void;
  onTimeSlotPress?: (date: Date, hour: number) => void;
  onEventUpdate?: (event: Event, newStart: string, newEnd: string) => void;
  onEventCreate?: (startDate: Date, endDate: Date) => void;
}

export default function DayView({
  date,
  events,
  onEventPress,
  onTimeSlotPress,
  onEventUpdate,
  onEventCreate,
}: DayViewProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Track scroll offset for fixed placeholder positioning
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizingEvent, setResizingEvent] = useState<Event | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null);
  const [resizeOffset, setResizeOffset] = useState(0);

  // Track grid layout for gesture calculations
  const [gridTop, setGridTop] = useState(0);

  // Track initial bounds when placeholder resize starts (for cumulative gesture tracking)
  const initialPlaceholderBoundsRef = useRef<{
    startHour: number;
    startMinutes: number;
    endHour: number;
    endMinutes: number;
  } | null>(null);

  // Handle grid layout
  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    setGridTop(event.nativeEvent.layout.y);
  }, []);

  // Drag-to-create hook handlers
  const handleCreateDragStart = useCallback((state: DragState) => {
    console.log('[DayView] Drag-to-create started:', state);
  }, []);

  const handleCreateDragUpdate = useCallback((state: DragState) => {
    // Placeholder updates automatically via dragState
  }, []);

  const handleCreateDragEnd = useCallback((state: DragState) => {
    console.log('[DayView] Drag-to-create confirmed:', state);
    if (onEventCreate) {
      const startDate = new Date(state.startDate);
      startDate.setHours(state.startHour, state.startMinutes, 0, 0);

      const endDate = new Date(state.endDate);
      endDate.setHours(state.endHour, state.endMinutes, 0, 0);

      onEventCreate(startDate, endDate);
    }
  }, [onEventCreate]);

  const handleCreateDragCancel = useCallback(() => {
    console.log('[DayView] Drag-to-create cancelled');
  }, []);

  const handleEditingStart = useCallback((state: DragState) => {
    console.log('[DayView] Placeholder editing started:', state);
  }, []);

  const {
    composedGesture,
    dragState,
    isDragging: isCreating,
    isEditing: isPlaceholderEditing,
    cancelDrag,
    confirmPlaceholder,
    updatePlaceholderBounds,
  } = useDragToCreate({
    viewType: 'day',
    pixelsPerHour: PIXELS_PER_HOUR,
    gridTop,
    startDate: date,
    onDragStart: handleCreateDragStart,
    onDragUpdate: handleCreateDragUpdate,
    onDragEnd: handleCreateDragEnd,
    onDragCancel: handleCreateDragCancel,
    onEditingStart: handleEditingStart,
    enabled: !draggingEvent && !resizingEvent,
  });

  // Keep a ref to dragState to avoid stale closure issues in gesture callbacks
  const dragStateRef = useRef(dragState);
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  // Handle placeholder resize callbacks
  const handlePlaceholderResizeStart = useCallback((handle: ResizeHandleType) => {
    console.log('[DayView] Placeholder resize start:', handle);
    // Use ref to get CURRENT dragState (avoids stale closure)
    const currentDragState = dragStateRef.current;
    if (currentDragState) {
      initialPlaceholderBoundsRef.current = {
        startHour: currentDragState.startHour,
        startMinutes: currentDragState.startMinutes,
        endHour: currentDragState.endHour,
        endMinutes: currentDragState.endMinutes,
      };
      console.log('[DayView] Captured initial bounds:', initialPlaceholderBoundsRef.current);
    }
  }, []);

  const handlePlaceholderResizeMove = useCallback((handle: ResizeHandleType, delta: { x: number; y: number }) => {
    // IMPORTANT: delta.y is CUMULATIVE translation from gesture start, not incremental
    // We must calculate new bounds from INITIAL bounds + translation, not current bounds + delta

    // Race condition protection: if onStart hasn't finished yet, initialize bounds here
    if (!initialPlaceholderBoundsRef.current) {
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;
      initialPlaceholderBoundsRef.current = {
        startHour: currentDragState.startHour,
        startMinutes: currentDragState.startMinutes,
        endHour: currentDragState.endHour,
        endMinutes: currentDragState.endMinutes,
      };
      console.log('[DayView] Initialized bounds in move handler (race condition):', initialPlaceholderBoundsRef.current);
    }

    const initialBounds = initialPlaceholderBoundsRef.current;

    // Convert cumulative pixel translation to RAW minutes (not snapped yet)
    const rawMinutesDelta = (delta.y / PIXELS_PER_HOUR) * 60;

    let newBounds: Partial<DragState> = {};

    // Get current state for minimum duration constraints
    // (user may have resized the OTHER handle in a previous gesture during this editing session)
    const currentDragState = dragStateRef.current;
    const currentStartMinutes = currentDragState
      ? currentDragState.startHour * 60 + currentDragState.startMinutes
      : initialBounds.startHour * 60 + initialBounds.startMinutes;
    const currentEndMinutes = currentDragState
      ? currentDragState.endHour * 60 + currentDragState.endMinutes
      : initialBounds.endHour * 60 + initialBounds.endMinutes;

    switch (handle) {
      case 'top': {
        // Calculate new start time from INITIAL bounds + cumulative translation
        const initialStartMinutes = initialBounds.startHour * 60 + initialBounds.startMinutes;
        const rawNewStartMinutes = initialStartMinutes + rawMinutesDelta;

        // Snap to 15-minute intervals, ensuring we NEVER exceed finger position:
        // - Dragging UP (negative delta, expanding upward): use Math.ceil to snap DOWN (toward original)
        // - Dragging DOWN (positive delta, shrinking): use Math.floor to snap DOWN (toward finger)
        // The snapped value should always be between the original position and the finger
        let snappedStartMinutes: number;
        if (rawMinutesDelta < 0) {
          // Expanding upward - snap toward the original (ceiling = closer to original start)
          snappedStartMinutes = Math.ceil(rawNewStartMinutes / 15) * 15;
        } else {
          // Shrinking from top - snap toward the finger (floor = below finger but toward original end)
          snappedStartMinutes = Math.floor(rawNewStartMinutes / 15) * 15;
        }

        // Ensure minimum 15 min duration and clamp to valid range
        // Use CURRENT end time (not initial) in case user resized the bottom handle previously
        const maxStartMinutes = currentEndMinutes - 15; // Can't get closer than 15min from current end
        const clampedStartMinutes = Math.min(snappedStartMinutes, maxStartMinutes);
        const clampedStart = Math.max(0, clampedStartMinutes);

        newBounds = {
          startHour: Math.floor(clampedStart / 60),
          startMinutes: clampedStart % 60,
        };
        console.log('[DayView] Top resize:', { rawDelta: rawMinutesDelta, rawNew: rawNewStartMinutes, snapped: snappedStartMinutes, final: clampedStart });
        break;
      }
      case 'bottom': {
        // Calculate new end time from INITIAL bounds + cumulative translation
        const initialEndMinutes = initialBounds.endHour * 60 + initialBounds.endMinutes;
        const rawNewEndMinutes = initialEndMinutes + rawMinutesDelta;

        // Snap to 15-minute intervals, ensuring we NEVER exceed finger position:
        // - Dragging DOWN (positive delta, expanding): use Math.floor to snap UP (toward original)
        // - Dragging UP (negative delta, shrinking): use Math.ceil to snap UP (toward finger)
        // The snapped value should always be between the original position and the finger
        let snappedEndMinutes: number;
        if (rawMinutesDelta > 0) {
          // Expanding downward - snap toward the original (floor = closer to original end)
          snappedEndMinutes = Math.floor(rawNewEndMinutes / 15) * 15;
        } else {
          // Shrinking from bottom - snap toward the finger (ceil = above finger but toward original start)
          snappedEndMinutes = Math.ceil(rawNewEndMinutes / 15) * 15;
        }

        // Ensure minimum 15 min duration and clamp to valid range
        // Use CURRENT start time (not initial) in case user resized the top handle previously
        const minEndMinutes = currentStartMinutes + 15; // Must be at least 15min after current start
        const clampedEndMinutes = Math.max(snappedEndMinutes, minEndMinutes);
        const clampedEnd = Math.min(24 * 60, clampedEndMinutes);

        newBounds = {
          endHour: Math.floor(clampedEnd / 60),
          endMinutes: clampedEnd % 60,
        };
        console.log('[DayView] Bottom resize:', { rawDelta: rawMinutesDelta, rawNew: rawNewEndMinutes, snapped: snappedEndMinutes, final: clampedEnd });
        break;
      }
      // Left/right handles not used in day view
      default:
        break;
    }

    if (Object.keys(newBounds).length > 0) {
      updatePlaceholderBounds(newBounds);
    }
  }, [updatePlaceholderBounds]);

  const handlePlaceholderResizeEnd = useCallback((handle: ResizeHandleType) => {
    console.log('[DayView] Placeholder resize end:', handle);

    // Snapping is now applied in real-time during handlePlaceholderResizeMove
    // The position should already be at a valid 15-minute interval
    // No additional snapping needed - this prevents the "snap-back" visual jank

    // Just log the final position for debugging
    const currentDragState = dragStateRef.current;
    if (currentDragState) {
      console.log('[DayView] Final position:', {
        start: `${currentDragState.startHour}:${currentDragState.startMinutes.toString().padStart(2, '0')}`,
        end: `${currentDragState.endHour}:${currentDragState.endMinutes.toString().padStart(2, '0')}`,
        duration: currentDragState.durationMinutes,
      });
    }

    // Clear the initial bounds ref
    initialPlaceholderBoundsRef.current = null;
  }, []);

  // Handle placeholder drag-to-move start
  const handlePlaceholderDragMoveStart = useCallback(() => {
    console.log('[DayView] Placeholder drag-to-move start');
    // Use ref to get CURRENT dragState (avoids stale closure)
    const currentDragState = dragStateRef.current;
    if (currentDragState) {
      initialPlaceholderBoundsRef.current = {
        startHour: currentDragState.startHour,
        startMinutes: currentDragState.startMinutes,
        endHour: currentDragState.endHour,
        endMinutes: currentDragState.endMinutes,
      };
      console.log('[DayView] Captured initial bounds for drag-move:', initialPlaceholderBoundsRef.current);
    }
  }, []);

  // Handle placeholder drag-to-move update
  const handlePlaceholderDragMove = useCallback((delta: { x: number; y: number }) => {
    // IMPORTANT: delta.y is CUMULATIVE translation from gesture start
    // We must calculate new bounds from INITIAL bounds + translation

    // Race condition protection
    if (!initialPlaceholderBoundsRef.current) {
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;
      initialPlaceholderBoundsRef.current = {
        startHour: currentDragState.startHour,
        startMinutes: currentDragState.startMinutes,
        endHour: currentDragState.endHour,
        endMinutes: currentDragState.endMinutes,
      };
      console.log('[DayView] Initialized bounds in drag-move handler (race condition)');
    }

    const initialBounds = initialPlaceholderBoundsRef.current;

    // Calculate the event duration (must be preserved)
    const durationMinutes =
      (initialBounds.endHour * 60 + initialBounds.endMinutes) -
      (initialBounds.startHour * 60 + initialBounds.startMinutes);

    // Convert cumulative pixel translation to minutes
    const rawMinutesDelta = (delta.y / PIXELS_PER_HOUR) * 60;

    // Snap to 15-minute intervals
    const snappedMinutesDelta = Math.round(rawMinutesDelta / 15) * 15;

    // Calculate new start time from INITIAL bounds + snapped delta
    const initialStartMinutes = initialBounds.startHour * 60 + initialBounds.startMinutes;
    let newStartMinutes = initialStartMinutes + snappedMinutesDelta;

    // Bounds checking: ensure event stays within valid time range (00:00 to 24:00)
    // Cannot start before 00:00
    newStartMinutes = Math.max(0, newStartMinutes);
    // Cannot end after 24:00 (1440 minutes)
    const maxStartMinutes = 24 * 60 - durationMinutes;
    newStartMinutes = Math.min(newStartMinutes, maxStartMinutes);

    // Calculate new end time (preserving duration)
    const newEndMinutes = newStartMinutes + durationMinutes;

    // Convert back to hours and minutes
    const newStartHour = Math.floor(newStartMinutes / 60);
    const newStartMins = newStartMinutes % 60;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMins = newEndMinutes % 60;

    console.log('[DayView] Drag-move:', {
      rawDelta: rawMinutesDelta,
      snapped: snappedMinutesDelta,
      newStart: `${newStartHour}:${newStartMins.toString().padStart(2, '0')}`,
      newEnd: `${newEndHour}:${newEndMins.toString().padStart(2, '0')}`,
      duration: durationMinutes,
    });

    // Update both start and end to move the entire event
    updatePlaceholderBounds({
      startHour: newStartHour,
      startMinutes: newStartMins,
      endHour: newEndHour,
      endMinutes: newEndMins,
    });
  }, [updatePlaceholderBounds]);

  // Handle placeholder drag-to-move end
  const handlePlaceholderDragMoveEnd = useCallback(() => {
    console.log('[DayView] Placeholder drag-to-move end');

    // Log the final position for debugging
    const currentDragState = dragStateRef.current;
    if (currentDragState) {
      console.log('[DayView] Final drag-move position:', {
        start: `${currentDragState.startHour}:${currentDragState.startMinutes.toString().padStart(2, '0')}`,
        end: `${currentDragState.endHour}:${currentDragState.endMinutes.toString().padStart(2, '0')}`,
        duration: currentDragState.durationMinutes,
      });
    }

    // Clear the initial bounds ref
    initialPlaceholderBoundsRef.current = null;
  }, []);

  // Handle confirm (checkmark button)
  const handlePlaceholderConfirm = useCallback(() => {
    console.log('[DayView] Placeholder confirmed');
    confirmPlaceholder();
  }, [confirmPlaceholder]);

  // Handle tap outside placeholder to dismiss
  const handleTapOutside = useCallback(() => {
    if (isPlaceholderEditing) {
      console.log('[DayView] Tap outside - cancelling placeholder');
      cancelDrag();
    }
  }, [isPlaceholderEditing, cancelDrag]);

  // Handle scroll events for fixed placeholder positioning
  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  }, []);

  // Handle scroll view layout to get visible height
  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  // Calculate placeholder position from drag state (position within the grid)
  const placeholderPosition = useMemo(() => {
    if (!dragState) return null;
    const top = (dragState.startHour + dragState.startMinutes / 60) * PIXELS_PER_HOUR;
    const height = minutesToPixels(dragState.durationMinutes, PIXELS_PER_HOUR);
    return { top, height };
  }, [dragState]);

  // Calculate fixed overlay position for placeholder during editing
  // This ensures the placeholder stays visible even when scrolled
  const fixedPlaceholderPosition = useMemo(() => {
    if (!placeholderPosition || !isPlaceholderEditing) return null;

    const gridPaddingTop = 20; // From timeGrid style
    const placeholderTopInGrid = placeholderPosition.top + gridPaddingTop;
    const placeholderBottomInGrid = placeholderTopInGrid + placeholderPosition.height;

    // Calculate visible position relative to scroll view
    const visibleTop = placeholderTopInGrid - scrollOffset;
    const visibleBottom = placeholderBottomInGrid - scrollOffset;

    // Determine if placeholder is fully, partially, or not visible
    const isFullyAbove = visibleBottom <= 0;
    const isFullyBelow = visibleTop >= scrollViewHeight;
    const isPartiallyVisible = !isFullyAbove && !isFullyBelow;

    // Calculate clipping
    let clippedTop = visibleTop;
    let clippedHeight = placeholderPosition.height;
    let topClipAmount = 0;
    let bottomClipAmount = 0;

    if (isPartiallyVisible) {
      // Clip at top edge
      if (visibleTop < 0) {
        topClipAmount = -visibleTop;
        clippedTop = 0;
        clippedHeight -= topClipAmount;
      }
      // Clip at bottom edge
      if (visibleBottom > scrollViewHeight) {
        bottomClipAmount = visibleBottom - scrollViewHeight;
        clippedHeight -= bottomClipAmount;
      }
    }

    return {
      // Position in grid (for rendering inside ScrollView during drag)
      gridTop: placeholderPosition.top,
      gridHeight: placeholderPosition.height,
      // Position in overlay (for rendering outside ScrollView during edit)
      overlayTop: clippedTop,
      overlayHeight: Math.max(0, clippedHeight),
      // Visibility state
      isFullyAbove,
      isFullyBelow,
      isPartiallyVisible,
      isCompletelyOffScreen: isFullyAbove || isFullyBelow,
      // Clipping info for resize handle visibility
      topClipAmount,
      bottomClipAmount,
      // Direction to scroll to find placeholder
      scrollDirection: isFullyAbove ? 'up' : isFullyBelow ? 'down' : null,
      // Original position for scroll-to functionality
      originalTop: placeholderTopInGrid,
    };
  }, [placeholderPosition, scrollOffset, scrollViewHeight, isPlaceholderEditing]);

  // Scroll to placeholder location
  const scrollToPlaceholder = useCallback(() => {
    if (!fixedPlaceholderPosition || !scrollViewRef.current) return;
    const targetScrollY = fixedPlaceholderPosition.originalTop - 50; // 50px padding from top
    scrollViewRef.current.scrollTo({
      y: Math.max(0, targetScrollY),
      animated: true,
    });
  }, [fixedPlaceholderPosition]);

  // Disable scroll when dragging/resizing/creating
  // Note: isPlaceholderEditing is NOT included - allow scrolling during placeholder editing
  // so user can scroll to find the right time for the event
  const isInteracting = draggingEvent !== null || resizingEvent !== null || isCreating;

  // Calculate conflict zones during drag/resize
  const conflictZones = useMemo(() => {
    if (!isInteracting) return [];

    const activeEvent = draggingEvent || resizingEvent;
    if (!activeEvent) return [];

    // Calculate the new time range based on drag/resize offset
    const eventStart = new Date(activeEvent.startTime);
    const eventEnd = new Date(activeEvent.endTime);

    let newStart = new Date(eventStart);
    let newEnd = new Date(eventEnd);

    if (draggingEvent) {
      // Drag moves both start and end by the same amount
      const minuteChange = (dragOffset / PIXELS_PER_HOUR) * 60;
      newStart = new Date(eventStart.getTime() + minuteChange * 60000);
      newEnd = new Date(eventEnd.getTime() + minuteChange * 60000);
    } else if (resizingEvent && resizeHandle) {
      // Resize only changes one end
      const minuteChange = (resizeOffset / PIXELS_PER_HOUR) * 60;
      if (resizeHandle.includes('top')) {
        newStart = new Date(eventStart.getTime() + minuteChange * 60000);
      } else if (resizeHandle.includes('bottom')) {
        newEnd = new Date(eventEnd.getTime() + minuteChange * 60000);
      }
    }

    // Find conflicting events
    const conflicts = getConflictingEvents(
      newStart,
      newEnd,
      events,
      activeEvent.id
    );

    // Return the positions for highlighting
    return conflicts.map(conflict => {
      const conflictStart = new Date(conflict.startTime);
      const conflictEnd = new Date(conflict.endTime);
      const startHour = conflictStart.getHours() + conflictStart.getMinutes() / 60;
      const endHour = conflictEnd.getHours() + conflictEnd.getMinutes() / 60;

      return {
        id: conflict.id,
        top: startHour * PIXELS_PER_HOUR,
        height: (endHour - startHour) * PIXELS_PER_HOUR,
      };
    });
  }, [draggingEvent, resizingEvent, dragOffset, resizeOffset, resizeHandle, events]);

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  // Check if date is today
  const isToday = useMemo(() => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, [date]);

  // Get current hour indicator position
  const currentHourPosition = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours + minutes / 60) * PIXELS_PER_HOUR;
  }, [isToday]);

  // Calculate event position and height
  const getEventLayout = useCallback((event: Event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: startHour * PIXELS_PER_HOUR,
      height: duration * PIXELS_PER_HOUR,
    };
  }, []);

  // Handle event drag start
  const handleEventDragStart = useCallback((event: Event) => {
    console.log('[DayView] Drag start:', event.title);
    setDraggingEvent(event);
    setDragOffset(0);
  }, []);

  // Handle event drag move
  const handleEventDragMove = useCallback((dy: number) => {
    setDragOffset(dy);
  }, []);

  // Handle event drag end
  const handleEventDragEnd = useCallback((dy: number) => {
    console.log('[DayView] Drag end called, dy:', dy, 'draggingEvent:', draggingEvent?.title);
    if (!draggingEvent) {
      console.log('[DayView] No dragging event, returning');
      return;
    }

    // Get the CURRENT event from events array to ensure we have latest times
    const currentEvent = events.find(e => e.id === draggingEvent.id);
    if (!currentEvent) {
      console.log('[DayView] Event not found in events array');
      setDraggingEvent(null);
      setDragOffset(0);
      return;
    }

    // Calculate time change (15 min intervals)
    const minuteChange = Math.round((dy / PIXELS_PER_HOUR) * 60 / 15) * 15;
    console.log('[DayView] Minute change:', minuteChange);

    if (minuteChange !== 0) {
      // Use currentEvent times (from state) not draggingEvent times (from drag start)
      const oldStart = new Date(currentEvent.startTime);
      const oldEnd = new Date(currentEvent.endTime);

      const newStart = new Date(oldStart.getTime() + minuteChange * 60000);
      const newEnd = new Date(oldEnd.getTime() + minuteChange * 60000);

      console.log('[DayView] Current event times:', currentEvent.startTime, currentEvent.endTime);
      console.log('[DayView] Updating event times:', newStart.toISOString(), newEnd.toISOString());
      onEventUpdate?.(currentEvent, newStart.toISOString(), newEnd.toISOString());
    }

    setDraggingEvent(null);
    setDragOffset(0);
  }, [draggingEvent, events, onEventUpdate]);

  // Helper to format time for logging
  const formatTimeForLog = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Handle resize start
  const handleResizeStart = useCallback((event: Event, handle: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    console.log('[DayView] Resize start:', event.title, 'handle:', handle);
    console.log('[DayView] Event times:', event.startTime, 'to', event.endTime);
    setResizingEvent(event);
    setResizeHandle(handle);
    setResizeOffset(0);
  }, []);

  // Handle resize move - update state for visual feedback
  const handleResizeMove = useCallback((dy: number, handle: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    setResizeOffset(dy);
  }, []);

  // Track pending resize clear - we'll clear resize state when events update
  const pendingResizeClear = useRef<string | null>(null);

  // Watch for event updates and clear resize state when the resized event's times change
  React.useEffect(() => {
    if (pendingResizeClear.current) {
      const eventId = pendingResizeClear.current;
      const event = events.find(e => e.id === eventId);
      if (event) {
        console.log('[DayView] Event update detected for pending resize, clearing state now');
        console.log('[DayView] Updated event times:', event.startTime, 'to', event.endTime);
        pendingResizeClear.current = null;
        setResizingEvent(null);
        setResizeHandle(null);
        setResizeOffset(0);
      }
    }
  }, [events]);

  // Handle resize end - receives dy and handle from EventBlock
  const handleResizeEnd = useCallback((dy: number, handle: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    console.log('[DayView] ========== RESIZE END ==========');
    console.log('[DayView] Resize end called, dy:', dy, 'handle:', handle);
    console.log('[DayView] Current resizeOffset state:', resizeOffset);

    if (!resizingEvent) {
      console.log('[DayView] No resizing event, returning');
      return;
    }

    // Get the CURRENT event from events array to ensure we have latest times
    const currentEvent = events.find(e => e.id === resizingEvent.id);
    if (!currentEvent) {
      console.log('[DayView] Event not found in events array');
      setResizingEvent(null);
      setResizeHandle(null);
      setResizeOffset(0);
      return;
    }

    // Calculate time change (15 min intervals)
    const minuteChange = Math.round((dy / PIXELS_PER_HOUR) * 60 / 15) * 15;
    console.log('[DayView] Resize minute change:', minuteChange);

    if (minuteChange !== 0) {
      // Use currentEvent times (from state) not resizingEvent times (from resize start)
      const oldStart = new Date(currentEvent.startTime);
      const oldEnd = new Date(currentEvent.endTime);

      let newStart = new Date(oldStart);
      let newEnd = new Date(oldEnd);

      console.log('[DayView] Current times - Start:', formatTimeForLog(oldStart), 'End:', formatTimeForLog(oldEnd));

      // Handle corner and edge resize handles
      // Top handles (top, top-left, top-right) adjust start time
      if (handle === 'top' || handle === 'top-left' || handle === 'top-right') {
        newStart = new Date(oldStart.getTime() + minuteChange * 60000);
        // Ensure minimum 15 min duration
        if (newStart >= oldEnd) {
          newStart = new Date(oldEnd.getTime() - 15 * 60000);
          console.log('[DayView] Clamped start time to maintain 15min minimum');
        }
        console.log('[DayView] TOP resize: Start', formatTimeForLog(oldStart), '->', formatTimeForLog(newStart));
      }
      // Bottom handles (bottom, bottom-left, bottom-right) adjust end time
      else if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') {
        newEnd = new Date(oldEnd.getTime() + minuteChange * 60000);
        // Ensure minimum 15 min duration
        if (newEnd <= oldStart) {
          newEnd = new Date(oldStart.getTime() + 15 * 60000);
          console.log('[DayView] Clamped end time to maintain 15min minimum');
        }
        console.log('[DayView] BOTTOM resize: End', formatTimeForLog(oldEnd), '->', formatTimeForLog(newEnd));
      }

      console.log('[DayView] Final times - Start:', newStart.toISOString(), 'End:', newEnd.toISOString());

      // Mark that we're waiting for this event to update before clearing resize state
      // This prevents visual snapback - we keep resizeOffset until events array updates
      pendingResizeClear.current = currentEvent.id;
      console.log('[DayView] Set pending resize clear for event:', currentEvent.id);

      // Call update - the useEffect watching events will clear resize state when it propagates
      onEventUpdate?.(currentEvent, newStart.toISOString(), newEnd.toISOString());
    } else {
      console.log('[DayView] No time change, skipping update');
      // No change, safe to clear immediately
      setResizingEvent(null);
      setResizeHandle(null);
      setResizeOffset(0);
    }
  }, [resizingEvent, resizeOffset, events, onEventUpdate]);

  // Scroll to working hours on mount
  React.useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: WORKING_HOURS_START * PIXELS_PER_HOUR - 20,
        animated: false,
      });
    }, 100);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header with date */}
      <View style={styles.header}>
        <Text style={[styles.dayName, isToday && styles.todayText]}>
          {date.toLocaleDateString(undefined, { weekday: 'long' })}
        </Text>
        <View style={[styles.dateCircle, isToday && styles.todayCircle]}>
          <Text style={[styles.dateNumber, isToday && styles.todayText]}>
            {date.getDate()}
          </Text>
        </View>
      </View>

      {/* Time grid with gesture detection */}
      <View style={styles.scrollViewContainer} onLayout={handleScrollViewLayout}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isInteracting}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.timeGrid} onLayout={handleGridLayout}>
            {/* Hour rows */}
            {HOURS.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={styles.hourRow}
                onPress={() => onTimeSlotPress?.(date, hour)}
                activeOpacity={0.7}
              >
                <View style={styles.hourLabel}>
                  <Text style={styles.hourText}>{formatHour(hour)}</Text>
                </View>
                <View style={styles.hourSlot}>
                  <View style={styles.hourLine} />
                  <View style={styles.halfHourLine} />
                </View>
              </TouchableOpacity>
            ))}

            {/* Current time indicator */}
            {currentHourPosition !== null && (
              <View style={[styles.currentTimeIndicator, { top: currentHourPosition }]}>
                <View style={styles.currentTimeDot} />
                <View style={styles.currentTimeLine} />
              </View>
            )}

            {/* Conflict zone highlights - shown during drag/resize */}
            {conflictZones.map((zone) => (
              <View
                key={`conflict-${zone.id}`}
                style={[
                  styles.conflictZone,
                  {
                    top: zone.top,
                    height: zone.height,
                  },
                ]}
                pointerEvents="none"
              >
                <View style={styles.conflictZoneInner}>
                  <Ionicons name="warning-outline" size={16} color="#ef4444" />
                </View>
              </View>
            ))}

            {/* Placeholder for drag-to-create - rendered in scroll during initial drag only */}
            {dragState && placeholderPosition && isCreating && !isPlaceholderEditing && (
              <PlaceholderContainer
                visible={true}
                startTime={(() => {
                  const d = new Date(dragState.startDate);
                  d.setHours(dragState.startHour, dragState.startMinutes, 0, 0);
                  return d;
                })()}
                endTime={(() => {
                  const d = new Date(dragState.endDate);
                  d.setHours(dragState.endHour, dragState.endMinutes, 0, 0);
                  return d;
                })()}
                onComplete={() => {}}
                onCancel={cancelDrag}
                viewType="day"
                top={placeholderPosition.top}
                height={placeholderPosition.height}
                isEditing={false}
              />
            )}

            {/* Events */}
            {events.map((event) => {
              const layout = getEventLayout(event);
              const isDragging = draggingEvent?.id === event.id;
              const isResizing = resizingEvent?.id === event.id;

              // Adjust layout based on drag/resize
              let adjustedTop = layout.top;
              let adjustedHeight = layout.height;

              if (isDragging) {
                adjustedTop += dragOffset;
              }

              if (isResizing) {
                // Top handles (top, top-left, top-right) adjust top and height
                if (resizeHandle === 'top' || resizeHandle === 'top-left' || resizeHandle === 'top-right') {
                  adjustedTop += resizeOffset;
                  adjustedHeight -= resizeOffset;
                }
                // Bottom handles (bottom, bottom-left, bottom-right) adjust height only
                else if (resizeHandle === 'bottom' || resizeHandle === 'bottom-left' || resizeHandle === 'bottom-right') {
                  adjustedHeight += resizeOffset;
                }
              }

              return (
                <EventBlock
                  key={event.id}
                  event={event}
                  topOffset={adjustedTop}
                  height={adjustedHeight}
                  isDragging={isDragging}
                  isResizing={isResizing}
                  onDragStart={handleEventDragStart}
                  onDragMove={handleEventDragMove}
                  onDragEnd={handleEventDragEnd}
                  onResizeStart={handleResizeStart}
                  onResizeMove={handleResizeMove}
                  onResizeEnd={handleResizeEnd}
                  onPress={onEventPress}
                />
              );
            })}
          </Animated.View>
        </GestureDetector>
      </ScrollView>

        {/* Fixed overlay for placeholder during editing mode - stays visible during scroll */}
        {isPlaceholderEditing && dragState && fixedPlaceholderPosition && (
          <>
            {/* Tap outside overlay to dismiss placeholder */}
            <Pressable
              style={styles.fixedTapOutsideOverlay}
              onPress={handleTapOutside}
            />

            {/* Off-screen indicator when placeholder is completely scrolled away */}
            {fixedPlaceholderPosition.isCompletelyOffScreen && (
              <TouchableOpacity
                style={[
                  styles.offScreenIndicator,
                  fixedPlaceholderPosition.isFullyAbove
                    ? styles.offScreenIndicatorTop
                    : styles.offScreenIndicatorBottom,
                ]}
                onPress={scrollToPlaceholder}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={fixedPlaceholderPosition.isFullyAbove ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="white"
                />
                <Text style={styles.offScreenIndicatorText}>
                  {(() => {
                    const d = new Date(dragState.startDate);
                    d.setHours(dragState.startHour, dragState.startMinutes, 0, 0);
                    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  })()}
                </Text>
                <Ionicons name="calendar-outline" size={14} color="white" />
              </TouchableOpacity>
            )}

            {/* Fixed placeholder - visible and interactive regardless of scroll */}
            {!fixedPlaceholderPosition.isCompletelyOffScreen && (
              <View
                style={[
                  styles.fixedPlaceholderWrapper,
                  {
                    top: fixedPlaceholderPosition.overlayTop,
                    height: fixedPlaceholderPosition.overlayHeight,
                  },
                ]}
                pointerEvents="box-none"
              >
                <PlaceholderContainer
                  visible={true}
                  startTime={(() => {
                    const d = new Date(dragState.startDate);
                    d.setHours(dragState.startHour, dragState.startMinutes, 0, 0);
                    return d;
                  })()}
                  endTime={(() => {
                    const d = new Date(dragState.endDate);
                    d.setHours(dragState.endHour, dragState.endMinutes, 0, 0);
                    return d;
                  })()}
                  onComplete={() => {}}
                  onCancel={cancelDrag}
                  viewType="day"
                  top={0}
                  height={fixedPlaceholderPosition.overlayHeight}
                  isEditing={true}
                  onResizeStart={handlePlaceholderResizeStart}
                  onResizeMove={handlePlaceholderResizeMove}
                  onResizeEnd={handlePlaceholderResizeEnd}
                  onConfirm={handlePlaceholderConfirm}
                  onDragMoveStart={handlePlaceholderDragMoveStart}
                  onDragMove={handlePlaceholderDragMove}
                  onDragMoveEnd={handlePlaceholderDragMoveEnd}
                  scrollOffset={scrollOffset}
                  topClipAmount={fixedPlaceholderPosition.topClipAmount}
                  bottomClipAmount={fixedPlaceholderPosition.bottomClipAmount}
                />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      gap: 12,
    },
    dayName: {
      fontSize: 14,
      color: tokens.textSecondary,
      fontWeight: '500',
    },
    dateCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayCircle: {
      backgroundColor: tokens.accent,
    },
    dateNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    todayText: {
      color: tokens.textPrimary,
    },
    scrollView: {
      flex: 1,
    },
    timeGrid: {
      position: 'relative',
      paddingBottom: 60,
      paddingTop: 20, // Space for top resize handle when placeholder is near top
      overflow: 'visible', // Allow resize handles to extend outside bounds
    },
    hourRow: {
      flexDirection: 'row',
      height: PIXELS_PER_HOUR,
    },
    hourLabel: {
      width: 48,
      paddingRight: 8,
      alignItems: 'flex-end',
      paddingTop: 0,
    },
    hourText: {
      fontSize: 10,
      color: tokens.textSecondary,
      marginTop: -6,
    },
    hourSlot: {
      flex: 1,
      position: 'relative',
    },
    hourLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: tokens.border,
    },
    halfHourLine: {
      position: 'absolute',
      top: PIXELS_PER_HOUR / 2,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: tokens.border,
      opacity: 0.5,
    },
    currentTimeIndicator: {
      position: 'absolute',
      left: 44,
      right: 0,
      height: 2,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 100,
    },
    currentTimeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ef4444',
      marginLeft: -4,
    },
    currentTimeLine: {
      flex: 1,
      height: 2,
      backgroundColor: '#ef4444',
    },
    conflictZone: {
      position: 'absolute',
      left: 56,
      right: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 2,
      borderColor: '#ef4444',
      borderStyle: 'dashed',
      borderRadius: 6,
      zIndex: 50,
    },
    conflictZoneInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.7,
    },
    tapOutsideOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
    },
    scrollViewContainer: {
      flex: 1,
      position: 'relative',
    },
    fixedTapOutsideOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
    },
    fixedPlaceholderWrapper: {
      position: 'absolute',
      left: 56,
      right: 8,
      zIndex: 51,
      overflow: 'visible',
    },
    offScreenIndicator: {
      position: 'absolute',
      left: 56,
      right: 8,
      height: 32,
      backgroundColor: tokens.accent,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      zIndex: 52,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    offScreenIndicatorTop: {
      top: 0,
    },
    offScreenIndicatorBottom: {
      bottom: 0,
    },
    offScreenIndicatorText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
  });
