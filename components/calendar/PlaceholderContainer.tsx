/**
 * PlaceholderContainer - Visual placeholder during drag-to-create events
 * Shows time range, duration, and animates appearance/updates
 */
import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  formatTime,
  formatDuration,
  PIXELS_PER_HOUR,
} from './gestures/gestureUtils';

// Height thresholds for adaptive display
const COMPACT_HEIGHT_THRESHOLD = 35;
const MEDIUM_HEIGHT_THRESHOLD = 50;

export type PlaceholderViewType = 'day' | 'week' | 'month';

export interface PlaceholderContainerProps {
  visible: boolean;
  startTime: Date;
  endTime: Date;
  onComplete: (start: Date, end: Date) => void;
  onCancel: () => void;
  viewType: PlaceholderViewType;
  // Positioning props
  top?: number;
  left?: number;
  width?: number | string;
  height?: number;
  // Optional title from form sync
  title?: string;
  // Multi-day indicator
  isMultiDay?: boolean;
  daySpan?: number;
}

export default function PlaceholderContainer({
  visible,
  startTime,
  endTime,
  onComplete,
  onCancel,
  viewType,
  top = 0,
  left = 56,
  width = undefined,
  height: propHeight,
  title,
  isMultiDay = false,
  daySpan = 1,
}: PlaceholderContainerProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Animation values
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  // Calculate duration in minutes
  const durationMinutes = useMemo(() => {
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }, [startTime, endTime]);

  // Calculate height based on duration if not provided
  const calculatedHeight = propHeight ?? (durationMinutes / 60) * PIXELS_PER_HOUR;

  // Format times for display
  const startHour = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinutes = endTime.getMinutes();

  const startTimeStr = formatTime(startHour, startMinutes);
  const endTimeStr = formatTime(endHour, endMinutes);
  const durationStr = formatDuration(durationMinutes);

  // Determine display mode based on height
  const displayMode = useMemo(() => {
    if (calculatedHeight < COMPACT_HEIGHT_THRESHOLD) return 'ultra-compact';
    if (calculatedHeight < MEDIUM_HEIGHT_THRESHOLD) return 'compact';
    return 'full';
  }, [calculatedHeight]);

  // Animation when visibility changes
  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0, { duration: 100 });
    }
  }, [visible, scale, opacity]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Dynamic container style based on props
  const containerPositionStyle: ViewStyle = {
    top,
    left: typeof left === 'number' ? left : undefined,
    width: typeof width === 'number' ? width : undefined,
    height: Math.max(calculatedHeight, 20),
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        containerPositionStyle,
        animatedContainerStyle,
      ]}
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      pointerEvents="none"
    >
      <View style={styles.innerContainer}>
        {/* Time display - always visible */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText} numberOfLines={1}>
            {displayMode === 'ultra-compact'
              ? `${startTimeStr}`
              : `${startTimeStr} - ${endTimeStr}`}
          </Text>
        </View>

        {/* Title - only in full mode */}
        {displayMode === 'full' && title && (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        )}

        {/* Duration - in compact and full modes */}
        {displayMode !== 'ultra-compact' && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationText}>{durationStr}</Text>
          </View>
        )}

        {/* Multi-day indicator */}
        {isMultiDay && (
          <View style={styles.multiDayBadge}>
            <Text style={styles.multiDayText}>
              {daySpan} {daySpan === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

        {/* New Event label for full mode without title */}
        {displayMode === 'full' && !title && (
          <Text style={styles.newEventText}>New Event</Text>
        )}
      </View>
    </Animated.View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      right: 8,
      borderRadius: 6,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: tokens.accent,
      backgroundColor: `${tokens.accent}30`,
      borderLeftWidth: 4,
      overflow: 'hidden',
      zIndex: 50,
    },
    innerContainer: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      justifyContent: 'center',
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeText: {
      fontSize: 11,
      fontWeight: '600',
      color: tokens.accent,
    },
    titleText: {
      fontSize: 12,
      fontWeight: '700',
      color: tokens.accent,
      marginTop: 2,
    },
    durationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    durationText: {
      fontSize: 10,
      color: tokens.accent,
      opacity: 0.8,
    },
    multiDayBadge: {
      backgroundColor: `${tokens.accent}20`,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    multiDayText: {
      fontSize: 9,
      color: tokens.accent,
      fontWeight: '500',
    },
    newEventText: {
      fontSize: 11,
      fontWeight: '500',
      color: tokens.accent,
      opacity: 0.7,
      marginTop: 2,
    },
  });
