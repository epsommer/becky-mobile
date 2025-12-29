# React Native Calendar Implementation Plan

## Executive Summary

This document outlines a comprehensive implementation plan for converting the web calendar's drag, gesture, and interaction patterns to React Native. Based on thorough research of the web application (prompts 030-032), we will implement:

1. **Placeholder Container System**: Drag-to-create functionality using long-press + pan gestures
2. **Bottom Sheet Action Menu**: Mobile-optimized sidebar using @gorhom/bottom-sheet
3. **Recurring/Multiday Event Handling**: Event display, confirmation modals, and gesture interactions

### Key Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Gesture Library | react-native-gesture-handler + Reanimated 3 | Best performance, Expo SDK 52 compatible, simultaneous gesture support |
| Bottom Sheet | @gorhom/bottom-sheet v5 | Built on gesture-handler/reanimated, snap points, backdrop, keyboard handling |
| Animations | react-native-reanimated 3 | Native thread animations, worklets for smooth 60fps |
| Event Creation Trigger | Long press (500ms) | Mobile-native pattern, avoids conflict with scroll |
| Time Slot Snapping | 15-minute intervals | Matches web implementation |

### Current State Assessment

The existing React Native calendar implementation already has:
- Basic drag-and-drop for existing events (using PanResponder)
- Resize handles on EventBlock component
- Day, Week, and Month views
- QuickEntrySheet modal for batch event creation

What's missing:
- Placeholder container for creating events via long-press + drag
- Bottom sheet action menu (sidebar equivalent)
- Recurring event support and confirmation modals
- Multiday event spanning and display
- Gesture handler integration (currently using PanResponder)

---

## Library Dependencies

### Selected Libraries

| Library | Version | Purpose | Expo SDK 52 Compatible |
|---------|---------|---------|------------------------|
| react-native-gesture-handler | ^2.20.0 | Gesture detection, pan/tap/long-press handling | Yes (included in Expo) |
| react-native-reanimated | ^3.16.0 | Smooth native-thread animations | Yes (included in Expo) |
| @gorhom/bottom-sheet | ^5.0.0 | Bottom sheet component with snap points | Yes |
| expo-haptics | ~14.0.1 | Haptic feedback for gesture interactions | Yes (already installed) |

### Installation Commands

```bash
# Core gesture and animation libraries (already in Expo SDK 52)
npx expo install react-native-gesture-handler react-native-reanimated

# Bottom sheet library
npx expo install @gorhom/bottom-sheet

# Haptics (already installed based on package.json)
# expo-haptics is already at ~14.0.1
```

### Babel Configuration

Update `babel.config.js` to include Reanimated plugin:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
```

### App.tsx Wrapper

Wrap the app with GestureHandlerRootView:

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* App content */}
    </GestureHandlerRootView>
  );
}
```

---

## Phase 1: Gesture Foundation

### 1.1 Setup Steps

1. **Install dependencies** (see commands above)
2. **Configure Babel** for Reanimated
3. **Wrap App** with GestureHandlerRootView
4. **Create gesture utilities** for shared logic

### 1.2 Component Architecture

#### Core Gesture Hooks

Create reusable gesture hooks that encapsulate common patterns:

```typescript
// hooks/useCalendarGestures.ts
interface UseCalendarGesturesOptions {
  pixelsPerHour: number;
  snapMinutes: number;
  onDragStart?: (position: { x: number; y: number }) => void;
  onDragMove?: (translation: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
}

// hooks/useLongPressCreate.ts
interface UseLongPressCreateOptions {
  delayMs: number;
  onLongPress: (position: { x: number; y: number; date: Date; hour: number }) => void;
  onPanAfterLongPress?: (translation: { y: number }) => void;
  onRelease?: (finalDuration: number) => void;
}

// hooks/useEventResize.ts
interface UseEventResizeOptions {
  minDurationMinutes: number;
  onResizeStart?: (handle: HandleType) => void;
  onResizeMove?: (dy: number, handle: HandleType) => void;
  onResizeEnd?: (newTimes: { start: Date; end: Date }) => void;
}
```

#### Gesture Utility Functions

