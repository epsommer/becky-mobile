<objective>
Create a comprehensive implementation plan for converting the web calendar's drag, gesture, and interaction patterns to React Native, based on the research completed in prompts 030-032.

This planning phase will determine the correct React Native equivalents, libraries, and architecture for implementing:
1. Placeholder container drag-to-create functionality
2. Action sidebar with bottom sheet adaptation
3. Recurring/multiday event handling with confirmation modals
</objective>

<context>
This prompt should be run AFTER the research prompts (030, 031, 032) have been completed and their outputs exist in ./research/.

Read the following research documents before planning:
@./research/web-placeholder-container-analysis.md
@./research/web-action-sidebar-analysis.md
@./research/web-recurring-multiday-events-analysis.md
</context>

<planning_requirements>

## 1. Gesture Library Selection

Evaluate and select the appropriate gesture handling approach:

### Options to Consider
- **react-native-gesture-handler**: Industry standard, powerful
- **Built-in PanResponder**: No extra dependency, less features
- **Reanimated + Gesture Handler**: Smooth animations, complex gestures

### Decision Criteria
- Compatibility with Expo SDK 52
- Performance for continuous drag updates
- Support for simultaneous gestures
- Integration with existing calendar components

### Document
- Selected library with justification
- Any additional dependencies needed
- Integration approach with existing code

## 2. Placeholder Container Implementation Strategy

Based on research from prompt 030, plan the mobile equivalent:

### Touch Gesture Mapping
Map web interactions to mobile gestures:
| Web Interaction | Mobile Equivalent |
|-----------------|-------------------|
| Double-click | Long press? Double tap? |
| Click-and-drag | Pan gesture after trigger |
| Mouseup | Gesture end |

### View-Specific Considerations

**Day View**
- How to initiate event creation on time slot
- Vertical drag for duration selection
- Haptic feedback for time slot snaps

**Week View**
- Horizontal vs vertical pan handling
- Cross-day event creation
- Grid snap behavior

**Month View**
- Day cell selection behavior
- Multi-day range selection
- All-day vs timed event distinction

### Component Architecture
- Placeholder component structure
- State management for drag operation
- Animation strategy (Reanimated vs Animated API)

## 3. Bottom Sheet Implementation Strategy

Based on research from prompt 031, plan the mobile sidebar/bottom sheet:

### Library Selection
Evaluate bottom sheet options:
- **@gorhom/bottom-sheet**: Most popular, customizable
- **react-native-bottom-sheet-behavior**: Native feel
- **Custom implementation**: Using gesture handler + reanimated

### Snap Points Strategy
- Define snap points (collapsed, half, full)
- Backdrop behavior at each snap point
- Gesture velocity thresholds

### Content Migration
- What content moves from sidebar to bottom sheet
- Year calendar placement and behavior
- Quick action buttons positioning

### Integration with Calendar
- How bottom sheet coexists with calendar gestures
- Preventing gesture conflicts
- State coordination between sheet and calendar

## 4. Recurring/Multiday Event Implementation Strategy

Based on research from prompt 032, plan event handling:

### Data Model Alignment
- How to match web's recurrence data model
- Any mobile-specific adaptations needed
- Sync considerations with backend

### Display Components
- Recurring event indicator component
- Multiday event spanning component
- Stacking/overflow handling in month view

### Confirmation Modal Strategy
- Modal component selection (built-in, react-native-modal)
- Edit confirmation modal implementation
- Delete confirmation modal implementation
- Modal animation and backdrop

### Gesture Triggers
- Long press for context menu
- Swipe actions for quick delete
- Tap for event details

## 5. Integration Architecture

### State Management
- How calendar state integrates with gesture state
- Context providers needed
- Performance optimization (memo, callbacks)

### Animation Performance
- Identify animations needing native driver
- Reanimated worklet usage
- Frame rate targets and testing

### Accessibility
- VoiceOver/TalkBack support for gestures
- Alternative interaction methods
- Accessibility labels for modals
</planning_requirements>

<deliverables>
Create a detailed implementation plan saved to:
`./analyses/rn-calendar-implementation-plan.md`

Structure the document as:

```markdown
# React Native Calendar Implementation Plan

## Executive Summary
[High-level approach and key decisions]

## Library Dependencies
### Selected Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| ... | ... | ... |

### Installation Commands
```bash
# Required installations
```

## Phase 1: Gesture Foundation
### Setup Steps
### Component Architecture
### File Structure

## Phase 2: Placeholder Container
### Day View Implementation
### Week View Implementation
### Month View Implementation
### Shared Components

## Phase 3: Bottom Sheet Action Menu
### Component Structure
### Snap Point Configuration
### Content Layout
### Gesture Conflict Prevention

## Phase 4: Recurring/Multiday Events
### Data Model
### Display Components
### Confirmation Modals
### Gesture Interactions

## Phase 5: Integration & Testing
### State Management Integration
### Performance Testing
### Accessibility Audit

## File Structure
```
components/
  calendar/
    gestures/
    placeholder/
    bottom-sheet/
    modals/
```

## Risk Assessment
[Potential challenges and mitigations]

## Success Metrics
[How to verify implementation success]
```
</deliverables>

<validation>
Before completing the plan:
- Verify all selected libraries are compatible with Expo SDK 52
- Ensure gesture patterns are mobile-native (not web ports)
- Confirm no conflicts between gesture handlers
- Validate accessibility considerations are included
- Check that plan references specific research findings
</validation>

<success_criteria>
- Comprehensive implementation plan covering all features
- Clear library selections with justifications
- Detailed component architecture
- Phase-by-phase implementation steps
- Risk assessment with mitigations
- Plan saved to ./analyses/rn-calendar-implementation-plan.md
</success_criteria>
