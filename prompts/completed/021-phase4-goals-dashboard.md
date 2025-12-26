<objective>
Implement full goals dashboard and tracking for the Becky CRM mobile app.

This Phase 4 feature expands the existing goals widget into a comprehensive goal management system.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Existing Infrastructure:**
- Goals widget exists (Line 318)
- Basic goal display may be present

**Web Reference:** Web has GoalTimeline, GoalDashboard, MissionObjectives.

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 318-324: Goals & Objectives items
</context>

<research>
Before implementing, examine:
1. Web goal components
2. Existing goals widget in mobile
3. API endpoints for goals
4. Goal data model
5. useGoals hook (if exists in web)

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Goal Dashboard:**
   - List all goals with progress
   - Filter by status (active, completed, archived)
   - Sort by priority, deadline, progress

2. **Goal Creation:**
   - Title and description
   - Target metric (revenue, clients, etc.)
   - Target value and current value
   - Start date and deadline
   - Milestones/checkpoints

3. **Goal Tracking:**
   - Progress bar visualization
   - Update progress manually or auto-calculated
   - Milestone completion tracking
   - Celebrate achievements

4. **Goal Timeline:**
   - Visual timeline of goals
   - Show overlapping goals
   - Historical view

5. **Mission/Objectives:**
   - High-level mission statement
   - Break into objectives
   - Link goals to objectives
</requirements>

<implementation>
Create comprehensive goal system:
- `./components/screens/GoalsDashboard.tsx`
- `./components/goals/` - Goal components
- `./services/goals.ts`
- `./hooks/useGoals.ts`
</implementation>

<output>
Create/modify files:
- `./components/screens/GoalsDashboard.tsx`
- Goal components as needed
- `./services/goals.ts`
- `./hooks/useGoals.ts`
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 318-324 from `[ ]`/`[x]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Goal dashboard displays
2. Can create new goals
3. Progress tracking works
4. Timeline visualization works
5. Goals filter and sort
6. Checklist items updated
</verification>

<success_criteria>
- Full goal management system
- Visual progress tracking
- Approximately 5-6 checklist items marked complete
</success_criteria>