```typescript
// utils/gestureCalculations.ts

/**
 * Convert Y position to time (hours + minutes)
 */
export function yToTime(
  y: number,
  gridTop: number,
  pixelsPerHour: number,
  snapMinutes: number = 15
): { hour: number; minutes: number } {
  const relativeY = Math.max(0, y - gridTop);
  const totalMinutes = (relativeY / pixelsPerHour) * 60;
  const clampedMinutes = Math.min(totalMinutes, 23 * 60 + 45);

  const hour = Math.floor(clampedMinutes / 60);
  const rawMinutes = clampedMinutes % 60;
  const snappedMinutes = Math.round(rawMinutes / snapMinutes) * snapMinutes;

  return {
    hour: Math.max(0, Math.min(23, hour)),
    minutes: Math.min(45, Math.max(0, snappedMinutes)),
  };
}

/**
 * Snap translation to 15-minute intervals
 */
export function snapToGrid(
  translation: number,
  pixelsPerHour: number,
  snapMinutes: number = 15
): number {
  const pixelsPerSnap = (pixelsPerHour / 60) * snapMinutes;
  return Math.round(translation / pixelsPerSnap) * pixelsPerSnap;
}

/**
 * Calculate duration in minutes from pixel offset
 */
export function pixelsToMinutes(pixels: number, pixelsPerHour: number): number {
  return Math.round((pixels / pixelsPerHour) * 60);
}
```

### 1.3 File Structure

```
components/
  calendar/
    gestures/
      GestureContext.tsx          # Context provider for gesture state
      useLongPressCreate.ts       # Hook for long-press event creation
      useEventDrag.ts             # Hook for dragging existing events
      useEventResize.ts           # Hook for resizing events
      gestureUtils.ts             # Shared utility functions
    placeholder/
      PlaceholderEvent.tsx        # Visual placeholder during creation
      PlaceholderContext.tsx      # Placeholder state management
    views/
      DayViewGesture.tsx          # Gesture-enabled day view wrapper
      WeekViewGesture.tsx         # Gesture-enabled week view wrapper
      MonthViewGesture.tsx        # Gesture-enabled month view wrapper
```

---

## Phase 2: Placeholder Container Implementation

Based on web research (prompt 030), the placeholder system allows users to create events by:
1. Long-pressing on a time slot
2. Dragging vertically to set duration
3. Releasing to open event creation form

### 2.1 Day View Implementation

#### Touch Gesture Mapping

| Web Interaction | Mobile Equivalent | Implementation |
|-----------------|-------------------|----------------|
| Double-click | Long press (500ms) | `Gesture.LongPress()` |
| Click-and-drag | Pan gesture after long-press | `Gesture.Pan().activateAfterLongPress(500)` |
| Mouseup | Gesture end (onEnd callback) | Pan gesture `onEnd` handler |
| 5px drag threshold | Built-in | `activeOffsetY: [-5, 5]` |

#### Component Structure

```typescript
// components/calendar/placeholder/DayViewPlaceholder.tsx

interface DayViewPlaceholderProps {
  date: Date;
  pixelsPerHour: number;
  onEventCreate: (data: {
    date: string;
    hour: number;
    minutes: number;
    duration: number;
  }) => void;
}

/**
 * Gesture handler for creating events in Day view
 *
 * Flow:
 * 1. Long press (500ms) triggers placeholder creation
 * 2. User drags vertically to set duration (min 15 min)
 * 3. Haptic feedback on 15-minute snap points
 * 4. Release opens event creation form
 */
```

#### State Management

```typescript
// components/calendar/placeholder/PlaceholderContext.tsx

interface PlaceholderState {
  isActive: boolean;
  date: string | null;
  startHour: number;
  startMinutes: number;
  duration: number; // in minutes
  title?: string;
  isMultiDay?: boolean;
  endDate?: string;
}

interface PlaceholderContextValue {
  placeholder: PlaceholderState | null;
  setPlaceholder: (state: PlaceholderState | null) => void;
  updatePlaceholder: (updates: Partial<PlaceholderState>) => void;
  clearPlaceholder: () => void;
}
```

#### Implementation Details

