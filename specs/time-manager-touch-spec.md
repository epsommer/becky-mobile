# Time Manager Touch Implementation Specification

**Version:** 1.0
**Date:** 2025-12-19
**Purpose:** Technical specification for implementing web time manager drag-and-drop behaviors using mobile touch gestures in React Native
**Target Platform:** React Native (Becky Mobile App)
**Source Analysis:** `/Users/epsommer/projects/analyses/time-manager-drag-analysis.md`

---

## Overview

This specification maps web-based drag-and-drop interactions to touch-based equivalents for the React Native mobile time manager. The web implementation uses HTML5 drag-and-drop with mouse events, while mobile uses React Native's PanResponder API for touch gestures.

### Key Principles

1. **Direct Manipulation**: Mobile uses direct manipulation (event follows finger) instead of web's ghost preview approach
2. **Always-Visible Controls**: Touch lacks hover states, so resize handles are always visible
3. **Modal-Based Creation**: Mobile uses modal for event creation instead of web's double-click + drag pattern
4. **Platform Consistency**: Maintain existing mobile UX patterns while adding missing web features

### Implementation Goals

- Replicate web's 15-minute snapping behavior
- Support multi-day event creation and resizing
- Provide clear visual feedback during gestures
- Handle edge cases (gesture conflicts, touch cancellation)
- Maintain 60fps performance

---

## Touch Event Mapping

### Single Touch Events

#### Tap (Equivalent to Click)

**Definition**: Quick press and release without movement

**Timing Threshold**:
```typescript
const TAP_MAX_DURATION_MS = 200
const TAP_MAX_MOVEMENT_PX = 5
```

**Detection Logic**:
```typescript
onPanResponderRelease: (e, gestureState) => {
  const duration = gestureState.t1 - gestureState.t0
  const movement = Math.sqrt(
    Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
  )

  if (duration < TAP_MAX_DURATION_MS && movement < TAP_MAX_MOVEMENT_PX) {
    handleTap()
  }
}
```

**Usage**:
- Open event details modal
- Select time slot for event creation
- Dismiss modals/overlays

#### Long Press (Initiates Drag Creation)

**Definition**: Press and hold for extended duration before movement

**Duration Threshold**:
```typescript
const LONG_PRESS_DURATION_MS = 500
```

**Detection Logic**:
```typescript
const longPressTimer = useRef<NodeJS.Timeout | null>(null)

onPanResponderGrant: (e) => {
  longPressTimer.current = setTimeout(() => {
    // Long press detected - initiate drag creation
    hapticFeedback('impactMedium')
    startPlaceholderCreation(e)
  }, LONG_PRESS_DURATION_MS)
}

onPanResponderMove: (e, gestureState) => {
  // Cancel long press if finger moves before threshold
  if (Math.abs(gestureState.dy) > TAP_MAX_MOVEMENT_PX) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
}

onPanResponderRelease: () => {
  // Clean up timer on release
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }
}
```

**Visual Feedback**:
```typescript
// After long press detected
Animated.sequence([
  Animated.timing(scaleValue, {
    toValue: 1.05,
    duration: 100,
    useNativeDriver: true,
  }),
  Animated.timing(scaleValue, {
    toValue: 1.0,
    duration: 100,
    useNativeDriver: true,
  })
]).start()
```

**Haptic Feedback**:
```typescript
import * as Haptics from 'expo-haptics'

// On long press detection
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
```

---

### Drag Gesture Events

#### Pan Gesture Start (Maps to onDragStart)

**Activation Conditions**:
```typescript
// For event drag
onStartShouldSetPanResponder: () => !isResizing

// For resize handles (uses capture phase)
onStartShouldSetPanResponderCapture: () => true
```

**Initial State Setup**:
```typescript
interface DragState {
  isDragging: boolean
  draggedEvent: Event | null
  startY: number
  currentY: number
  startOffset: number
  snapOffset: number // Snapped to 15-min intervals
}

onPanResponderGrant: (e, gestureState) => {
  setDragState({
    isDragging: true,
    draggedEvent: event,
    startY: e.nativeEvent.pageY,
    currentY: e.nativeEvent.pageY,
    startOffset: topOffset,
    snapOffset: 0,
  })

  // Trigger visual feedback
  Animated.spring(scaleValue, {
    toValue: 1.02,
    friction: 7,
    tension: 40,
    useNativeDriver: true,
  }).start()
}
```

**Visual Feedback**:
```typescript
// Scale animation
scaleValue: 1.0 → 1.02

// Shadow elevation
elevation: 3 → 8
shadowOpacity: 0.1 → 0.25
shadowRadius: 4 → 8

// Z-index
zIndex: 1 → 1000
```

#### Pan Gesture Active (Maps to onDrag)

**Position Tracking Approach**:
```typescript
onPanResponderMove: (e, gestureState) => {
  if (!isDragging) return

  // Raw movement
  const rawDy = gestureState.dy

  // Snap to 15-minute intervals (PIXELS_PER_HOUR / 4)
  const SNAP_INTERVAL_PX = PIXELS_PER_HOUR / 4 // 60px/hr ÷ 4 = 15px per 15min
  const snappedDy = Math.round(rawDy / SNAP_INTERVAL_PX) * SNAP_INTERVAL_PX

  // Update animated value
  pan.setValue({ x: 0, y: snappedDy })

  // Update state for parent component
  setDragState(prev => ({
    ...prev,
    currentY: e.nativeEvent.pageY,
    snapOffset: snappedDy,
  }))

  // Optional: Provide haptic feedback on snap points
  if (snappedDy !== previousSnapOffset.current) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    previousSnapOffset.current = snappedDy
  }
}
```

**Placeholder Movement Logic**:
```typescript
// For drag creation (long-press initiated)
const placeholderHeight = Math.abs(snappedDy)
const placeholderTop = snappedDy < 0
  ? startOffset + snappedDy
  : startOffset

return (
  <Animated.View
    style={[
      styles.placeholder,
      {
        top: placeholderTop,
        height: Math.max(placeholderHeight, MIN_EVENT_HEIGHT),
        opacity: opacityValue,
      }
    ]}
  >
    {/* Placeholder content */}
  </Animated.View>
)
```

