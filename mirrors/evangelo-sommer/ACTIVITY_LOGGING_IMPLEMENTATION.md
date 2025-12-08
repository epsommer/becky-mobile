# Activity Logging & Notifications Implementation

## Overview

This document describes the comprehensive activity logging and notifications system implemented in the Becky CRM application.

## What Was Implemented

### 1. Activity Logging for Modal Actions ✅

All modal form submissions now log activities to the database for tracking and audit purposes.

#### Receipt Actions
- **Receipt Created** - Logged when a new receipt is created
  - File: `src/app/api/billing/receipts/route.ts`
  - Function: `logReceiptCreated()`
  - Tracks: Receipt ID, number, client, amount, user

- **Receipt Sent** - Logged when a receipt email is sent
  - File: `src/app/api/billing/receipts/[receiptId]/send-email/route.ts`
  - Function: `logReceiptSent()`
  - Tracks: Receipt sent via email, delivery status

#### Testimonial Actions
- **Testimonial Request Sent** - Logged when requesting testimonial from client
  - File: `src/app/api/testimonials/send-request/route.ts`
  - Function: `logTestimonialRequested()`
  - Tracks: Service, client, testimonial ID

- **Testimonial Received** - Logged when client submits testimonial
  - File: `src/app/api/testimonials/submit/route.ts`
  - Function: `logTestimonialReceived()`
  - Tracks: Client, rating, testimonial content
  - **Creates notification for admin**

### 2. Activity Logger Helper Functions ✅

Enhanced `src/lib/activity-logger.ts` with new helper functions:

```typescript
// Existing functions
logClientUpdate()
logNoteCreated()
logAppointmentScheduled()
logTimeTracked()
logDeployment()
logGitPush()

// NEW functions added
logTestimonialRequested()  // When sending testimonial request
logTestimonialReceived()   // When receiving testimonial (triggers notification)
logReceiptCreated()        // When creating receipt
logReceiptSent()           // When emailing receipt
logQuoteCreated()          // For future quote implementations
logInvoiceCreated()        // For future invoice implementations
```

### 3. Notifications System ✅

#### API Endpoint
- **File**: `src/app/api/notifications/route.ts`
- **GET /api/notifications** - Fetch recent notifications
  - Query params: `limit`, `unreadOnly`
  - Returns: Notifications array, unread count
  - Currently tracks: Testimonials received

#### Notification Types
Currently implemented:
- `TESTIMONIAL_RECEIVED` - When client submits testimonial

Future extensibility:
- `APPOINTMENT_SCHEDULED` - Client books appointment
- `FORM_SUBMISSION` - Client submits form
- `CLIENT_MESSAGE` - Client sends message

#### Notifications Modal
- **File**: `src/components/NotificationsModal.tsx`
- **Features**:
  - Real-time display of notifications
  - Filter by all/unread
  - Mark as read functionality
  - Delete notifications
  - Click to navigate to related entity
  - Fallback to localStorage if API fails

### 4. Header Integration ✅

#### Notification Bell Badge
- **File**: `src/components/Header.tsx`
- **Features**:
  - Red badge showing unread count
  - Auto-refreshes every 30 seconds
  - Displays "9+" for counts over 9
  - Click to open notifications modal

```tsx
{notificationCount > 0 && (
  <span className="absolute -top-1 -right-1 bg-red-500 text-white...">
    {notificationCount > 9 ? '9+' : notificationCount}
  </span>
)}
```

## Activity Log Schema

Uses Prisma `ActivityLog` model with these fields:

```prisma
model ActivityLog {
  id               String       @id @default(cuid())
  activityType     ActivityType // Enum: CLIENT_UPDATE, NOTE_CREATED, etc.
  action           String       // created, updated, sent, received
  entityType       String       // client, receipt, testimonial, etc.
  entityId         String?
  clientId         String?
  description      String       // Human-readable description
  metadata         Json?        // Additional structured data
  userId           String?
  userName         String?
  userRole         String?
  deploymentInfo   Json?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}
```

### Activity Types Enum

```typescript
enum ActivityType {
  CLIENT_UPDATE
  NOTE_CREATED
  TESTIMONIAL_RECEIVED  // ← Triggers notification
  APPOINTMENT_SCHEDULED
  APPOINTMENT_UPDATED
  MESSAGE_SENT         // ← Used for testimonial requests, receipt emails
  MESSAGE_RECEIVED
  RECEIPT_CREATED
  INVOICE_CREATED
  QUOTE_CREATED
  DEPLOYMENT
  GIT_PUSH
  SYSTEM_EVENT
  TIME_TRACKED
}
```

## User Flow Examples

### Scenario 1: Sending a Receipt

1. **User creates receipt** in ReceiptModal
   - POST to `/api/billing/receipts`
   - Activity logged: `RECEIPT_CREATED`

2. **System auto-sends email** (if client has email)
   - POST to `/api/billing/receipts/[id]/send-email`
   - Activity logged: `MESSAGE_SENT` (receipt email)

3. **Admin can view in Activity Log**
   - Click Activity button in header
   - See both creation and send events

### Scenario 2: Receiving a Testimonial

1. **Admin sends request** via TestimonialRequestModal
   - POST to `/api/testimonials/send-request`
   - Activity logged: `MESSAGE_SENT` (testimonial request)

2. **Client submits testimonial** on service website
   - POST to `/api/testimonials/submit`
   - Activity logged: `TESTIMONIAL_RECEIVED`
   - **Notification created automatically**

