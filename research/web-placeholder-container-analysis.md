# Time Manager Placeholder Container Analysis

## Overview

The time-manager component in the web application uses a sophisticated placeholder container system for creating calendar events via double-click and drag interactions. The system provides visual feedback during event creation, supporting single-day events, multi-day spanning events, and recurring weekly events depending on the calendar view and user interaction pattern.

The placeholder system consists of several coordinated components:
- **PlaceholderEvent** (`/src/components/calendar/PlaceholderEvent.tsx`) - The visual ghost event display component
- **useEventCreationDrag** (`/src/hooks/useEventCreationDrag.ts`) - Hook managing double-click + drag detection for Day/Week views
- **useMultiDayDrag** (`/src/hooks/useMultiDayDrag.ts`) - Hook for multi-day/week selection in Month view
- **WeekdayPlaceholder** (`/src/components/calendar/WeekdayPlaceholder.tsx`) - Multi-day placeholder for Month view recurring events
- **DropZone** (`/src/components/DropZone.tsx`) - Time slot interaction component with click/double-click detection

---

## Day View Behavior

The Day view is rendered via `UnifiedDailyPlanner.tsx` and uses the same placeholder system as Week view but operates on a single column.

### Trigger Mechanism

**User Action**: Double-click on an empty time slot

**Implementation** (`DropZone.tsx`, lines 176-213):
```typescript
// Handle click to create new event (with double-click detection)
const handleClick = (e: React.MouseEvent) => {
  if (clickTimeout) {
    // This is a double-click - clear the single-click timeout
    clearTimeout(clickTimeout)
    setClickTimeout(null)
    if (onTimeSlotDoubleClick) {
      // Calculate precise 15-minute interval from click position
      const preciseTime = calculatePreciseTime(e.clientY)
      const preciseMinutes = Math.round((preciseTime - hour) * 60)
      onTimeSlotDoubleClick(clickDate, hour, preciseMinutes)
    }
  } else {
    // This might be a single-click - set a timeout
    const timeout = setTimeout(() => {
      if (onTimeSlotClick) {
        onTimeSlotClick(preciseDate, preciseHour)
      }
      setClickTimeout(null)
    }, 300) // 300ms window for double-click detection
    setClickTimeout(timeout)
  }
}
```

**Initial State** (`time-manager/page.tsx`, lines 504-533):
- Placeholder created with 15-minute compact duration
- Positioned at precise click location (15-min snapping)
- Opens sidebar in event creation mode

### Drag Behavior

**Hook**: `useEventCreationDrag` (`/src/hooks/useEventCreationDrag.ts`)

**Key Constants**:
```typescript
const DEFAULT_PIXELS_PER_HOUR = 80
const SNAP_MINUTES = 15
const MIN_DURATION_MINUTES = 15
const DRAG_THRESHOLD_PX = 5
const DOUBLE_CLICK_WINDOW_MS = 300
```

**Drag Detection** (lines 170-217):
1. Double-click detected within 300ms window
2. mousedown stores initial position and grid info
3. Global mousemove/mouseup listeners attached
4. Drag mode triggers after 5px movement threshold

**Resize During Drag** (lines 222-313):
```typescript
const handleMouseMove = useCallback((e: MouseEvent) => {
  // Calculate current time from mouse Y position
  const currentTime = yToTime(e.clientY, startData.gridTop, pixelsPerHour)

  // Handle backward drag (swap start and end)
  if (endDateTime < startDateTime) {
    [startDate, endDate] = [endDate, startDate]
    ;[startHour, endHour] = [endHour, startHour]
    ;[startMinutes, endMinutes] = [endMinutes, startMinutes]
  }

  // Calculate duration (clamped to not exceed midnight)
  const duration = calculateDuration(startDate, startHour, startMinutes,
                                     endDate, endHour, endMinutes)
})
```

