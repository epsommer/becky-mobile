<research_objective>
Thoroughly analyze the placeholder container behavior when double-click dragging in the time-manager component of the web application at ~/projects/web/evangelo-sommer.

This research will inform the React Native implementation of a gesture-based calendar event creation system. Understanding the exact behavior across different views is critical for creating an intuitive mobile equivalent.
</research_objective>

<scope>
<primary_focus>
The time-manager component's placeholder container that appears when:
- User double-clicks on an empty time slot
- User begins dragging to select a time range
- User is creating a new event via click-and-drag interaction
</primary_focus>

<views_to_analyze>
Analyze the placeholder container behavior in each view separately:

1. **Day View**: Single day with hourly time slots
   - How does the placeholder appear on double-click?
   - How does dragging extend the placeholder duration?
   - What visual feedback is provided during drag?
   - How are time slot boundaries snapped to?

2. **Week View**: 7-day grid with hourly slots
   - Does the placeholder span across multiple days?
   - How does horizontal vs vertical dragging behave?
   - What happens when dragging crosses midnight?

3. **Month View**: Calendar grid showing all days
   - How does placeholder work without time slots?
   - Is it creating all-day events by default?
   - What dragging behavior exists (multi-day selection)?
</views_to_analyze>

<files_to_examine>
@~/projects/web/evangelo-sommer/src/components/calendar/
@~/projects/web/evangelo-sommer/src/components/TimeManager/
@~/projects/web/evangelo-sommer/src/hooks/ (any drag/interaction hooks)
</files_to_examine>
</scope>

<analysis_requirements>
For each calendar view, document:

1. **Trigger Mechanism**
   - What user action initiates the placeholder?
   - Are there keyboard modifiers involved?
   - What is the initial state of the placeholder?

2. **Drag Behavior**
   - How does the placeholder resize during drag?
   - What constraints exist (min duration, max span)?
   - How is the drag direction detected and handled?

3. **Visual Feedback**
   - Placeholder styling (colors, borders, opacity)
   - Animation or transitions during drag
   - Time/duration display during drag
   - Snap indicators or grid highlights

4. **Completion Handling**
   - What happens on mouseup/drag end?
   - Does a modal or form appear?
   - How is the time range passed to the event creation?

5. **Edge Cases**
   - Dragging outside the calendar bounds
   - Dragging over existing events
   - Very short or very long drag durations
   - Cancellation (Escape key, click elsewhere)
</analysis_requirements>

<tools_and_approach>
Use the Explore subagent to thoroughly search the codebase:
- Search for "placeholder" and "drag" related code
- Examine event handlers for mousedown, mousemove, mouseup
- Look for any custom hooks handling drag state
- Identify CSS/styles for the placeholder container
- Find any context providers managing drag state

Use Grep to find specific patterns:
- `onDoubleClick`, `onMouseDown` handlers in calendar components
- State management for `isDragging`, `dragStart`, `dragEnd`
- Time calculation utilities during drag operations
</tools_and_approach>

<output_format>
Create a comprehensive research document saved to:
`./research/web-placeholder-container-analysis.md`

Structure the document as:

```markdown
# Time Manager Placeholder Container Analysis

## Overview
[Summary of the placeholder system]

## Day View Behavior
### Trigger Mechanism
### Drag Behavior
### Visual Feedback
### Completion Handling
### Edge Cases

## Week View Behavior
### Trigger Mechanism
### Drag Behavior
### Visual Feedback
### Completion Handling
### Edge Cases

## Month View Behavior
### Trigger Mechanism
### Drag Behavior
### Visual Feedback
### Completion Handling
### Edge Cases

## Shared Components & Utilities
[Code that's reused across views]

## State Management
[How drag state is managed - context, hooks, etc.]

## Key Implementation Details
[Critical code patterns that must be replicated]

## React Native Considerations
[Initial thoughts on mobile gesture equivalents]
```
</output_format>

<verification>
Before completing, verify:
- All three views (day, week, month) are thoroughly documented
- Specific file paths and line numbers are referenced
- Code snippets are included for key functionality
- The behavior differences between views are clearly articulated
- Edge cases are identified and documented
</verification>

<success_criteria>
- Complete analysis of placeholder behavior across all three calendar views
- Clear documentation of trigger mechanisms, drag behavior, and visual feedback
- Identification of shared code and utilities
- Initial considerations for React Native gesture handling translation
- Research document saved to ./research/web-placeholder-container-analysis.md
</success_criteria>