```typescript
// Long-press + pan gesture composition
const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .onStart((event) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Calculate time from touch position
    const { hour, minutes } = yToTime(event.y, gridTop, PIXELS_PER_HOUR);

    // Initialize placeholder with 15-minute default duration
    setPlaceholder({
      isActive: true,
      date: format(date, 'yyyy-MM-dd'),
      startHour: hour,
      startMinutes: minutes,
      duration: 15,
    });
  });

const panGesture = Gesture.Pan()
  .activateAfterLongPress(500)
  .activeOffsetY([-5, 5]) // 5px threshold
  .onUpdate((event) => {
    // Calculate new duration from drag offset
    const durationMinutes = pixelsToMinutes(event.translationY, PIXELS_PER_HOUR);
    const snappedDuration = Math.max(15, Math.round(durationMinutes / 15) * 15);

    // Haptic feedback on snap points
    if (snappedDuration !== lastSnappedDuration.current) {
      Haptics.selectionAsync();
      lastSnappedDuration.current = snappedDuration;
    }

    updatePlaceholder({ duration: snappedDuration });
  })
  .onEnd(() => {
    // Open event creation form with placeholder data
    onEventCreate(placeholder);
  });

// Compose gestures (run simultaneously)
const composed = Gesture.Simultaneous(longPressGesture, panGesture);
```

#### Visual Feedback

```typescript
// components/calendar/placeholder/PlaceholderEvent.tsx

interface PlaceholderEventProps {
  top: number;
  height: number;
  title?: string;
  startTime: string;
  endTime: string;
  isMultiDay?: boolean;
}

// Styling matches web implementation
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 56,
    right: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: tokens.accent,
    backgroundColor: `${tokens.accent}30`, // 30% opacity
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
  },
  // Adaptive display modes based on height
  // Ultra-compact (<35px): Time only
  // Compact (<50px): Time + duration
  // Full: Title + time + duration
});
```

### 2.2 Week View Implementation

#### Additional Considerations

- **Horizontal drag detection**: Pan in X direction changes day
- **Multi-day event creation**: Drag across day boundaries
- **Grid snap behavior**: Snap to both day columns and 15-minute intervals

#### Multi-Day State Extension

```typescript
interface DragState {
  isDragging: boolean;
  startDate: string;
  startDayIndex: number;
  startHour: number;
  startMinutes: number;
  currentDate: string;
  currentDayIndex: number;
  currentHour: number;
  currentMinutes: number;
  duration: number;
  isMultiDay: boolean;
}
```

#### Day Column Calculations

```typescript
// Convert X position to day index in week view
function xToDayIndex(
  x: number,
  gridLeft: number,
  timeColumnWidth: number,
  dayColumnWidth: number,
  maxDayIndex: number = 6
): number {
  const relativeX = x - gridLeft - timeColumnWidth;
  const dayIndex = Math.floor(relativeX / dayColumnWidth);
  return Math.max(0, Math.min(maxDayIndex, dayIndex));
}

// Snap X translation to day column boundaries
function snapToDay(
  translationX: number,
  dayColumnWidth: number
): number {
  return Math.round(translationX / dayColumnWidth) * dayColumnWidth;
}
```

### 2.3 Month View Implementation

#### Distinct Behavior

Month view event creation differs from Day/Week:
- No time-slot precision (default to 9 AM per web implementation)
- Multi-day range selection via horizontal drag
- Vertical drag for recurring weekly events

#### Gesture Patterns

```typescript
// Horizontal drag: Multi-day event spanning
const horizontalPan = Gesture.Pan()
  .activateAfterLongPress(500)
  .activeOffsetX([-10, 10])
  .onUpdate((event) => {
    // Calculate day span from horizontal translation
    const daySpan = Math.round(event.translationX / CELL_WIDTH);
    updatePlaceholder({
      isMultiDay: Math.abs(daySpan) > 0,
      daySpan: Math.abs(daySpan) + 1,
    });
  });

// Vertical drag: Weekly recurrence
const verticalPan = Gesture.Pan()
  .activateAfterLongPress(500)
  .activeOffsetY([-40, 40]) // 40px threshold for mode switch
  .onUpdate((event) => {
    if (Math.abs(event.translationY) > 40) {
      // Switch to recurring mode
      const weekSpan = Math.round(event.translationY / WEEK_ROW_HEIGHT);
      updatePlaceholder({
        isRecurring: true,
        recurrenceWeeks: Math.abs(weekSpan) + 1,
      });
    }
  });
```

### 2.4 Shared Components

#### Haptic Feedback Integration

```typescript
// utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const CalendarHaptics = {
  // Long press activation
  longPressActivate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Snap to 15-minute interval
  snapToInterval: () => Haptics.selectionAsync(),

  // Day boundary crossed
  dayBoundaryCrossed: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Event creation complete
  eventCreated: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Conflict detected
  conflictWarning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
```

