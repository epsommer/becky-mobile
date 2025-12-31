<objective>
Create a unified style system for scheduled events across all calendar views (day, week, month) in the Becky CRM web app. Currently, events appear differently in each view, creating visual inconsistency. The goal is a cohesive design language that adapts appropriately to each view context while maintaining recognizable event styling.
</objective>

<context>
Project: `~/projects/web/evangelo-sommer`
Prerequisite: Read `./research/calendar-ux-patterns.md` for multi-event display patterns

Calendar views to unify:
- **Day View**: Vertical time slots, events displayed as blocks
- **Week View**: 7-day grid with time slots, events as resizable blocks
- **Month View**: Grid of days, events as compact items (draggable but not resizable)

The unified system must support the resize handles being added in the next phase.
</context>

<research>
Before implementing, examine:
1. Existing calendar components in the codebase:
   - `~/projects/web/evangelo-sommer/src/components/calendar/` (all files)
   - Look for existing event rendering patterns
2. Current theming/styling approach (CSS modules, styled-components, Tailwind, etc.)
3. How events are currently styled in each view
4. The research findings in `./research/calendar-ux-patterns.md`
</research>

<requirements>
**Unified Event Component:**
1. Create a base `CalendarEvent` component that adapts to view context
2. Consistent visual properties across views:
   - Color system (category colors, selected state, hover state)
   - Border radius, shadows, typography
   - Truncation behavior for long titles
3. View-specific adaptations:
   - **Day/Week**: Full event details visible, time displayed
   - **Month**: Compact mode, title only, overflow indicator for multiple events

**Multi-Event Overlap Handling:**
Based on research findings, implement:
- Width calculation when events overlap (e.g., 2 events = 50% width each)
- Stacking/positioning logic for overlapping events
- Visual indicators for partial vs full overlap

**Resize Handle Preparation:**
- Event component structure must accommodate resize handles (added in next prompt)
- Include CSS custom properties or classes for handle positioning
- Event box must have relative positioning for absolute handle placement

**Styling Requirements:**
- Support for selected/active event state (for when user is resizing)
- Hover states with visual feedback
- Consistent with existing app theming
- Responsive to container size
</requirements>

<implementation>
1. Analyze existing calendar component structure
2. Create unified event style definitions (colors, spacing, typography)
3. Build base CalendarEvent component with view-context prop
4. Implement multi-event overlap positioning logic
5. Add CSS preparation for resize handles
6. Update DayView, WeekView, MonthView to use unified component

**Patterns to follow:**
- Use existing theming patterns in the codebase
- Keep event logic separate from presentation
- Use CSS custom properties for easy handle positioning later

**Avoid:**
- Hardcoded colors (use theme variables) - because this breaks theme switching
- Inline styles for layout (use proper CSS) - because this hurts maintainability
- Breaking existing functionality - preserve current event interactions
</implementation>

<output>
Create/modify files in `~/projects/web/evangelo-sommer/src/`:

- `components/calendar/CalendarEvent.tsx` - Unified event component
- `components/calendar/CalendarEvent.styles.ts` (or .css/.module.css based on codebase patterns)
- Update `DayView.tsx`, `WeekView.tsx`, `MonthView.tsx` to use unified component
- `utils/calendar/eventOverlap.ts` - Overlap calculation utilities
</output>

<verification>
Before declaring complete, verify:
- [ ] Events render consistently across day, week, and month views
- [ ] Multi-event overlap displays correctly (events share space proportionally)
- [ ] Hover and selected states work
- [ ] Component structure supports future resize handle additions
- [ ] No regressions in existing event display
- [ ] TypeScript compiles without errors
</verification>

<success_criteria>
- Visual consistency: Events are recognizable as the same component across views
- Overlap handling: Multiple events on same time slot display correctly per research patterns
- Extensibility: Component structure ready for resize handles
- No breaking changes to existing functionality
</success_criteria>
