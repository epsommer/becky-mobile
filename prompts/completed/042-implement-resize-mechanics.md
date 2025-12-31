<objective>
Implement resize mechanics for calendar events in the Becky CRM web app. Events should be resizable with smooth, direct mouse-following behavior. The resize interaction should feel responsive and professional, matching the quality of Notion Calendar and Google Calendar.
</objective>

<context>
Project: `~/projects/web/evangelo-sommer`
Prerequisites:
- Read `./research/calendar-ux-patterns.md` for library recommendation
- Unified event component from prompt 002 must be complete

**Resize Requirements by View:**
- **Day View**: Resize handles on TOP and BOTTOM edges only (vertical resize)
- **Week View**: Resize handles on ALL FOUR CORNERS and ALL FOUR EDGES (full resize capability)
- **Month View**: NO resize (events are draggable to different days only)
</context>

<research>
Before implementing:
1. Review the library recommendation in `./research/calendar-ux-patterns.md`
2. Examine existing calendar components for current interaction patterns
3. Understand how event times are stored and updated
4. Check for existing drag/drop implementations to maintain consistency
</research>

<requirements>
**Resize Handle UI:**
1. Handles appear on hover or when event is selected
2. Visual indicators (cursor change, handle visibility) show resize affordance
3. Handle hit areas should be generous (at least 8px) for easy grabbing

**Day View Resize (Vertical Only):**
- TOP handle: Adjusts event start time
- BOTTOM handle: Adjusts event end time
- Resize snaps to time grid (e.g., 15-minute increments)

**Week View Resize (Full):**
- CORNER handles: Resize diagonally (both time and day)
- TOP/BOTTOM edges: Adjust start/end time (same as day view)
- LEFT/RIGHT edges: Extend event across multiple days
- All resizes snap to appropriate grid (time or day)

**Mouse-Following Behavior:**
- Event box MUST scale and move corresponding DIRECTLY to user mouse position
- No lag between mouse movement and visual feedback
- Use requestAnimationFrame for smooth updates
- Show live preview of new time during resize
- Display time tooltip showing current start/end time while resizing

**Constraints:**
- Minimum event duration (e.g., 15 minutes)
- Events cannot resize beyond calendar bounds
- Events cannot have negative duration (start before end)
</requirements>

<implementation>
**Install recommended library** from research (if not native implementation):
```bash
# Example - use actual recommendation from research
npm install [recommended-library]
```

**Implementation Steps:**
1. Create resize handle components with appropriate cursor styles
2. Implement resize state management (isResizing, resizeDirection, originalBounds)
3. Add mouse/pointer event handlers for resize interactions
4. Calculate new event bounds based on mouse position + grid snapping
5. Implement live preview (visual feedback during resize)
6. Add time tooltip component showing current times during resize
7. Integrate with DayView and WeekView components
8. Ensure MonthView has NO resize capability (drag only)

**Technical Patterns:**
- Use pointer events (not mouse events) for better touch support
- Implement throttling/debouncing for performance
- Use CSS transforms for preview (not actual DOM changes) during resize
- Only update actual event data on resize END

**Code Structure:**
```
components/calendar/
  ├── ResizeHandle.tsx        # Reusable handle component
  ├── useEventResize.ts       # Resize logic hook
  ├── ResizePreview.tsx       # Live preview overlay
  └── TimeTooltip.tsx         # Shows time during resize
```

**Avoid:**
- Direct DOM manipulation (use React state) - because React won't track changes
- Updating database during resize drag (only on end) - because it's expensive and creates race conditions
- Hardcoded pixel values for time calculations - because different views have different scales
</implementation>

<output>
Create/modify files in `~/projects/web/evangelo-sommer/src/`:

New files:
- `components/calendar/ResizeHandle.tsx`
- `components/calendar/ResizePreview.tsx`
- `components/calendar/TimeTooltip.tsx`
- `hooks/useEventResize.ts`
- `utils/calendar/resizeCalculations.ts`

Modified files:
- `components/calendar/CalendarEvent.tsx` - Add resize handles
- `components/calendar/DayView.tsx` - Integrate resize (top/bottom only)
- `components/calendar/WeekView.tsx` - Integrate resize (all edges/corners)
- `package.json` - Add library if needed
</output>

<verification>
Before declaring complete, manually test:
- [ ] Day view: Can resize events from top and bottom edges
- [ ] Week view: Can resize events from all 4 corners
- [ ] Week view: Can resize events from all 4 edges
- [ ] Mouse following: Event scales smoothly and directly follows cursor
- [ ] Grid snapping: Times snap to 15-minute (or configured) increments
- [ ] Time tooltip: Shows current start/end time while resizing
- [ ] Month view: Events are NOT resizable (only draggable)
- [ ] Minimum duration: Cannot resize below minimum
- [ ] No console errors during resize operations
- [ ] TypeScript compiles without errors
</verification>

<success_criteria>
- Smooth, lag-free resize experience matching Notion/Google Calendar quality
- Correct resize directions per view (day=vertical, week=all)
- Mouse position directly corresponds to event bounds
- Grid snapping works correctly
- No resize capability in month view
</success_criteria>
