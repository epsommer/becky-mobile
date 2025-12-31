<objective>
Integrate the calendar event resize functionality with the database and external calendar sync (mobile app and Google Calendar). When a user finishes resizing an event, the changes must persist to the database and synchronize across all connected calendars without errors.
</objective>

<context>
Project: `~/projects/web/evangelo-sommer`
Prerequisites: Resize mechanics from prompt 003 must be complete

This is the final integration step that makes resize changes persistent. Without this, resize is purely visual with no data persistence.

**Integration Points:**
1. Local database (update event start/end times)
2. Becky mobile app (React Native) - calendar sync
3. Google Calendar API - bidirectional sync
</context>

<research>
Before implementing:
1. Examine existing event update API endpoints in the codebase
2. Understand current Google Calendar sync implementation
3. Find how mobile app syncs with web app (shared API, real-time, etc.)
4. Review error handling patterns for API calls
5. Check for optimistic update patterns already in use
</research>

<requirements>
**Database Update:**
1. On resize END (not during drag), update event in database
2. Use optimistic updates: UI reflects change immediately, rollback on error
3. Only send changed fields (start_time, end_time, possibly duration)
4. Handle concurrent edit conflicts gracefully

**Sync Flow:**
```
User resizes event
    ↓
Update local state (immediate)
    ↓
API call to update database
    ↓
Trigger sync to Google Calendar
    ↓
Mobile app receives update (via shared backend)
    ↓
Confirm success or rollback
```

**Error Handling:**
- Network failure: Show toast, allow retry, revert visual state
- Validation error: Show specific message (e.g., "Event overlaps with another")
- Sync failure (Google): Update locally, queue for retry, notify user
- Conflict: Show conflict resolution UI or last-write-wins

**User Feedback:**
- Loading indicator during save (subtle, non-blocking)
- Success confirmation (brief toast or visual feedback)
- Error messages that explain what went wrong and how to fix
</requirements>

<implementation>
**Steps:**
1. Create/update event mutation hook with optimistic updates
2. Implement API endpoint for event time updates (if not exists)
3. Add Google Calendar sync trigger after successful database update
4. Implement error handling with rollback capability
5. Add user feedback (toasts/notifications)
6. Test sync to mobile app

**Integration with Resize:**
Modify `useEventResize.ts` to call update on resize end:
```typescript
const onResizeEnd = async (eventId: string, newBounds: EventBounds) => {
  // Optimistic update already applied during resize
  try {
    await updateEvent({
      id: eventId,
      startTime: newBounds.start,
      endTime: newBounds.end
    });
    // Sync triggers automatically via backend
  } catch (error) {
    // Rollback to original bounds
    revertEvent(eventId, originalBounds);
    showError(error.message);
  }
};
```

**API Patterns:**
- Use existing API client/fetch wrapper in codebase
- Follow existing error handling patterns
- Match existing response formats

**Avoid:**
- Multiple API calls for single resize (batch if needed) - because it's inefficient
- Blocking UI during sync - because it hurts UX
- Silent failures - because users need to know if their changes didn't save
</implementation>

<output>
Create/modify files in `~/projects/web/evangelo-sommer/src/`:

New/Modified:
- `hooks/useEventResize.ts` - Add persistence on resize end
- `hooks/useEventMutation.ts` - Optimistic update logic (if not exists)
- `api/events.ts` or similar - Update endpoint integration
- `services/googleCalendarSync.ts` - Sync trigger (if not exists)
- `components/ui/Toast.tsx` or similar - User feedback (if not exists)

API (if modifications needed):
- `app/api/events/[id]/route.ts` - PATCH endpoint for event updates
</output>

<verification>
Before declaring complete, test the full flow:
- [ ] Resize event → database is updated with new times
- [ ] Check database directly to confirm persistence
- [ ] Google Calendar reflects the change (may take a moment)
- [ ] Mobile app shows updated event times
- [ ] Disconnect network → resize → error shown → visual state reverts
- [ ] Rapid resizes don't create race conditions
- [ ] No duplicate API calls for single resize
- [ ] TypeScript compiles without errors
- [ ] No console errors during sync
</verification>

<success_criteria>
- Resize changes persist to database correctly
- Google Calendar syncs without error
- Mobile app receives updates
- Errors are handled gracefully with user feedback
- Optimistic updates provide responsive UX
- No data inconsistencies between platforms
</success_criteria>