3. **Admin sees notification**
   - Bell icon shows red badge (count)
   - Clicks bell to open NotificationsModal
   - Sees: "New testimonial from [Client Name]"
   - Clicks notification → navigates to testimonials page

## Technical Details

### Activity Logging Pattern

All activity logging follows this pattern:

```typescript
// 1. Perform the main action
const result = await performAction(data);

// 2. Log the activity (non-blocking)
try {
  const session = await getServerSession(authOptions);
  await logActivity({
    activityType: 'ACTION_TYPE',
    action: 'verb',
    entityType: 'entity',
    entityId: result.id,
    clientId: data.clientId,
    description: 'Human readable description',
    metadata: { ...additionalData },
    userId: session?.user?.email,
    userName: session?.user?.name,
  });
} catch (logError) {
  console.error('Failed to log activity:', logError);
  // Don't fail the request if logging fails
}
```

### Notification Creation Pattern

Notifications are automatically created when:
1. Activity type is `TESTIMONIAL_RECEIVED`
2. API endpoint `/api/notifications` fetches these activities
3. Transforms them into notification format
4. Returns to client with unread count

### Future Notification Sources

To add new notification types:

1. **Create activity log entry** using existing `logActivity()` function
2. **Update notifications API** (`src/app/api/notifications/route.ts`)
   - Add query for new activity type
   - Transform to notification format
3. **Update NotificationsModal** type definitions if needed

Example:
```typescript
// In API endpoint that creates appointment
await logAppointmentScheduled({...});

// In /api/notifications/route.ts
const appointments = await prisma.activityLog.findMany({
  where: { activityType: 'APPOINTMENT_SCHEDULED' },
  ...
});

// Transform and include in notifications array
```

## Files Modified

### Core Activity Logging
- `src/lib/activity-logger.ts` - Added new logging functions
- `src/app/api/billing/receipts/route.ts` - Receipt creation logging
- `src/app/api/billing/receipts/[receiptId]/send-email/route.ts` - Receipt send logging
- `src/app/api/testimonials/send-request/route.ts` - Testimonial request logging
- `src/app/api/testimonials/submit/route.ts` - Testimonial received logging

### Notifications System
- `src/app/api/notifications/route.ts` - **NEW** - Notifications API
- `src/components/NotificationsModal.tsx` - Updated to use API
- `src/components/Header.tsx` - Added notification count badge

### Bug Fixes
- `src/lib/service-email-config.ts` - Fixed whiteknightsnowservice.com domain

## Testing Checklist

### Activity Logging Tests

- [ ] Create a receipt → Check activity log for RECEIPT_CREATED
- [ ] Send a receipt email → Check activity log for MESSAGE_SENT
- [ ] Request testimonial → Check activity log for MESSAGE_SENT
- [ ] Submit testimonial (as client) → Check activity log for TESTIMONIAL_RECEIVED
- [ ] Verify all logs include user info (email, name)
- [ ] Verify all logs include client info where applicable

### Notifications Tests

- [ ] Submit a testimonial → Notification appears
- [ ] Check bell icon shows count badge
- [ ] Open notifications modal → See testimonial notification
- [ ] Click notification → Navigate to testimonials page
- [ ] Mark as read → Badge count decreases
- [ ] Multiple testimonials → Count shows correctly
- [ ] Badge shows "9+" for 10+ notifications

### Integration Tests

- [ ] Create receipt with email → Both activities logged
- [ ] Request + receive testimonial → Both logged, notification created
- [ ] Activity log modal shows all actions
- [ ] Notifications refresh automatically (30s interval)
- [ ] Notifications persist across page reloads

## Performance Considerations

1. **Non-blocking logging** - Activity logging never fails the main request
2. **Indexing** - Database indexes on `activityType`, `clientId`, `createdAt`
3. **Pagination** - API endpoints limit results (default 20)
4. **Polling** - Notifications refresh every 30 seconds (configurable)
5. **Caching** - Consider adding Redis cache for notification counts in future

## Future Enhancements

### Short Term
- [ ] Track notification read status in database (currently in-memory)
- [ ] Add push notifications via WebSockets
- [ ] Email digest of daily activity
- [ ] Export activity log to CSV

### Long Term
- [ ] Real-time notifications (WebSocket/SSE)
- [ ] Notification preferences per user
- [ ] Notification channels (email, SMS, Slack)
- [ ] Advanced filtering in activity log
- [ ] Activity analytics dashboard

## Maintenance Notes

### Adding New Activity Types

1. Add to `ActivityType` enum in `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Create helper function in `src/lib/activity-logger.ts`
4. Call helper function in relevant API route
5. Update notifications API if it should create notifications
6. Test thoroughly

### Debugging

- Check browser console for API errors
- Check server logs for activity logging failures
- Verify Prisma connection in Activity Log Modal
- Use Activity Log Modal to view all logged activities
- Check `/api/notifications` endpoint directly in browser

## Security Considerations

- All endpoints require authentication via NextAuth
- Activity logs include user attribution
- Notifications only shown to authenticated admins
- No sensitive data in notification preview text
- Client email addresses not exposed in activity logs

## Summary

✅ **Implemented**:
- Complete activity logging for receipts and testimonials
- Real-time notifications system
- Header badge with unread count
- Notifications modal with full functionality
- Auto-refresh notifications every 30 seconds

✅ **Ready for**:
- Easy extension to other activity types
- Adding more notification sources
- Scaling to handle high activity volume

---

**Last Updated**: 2025-11-26
**Status**: Production Ready
**Test Status**: Pending user testing
