/**
 * MonthView - Monthly calendar grid with event indicators
 */
import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

const DAYS_IN_WEEK = 7;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = SCREEN_WIDTH / DAYS_IN_WEEK;

interface MonthViewProps {
  date: Date;
  events: Event[];
  onDayPress?: (date: Date) => void;
  onEventPress?: (event: Event) => void;
}

export default function MonthView({
  date,
  events,
  onDayPress,
  onEventPress,
}: MonthViewProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

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

      {/* Calendar grid */}
      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => {
              const dayEvents = getEventsForDate(day.date);
              const hasEvents = dayEvents.length > 0;

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    day.isToday && styles.todayCell,
                  ]}
                  onPress={() => onDayPress?.(day.date)}
                  activeOpacity={0.7}
                >
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

                  {/* Event previews for larger cells */}
                  {hasEvents && (
                    <View style={styles.eventPreviews}>
                      {dayEvents.slice(0, 2).map((event) => (
                        <TouchableOpacity
                          key={event.id}
                          style={[
                            styles.eventPreview,
                            { backgroundColor: getEventColor(event) + '30' },
                          ]}
                          onPress={() => onEventPress?.(event)}
                        >
                          <Text
                            style={[
                              styles.eventPreviewText,
                              { color: getEventColor(event) },
                            ]}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                        </TouchableOpacity>
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
    dayNumberContainer: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
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