---

## Phase 3: Bottom Sheet Action Menu

Based on web research (prompt 031), the ActionSidebar provides quick actions, mini calendar, event creation/editing forms, and analytics. On mobile, this translates to a bottom sheet.

### 3.1 Library Selection Rationale

**@gorhom/bottom-sheet v5** selected because:
- Built on react-native-gesture-handler + reanimated
- Native snap points with velocity-based transitions
- Keyboard handling built-in
- Backdrop component included
- Expo SDK 52 compatible
- Active maintenance and community support

### 3.2 Component Structure

```typescript
// components/calendar/bottom-sheet/CalendarActionSheet.tsx

interface CalendarActionSheetProps {
  // View state
  selectedDate: Date;
  currentView: 'day' | 'week' | 'month';

  // Events data
  events: Event[];
  selectedEvent: Event | null;

  // Mode states
  isEventCreationMode: boolean;
  placeholderEvent: PlaceholderState | null;

  // Callbacks
  onDateSelect: (date: Date) => void;
  onViewChange: (view: 'day' | 'week') => void;
  onEventCreate: (data: CreateEventData) => Promise<void>;
  onEventEdit: (event: Event, updates: Partial<Event>) => Promise<void>;
  onEventDelete: (event: Event) => Promise<void>;
  onClose: () => void;
}
```

### 3.3 Snap Point Configuration

```typescript
// Snap points matching web behavior
const snapPoints = useMemo(() => {
  // Collapsed: 80-100pt (quick actions bar)
  // Half: 50% (mini calendar + actions)
  // Expanded: 85% (full form)
  return ['12%', '50%', '85%'];
}, []);

// Dynamic snap points based on content
const dynamicSnapPoints = useMemo(() => {
  if (isEventCreationMode || selectedEvent) {
    // Expand to show full form
    return ['85%'];
  }
  return ['12%', '50%'];
}, [isEventCreationMode, selectedEvent]);
```

### 3.4 Content Layout

#### Collapsed State (12%)

```typescript
// Quick actions bar - always visible
<View style={styles.collapsedContent}>
  <TouchableOpacity onPress={handleCreateEvent}>
    <Ionicons name="add-circle" size={24} color={tokens.accent} />
    <Text>New Event</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={handleBatchAdd}>
    <Ionicons name="layers" size={24} color={tokens.accent} />
    <Text>Batch Add</Text>
  </TouchableOpacity>

  {conflictCount > 0 && (
    <TouchableOpacity onPress={handleShowConflicts}>
      <Ionicons name="warning" size={24} color={tokens.warning} />
      <Badge count={conflictCount} />
    </TouchableOpacity>
  )}
</View>
```

#### Half-Expanded State (50%)

```typescript
// Mini calendar + upcoming events
<BottomSheetScrollView>
  <MiniCalendar
    selectedDate={selectedDate}
    events={events}
    onDateSelect={onDateSelect}
    onViewChange={onViewChange}
  />

  <UpcomingEventsPanel
    events={upcomingEvents}
    onEventPress={handleEventPress}
  />
</BottomSheetScrollView>
```

#### Full-Expanded State (85%)

```typescript
// Event creation/editing form
<BottomSheetScrollView>
  {isEventCreationMode && (
    <EventCreationForm
      initialData={placeholderEvent}
      onSubmit={onEventCreate}
      onCancel={onClose}
    />
  )}

  {selectedEvent && (
    <EventDetailsPanel
      event={selectedEvent}
      onEdit={onEventEdit}
      onDelete={onEventDelete}
      onClose={onClose}
    />
  )}
</BottomSheetScrollView>
```

### 3.5 Gesture Conflict Prevention

```typescript
// Prevent calendar gestures when interacting with bottom sheet
const bottomSheetRef = useRef<BottomSheet>(null);

// Track if bottom sheet is being dragged
const [isSheetDragging, setIsSheetDragging] = useState(false);

const handleSheetChange = useCallback((index: number) => {
  // Notify calendar to disable gestures during sheet interaction
  setCalendarGesturesEnabled(index === 0); // Only enable at collapsed
}, []);

// In calendar view
const calendarGesture = Gesture.Pan()
  .enabled(calendarGesturesEnabled) // Disable during sheet interaction
  .onStart(...)
  .onUpdate(...)
  .onEnd(...);
```

