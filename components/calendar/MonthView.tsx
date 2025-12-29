/**
 * MonthView - Monthly calendar grid with draggable event indicators
 * Supports long-press drag for multi-day event creation
 */
import React, { useMemo, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import DraggableMonthEvent from './DraggableMonthEvent';

const DAYS_IN_WEEK = 7;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = SCREEN_WIDTH / DAYS_IN_WEEK;

// Multi-day selection state
interface MultiDaySelection {
  startDate: Date;
  endDate: Date;
  isSelecting: boolean;
}

interface MonthViewProps {
  date: Date;
  events: Event[];
  onDayPress?: (date: Date) => void;
  onEventPress?: (event: Event) => void;
  onCreateEvent?: (date: Date) => void;
  onEventMove?: (event: Event, newDate: Date) => void;
  onMultiDayCreate?: (startDate: Date, endDate: Date) => void;
}

export default function MonthView({
  date,
  events,
  onDayPress,
  onEventPress,
  onCreateEvent,
  onEventMove,
  onMultiDayCreate,
}: MonthViewProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Multi-day selection state
  const [selection, setSelection] = useState<MultiDaySelection | null>(null);
  const [gridLayout, setGridLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle grid layout
  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setGridLayout({ x, y, width, height });
  }, []);

  // Get calendar grid data
  const calendarDays = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Previous month days to show
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dayOfMonth: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = startingDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      days.push({
        date: new Date(year, month - 1, day),
        dayOfMonth: day,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      days.push({
        date: currentDate,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday:
          currentDate.getDate() === today.getDate() &&
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear(),
      });
    }

    // Next month padding (to complete the grid)
    const remainingDays = 42 - days.length; // 6 weeks max
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        dayOfMonth: day,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [date]);

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (targetDate: Date) => {
      const dateStr = targetDate.toISOString().split('T')[0];
      return events.filter((event) => {
        const eventDate = new Date(event.startTime).toISOString().split('T')[0];
        return eventDate === dateStr;
      });
    },
    [events]
  );

  // Get color for event dot
  const getEventColor = useCallback(
    (event: Event) => {
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
    },
    [tokens.accent]
  );

  // Split days into weeks
  const weeks = useMemo(() => {
    const result: typeof calendarDays[] = [];
    for (let i = 0; i < calendarDays.length; i += DAYS_IN_WEEK) {
      result.push(calendarDays.slice(i, i + DAYS_IN_WEEK));
    }
    return result;
  }, [calendarDays]);

  // Calculate row height (6 weeks in grid)
  const rowHeight = useMemo(() => {
    return gridLayout.height / 6;
  }, [gridLayout.height]);

  // Get date from touch coordinates
  const getDateFromPosition = useCallback((x: number, y: number): Date | null => {
    if (gridLayout.width === 0 || gridLayout.height === 0) return null;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / rowHeight);

    if (col < 0 || col >= DAYS_IN_WEEK || row < 0 || row >= 6) return null;

    const dayIndex = row * DAYS_IN_WEEK + col;
    if (dayIndex >= 0 && dayIndex < calendarDays.length) {
      return calendarDays[dayIndex].date;
    }
    return null;
  }, [gridLayout, rowHeight, calendarDays]);

  // Check if a date is in the selection range
  const isDateInSelection = useCallback((targetDate: Date): boolean => {
    if (!selection) return false;

    const target = targetDate.getTime();
    const start = Math.min(selection.startDate.getTime(), selection.endDate.getTime());
    const end = Math.max(selection.startDate.getTime(), selection.endDate.getTime());

    return target >= start && target <= end;
  }, [selection]);

  // Calculate selection span in days
  const selectionDaySpan = useMemo(() => {
    if (!selection) return 0;
    const start = Math.min(selection.startDate.getTime(), selection.endDate.getTime());
    const end = Math.max(selection.startDate.getTime(), selection.endDate.getTime());
    return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  }, [selection]);

  // Long press gesture for multi-day selection
  const longPressGesture = useMemo(() =>
    Gesture.LongPress()
      .minDuration(500)
      .onStart((event) => {
        const targetDate = getDateFromPosition(event.x, event.y);
        if (targetDate) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelection({
            startDate: targetDate,
            endDate: targetDate,
            isSelecting: true,
          });
        }
      }),
    [getDateFromPosition]
  );

  // Pan gesture for extending selection
  const panGesture = useMemo(() =>
    Gesture.Pan()
      .activateAfterLongPress(500)
      .onUpdate((event) => {
        if (!selection?.isSelecting) return;

        const targetDate = getDateFromPosition(event.x, event.y);
        if (targetDate && targetDate.getTime() !== selection.endDate.getTime()) {
          // Limit selection to 14 days
          const daysDiff = Math.abs(
            Math.round((targetDate.getTime() - selection.startDate.getTime()) / (24 * 60 * 60 * 1000))
          );
          if (daysDiff <= 14) {
            Haptics.selectionAsync();
            setSelection(prev => prev ? { ...prev, endDate: targetDate } : null);
          }
        }
      })
      .onEnd(() => {
        if (selection?.isSelecting && onMultiDayCreate) {
          const start = new Date(Math.min(selection.startDate.getTime(), selection.endDate.getTime()));
          const end = new Date(Math.max(selection.startDate.getTime(), selection.endDate.getTime()));

          // Set default times (9 AM start, 10 AM end for all-day events or multi-day)
          start.setHours(9, 0, 0, 0);
          end.setHours(10, 0, 0, 0);

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onMultiDayCreate(start, end);
        }
        setSelection(null);
      }),
    [selection, getDateFromPosition, onMultiDayCreate]
  );

  // Compose gestures
  const composedGesture = useMemo(() =>
    Gesture.Simultaneous(longPressGesture, panGesture),
    [longPressGesture, panGesture]
  );

  return (
    <View style={styles.container}>
      {/* Day name headers */}
      <View style={styles.header}>
        {DAY_NAMES.map((name) => (
          <View key={name} style={styles.headerCell}>
            <Text style={styles.headerText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid with gesture detection */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.grid} onLayout={handleGridLayout}>
          {/* Selection indicator overlay */}
          {selection && (
            <View style={styles.selectionOverlay} pointerEvents="none">
              <View style={styles.selectionBadge}>
                <Text style={styles.selectionText}>
                  {selectionDaySpan} {selectionDaySpan === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>
          )}

          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((day, dayIndex) => {
                const dayEvents = getEventsForDate(day.date);
                const hasEvents = dayEvents.length > 0;
                const isSelected = isDateInSelection(day.date);

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      day.isToday && styles.todayCell,
                      isSelected && styles.selectedCell,
                    ]}
                    onPress={() => onDayPress?.(day.date)}
                    activeOpacity={0.7}
                  >
                  <View style={styles.dayHeader}>
                    <View
                      style={[
                        styles.dayNumberContainer,
                        day.isToday && styles.todayNumberContainer,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !day.isCurrentMonth && styles.otherMonthDay,
                          day.isToday && styles.todayNumber,
                        ]}
                      >
                        {day.dayOfMonth}
                      </Text>
                    </View>

                    {/* Plus button for creating events */}
                    {day.isCurrentMonth && onCreateEvent && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          onCreateEvent(day.date);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="add-circle" size={14} color={tokens.accent} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Event indicators */}
                  {hasEvents && (
                    <View style={styles.eventIndicators}>
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <TouchableOpacity
                          key={event.id}
                          style={[
                            styles.eventDot,
                            { backgroundColor: getEventColor(event) },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            onEventPress?.(event);
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <Text style={styles.moreEvents}>
                          +{dayEvents.length - 3}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Event previews - draggable to move between days */}
                  {hasEvents && (
                    <View style={styles.eventPreviews}>
                      {dayEvents.slice(0, 2).map((event) => (
                        <DraggableMonthEvent
                          key={event.id}
                          event={event}
                          color={getEventColor(event)}
                          onPress={() => onEventPress?.(event)}
                          onEventMove={onEventMove}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <Text style={styles.moreEventsText}>
                          +{dayEvents.length - 2} more
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        </Animated.View>
      </GestureDetector>
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
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      paddingVertical: 8,
    },
    headerCell: {
      width: CELL_SIZE,
      alignItems: 'center',
    },
    headerText: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    grid: {
      flex: 1,
    },
    week: {
      flexDirection: 'row',
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    dayCell: {
      width: CELL_SIZE,
      minHeight: 80,
      padding: 4,
      borderRightWidth: 1,
      borderRightColor: tokens.border,
    },
    todayCell: {
      backgroundColor: tokens.accent + '10',
    },
    selectedCell: {
      backgroundColor: tokens.accent + '30',
      borderColor: tokens.accent,
    },
    selectionOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      alignItems: 'center',
      paddingTop: 4,
    },
    selectionBadge: {
      backgroundColor: tokens.accent,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    selectionText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    dayNumberContainer: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    addButton: {
      width: 14,
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayNumberContainer: {
      backgroundColor: tokens.accent,
    },
    dayNumber: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    otherMonthDay: {
      color: tokens.textSecondary,
      opacity: 0.5,
    },
    todayNumber: {
      color: '#ffffff',
      fontWeight: '700',
    },
    eventIndicators: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 2,
      marginTop: 4,
      display: 'none', // Hidden in favor of eventPreviews on larger screens
    },
    eventDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    moreEvents: {
      fontSize: 8,
      color: tokens.textSecondary,
    },
    eventPreviews: {
      flex: 1,
      marginTop: 2,
      gap: 2,
    },
    eventPreview: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
    },
    eventPreviewText: {
      fontSize: 9,
      fontWeight: '500',
    },
    moreEventsText: {
      fontSize: 8,
      color: tokens.textSecondary,
      marginTop: 2,
    },
  });