**Constraints**:
- 15-minute snap grid
- Minimum 15-minute duration
- Maximum extends to midnight (24:00)
- Backward drag supported (auto-swaps start/end)

### Visual Feedback

**Component**: `PlaceholderEvent.tsx` (lines 1-193)

**Styling**:
```typescript
// Base placeholder styling
className="rounded-r-md border-2 border-dashed bg-accent/30 border-accent"
style={{
  borderLeftWidth: '4px',
  borderLeftStyle: 'dashed',
  willChange: 'top, height' // Optimize for smooth dragging
}}
```

**Adaptive Display Modes** (lines 7-10):
```typescript
const COMPACT_HEIGHT_THRESHOLD = 35 // Ultra-compact (time only)
const MEDIUM_HEIGHT_THRESHOLD = 50 // Compact (time + short info)
```

**Content Scaling**:
- Ultra-compact (<35px): Time range inline only
- Compact (<50px): Time range + duration if >= 30min
- Full: Title, time range, and duration display

**Time Display During Drag**:
- Short format: `h:mma` (e.g., "9:15am - 10:00am")
- Duration shown as: `{hours}h {mins}m` format

### Completion Handling

**On mouseup** (`useEventCreationDrag.ts`, lines 323-336):
```typescript
const handleMouseUp = useCallback(() => {
  if (mouseMoveStartedRef.current && dragStateRef.current) {
    callbacksRef.current.onDragEnd?.(dragStateRef.current)
  }
  // Reset drag tracking (but don't clear dragState)
  // Parent component handles form syncing
})
```

**Outcome**:
1. Placeholder persists on calendar
2. Sidebar form opens with time range pre-filled
3. User completes event details
4. On save: event created, placeholder cleared
5. On cancel/outside click: placeholder cleared

### Edge Cases

**Dragging Outside Calendar Bounds**:
- Y-position clamped to 0-23:45 range
- No horizontal bounds in Day view (single column)

**Dragging Over Existing Events**:
- Placeholder renders with lower z-index (z-index: 5)
- Events have z-index: 10, so placeholder appears behind

**Very Short Duration**:
- Minimum 15 minutes enforced
- Ultra-compact display mode activates

**Cancellation**:
- Click outside calendar: placeholder cleared via document click handler
- Escape key: not explicitly handled (document click handles it)

---

## Week View Behavior

Week view (`WeekView.tsx`) extends day view functionality across 7 columns.

### Trigger Mechanism

**Same as Day View**: Double-click on any time slot in the 7-day grid

**Additional Handler** (`WeekView.tsx`, lines 884):
```typescript
onMouseDownOnSlot={handleCreationMouseDown}
```

The mousedown handler is passed to DropZone and forwarded to `useEventCreationDrag` hook.

### Drag Behavior

**Hook**: `useEventCreationDrag` with `dayColumnCount: 7`

**Multi-Column Calculations** (lines 67-73):
```typescript
function xToDay(x: number, gridLeft: number, timeColumnWidth: number,
                columnWidth: number, maxDayIndex: number = 6) {
  const relativeX = x - gridLeft - timeColumnWidth
  const dayIndex = Math.floor(relativeX / columnWidth)
  return Math.max(0, Math.min(maxDayIndex, dayIndex))
}
```

**Horizontal Spanning**:
- Dragging across day columns creates multi-day placeholder
- Grid layout: 8 columns (1 time + 7 days)
- Each day column is 12.5% of width

**Multi-Day State** (`DragState` interface, lines 12-24):
```typescript
interface DragState {
  isDragging: boolean
  startDate: string
  startHour: number
  startMinutes: number
  currentDate: string // Can differ from startDate
  currentHour: number
  currentMinutes: number
  duration: number
  isMultiDay: boolean
  startDayIndex: number
  currentDayIndex: number
}
```

### Visual Feedback