### 3.6 Animation Configuration

```typescript
// Match web spring animation
const animationConfigs = {
  damping: 30,
  stiffness: 300,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

<BottomSheet
  ref={bottomSheetRef}
  snapPoints={snapPoints}
  animationConfigs={animationConfigs}
  backgroundStyle={styles.sheetBackground}
  handleIndicatorStyle={styles.handleIndicator}
  backdropComponent={renderBackdrop}
  onChange={handleSheetChange}
>
```

---

## Phase 4: Recurring/Multiday Events

Based on web research (prompt 032), the system supports pattern-based recurrence and linked instance recurrence.

### 4.1 Data Model Alignment

Maintain parity with web data model for API compatibility:

```typescript
// types/events.ts

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RecurrenceInterval = 'days' | 'weeks' | 'months' | 'years';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  intervalType?: RecurrenceInterval; // For 'custom' frequency
  endDate?: string;
  occurrences?: number;
  weekDays?: number[]; // 0-6 (Sunday-Saturday)
  monthDay?: number; // 1-31
}

export interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;

  // Multiday fields
  isMultiDay?: boolean;
  isAllDay?: boolean;

  // Recurring fields
  isRecurring?: boolean;
  recurrence?: RecurrenceRule;
  parentEventId?: string;
  recurrenceGroupId?: string;

  // Other fields...
}

export type RecurringDeleteOption =
  | 'this_only'
  | 'all_previous'
  | 'this_and_following'
  | 'all';
```

### 4.2 Display Components

#### Recurring Event Indicator

```typescript
// components/calendar/RecurringIndicator.tsx

interface RecurringIndicatorProps {
  size?: 'small' | 'medium';
}

const RecurringIndicator: React.FC<RecurringIndicatorProps> = ({ size = 'small' }) => {
  return (
    <View style={[styles.container, styles[size]]}>
      <Ionicons
        name="repeat"
        size={size === 'small' ? 10 : 14}
        color={tokens.textSecondary}
      />
    </View>
  );
};
```

#### Multiday Event Component (Month View)

```typescript
// components/calendar/MultidayEventBar.tsx

interface MultidayEventBarProps {
  event: Event;
  startDayIndex: number;
  endDayIndex: number;
  weekRowIndex: number;
  onPress: (event: Event) => void;
}

/**
 * Renders a horizontal bar spanning multiple day cells in month view.
 *
 * Features:
 * - Clips at week boundaries (continues on next row)
 * - Stacks vertically with other multiday events
 * - Color-coded by service/priority
 * - Shows continuation indicators if clipped
 */
```

#### Multiday Event Display (Week View)

```typescript
// Extends across multiple day columns using absolute positioning

const getMultidayEventStyle = (event: Event, weekDates: Date[]): ViewStyle => {
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : startDate;

  const startDayIndex = weekDates.findIndex(d => isSameDay(d, startDate));
  const endDayIndex = weekDates.findIndex(d => isSameDay(d, endDate));

  // Clamp to visible week
  const clampedStart = Math.max(0, startDayIndex);
  const clampedEnd = Math.min(6, endDayIndex >= 0 ? endDayIndex : 6);

  const leftPercent = TIME_COLUMN_PERCENT + (clampedStart * DAY_COLUMN_PERCENT);
  const widthPercent = (clampedEnd - clampedStart + 1) * DAY_COLUMN_PERCENT;

  return {
    position: 'absolute',
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    zIndex: 20, // Above single-day events
  };
};
```

### 4.3 Confirmation Modals

#### Delete Recurring Event Modal

```typescript
// components/calendar/modals/RecurringDeleteModal.tsx

interface RecurringDeleteModalProps {
  visible: boolean;
  event: Event | null;
  relatedEvents: Event[];
  onClose: () => void;
  onConfirm: (option: RecurringDeleteOption) => Promise<void>;
}

/**
 * Modal structure:
 * 1. Event info card (title, date, time, series info)
 * 2. Radio-style option selection:
 *    - Delete this event only
 *    - Delete all previous (N)
 *    - Delete this and following (N+1)
 *    - Delete all events (total)
 * 3. Warning banner for destructive options
 * 4. Cancel/Delete action buttons
 */
```

#### Edit Recurring Event Modal (NEW - not in web)

