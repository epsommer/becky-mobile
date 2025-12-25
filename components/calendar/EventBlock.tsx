/**
 * EventBlock - Draggable and resizable calendar event component
 */
import React, { useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../lib/api/types';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';

const PIXELS_PER_HOUR = 60;
const MIN_EVENT_HEIGHT = 30; // 30 min minimum
const SNAP_INTERVAL = 15; // Snap to 15-minute intervals
const RESIZE_HANDLE_HEIGHT = 16; // Taller hit area for resize handles
const CORNER_HANDLE_SIZE = 44; // Touch target size for corner handles (44x44 for accessibility)

// Helper to convert pixels to time for logging
const pixelsToMinutes = (pixels: number) => Math.round((pixels / PIXELS_PER_HOUR) * 60);

interface EventBlockProps {
  event: Event;
  topOffset: number;
  height: number;
  onDragStart?: (event: Event) => void;
  onDragMove?: (dy: number) => void;
  onDragEnd?: (dy: number) => void;
  onResizeStart?: (event: Event, handle: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onResizeMove?: (dy: number, handle: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onResizeEnd?: (dy: number, handle: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onPress?: (event: Event) => void;
  isDragging?: boolean;
  isResizing?: boolean;
}

export default function EventBlock({
  event,
  topOffset,
  height,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onPress,
  isDragging = false,
  isResizing = false,
}: EventBlockProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const lastDy = useRef(0);

  // Note: Resize visual feedback is handled by parent (DayView) via props
  // We only track resize state locally to prevent drag from activating during resize

  // Format time for display
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);

  // Reset pan when topOffset or height changes (meaning parent re-rendered with new position)
  // But only if we're not actively dragging
  React.useEffect(() => {
    if (!isDragging) {
      pan.setValue({ x: 0, y: 0 });
    }
  }, [topOffset, height, isDragging]);

  // Track if we're currently resizing to prevent drag from taking over
  const isResizingRef = useRef(false);

  // Main drag pan responder - using useMemo to recreate when callbacks change
  const dragPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Don't start drag if we're resizing
        return !isResizingRef.current;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Don't capture if resizing, only capture vertical drags > 5px
        return !isResizingRef.current && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        if (isResizingRef.current) return;
        lastDy.current = 0;
        // Reset pan at drag start in case it wasn't reset
        pan.setValue({ x: 0, y: 0 });
        console.log('[EventBlock] Drag started:', event.title);
        onDragStart?.(event);
        Animated.spring(scale, {
          toValue: 1.02,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isResizingRef.current) return;
        // Snap to 15-minute intervals
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        lastDy.current = snappedDy;
        pan.setValue({ x: 0, y: snappedDy });
        onDragMove?.(snappedDy);
      },
      onPanResponderRelease: () => {
        if (isResizingRef.current) return;
        const finalDy = lastDy.current;
        console.log('[EventBlock] Drag released, dy:', finalDy);
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        // Don't reset pan here - let the useEffect reset it when topOffset changes
        // This prevents the visual snapback before re-render
        onDragEnd?.(finalDy);
      },
      onPanResponderTerminate: () => {
        if (isResizingRef.current) return;
        const finalDy = lastDy.current;
        console.log('[EventBlock] Drag terminated, dy:', finalDy);
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        // Also call onDragEnd on terminate to ensure state is updated
        onDragEnd?.(finalDy);
      },
    }), [event, onDragStart, onDragMove, onDragEnd]
  );

  // Track resize offset - we track both current and peak values
  // The peak value helps when user's finger drifts slightly on release
  const lastResizeDy = useRef(0);
  const peakResizeDy = useRef(0); // Track the maximum absolute value reached

  // Top resize handle pan responder - uses capture phase to prevent parent from intercepting
  const topResizePanResponder = useMemo(() =>
    PanResponder.create({
      // Capture phase - intercept before parent can claim
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isResizingRef.current = true;
        lastResizeDy.current = 0;
        peakResizeDy.current = 0;
        console.log('[EventBlock] ========== TOP RESIZE START ==========');
        console.log('[EventBlock] Event:', event.title, 'ID:', event.id);
        console.log('[EventBlock] Props received - topOffset:', topOffset, 'height:', height);
        console.log('[EventBlock] Event times:', event.startTime, 'to', event.endTime);
        onResizeStart?.(event, 'top');
      },
      onPanResponderMove: (_, gestureState) => {
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        // Clamp to prevent making event too small (min 30 min = 30px)
        const maxDy = height - MIN_EVENT_HEIGHT;
        const clampedDy = Math.min(snappedDy, maxDy);
        if (clampedDy !== lastResizeDy.current) {
          console.log('[EventBlock] TOP resize move - raw dy:', gestureState.dy, 'snapped:', snappedDy, 'clamped:', clampedDy);
        }
        lastResizeDy.current = clampedDy;
        // Track peak value (most negative for top resize = dragging up)
        if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
          peakResizeDy.current = clampedDy;
        }
        onResizeMove?.(clampedDy, 'top');
      },
      onPanResponderRelease: () => {
        // Use last value, but if it snapped to 0 and we had a peak, use the peak
        // This handles the case where user's finger drifts slightly on release
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          console.log('[EventBlock] Last value was 0 but peak was:', peakResizeDy.current, '- using peak value');
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] ========== TOP RESIZE RELEASE ==========');
        console.log('[EventBlock] Last dy:', lastResizeDy.current, 'Peak dy:', peakResizeDy.current, 'Final dy:', finalDy);
        console.log('[EventBlock] Final dy:', finalDy, 'px =', pixelsToMinutes(finalDy), 'min change');
        console.log('[EventBlock] Expected new top:', topOffset + finalDy, 'expected new height:', height - finalDy);
        console.log('[EventBlock] Calling onResizeEnd with dy:', finalDy, 'handle: top');
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'top');
        console.log('[EventBlock] onResizeEnd called, isResizingRef now:', isResizingRef.current);
      },
      onPanResponderTerminate: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] TOP resize TERMINATED, dy:', finalDy);
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'top');
      },
    }), [event, topOffset, height, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Bottom resize handle pan responder - uses capture phase to prevent parent from intercepting
  const bottomResizePanResponder = useMemo(() =>
    PanResponder.create({
      // Capture phase - intercept before parent can claim
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isResizingRef.current = true;
        lastResizeDy.current = 0;
        peakResizeDy.current = 0;
        console.log('[EventBlock] ========== BOTTOM RESIZE START ==========');
        console.log('[EventBlock] Event:', event.title, 'ID:', event.id);
        console.log('[EventBlock] Props received - topOffset:', topOffset, 'height:', height);
        console.log('[EventBlock] Event times:', event.startTime, 'to', event.endTime);
        onResizeStart?.(event, 'bottom');
      },
      onPanResponderMove: (_, gestureState) => {
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        // Clamp to prevent making event too small (min 30 min = 30px)
        const minDy = -(height - MIN_EVENT_HEIGHT);
        const clampedDy = Math.max(snappedDy, minDy);
        if (clampedDy !== lastResizeDy.current) {
          console.log('[EventBlock] BOTTOM resize move - raw dy:', gestureState.dy, 'snapped:', snappedDy, 'clamped:', clampedDy);
        }
        lastResizeDy.current = clampedDy;
        // Track peak value (most positive for bottom resize = dragging down)
        if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
          peakResizeDy.current = clampedDy;
        }
        onResizeMove?.(clampedDy, 'bottom');
      },
      onPanResponderRelease: () => {
        // Use last value, but if it snapped to 0 and we had a peak, use the peak
        // This handles the case where user's finger drifts slightly on release
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          console.log('[EventBlock] Last value was 0 but peak was:', peakResizeDy.current, '- using peak value');
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] ========== BOTTOM RESIZE RELEASE ==========');
        console.log('[EventBlock] Last dy:', lastResizeDy.current, 'Peak dy:', peakResizeDy.current, 'Final dy:', finalDy);
        console.log('[EventBlock] Final dy:', finalDy, 'px =', pixelsToMinutes(finalDy), 'min change');
        console.log('[EventBlock] Expected new height:', height + finalDy);
        console.log('[EventBlock] Calling onResizeEnd with dy:', finalDy, 'handle: bottom');
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'bottom');
        console.log('[EventBlock] onResizeEnd called, isResizingRef now:', isResizingRef.current);
      },
      onPanResponderTerminate: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] BOTTOM resize TERMINATED, dy:', finalDy);
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'bottom');
      },
    }), [event, topOffset, height, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Top-left corner resize handle pan responder
  const topLeftCornerPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isResizingRef.current = true;
        lastResizeDy.current = 0;
        peakResizeDy.current = 0;
        console.log('[EventBlock] ========== TOP-LEFT CORNER RESIZE START ==========');
        onResizeStart?.(event, 'top-left');
      },
      onPanResponderMove: (_, gestureState) => {
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        const maxDy = height - MIN_EVENT_HEIGHT;
        const clampedDy = Math.min(snappedDy, maxDy);
        lastResizeDy.current = clampedDy;
        if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
          peakResizeDy.current = clampedDy;
        }
        onResizeMove?.(clampedDy, 'top-left');
      },
      onPanResponderRelease: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] TOP-LEFT corner resize released, dy:', finalDy);
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'top-left');
      },
      onPanResponderTerminate: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'top-left');
      },
    }), [event, topOffset, height, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Top-right corner resize handle pan responder
  const topRightCornerPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isResizingRef.current = true;
        lastResizeDy.current = 0;
        peakResizeDy.current = 0;
        console.log('[EventBlock] ========== TOP-RIGHT CORNER RESIZE START ==========');
        onResizeStart?.(event, 'top-right');
      },
      onPanResponderMove: (_, gestureState) => {
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        const maxDy = height - MIN_EVENT_HEIGHT;
        const clampedDy = Math.min(snappedDy, maxDy);
        lastResizeDy.current = clampedDy;
        if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
          peakResizeDy.current = clampedDy;
        }
        onResizeMove?.(clampedDy, 'top-right');
      },
      onPanResponderRelease: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] TOP-RIGHT corner resize released, dy:', finalDy);
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'top-right');
      },
      onPanResponderTerminate: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'top-right');
      },
    }), [event, topOffset, height, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Bottom-left corner resize handle pan responder
  const bottomLeftCornerPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isResizingRef.current = true;
        lastResizeDy.current = 0;
        peakResizeDy.current = 0;
        console.log('[EventBlock] ========== BOTTOM-LEFT CORNER RESIZE START ==========');
        onResizeStart?.(event, 'bottom-left');
      },
      onPanResponderMove: (_, gestureState) => {
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        const minDy = -(height - MIN_EVENT_HEIGHT);
        const clampedDy = Math.max(snappedDy, minDy);
        lastResizeDy.current = clampedDy;
        if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
          peakResizeDy.current = clampedDy;
        }
        onResizeMove?.(clampedDy, 'bottom-left');
      },
      onPanResponderRelease: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] BOTTOM-LEFT corner resize released, dy:', finalDy);
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'bottom-left');
      },
      onPanResponderTerminate: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'bottom-left');
      },
    }), [event, topOffset, height, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Bottom-right corner resize handle pan responder
  const bottomRightCornerPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isResizingRef.current = true;
        lastResizeDy.current = 0;
        peakResizeDy.current = 0;
        console.log('[EventBlock] ========== BOTTOM-RIGHT CORNER RESIZE START ==========');
        onResizeStart?.(event, 'bottom-right');
      },
      onPanResponderMove: (_, gestureState) => {
        const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4);
        const minDy = -(height - MIN_EVENT_HEIGHT);
        const clampedDy = Math.max(snappedDy, minDy);
        lastResizeDy.current = clampedDy;
        if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
          peakResizeDy.current = clampedDy;
        }
        onResizeMove?.(clampedDy, 'bottom-right');
      },
      onPanResponderRelease: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        console.log('[EventBlock] BOTTOM-RIGHT corner resize released, dy:', finalDy);
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'bottom-right');
      },
      onPanResponderTerminate: () => {
        let finalDy = lastResizeDy.current;
        if (finalDy === 0 && peakResizeDy.current !== 0) {
          finalDy = peakResizeDy.current;
        }
        isResizingRef.current = false;
        onResizeEnd?.(finalDy, 'bottom-right');
      },
    }), [event, topOffset, height, onResizeStart, onResizeMove, onResizeEnd]
  );

  // Get color based on service/status
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

  const eventColor = getEventColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          height: Math.max(height, MIN_EVENT_HEIGHT),
          backgroundColor: eventColor + '20',
          borderLeftColor: eventColor,
          transform: [
            // Only use pan transform for drag - resize visual feedback comes from parent props
            { translateY: isDragging ? pan.y : 0 },
            { scale: scale },
          ],
          zIndex: isDragging || isResizing ? 1000 : 1,
          opacity: isDragging ? 0.9 : 1,
        },
      ]}
      {...dragPanResponder.panHandlers}
    >
      {/* Top resize handle */}
      <View
        style={styles.resizeHandleTop}
        {...topResizePanResponder.panHandlers}
      >
        <View style={[styles.resizeIndicator, { backgroundColor: eventColor }]} />
      </View>

      {/* Event content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: eventColor }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.time}>
          {startTime} - {endTime}
        </Text>
        {event.clientId && height > 50 && (
          <View style={styles.clientRow}>
            <Ionicons name="person-outline" size={10} color={tokens.textSecondary} />
            <Text style={styles.client} numberOfLines={1}>
              {event.clientId}
            </Text>
          </View>
        )}
        {event.location && height > 70 && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={10} color={tokens.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom resize handle */}
      <View
        style={styles.resizeHandleBottom}
        {...bottomResizePanResponder.panHandlers}
      >
        <View style={[styles.resizeIndicator, { backgroundColor: eventColor }]} />
      </View>

      {/* Corner resize handles */}
      {/* Top-left corner */}
      <View
        style={[styles.cornerHandle, styles.cornerTopLeft]}
        {...topLeftCornerPanResponder.panHandlers}
      >
        <View style={[styles.cornerDot, { backgroundColor: eventColor }]} />
      </View>

      {/* Top-right corner */}
      <View
        style={[styles.cornerHandle, styles.cornerTopRight]}
        {...topRightCornerPanResponder.panHandlers}
      >
        <View style={[styles.cornerDot, { backgroundColor: eventColor }]} />
      </View>

      {/* Bottom-left corner */}
      <View
        style={[styles.cornerHandle, styles.cornerBottomLeft]}
        {...bottomLeftCornerPanResponder.panHandlers}
      >
        <View style={[styles.cornerDot, { backgroundColor: eventColor }]} />
      </View>

      {/* Bottom-right corner */}
      <View
        style={[styles.cornerHandle, styles.cornerBottomRight]}
        {...bottomRightCornerPanResponder.panHandlers}
      >
        <View style={[styles.cornerDot, { backgroundColor: eventColor }]} />
      </View>

      {/* Drag indicator */}
      {isDragging && (
        <View style={styles.dragIndicator}>
          <Ionicons name="move" size={16} color={eventColor} />
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 56,
      right: 8,
      borderLeftWidth: 3,
      borderRadius: 6,
      overflow: 'hidden',
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    resizeHandleTop: {
      position: 'absolute',
      top: -4, // Extend above the event for easier touch
      left: 0,
      right: 0,
      height: RESIZE_HANDLE_HEIGHT,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 6,
      zIndex: 20,
    },
    resizeHandleBottom: {
      position: 'absolute',
      bottom: -4, // Extend below the event for easier touch
      left: 0,
      right: 0,
      height: RESIZE_HANDLE_HEIGHT,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 6,
      zIndex: 20,
    },
    resizeIndicator: {
      width: 40,
      height: 4,
      borderRadius: 2,
      opacity: 0.6,
    },
    content: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      justifyContent: 'center',
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
    },
    time: {
      fontSize: 10,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    client: {
      fontSize: 10,
      color: tokens.textSecondary,
      flex: 1,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    location: {
      fontSize: 10,
      color: tokens.textSecondary,
      flex: 1,
    },
    dragIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
    cornerHandle: {
      position: 'absolute',
      width: CORNER_HANDLE_SIZE,
      height: CORNER_HANDLE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30,
    },
    cornerTopLeft: {
      top: -CORNER_HANDLE_SIZE / 2,
      left: -CORNER_HANDLE_SIZE / 2,
    },
    cornerTopRight: {
      top: -CORNER_HANDLE_SIZE / 2,
      right: -CORNER_HANDLE_SIZE / 2,
    },
    cornerBottomLeft: {
      bottom: -CORNER_HANDLE_SIZE / 2,
      left: -CORNER_HANDLE_SIZE / 2,
    },
    cornerBottomRight: {
      bottom: -CORNER_HANDLE_SIZE / 2,
      right: -CORNER_HANDLE_SIZE / 2,
    },
    cornerDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      opacity: 0.8,
    },
  });

export { PIXELS_PER_HOUR };
