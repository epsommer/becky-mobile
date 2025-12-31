<objective>
Fix the bug where the placeholder event container disappears when the user scrolls the DayView canvas outside the bounds of the placeholder while in edit mode. The placeholder should remain visible and accessible regardless of scroll position.

Currently, when in edit mode (after creating a placeholder via long-hold and lifting finger), if the user scrolls the time grid such that the placeholder moves out of the visible viewport, it disappears entirely. The placeholder should persist and become visible again when scrolled back into view.
</objective>

<context>
This is the becky-mobile React Native/Expo calendar app. The DayView uses a ScrollView for the time grid, and placeholder events are positioned absolutely within it.

**Tech stack**: React Native 0.76.9, react-native-gesture-handler ~2.20.2, react-native-reanimated ~3.16.1

**Key files to examine:**
- `./components/calendar/DayView.tsx` - ScrollView configuration (line 558), scroll enable logic (lines 272-275), placeholder rendering (lines 612-636)
- `./components/calendar/PlaceholderContainer.tsx` - Component rendering and visibility

**Current behavior analysis:**
1. DayView.tsx line 272-275: `isInteracting` includes `isCreating` but editing mode allows scroll
2. DayView.tsx line 558: ScrollView clips content outside visible bounds
3. Placeholder uses `position: 'absolute'` relative to the time grid container
4. When scrolled completely out of viewport, placeholder becomes invisible (ScrollView clipping)
5. The dragState persists - this is NOT a state loss issue, but a rendering/visibility issue

**Root cause**: ScrollView's default clipping behavior hides content positioned outside the visible area. The placeholder is absolutely positioned within the scrollable content, so it scrolls with the grid but gets clipped when outside bounds.
</context>

<research>
Before implementing, thoroughly analyze:
1. How the ScrollView is configured in DayView.tsx
2. The placeholder's absolute positioning relative to grid container
3. Whether `overflow: 'visible'` or similar can help
4. Alternative approaches: fixed positioning outside ScrollView, portal rendering
5. How existing calendar apps handle this (event stays visible during scroll)
</research>

<requirements>
1. **Placeholder persistence**: Placeholder must never visually disappear while in edit mode, regardless of scroll position
2. **Scroll allowed in edit mode**: User should still be able to scroll to view different times while editing (current behavior - keep this)
3. **Placeholder interaction**: Resize handles must remain functional even if placeholder is partially scrolled
4. **Visual feedback**: If placeholder scrolls out of view, provide some indication of where it is (optional: scroll-to-placeholder button or edge indicator)
5. **State preservation**: dragState must remain intact through all scroll operations
</requirements>

<implementation>
Consider these approaches (choose the most appropriate):

**Option A: Prevent clipping**
- Set `overflow: 'visible'` on relevant containers
- May require restructuring the view hierarchy

**Option B: Fixed overlay positioning**
- Render placeholder in a fixed overlay outside ScrollView
- Calculate position based on scroll offset + placeholder time position
- More complex but ensures placeholder is always visible

**Option C: Scroll containment**
- Limit scroll range when in edit mode to keep placeholder partially visible
- Simpler but restricts user freedom

**Option D: Edge indicator + scroll-to button**
- Allow placeholder to scroll out of view
- Show indicator at edge of screen pointing to placeholder location
- Provide button to auto-scroll back to placeholder

**Recommended approach**: Start with Option A (simplest), fall back to Option B if needed.

**Important**: Ensure that tap-outside-to-dismiss still works correctly - tapping on the time grid outside the placeholder bounds should still cancel the placeholder (if this behavior exists).
</implementation>

<output>
Modify these files:
- `./components/calendar/DayView.tsx` - ScrollView configuration, placeholder rendering location
- `./components/calendar/PlaceholderContainer.tsx` - If positioning changes needed
- Potentially create new component for scroll-aware placeholder wrapper
</output>

<verification>
Test the following scenarios on device:
1. Create placeholder via long-hold at 10:00 AM, lift to enter edit mode
2. Scroll DOWN to view 6:00 PM area - placeholder should remain visible or have indicator
3. Scroll UP to view 6:00 AM area - placeholder should remain visible or have indicator
4. If using edge indicator: tap indicator should scroll back to placeholder
5. Resize handles should work when placeholder is partially visible at edge
6. Tap outside placeholder bounds should still dismiss/cancel it (if this is expected behavior)
7. Confirm button tap should create the event correctly
</verification>

<success_criteria>
- Placeholder never completely disappears while in edit mode
- User can scroll freely while placeholder is being edited
- Resize handles remain functional regardless of scroll position
- If placeholder scrolls out of view, there is clear visual indication of its location
- All existing placeholder functionality (confirm, cancel, resize) continues to work
- No performance degradation from the fix
</success_criteria>
