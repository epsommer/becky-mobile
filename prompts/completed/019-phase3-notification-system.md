<objective>
Implement push notification system for the Becky CRM mobile app.

This feature enables users to receive reminders, alerts, and updates via push notifications.
</objective>

<context>
**Project:** Becky CRM Mobile App
**Location:** `/Users/epsommer/projects/apps/becky-mobile`
**Tech Stack:** React Native, Expo, TypeScript
**Design System:** Neomorphic

**Feature Gap Checklist:** `./analyses/feature-gap-checklist.md`
- Lines 150: `[ ] Notifications/reminders - Not implemented`
- Lines 240-245: Notification Preferences items
</context>

<research>
Before implementing, examine:
1. Expo Notifications API
2. Push notification service options (Expo Push, FCM, APNs)
3. How web handles notifications
4. Event reminder requirements
5. Existing notification preferences panel

For maximum efficiency, perform multiple searches simultaneously.
</research>

<requirements>
1. **Notification Types:**
   - Event reminders (15min, 1hr, 1 day before)
   - New client signup
   - Receipt/invoice paid
   - Testimonial received
   - Follow-up reminders

2. **Expo Push Setup:**
   - Request permissions
   - Get push token
   - Register with backend
   - Handle incoming notifications

3. **Local Notifications:**
   - Schedule event reminders locally
   - Handle when app is closed

4. **Notification Handling:**
   - Tap notification to open relevant screen
   - Badge count management
   - Clear notifications on read

5. **Preferences:**
   - Toggle each notification type
   - Quiet hours setting
   - Reminder timing preferences

6. **Backend Integration:**
   - Send push token to API
   - Handle notification payload format
</requirements>

<implementation>
Use Expo Notifications:
- expo-notifications for handling
- expo-device for device info
- Configure for both iOS and Android

Create notification service:
- `./services/notifications.ts`
- `./hooks/useNotifications.ts`
</implementation>

<output>
Create/modify files:
- `./services/notifications.ts` - Notification service
- `./hooks/useNotifications.ts` - Notification hook
- Update App.tsx or entry point for notification handling
- Update settings screen with notification preferences
- Update `./analyses/feature-gap-checklist.md`:
  - Change lines 150, 240-245 from `[ ]` to `[x]`
</output>

<verification>
Before completing, verify:
1. Permission request works
2. Push token generated
3. Can receive test notification
4. Tap notification navigates correctly
5. Local reminders schedule correctly
6. Preferences save and apply
7. Checklist items updated
</verification>

<success_criteria>
- Push notifications functional
- Local reminders work
- Notification preferences configurable
- Approximately 6 checklist items marked complete
</success_criteria>
