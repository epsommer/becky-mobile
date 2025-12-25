<objective>
Implement follow-up dashboard for the Becky CRM mobile app.

This feature helps users track and manage client follow-ups, improving client relationship management.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web has FollowUpDashboard and FrequencyScheduler.

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 325-330: Follow-ups & Scheduling items
</context>

<research>
Before implementing, examine:
1. Web FollowUpDashboard component
2. FrequencyScheduler implementation
3. How follow-ups are stored/scheduled
4. API endpoints for follow-ups
5. Calendar integration requirements

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Follow-up List:**
   - Upcoming follow-ups
   - Overdue follow-ups (highlighted)
   - Completed follow-ups
   - Filter by client, date range

2. **Follow-up Creation:**
   - Select client
   - Set follow-up date/time
   - Add notes/reason
   - Set priority
   - Recurring follow-up option

3. **Quick Actions:**
   - Mark complete
   - Reschedule
   - Convert to event
   - Call/message client

4. **Dashboard View:**
   - Today's follow-ups
   - This week overview
   - Overdue count badge
   - Quick add button

5. **Integration:**
   - Tie to notification system (019)
   - Show in calendar if scheduled
   - Link from client profile
</requirements>

<implementation>
Create follow-up feature:
- `./components/screens/FollowUpDashboard.tsx`
- `./services/followups.ts`
- `./hooks/useFollowups.ts`
</implementation>

<output>
Create/modify files:
- `./components/screens/FollowUpDashboard.tsx`
- `./services/followups.ts`
- `./hooks/useFollowups.ts`
- Add to navigation
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 325-330 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Follow-up list displays correctly
2. Can create new follow-up
3. Can mark complete/reschedule
4. Overdue items highlighted
5. Notifications trigger for follow-ups
6. Checklist items updated
</verification>

<success_criteria>
- Follow-up dashboard functional
- CRUD operations work
- Integration with notifications
- Approximately 5 checklist items marked complete
</success_criteria>