**Boundary Constraints**:
```typescript
// Clamp to calendar grid boundaries
const gridTop = 0
const gridBottom = 24 * PIXELS_PER_HOUR // 24 hours

const clampedY = Math.max(
  gridTop - startOffset,
  Math.min(snappedDy, gridBottom - startOffset - eventHeight)
)

// For multi-day events (week view), also constrain horizontally
const clampedX = Math.max(
  0,
  Math.min(gestureState.dx, maxDayWidth)
)
```

**Real-time Visual Updates**:
```typescript
// Event position during drag
<Animated.View
  style={[
    styles.eventBlock,
    {
      transform: [
        { translateY: pan.y },
        { scale: scaleValue },
      ],
      zIndex: isDragging ? 1000 : 1,
      elevation: isDragging ? 8 : 3,
    }
  ]}
>
```

#### Pan Gesture End (Maps to onDrop/onDragEnd)

**Drop Zone Detection**:
```typescript
onPanResponderRelease: (e, gestureState) => {
  const finalY = e.nativeEvent.pageY

  // Calculate target time slot
  const targetHour = Math.floor((finalY - gridTop) / PIXELS_PER_HOUR)
  const targetMinuteOffset = ((finalY - gridTop) % PIXELS_PER_HOUR)
  const targetMinute = Math.round(targetMinuteOffset / (PIXELS_PER_HOUR / 4)) * 15

  // Clamp to valid range
  const clampedHour = Math.max(0, Math.min(23, targetHour))
  const clampedMinute = Math.max(0, Math.min(45, targetMinute))

  const dropZone = {
    date: targetDate,
    hour: clampedHour,
    minute: clampedMinute,
  }

  handleDrop(dropZone)
}
```

**Success vs Cancel Handling**:
```typescript
const handleDrop = (dropZone: DropZone) => {
  // Check if drop is valid
  const isValidDrop = validateDropZone(dropZone, draggedEvent)

  if (isValidDrop) {
    // Success: Update event
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1.0,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(pan, {
        toValue: { x: 0, y: 0 },
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start(() => {
      // After animation completes
      onEventUpdate(draggedEvent, dropZone)
      resetDragState()
    })

    // Haptic success feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } else {
    // Cancel: Animate back to original position
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1.0,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      resetDragState()
    })

    // Haptic error feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }
}
```

**Animation to Final Position**:
```typescript
// Animate to final position (success case)
const finalOffset = calculateFinalOffset(dropZone)

Animated.timing(positionValue, {
  toValue: finalOffset,
  duration: 250,
  easing: Easing.out(Easing.cubic),
  useNativeDriver: true,
}).start(() => {
  // Update actual component props after animation
  onEventUpdate(draggedEvent, dropZone)
})
```

---

### Drop Zone Detection

#### Hit Testing Approach

**Coordinate Mapping**:
```typescript
interface TouchCoordinates {
  pageX: number
  pageY: number
  locationX: number // Relative to touched element
  locationY: number
}

const getDropZoneFromTouch = (
  touch: TouchCoordinates,
  gridRef: RefObject<View>
): DropZone | null => {
  if (!gridRef.current) return null

  // Measure grid container
  gridRef.current.measure((x, y, width, height, pageX, pageY) => {
    // Convert touch coordinates to grid-relative
    const relativeY = touch.pageY - pageY
    const relativeX = touch.pageX - pageX

    // Calculate time slot
    const hour = Math.floor(relativeY / PIXELS_PER_HOUR)
    const minuteOffset = relativeY % PIXELS_PER_HOUR
    const minute = Math.round(minuteOffset / (PIXELS_PER_HOUR / 4)) * 15

    // Calculate day (for week view)
    const dayIndex = Math.floor(relativeX / dayColumnWidth)
    const date = addDays(weekStartDate, dayIndex)

    return {
      date: format(date, 'yyyy-MM-dd'),
      hour: Math.max(0, Math.min(23, hour)),
      minute: Math.max(0, Math.min(45, minute)),
    }
  })
}
```

**Valid Drop Target Determination**:
```typescript
const validateDropZone = (
  dropZone: DropZone,
  draggedEvent: Event
): boolean => {
  // Check if slot is within calendar bounds
  if (dropZone.hour < 0 || dropZone.hour > 23) return false
  if (dropZone.minute < 0 || dropZone.minute > 45) return false

  // Check for conflicts (optional - can warn instead of blocking)
  const conflicts = getConflictingEvents(dropZone, draggedEvent.duration)
  if (conflicts.length > 0) {
    // Show warning but allow drop
    showConflictWarning(conflicts)
  }

  return true
}
```

#### Visual Feedback for Valid/Invalid Zones

