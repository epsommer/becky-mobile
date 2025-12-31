<research_objective>
Research how Notion Calendar and Google Calendar handle multiple overlapping events on the same day, and determine the most effective drag/resize library for the Becky CRM web app codebase. This research will inform the implementation of calendar event interactions.

Thoroughly explore multiple sources and consider various perspectives to ensure the best UX patterns are identified.
</research_objective>

<context>
Project: Becky CRM web application
Location: `~/projects/web/evangelo-sommer`
Tech stack: Next.js/React (examine package.json to confirm)

This research will directly inform:
- How multiple events are displayed when they overlap
- Which library to use for drag/resize functionality
- UX patterns for event manipulation across day, week, and month views
</context>

<scope>
**Research Areas:**

1. **Notion Calendar Multi-Event Display**
   - How does Notion Calendar display multiple events on the same day?
   - How are overlapping events visually stacked/arranged?
   - What happens when events partially overlap vs fully overlap?
   - How does the width of events change based on overlap count?

2. **Google Calendar Multi-Event Display**
   - How does Google Calendar handle the same scenarios?
   - What visual cues indicate event overlap?
   - How do they handle all-day events vs timed events?

3. **Drag/Resize Library Evaluation**
   - Examine `~/projects/web/evangelo-sommer/package.json` to understand existing dependencies
   - Research these options:
     - **react-dnd**: Mature, widely used, flexible
     - **dnd-kit**: Modern, performant, accessible, modular
     - **Native pointer events**: No dependency, full control
     - **@use-gesture/react**: Gesture-based, works with any renderer
   - Evaluate each against: bundle size, React 18+ compatibility, resize support (not just drag), TypeScript support, community activity

**Sources to consult:**
- Notion Calendar (web version) - observe behavior
- Google Calendar (web version) - observe behavior
- npm registry for library stats
- GitHub repos for library activity
- Library documentation for resize capabilities
</scope>

<deliverables>
Save findings to: `./research/calendar-ux-patterns.md`

Structure the research document as:

```markdown
# Calendar UX Patterns Research

## Multi-Event Display Patterns

### Notion Calendar Approach
[Detailed findings]

### Google Calendar Approach
[Detailed findings]

### Recommended Pattern for Becky CRM
[Synthesis with reasoning]

## Drag/Resize Library Recommendation

### Current Codebase Analysis
[What's already in package.json, existing patterns]

### Library Comparison
| Library | Bundle Size | Resize Support | React 18 | TS | Activity |
|---------|-------------|----------------|----------|----|-----------|
[Comparison table]

### Recommendation
[Clear recommendation with reasoning]

## Implementation Notes
[Key considerations for the implementer]
```
</deliverables>

<evaluation_criteria>
- Specific, observable behaviors documented (not assumptions)
- Library recommendation backed by concrete data points
- Clear reasoning connecting research to Becky CRM's needs
- Actionable implementation notes for the next prompt
</evaluation_criteria>

<verification>
Before completing, verify:
- [ ] Notion Calendar multi-event behavior is documented with specifics
- [ ] Google Calendar multi-event behavior is documented with specifics
- [ ] At least 3 drag/resize libraries compared with concrete metrics
- [ ] Clear recommendation made with supporting rationale
- [ ] Research file saved to `./research/calendar-ux-patterns.md`
</verification>