```typescript
// components/calendar/modals/RecurringEditModal.tsx

interface RecurringEditModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onConfirm: (option: 'this_only' | 'this_and_following' | 'all') => void;
}

/**
 * Options:
 * - Edit this event only
 * - Edit this and future events
 * - Edit all events in series
 */
```

#### Reschedule Confirmation Modal

```typescript
// components/calendar/modals/RescheduleConfirmModal.tsx

interface RescheduleData {
  event: Event;
  fromSlot: { date: string; hour: number; minute?: number };
  toSlot: { date: string; hour: number; minute?: number };
}

interface RescheduleConfirmModalProps {
  visible: boolean;
  data: RescheduleData | null;
  onClose: () => void;
  onConfirm: (notifyParticipants: boolean, reason?: string) => Promise<void>;
}

/**
 * Shown when dragging an event with participants.
 *
 * Sections:
 * 1. Event info card
 * 2. Time change display (before/after)
 * 3. Participant notification toggle
 * 4. Optional reason input
 * 5. Action buttons
 */
```

### 4.4 Gesture Interactions

#### Long Press Context Menu

```typescript
// components/calendar/EventContextMenu.tsx

const longPressGesture = Gesture.LongPress()
  .minDuration(600)
  .onStart((event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (event.isRecurring || event.recurrenceGroupId) {
      showRecurringEventOptions(event);
    } else {
      showEventOptions(event);
    }
  });

// Options for recurring events
const recurringOptions = [
  { label: 'View Details', action: 'view' },
  { label: 'Edit', action: 'edit' },
  { label: 'Delete...', action: 'delete', destructive: true },
  { label: 'Cancel', action: 'cancel' },
];
```

#### Swipe Actions

```typescript
// Optional: Swipe-to-reveal actions on event items
// Use react-native-gesture-handler's Swipeable or custom implementation

import Swipeable from 'react-native-gesture-handler/Swipeable';

const renderRightActions = (progress, dragX) => (
  <View style={styles.rightActions}>
    <TouchableOpacity
      style={styles.editAction}
      onPress={() => handleEdit(event)}
    >
      <Ionicons name="pencil" size={20} color="#fff" />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDelete(event)}
    >
      <Ionicons name="trash" size={20} color="#fff" />
    </TouchableOpacity>
  </View>
);
```

---

## Phase 5: Integration and Testing

### 5.1 State Management Integration

#### Calendar Context Structure

```typescript
// context/CalendarContext.tsx

interface CalendarState {
  // View state
  currentView: 'day' | 'week' | 'month';
  selectedDate: Date;

  // Events
  events: Event[];
  selectedEvent: Event | null;

  // Placeholder
  placeholder: PlaceholderState | null;

  // Modes
  isEventCreationMode: boolean;
  isEditing: boolean;

  // Gestures
  gesturesEnabled: boolean;
  isDragging: boolean;
  isResizing: boolean;

  // Bottom sheet
  sheetSnapIndex: number;
}

interface CalendarActions {
  setView: (view: 'day' | 'week' | 'month') => void;
  selectDate: (date: Date) => void;
  selectEvent: (event: Event | null) => void;
  setPlaceholder: (state: PlaceholderState | null) => void;
  setEventCreationMode: (enabled: boolean) => void;
  setGesturesEnabled: (enabled: boolean) => void;
  // ... more actions
}
```

#### Performance Optimizations

```typescript
// Use React.memo for expensive components
const EventBlock = React.memo(EventBlockComponent, (prev, next) => {
  return (
    prev.event.id === next.event.id &&
    prev.event.startTime === next.event.startTime &&
    prev.event.endTime === next.event.endTime &&
    prev.isDragging === next.isDragging &&
    prev.isResizing === next.isResizing
  );
});

// Use useCallback for gesture handlers
const handleDragEnd = useCallback((finalPosition) => {
  // Process drag end
}, [/* minimal dependencies */]);

// Use useMemo for derived data
const eventsForDate = useMemo(() => {
  return events.filter(e => isSameDay(new Date(e.startTime), selectedDate));
}, [events, selectedDate]);
```

### 5.2 Animation Performance

#### Native Driver Usage

```typescript
// Identify animations that can use native driver
const nativeAnimations = [
  'translateY',
  'translateX',
  'scale',
  'opacity',
  'rotate',
];

// Placeholder position animation (native)
const animatedTop = useSharedValue(0);
const animatedHeight = useSharedValue(15 * PIXELS_PER_HOUR / 60);

const placeholderStyle = useAnimatedStyle(() => ({
  top: animatedTop.value,
  height: animatedHeight.value,
}));

// Update with withTiming for smooth transitions
animatedTop.value = withTiming(newTop, {
  duration: 100,
  easing: Easing.out(Easing.ease),
});
```

#### Worklet Functions

```typescript
// Run gesture calculations on UI thread
'worklet';

function calculateSnapPosition(
  translationY: number,
  pixelsPerHour: number,
  snapMinutes: number
): number {
  const pixelsPerSnap = (pixelsPerHour / 60) * snapMinutes;
  return Math.round(translationY / pixelsPerSnap) * pixelsPerSnap;
}

// Use in gesture handler
.onUpdate((event) => {
  const snapped = calculateSnapPosition(event.translationY, PIXELS_PER_HOUR, 15);
  animatedOffset.value = snapped;
});
```

### 5.3 Accessibility Audit

#### VoiceOver/TalkBack Support

```typescript
// Event block accessibility
<View
  accessible
  accessibilityRole="button"
  accessibilityLabel={`Event: ${event.title}, from ${formatTime(event.startTime)} to ${formatTime(event.endTime)}`}
  accessibilityHint="Double tap to view details. Double tap and hold for more options."
  accessibilityActions={[
    { name: 'activate', label: 'View details' },
    { name: 'longpress', label: 'Show options menu' },
  ]}
  onAccessibilityAction={(e) => {
    switch (e.nativeEvent.actionName) {
      case 'activate':
        onEventPress(event);
        break;
      case 'longpress':
        showContextMenu(event);
        break;
    }
  }}
>
```

#### Alternative Interaction Methods

```typescript
// For users who cannot use gestures
<TouchableOpacity
  onPress={handleTap}
  onLongPress={handleLongPress}
  delayLongPress={600}
  accessibilityRole="button"
>
  {/* Event content */}
</TouchableOpacity>

// Add explicit "Create Event" button visible in accessibility mode
{accessibilityInfo.isScreenReaderEnabled && (
  <TouchableOpacity
    style={styles.accessibleCreateButton}
    onPress={() => openEventCreation(selectedDate, 9, 0)}
    accessibilityLabel="Create new event"
  >
    <Text>+ New Event</Text>
  </TouchableOpacity>
)}
```

#### Modal Accessibility

```typescript
// Focus management for modals
<Modal
  visible={visible}
  onShow={() => {
    // Focus on first interactive element
    firstInputRef.current?.focus();
  }}
  accessibilityViewIsModal
>
  <View
    accessibilityLiveRegion="polite"
    accessibilityLabel="Delete recurring event confirmation"
  >
    {/* Modal content */}
  </View>
</Modal>
```

---

## File Structure

```
components/
  calendar/
    gestures/
      GestureContext.tsx
      useLongPressCreate.ts
      useEventDrag.ts
      useEventResize.ts
      gestureUtils.ts
    placeholder/
      PlaceholderEvent.tsx
      PlaceholderContext.tsx
      DayViewPlaceholder.tsx
      WeekViewPlaceholder.tsx
      MonthViewPlaceholder.tsx
    bottom-sheet/
      CalendarActionSheet.tsx
      MiniCalendar.tsx
      UpcomingEventsPanel.tsx
      EventCreationForm.tsx
      EventDetailsPanel.tsx
      BatchAddPanel.tsx
    modals/
      RecurringDeleteModal.tsx
      RecurringEditModal.tsx
      RescheduleConfirmModal.tsx
      ResizeConfirmModal.tsx
    multiday/
      MultidayEventBar.tsx
      WeekMultidaySection.tsx
    indicators/
      RecurringIndicator.tsx
      ConflictIndicator.tsx
    views/
      DayView.tsx (enhanced)
      WeekView.tsx (enhanced)
      MonthView.tsx (enhanced)
    EventBlock.tsx (enhanced)
    DraggableMonthEvent.tsx (enhanced)
    index.ts

context/
  CalendarContext.tsx
  PlaceholderContext.tsx

hooks/
  useCalendarGestures.ts
  useBottomSheet.ts
  useResponsiveLayout.ts
  useRecurringEvents.ts

utils/
  gestureCalculations.ts
  haptics.ts
  eventHelpers.ts
  timeFormatters.ts

types/
  events.ts (enhanced)
  gestures.ts
  calendar.ts
```

