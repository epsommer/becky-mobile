<objective>
Fix placeholder event width shrinking during scroll events in the time-manager timeline.

The placeholder event (created via long-press drag-to-create gesture) is incorrectly losing width when the user scrolls the timeline. The placeholder should maintain 100% width (minus margins) unless there's an overlapping event that requires it to share horizontal space.
</objective>

<context>
This is a React Native + Expo calendar app using react-native-gesture-handler and react-native-reanimated.

Key files involved:
- `components/calendar/PlaceholderContainer.tsx` - The visual placeholder component
- `components/calendar/DayView.tsx` - Day view that renders placeholders in two locations:
  1. Inside the ScrollView during initial drag creation
  2. In a fixed overlay (`fixedPlaceholderWrapper`) during editing mode for scroll-aware positioning

The app is running as a dev APK build on Android.
</context>

<research>
Before implementing a fix, investigate:

1. **Current width calculation logic in PlaceholderContainer**:
   - How `left`, `right`, and `width` props interact in `containerPositionStyle`
   - The base `container` style has `right: 8` hardcoded
   - When `width` is undefined, it relies on `left` (default 56) + `right: 8` to calculate width

2. **Fixed overlay rendering in DayView**:
   - Look at `fixedPlaceholderWrapper` style (lines 1150-1156) - it sets `left: 56` and `right: 8`
   - The placeholder inside uses `top: 0` and dynamic `height`
   - Check if the placeholder's `left` prop conflicts with wrapper positioning

3. **Scroll event handling**:
   - `handleScroll` callback updates `scrollOffset` state on every scroll tick (16ms throttle)
   - This triggers re-renders of `fixedPlaceholderPosition` which recalculates clipping
   - May cause style recalculation that affects width

4. **Animation interference**:
   - `animatedContainerStyle` applies transform scale and opacity
   - Check if animations during scroll are affecting layout
</research>

<requirements>
1. Placeholder events must maintain consistent width (100% of available space minus margins) during scroll
2. Width should only change when there's an overlapping event that requires column sharing
3. The fix must work for both:
   - Initial drag creation (placeholder inside ScrollView)
   - Editing mode (placeholder in fixed overlay wrapper)
4. Do not break existing resize handle functionality
5. Do not break the off-screen indicator that shows when placeholder scrolls out of view
</requirements>

<implementation>
Likely fix approaches (investigate and choose the best):

**Option A: Explicit width calculation**
- Instead of relying on `left` + `right` auto-calculation, compute explicit width
- Pass `width` prop from DayView based on container dimensions

**Option B: Style isolation for fixed overlay**
- The `fixedPlaceholderWrapper` already sets `left` and `right`
- Remove or reset conflicting positioning from PlaceholderContainer when rendered in fixed overlay

**Option C: Use flex layout**
- Change container to use `flex: 1` within a properly sized wrapper
- Avoid absolute positioning width issues

Implementation steps:
1. Add debug logging to identify exactly when/why width changes during scroll
2. Implement the chosen fix
3. Test scroll behavior in editing mode
4. Test initial drag creation (non-editing mode)
5. Test resize handles still work correctly
6. Verify off-screen indicator appears/functions correctly
</implementation>

<verification>
Test the following scenarios on the dev APK:

1. **Long-press to create placeholder** - should have consistent width
2. **Release finger to enter editing mode** - width should remain same
3. **Scroll up/down while placeholder visible** - width should NOT change
4. **Scroll until placeholder partially off-screen** - visible portion should maintain width
5. **Scroll until placeholder completely off-screen** - indicator should appear
6. **Tap indicator to scroll back** - placeholder should reappear with correct width
7. **Resize placeholder using top/bottom handles** - should work correctly
8. **Drag placeholder body to reposition** - should work correctly
</verification>

<success_criteria>
- Placeholder width remains constant during all scroll operations
- No visual "jank" or width fluctuation when scrolling
- All existing placeholder functionality (resize, move, confirm, cancel) works correctly
- Fix applies to both DayView (this prompt) and any other views using PlaceholderContainer
</success_criteria>