**Multi-Day Placeholder Rendering** (`WeekView.tsx`, lines 1106-1201):
```typescript
if (isMultiDay) {
  // Multi-day: span across columns with percentage positioning
  const leftPercent = timeColumnPercent + (startDayIndex * dayColumnPercent)
  const widthPercent = numColumns * dayColumnPercent

  return (
    <div style={{
      position: 'absolute',
      left: `calc(${leftPercent}% + 2px)`,
      width: `calc(${widthPercent}% - 4px)`,
    }}>
      <PlaceholderEvent isMultiDay={true} ... />
    </div>
  )
}
```

**Single-Day in Week View** (lines 1202-1241):
- Rendered in specific day column using grid layout
- Same styling as Day view placeholder

**Multi-Day Badge**:
```typescript
{isMultiDay && (
  <div className="text-xs text-accent-foreground/70 font-primary
                  bg-accent/20 rounded px-1 py-0.5 mt-1">
    Multi-day event
  </div>
)}
```

### Completion Handling

Same as Day view, but with multi-day data:
- `endDate` populated for multi-day events
- `endHour` and `endMinutes` preserved for precise end time
- Sidebar form receives full date range

### Edge Cases

**Dragging Across Midnight**:
- Time automatically wraps to next day
- `isMultiDay` flag set to true
- Duration calculated spanning both days

**Horizontal Drag Direction**:
- Backward drag (right-to-left) supported
- Dates automatically swapped to maintain start < end

**Week Boundary**:
- Cannot extend beyond visible week (0-6 day indices)
- Clamped to week bounds

---

## Month View Behavior

Month view (`ScheduleCalendar.tsx`) has distinct placeholder behavior optimized for all-day or multi-day recurring events.

### Trigger Mechanism

**User Action**: Double-click on a day cell (not a time slot)

**Implementation** (`ScheduleCalendar.tsx`, lines 876-913):
```typescript
const handleDayMouseDown = useCallback((e: React.MouseEvent, day: Date) => {
  const now = Date.now()
  const timeSinceLastClick = now - lastClickTimeRef.current

  // Check if within double-click window (second click)
  if (timeSinceLastClick < DOUBLE_CLICK_WINDOW) {
    e.preventDefault()
    dragStartRef.current = { date: day, isDoubleClick: true }

    // Add listeners IMMEDIATELY (synchronously)
    document.addEventListener('mousemove', moveHandler)
    document.addEventListener('mouseup', upHandler)
  }

  lastClickTimeRef.current = now
})
```

**Initial State**:
- Default hour: 9 AM (`DEFAULT_HOUR = 9`)
- Duration: 15 minutes
- Opens event creation mode in sidebar

### Drag Behavior

**Hook**: Uses inline drag handling, not a separate hook

**Multi-Day Selection** (lines 915-993):
```typescript
const handleDayMouseMove = useCallback((e: MouseEvent) => {
  // Find which day cell we're over using DOM positions
  weekRows.forEach((row) => {
    if (e.clientY >= rowRect.top && e.clientY <= rowRect.bottom) {
      // Calculate column from X position
      const relativeX = Math.max(0, e.clientX - gridRect.left)
      const cellWidth = gridRect.width / 7
      let colIndex = Math.floor(relativeX / cellWidth)
      colIndex = Math.max(0, Math.min(6, colIndex))

      targetDate = addDays(weekStart, colIndex)
    }
  })

  if (!isDragCreating && !isSameDay(targetDate, dragStartRef.current.date)) {
    setIsDragCreating(true)
  }

  // Update placeholder with multi-day span
  onPlaceholderChange({
    date: format(actualStart, 'yyyy-MM-dd'),
    hour: DEFAULT_HOUR,
    endDate: format(actualEnd, 'yyyy-MM-dd'),
    ...
  })
})
```

**Vertical Drag Detection** (`useMultiDayDrag.ts`, lines 126-134):
```typescript
// Constants from types/multiday-selection.ts
const VERTICAL_DRAG_THRESHOLD = 40 // pixels

// Check for vertical conversion
if (deltaY > VERTICAL_DRAG_THRESHOLD && dragState.mode !== 'vertical_convert') {
  setDragState(prev => ({
    ...prev,
    mode: 'vertical_convert',
  }))
}
```

