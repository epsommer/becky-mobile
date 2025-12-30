<objective>
Fix the placeholder event resize gesture so it follows the user's finger position exactly.

Current behavior: When resizing a placeholder event in DayView, the resize "amplifies" (moves more than the finger) or snaps to incorrect positions instead of following the finger precisely.

Expected behavior: The placeholder edge being resized should track 1:1 with the user's finger position, with optional snapping to 15-minute increments only after the gesture ends.
</objective>

<context>
This is a React Native calendar app using react-native-gesture-handler and react-native-reanimated.

The placeholder creation flow works correctly:
1. Long-press creates a placeholder
2. Finger lift transitions to editing mode with resize handles
3. App no longer crashes when interacting with resize handles (runOnJS fix applied)

But the resize gesture has incorrect coordinate/delta handling.

Key files:
@./components/calendar/DayView.tsx - Contains handlePlaceholderResizeMove callback
@./components/calendar/PlaceholderContainer.tsx - Contains resize gesture definitions
@./components/calendar/gestures/useDragToCreate.ts - Contains updatePlaceholderBounds function
</context>

<problem_analysis>
The issue is likely one of these:

1. **Cumulative vs Delta confusion**: Gesture.Pan().onUpdate() provides `translationX/Y` which is cumulative from gesture start, not incremental between updates. If the code treats this as incremental, the movement compounds.

2. **Missing initial position tracking**: The resize needs to track where the handle started and calculate the new position relative to that, not add deltas repeatedly.

3. **Double application**: The delta might be applied both in the gesture handler and in the state update, causing amplification.

The fix should ensure:
- Track the initial bounds when resize starts
- On each update, calculate new bounds = initial bounds + translation (not current bounds + delta)
- Only apply 15-minute snapping at gesture end, not during drag
</problem_analysis>

<implementation>

## Step 1: Read and understand current implementation
Read the three key files to understand the current data flow:
- How PlaceholderContainer's resize gestures call callbacks
- How DayView's handlePlaceholderResizeMove processes the delta
- How useDragToCreate's updatePlaceholderBounds applies changes

## Step 2: Fix the resize tracking

The fix should follow this pattern:

```typescript
// In the resize start handler - capture initial state
const handlePlaceholderResizeStart = useCallback((handle: ResizeHandleType) => {
  // Store initial bounds when resize begins
  initialBoundsRef.current = {
    startHour: dragState.startHour,
    startMinutes: dragState.startMinutes,
    endHour: dragState.endHour,
    endMinutes: dragState.endMinutes,
  };
}, [dragState]);

// In the resize move handler - calculate from initial, not current
const handlePlaceholderResizeMove = useCallback((handle: ResizeHandleType, delta: { x: number; y: number }) => {
  if (!initialBoundsRef.current) return;

  // delta.y is CUMULATIVE translation from gesture start
  // Calculate new time from INITIAL bounds + translation
  const minutesDelta = Math.round((delta.y / PIXELS_PER_HOUR) * 60);

  // Don't snap during drag - allow smooth tracking
  // Snapping happens on resize end

  switch (handle) {
    case 'top': {
      const initialStartMinutes = initialBoundsRef.current.startHour * 60 + initialBoundsRef.current.startMinutes;
      const newStartMinutes = initialStartMinutes + minutesDelta;
      // ... calculate and apply
    }
    case 'bottom': {
      const initialEndMinutes = initialBoundsRef.current.endHour * 60 + initialBoundsRef.current.endMinutes;
      const newEndMinutes = initialEndMinutes + minutesDelta;
      // ... calculate and apply
    }
  }
}, [updatePlaceholderBounds]);

// In the resize end handler - apply final snapping
const handlePlaceholderResizeEnd = useCallback((handle: ResizeHandleType) => {
  // Snap to 15-minute increments
  const snappedBounds = snapToGrid(currentBounds);
  updatePlaceholderBounds(snappedBounds);
  initialBoundsRef.current = null;
}, []);
```

## Step 3: Ensure updatePlaceholderBounds replaces (not adds)

In useDragToCreate.ts, verify that `updatePlaceholderBounds` REPLACES the values rather than adding to them:

```typescript
const updatePlaceholderBounds = useCallback((newBounds: Partial<DragState>) => {
  setDragState(prev => ({
    ...prev,
    ...newBounds,  // This should REPLACE, not add
  }));
}, []);
```

</implementation>

<verification>
Test the following scenarios after fixing:

1. **Smooth tracking**: Long-press to create placeholder, lift finger, drag bottom handle down slowly - the bottom edge should follow your finger exactly

2. **Top handle**: Drag top handle up - the top edge should move up with your finger 1:1

3. **No amplification**: Move finger 1 inch, placeholder edge should move ~1 inch (accounting for screen DPI)

4. **Snap on release**: During drag, movement is smooth. On release, snaps to nearest 15-minute increment

5. **Multiple resize operations**: Create placeholder, resize bottom, then resize top - both should work correctly without compounding errors
</verification>

<success_criteria>
- Placeholder resize handles follow finger position exactly during drag
- No amplification or unexpected jumping
- Snapping to 15-minute increments occurs only on gesture end
- Both top and bottom handles work correctly
- Multiple sequential resize operations work without error accumulation
</success_criteria>
