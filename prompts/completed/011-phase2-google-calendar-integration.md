<objective>
Implement Google Calendar integration for the Becky CRM mobile app.

This is the first item in Phase 2 (Core Parity). Google Calendar sync is a major productivity feature that allows users to sync their Becky events with their personal/work Google Calendar.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Web Reference:** Web app has full Google Calendar sync with auto-sync on load. Check:
- OAuth flow implementation
- Sync logic
- API endpoints at `/api/calendar/integrations/`

**Existing Infrastructure:**
- Calendar integration manager panel exists (Line 134)
- JWT authentication system in place
- CalendarContext for event management

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 135-141: Multiple Google Calendar items marked `[ ]`
- Lines 204-209: Google Calendar category all `[ ]`
</context>

<research>
Before implementing, examine:
1. Web Google Calendar integration (OAuth, sync, API)
2. Existing CalendarIntegrationManager panel in mobile
3. Expo AuthSession for OAuth on mobile
4. expo-calendar for native calendar access (alternative approach)
5. API endpoints for calendar integrations
6. How web handles token storage and refresh

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **OAuth Authentication Flow:**
   - "Connect Google Calendar" button in settings/integrations
   - OAuth 2.0 flow using Expo AuthSession or similar
   - Handle OAuth redirect back to app
   - Store tokens securely (existing auth patterns)
   - Handle token refresh

2. **Sync Functionality:**
   - Pull events from Google Calendar
   - Push Becky events to Google Calendar
   - Two-way sync with conflict handling
   - Manual sync trigger button
   - Auto-sync on app open (optional, configurable)

3. **Integration UI:**
   - Connection status indicator
   - Last sync timestamp
   - Sync now button
   - Disconnect option
   - Select which Google calendars to sync
   - Visual indicator for Google-sourced events

4. **Event Handling:**
   - Map Google event fields to Becky event fields
   - Handle recurring events from Google
   - Mark events with source (Becky vs Google)
   - Handle updates and deletions bidirectionally

5. **Error Handling:**
   - Handle OAuth failures gracefully
   - Handle sync errors with retry
   - Show sync status/progress
   - Handle rate limiting
</requirements>

<implementation>
Consider mobile-specific approaches:
- Expo AuthSession for OAuth
- expo-calendar for native integration (simpler but different approach)
- Background sync if needed

API integration:
- Use existing `/api/calendar/integrations/` endpoints
- Ensure mobile JWT auth works with these endpoints
- Handle webhook setup for real-time (if supported)

Create modular structure:
- `./services/googleCalendar.ts` - API and OAuth logic
- `./hooks/useGoogleCalendar.ts` - React hook for component use
- Update CalendarIntegrationManager panel
</implementation>

<output>
Create/modify files:
- `./services/googleCalendar.ts` - Google Calendar service
- `./hooks/useGoogleCalendar.ts` - Hook for components
- Update calendar integration panel
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 135-141 from `[ ]` to `[x]` as appropriate
  - Change lines 204-209 from `[ ]` to `[x]` as appropriate
</output>

<verification>
Before completing, verify:
1. OAuth flow completes successfully
2. Events pull from Google Calendar
3. Events push to Google Calendar
4. Manual sync works
5. Connection status displays correctly
6. Disconnect removes tokens and stops sync
7. Error states handled gracefully
8. Checklist items updated
</verification>

<success_criteria>
- Complete OAuth flow for Google Calendar
- Bidirectional sync functional
- UI shows connection and sync status
- Integration follows mobile best practices
- Approximately 6-8 checklist items marked complete
</success_criteria>