**Modes**:
1. `horizontal_select`: Multi-day spanning event (within week)
2. `vertical_convert`: Recurring weekly event (crosses weeks)

### Visual Feedback

**Multi-Day Placeholder** (lines 1857-1920):
```typescript
<div
  data-placeholder="true"
  className="cursor-grab"
  style={{
    left: `calc(${leftPercent}% + 4px)`,
    width: `calc(${widthPercent}% - 8px)`,
    background: placeholderInteraction
      ? 'hsl(var(--accent)/0.4)'
      : 'hsl(var(--accent)/0.25)'
  }}
>
  {/* Visual placeholder container */}
  <div className="h-full rounded-lg border-2 border-dashed border-accent">
    {placeholderEvent?.title || 'New Event'} - {daySpan} days
  </div>
</div>
```

**Resize Handles** (WeekdayPlaceholder.tsx, lines 137-162):
```typescript
// Top handle - extends to previous weeks
<div
  className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-3
             bg-accent rounded-full cursor-ns-resize"
  onMouseDown={(e) => onResizeStart('top', e)}
>
  <GripHorizontal className="w-3 h-3 text-white" />
</div>

// Bottom handle - extends to next weeks
<div
  className="absolute -bottom-1 left-1/2 ... cursor-ns-resize"
  onMouseDown={(e) => onResizeStart('bottom', e)}
>
```

### Completion Handling

**Single Day** (lines 999-1005):
```typescript
if (dragStartRef.current?.isDoubleClick && !isDragCreating) {
  // Single double-click without drag
  if (onDayDoubleClick) {
    onDayDoubleClick(day, DEFAULT_HOUR)
  }
}
```

**Multi-Day Drag** (lines 1006-1014):
```typescript
if (isDragCreating && dragStartRef.current) {
  // Multi-day drag completed - open event creation form
  // Placeholder already set via onPlaceholderChange during drag
  if (onDayDoubleClick) {
    onDayDoubleClick(day, DEFAULT_HOUR)
  }
}
```

### Edge Cases

**Vertical Resize (Week Spanning)**:
- Creates recurring weekly events
- Placeholder shows in multiple week rows
- `weeklyRecurrenceEnd` and `weeklyRecurrenceCount` set

**Placeholder Resize/Drag** (lines 1035-1230):
- Left/right handles resize horizontally (day span)
- Top/bottom handles resize vertically (week span)
- Corner handles support both dimensions

**Click Outside Dismissal** (lines 252-281):
```typescript
const handleClickOutside = (e: MouseEvent) => {
  if (target.closest('[data-placeholder]')) return
  if (target.closest('[data-sidebar]')) return
  onPlaceholderChange(null) // Dismiss placeholder
}
```

---

## Shared Components & Utilities

### PlaceholderEvent Component

**File**: `/src/components/calendar/PlaceholderEvent.tsx`

**Props Interface**:
```typescript
interface PlaceholderEventProps {
  date: string           // 'yyyy-MM-dd' format
  hour: number           // 0-23
  minutes?: number       // 0-59, for precise positioning
  duration?: number      // in minutes, default 15
  title?: string         // optional, from form input
  pixelsPerHour?: number // default 80
  endDate?: string       // for multi-day events
  endHour?: number       // for multi-day events
  endMinutes?: number    // for 15-min precision
  isMultiDay?: boolean   // flag for multi-day styling
}
```

**Key Features**:
- Adaptive display based on height
- Dashed border with accent color
- Semi-transparent background (`bg-accent/30`)
- `pointer-events-none` to allow interaction pass-through
- `willChange: 'top, height'` for smooth animations

### Time Calculation Utilities

