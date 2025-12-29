/**
 * YearCalendarMini - A compact 12-month year calendar grid for the action bottom sheet
 *
 * Features:
 * - 12-month grid showing current year
 * - Year navigation with arrows
 * - Current month highlighted
 * - Today indicator
 * - Tap month to navigate main calendar
 * - Event density indicators per month
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { Event } from '../../lib/api/types';

interface YearCalendarMiniProps {
  /** Currently selected date in the main calendar */
  selectedDate: Date;
  /** Events to show density indicators */
  events: Event[];
  /** Callback when a month is tapped */
  onMonthSelect: (date: Date) => void;
  /** Callback when "Go to Today" is pressed */
  onGoToToday?: () => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function YearCalendarMini({
  selectedDate,
  events,
  onMonthSelect,
  onGoToToday,
}: YearCalendarMiniProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Year being displayed (can be navigated)
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();

  // Calculate event counts per month for the displayed year
  const eventCountsByMonth = useMemo(() => {
    const counts: number[] = new Array(12).fill(0);

    events.forEach(event => {
      const eventDate = new Date(event.startTime);
      if (eventDate.getFullYear() === displayYear) {
        counts[eventDate.getMonth()]++;
      }
    });

    return counts;
  }, [events, displayYear]);

  // Navigate to previous year
  const handlePreviousYear = useCallback(() => {
    setDisplayYear(prev => prev - 1);
  }, []);

  // Navigate to next year
  const handleNextYear = useCallback(() => {
    setDisplayYear(prev => prev + 1);
  }, []);

  // Handle month tap
  const handleMonthPress = useCallback((monthIndex: number) => {
    const newDate = new Date(displayYear, monthIndex, 1);
    onMonthSelect(newDate);
  }, [displayYear, onMonthSelect]);

  // Handle go to today
  const handleGoToToday = useCallback(() => {
    setDisplayYear(currentYear);
    onGoToToday?.();
  }, [currentYear, onGoToToday]);

  // Get event density level for styling
  const getDensityLevel = useCallback((count: number): 'none' | 'low' | 'medium' | 'high' => {
    if (count === 0) return 'none';
    if (count <= 3) return 'low';
    if (count <= 8) return 'medium';
    return 'high';
  }, []);

  // Check if we're not viewing the current year
  const isViewingDifferentYear = displayYear !== currentYear;

  return (
    <View style={styles.container}>
      {/* Year Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePreviousYear}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGoToToday}
          style={styles.yearTitle}
        >
          <Text style={styles.yearText}>{displayYear}</Text>
          {isViewingDifferentYear && (
            <Ionicons name="refresh" size={14} color={tokens.accent} style={styles.refreshIcon} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNextYear}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={tokens.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Month Grid - 4x3 layout */}
      <View style={styles.monthGrid}>
        {MONTHS.map((monthName, index) => {
          const isCurrentMonth = displayYear === currentYear && index === currentMonth;
          const isSelectedMonth = displayYear === selectedYear && index === selectedMonth;
          const eventCount = eventCountsByMonth[index];
          const densityLevel = getDensityLevel(eventCount);

          return (
            <TouchableOpacity
              key={monthName}
              style={[
                styles.monthCell,
                isCurrentMonth && styles.currentMonthCell,
                isSelectedMonth && styles.selectedMonthCell,
              ]}
              onPress={() => handleMonthPress(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.monthText,
                  isCurrentMonth && styles.currentMonthText,
                  isSelectedMonth && styles.selectedMonthText,
                ]}
              >
                {monthName}
              </Text>

              {/* Event density indicator */}
              {densityLevel !== 'none' && (
                <View
                  style={[
                    styles.densityDot,
                    densityLevel === 'low' && styles.densityLow,
                    densityLevel === 'medium' && styles.densityMedium,
                    densityLevel === 'high' && styles.densityHigh,
                  ]}
                />
              )}

              {/* Today indicator */}
              {isCurrentMonth && (
                <View style={styles.todayIndicator} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick navigation hint */}
      <Text style={styles.hint}>Tap a month to navigate</Text>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    navButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: tokens.surface,
    },
    yearTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: tokens.surface,
    },
    yearText: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    refreshIcon: {
      marginLeft: 8,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    monthCell: {
      width: '24%',
      aspectRatio: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: tokens.surface,
      position: 'relative',
    },
    currentMonthCell: {
      borderWidth: 2,
      borderColor: tokens.accent,
    },
    selectedMonthCell: {
      backgroundColor: tokens.accent,
    },
    monthText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    currentMonthText: {
      color: tokens.accent,
      fontWeight: '700',
    },
    selectedMonthText: {
      color: '#ffffff',
      fontWeight: '700',
    },
    densityDot: {
      position: 'absolute',
      bottom: 4,
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    densityLow: {
      backgroundColor: tokens.accent + '60',
    },
    densityMedium: {
      backgroundColor: tokens.accent + '90',
    },
    densityHigh: {
      backgroundColor: tokens.accent,
    },
    todayIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ef4444',
    },
    hint: {
      fontSize: 12,
      color: tokens.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });
