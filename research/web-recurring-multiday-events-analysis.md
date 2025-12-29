# Recurring & Multiday Events Analysis

## Overview

This document analyzes how the time-manager in the evangelo-sommer web application handles recurring events, multiday events, and their corresponding confirmation modals. The web implementation serves as a reference for React Native implementation of complex event handling with appropriate confirmation dialogs.

The calendar system supports a unified event model that handles:
- **Single-day timed events**: Standard calendar events with start and end times
- **All-day events**: Events that span entire days
- **Multi-day events**: Events spanning multiple consecutive days
- **Recurring events**: Events that repeat on a schedule (daily, weekly, monthly, yearly, custom)
- **Weekly recurring instances**: Linked events created via vertical drag in month view

---

## Recurring Events

### Data Model

Recurring events use a **custom recurrence rule format** stored directly on the `UnifiedEvent` interface. The system does NOT use standard RRULE format but instead uses a simplified custom schema.

#### UnifiedEvent Recurring Properties

```typescript
// From src/components/EventCreationModal.tsx

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type RecurrenceInterval = 'days' | 'weeks' | 'months' | 'years'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number
  intervalType?: RecurrenceInterval  // Used for 'custom' frequency
  endDate?: string                   // ISO date string
  occurrences?: number               // Number of times to repeat
  weekDays?: number[]                // Specific days of week (0-6)
  monthDay?: number                  // Specific day of month (1-31)
}

export interface UnifiedEvent {
  // ... other fields ...
  isRecurring?: boolean
  recurrence?: RecurrenceRule
  parentEventId?: string           // Links to source event
  recurrenceGroupId?: string       // Links weekly recurring instances together
  isMergedRecurring?: boolean      // Flag for consecutive daily events rendered as spans
}
```

#### Database Schema (Prisma)

```typescript
// From src/types/scheduling.ts

export interface RecurringEvent {
  id: string
  scheduleRuleId: string
  title: string
  description?: string
  clientId: string
  conversationId?: string
  nextOccurrence: string     // ISO date - next scheduled occurrence
  lastOccurrence?: string    // ISO date - most recent occurrence
  totalOccurrences: number
  isActive: boolean
  metadata?: {
    reminderMinutesBefore?: number
    autoCreateTask?: boolean
    notificationPreferences?: {
      email?: boolean
      sms?: boolean
      push?: boolean
    }
  }
  createdAt: string
  updatedAt: string
}

export interface ScheduleRule {
  id: string
  frequency: FrequencyType  // 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'custom'
  interval: number
  daysOfWeek?: number[]     // For weekly (0=Sunday, 6=Saturday)
  dayOfMonth?: number       // For monthly (1-31, -1=last day)
  endRule: {
    type: EndRuleType       // 'never' | 'occurrences' | 'date'
    value?: number | string // count or ISO date
  }
  timezone?: string
  createdAt: string
  updatedAt: string
}
```

### Recurrence Patterns Supported

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **Daily** | Repeats every N days | `frequency: 'daily', interval: N` |
| **Weekly** | Repeats every N weeks on same day | `frequency: 'weekly', interval: N` |
| **Bi-weekly** | Repeats every 2 weeks | `frequency: 'bi-weekly', interval: 1` |
| **Monthly** | Repeats every N months on same day | `frequency: 'monthly', interval: N, dayOfMonth: D` |
| **Yearly** | Repeats annually on same date | `frequency: 'yearly', interval: N` |
| **Custom** | Custom interval with intervalType | `frequency: 'custom', interval: N, intervalType: 'days'/'weeks'/'months'/'years'` |

#### End Conditions

- **Never**: Recurrence continues indefinitely
- **After N occurrences**: `recurrence.occurrences: N`
- **Until date**: `recurrence.endDate: 'YYYY-MM-DD'`

### Parent Event with Virtual Instances

The system uses two approaches for recurring events:

1. **Pattern-based recurrence**: A single event with `isRecurring: true` and `recurrence` rules. Instances are calculated dynamically when rendering.

2. **Linked instances (Weekly)**: Multiple separate database records linked by `recurrenceGroupId`. Created when dragging vertically in month view.

```typescript
// From src/hooks/useUnifiedEvents.ts

// Get all related events in the same recurrence group
const getRelatedEvents = useCallback((eventId: string): UnifiedEvent[] => {
  const event = events.find(e => e.id === eventId)
  if (!event || !event.recurrenceGroupId) {
    return event ? [event] : []
  }

  return events
    .filter(e => e.recurrenceGroupId === event.recurrenceGroupId)
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
}, [events])
```

### Exceptions Handling

Exceptions to recurrence are handled by:
1. Deleting specific instances (for linked recurrences)
2. The system does not support true RRULE EXDATE-style exceptions for pattern-based recurrences

### Month View Display

In month view, recurring events are displayed differently based on type:

#### Pattern-based Recurring Events
```typescript
// From src/components/ScheduleCalendar.tsx

// Check if a recurring event should appear on a specific date
const isRecurringEventOnDate = (event: UnifiedEvent, date: Date): boolean => {
  if (!event.isRecurring || !event.recurrence) return false;

  const eventStart = startOfDay(new Date(event.startDateTime));
  const checkDate = startOfDay(date);

  // Event must have started by this date
  if (checkDate < eventStart) return false;

  // Check if within recurrence end date
  if (event.recurrence.endDate) {
    const endDate = startOfDay(new Date(event.recurrence.endDate));
    if (checkDate > endDate) return false;
  }

  // Check recurrence pattern
  const daysDiff = differenceInDays(checkDate, eventStart);
  const frequency = event.recurrence.frequency;
  const interval = event.recurrence.interval || 1;

  switch (frequency) {
    case 'daily':
      return daysDiff % interval === 0;
    case 'weekly':
      const weeksDiff = Math.floor(daysDiff / 7);
      return checkDate.getDay() === eventStart.getDay() && weeksDiff % interval === 0;
    case 'monthly':
      const monthsDiff = (checkDate.getFullYear() - eventStart.getFullYear()) * 12 +
                        (checkDate.getMonth() - eventStart.getMonth());
      return checkDate.getDate() === eventStart.getDate() && monthsDiff % interval === 0;
    case 'yearly':
      return checkDate.getMonth() === eventStart.getMonth() &&
             checkDate.getDate() === eventStart.getDate();
    default:
      return false;
  }
};
```

#### Visual Indicators

- Recurring events show a **Repeat icon** in the event display
- Events in details modal show recurrence description: "Repeats every N frequency until date"
- Badge/indicator shows event is part of a recurring series

#### Consecutive Daily Recurring Events

Consecutive daily recurring events can be rendered as merged spans for cleaner visual display:

```typescript
// Event has isMergedRecurring flag when rendered as span
isMergedRecurring?: boolean  // Flag for consecutive daily recurring events
```

### Week View Display

In week view, recurring events:
- Appear in the time grid on their scheduled occurrence days
- Are rendered using the same `CalendarEvent` component as single events
- Support drag-and-drop to reschedule individual instances
- Show time slots calculated based on start/end times

### Edit Workflow (Recurring Events)

The system currently does **not** have a dedicated "Edit Recurring Event" confirmation modal. When editing a recurring event:

1. Editing the event modifies the source event only
2. For linked instances (recurrenceGroupId), each instance is a separate database record
3. No "This event only" / "All events" prompt exists for edits

**Note for RN Implementation**: Consider adding an edit confirmation modal similar to the delete modal.

### Delete Workflow (Recurring Events)

The system has a comprehensive **RecurringDeleteConfirmationModal** with four options:

```typescript
// From src/components/RecurringDeleteConfirmationModal.tsx

export type RecurringDeleteOption =
  | 'this_only'          // Delete only this event
  | 'all_previous'       // Delete all events before this one (exclusive)
  | 'this_and_following' // Delete this event and all following
  | 'all'                // Delete all events in the series
```

#### Modal UI Structure

1. **Event Information Card**
   - Title, date, time
   - Priority badge
   - Series info: "Part of a recurring series (N events)"
   - Position indicator: "This is event X of Y"

2. **Deletion Options (Radio-style buttons)**
   - Delete this event only
   - Delete all previous (N)
   - Delete this and following (N+1)
   - Delete all events (total)

3. **Dynamic Description**
   - Each option shows a description of what will be affected

4. **Warning Banner**
   - Shows for destructive options (all_previous, this_and_following, all)
   - "This action cannot be undone."

5. **Action Buttons**
   - Cancel (preserves state)
   - Delete (red, destructive styling)
   - Loading state with spinner during deletion

6. **Keyboard Shortcuts**
   - Enter to confirm
   - Escape to cancel

#### API Implementation

```typescript
// From src/app/api/events/weekly-recurrence/route.ts - DELETE handler

switch (option) {
  case 'this_only':
    eventIdsToDelete = [eventId]
    break
  case 'all_previous':
    // Delete all events before the current one (exclusive)
    eventIdsToDelete = allEvents.slice(0, currentEventIndex).map(e => e.id)
    break
  case 'this_and_following':
    // Delete this event and all following
    eventIdsToDelete = allEvents.slice(currentEventIndex).map(e => e.id)
    break
  case 'all':
    eventIdsToDelete = allEvents.map(e => e.id)
    break
}
```

### Key Code References

| File | Purpose |
|------|---------|
| `/src/components/RecurringDeleteConfirmationModal.tsx` | Delete confirmation modal component |
| `/src/components/EventCreationModal.tsx` | Recurrence rule creation UI |
| `/src/hooks/useUnifiedEvents.ts` | `deleteRecurringEvents()` hook, `getRelatedEvents()` |
| `/src/app/api/events/weekly-recurrence/route.ts` | POST (create) and DELETE API handlers |
| `/src/lib/recurring-event-generator.ts` | Pattern-based instance generation |
| `/src/types/scheduling.ts` | RecurringEvent and ScheduleRule types |
| `/src/components/ScheduleCalendar.tsx` | `isRecurringEventOnDate()` logic |

---

## Multiday Events

### Data Model

Multiday events are distinguished by the following properties:

```typescript
export interface UnifiedEvent {
  // ... other fields ...
  startDateTime: string    // ISO date-time for start
  endDateTime?: string     // ISO date-time for end
  duration: number         // Total duration in minutes
  isAllDay?: boolean       // True if spans full day(s)
  isMultiDay?: boolean     // Explicit multi-day flag
}
```

#### Multiday Detection Logic

```typescript
// From src/components/ScheduleCalendar.tsx

const isEventMultiDay = (event: UnifiedEvent): boolean => {
  if (event.isMultiDay) return true;
  if (!event.endDateTime) return false;
  const startDate = startOfDay(new Date(event.startDateTime));
  const endDate = startOfDay(new Date(event.endDateTime));
  return !isSameDay(startDate, endDate);
};
```

#### Timed vs All-Day Multiday

- **All-day multiday**: `isAllDay: true` with `isMultiDay: true`
  - Start time set to 00:00:00
  - End time set to 23:59:59 of end date

- **Timed multiday**: `isMultiDay: true` with specific times
  - Has specific start time on first day
  - Has specific end time on last day
  - Duration calculated as time span within day (for visual height)

### Month View Display

#### Spanning Behavior

Multiday events span across day cells in month view:

```typescript
// From src/components/ScheduleCalendar.tsx

// Get events that span multiple days for a week row
const getMultiDayEventsForWeek = (weekStart: Date, weekEnd: Date) => {
  return unifiedEvents.filter(event => {
    if (!isEventMultiDay(event)) return false;

    const eventStart = startOfDay(new Date(event.startDateTime));
    const eventEnd = event.endDateTime
      ? startOfDay(new Date(event.endDateTime))
      : eventStart;

    // Event overlaps with week if: eventStart <= weekEnd AND eventEnd >= weekStart
    return eventStart <= weekEnd && eventEnd >= weekStart;
  });
};
```

#### Stacking and Overflow

- Events are rendered in an overlay layer above day cells
- Multiple multiday events stack vertically
- Z-index: 20 for multiday events (higher than single-day events)

#### Visual Styling

- Events render as horizontal bars spanning multiple day columns
- Clipped at week boundaries (continues on next row if spans more than one week)
- Color coding based on priority/type

### Week View Display

#### All-Day Section

Multiday events in week view:
- Appear in the time grid positioned at their start time
- Span across multiple day columns using CSS grid positioning

```typescript
// From src/components/WeekView.tsx

const getMultiDayEventStyle = (event: UnifiedEvent): React.CSSProperties => {
  const eventStart = new Date(event.startDateTime);
  const eventEnd = event.endDateTime ? new Date(event.endDateTime) : eventStart;

  // Calculate column positions (grid starts at column 2, column 1 is time gutter)
  const gridColumnStart = startDayIndex + 2;
  const gridColumnEnd = endDayIndex + 3;

  // Calculate vertical position based on start time
  const startHour = eventStart.getHours();
  const startMinutes = eventStart.getMinutes();
  const top = (startHour * PIXELS_PER_HOUR) + ((startMinutes / 60) * PIXELS_PER_HOUR);

  // For multi-day events, use visual duration (time-of-day span)
  const visualDuration = Math.abs(endMinutesOfDay - startMinutesOfDay);
  const height = (visualDuration / 60) * PIXELS_PER_HOUR;

  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${Math.max(height, 25)}px`,
    gridColumnStart,
    gridColumnEnd,
    left: '2px',
    right: '2px',
    zIndex: 20
  };
};
```

#### Timed Multiday Rendering

- Visual height based on time-of-day span (not total duration)
- Spans across day columns using grid positioning
- Start and end times preserved on first/last days

### Modification Workflow

#### Resize by Dragging Edges

The system supports 8 resize handles in week view:

```typescript
// From src/components/calendar/CalendarEvent.tsx

const getResizeHandles = (): HandleType[] => {
  if (effectiveViewMode === 'month') {
    // Non-recurring: all 8 handles
    return ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  } else if (effectiveViewMode === 'week') {
    // Full resize in week view
    return ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  }
  return [];
};
```

#### Resize Handle Types

- **top/bottom**: Adjust time (vertical resize)
- **left/right**: Adjust date span (horizontal resize)
- **corners**: Combined time and date adjustment

#### Duration Preservation

When dragging to new dates:
- **Horizontal drag**: Preserves time-of-day, changes dates
- **Vertical drag**: Changes times, preserves date span
- **Corner drag**: Can modify both

### Key Code References

| File | Purpose |
|------|---------|
| `/src/components/WeekView.tsx` | `getMultiDayEventsForWeek()`, `getMultiDayEventStyle()` |
| `/src/components/ScheduleCalendar.tsx` | Month view multiday rendering |
| `/src/components/calendar/CalendarEvent.tsx` | Resize handles, multiday detection |
| `/src/hooks/useEventResize.ts` | Resize logic including multiday |
| `/src/types/multiday-selection.ts` | Type definitions for multiday selection |
| `/src/hooks/useMultiDayDrag.ts` | Drag selection logic for creation |

---

## Confirmation Modals

### Edit Recurring Event Modal

**Current Status**: Not implemented in the web version.

When editing a recurring event, modifications apply only to the selected instance without confirmation.

**Recommendation for RN**: Implement an edit confirmation modal with options:
- "This event only"
- "This and future events"
- "All events in series"

### Delete Recurring Event Modal

#### RecurringDeleteConfirmationModal

**Location**: `/src/components/RecurringDeleteConfirmationModal.tsx`

**Props Interface**:
```typescript
interface RecurringDeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (option: RecurringDeleteOption) => Promise<void>
  event: UnifiedEvent | null
  relatedEvents: UnifiedEvent[]  // All events in the recurrence group
}
```

**UI Elements**:

1. **Header**
   - Trash icon with "Delete Recurring Event" title
   - Close button (X)

2. **Event Info Card**
   - Priority-colored left border
   - Title, date, time
   - Priority badge
   - Series info with repeat icon

3. **Options Section**
   - Radio-button style cards for each option
   - Icons: Calendar, ChevronLeft, ChevronRight, Repeat
   - Counts shown in labels: "Delete all previous (5)"
   - Dynamic description below selected option

4. **Warning Card** (conditional)
   - Yellow/orange background
   - AlertTriangle icon
   - "This action cannot be undone" message

5. **Error Display** (conditional)
   - Red background
   - Shows error message if deletion fails

6. **Action Buttons**
   - Cancel: Secondary styling
   - Delete: Red background, white text
   - Loading spinner during deletion

**Keyboard Handling**:
```typescript
React.useEffect(() => {
  if (!isOpen) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Enter' && !isDeleting) {
      e.preventDefault();
      handleConfirm();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, isDeleting, selectedOption]);
```

### Reschedule Confirmation Modal

**Location**: `/src/components/RescheduleConfirmationModal.tsx`

**Purpose**: Confirms event rescheduling after drag-and-drop, with participant notification options.

**When Shown**: Only when the event has participants

**Props Interface**:
```typescript
interface RescheduleConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: RescheduleData, notifyParticipants: boolean) => Promise<void>
  rescheduleData: RescheduleData | null
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: { date: string; hour: number; minute?: number }
  toSlot: { date: string; hour: number; minute?: number }
  reason?: string
}
```

**UI Sections**:

1. **Event Info Card** - Title, priority, description, client, location

2. **Schedule Change Display**
   - Current Time (red background)
   - Arrow indicator
   - New Time (green background)
   - Change Summary

3. **Significant Change Warning** (conditional)
   - Shown when moving 2+ hours or different day

4. **Participant Notifications**
   - List of participants
   - Toggle checkbox to enable/disable notifications

5. **Reason Input**
   - Optional textarea
   - Labeled as "(Recommended)" for significant changes

6. **Action Buttons**
   - Cancel
   - "Confirm Reschedule" with optional "Send" icon

### Resize Confirmation Modal

**Location**: `/src/components/ResizeConfirmationModal.tsx`

**Purpose**: Confirms event duration changes after resize, with participant notification options.

**Props Interface**:
```typescript
interface ResizeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ResizeData, notifyParticipants: boolean) => Promise<void>
  resizeData: ResizeData | null
}

