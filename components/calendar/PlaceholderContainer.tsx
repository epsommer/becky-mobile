/**
 * PlaceholderContainer - Visual placeholder during drag-to-create events
 * Shows time range, duration, and animates appearance/updates
 * Supports editing mode with resize handles and action buttons
 */
import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureType } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
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
export type ResizeHandleType = 'top' | 'bottom' | 'left' | 'right';

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
  // Editing mode props
  isEditing?: boolean;
  onResizeStart?: (handle: ResizeHandleType) => void;
  onResizeMove?: (handle: ResizeHandleType, delta: { x: number; y: number }) => void;
  onResizeEnd?: (handle: ResizeHandleType) => void;
  onConfirm?: () => void;
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
  isEditing = false,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onConfirm,
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

  // Animated styles - using ONLY animated opacity (no layout animations to avoid conflict)
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

  // Create resize gesture for a handle
  const createResizeGesture = (handle: ResizeHandleType): GestureType => {
    return Gesture.Pan()
      .enabled(isEditing)
      .onStart(() => {
        onResizeStart?.(handle);
      })
      .onUpdate((event) => {
        onResizeMove?.(handle, { x: event.translationX, y: event.translationY });
      })
      .onEnd(() => {
        onResizeEnd?.(handle);
      });
  };

  // Create gestures for each handle
  const topResizeGesture = useMemo(() => createResizeGesture('top'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);
  const bottomResizeGesture = useMemo(() => createResizeGesture('bottom'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);
  const leftResizeGesture = useMemo(() => createResizeGesture('left'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);
  const rightResizeGesture = useMemo(() => createResizeGesture('right'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);

  if (!visible) {
    return null;
  }

  // Show action buttons only in editing mode with enough space
  const showActionButtons = isEditing && calculatedHeight > 40;
  const showResizeHandles = isEditing;

  return (
    <Animated.View
      style={[
        styles.container,
        containerPositionStyle,
        animatedContainerStyle,
        isEditing && styles.editingContainer,
      ]}
      // Remove pointerEvents="none" when editing to allow interaction
      pointerEvents={isEditing ? 'auto' : 'none'}
    >
      {/* Top resize handle */}
      {showResizeHandles && (
        <GestureDetector gesture={topResizeGesture}>
          <View style={styles.resizeHandleTop}>
            <View style={[styles.handleBar, { backgroundColor: tokens.accent }]} />
          </View>
        </GestureDetector>
      )}

      {/* Left resize handle (week view only for multi-day) */}
      {showResizeHandles && viewType === 'week' && (
        <GestureDetector gesture={leftResizeGesture}>
          <View style={styles.resizeHandleLeft}>
            <View style={[styles.handleBarVertical, { backgroundColor: tokens.accent }]} />
          </View>
        </GestureDetector>
      )}

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
        {displayMode === 'full' && !title && !isEditing && (
          <Text style={styles.newEventText}>New Event</Text>
        )}

        {/* Action buttons in editing mode */}
        {showActionButtons && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.actionButton, styles.confirmButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.actionButton, styles.cancelButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Inline action buttons for compact mode */}
        {isEditing && !showActionButtons && (
          <View style={styles.inlineActions}>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.7}>
              <Ionicons name="checkmark-circle" size={20} color={tokens.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Right resize handle (week view only for multi-day) */}
      {showResizeHandles && viewType === 'week' && (
        <GestureDetector gesture={rightResizeGesture}>
          <View style={styles.resizeHandleRight}>
            <View style={[styles.handleBarVertical, { backgroundColor: tokens.accent }]} />
          </View>
        </GestureDetector>
      )}

      {/* Bottom resize handle */}
      {showResizeHandles && (
        <GestureDetector gesture={bottomResizeGesture}>
          <View style={styles.resizeHandleBottom}>
            <View style={[styles.handleBar, { backgroundColor: tokens.accent }]} />
          </View>
        </GestureDetector>
      )}
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
      overflow: 'visible',
      zIndex: 50,
    },
    editingContainer: {
      borderStyle: 'solid',
      borderWidth: 2,
      borderLeftWidth: 4,
      shadowColor: tokens.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
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
    // Resize handles
    resizeHandleTop: {
      position: 'absolute',
      top: -8,
      left: 0,
      right: 0,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
    },
    resizeHandleBottom: {
      position: 'absolute',
      bottom: -8,
      left: 0,
      right: 0,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
    },
    resizeHandleLeft: {
      position: 'absolute',
      left: -8,
      top: 0,
      bottom: 0,
      width: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
    },
    resizeHandleRight: {
      position: 'absolute',
      right: -8,
      top: 0,
      bottom: 0,
      width: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
    },
    handleBar: {
      width: 24,
      height: 4,
      borderRadius: 2,
      opacity: 0.8,
    },
    handleBarVertical: {
      width: 4,
      height: 24,
      borderRadius: 2,
      opacity: 0.8,
    },
    // Action buttons
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 6,
      marginTop: 6,
    },
    actionButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButton: {
      backgroundColor: '#22c55e',
    },
    cancelButton: {
      backgroundColor: '#64748b',
    },
    inlineActions: {
      position: 'absolute',
      right: 4,
      top: 2,
      flexDirection: 'row',
      gap: 4,
    },
  });
