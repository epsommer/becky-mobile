<objective>
Implement event conflict detection and resolution UI for the Becky CRM mobile app.

This is the second critical gap from the feature analysis. Users currently receive no warning when creating events that overlap with existing events, leading to double-bookings.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** The web app has `ConflictResolutionModal` - use as reference for expected behavior.

**Existing Infrastructure:**
- CalendarContext manages events
- Event creation/editing modal exists
- Drag-drop implementation may need conflict highlighting

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 112: `[ ] Event conflicts detection - Not implemented`
- Line 113: `[ ] Event conflict resolution UI - Not implemented`
- Line 124: `[ ] Conflict highlighting during drag - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web ConflictResolutionModal implementation
2. Existing event creation/editing flow in mobile
3. How events are stored and queried in CalendarContext
4. Drag-drop implementation for conflict highlighting integration
5. Existing modal patterns

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Conflict Detection Logic:**
   - Create utility function to detect overlapping events
   - Check for conflicts when:
     - Creating new event
     - Editing event time/date
     - Dragging event to new time slot
   - Consider event duration, not just start time

2. **ConflictWarningModal Component:**
   - Show when conflict detected
   - Display conflicting events with details (title, time, client)
   - Options:
     - "Create Anyway" - Proceed despite conflict
     - "Adjust Time" - Return to edit time
     - "Cancel" - Abort creation
   - Visual hierarchy showing severity

3. **Drag Conflict Highlighting:**
   - When dragging event, highlight time slots that would cause conflicts
   - Use distinct color (e.g., red overlay) for conflicting zones
   - Real-time update as user drags

4. **Integration Points:**
   - Event creation modal - check before save
   - Event edit modal - check before save
   - Drag handlers - visual feedback during drag
</requirements>

<implementation>
Create modular, reusable components:
- Conflict detection utility in `./utils/` or `./lib/`
- ConflictWarningModal in `./components/modals/`
- Integrate with existing event forms and drag handlers

Follow existing patterns:
- Neomorphic styling
- TypeScript with proper types
- Existing modal/sheet patterns
</implementation>

<output>
Create/modify files:
- `./utils/eventConflicts.ts` - Conflict detection utilities
- `./components/modals/ConflictWarningModal.tsx` - Warning modal
- Modify event creation/editing components to integrate conflict check
- Modify drag handlers to show conflict highlighting
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 112, 113, 124 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Conflicts detected for overlapping events
2. Modal shows with correct information
3. All three modal options work correctly
4. Drag highlighting shows conflict zones
5. No false positives (adjacent events shouldn't conflict)
6. Checklist updated for all three items
</verification>

<success_criteria>
- Conflict detection utility working and tested
- ConflictWarningModal displays conflicts clearly
- Integrated into event creation and editing flows
- Drag conflict highlighting functional
- Three checklist items marked complete
</success_criteria>
