<research_objective>
Thoroughly analyze how the time-manager in ~/projects/web/evangelo-sommer handles recurring events, multiday events, and their corresponding confirmation modals in month view and week view.

This research will inform the React Native implementation of complex event handling with appropriate confirmation dialogs for destructive or cascading actions.
</research_objective>

<scope>
<primary_focus>
1. **Recurring Events**: Events that repeat on a schedule (daily, weekly, monthly, etc.)
2. **Multiday Events**: Events that span across multiple consecutive days
3. **Confirmation Modals**: Dialogs that appear when modifying/deleting these event types
</primary_focus>

<views_to_analyze>
Focus specifically on:
- **Month View**: How recurring and multiday events are displayed and interacted with
- **Week View**: How these event types span across the week grid

Exclude Day View for this research as it has simpler single-day event handling.
</views_to_analyze>

<files_to_examine>
@~/projects/web/evangelo-sommer/src/components/calendar/
@~/projects/web/evangelo-sommer/src/components/events/
@~/projects/web/evangelo-sommer/src/components/modals/
@~/projects/web/evangelo-sommer/src/hooks/useRecurringEvents (or similar)
@~/projects/web/evangelo-sommer/src/types/ (event type definitions)
</files_to_examine>
</scope>

<analysis_requirements>

## 1. Recurring Events

### Data Model
- How are recurring events stored? (RRULE, custom format?)
- Is there a parent event with virtual instances?
- How are exceptions to the recurrence handled?
- What recurrence patterns are supported?
  - Daily, Weekly, Monthly, Yearly
  - Custom intervals
  - End conditions (count, date, forever)

### Display in Month View
- How are recurring events visually distinguished?
- Are all instances shown or just indicators?
- How is overflow handled when many instances exist?
- What icons or badges indicate recurrence?

### Display in Week View
- How do recurring events appear across the week?
- Is there a connecting visual element between instances?
- How is the time slot calculated for each instance?

### Modification Handling
When editing a recurring event, document the options presented:
- "This event only"
- "This and future events"
- "All events in series"
- How is each option implemented?

### Deletion Handling
When deleting a recurring event, document:
- What confirmation options are shown?
- How are exceptions created when deleting single instance?
- How is the entire series deleted?

## 2. Multiday Events

### Data Model
- How are multiday events stored? (start/end dates)
- Is there a special flag or type for multiday?
- How is all-day vs timed multiday distinguished?

### Display in Month View
- How do multiday events span across day cells?
- Visual styling (bar across days, connected blocks?)
- How is overflow in a single day cell handled?
- Ordering/stacking of multiple multiday events

### Display in Week View
- How do multiday events render in the week grid?
- Do they appear in the all-day section at top?
- How do timed multiday events differ from all-day?

### Modification Handling
- Can multiday events be resized by dragging edges?
- What happens when changing start or end date?
- How is duration preserved or recalculated?

## 3. Confirmation Modals

### Recurring Event Modals
Document each modal type:

**Edit Confirmation Modal**
- When does it appear?
- What options are presented?
- How is the user's choice processed?
- UI components and styling

**Delete Confirmation Modal**
- Warning text and messaging
- Options (single, future, all)
- Destructive action styling
- Cancel vs confirm buttons

### Multiday Event Modals
- Are there special confirmations for multiday?
- What validations are performed?
- Error states (end before start, etc.)

### Shared Modal Patterns
- Modal component library used (if any)
- Animation/transition behavior
- Backdrop/overlay styling
- Keyboard accessibility
- Mobile responsiveness of modals
</analysis_requirements>

<tools_and_approach>
Use the Explore subagent to:
- Find all recurring event logic
- Locate multiday event rendering code
- Identify modal components and their triggers
- Find recurrence rule parsing/generation

Use Grep to find:
- `recurring`, `recurrence`, `RRULE` patterns
- `multiday`, `allDay`, `spanning` references
- Modal or dialog component usage
- Confirmation, alert, or prompt patterns
- `deleteEvent`, `updateEvent` with scope parameters
</tools_and_approach>

<output_format>
Create a comprehensive research document saved to:
`./research/web-recurring-multiday-events-analysis.md`

Structure the document as:

```markdown
# Recurring & Multiday Events Analysis

## Overview
[Summary of event complexity handling in the calendar]

## Recurring Events

### Data Model
[Schema, types, storage format]

### Recurrence Patterns Supported
[List of patterns with examples]

### Month View Display
[Rendering approach, visual indicators]

### Week View Display
[Rendering approach, time slot handling]

### Edit Workflow
[User flow with confirmation options]

### Delete Workflow
[User flow with confirmation options]

### Key Code References
[File paths, key functions]

## Multiday Events

### Data Model
[Schema, types, distinguishing factors]

### Month View Display
[Spanning behavior, stacking, overflow]

### Week View Display
[All-day section, grid rendering]

### Modification Workflow
[Resize, drag, date changes]

### Key Code References
[File paths, key functions]

## Confirmation Modals

### Edit Recurring Event Modal
[UI, options, behavior]

### Delete Recurring Event Modal
[UI, options, destructive styling]

### Multiday Event Modals (if any)
[Special validations or confirmations]

### Modal Component Architecture
[Shared patterns, library usage]

### Key Code References
[File paths, modal components]

## React Native Considerations
### Modal Libraries
[react-native modal, react-native-modal options]
### Gesture Handling for Event Modification
[Long press for options, swipe to delete]
### Recurrence Rule Libraries
[rrule.js compatibility, date-fns-rrule]
```
</output_format>

<verification>
Before completing, verify:
- Recurring event data model is fully documented
- All recurrence patterns are identified
- Multiday event spanning logic is understood
- All confirmation modal types are catalogued
- Edit vs delete workflows are clearly distinguished
- Specific code references are included
</verification>

<success_criteria>
- Complete analysis of recurring event handling
- Complete analysis of multiday event display and modification
- All confirmation modals documented with their triggers and options
- Clear understanding of data models and state management
- Research document saved to ./research/web-recurring-multiday-events-analysis.md
</success_criteria>
