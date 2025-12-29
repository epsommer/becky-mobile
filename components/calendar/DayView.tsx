/**
 * DayView - Daily calendar view with hour slots and drag-drop events
 * Includes conflict highlighting during drag operations
 * Supports long-press drag-to-create for new events
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import EventBlock, { PIXELS_PER_HOUR } from './EventBlock';
import { getConflictingEvents } from '../../utils/eventConflicts';
import PlaceholderContainer from './PlaceholderContainer';
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

  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizingEvent, setResizingEvent] = useState<Event | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null);
  const [resizeOffset, setResizeOffset] = useState(0);

  // Track grid layout for gesture calculations
  const [gridTop, setGridTop] = useState(0);

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
    console.log('[DayView] Drag-to-create ended:', state);
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

  const { composedGesture, dragState, isDragging: isCreating, cancelDrag } = useDragToCreate({
    viewType: 'day',
    pixelsPerHour: PIXELS_PER_HOUR,
    gridTop,
    startDate: date,
    onDragStart: handleCreateDragStart,
    onDragUpdate: handleCreateDragUpdate,
    onDragEnd: handleCreateDragEnd,
    onDragCancel: handleCreateDragCancel,
    enabled: !draggingEvent && !resizingEvent,
  });

  // Calculate placeholder position from drag state
  const placeholderPosition = useMemo(() => {
    if (!dragState) return null;
    const top = (dragState.startHour + dragState.startMinutes / 60) * PIXELS_PER_HOUR;
    const height = minutesToPixels(dragState.durationMinutes, PIXELS_PER_HOUR);
    return { top, height };
  }, [dragState]);

  // Disable scroll when dragging/resizing/creating
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
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isInteracting}
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

            {/* Placeholder for drag-to-create */}
            {dragState && placeholderPosition && (
              <PlaceholderContainer
                visible={isCreating}
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
  });