interface ResizeData {
  event: UnifiedEvent
  originalStart: string
  originalEnd: string
  newStart: string
  newEnd: string
  handle: 'top' | 'bottom'
  reason?: string
}
```

**UI Sections**:

1. **Event Info Card** - Event details with priority badge

2. **Duration Change Display**
   - Original Duration (red)
   - New Duration (green)
   - Resize Summary (extended/shortened by X minutes)

3. **Participant Notifications** - Toggle for sending notifications

4. **Reason Input** - Optional textarea for change reason

5. **Action Buttons** - Cancel and Confirm Resize

### Modal Component Architecture

#### Shared Patterns

1. **Dialog Component**: Uses `@/components/ui/dialog` (shadcn/ui)
2. **Card Components**: `Card`, `CardContent`, `CardHeader` from `@/components/ui/card`
3. **Badge Component**: For priority and type indicators
4. **Button Component**: Primary and destructive variants

#### Styling Patterns

- **Destructive actions**: Red (`var(--status-danger-*)`)
- **Warnings**: Yellow/Orange (`var(--status-warning-*)`)
- **Success states**: Green (`var(--status-success-*)`)
- **Accent colors**: Uses theme accent color

#### Animation/Transition

- Modal uses Dialog component with built-in transitions
- Framer Motion for event card animations
- Loading spinners during async operations

#### Keyboard Accessibility

All modals implement:
- `Escape` to cancel/close
- `Enter` to confirm (when not loading)
- Focus management via Dialog component

#### Mobile Responsiveness

- Max-width constraints with viewport limits
- Scrollable content area
- Touch-friendly button sizes
- Responsive grid layouts

### Key Code References

| File | Purpose |
|------|---------|
| `/src/components/RecurringDeleteConfirmationModal.tsx` | Complete delete modal implementation |
| `/src/components/RescheduleConfirmationModal.tsx` | Drag-drop reschedule confirmation |
| `/src/components/ResizeConfirmationModal.tsx` | Resize confirmation with notifications |
| `/src/components/EventDetailsModal.tsx` | Event details display modal |
| `/src/components/ui/dialog.tsx` | Base Dialog component |

---

## React Native Considerations

### Modal Libraries

#### Recommended Options

1. **react-native-modal** (most popular)
   - Smooth animations
   - Backdrop handling
   - Swipe to dismiss

2. **@gorhom/bottom-sheet**
   - Better for action sheets
   - Native gesture handling
   - Good for delete options

3. **Native Modal (React Native core)**
   - Simple overlay modals
   - Platform-specific animations

### Gesture Handling for Event Modification

#### Long Press for Options

```typescript
// Suggested implementation
const handleLongPress = (event: UnifiedEvent) => {
  if (event.isRecurring || event.recurrenceGroupId) {
    // Show action sheet with edit/delete options
    showRecurringEventOptions(event);
  } else {
    showEventOptions(event);
  }
};
```

#### Swipe to Delete

```typescript
// Use react-native-swipeable or react-native-gesture-handler
// Show delete option on swipe left
// For recurring events, show modal instead of direct delete
```

### Recurrence Rule Libraries

#### rrule.js Compatibility

The web implementation uses a custom format, but for RN you may consider:

1. **rrule.js**
   - Standard RRULE format
   - Works in React Native
   - Can convert from/to iCal format

2. **date-fns-rrule** (not official)
   - Smaller bundle
   - Basic recurrence patterns

3. **Custom implementation** (as in web)
   - Match existing data model
   - Simpler logic
   - Easier to maintain parity

#### Recommended Approach

Keep the custom format for consistency with the web API:

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number
  intervalType?: 'days' | 'weeks' | 'months' | 'years'
  endDate?: string
  occurrences?: number
  weekDays?: number[]
  monthDay?: number
}
```

### Additional RN Considerations

1. **Haptic Feedback**: Add haptics for delete confirmations
2. **Pull to Refresh**: Calendar sync with database
3. **Offline Support**: Queue recurring event operations
4. **Platform Differences**: iOS ActionSheet vs Android bottom sheet

---

## Summary

### Key Takeaways for RN Implementation

1. **Recurring Events**
   - Use the same custom RecurrenceRule format for API compatibility
   - Implement all 4 delete options in a modal/action sheet
   - Consider adding edit confirmation modal (not in web version)
   - Link instances via recurrenceGroupId

2. **Multiday Events**
   - isMultiDay flag plus startDateTime/endDateTime
   - Calculate visual duration for display (time-of-day span)
   - Support spanning across week boundaries

3. **Confirmation Modals**
   - Delete recurring: 4 options with counts
   - Reschedule: Show before/after, optional notifications
   - Resize: Show duration change, optional notifications
   - All modals: Loading states, error handling, keyboard/gesture support

4. **UI Patterns**
   - Color coding for destructive/warning/success states
   - Dynamic descriptions based on selection
   - Participant notification toggles
   - Reason/notes input for significant changes
