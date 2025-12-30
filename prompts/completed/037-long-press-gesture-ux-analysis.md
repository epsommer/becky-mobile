<objective>
Fix the janky long-press gesture for calendar event creation. The current implementation has critical UX issues:

1. **Placeholder disappears on finger lift** - Should persist and remain editable
2. **Multi-column spanning is erratic** - daySpan jumps unpredictably
3. **No resize handles after creation** - User cannot adjust the placeholder after releasing

Implement a **persistent placeholder model** where:
- Long-press creates the placeholder
- Lifting finger does NOT dismiss it
- User can then tap resize handles or drag edges to adjust
- Placeholder persists until user confirms or cancels
</objective>

<context>
Read the existing implementation to understand current problems:
@./components/calendar/gestures/useDragToCreate.ts
@./components/calendar/PlaceholderContainer.tsx
@./components/calendar/WeekView.tsx
@./components/calendar/DayView.tsx
</context>

<problem_analysis>

## Console Log Evidence

The logs show the core problem - immediate start/end cycles:
```
LOG  [WeekView] Drag-to-create started: {"daySpan": 1, "durationMinutes": 15, ...}
LOG  [WeekView] Drag-to-create ended: {"daySpan": 1, "durationMinutes": 15, ...}
```

Every "started" is immediately followed by "ended" with identical values. The placeholder lifecycle is tied to the gesture lifecycle, so lifting your finger ends everything.

## Multi-Column Spanning Issues

The horizontal detection is erratic:
```
LOG  [WeekView] Drag-to-create started: {"daySpan": 1, ...}
LOG  [WeekView] Drag-to-create ended: {"daySpan": 4, "isMultiDay": true, ...}
```

The daySpan jumps from 1 to 4 abruptly - the xToDayIndex calculation is too sensitive or using wrong reference points.

## Reanimated Warning

```
WARN  [Reanimated] Property "opacity" of AnimatedComponent(View) may be overwritten by a layout animation.
```

The PlaceholderContainer uses both FadeIn/FadeOut layout animations AND animated opacity - these conflict.

</problem_analysis>

<required_changes>

## 1. Persistent Placeholder State Model

Change from gesture-bound to state-bound placeholder:

### Current (Broken) Model
```
Long-press → Placeholder visible (while holding)
Drag → Placeholder updates (while holding)
Release → Placeholder disappears, onDragEnd called
```

### Required (Fixed) Model
```
Long-press → Placeholder created, persists in state
Release → Placeholder STAYS visible with resize handles
Tap handle + drag → Resize placeholder
Tap confirm → Complete creation
Tap outside/cancel → Dismiss placeholder
```

### State Structure
```typescript
interface PlaceholderState {
  // Creation state
  isActive: boolean;
  isEditing: boolean;  // NEW: true after initial creation

  // Time bounds
  startDate: string;
  startHour: number;
  startMinutes: number;
  endDate: string;
  endHour: number;
  endMinutes: number;

  // Multi-day
  isMultiDay: boolean;
  daySpan: number;
  startDayIndex: number;  // NEW: for accurate column tracking
}
```

## 2. Gesture Flow Redesign

### Phase 1: Creation (Long-Press)
```typescript
const longPressGesture = Gesture.LongPress()
  .minDuration(400)  // Reduced from 500ms for snappier feel
  .onStart((event) => {
    // Create placeholder at touch position
    createPlaceholder(event.x, event.y);
    triggerHaptic('medium');
  })
  .onEnd(() => {
    // DO NOT clear placeholder - transition to edit mode
    setPlaceholderEditing(true);
  });
```

### Phase 2: Optional Immediate Drag
```typescript
const panGesture = Gesture.Pan()
  .activateAfterLongPress(400)
  .onUpdate((event) => {
    if (placeholder.isActive) {
      // Update placeholder during drag
      updatePlaceholderFromDrag(event);
    }
  })
  .onEnd(() => {
    // Transition to edit mode, NOT dismiss
    setPlaceholderEditing(true);
  });
```

### Phase 3: Post-Release Editing
```typescript
// Separate gesture for resize handles
const resizeGesture = Gesture.Pan()
  .enabled(placeholder.isEditing)
  .onStart((event) => {
    detectResizeHandle(event);  // top, bottom, left, right
  })
  .onUpdate((event) => {
    resizePlaceholder(activeHandle, event.translationY, event.translationX);
  })
  .onEnd(() => {
    // Still in edit mode
  });
```

## 3. Fix Multi-Column Spanning

### Problem: Incorrect X-to-Day Calculation

Current code uses `absoluteX` which is screen-relative. Need grid-relative calculation:

```typescript
// WRONG - uses absolute screen position
const currentDayIndex = xToDayIndex(
  absoluteX,  // This is wrong
  gridLeft,
  timeColumnWidth,
  dayColumnWidth
);

// CORRECT - use touch position relative to grid
const currentDayIndex = xToDayIndex(
  event.x,  // Relative to gesture view
  0,        // Grid starts at 0 within the view
  timeColumnWidth,
  dayColumnWidth
);
```

### Add Day Index Tracking
```typescript
// Track the starting day index when placeholder is created
const startDayIndexRef = useRef<number>(0);

// On long-press start
startDayIndexRef.current = xToDayIndex(event.x, ...);

// On drag update - calculate relative change
const currentDayIndex = xToDayIndex(event.absoluteX - gridLeft, ...);
const dayDelta = currentDayIndex - startDayIndexRef.current;
```

