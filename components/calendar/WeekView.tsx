/**
 * WeekView - Weekly calendar view with day columns, drag-drop events,
 * and corner resize handles for multi-day event creation
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import EventBlock, { PIXELS_PER_HOUR } from './EventBlock';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_IN_WEEK = 7;
const WORKING_HOURS_START = 6;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIME_LABEL_WIDTH = 40;
const DAY_COLUMN_WIDTH = (SCREEN_WIDTH - TIME_LABEL_WIDTH) / DAYS_IN_WEEK;

// Corner resize handle types
type CornerHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Helper to convert pixels to minutes for logging
const pixelsToMinutes = (pixels: number) => Math.round((pixels / PIXELS_PER_HOUR) * 60);

interface WeekViewProps {
  startDate: Date;
  events: Event[];
  onEventPress?: (event: Event) => void;
  onTimeSlotPress?: (date: Date, hour: number) => void;
  onEventUpdate?: (event: Event, newStart: string, newEnd: string) => void;
  onDayPress?: (date: Date) => void;
}

// State for corner resize operation
interface CornerResizeState {
  event: Event | null;
  handle: CornerHandle | null;
  startDayIndex: number;
  endDayIndex: number;
  startTimeOffset: number; // pixels from midnight
  endTimeOffset: number; // pixels from midnight
  dx: number; // horizontal drag
  dy: number; // vertical drag
}

export default function WeekView({
  startDate,
  events,
  onEventPress,
  onTimeSlotPress,
  onEventUpdate,
  onDayPress,
}: WeekViewProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Drag state
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  // Corner resize state for multi-day events
  const [cornerResize, setCornerResize] = useState<CornerResizeState>({
    event: null,
    handle: null,
    startDayIndex: 0,
    endDayIndex: 0,
    startTimeOffset: 0,
    endTimeOffset: 0,
    dx: 0,
    dy: 0,
  });

  // Resize state (top/bottom only)
  const [resizingEvent, setResizingEvent] = useState<Event | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'top' | 'bottom' | null>(null);
  const [resizeOffset, setResizeOffset] = useState(0);

  // Disable scroll when interacting
  const isInteracting = draggingEvent !== null || cornerResize.event !== null || resizingEvent !== null;

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < DAYS_IN_WEEK; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [startDate]);

  // Check if date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12a';
    if (hour === 12) return '12p';
    if (hour < 12) return `${hour}a`;
    return `${hour - 12}p`;
  };

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((event) => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  }, [events]);

  // Calculate event position and height
  const getEventLayout = useCallback((event: Event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: startHour * PIXELS_PER_HOUR,
      height: Math.max(duration * PIXELS_PER_HOUR, 20),
    };
  }, []);

  // Helper to format time for logging
  const formatTimeForLog = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Get day index for a date
  const getDayIndex = useCallback((date: Date) => {
    return weekDates.findIndex(d =>
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    );
  }, [weekDates]);

  // Handle drag start
  const handleDragStart = useCallback((event: Event, dayIndex: number) => {
    console.log('[WeekView] Drag start:', event.title, 'dayIndex:', dayIndex);
    setDraggingEvent(event);
    setDragOffset({ dx: 0, dy: 0 });
  }, []);

  // Handle drag move (both vertical and horizontal)
  const handleDragMove = useCallback((dx: number, dy: number) => {
    setDragOffset({ dx, dy });
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((dx: number, dy: number) => {
    if (!draggingEvent) return;

    // Get current event from state
    const currentEvent = events.find(e => e.id === draggingEvent.id);
    if (!currentEvent) {
      setDraggingEvent(null);
      setDragOffset({ dx: 0, dy: 0 });
      return;
    }

    // Calculate day change
    const dayChange = Math.round(dx / DAY_COLUMN_WIDTH);
    // Calculate time change (15 min intervals)
    const minuteChange = Math.round((dy / PIXELS_PER_HOUR) * 60 / 15) * 15;

    console.log('[WeekView] Drag end - dayChange:', dayChange, 'minuteChange:', minuteChange);

    if (dayChange !== 0 || minuteChange !== 0) {
      const oldStart = new Date(currentEvent.startTime);
      const oldEnd = new Date(currentEvent.endTime);

      const newStart = new Date(oldStart.getTime() + dayChange * 24 * 60 * 60000 + minuteChange * 60000);
      const newEnd = new Date(oldEnd.getTime() + dayChange * 24 * 60 * 60000 + minuteChange * 60000);

      console.log('[WeekView] Updating times:', formatTimeForLog(oldStart), '->', formatTimeForLog(newStart));
      onEventUpdate?.(currentEvent, newStart.toISOString(), newEnd.toISOString());
    }

    setDraggingEvent(null);
    setDragOffset({ dx: 0, dy: 0 });
  }, [draggingEvent, events, onEventUpdate]);

  // Handle resize start
  const handleResizeStart = useCallback((event: Event, handle: 'top' | 'bottom') => {
    console.log('[WeekView] Resize start:', event.title, 'handle:', handle);
    setResizingEvent(event);
    setResizeHandle(handle);
    setResizeOffset(0);
  }, []);

  // Handle resize move
  const handleResizeMove = useCallback((dy: number) => {
    setResizeOffset(dy);
  }, []);

  // Handle resize end
  const handleResizeEnd = useCallback((dy: number, handle: 'top' | 'bottom') => {
    if (!resizingEvent) return;

    const currentEvent = events.find(e => e.id === resizingEvent.id);
    if (!currentEvent) {
      setResizingEvent(null);
      setResizeHandle(null);
      setResizeOffset(0);
      return;
    }

    const minuteChange = Math.round((dy / PIXELS_PER_HOUR) * 60 / 15) * 15;
    console.log('[WeekView] Resize end - handle:', handle, 'minuteChange:', minuteChange);

    if (minuteChange !== 0) {
      const oldStart = new Date(currentEvent.startTime);
      const oldEnd = new Date(currentEvent.endTime);

      let newStart = new Date(oldStart);
      let newEnd = new Date(oldEnd);

      if (handle === 'top') {
        newStart = new Date(oldStart.getTime() + minuteChange * 60000);
        if (newStart >= oldEnd) {
          newStart = new Date(oldEnd.getTime() - 15 * 60000);
        }
      } else {
        newEnd = new Date(oldEnd.getTime() + minuteChange * 60000);
        if (newEnd <= oldStart) {
          newEnd = new Date(oldStart.getTime() + 15 * 60000);
        }
      }

      console.log('[WeekView] Resize update:', newStart.toISOString(), newEnd.toISOString());
      onEventUpdate?.(currentEvent, newStart.toISOString(), newEnd.toISOString());
    }

    setResizingEvent(null);
    setResizeHandle(null);
    setResizeOffset(0);
  }, [resizingEvent, events, onEventUpdate]);

  // Handle corner resize start (for multi-day events)
  const handleCornerResizeStart = useCallback((event: Event, handle: CornerHandle, dayIndex: number) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const startDayIdx = getDayIndex(start);
    const endDayIdx = getDayIndex(end);

    console.log('[WeekView] Corner resize start:', event.title, 'handle:', handle);
    console.log('[WeekView] Event spans days:', startDayIdx, 'to', endDayIdx);
    console.log('[WeekView] Start time:', formatTimeForLog(start), 'End time:', formatTimeForLog(end));

    setCornerResize({
      event,
      handle,
      startDayIndex: startDayIdx >= 0 ? startDayIdx : dayIndex,
      endDayIndex: endDayIdx >= 0 ? endDayIdx : dayIndex,
      startTimeOffset: (start.getHours() + start.getMinutes() / 60) * PIXELS_PER_HOUR,
      endTimeOffset: (end.getHours() + end.getMinutes() / 60) * PIXELS_PER_HOUR,
      dx: 0,
      dy: 0,
    });
  }, [getDayIndex]);

  // Handle corner resize move
  const handleCornerResizeMove = useCallback((dx: number, dy: number) => {
    setCornerResize(prev => ({ ...prev, dx, dy }));
  }, []);

  // Handle corner resize end
  const handleCornerResizeEnd = useCallback(() => {
    if (!cornerResize.event || !cornerResize.handle) {
      setCornerResize(prev => ({ ...prev, event: null, handle: null }));
      return;
    }

    const currentEvent = events.find(e => e.id === cornerResize.event!.id);
    if (!currentEvent) {
      setCornerResize(prev => ({ ...prev, event: null, handle: null }));
      return;
    }

    const { handle, dx, dy } = cornerResize;

    // Calculate day and time changes
    const dayChange = Math.round(dx / DAY_COLUMN_WIDTH);
    const minuteChange = Math.round((dy / PIXELS_PER_HOUR) * 60 / 15) * 15;

    console.log('[WeekView] Corner resize end - handle:', handle, 'dayChange:', dayChange, 'minuteChange:', minuteChange);

    const oldStart = new Date(currentEvent.startTime);
    const oldEnd = new Date(currentEvent.endTime);

    let newStart = new Date(oldStart);
    let newEnd = new Date(oldEnd);

    // Apply changes based on which corner was dragged
    switch (handle) {
      case 'top-left':
        // Changes start date and start time
        newStart = new Date(oldStart.getTime() + dayChange * 24 * 60 * 60000 + minuteChange * 60000);
        break;
      case 'top-right':
        // Changes end date and start time
        newEnd = new Date(oldEnd.getTime() + dayChange * 24 * 60 * 60000);
        newStart = new Date(oldStart.getTime() + minuteChange * 60000);
        break;
      case 'bottom-left':
        // Changes start date and end time
        newStart = new Date(oldStart.getTime() + dayChange * 24 * 60 * 60000);
        newEnd = new Date(oldEnd.getTime() + minuteChange * 60000);
        break;
      case 'bottom-right':
        // Changes end date and end time (most common for extending multi-day)
        newEnd = new Date(oldEnd.getTime() + dayChange * 24 * 60 * 60000 + minuteChange * 60000);
        break;
    }

    // Ensure minimum duration of 15 minutes
    if (newEnd <= newStart) {
      newEnd = new Date(newStart.getTime() + 15 * 60000);
    }

    console.log('[WeekView] Corner resize - new times:', newStart.toISOString(), 'to', newEnd.toISOString());
    onEventUpdate?.(currentEvent, newStart.toISOString(), newEnd.toISOString());

    setCornerResize({
      event: null,
      handle: null,
      startDayIndex: 0,
      endDayIndex: 0,
      startTimeOffset: 0,
      endTimeOffset: 0,
      dx: 0,
      dy: 0,
    });
  }, [cornerResize, events, onEventUpdate]);

  // Get current time position
  const getCurrentTimePosition = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours + minutes / 60) * PIXELS_PER_HOUR;
  }, []);

  // Scroll to working hours on mount
  React.useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: WORKING_HOURS_START * PIXELS_PER_HOUR - 20,
        animated: false,
      });
    }, 100);
  }, []);

  const todayIndex = weekDates.findIndex(isToday);
  const currentTimeTop = getCurrentTimePosition();

  return (
    <View style={styles.container}>
      {/* Header with day names and dates */}
      <View style={styles.header}>
        <View style={styles.timeHeaderSpacer} />
        {weekDates.map((date, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dayHeader}
            onPress={() => onDayPress?.(date)}
          >
            <Text style={[styles.dayName, isToday(date) && styles.todayText]}>
              {DAY_NAMES[date.getDay()]}
            </Text>
            <View style={[styles.dateCircle, isToday(date) && styles.todayCircle]}>
              <Text style={[styles.dateNumber, isToday(date) && styles.todayDateText]}>
                {date.getDate()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time grid with events */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isInteracting}
      >
        <View style={styles.gridContainer}>
          {/* Hour labels */}
          <View style={styles.timeColumn}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.hourLabelRow}>
                <Text style={styles.hourText}>{formatHour(hour)}</Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          <View style={styles.daysContainer}>
            {weekDates.map((date, dayIndex) => (
              <View key={dayIndex} style={styles.dayColumn}>
                {/* Hour slots */}
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={styles.hourSlot}
                    onPress={() => onTimeSlotPress?.(date, hour)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.hourLine} />
                  </TouchableOpacity>
                ))}

                {/* Events for this day */}
                {getEventsForDate(date).map((event) => {
                  const layout = getEventLayout(event);
                  const isDragging = draggingEvent?.id === event.id;
                  const isResizing = resizingEvent?.id === event.id;
                  const isCornerResizing = cornerResize.event?.id === event.id;

                  // Calculate adjusted position based on drag/resize state
                  let adjustedTop = layout.top;
                  let adjustedHeight = layout.height;

                  if (isDragging) {
                    adjustedTop += dragOffset.dy;
                  }

                  if (isResizing) {
                    if (resizeHandle === 'top') {
                      adjustedTop += resizeOffset;
                      adjustedHeight -= resizeOffset;
                    } else {
                      adjustedHeight += resizeOffset;
                    }
                  }

                  if (isCornerResizing) {
                    // For corner resize, adjust based on handle
                    const { handle, dy } = cornerResize;
                    if (handle === 'top-left' || handle === 'top-right') {
                      adjustedTop += dy;
                      adjustedHeight -= dy;
                    }
                    if (handle === 'bottom-left' || handle === 'bottom-right') {
                      adjustedHeight += dy;
                    }
                  }

                  return (
                    <View
                      key={event.id}
                      style={[
                        styles.eventWrapper,
                        {
                          top: adjustedTop,
                          height: Math.max(adjustedHeight, 20),
                          // Shift horizontally when dragging across days
                          left: isDragging ? 1 + dragOffset.dx : 1,
                          right: isDragging ? 1 - dragOffset.dx : 1,
                        },
                      ]}
                    >
                      <WeekEventBlock
                        event={event}
                        height={adjustedHeight}
                        isDragging={isDragging}
                        isResizing={isResizing}
                        isCornerResizing={isCornerResizing}
                        dayIndex={dayIndex}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        onResizeStart={handleResizeStart}
                        onResizeMove={handleResizeMove}
                        onResizeEnd={handleResizeEnd}
                        onCornerResizeStart={handleCornerResizeStart}
                        onCornerResizeMove={handleCornerResizeMove}
                        onCornerResizeEnd={handleCornerResizeEnd}
                        onPress={() => onEventPress?.(event)}
                        tokens={tokens}
                      />
                    </View>
                  );
                })}

                {/* Current time indicator */}
                {isToday(date) && (
                  <View style={[styles.currentTimeLine, { top: currentTimeTop }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Compact event block for week view with corner resize handles
interface WeekEventBlockProps {
  event: Event;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
  isCornerResizing: boolean;
  dayIndex: number;
  onDragStart: (event: Event, dayIndex: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: (dx: number, dy: number) => void;
  onResizeStart: (event: Event, handle: 'top' | 'bottom') => void;
  onResizeMove: (dy: number) => void;
  onResizeEnd: (dy: number, handle: 'top' | 'bottom') => void;
  onCornerResizeStart: (event: Event, handle: CornerHandle, dayIndex: number) => void;
  onCornerResizeMove: (dx: number, dy: number) => void;
  onCornerResizeEnd: () => void;
  onPress: () => void;
  tokens: ThemeTokens;
}

function WeekEventBlock({
  event,
  height,
  isDragging,
  isResizing,
  isCornerResizing,
  dayIndex,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onCornerResizeStart,
  onCornerResizeMove,
  onCornerResizeEnd,
  onPress,
  tokens,
}: WeekEventBlockProps) {
  const lastDrag = useRef({ dx: 0, dy: 0 });
  const lastResize = useRef(0);

  // Main drag pan responder
  const dragPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        lastDrag.current = { dx: 0, dy: 0 };
        onDragStart(event, dayIndex);
      },
      onPanResponderMove: (_, gs) => {
        const snappedDx = Math.round(gs.dx / DAY_COLUMN_WIDTH) * DAY_COLUMN_WIDTH;
        const snappedDy = Math.round(gs.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        lastDrag.current = { dx: snappedDx, dy: snappedDy };
        onDragMove(snappedDx, snappedDy);
      },
      onPanResponderRelease: () => {
        onDragEnd(lastDrag.current.dx, lastDrag.current.dy);
      },
      onPanResponderTerminate: () => {
        onDragEnd(lastDrag.current.dx, lastDrag.current.dy);
      },
    }), [event, dayIndex, onDragStart, onDragMove, onDragEnd]
  );

  // Top resize pan responder
  const topResizePanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastResize.current = 0;
        onResizeStart(event, 'top');
      },
      onPanResponderMove: (_, gs) => {
        const snappedDy = Math.round(gs.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        lastResize.current = snappedDy;
        onResizeMove(snappedDy);
      },
      onPanResponderRelease: () => {
        onResizeEnd(lastResize.current, 'top');
      },
      onPanResponderTerminate: () => {
        onResizeEnd(lastResize.current, 'top');
      },
    }), [event, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Bottom resize pan responder
  const bottomResizePanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastResize.current = 0;
        onResizeStart(event, 'bottom');
      },
      onPanResponderMove: (_, gs) => {
        const snappedDy = Math.round(gs.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        lastResize.current = snappedDy;
        onResizeMove(snappedDy);
      },
      onPanResponderRelease: () => {
        onResizeEnd(lastResize.current, 'bottom');
      },
      onPanResponderTerminate: () => {
        onResizeEnd(lastResize.current, 'bottom');
      },
    }), [event, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Corner resize pan responders
  const createCornerPanResponder = (handle: CornerHandle) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastDrag.current = { dx: 0, dy: 0 };
        onCornerResizeStart(event, handle, dayIndex);
      },
      onPanResponderMove: (_, gs) => {
        const snappedDx = Math.round(gs.dx / DAY_COLUMN_WIDTH) * DAY_COLUMN_WIDTH;
        const snappedDy = Math.round(gs.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        lastDrag.current = { dx: snappedDx, dy: snappedDy };
        onCornerResizeMove(snappedDx, snappedDy);
      },
      onPanResponderRelease: onCornerResizeEnd,
      onPanResponderTerminate: onCornerResizeEnd,
    });

  const bottomRightPanResponder = useMemo(
    () => createCornerPanResponder('bottom-right'),
    [event, dayIndex, onCornerResizeStart, onCornerResizeMove, onCornerResizeEnd]
  );

  // Get color based on service
  const getEventColor = () => {
    if (event.service) {
      switch (event.service.toLowerCase()) {
        case 'woodgreen':
        case 'landscaping':
          return '#22c55e';
        case 'whiteknight':
        case 'snow':
          return '#3b82f6';
        case 'pupawalk':
        case 'pet':
          return '#a855f7';
        default:
          return tokens.accent;
      }
    }
    return tokens.accent;
  };

  const color = getEventColor();
  const isInteracting = isDragging || isResizing || isCornerResizing;

  return (
    <View
      style={[
        weekEventStyles.container,
        {
          backgroundColor: color + '30',
          borderLeftColor: color,
          opacity: isInteracting ? 0.8 : 1,
          zIndex: isInteracting ? 100 : 1,
        },
      ]}
      {...dragPanResponder.panHandlers}
    >
      {/* Top resize handle */}
      <View
        style={weekEventStyles.resizeHandleTop}
        {...topResizePanResponder.panHandlers}
      >
        <View style={[weekEventStyles.resizeBar, { backgroundColor: color }]} />
      </View>

      {/* Event content */}
      <TouchableOpacity
        style={weekEventStyles.content}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text
          style={[weekEventStyles.title, { color }]}
          numberOfLines={height > 30 ? 2 : 1}
        >
          {event.title}
        </Text>
      </TouchableOpacity>

      {/* Bottom resize handle */}
      <View
        style={weekEventStyles.resizeHandleBottom}
        {...bottomResizePanResponder.panHandlers}
      >
        <View style={[weekEventStyles.resizeBar, { backgroundColor: color }]} />
      </View>

      {/* Bottom-right corner handle for multi-day resize */}
      <View
        style={weekEventStyles.cornerHandleBottomRight}
        {...bottomRightPanResponder.panHandlers}
      >
        <View style={[weekEventStyles.cornerIndicator, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const weekEventStyles = StyleSheet.create({
  container: {
    flex: 1,
    borderLeftWidth: 2,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  title: {
    fontSize: 9,
    fontWeight: '600',
  },
  resizeHandleTop: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    zIndex: 20,
  },
  resizeHandleBottom: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    zIndex: 20,
  },
  resizeBar: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  cornerHandleBottomRight: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  cornerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.8,
  },
});

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      paddingVertical: 8,
    },
    timeHeaderSpacer: {
      width: TIME_LABEL_WIDTH,
    },
    dayHeader: {
      width: DAY_COLUMN_WIDTH,
      alignItems: 'center',
    },
    dayName: {
      fontSize: 11,
      color: tokens.textSecondary,
      fontWeight: '500',
    },
    dateCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    todayCircle: {
      backgroundColor: tokens.accent,
    },
    dateNumber: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    todayText: {
      color: tokens.accent,
    },
    todayDateText: {
      color: tokens.textPrimary,
    },
    scrollView: {
      flex: 1,
    },
    gridContainer: {
      flexDirection: 'row',
    },
    timeColumn: {
      width: TIME_LABEL_WIDTH,
    },
    hourLabelRow: {
      height: PIXELS_PER_HOUR,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingRight: 4,
    },
    hourText: {
      fontSize: 9,
      color: tokens.textSecondary,
      marginTop: -6,
    },
    daysContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    dayColumn: {
      width: DAY_COLUMN_WIDTH,
      position: 'relative',
      borderLeftWidth: 1,
      borderLeftColor: tokens.border,
    },
    hourSlot: {
      height: PIXELS_PER_HOUR,
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
    eventWrapper: {
      position: 'absolute',
      left: 1,
      right: 1,
      zIndex: 10,
      overflow: 'visible',
    },
    currentTimeLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: '#ef4444',
      zIndex: 100,
    },
  });
