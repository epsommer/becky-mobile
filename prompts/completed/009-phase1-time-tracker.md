<objective>
Implement time tracker modal for hourly billing in the Becky CRM mobile app.

This is the fourth critical gap from the feature analysis. The app supports hourly billing mode but lacks a time tracking interface - essential for service providers who bill by the hour.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has `TimeTrackerModal` - use as reference.

**Existing Infrastructure:**
- Billing mode toggle exists (fixed/hourly) - Line 64 in checklist
- Receipt creation supports hourly rates
- Client selector available
- Service line selector available

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Line 68: `[ ] Time tracker for hourly billing - Not implemented`
- Line 170: `[ ] Time tracker modal - Not implemented`
</context>

<research>
Before implementing, examine:
1. Web TimeTrackerModal for features and workflow
2. Existing billing/receipt implementation
3. How hourly billing currently works (or is supposed to)
4. Client and service line selectors
5. API endpoints for time entries

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **TimeTrackerModal Component:**
   - Client selector (required)
   - Service line selector
   - Date selector
   - Start time / End time OR Duration input
   - Auto-calculate duration from start/end
   - Description/notes field
   - Billable toggle (yes/no)
   - Hourly rate display (from service line or custom)
   - Calculated amount preview

2. **Timer Functionality:**
   - "Start Timer" button for real-time tracking
   - Running timer display
   - "Stop Timer" to end session
   - Pause/resume capability
   - Background timer support (optional, if feasible)

3. **Time Entry List:**
   - View recent time entries
   - Filter by client, service line, date range
   - Quick actions: edit, delete, convert to receipt
   - Summary totals (hours, amount)

4. **Integration:**
   - Quick access from billing screen
   - Option to add time entry to receipt/invoice
   - Calendar integration (optional): show time entries on calendar

5. **Data Persistence:**
   - Save time entries to API
   - Handle timer state across app lifecycle
   - Recover timer if app closes during tracking
</requirements>

<implementation>
Consider mobile-specific patterns:
- Timer should work in background if possible
- Use native time picker for start/end times
- Consider notifications for running timer
- Touch-friendly interface for quick entries

Create modular structure:
- `./components/modals/TimeTrackerModal.tsx`
- `./hooks/useTimeTracker.ts` - Timer logic and state
- Time entry types/interfaces
</implementation>

<output>
Create/modify files:
- `./components/modals/TimeTrackerModal.tsx` - Main time tracker UI
- `./hooks/useTimeTracker.ts` - Time tracking logic
- Integrate into billing screen
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 68, 170 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Modal displays all required fields
2. Timer starts, stops, and tracks time correctly
3. Manual time entry works
4. Duration calculates from start/end times
5. Time entries save to API
6. Time entry list displays correctly
7. Can convert time entry to receipt line item
8. Checklist updated
</verification>

<success_criteria>
- Time tracker modal fully functional
- Both timer and manual entry modes work
- Time entry list with filtering
- Integration with billing workflow
- Two checklist items marked complete
</success_criteria>