### Debounce Day Changes
```typescript
// Prevent erratic day jumping
const lastDayIndexRef = useRef<number>(0);
const dayChangeThreshold = dayColumnWidth * 0.6;  // 60% into next column

const shouldChangeDayIndex = (newIndex: number, translationX: number) => {
  if (newIndex === lastDayIndexRef.current) return false;

  // Require significant horizontal movement to change days
  const pixelsIntoDayColumn = Math.abs(translationX) % dayColumnWidth;
  return pixelsIntoDayColumn > dayChangeThreshold;
};
```

## 4. Fix Animation Conflicts

### Remove Conflicting Animations
```typescript
// PlaceholderContainer.tsx - REMOVE these conflicting props
// entering={FadeIn.duration(150)}  // REMOVE
// exiting={FadeOut.duration(100)}   // REMOVE

// Use ONLY the animated opacity from useAnimatedStyle
const animatedContainerStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));
```

## 5. Add Resize Handles to PlaceholderContainer

```typescript
interface PlaceholderContainerProps {
  // ... existing props
  isEditing: boolean;  // NEW
  onResizeStart?: (handle: 'top' | 'bottom' | 'left' | 'right') => void;  // NEW
  onResizeMove?: (handle: string, delta: { x: number; y: number }) => void;  // NEW
  onResizeEnd?: () => void;  // NEW
  onConfirm?: () => void;  // NEW
  onCancel?: () => void;  // NEW
}

// Render resize handles when editing
{isEditing && (
  <>
    {/* Top resize handle */}
    <GestureDetector gesture={topResizeGesture}>
      <View style={styles.resizeHandleTop}>
        <View style={styles.handleBar} />
      </View>
    </GestureDetector>

    {/* Bottom resize handle */}
    <GestureDetector gesture={bottomResizeGesture}>
      <View style={styles.resizeHandleBottom}>
        <View style={styles.handleBar} />
      </View>
    </GestureDetector>

    {/* Action buttons */}
    <View style={styles.actionButtons}>
      <TouchableOpacity onPress={onConfirm} style={styles.confirmButton}>
        <Ionicons name="checkmark" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </View>
  </>
)}
```

</required_changes>

<implementation_steps>

1. **Update PlaceholderContainer.tsx**
   - Remove FadeIn/FadeOut layout animations (fix warning)
   - Add `isEditing` prop
   - Add resize handles (top/bottom for duration, left/right for days)
   - Add confirm/cancel action buttons
   - Style resize handles with clear affordances

2. **Refactor useDragToCreate.ts**
   - Change `onDragEnd` to NOT clear placeholder
   - Add `isEditing` state that activates after release
   - Fix xToDayIndex calculation to use correct reference
   - Add debouncing for day column changes
   - Reduce long-press duration from 500ms to 400ms

3. **Create useResizePlaceholder.ts** (NEW)
   - Handle resize gestures for editing mode
   - Support top/bottom handles (time adjustment)
   - Support left/right handles (day adjustment in week view)
   - Maintain 15-minute snap behavior

4. **Update WeekView.tsx**
   - Pass `isEditing` state to PlaceholderContainer
   - Handle resize callbacks
   - Add confirm/cancel handlers
   - Ensure placeholder persists until explicitly dismissed

5. **Update DayView.tsx**
   - Same changes as WeekView but only top/bottom resize

6. **Add dismiss-on-tap-outside behavior**
   - Wrap calendar in a Pressable that dismisses placeholder
   - Exclude taps on the placeholder itself

</implementation_steps>

<file_changes>

## Files to Modify

### ./components/calendar/PlaceholderContainer.tsx
- Remove FadeIn/FadeOut (lines 132-133)
- Add isEditing prop
- Add resize handles component
- Add confirm/cancel buttons
- Add handle gesture detectors

### ./components/calendar/gestures/useDragToCreate.ts
- Add isEditing state
- Change onEnd to setIsEditing(true) instead of clearing
- Fix xToDayIndex calculation (use relative coordinates)
- Add debouncing for day changes
- Export isEditing state

### ./components/calendar/WeekView.tsx
- Handle placeholder editing state
- Pass resize callbacks
- Add tap-outside-to-dismiss

### ./components/calendar/DayView.tsx
- Same as WeekView

## Files to Create

### ./components/calendar/gestures/useResizePlaceholder.ts
- Resize gesture handling
- Top/bottom handle for time
- Left/right handle for days (week view only)
- Snap to 15-minute increments

### ./components/calendar/ResizeHandle.tsx
- Reusable resize handle component
- Visual affordance (grip lines)
- Gesture detector wrapper

</file_changes>

<verification>
Test the following scenarios:

1. **Placeholder Persistence**
   - Long-press to create → lift finger → placeholder should STAY visible
   - Placeholder shows resize handles and action buttons

2. **Duration Resize**
   - Drag bottom handle down → end time increases
   - Drag bottom handle up → end time decreases (min 15 min)
   - Drag top handle up → start time decreases
   - Drag top handle down → start time increases

3. **Multi-Day Resize (Week View)**
   - Drag right handle → spans more days
   - Drag left handle → adjusts start day
   - Day changes should be smooth, not jumpy

4. **Confirm/Cancel**
   - Tap checkmark → opens event creation form with times
   - Tap X → dismisses placeholder
   - Tap outside placeholder → dismisses placeholder

5. **Immediate Drag**
   - Long-press + drag without lifting → should still work
   - Releasing after drag → placeholder stays in edit mode

6. **No Console Warnings**
   - Reanimated opacity warning should be gone
</verification>

<success_criteria>
- Placeholder persists after finger lift
- Resize handles allow adjusting time range
- Multi-column spanning is smooth (no jumping from 1 to 4)
- No Reanimated animation warnings
- Can confirm or cancel the placeholder
- Tap outside dismisses placeholder
- Feels responsive and native
</success_criteria>
