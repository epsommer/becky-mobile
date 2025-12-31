<objective>
Implement drag-to-move functionality for placeholder event containers in edit mode. When the user performs a long-hold on the placeholder body (not the resize handles), they should be able to drag the entire placeholder to a new time slot while preserving the event's total duration.

This is a NEW FEATURE - currently only resize handles exist. The entire placeholder should be draggable to reposition it to a different time.
</objective>

<context>
This is the becky-mobile React Native/Expo calendar app. Placeholder events are created via long-hold gesture on the time grid, then enter edit mode for adjustment before confirming.

**Tech stack**: React Native 0.76.9, react-native-gesture-handler ~2.20.2, react-native-reanimated ~3.16.1

**Key files to examine:**
- `./components/calendar/PlaceholderContainer.tsx` - Current resize gesture implementation (lines 134-171)
- `./components/calendar/DayView.tsx` - Placeholder rendering and position calculation (lines 265-270, 612-636)
- `./components/calendar/gestures/useDragToCreate.ts` - State management, `updatePlaceholderBounds` (lines 152-191)

**Current state:**
- PlaceholderContainer has resize gestures for top/bottom/left/right handles
- No gesture exists for dragging the entire body
- The body area currently only contains time display and action buttons (confirm/cancel)
- `isEditing` state is true after initial creation gesture ends
</context>

<research>
Before implementing, thoroughly analyze:
1. How resize gestures are composed in PlaceholderContainer.tsx (createResizeGesture factory)
2. Gesture conflict resolution between body drag and resize handles
3. How to distinguish long-hold on body vs tap on action buttons
4. The updatePlaceholderBounds API for updating start time while preserving duration
5. Haptic feedback patterns used elsewhere in the app
</research>

<requirements>
1. **Long-hold activation**: Drag-to-move requires long-hold (400ms) on placeholder body to activate, preventing accidental moves
2. **Preserve duration**: When moving, the event duration must remain constant - only start/end times shift together
3. **15-minute snapping**: Movement should snap to 15-minute intervals
4. **Visual feedback**:
   - On long-hold recognition: haptic feedback + visual indication (slight scale or opacity change)
   - During drag: smooth tracking with snap-to-grid visual
   - On release: settle to final snapped position
5. **Gesture exclusion zones**:
   - Resize handles should NOT trigger body drag
   - Confirm/cancel buttons should NOT trigger body drag
   - Only the main body area responds to drag gesture
6. **Bounds checking**: Prevent dragging placeholder outside valid time range (e.g., can't start before 00:00 or end after 24:00)
</requirements>

<implementation>
1. **Create body drag gesture** in PlaceholderContainer.tsx:
   - LongPress gesture (400ms) composed with Pan gesture
   - Use `activateAfterLongPress` on Pan for combined gesture
   - Set `hitSlop` negative on resize handle areas to exclude them

2. **Track cumulative translation**:
   - Store initial position on gesture start
   - Convert Y translation to time delta (using PIXELS_PER_HOUR)
   - Apply 15-minute snapping during drag

3. **Update placeholder bounds**:
   - Call new handler (e.g., `onDragMove`) passed from DayView
   - Update both startHour/startMinutes AND recalculate end time to preserve duration
   - Use existing `updatePlaceholderBounds` pattern from useDragToCreate.ts

4. **Add handler in DayView.tsx**:
   - `handlePlaceholderDragMove(delta: { x: number, y: number })`
   - Similar pattern to `handlePlaceholderResizeMove` but shifts both start and end

5. **Gesture composition**:
   - Use `Gesture.Exclusive()` to prioritize: resize handles > body drag > action buttons
   - Or use `simultaneousWithExternalGesture` carefully

6. **Visual states**:
   - `isDraggingBody` state for visual feedback during move
   - Slight elevation/shadow increase during drag
   - Haptic on drag start and on each snap point crossed
</implementation>

<examples>
**Example: Moving a 1-hour event from 10:00-11:00 to 14:00-15:00**

1. User long-holds on placeholder body (not handles, not buttons)
2. After 400ms: haptic pulse, placeholder shows "dragging" visual state
3. User drags down (toward later times)
4. Placeholder follows finger, snapping to 15-min intervals:
   - 10:15, 10:30, 10:45, 11:00... etc
5. Duration stays at 60 minutes throughout
6. User releases at position showing 14:00
7. Placeholder settles at 14:00-15:00 (1 hour duration preserved)

**Gesture exclusion example:**
- Tap on checkmark button → confirms event (no drag)
- Quick tap on body → no response (requires long-hold)
- Long-hold on resize handle → resize gesture activates (not body drag)
- Long-hold on body → body drag activates
</examples>

<output>
Modify/create these files:
- `./components/calendar/PlaceholderContainer.tsx` - Add body drag gesture, visual feedback states
- `./components/calendar/DayView.tsx` - Add `handlePlaceholderDragMove` handler, pass to PlaceholderContainer
- `./components/calendar/gestures/useDragToCreate.ts` - If state update helpers needed
- `./hooks/useResizePlaceholder.ts` - If shared gesture logic can be extracted
</output>

<verification>
Test the following scenarios on device:
1. Create placeholder via long-hold, lift to enter edit mode
2. Quick tap on placeholder body - should do nothing (no accidental moves)
3. Long-hold (400ms) on body - should feel haptic, see visual change
4. Continue holding and drag up/down - placeholder should move smoothly
5. Release - placeholder should be at new time with same duration
6. Verify resize handles still work independently after implementing body drag
7. Verify confirm/cancel buttons still work (not blocked by drag gesture)
8. Try to drag placeholder before 00:00 or after 24:00 - should be prevented
9. Verify haptic feedback occurs on gesture start and at snap points
</verification>

<success_criteria>
- Long-hold on placeholder body initiates drag-to-move
- Placeholder moves smoothly following finger with 15-minute snapping
- Event duration is preserved during move (start and end shift together)
- Resize handles continue to function correctly (no gesture conflicts)
- Action buttons (confirm/cancel) remain tappable
- Haptic feedback provides clear gesture recognition
- Cannot drag placeholder outside valid time bounds
- Visual feedback clearly indicates dragging state
- No performance issues or gesture recognition delays
</success_criteria>
