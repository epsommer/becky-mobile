<objective>
Implement recurring event delete options modal for the Becky CRM mobile app (React Native/Expo).

This is the first critical gap identified in the feature gap analysis. Users currently cannot properly manage recurring events - when deleting a recurring event, they need options to delete "this event only", "this and future events", or "all events in series".
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic (see existing components in `components/`)

**Web Reference:** The web app at `/Users/epsommer/projects/web/evangelo-sommer` has this functionality implemented. Use it as a reference for the expected behavior and API contracts.

**Existing Infrastructure:**
- Event modal exists at `components/modals/` or similar
- CalendarContext at `context/CalendarContext.tsx` handles event state
- API calls use JWT authentication (already implemented)
- Neomorphic UI components are available for consistent styling

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 144: `[ ] Recurring delete confirmation with options (this only, this and future, all) - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web implementation of recurring event deletion (search for "recurring" in web components)
2. Existing event modal structure in mobile app
3. CalendarContext event management methods
4. API endpoint for event deletion (check if it supports recurring options)
5. Existing confirmation modals for patterns to follow

For maximum efficiency, perform multiple file reads and searches simultaneously.
</research>

<requirements>
1. **RecurringDeleteModal Component:**
   - Create a new modal component following neomorphic design
   - Three options with clear descriptions:
     - "Delete this event only" - Removes single occurrence
     - "Delete this and future events" - Removes from selected date forward
     - "Delete all events in series" - Removes entire recurring series
   - Cancel button to dismiss
   - Loading state during deletion
   - Error handling with user-friendly messages

2. **Integration:**
   - Hook into existing event deletion flow
   - Only show modal when event has recurrence rule (check for `recurrenceRule` or similar)
   - For non-recurring events, use existing delete flow

3. **API Integration:**
   - Determine if API supports recurring delete options
   - If not, document what API changes are needed (create ticket/note)
   - Handle API response appropriately

4. **State Management:**
   - Update CalendarContext if needed
   - Ensure calendar view refreshes after deletion
   - Handle optimistic updates if pattern exists
</requirements>

<implementation>
Follow existing patterns in the codebase:
- Use neomorphic components (NeomorphicButton, NeomorphicCard, etc.)
- Follow modal patterns from existing modals
- Match TypeScript conventions used in project
- Use existing theme context for colors/styling

Place new files in appropriate locations:
- Modal component: `./components/modals/RecurringDeleteModal.tsx`
- Types if needed: Add to existing types file or create new
</implementation>

<output>
Create/modify files:
- `./components/modals/RecurringDeleteModal.tsx` - New modal component
- Integrate with existing event deletion flow (modify relevant files)
- Update `./analyses/feature-gap-checklist.md`:
  - Change line 144 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Modal renders correctly with all three options
2. Each option triggers appropriate API call (or documents needed API changes)
3. Calendar refreshes after deletion
4. Non-recurring events bypass the modal
5. Error states are handled gracefully
6. Checklist has been updated
</verification>

<success_criteria>
- RecurringDeleteModal component created and functional
- Integrated into event deletion workflow
- Follows neomorphic design system
- Handles all three deletion scenarios
- Feature gap checklist updated to mark this item complete
</success_criteria>
