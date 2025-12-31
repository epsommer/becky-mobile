<objective>
Fix the resize handle gesture behavior in the calendar placeholder events so that the placeholder follows the user's finger position smoothly and stops exactly where the finger lifts, rather than snapping back to a default 15-minute position.

The current behavior causes visual jank: when resizing via top/bottom handles, the placeholder snaps back to a default position instead of remaining where the user's finger was. The placeholder should resize in 15-minute intervals but track the finger position continuously and stop at the snapped interval closest to where the finger lifted.
</objective>

<context>
This is the becky-mobile React Native/Expo calendar app. The placeholder events are created via long-hold touch gesture in DayView, then enter "edit mode" when the finger lifts, allowing resize via handles.

**Tech stack**: React Native 0.76.9, react-native-gesture-handler ~2.20.2, react-native-reanimated ~3.16.1

**Key files to examine:**
- `./components/calendar/PlaceholderContainer.tsx` - Resize gesture factory (lines 134-171), handle rendering
- `./components/calendar/DayView.tsx` - `handlePlaceholderResizeMove` (lines 147-215), `handlePlaceholderResizeEnd` (lines 217-248)
- `./components/calendar/gestures/useDragToCreate.ts` - `updatePlaceholderBounds` (lines 152-191)

**Current implementation issues identified:**
1. `handlePlaceholderResizeMove` (DayView.tsx:167) converts delta to minutes without real-time visual snapping
2. `handlePlaceholderResizeEnd` (DayView.tsx:228-243) applies 15-min snapping only on gesture end
3. The visual position may not match the snapped end position, causing perceived "snap-back"
</context>

<research>
Before implementing, thoroughly analyze:
1. How `initialPlaceholderBoundsRef` captures the starting bounds (DayView.tsx:135-145)
2. The cumulative translation tracking in `handlePlaceholderResizeMove`
3. Why the visual feedback doesn't match the final snapped position
4. How `updatePlaceholderBounds` in useDragToCreate.ts updates state
</research>

<requirements>
1. **Continuous finger tracking**: Placeholder edge must follow finger position smoothly during resize drag
2. **Real-time 15-minute snapping**: Visual position should snap to nearest 15-minute interval DURING drag, not just at end
3. **No over-extension**: Placeholder must never extend beyond the finger position (top handle shouldn't go below finger, bottom handle shouldn't go above)
4. **Stop where finger lifts**: Final position should be the 15-minute interval closest to where finger lifted, with no additional movement
5. **Minimum duration**: Maintain 15-minute minimum event duration constraint
6. **Performance**: Use reanimated worklets where possible to avoid JS thread blocking
</requirements>

<implementation>
1. Modify `handlePlaceholderResizeMove` to apply 15-minute snapping during the drag, not just tracking raw translation
2. Ensure the snapped position never exceeds the finger's current position
3. Update visual state immediately with snapped values so user sees consistent feedback
4. On gesture end, the position should already be correct - minimal or no adjustment needed
5. Consider using `runOnJS` sparingly to keep gesture handling on native thread

**Key constraint**: The finger position is the MAXIMUM extent - snapping should round TOWARD the original position, not away from the finger.

Example behavior for bottom handle drag DOWN:
- Finger at +45px from start → snapped to +30px (nearest 15min that doesn't exceed finger)
- Finger at +60px from start → snapped to +60px (exactly on 15min boundary)
- Finger at +65px from start → snapped to +60px (nearest 15min below finger)
</implementation>

<output>
Modify these files:
- `./components/calendar/DayView.tsx` - Update resize move/end handlers
- `./components/calendar/PlaceholderContainer.tsx` - If gesture configuration changes needed
- `./components/calendar/gestures/useDragToCreate.ts` - If state update logic needs adjustment
</output>

<verification>
Test the following scenarios on device:
1. Create placeholder via long-hold, lift finger to enter edit mode
2. Drag bottom handle DOWN - should smoothly track finger, snap to 15min intervals, stop exactly at lifted position
3. Drag bottom handle UP - should shrink smoothly, respect 15min minimum
4. Drag top handle UP - should expand upward, snap to 15min, not exceed finger
5. Drag top handle DOWN - should shrink from top, respect minimum
6. Verify no visual "jank" or snap-back on finger lift
</verification>

<success_criteria>
- Resize handles track finger position continuously during drag
- Visual snapping occurs in real-time to 15-minute intervals
- Placeholder never extends beyond the current finger position
- No visible snap-back or position adjustment when finger lifts
- Minimum 15-minute duration is enforced
- Gesture handling remains smooth (60fps) without dropped frames
</success_criteria>