---

## Risk Assessment

### Potential Challenges and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Gesture conflicts with scroll** | Medium | High | Use `simultaneousHandlers` and `waitFor` gesture composition; Test extensively on both platforms |
| **Performance during drag** | Medium | High | Use Reanimated worklets; Memoize components; Test with 100+ events |
| **Bottom sheet keyboard issues** | Medium | Medium | Use @gorhom/bottom-sheet's built-in keyboard handling; Test all form inputs |
| **Multiday event layout complexity** | High | Medium | Start with simple cases; Add edge cases incrementally; Comprehensive unit tests |
| **Cross-platform differences** | Medium | Medium | Test on both iOS and Android throughout development; Use platform-specific code where needed |
| **Recurring event sync** | Low | High | Match web API exactly; Add robust error handling; Implement optimistic updates |
| **Accessibility with gestures** | Medium | High | Provide alternative touch targets; Test with VoiceOver/TalkBack; Follow WCAG guidelines |

### Fallback Strategies

1. **If gesture-handler performance issues**: Revert specific gestures to PanResponder with careful optimization
2. **If bottom sheet conflicts persist**: Use native Modal with custom slide animation
3. **If multiday layout too complex**: Start with simplified "badge" view, enhance iteratively

---

## Success Metrics

### Functional Requirements

- [ ] Long-press (500ms) initiates placeholder in Day/Week view
- [ ] Drag extends placeholder with 15-minute snapping
- [ ] Haptic feedback on snap points
- [ ] Bottom sheet with three snap points (12%, 50%, 85%)
- [ ] Event creation form pre-populated from placeholder
- [ ] Recurring event delete modal with 4 options
- [ ] Multiday events span across day cells in month view
- [ ] Multiday events span across columns in week view

### Performance Requirements

- [ ] 60fps during drag operations
- [ ] < 100ms response to gesture start
- [ ] < 16ms per frame during animation
- [ ] No jank when scrolling with 50+ events visible

### Quality Requirements

- [ ] VoiceOver/TalkBack announces all interactive elements
- [ ] Alternative touch targets for gesture actions
- [ ] Consistent behavior across iOS and Android
- [ ] All modals trap focus appropriately

### Testing Checklist

- [ ] Unit tests for gesture calculation utilities
- [ ] Integration tests for placeholder creation flow
- [ ] E2E tests for recurring event deletion
- [ ] Accessibility audit with screen readers
- [ ] Performance profiling with production data volume

---

## Implementation Timeline

### Week 1: Foundation
- Install and configure libraries
- Create gesture utility functions
- Set up GestureHandlerRootView wrapper
- Create basic PlaceholderContext

### Week 2: Placeholder System
- Implement DayViewPlaceholder with long-press + pan
- Add haptic feedback integration
- Implement WeekViewPlaceholder with multi-day support
- Create PlaceholderEvent visual component

### Week 3: Bottom Sheet
- Install and configure @gorhom/bottom-sheet
- Create CalendarActionSheet with snap points
- Implement MiniCalendar component
- Add EventCreationForm integration

### Week 4: Recurring/Multiday Events
- Implement RecurringIndicator component
- Create MultidayEventBar for month view
- Build RecurringDeleteModal
- Add RecurringEditModal

### Week 5: Integration and Polish
- Integrate all components with CalendarContext
- Performance optimization pass
- Accessibility audit and fixes
- Cross-platform testing

### Week 6: Testing and Refinement
- Comprehensive E2E testing
- Bug fixes and edge cases
- Documentation updates
- Final performance verification

---

## References

### Research Documents
- `/Users/epsommer/projects/apps/becky-mobile/research/web-placeholder-container-analysis.md`
- `/Users/epsommer/projects/apps/becky-mobile/research/web-action-sidebar-analysis.md`
- `/Users/epsommer/projects/apps/becky-mobile/research/web-recurring-multiday-events-analysis.md`

### Existing Components
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/DayView.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/WeekView.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/MonthView.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/EventBlock.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/components/calendar/QuickEntrySheet.tsx`

### Library Documentation
- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [@gorhom/bottom-sheet](https://gorhom.github.io/react-native-bottom-sheet/)
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