**Y-to-Time Conversion** (`useEventCreationDrag.ts`, lines 45-61):
```typescript
function yToTime(y: number, gridTop: number, pixelsPerHour: number) {
  const relativeY = Math.max(0, y - gridTop)
  const totalMinutes = (relativeY / pixelsPerHour) * 60
  const clampedTotalMinutes = Math.min(totalMinutes, 23 * 60 + 45)

  const hour = Math.floor(clampedTotalMinutes / 60)
  const minutes = Math.round((clampedTotalMinutes % 60) / SNAP_MINUTES) * SNAP_MINUTES

  return {
    hour: Math.max(0, Math.min(23, hour)),
    minutes: Math.max(0, Math.min(45, minutes))
  }
}
```

**Duration Calculation** (lines 79-102):
```typescript
function calculateDuration(
  startDate: string, startHour: number, startMinutes: number,
  endDate: string, endHour: number, endMinutes: number
): number {
  // For same-day events, cap at midnight
  if (startDate === endDate) {
    const startTotalMinutes = startHour * 60 + startMinutes
    const maxDuration = (24 * 60) - startTotalMinutes
    durationMinutes = Math.min(durationMinutes, maxDuration)
  }
  return Math.max(MIN_DURATION_MINUTES, durationMinutes)
}
```

### DropZone Click Detection

**File**: `/src/components/DropZone.tsx`

**15-Minute Precision Calculation** (lines 159-173):
```typescript
const calculatePreciseTime = (clientY: number): number => {
  const rect = dropZoneElement.getBoundingClientRect()
  const relativeY = clientY - rect.top
  const slotHeight = rect.height

  // Calculate which 15-minute segment was clicked
  const minuteSegment = Math.floor((relativeY / slotHeight) * 4)
  const minutes = Math.min(45, minuteSegment * 15)

  return hour + (minutes / 60)
}
```

---

## State Management

### Placeholder Event State

**Location**: `time-manager/page.tsx` (lines 44-55)

```typescript
const [placeholderEvent, setPlaceholderEvent] = useState<{
  date: string
  hour: number
  minutes?: number
  duration: number
  title?: string
  endDate?: string
  endHour?: number
  endMinutes?: number
  weeklyRecurrenceEnd?: string
  weeklyRecurrenceCount?: number
} | null>(null)
```

### Drag State Management

**useEventCreationDrag State** (lines 119-161):
```typescript
const [dragState, setDragState] = useState<DragState | null>(null)
const [isDragging, setIsDragging] = useState(false)
const [isTrackingMouse, setIsTrackingMouse] = useState(false)

// Use refs to avoid stale closures
const dragStartRef = useRef<{ ... } | null>(null)
const lastDragStateRef = useRef<{ ... } | null>(null)
const clickCountRef = useRef(0)
const lastClickTimeRef = useRef(0)
```

### Form-Placeholder Synchronization

**Two-Way Sync** (`time-manager/page.tsx`):

1. **Placeholder to Form** (lines 504-539):
   - On double-click: `setEventCreationTime`, `setEventCreationDate`
   - Sidebar form receives initial values

2. **Form to Placeholder** (lines 555-582):
   - `handleFormChange` updates placeholder when form values change
   - Uses ref tracking to prevent infinite loops:
   ```typescript
   const lastFormChangeRef = useRef<{ date?: string; ... }>({})
   if (data.date === last.date && ...) return // Skip if no change
   ```

3. **External Placeholder Updates** (lines 584-598):
   - `handlePlaceholderChange` allows WeekView/ScheduleCalendar to update placeholder
   - Does NOT update form (avoids circular updates)

---

## Key Implementation Details

### Double-Click Detection Pattern

Used consistently across views:
```typescript
const DOUBLE_CLICK_WINDOW = 300 // milliseconds

// On first click: start timeout
if (!clickTimeout) {
  const timeout = setTimeout(() => {
    handleSingleClick()
    setClickTimeout(null)
  }, DOUBLE_CLICK_WINDOW)
  setClickTimeout(timeout)
}

// On second click within window: cancel timeout, handle double-click
if (clickTimeout) {
  clearTimeout(clickTimeout)
  setClickTimeout(null)
  handleDoubleClick()
}
```

