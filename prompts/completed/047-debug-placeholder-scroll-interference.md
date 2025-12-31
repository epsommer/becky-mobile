<objective>
Debug and fix scroll event interference in the DayView calendar when placeholder events are active.

The current issue: When a placeholder event exists on the timeline, dragging a finger on the timeline (outside the placeholder) should scroll the timeline. Instead, scrolling is completely blocked and the gesture causes the placeholder to close. The placeholder state should be preserved and scroll with the timeline content.
</objective>

<context>
This is a React Native/Expo mobile app using:
- react-native-gesture-handler (~2.20.2) for gesture handling
- react-native-reanimated (~3.16.1) for animations
- @gorhom/bottom-sheet (^5.2.8) for bottom sheet interactions

Testing environment: Physical Android device via Metro bundler

Key files to examine:
@components/calendar/DayView.tsx - Main day view with ScrollView and placeholder rendering
@components/calendar/PlaceholderContainer.tsx - Placeholder component with gesture handling
@components/calendar/gestures/useDragToCreate.ts - Hook managing drag-to-create gestures

Read CLAUDE.md for project conventions.
</context>

<research>
Before implementing fixes, thoroughly analyze:

1. **Gesture handler hierarchy**: How are gestures composed in DayView? Is there a GestureHandlerRootView wrapping things correctly?

2. **Scroll/Gesture conflict**: What gesture handlers are attached to the ScrollView vs PlaceholderContainer? Are they competing for the same touch events?

3. **simultaneousHandlers vs waitFor**: Are gesture handlers properly configured to allow simultaneous scrolling and placeholder interactions?

4. **Gesture state management**: When placeholder is active, what gesture state prevents scrolling? Is there a `enabled` flag or `activeOffsetX/Y` threshold blocking scroll?

5. **Touch absorption**: Is PlaceholderContainer or its parent absorbing all touch events via `pointerEvents` or similar?
</research>

<debugging_approach>
Use this systematic debugging process:

1. **Add console logs** to track gesture states:
   - Log when scroll gesture begins/ends
   - Log when placeholder gesture handlers activate
   - Log touch coordinates to verify gesture routing

2. **Check gesture handler configuration**:
   - Verify `simultaneousHandlers` refs are properly set up
   - Check if `waitFor` is blocking scroll gesture
   - Examine `activeOffsetX/Y` and `failOffsetX/Y` thresholds

3. **Inspect component hierarchy**:
   - Ensure ScrollView uses `scrollEnabled={true}`
   - Check for `pointerEvents="none"` or `pointerEvents="box-none"` misconfiguration
   - Verify no parent is intercepting touches

4. **Test gesture isolation**:
   - Temporarily disable placeholder gestures to confirm scroll works
   - Add hit slop or gesture boundaries to placeholder
</debugging_approach>

<expected_behavior>
After fix:
- Scrolling timeline works normally when touching areas outside the placeholder
- Placeholder persists during scroll (moves with timeline content)
- Dragging ON the placeholder handles moves/resizes it
- Dragging OUTSIDE the placeholder scrolls the timeline
- Tapping outside placeholder dismisses it (existing behavior to preserve)
</expected_behavior>

<implementation_hints>
Common solutions for this type of gesture conflict:

1. **Use `simultaneousHandlers`**: Allow scroll and placeholder gestures to recognize simultaneously
```tsx
const scrollRef = useRef<ScrollView>(null);
const panRef = useRef<PanGestureHandler>(null);

// On placeholder pan gesture:
simultaneousHandlers={[scrollRef]}

// On ScrollView:
ref={scrollRef}
simultaneousHandlers={[panRef]}
```

2. **Hit testing boundaries**: Only activate placeholder gesture when touch is within placeholder bounds
```tsx
.onStart((event) => {
  const isInsidePlaceholder = checkBounds(event.x, event.y, placeholderBounds);
  if (!isInsidePlaceholder) return; // Let scroll handle it
})
```

3. **Gesture composition with Reanimated v3**:
```tsx
const composed = Gesture.Simultaneous(
  scrollGesture,
  Gesture.Pan().onStart(...).enabled(isTouchingPlaceholder)
);
```

4. **Use `pointerEvents="box-none"`** on placeholder container to allow touches to pass through to scroll when not on interactive elements
</implementation_hints>

<output>
After debugging and fixing:
1. Document findings in the conversation
2. Edit the relevant files to fix the scroll/gesture conflict
3. Verify fix works on physical Android device via Metro bundler
</output>

<verification>
Before declaring complete, verify:
- [ ] Scrolling works when touching timeline outside placeholder
- [ ] Placeholder stays visible and scrolls with content
- [ ] Dragging placeholder handles still moves/resizes correctly
- [ ] Tapping outside placeholder still dismisses it
- [ ] No console errors or gesture conflicts
- [ ] Works on physical Android device
</verification>

<success_criteria>
- Timeline scrolls smoothly when placeholder is active
- Placeholder persists during scroll operations
- All existing placeholder interactions (drag, resize, dismiss) still work
- No regression in gesture handling performance
</success_criteria>
