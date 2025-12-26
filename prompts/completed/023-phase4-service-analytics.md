<objective>
Implement service line analytics for the Becky CRM mobile app.

This Phase 4 feature provides performance insights for each service line.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Existing Infrastructure:**
- Analytics dashboard exists (from 015)
- Service lines are tracked throughout the app

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 305: `[ ] Service line performance - Not implemented`
</context>

<research>
Before implementing, examine:
1. How analytics dashboard was built (015)
2. Service line data model
3. API endpoints for service analytics
4. Revenue/client data by service line
5. Chart components already in use

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Service Line Overview:**
   - List all service lines with metrics
   - Revenue per service
   - Client count per service
   - Growth trends

2. **Service Detail View:**
   - Revenue breakdown (by period)
   - Top clients for service
   - Testimonials for service
   - Time tracked (if time tracker used)

3. **Comparison:**
   - Compare service performance
   - Side-by-side charts
   - Ranking by revenue/clients

4. **Visualizations:**
   - Pie chart of revenue distribution
   - Bar chart comparing services
   - Trend lines per service
</requirements>

<implementation>
Extend analytics dashboard:
- Add service analytics tab/section
- Create service detail modal or screen
- Reuse chart components from 015
</implementation>

<output>
Create/modify files:
- `./components/analytics/ServiceAnalytics.tsx`
- Integrate into analytics dashboard
- Update `./analyses/feature-gap-checklist.md`:
  - Change line 305 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Service list with metrics displays
2. Service detail shows breakdown
3. Charts render correctly
4. Data is accurate
5. Checklist item updated
</verification>

<success_criteria>
- Service analytics functional
- Integrated into main analytics
- One checklist item marked complete
</success_criteria>