### Drag Threshold

Movement required before drag mode activates:
```typescript
const DRAG_THRESHOLD_PX = 5

const hasMoved = Math.abs(deltaY) > DRAG_THRESHOLD_PX ||
                 Math.abs(deltaX) > DRAG_THRESHOLD_PX
```

### Global Event Listeners

Pattern for handling drag across component boundaries:
```typescript
useEffect(() => {
  if (isTrackingMouse) {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }
}, [isTrackingMouse])
```

### Z-Index Layering

```
z-index: 5  - PlaceholderEvent (below real events)
z-index: 10 - CalendarEvent (normal events)
z-index: 20 - Multi-day events
z-index: 25 - Drag ghost preview / Placeholder overlays
z-index: 30 - Resize preview overlay
z-index: 50 - WeekdayPlaceholder (month view)
```

---

## React Native Considerations

### Gesture Translation

| Web Event | React Native Equivalent |
|-----------|------------------------|
| Double-click | Double-tap (via `TapGestureHandler`) |
| mousedown + mousemove + mouseup | `PanGestureHandler` |
| Mouse Y position | Pan gesture `translationY` |
| 15-min snap grid | Calculate snap from gesture offset |
| Global event listeners | Gesture state tracking |

### Recommended Libraries

1. **react-native-gesture-handler** - For tap and pan gestures
2. **react-native-reanimated** - For smooth animations during drag

### Key Adaptations

1. **Touch Targets**: Increase hit areas for mobile (minimum 44x44pt)
2. **Visual Feedback**: Use haptic feedback on snap points
3. **Gesture Conflicts**: Handle scroll vs drag disambiguation
4. **Double-Tap Timing**: Use gesture handler's built-in `numberOfTaps`

### Gesture Handler Example Structure

```typescript
import { TapGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler'

const TimeSlot = () => {
  const doubleTapRef = useRef()

  const onDoubleTap = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Start placeholder creation
    }
  }

  const onPan = (event) => {
    // Calculate time from translationY
    // Update placeholder size
  }

  return (
    <TapGestureHandler
      ref={doubleTapRef}
      numberOfTaps={2}
      onHandlerStateChange={onDoubleTap}
    >
      <PanGestureHandler
        waitFor={doubleTapRef}
        onGestureEvent={onPan}
      >
        <Animated.View>
          {/* Time slot content */}
        </Animated.View>
      </PanGestureHandler>
    </TapGestureHandler>
  )
}
```

### State Management Recommendations

1. Use React Context or Zustand for placeholder state (similar to web)
2. Store drag state in refs for gesture handlers (avoid state update delays)
3. Use `useSharedValue` from reanimated for smooth animation values

### Visual Feedback Differences

| Web | React Native |
|-----|-------------|
| CSS dashed border | `borderStyle: 'dashed'` (limited support) or custom dash component |
| `bg-accent/30` | `backgroundColor` with opacity |
| CSS transitions | `withTiming` / `withSpring` from reanimated |
| `pointer-events-none` | `pointerEvents="none"` on View |

---

## Summary

The web placeholder system provides a rich, intuitive event creation experience through:

1. **Double-click activation** with 300ms detection window
2. **Drag-to-extend** with 5px threshold and 15-minute snapping
3. **Adaptive visual feedback** based on placeholder size
4. **View-specific behavior** (vertical in Day, multi-day in Week, recurring in Month)
5. **Seamless form integration** with bidirectional sync

For React Native implementation, focus on:
- Translating double-click to double-tap gestures
- Pan gesture handling for drag-to-extend
- Shared value animation for smooth visual feedback
- Proper gesture handler composition to avoid conflicts
