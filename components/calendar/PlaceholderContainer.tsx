/**
 * PlaceholderContainer - Visual placeholder during drag-to-create events
 * Shows time range, duration, and animates appearance/updates
 * Supports editing mode with resize handles and action buttons
 * Supports drag-to-move functionality for repositioning events
 */
import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ViewStyle, TouchableOpacity, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureType } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  formatTime,
  formatDuration,
  PIXELS_PER_HOUR,
  triggerLongPressHaptic,
  triggerSnapHaptic,
} from './gestures/gestureUtils';

// Height thresholds for adaptive display
const COMPACT_HEIGHT_THRESHOLD = 35;
const MEDIUM_HEIGHT_THRESHOLD = 50;

// Drag-to-move constants
const DRAG_LONG_PRESS_DURATION_MS = 400;
const SNAP_MINUTES = 15;

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
  // Drag-to-move props
  onDragMoveStart?: () => void;
  onDragMove?: (delta: { x: number; y: number }) => void;
  onDragMoveEnd?: () => void;
  // Fixed overlay positioning (for scroll-aware rendering)
  scrollOffset?: number;
  topClipAmount?: number;
  bottomClipAmount?: number;
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
  onDragMoveStart,
  onDragMove,
  onDragMoveEnd,
  scrollOffset = 0,
  topClipAmount = 0,
  bottomClipAmount = 0,
}: PlaceholderContainerProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Animation values
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  // Drag-to-move state
  const isDraggingBody = useSharedValue(false);
  const dragScale = useSharedValue(1);
  const lastSnappedMinutesRef = useRef(0);

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
    transform: [{ scale: scale.value * dragScale.value }],
    opacity: opacity.value,
  }));

  // Animated style for dragging body visual feedback
  const animatedDragStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(dragScale.value, [1, 1.02], [0.3, 0.5]),
    elevation: interpolate(dragScale.value, [1, 1.02], [4, 8]),
  }));

  // Dynamic container style based on props
  // When width is explicitly set (number or string like "100%"), use it and remove right constraint
  // This prevents double-margin issues when placeholder is in a positioned wrapper
  const containerPositionStyle: ViewStyle = {
    top,
    left: typeof left === 'number' ? left : undefined,
    width: width !== undefined ? (width as DimensionValue) : undefined,
    // Remove right constraint when width is explicitly set to avoid layout conflicts
    right: width !== undefined ? undefined : 8,
    height: Math.max(calculatedHeight, 20),
  };

  // Create resize gesture for a handle
  // Note: hitSlop is kept small to prevent capturing touches outside the placeholder
  // The handle itself is 24px tall which provides adequate touch target
  // These gestures should NOT interfere with scroll because:
  // 1. They're only attached to small handle areas (not the whole scroll area)
  // 2. The placeholder wrapper has pointerEvents="box-none" allowing touches to pass through
  // 3. failOffsetX causes the gesture to fail when horizontal movement exceeds threshold
  const createResizeGesture = (handle: ResizeHandleType): GestureType => {
    return Gesture.Pan()
      .enabled(isEditing)
      .minDistance(0) // Activate immediately to ensure resize feels responsive
      .activeOffsetY([-5, 5]) // Only activate after 5px vertical movement
      .failOffsetX([-15, 15]) // Fail if horizontal movement exceeds 15px (allow scroll)
      .hitSlop({ top: 8, bottom: 8, left: 0, right: 0 }) // Vertical-only expansion, minimal
      .shouldCancelWhenOutside(true) // Cancel if finger moves outside handle area
      .onBegin(() => {
        'worklet';
        console.log('[PlaceholderContainer] Gesture onBegin:', handle);
      })
      .onStart(() => {
        'worklet';
        console.log('[PlaceholderContainer] Gesture onStart:', handle);
        if (onResizeStart) {
          runOnJS(onResizeStart)(handle);
        }
      })
      .onUpdate((event) => {
        'worklet';
        // onUpdate fires continuously during active gesture
        if (onResizeMove) {
          runOnJS(onResizeMove)(handle, { x: event.translationX, y: event.translationY });
        }
      })
      .onEnd(() => {
        'worklet';
        console.log('[PlaceholderContainer] Gesture onEnd:', handle);
        if (onResizeEnd) {
          runOnJS(onResizeEnd)(handle);
        }
      });
  };

  // Create gestures for each handle
  const topResizeGesture = useMemo(() => createResizeGesture('top'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);
  const bottomResizeGesture = useMemo(() => createResizeGesture('bottom'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);
  const leftResizeGesture = useMemo(() => createResizeGesture('left'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);
  const rightResizeGesture = useMemo(() => createResizeGesture('right'), [isEditing, onResizeStart, onResizeMove, onResizeEnd]);

  // Helper functions for haptic feedback during body drag
  const handleDragMoveStartJS = () => {
    triggerLongPressHaptic();
    lastSnappedMinutesRef.current = 0;
    onDragMoveStart?.();
  };

  const handleDragMoveUpdateJS = (translationY: number) => {
    // Calculate minute offset from translation
    const rawMinutesDelta = (translationY / PIXELS_PER_HOUR) * 60;
    const snappedMinutes = Math.round(rawMinutesDelta / SNAP_MINUTES) * SNAP_MINUTES;

    // Trigger haptic on snap point change
    if (snappedMinutes !== lastSnappedMinutesRef.current) {
      triggerSnapHaptic();
      lastSnappedMinutesRef.current = snappedMinutes;
    }

    onDragMove?.({ x: 0, y: translationY });
  };

  const handleDragMoveEndJS = () => {
    onDragMoveEnd?.();
  };

  // Create body drag gesture (long-press + pan)
  // This allows dragging the entire placeholder to reposition it
  // The long press activation (400ms) prevents interfering with scroll:
  // - Quick drags will be handled as scroll by the underlying ScrollView
  // - Only intentional long-press + drag will move the placeholder
  const bodyDragGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isEditing && !!onDragMove)
      .activateAfterLongPress(DRAG_LONG_PRESS_DURATION_MS)
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        'worklet';
        console.log('[PlaceholderContainer] Body drag onBegin');
      })
      .onStart(() => {
        'worklet';
        console.log('[PlaceholderContainer] Body drag onStart');
        isDraggingBody.value = true;
        dragScale.value = withSpring(1.02, { damping: 15, stiffness: 400 });
        runOnJS(handleDragMoveStartJS)();
      })
      .onUpdate((event) => {
        'worklet';
        runOnJS(handleDragMoveUpdateJS)(event.translationY);
      })
      .onEnd(() => {
        'worklet';
        console.log('[PlaceholderContainer] Body drag onEnd');
        isDraggingBody.value = false;
        dragScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        runOnJS(handleDragMoveEndJS)();
      })
      .onFinalize(() => {
        'worklet';
        isDraggingBody.value = false;
        dragScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      });
  }, [isEditing, onDragMove, onDragMoveStart, onDragMoveEnd, isDraggingBody, dragScale]);

  if (!visible) {
    return null;
  }

  // Show action buttons only in editing mode with enough space
  const showActionButtons = isEditing && calculatedHeight > 40;
  const showResizeHandles = isEditing;

  // Hide resize handles when they would be clipped off-screen
  // Top handle is hidden if top is clipped
  const showTopHandle = showResizeHandles && topClipAmount === 0;
  // Bottom handle is hidden if bottom is clipped
  const showBottomHandle = showResizeHandles && bottomClipAmount === 0;

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
      {/* Top resize handle - hidden when clipped at top */}
      {/* Outer container spans full width for centering, inner touchable area is constrained */}
      {showTopHandle && (
        <View style={styles.resizeHandleContainer} pointerEvents="box-none">
          <GestureDetector gesture={topResizeGesture}>
            <View style={styles.resizeHandleTouchArea}>
              <View style={[styles.handleBar, { backgroundColor: tokens.accent }]} />
            </View>
          </GestureDetector>
        </View>
      )}

      {/* Left resize handle (week view only for multi-day) */}
      {showResizeHandles && viewType === 'week' && (
        <GestureDetector gesture={leftResizeGesture}>
          <View style={styles.resizeHandleLeft}>
            <View style={[styles.handleBarVertical, { backgroundColor: tokens.accent }]} />
          </View>
        </GestureDetector>
      )}

      {/* Body drag gesture wrapper - wraps inner content for drag-to-move */}
      <GestureDetector gesture={bodyDragGesture}>
        <Animated.View style={[styles.innerContainer, animatedDragStyle]}>
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

          {/* Action buttons in editing mode - placed outside drag zone */}
          {showActionButtons && (
            <View style={styles.actionButtons} pointerEvents="box-none">
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
            <View style={styles.inlineActions} pointerEvents="box-none">
              <TouchableOpacity onPress={onConfirm} activeOpacity={0.7}>
                <Ionicons name="checkmark-circle" size={20} color={tokens.accent} />
              </TouchableOpacity>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        </Animated.View>
      </GestureDetector>

      {/* Right resize handle (week view only for multi-day) */}
      {showResizeHandles && viewType === 'week' && (
        <GestureDetector gesture={rightResizeGesture}>
          <View style={styles.resizeHandleRight}>
            <View style={[styles.handleBarVertical, { backgroundColor: tokens.accent }]} />
          </View>
        </GestureDetector>
      )}

      {/* Bottom resize handle - hidden when clipped at bottom */}
      {/* Outer container spans full width for centering, inner touchable area is constrained */}
      {showBottomHandle && (
        <View style={[styles.resizeHandleContainer, styles.resizeHandleContainerBottom]} pointerEvents="box-none">
          <GestureDetector gesture={bottomResizeGesture}>
            <View style={styles.resizeHandleTouchArea}>
              <View style={[styles.handleBar, { backgroundColor: tokens.accent }]} />
            </View>
          </GestureDetector>
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      // Note: 'right' is set dynamically in containerPositionStyle based on whether width is explicit
      // This prevents double-margin issues when placeholder is in a positioned wrapper
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
    // Resize handle container - spans full width for centering, but doesn't capture touches
    resizeHandleContainer: {
      position: 'absolute',
      top: -12,
      left: 0,
      right: 0,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    },
    resizeHandleContainerBottom: {
      top: undefined,
      bottom: -12,
    },
    // Constrained touch area for resize gestures - prevents capturing scroll gestures
    resizeHandleTouchArea: {
      width: 60, // Handle bar (24px) + touch padding (18px each side)
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
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