**Current Implementation** (Mobile doesn't show drop zones - direct manipulation):
```typescript
// Mobile uses direct manipulation - no separate drop zone highlights
// Event stays under finger during drag
```

**Recommended Enhancement** (Optional):
```typescript
// Show subtle highlight at predicted drop location
const DropZoneHighlight: React.FC<{ dropZone: DropZone }> = ({ dropZone }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start()
  }, [])

  return (
    <Animated.View
      style={[
        styles.dropZoneHighlight,
        {
          top: dropZone.hour * PIXELS_PER_HOUR + (dropZone.minute / 60) * PIXELS_PER_HOUR,
          opacity: fadeAnim,
        }
      ]}
    />
  )
}

const styles = StyleSheet.create({
  dropZoneHighlight: {
    position: 'absolute',
    left: 56,
    right: 8,
    height: 2,
    backgroundColor: tokens.accent,
    opacity: 0.5,
  },
})
```

---

## Style Specifications

### Dragging State Styles

**React Native Implementation**:
```typescript
const draggingStyles = {
  // Scale transformation
  transform: [
    { translateY: pan.y },
    { scale: 1.02 }, // Subtle lift effect
  ],

  // Elevation (Android)
  elevation: 8,

  // Shadow (iOS)
  shadowColor: tokens.shadowDark,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,

  // Opacity (maintained at 1.0 - different from web)
  opacity: 1.0,

  // Z-index
  zIndex: 1000,

  // Background (no change from default)
  backgroundColor: eventColor + '20', // 20% opacity hex

  // Border
  borderLeftWidth: 3,
  borderLeftColor: eventColor,
}
```

**Comparison to Web**:
```css
/* Web dragging styles */
.event-dragging {
  opacity: 0.5;          /* Mobile: 1.0 */
  cursor: grabbing;      /* Mobile: N/A */
  z-index: 100;          /* Mobile: 1000 */
  transform: none;       /* Mobile: scale(1.02) */
}
```

### Placeholder Styles

**Web CSS to React Native Translation**:

```typescript
// Web CSS
const webPlaceholderCSS = `
  background: hsl(var(--accent) / 0.3);  /* 30% opacity */
  border: 2px dashed hsl(var(--accent));
  border-left: 4px dashed hsl(var(--accent));
  border-radius: 0.375rem;  /* 6px */
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  pointer-events: none;
  will-change: top, height;
  z-index: 5;
`

// React Native equivalent
const placeholderStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 56, // After time column
    right: 8,
    zIndex: 5,
    borderRadius: 6,
    backgroundColor: tokens.accent + '4D', // 30% opacity (hex: 4D = 30%)
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: tokens.accent,
    borderLeftWidth: 4,

    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,

    // Elevation (Android)
    elevation: 1,
  },

  // Ultra-compact mode (< 35px height)
  ultraCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  // Compact mode (35-50px height)
  compact: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  // Full mode (> 50px height)
  full: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
})
```

**Dynamic Content Display**:
```typescript
const PlaceholderEvent: React.FC<PlaceholderProps> = ({
  height,
  startTime,
  endTime,
  duration,
  title
}) => {
  const isUltraCompact = height < 35
  const isCompact = height < 50

  const formatTimeShort = (date: Date) =>
    format(date, 'h:mma').toLowerCase()

  const formatTimeFull = (date: Date) =>
    format(date, 'h:mm a')

  return (
    <View style={[
      placeholderStyles.container,
      isUltraCompact && placeholderStyles.ultraCompact,
      isCompact && !isUltraCompact && placeholderStyles.compact,
      !isCompact && placeholderStyles.full,
      { height, top: calculateTop() }
    ]}>
      {isUltraCompact && (
        <View style={styles.ultraCompactContent}>
          <Ionicons name="time-outline" size={12} color={tokens.accentForeground} />
          <Text style={styles.timeTextCompact}>
            {formatTimeShort(startTime)} - {formatTimeShort(endTime)}
          </Text>
        </View>
      )}

      {!isUltraCompact && isCompact && (
        <View style={styles.compactContent}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color={tokens.accentForeground} />
            <Text style={styles.timeTextCompact}>
              {formatTimeShort(startTime)} - {formatTimeShort(endTime)}
            </Text>
            {duration >= 30 && (
              <Text style={styles.durationBadge}>
                ({formatDuration(duration)})
              </Text>
            )}
          </View>
        </View>
      )}

      {!isCompact && (
        <View style={styles.fullContent}>
          <Text style={styles.titleText}>{title || 'New Event'}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={tokens.accentForeground} />
            <Text style={styles.timeTextFull}>
              {formatTimeFull(startTime)} - {formatTimeFull(endTime)}
            </Text>
          </View>
          {duration > 60 && (
            <Text style={styles.durationText}>
              {formatDuration(duration)}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
```

### Drop Target Styles

**Web to Mobile Translation**:

Web doesn't use drop zone highlights (direct manipulation on mobile is preferred), but if implementing:

```typescript
const dropTargetStyles = StyleSheet.create({
  // Valid drop zone (equivalent to web's bg-accent/15)
  valid: {
    backgroundColor: tokens.accent + '26', // 15% opacity (hex: 26 ≈ 15%)
    borderColor: tokens.accent,
    borderWidth: 1,
    borderStyle: 'dashed',
  },

  // Invalid drop zone (equivalent to web's bg-red-400/15)
  invalid: {
    backgroundColor: '#f87171' + '26', // red-400 with 15% opacity
    borderColor: '#f87171',
    borderWidth: 1,
    borderStyle: 'dashed',
  },

  // Hover state (web only - not applicable to touch)
  // Mobile equivalent: Show on drag start, hide on release
  hover: {
    backgroundColor: tokens.accent + '0D', // 5% opacity (hex: 0D ≈ 5%)
  },
})
```

**Implementation Note**: Mobile uses direct manipulation, so drop zone highlights are optional. The current implementation doesn't show them. If adding, use subtle visual cues that don't obscure content.

---

## Animation Specifications

### Drag Start Animation

**Duration**: 200ms
**Easing**: Spring (friction: 7, tension: 40)
**Properties Animated**: scale, elevation/shadow

```typescript
const startDragAnimation = () => {
  Animated.parallel([
    // Scale up
    Animated.spring(scaleValue, {
      toValue: 1.02,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }),

    // Shadow expansion (iOS only)
    Animated.timing(shadowOpacityValue, {
      toValue: 0.25,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // Shadow props can't use native driver
    }),
  ]).start()
}
```

**From/To Values**:
```typescript
{
  scale: { from: 1.0, to: 1.02 },
  shadowOpacity: { from: 0.1, to: 0.25 },
  shadowRadius: { from: 4, to: 8 },
  elevation: { from: 3, to: 8 },
  zIndex: { from: 1, to: 1000 },
}
```

### Drag Active Animation

**Duration**: Instant (no animation - follows finger)
**Easing**: N/A (real-time tracking)
**Properties Animated**: translateY

```typescript
onPanResponderMove: (e, gestureState) => {
  // Snap to 15-minute intervals
  const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4)

  // Update immediately (no animation)
  pan.setValue({ x: 0, y: snappedDy })

  // Optional: Haptic feedback on snap
  if (snappedDy !== lastSnapValue.current) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    lastSnapValue.current = snappedDy
  }
}
```

**Implementation**: Use Reanimated worklets for 60fps performance:

```typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'

const translateY = useSharedValue(0)

const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: translateY.value },
    { scale: scaleValue.value },
  ],
}))

// In gesture handler
onPanResponderMove: (e, gestureState) => {
  'worklet' // Run on UI thread
  const snappedDy = Math.round(gestureState.dy / (PIXELS_PER_HOUR / 4)) * (PIXELS_PER_HOUR / 4)
  translateY.value = snappedDy
}
```

### Drop Animation

**Duration**: 250ms
**Easing**: Cubic out
**Properties Animated**: translateY, scale, shadowOpacity

```typescript
const dropAnimation = (targetY: number) => {
  Animated.parallel([
    // Move to final position
    Animated.timing(pan, {
      toValue: { x: 0, y: targetY },
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),

    // Scale back to normal
    Animated.spring(scaleValue, {
      toValue: 1.0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }),

    // Reduce shadow
    Animated.timing(shadowOpacityValue, {
      toValue: 0.1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }),
  ]).start(() => {
    // After animation completes, reset and update props
    pan.setValue({ x: 0, y: 0 })
    onEventUpdate()
  })
}
```

**From/To Values**:
```typescript
{
  translateY: { from: currentSnapOffset, to: finalOffset },
  scale: { from: 1.02, to: 1.0 },
  shadowOpacity: { from: 0.25, to: 0.1 },
  shadowRadius: { from: 8, to: 4 },
  elevation: { from: 8, to: 3 },
  zIndex: { from: 1000, to: 1 },
}
```

### Cancel Animation

**Duration**: 300ms
**Easing**: Spring (bounce back)
**Properties Animated**: translateY, scale

```typescript
const cancelAnimation = () => {
  Animated.parallel([
    // Spring back to origin
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }),

    // Scale back to normal
    Animated.spring(scaleValue, {
      toValue: 1.0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }),

    // Reduce shadow
    Animated.timing(shadowOpacityValue, {
      toValue: 0.1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }),
  ]).start(() => {
    resetDragState()
  })

  // Haptic feedback for cancellation
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}
```

**Trigger Conditions**:
- Touch cancelled (phone call, notification)
- Dragged outside calendar bounds
- Invalid drop zone (if enforcing validation)
- User releases without movement

---

## Implementation Architecture

### Component Hierarchy

```
DayView / WeekView (Container)
├── CalendarGrid (Background with hour lines)
├── CurrentTimeIndicator (Red line showing current time)
├── TimeSlotTouchables (for tap-to-create)
├── EventBlocks (Draggable/Resizable)
│   ├── EventContent (Title, time, client, location)
│   ├── TopResizeHandle (PanResponder)
│   ├── BottomResizeHandle (PanResponder)
│   └── CornerHandles (4x, for multi-day resize)
└── PlaceholderEvent (Shown during drag creation)
    └── DynamicContent (Based on height)
```

**Component Responsibilities**:

- **DayView/WeekView**: Manages overall state, gesture coordination, API calls
- **EventBlock**: Handles drag and resize gestures, visual feedback
- **PlaceholderEvent**: Shows ghost preview during event creation
- **CalendarGrid**: Provides measurement reference for coordinate calculations
- **ResizeHandles**: Capture touch events before parent, prevent conflicts

### Props Interface Definitions

```typescript
// EventBlock Props
interface EventBlockProps {
  event: Event
  topOffset: number
  height: number

  // Drag callbacks
  onDragStart?: (event: Event) => void
  onDragMove?: (dy: number) => void
  onDragEnd?: (dy: number) => void

  // Resize callbacks
  onResizeStart?: (event: Event, handle: ResizeHandle) => void
  onResizeMove?: (dy: number, handle: ResizeHandle) => void
  onResizeEnd?: (dy: number, handle: ResizeHandle) => void

  // State flags
  isDragging?: boolean
  isResizing?: boolean

  // Tap callback
  onPress?: (event: Event) => void
}

type ResizeHandle =
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

// PlaceholderEvent Props
interface PlaceholderEventProps {
  date: string // 'yyyy-MM-dd'
  hour: number // 0-23
  minutes?: number // 0-59
  duration?: number // in minutes
  title?: string
  pixelsPerHour?: number
  endDate?: string // for multi-day
  endHour?: number
  endMinutes?: number
  isMultiDay?: boolean
}

// DayView/WeekView Props
interface CalendarViewProps {
  date: Date // Current view date
  events: Event[]
  onEventUpdate: (event: Event, updates: Partial<Event>) => Promise<void>
  onEventCreate: (eventData: CreateEventData) => Promise<void>
  onEventPress: (event: Event) => void
  pixelsPerHour?: number // Default 60
}
```

### State Management Approach

**Context Structure**:
```typescript
// CalendarContext.tsx
interface CalendarContextType {
  // Drag state
  draggingEvent: Event | null
  dragOffset: number
  setDraggingEvent: (event: Event | null) => void
  setDragOffset: (offset: number) => void

  // Resize state
  resizingEvent: Event | null
  resizeHandle: ResizeHandle | null
  resizeOffset: number
  setResizingEvent: (event: Event | null) => void
  setResizeHandle: (handle: ResizeHandle | null) => void
  setResizeOffset: (offset: number) => void

  // Placeholder state (for drag creation)
  placeholderData: PlaceholderData | null
  setPlaceholderData: (data: PlaceholderData | null) => void

  // Event operations
  updateEvent: (event: Event, updates: Partial<Event>) => Promise<void>
  createEvent: (data: CreateEventData) => Promise<void>
}

const CalendarContext = createContext<CalendarContextType | null>(null)

export const useCalendar = () => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider')
  }
  return context
}
```

**State Flow**:
```
User Long-Press → EventBlock.onPanResponderGrant
  ↓
CalendarContext.setDraggingEvent(event)
  ↓
DayView renders with isDragging=true
  ↓
User Drags → EventBlock.onPanResponderMove
  ↓
CalendarContext.setDragOffset(snappedDy)
  ↓
EventBlock animates with transform: translateY
  ↓
User Releases → EventBlock.onPanResponderRelease
  ↓
CalendarContext.updateEvent(event, newTime)
  ↓
API call → Optimistic update → On success: persist, On fail: rollback
  ↓
CalendarContext.setDraggingEvent(null)
```

### Gesture Handler Configuration

**Event Drag PanResponder**:
```typescript
const dragPanResponder = useMemo(() =>
  PanResponder.create({
    // Don't start if resizing
    onStartShouldSetPanResponder: () => !isResizingRef.current,

    // Require vertical movement > 5px
    onMoveShouldSetPanResponder: (_, gestureState) =>
      !isResizingRef.current && Math.abs(gestureState.dy) > 5,

    onPanResponderGrant: (e, gestureState) => {
      lastDy.current = 0
      pan.setValue({ x: 0, y: 0 })
      onDragStart?.(event)

      // Visual feedback
      Animated.spring(scale, {
        toValue: 1.02,
        useNativeDriver: true,
      }).start()

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },

    onPanResponderMove: (_, gestureState) => {
      if (isResizingRef.current) return

      // Snap to 15-minute intervals
      const snappedDy = Math.round(
        gestureState.dy / (PIXELS_PER_HOUR / 4)
      ) * (PIXELS_PER_HOUR / 4)

      lastDy.current = snappedDy
      pan.setValue({ x: 0, y: snappedDy })
      onDragMove?.(snappedDy)
    },

    onPanResponderRelease: () => {
      if (isResizingRef.current) return

      const finalDy = lastDy.current

      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start()

      onDragEnd?.(finalDy)
    },

    onPanResponderTerminate: () => {
      if (isResizingRef.current) return

      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start()

      onDragEnd?.(lastDy.current)
    },
  }),
  [event, onDragStart, onDragMove, onDragEnd]
)
```

**Resize Handle PanResponder (with capture phase)**:
```typescript
const topResizePanResponder = useMemo(() =>
  PanResponder.create({
    // Use capture phase to intercept before parent
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,

    onPanResponderGrant: () => {
      isResizingRef.current = true
      lastResizeDy.current = 0
      peakResizeDy.current = 0
      onResizeStart?.(event, 'top')

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },

    onPanResponderMove: (_, gestureState) => {
      const snappedDy = Math.round(
        gestureState.dy / (PIXELS_PER_HOUR / 4)
      ) * (PIXELS_PER_HOUR / 4)

      // Clamp to prevent event smaller than min height
      const maxDy = height - MIN_EVENT_HEIGHT
      const clampedDy = Math.min(snappedDy, maxDy)

      lastResizeDy.current = clampedDy

      // Track peak value (handles finger drift on release)
      if (Math.abs(clampedDy) > Math.abs(peakResizeDy.current)) {
        peakResizeDy.current = clampedDy
      }

      onResizeMove?.(clampedDy, 'top')
    },

    onPanResponderRelease: () => {
      // Use peak value if last value drifted to zero
      let finalDy = lastResizeDy.current
      if (finalDy === 0 && peakResizeDy.current !== 0) {
        finalDy = peakResizeDy.current
      }

      isResizingRef.current = false
      onResizeEnd?.(finalDy, 'top')

      // Haptic success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },

    onPanResponderTerminate: () => {
      let finalDy = lastResizeDy.current
      if (finalDy === 0 && peakResizeDy.current !== 0) {
        finalDy = peakResizeDy.current
      }

      isResizingRef.current = false
      onResizeEnd?.(finalDy, 'top')
    },
  }),
  [event, height, onResizeStart, onResizeMove, onResizeEnd]
)
```

### Integration Points with Existing Mobile Time Manager

**Existing Components to Modify**:

1. **DayView.tsx** - Add placeholder support, long-press creation
2. **WeekView.tsx** - Add multi-day drag support
3. **EventBlock.tsx** - Already has drag/resize, add refinements
4. **CalendarContext.tsx** - Add placeholder state management

**New Components to Create**:

1. **PlaceholderEvent.tsx** - Ghost preview during creation
2. **TouchUtils.ts** - Shared gesture calculation utilities
3. **HapticFeedback.ts** - Centralized haptic feedback

**API Integration**:
```typescript
// DayView.tsx
const handleDragEnd = async (dy: number) => {
  if (!draggingEvent) return

  const newTime = calculateNewTime(draggingEvent, dy)

  // Optimistic update
  setEvents(prev =>
    prev.map(e => e.id === draggingEvent.id
      ? { ...e, startTime: newTime.start, endTime: newTime.end }
      : e
    )
  )

  try {
    // API call
    await updateEvent(draggingEvent.id, {
      startTime: newTime.start,
      endTime: newTime.end,
    })

    // Success - already updated optimistically
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch (error) {
    // Rollback on failure
    setEvents(prev =>
      prev.map(e => e.id === draggingEvent.id
        ? draggingEvent // Restore original
        : e
      )
    )

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Alert.alert('Error', 'Failed to update event')
  }
}
```

### Shared State/Context Requirements

**CalendarContext Extensions**:
```typescript
// Add to existing CalendarContext
interface CalendarContextType {
  // ... existing fields ...

  // New fields for touch interactions
  placeholderData: PlaceholderData | null
  setPlaceholderData: (data: PlaceholderData | null) => void

  longPressInProgress: boolean
  setLongPressInProgress: (inProgress: boolean) => void

  // Utility functions
  calculateDropZone: (pageY: number, pageX: number) => DropZone
  validateDropZone: (zone: DropZone) => ValidationResult

  // Haptic settings
  hapticsEnabled: boolean
  setHapticsEnabled: (enabled: boolean) => void
}

interface PlaceholderData {
  date: string
  hour: number
  minutes: number
  duration: number
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
  isMultiDay?: boolean
}
```

### Event Callbacks to Parent Components

**Required Callbacks**:
```typescript
// DayView/WeekView interface
interface CalendarCallbacks {
  // Event updates
  onEventUpdate: (event: Event, updates: EventUpdates) => Promise<void>
  onEventCreate: (data: CreateEventData) => Promise<Event>
  onEventDelete: (eventId: string) => Promise<void>

  // User interactions
  onEventPress: (event: Event) => void
  onTimeSlotPress: (date: string, hour: number, minute: number) => void
  onLongPress: (date: string, hour: number, minute: number) => void

  // State changes
  onDragStart?: () => void
  onDragEnd?: () => void
  onResizeStart?: () => void
  onResizeEnd?: () => void

  // Validation
  onConflictDetected?: (conflicts: Event[]) => void
}

interface EventUpdates {
  startTime?: string
  endTime?: string
  title?: string
  location?: string
  clientId?: string
  // ... other fields
}

interface CreateEventData {
  title: string
  startTime: string
  endTime: string
  date: string
  clientId?: string
  location?: string
  service?: string
  // ... other fields
}
```

---

## Implementation Plan

### Parallel Streams

**Stream A: Core Touch Gestures** (2-3 days)
- Extract shared time calculation utilities
- Implement long-press detection for drag creation
- Add haptic feedback system
- Test gesture conflict resolution

**Stream B: Visual Feedback** (2-3 days, parallel with A)
- Create PlaceholderEvent component
- Implement animation specifications
- Add dynamic content display based on height
- Test on iOS and Android

**Stream C: State Management** (1-2 days, depends on A)
- Extend CalendarContext with placeholder state
- Add gesture state management
- Implement optimistic updates with rollback

**Stream D: Integration** (2-3 days, depends on A, B, C)
- Integrate placeholder into DayView/WeekView
- Wire up callbacks and state flow
- Add edge case handling
- Performance optimization

**Stream E: Testing & Polish** (2-3 days, final)
- Cross-device testing (iOS/Android, various screen sizes)
- Gesture conflict testing
- Performance profiling (ensure 60fps)
- Accessibility review

### Sequential Dependencies

```
Phase 1: Foundation (Parallel)
├── Stream A: Core Touch Gestures
└── Stream B: Visual Feedback

Phase 2: Integration (Sequential, depends on Phase 1)
├── Stream C: State Management
└── Stream D: Integration

Phase 3: Validation (Sequential, depends on Phase 2)
└── Stream E: Testing & Polish
```

**Dependency Graph**:
```
Shared Utilities → Core Gestures → State Management → Integration → Testing
                ↘                                    ↗
                 Visual Feedback → Animations ------↗
```

### Estimated Complexity

**Overall Effort**: 8-12 developer days

**Breakdown by Stream**:
- Stream A (Core Touch Gestures): 3 days - Medium complexity
- Stream B (Visual Feedback): 2 days - Low-medium complexity
- Stream C (State Management): 2 days - Medium complexity
- Stream D (Integration): 3 days - Medium-high complexity
- Stream E (Testing & Polish): 2 days - Medium complexity

**Risk Factors**:
- Gesture conflicts with scroll: Medium risk (mitigated with capture phase)
- Performance on low-end Android devices: Medium risk (use Reanimated)
- Haptic feedback inconsistencies across devices: Low risk (graceful degradation)

**Mitigation Strategies**:
- Use PanResponder capture phase for resize handles
- Implement Reanimated worklets for 60fps animations
- Test on oldest supported devices early
- Provide haptic settings toggle for users

---

## Edge Cases

### Gesture Conflicts

#### Conflict: Drag vs. Scroll

**Problem**: User tries to scroll calendar while touching an event

**Solution**:
```typescript
// EventBlock PanResponder
onMoveShouldSetPanResponder: (_, gestureState) => {
  // Only capture if vertical movement exceeds threshold
  const isDraggingVertically = Math.abs(gestureState.dy) > 5
  const isNotScrolling = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2

  return !isResizing && isDraggingVertically && isNotScrolling
}

// Allow scroll to take over if movement is primarily vertical in opposite direction
onPanResponderMove: (_, gestureState) => {
  // If user rapidly flicks up/down, release responder to allow scroll
  const velocity = Math.abs(gestureState.vy)
  if (velocity > 1.5) { // Rapid flick threshold
    return false // Release responder
  }
}
```

#### Conflict: Resize vs. Drag

**Problem**: Touching near resize handle might trigger drag instead

**Solution**:
```typescript
// Use capture phase for resize handles
const topResizePanResponder = PanResponder.create({
  onStartShouldSetPanResponderCapture: () => true, // Capture immediately
  onMoveShouldSetPanResponderCapture: () => true,
  // ... rest of config
})

// Use ref to coordinate between gestures
const isResizingRef = useRef(false)

onPanResponderGrant: () => {
  isResizingRef.current = true
  // ... rest of handler
}

// In drag PanResponder
onStartShouldSetPanResponder: () => !isResizingRef.current
```

#### Conflict: Multi-touch

**Problem**: User touches screen with second finger during drag

**Solution**:
```typescript
onPanResponderMove: (e, gestureState) => {
  // Check number of touches
  if (e.nativeEvent.touches.length > 1) {
    // Multi-touch detected - cancel gesture
    cancelAnimation()
    return false
  }

  // Continue normal drag
  // ...
}
```

### Error Scenarios

#### Touch Cancelled (Phone Call, Notification)

**Detection**:
```typescript
onPanResponderTerminate: () => {
  console.log('Gesture terminated by system')

  // Clean up state
  cancelAnimation()
  resetDragState()

  // No haptic feedback (user didn't intentionally cancel)
}
```

**Handling**:
```typescript
const cancelAnimation = () => {
  Animated.spring(pan, {
    toValue: { x: 0, y: 0 },
    friction: 7,
    useNativeDriver: true,
  }).start(() => {
    pan.setValue({ x: 0, y: 0 })
    resetDragState()
  })
}
```

#### Network Failure During Event Update

**Optimistic Update with Rollback**:
```typescript
const handleEventUpdate = async (event: Event, updates: Partial<Event>) => {
  // Store original state
  const originalEvent = { ...event }

  // Optimistic update
  setEvents(prev =>
    prev.map(e => e.id === event.id ? { ...e, ...updates } : e)
  )

  try {
    // API call
    await api.updateEvent(event.id, updates)

    // Success feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch (error) {
    // Rollback on failure
    setEvents(prev =>
      prev.map(e => e.id === event.id ? originalEvent : e)
    )

    // Error feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)

    // Show user-friendly error
    Alert.alert(
      'Update Failed',
      'Failed to update event. Please check your connection and try again.',
      [{ text: 'OK' }]
    )
  }
}
```

#### Invalid Drop Zone (Out of Bounds)

**Validation**:
```typescript
const validateDropZone = (dropZone: DropZone): ValidationResult => {
  // Check time bounds
  if (dropZone.hour < 0 || dropZone.hour > 23) {
    return { valid: false, reason: 'Time out of bounds' }
  }

  if (dropZone.minute < 0 || dropZone.minute > 59) {
    return { valid: false, reason: 'Invalid minute value' }
  }

  // Check date bounds (optional - depends on business logic)
  const dropDate = new Date(dropZone.date)
  const today = new Date()
  if (dropDate < today) {
    return { valid: false, reason: 'Cannot schedule in the past' }
  }

  return { valid: true }
}

// In drop handler
onPanResponderRelease: () => {
  const dropZone = calculateDropZone(...)
  const validation = validateDropZone(dropZone)

  if (!validation.valid) {
    // Animate back to original position
    cancelAnimation()

    // Show error
    Alert.alert('Invalid Drop', validation.reason)

    return
  }

  // Proceed with drop
  handleDrop(dropZone)
}
```

### Accessibility

#### Touch Target Sizes

**Minimum Sizes** (iOS Human Interface Guidelines / Android Material Design):
```typescript
const MIN_TOUCH_TARGET = 44 // iOS standard
const MIN_TOUCH_TARGET_ANDROID = 48 // Android standard

const styles = StyleSheet.create({
  // Resize handles
  resizeHandle: {
    height: Math.max(RESIZE_HANDLE_HEIGHT, MIN_TOUCH_TARGET),
    // Visual indicator smaller, hit area larger
  },

  // Corner handles
  cornerHandle: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    // Visual dot: 10x10, but hit area: 44x44
  },

  // Event blocks (minimum height)
  eventBlock: {
    minHeight: MIN_TOUCH_TARGET,
  },
})
```

#### Screen Reader Support

**Accessibility Labels**:
```typescript
<Animated.View
  accessible={true}
  accessibilityLabel={`${event.title}, ${startTime} to ${endTime}${
    event.clientId ? `, Client: ${event.clientId}` : ''
  }`}
  accessibilityHint="Double-tap to view details, or drag to reschedule"
  accessibilityRole="button"
  accessibilityState={{
    selected: isDragging,
    busy: isResizing,
  }}
  {...dragPanResponder.panHandlers}
>
```

**Accessibility Actions**:
```typescript
const accessibilityActions = [
  { name: 'view', label: 'View event details' },
  { name: 'edit', label: 'Edit event' },
  { name: 'delete', label: 'Delete event' },
  { name: 'reschedule', label: 'Reschedule event' },
]

onAccessibilityAction={(event) => {
  switch (event.nativeEvent.actionName) {
    case 'view':
      onEventPress(event)
      break
    case 'edit':
      onEventEdit(event)
      break
    case 'delete':
      onEventDelete(event)
      break
    case 'reschedule':
      showRescheduleModal(event)
      break
  }
}}
```

#### Reduced Motion Support

**Respect System Preferences**:
```typescript
import { AccessibilityInfo } from 'react-native'

const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false)

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
    setReduceMotionEnabled(enabled)
  })

  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    setReduceMotionEnabled
  )

  return () => subscription.remove()
}, [])

// In animations
const animateDrag = () => {
  if (reduceMotionEnabled) {
    // Instant transition, no animation
    pan.setValue({ x: 0, y: finalY })
  } else {
    // Normal spring animation
    Animated.spring(pan, {
      toValue: { x: 0, y: finalY },
      friction: 7,
      useNativeDriver: true,
    }).start()
  }
}
```

#### High Contrast Support

**Dynamic Color Adjustments**:
```typescript
const [highContrastEnabled, setHighContrastEnabled] = useState(false)

useEffect(() => {
  // Check for high contrast mode
  AccessibilityInfo.isHighTextContrastEnabled?.().then(enabled => {
    setHighContrastEnabled(enabled)
  })
}, [])

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: highContrastEnabled ? 3 : 2,
    borderColor: highContrastEnabled ? '#000' : tokens.accent,
    backgroundColor: highContrastEnabled
      ? tokens.accent + '80' // 50% opacity for better contrast
      : tokens.accent + '4D', // 30% opacity
  },
})
```

---

## Appendix

### Full Style Definitions

```typescript
// Complete StyleSheet for Time Manager Touch Interactions

import { StyleSheet, Platform } from 'react-native'
import { ThemeTokens } from '../../theme/ThemeContext'

export const PIXELS_PER_HOUR = 60
export const MIN_EVENT_HEIGHT = 30
export const SNAP_INTERVAL_MINUTES = 15
export const RESIZE_HANDLE_HEIGHT = 16
export const CORNER_HANDLE_SIZE = 44

export const createTimeManagerStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    // Event Block Styles
    eventBlock: {
      position: 'absolute',
      left: 56,
      right: 8,
      borderLeftWidth: 3,
      borderRadius: 6,
      overflow: 'hidden',

      // Shadow (iOS)
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,

      // Elevation (Android)
      elevation: 3,
    },

    eventBlockDragging: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1000,
    },

    eventContent: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      justifyContent: 'center',
    },

    eventTitle: {
      fontSize: 12,
      fontWeight: '600',
    },

    eventTime: {
      fontSize: 10,
      color: tokens.textSecondary,
      marginTop: 2,
    },

    eventClient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },

    eventClientText: {
      fontSize: 10,
      color: tokens.textSecondary,
      flex: 1,
    },

    // Resize Handle Styles
    resizeHandleTop: {
      position: 'absolute',
      top: -4,
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
      bottom: -4,
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

    // Corner Handle Styles
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

    // Placeholder Styles
    placeholder: {
      position: 'absolute',
      left: 56,
      right: 8,
      zIndex: 5,
      borderRadius: 6,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderLeftWidth: 4,

      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },

    placeholderUltraCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
    },

    placeholderCompact: {
      flexDirection: 'column',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },

    placeholderFull: {
      flexDirection: 'column',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },

    placeholderTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    placeholderTimeTextCompact: {
      fontSize: 11,
      fontWeight: '500',
    },

    placeholderTimeTextFull: {
      fontSize: 12,
      fontWeight: '500',
    },

    placeholderTitle: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
    },

    placeholderDuration: {
      fontSize: 11,
      marginTop: 2,
    },

    placeholderMultiDayBadge: {
      fontSize: 10,
      fontWeight: '600',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      alignSelf: 'flex-start',
    },

    // Drop Zone Styles (optional - not in current mobile implementation)
    dropZone: {
      position: 'absolute',
      left: 56,
      right: 8,
      height: PIXELS_PER_HOUR,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 4,
    },

    dropZoneValid: {
      borderColor: tokens.accent,
      backgroundColor: tokens.accent + '26', // 15% opacity
    },

    dropZoneInvalid: {
      borderColor: '#f87171',
      backgroundColor: '#f87171' + '26', // 15% opacity
    },

    // Drag Indicator
    dragIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
    },

    // Current Time Indicator
    currentTimeIndicator: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: '#ef4444', // red-500
      zIndex: 10,
    },

    currentTimeDot: {
      position: 'absolute',
      left: 48,
      top: -4,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ef4444',
    },
  })
```

### Type Definitions

```typescript
// Complete TypeScript type definitions for Time Manager Touch

// ============= Core Types =============

export interface Event {
  id: string
  title: string
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  date: string // 'yyyy-MM-dd'
  clientId?: string
  location?: string
  service?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  participants?: string[]
  notes?: string
  color?: string
  isMultiDay?: boolean
}

export interface DropZone {
  date: string // 'yyyy-MM-dd'
  hour: number // 0-23
  minute: number // 0-59
}

export interface PlaceholderData {
  date: string
  hour: number
  minutes: number
  duration: number // in minutes
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
  isMultiDay?: boolean
}

export type ResizeHandle =
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

// ============= State Types =============

export interface DragState {
  isDragging: boolean
  draggedEvent: Event | null
  startY: number
  currentY: number
  startOffset: number
  snapOffset: number
}

export interface ResizeState {
  isResizing: boolean
  resizedEvent: Event | null
  resizeHandle: ResizeHandle | null
  resizeOffset: number
  peakOffset: number
}

export interface ValidationResult {
  valid: boolean
  reason?: string
  warnings?: string[]
}

// ============= Component Props =============

export interface EventBlockProps {
  event: Event
  topOffset: number
  height: number
  onDragStart?: (event: Event) => void
  onDragMove?: (dy: number) => void
  onDragEnd?: (dy: number) => void
  onResizeStart?: (event: Event, handle: ResizeHandle) => void
  onResizeMove?: (dy: number, handle: ResizeHandle) => void
  onResizeEnd?: (dy: number, handle: ResizeHandle) => void
  onPress?: (event: Event) => void
  isDragging?: boolean
  isResizing?: boolean
}

export interface PlaceholderEventProps {
  date: string
  hour: number
  minutes?: number
  duration?: number
  title?: string
  pixelsPerHour?: number
  endDate?: string
  endHour?: number
  endMinutes?: number
  isMultiDay?: boolean
}

export interface CalendarViewProps {
  date: Date
  events: Event[]
  onEventUpdate: (event: Event, updates: Partial<Event>) => Promise<void>
  onEventCreate: (eventData: CreateEventData) => Promise<Event>
  onEventPress: (event: Event) => void
  onTimeSlotPress?: (date: string, hour: number, minute: number) => void
  onLongPress?: (date: string, hour: number, minute: number) => void
  pixelsPerHour?: number
}

// ============= Context Types =============

export interface CalendarContextType {
  // Drag state
  draggingEvent: Event | null
  dragOffset: number
  setDraggingEvent: (event: Event | null) => void
  setDragOffset: (offset: number) => void

  // Resize state
  resizingEvent: Event | null
  resizeHandle: ResizeHandle | null
  resizeOffset: number
  setResizingEvent: (event: Event | null) => void
  setResizeHandle: (handle: ResizeHandle | null) => void
  setResizeOffset: (offset: number) => void

  // Placeholder state
  placeholderData: PlaceholderData | null
  setPlaceholderData: (data: PlaceholderData | null) => void

  // Long press state
  longPressInProgress: boolean
  setLongPressInProgress: (inProgress: boolean) => void

  // Event operations
  updateEvent: (event: Event, updates: Partial<Event>) => Promise<void>
  createEvent: (data: CreateEventData) => Promise<Event>
  deleteEvent: (eventId: string) => Promise<void>

  // Utility functions
  calculateDropZone: (pageY: number, pageX: number) => DropZone
  validateDropZone: (zone: DropZone, event?: Event) => ValidationResult

  // Settings
  hapticsEnabled: boolean
  setHapticsEnabled: (enabled: boolean) => void
}

// ============= API Types =============

export interface CreateEventData {
  title: string
  startTime: string
  endTime: string
  date: string
  clientId?: string
  location?: string
  service?: string
  notes?: string
  participants?: string[]
}

export interface EventUpdates {
  title?: string
  startTime?: string
  endTime?: string
  date?: string
  clientId?: string
  location?: string
  service?: string
  notes?: string
  participants?: string[]
  status?: 'confirmed' | 'tentative' | 'cancelled'
}

// ============= Utility Types =============

export interface TimeCalculation {
  hour: number
  minute: number
  snappedMinute: number
}

export interface LayoutMeasurement {
  x: number
  y: number
  width: number
  height: number
  pageX: number
  pageY: number
}

export interface GestureConfig {
  tapMaxDuration: number
  tapMaxMovement: number
  longPressDuration: number
  dragThreshold: number
  snapInterval: number
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  tapMaxDuration: 200,
  tapMaxMovement: 5,
  longPressDuration: 500,
  dragThreshold: 5,
  snapInterval: 15,
}

// ============= Animation Types =============

export interface AnimationConfig {
  duration: number
  easing: (value: number) => number
  useNativeDriver: boolean
}

export interface SpringConfig {
  friction: number
  tension: number
  useNativeDriver: boolean
}

export const DRAG_START_ANIMATION: SpringConfig = {
  friction: 7,
  tension: 40,
  useNativeDriver: true,
}

export const DRAG_END_ANIMATION: AnimationConfig = {
  duration: 250,
  easing: (t) => t * (2 - t), // easeOutQuad
  useNativeDriver: true,
}

export const CANCEL_ANIMATION: SpringConfig = {
  friction: 7,
  tension: 40,
  useNativeDriver: true,
}
```

---

## References

### Web Components
- `/Users/epsommer/projects/web/evangelo-sommer/src/components/calendar/PlaceholderEvent.tsx`
- `/Users/epsommer/projects/web/evangelo-sommer/src/hooks/useEventCreationDrag.ts`
- `/Users/epsommer/projects/web/evangelo-sommer/src/components/DragDropContext.tsx`

### Mobile Components
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/EventBlock.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/DayView.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/context/CalendarContext.tsx`

### Analysis Document
- `/Users/epsommer/projects/analyses/time-manager-drag-analysis.md`

### React Native Documentation
- [PanResponder API](https://reactnative.dev/docs/panresponder)
- [Animated API](https://reactnative.dev/docs/animated)
- [Accessibility](https://reactnative.dev/docs/accessibility)

---

**End of Specification**
