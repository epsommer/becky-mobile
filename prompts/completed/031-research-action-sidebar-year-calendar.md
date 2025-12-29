<research_objective>
Thoroughly analyze the action sidebar implementation in the time-manager of ~/projects/web/evangelo-sommer, with specific focus on:

1. How the year calendar was moved to the action sidebar
2. How the action sidebar behaves differently in narrow viewport widths
3. The draggable bottom action menu adaptation for minimal widths

This research will inform the React Native implementation of a responsive action system that works well on mobile screens of varying sizes.
</research_objective>

<scope>
<primary_focus>
The action sidebar component that:
- Contains the year calendar navigation
- Provides quick actions or navigation options
- Adapts to narrow viewports with different UI
- Transforms into a draggable bottom sheet on minimal widths
</primary_focus>

<responsive_breakpoints>
Analyze behavior at these viewport conditions:
1. **Wide/Desktop**: Full sidebar visible alongside calendar
2. **Medium/Tablet**: Sidebar may collapse or overlay
3. **Narrow/Mobile**: Sidebar transforms to bottom action menu
</responsive_breakpoints>

<files_to_examine>
@~/projects/web/evangelo-sommer/src/components/TimeManager/
@~/projects/web/evangelo-sommer/src/components/Sidebar/
@~/projects/web/evangelo-sommer/src/components/ActionSidebar/
@~/projects/web/evangelo-sommer/src/components/YearCalendar/
@~/projects/web/evangelo-sommer/src/components/BottomSheet/
@~/projects/web/evangelo-sommer/src/hooks/useMediaQuery (or similar)
</files_to_examine>
</scope>

<analysis_requirements>
Document the following aspects:

## 1. Year Calendar in Action Sidebar
- How is the year calendar rendered within the sidebar?
- What interactions does the year calendar support?
  - Month selection
  - Year navigation
  - Quick jump to specific dates
- How does selecting a date in year view update the main calendar?
- What visual indicators show the current view/selection?

## 2. Action Sidebar Structure
- What actions/features are included in the sidebar?
- How is the sidebar positioned relative to the main calendar?
- What is the sidebar width and how does it affect calendar layout?
- Are there collapsible sections within the sidebar?
- What icons, buttons, or interactive elements exist?

## 3. Responsive Behavior - Narrow View
- At what breakpoint does the sidebar behavior change?
- What happens to the sidebar content on narrow screens?
- Is there a hamburger menu or toggle button?
- How is the calendar layout adjusted when sidebar is hidden?

## 4. Draggable Bottom Action Menu
Document the bottom sheet implementation:
- What triggers the bottom menu to appear?
- What content is moved from sidebar to bottom menu?
- How does the drag-to-expand gesture work?
  - Snap points (collapsed, half, full)
  - Drag handle styling
  - Animation/transition behavior
- How does the bottom sheet overlay the calendar?
- Can the user dismiss the bottom sheet?
- What gestures are supported (swipe down to dismiss, etc.)?

## 5. State Management
- How is the sidebar open/closed state managed?
- How is the bottom sheet position/height managed?
- Is there persistence of user preference (sidebar vs bottom)?
- How does navigation between views affect sidebar state?
</analysis_requirements>

<tools_and_approach>
Use the Explore subagent to:
- Find all sidebar and action-related components
- Identify responsive/media query usage
- Locate bottom sheet or drawer implementations
- Find animation libraries or custom gesture code

Use Grep to find:
- Media query breakpoints
- `useMediaQuery` or responsive hooks
- Drawer, sheet, or overlay components
- Transform or translate CSS for sliding animations
- Touch/gesture event handlers
</tools_and_approach>

<output_format>
Create a comprehensive research document saved to:
`./research/web-action-sidebar-analysis.md`

Structure the document as:

```markdown
# Action Sidebar & Year Calendar Analysis

## Overview
[Summary of the sidebar system and its responsive adaptations]

## Year Calendar Component
### Structure and Layout
### Interactions and Navigation
### Integration with Main Calendar
### Key Code References

## Action Sidebar (Wide View)
### Layout and Positioning
### Available Actions/Features
### Sidebar State Management
### Key Code References

## Narrow View Adaptations
### Breakpoint Definitions
### Layout Changes
### Toggle/Access Mechanism
### Key Code References

## Bottom Action Menu (Minimal Width)
### Trigger and Appearance
### Content Mapping from Sidebar
### Drag Gesture Implementation
### Snap Points and Animation
### Dismissal Behavior
### Key Code References

## State Management Architecture
[How all these states are coordinated]

## Animation and Transition Details
[Specific animation implementations]

## React Native Considerations
### Bottom Sheet Libraries
[react-native-bottom-sheet, react-native-gesture-handler considerations]
### Gesture Handler Integration
[PanGestureHandler, GestureDetector patterns]
### Responsive Breakpoints in RN
[useWindowDimensions, Dimensions API]
```
</output_format>

<verification>
Before completing, verify:
- All responsive breakpoints are documented with specific pixel values
- Drag gesture behavior is fully captured
- Bottom sheet snap points and animations are documented
- Year calendar interactions are completely catalogued
- Specific file paths and key code snippets are included
</verification>

<success_criteria>
- Complete analysis of action sidebar across all viewport sizes
- Year calendar functionality documented
- Bottom sheet/draggable menu behavior thoroughly analyzed
- Clear mapping of web functionality to potential RN implementations
- Research document saved to ./research/web-action-sidebar-analysis.md
</success_criteria>
