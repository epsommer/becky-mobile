<objective>
Implement the gesture-based event creation system for the React Native calendar, including placeholder container behavior for day view, week view, and month view.

This implementation is based on:
- Research findings from ./research/web-placeholder-container-analysis.md
- Implementation plan from ./analyses/rn-calendar-implementation-plan.md
</objective>

<context>
Read the implementation plan before starting:
@./analyses/rn-calendar-implementation-plan.md

Reference existing calendar components:
@./components/calendar/
@./components/screens/TimeManagerScreen.tsx
@./context/CalendarContext.tsx
</context>

<requirements>

## 1. Gesture Handler Setup

Install and configure required dependencies as specified in the implementation plan.

Ensure proper setup in app entry point for gesture handler.

## 2. Placeholder Container Component

Create a reusable placeholder container component:

### Location
`./components/calendar/PlaceholderContainer.tsx`

### Props Interface
```typescript
interface PlaceholderContainerProps {
  visible: boolean;
  startTime: Date;
  endTime: Date;
  onComplete: (start: Date, end: Date) => void;
  onCancel: () => void;
  viewType: 'day' | 'week' | 'month';
}
```

### Behavior
- Animate appearance when visible
- Display time range during drag
- Provide haptic feedback at snap points
- Handle drag gestures for resizing

## 3. Day View Drag-to-Create

Implement in `./components/calendar/DayView.tsx` (or create if needed):

### Trigger
- Long press (500ms) on empty time slot initiates creation
- Show placeholder at touch position

### Drag Behavior
- Vertical drag extends/shrinks duration
- Snap to 15-minute increments
- Minimum duration: 15 minutes
- Maximum duration: 12 hours

### Visual Feedback
- Placeholder with semi-transparent background
- Display start time and end time
- Duration indicator (e.g., "1h 30m")
- Highlight current snap position

### Completion
- Release gesture to confirm
- Call onComplete with final time range
- Animate placeholder to event modal

## 4. Week View Drag-to-Create

Implement in `./components/calendar/WeekView.tsx`:

### Trigger
- Long press on empty time slot

### Drag Behavior
- Vertical drag for duration
- Horizontal drag to change day (optional)
- Snap to 15-minute increments
- Respect day boundaries

### Cross-Day Handling
- If dragged horizontally, allow changing the event day
- Do not allow spanning multiple days in week view time grid
- Multi-day events should be created in all-day section

### Visual Feedback
- Same as day view
- Highlight column (day) being affected

## 5. Month View Drag-to-Create

Implement in `./components/calendar/MonthView.tsx`:

### Trigger
- Long press on day cell

### Drag Behavior
- Horizontal/diagonal drag to select date range
- Create multi-day event spanning selected days
- Single tap creates single-day event

### Multi-Day Selection
- Highlight all days in selection
- Show date range indicator
- Minimum: 1 day, Maximum: 14 days

### Visual Feedback
- Highlight selected day range
- Show "Apr 5 - Apr 8" style indicator
- All-day event visual treatment

## 6. Gesture State Management

### Context Extension
Extend CalendarContext (or create GestureContext):

```typescript
interface GestureState {
  isDragging: boolean;
  dragViewType: 'day' | 'week' | 'month' | null;
  placeholderStart: Date | null;
  placeholderEnd: Date | null;
}

interface GestureActions {
  startDrag: (viewType: string, start: Date) => void;
  updateDrag: (end: Date) => void;
  completeDrag: () => void;
  cancelDrag: () => void;
}
```

### State Updates
- Use Reanimated shared values for smooth updates
- Debounce haptic feedback
- Optimize re-renders with useMemo/useCallback

## 7. Haptic Feedback

Integrate expo-haptics for tactile feedback:

- Light impact when crossing time slot boundary
- Medium impact when drag starts
- Success notification on completion
- Warning if approaching limits

## 8. Animation

Use Reanimated for smooth animations:

- Placeholder appearance: fade + scale
- Drag updates: translate + height changes
- Completion: morph into event card or expand to modal

</requirements>

<implementation_steps>
1. Install dependencies (gesture-handler, reanimated if needed)
2. Create PlaceholderContainer component
3. Create gesture hooks (useDragToCreate)
4. Implement DayView drag gestures
5. Implement WeekView drag gestures
6. Implement MonthView drag gestures
7. Add haptic feedback integration
8. Add gesture state to context
9. Test all three views
10. Handle edge cases and polish animations
</implementation_steps>

<constraints>
- Must work with Expo SDK 52
- No native module linking required
- Gestures must not conflict with scrolling
- Performance target: 60fps during drag
- Support both iOS and Android
</constraints>

<output>
Files to create/modify:

Create:
- `./components/calendar/PlaceholderContainer.tsx`
- `./components/calendar/gestures/useDragToCreate.ts`
- `./components/calendar/gestures/index.ts`

Modify:
- `./components/calendar/DayView.tsx` (add gesture handling)
- `./components/calendar/WeekView.tsx` (add gesture handling)
- `./components/calendar/MonthView.tsx` (add gesture handling)
- `./context/CalendarContext.tsx` (add gesture state if needed)
</output>

<verification>
Before declaring complete:
1. Test long-press initiates placeholder in all views
2. Test drag updates placeholder correctly
3. Test time snapping works (15-minute increments)
4. Test haptic feedback triggers appropriately
5. Test gesture completion opens event creation
6. Test gesture cancellation clears placeholder
7. Verify no gesture conflicts with scroll
8. Test on both iOS simulator and Android emulator
</verification>

<success_criteria>
- All three calendar views support drag-to-create
- Placeholder container animates smoothly
- Time snapping works correctly
- Haptic feedback enhances UX
- No performance issues during drag
- Clean integration with existing calendar code
</success_criteria>
