-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('EVENT', 'TASK', 'GOAL', 'MILESTONE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "GoalTimeframe" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('CLIENT', 'SERVICE_PROVIDER', 'ADMIN', 'TEAM_MEMBER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('LAWN_CARE', 'LANDSCAPING', 'MAINTENANCE', 'SNOW_REMOVAL', 'EMERGENCY', 'CONSULTATION', 'DESIGN', 'INSTALLATION', 'TREE_TRIMMING', 'LAWN_MOWING', 'HEDGE_TRIMMING', 'WEEDING', 'GARDENING_PLANTING', 'GARDENING_SEEDING', 'MULCHING', 'GUTTER_CLEANING', 'DETHATCHING', 'LEAF_REMOVAL', 'PREMIUM_SALTING', 'CALCIUM_MAGNESIUM_MIX', 'SNOW_PLOWING', 'ICE_MANAGEMENT', 'WINTER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ParticipantResponseStatus" AS ENUM ('NEEDS_ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "ParticipantAppointmentRole" AS ENUM ('ORGANIZER', 'ATTENDEE', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONFIRMATION', 'REMINDER_24H', 'REMINDER_1H', 'CANCELLATION', 'RESCHEDULE', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'VOICE_CALL', 'PUSH_NOTIFICATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "VoiceIntent" AS ENUM ('BOOK_APPOINTMENT', 'CHECK_CALENDAR', 'CANCEL_APPOINTMENT', 'RESCHEDULE_APPOINTMENT', 'GET_AVAILABILITY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VoiceCommandStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'REQUIRES_CLARIFICATION');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecurringServiceType" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'SEASONAL');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'EMAIL', 'PHONE', 'IN_PERSON', 'VIDEO_CALL');

-- CreateEnum
CREATE TYPE "CommunicationPurpose" AS ENUM ('SCHEDULING', 'SERVICE_UPDATE', 'BILLING', 'GENERAL', 'COMPLAINT', 'FOLLOWUP', 'QUOTE_REQUEST');

-- CreateEnum
CREATE TYPE "SentimentLevel" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'QUOTE', 'RECEIPT', 'CONTRACT', 'PROPOSAL', 'ESTIMATE', 'STATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'PENDING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConversationSource" AS ENUM ('EMAIL', 'TEXT', 'PHONE', 'MEETING', 'IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('CLIENT', 'YOU', 'AI_DRAFT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('EMAIL', 'TEXT', 'CALL_NOTES', 'MEETING_NOTES', 'VOICE_MEMO', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'APPLE', 'CALDAV');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'SEASONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ServiceContractStatus" AS ENUM ('ONGOING', 'COMPLETED', 'PAUSED', 'CANCELLED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ServiceFrequency" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'SEASONAL', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "FollowUpCategory" AS ENUM ('GENERAL', 'SERVICE_CHECK', 'PAYMENT_FOLLOW_UP', 'MAINTENANCE_REMINDER', 'SEASONAL_PLANNING', 'PROJECT_UPDATE', 'RELATIONSHIP_BUILDING', 'COMPLAINT_RESOLUTION', 'CONTRACT_RENEWAL', 'UPSELL_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "FollowUpNotificationType" AS ENUM ('SCHEDULED', 'REMINDER_7_DAYS', 'REMINDER_24_HOURS', 'REMINDER_1_HOUR', 'COMPLETION_REQUEST', 'MISSED_FOLLOW_UP', 'RESCHEDULE_REQUEST', 'OUTCOME_SUMMARY');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'BILLED', 'PAID', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "BillingRecordStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL_PAYMENT');

-- CreateEnum
CREATE TYPE "ConflictResolutionType" AS ENUM ('ACCEPT', 'DELETE', 'RESCHEDULE', 'OVERRIDE', 'IGNORE');

-- CreateEnum
CREATE TYPE "BillingDocumentType" AS ENUM ('RECEIPT', 'INVOICE', 'QUOTE', 'ESTIMATE');

-- CreateEnum
CREATE TYPE "BillingDocumentStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" "ParticipantRole" NOT NULL DEFAULT 'CLIENT',
    "contactPreferences" JSONB,
    "services" JSONB,
    "bixbyContactId" TEXT,
    "googleContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "service" "ServiceType" NOT NULL,
    "location" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "organizerId" TEXT NOT NULL,
    "googleCalendarEventId" TEXT,
    "outlookCalendarEventId" TEXT,
    "voiceCommandData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentParticipant" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "responseStatus" "ParticipantResponseStatus" NOT NULL DEFAULT 'NEEDS_ACTION',
    "role" "ParticipantAppointmentRole" NOT NULL DEFAULT 'ATTENDEE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "templateUsed" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCommand" (
    "id" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "intent" "VoiceIntent" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "participantName" TEXT,
    "participantPhone" TEXT,
    "service" "ServiceType",
    "requestedDateTime" TIMESTAMP(3),
    "status" "VoiceCommandStatus" NOT NULL DEFAULT 'PROCESSING',
    "appointmentId" TEXT,
    "errorMessage" TEXT,
    "voiceProvider" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDateTime" TEXT NOT NULL,
    "endDateTime" TEXT,
    "duration" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
    "notifications" JSONB,
    "recurrence" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "parentEventId" TEXT,
    "status" TEXT,
    "service" TEXT,
    "scheduledDate" TEXT,
    "goalTimeframe" "GoalTimeframe",
    "progressTarget" DOUBLE PRECISION,
    "currentProgress" DOUBLE PRECISION,
    "deadline" TEXT,
    "dependencies" JSONB,
    "googleCalendarEventId" TEXT,
    "outlookCalendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRecord" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "serviceId" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "tags" JSONB,
    "notes" TEXT,
    "projectType" TEXT,
    "serviceTypes" JSONB,
    "budget" DOUBLE PRECISION,
    "timeline" TEXT,
    "seasonalContract" BOOLEAN NOT NULL DEFAULT false,
    "recurringService" "RecurringServiceType",
    "address" JSONB,
    "metadata" JSONB,
    "contactPreferences" JSONB,
    "personalInfo" JSONB,
    "serviceProfile" JSONB,
    "billingInfo" JSONB,
    "relationshipData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceLineId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceArea" TEXT,
    "completionStatus" "CompletionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "billingAmount" DOUBLE PRECISION,
    "billingDate" TIMESTAMP(3),
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientServiceContract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceLineId" TEXT,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceCategory" TEXT NOT NULL,
    "status" "ServiceContractStatus" NOT NULL DEFAULT 'ONGOING',
    "period" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "contractValue" DOUBLE PRECISION,
    "frequency" "ServiceFrequency",
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "billingDetails" JSONB,
    "seasonalInfo" JSONB,
    "nextScheduled" TIMESTAMP(3),
    "lastCompleted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientServiceContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "participantId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "content" TEXT NOT NULL,
    "purpose" "CommunicationPurpose" NOT NULL,
    "actionItems" JSONB,
    "sentiment" "SentimentLevel" NOT NULL,
    "subject" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "content" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "dueDate" TIMESTAMP(3),
    "sentDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "nextActions" JSONB,
    "sentiment" "SentimentLevel",
    "priority" "PriorityLevel",
    "tags" JSONB,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "ConversationSource",
    "participants" JSONB,
    "relatedDocuments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" "MessageType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "recurrencePattern" "RecurrencePattern" NOT NULL DEFAULT 'NONE',
    "recurrenceData" JSONB,
    "customInterval" INTEGER,
    "customIntervalUnit" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "title" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "actionItems" JSONB,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "category" "FollowUpCategory" NOT NULL DEFAULT 'GENERAL',
    "notificationsSent" JSONB,
    "nextReminderAt" TIMESTAMP(3),
    "googleCalendarEventId" TEXT,
    "outlookCalendarEventId" TEXT,
    "parentFollowUpId" TEXT,
    "sourceAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpNotification" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "type" "FollowUpNotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "templateUsed" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpConfiguration" (
    "id" TEXT NOT NULL,
    "businessHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "businessHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "workingDays" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "defaultReminderDays" JSONB,
    "serviceConfigurations" JSONB,
    "enableSMSReminders" BOOLEAN NOT NULL DEFAULT true,
    "enableEmailReminders" BOOLEAN NOT NULL DEFAULT true,
    "googleCalendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "outlookCalendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarIntegration" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "calendarName" TEXT,
    "calendarEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceLineId" TEXT NOT NULL,
    "serviceRecordId" TEXT,
    "contractId" TEXT,
    "invoiceNumber" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "billingPeriod" TEXT NOT NULL,
    "billingDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictResolution" (
    "id" TEXT NOT NULL,
    "conflictId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "userId" TEXT,
    "resolutionType" "ConflictResolutionType" NOT NULL,
    "affectedEventIds" TEXT NOT NULL,
    "resolutionData" JSONB,
    "conflictMessage" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ConflictResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingDocument" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentType" "BillingDocumentType" NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT,
    "serviceType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "BillingDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'System Administrator',
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Participant_phone_idx" ON "Participant"("phone");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_phone_key" ON "Participant"("phone");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_service_idx" ON "Appointment"("service");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentParticipant_appointmentId_participantId_key" ON "AppointmentParticipant"("appointmentId", "participantId");

-- CreateIndex
CREATE INDEX "NotificationLog_appointmentId_idx" ON "NotificationLog"("appointmentId");

-- CreateIndex
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "VoiceCommand_intent_idx" ON "VoiceCommand"("intent");

-- CreateIndex
CREATE INDEX "VoiceCommand_status_idx" ON "VoiceCommand"("status");

-- CreateIndex
CREATE INDEX "Event_startDateTime_idx" ON "Event"("startDateTime");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_priority_idx" ON "Event"("priority");

-- CreateIndex
CREATE INDEX "Event_clientId_idx" ON "Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_isRecurring_idx" ON "Event"("isRecurring");

-- CreateIndex
CREATE INDEX "Event_parentEventId_idx" ON "Event"("parentEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRecord_participantId_key" ON "ClientRecord"("participantId");

-- CreateIndex
CREATE INDEX "ClientRecord_serviceId_idx" ON "ClientRecord"("serviceId");

-- CreateIndex
CREATE INDEX "ClientRecord_status_idx" ON "ClientRecord"("status");

-- CreateIndex
CREATE INDEX "ServiceRecord_clientId_idx" ON "ServiceRecord"("clientId");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceLineId_idx" ON "ServiceRecord"("serviceLineId");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceType_idx" ON "ServiceRecord"("serviceType");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceDate_idx" ON "ServiceRecord"("serviceDate");

-- CreateIndex
CREATE INDEX "ServiceRecord_billingStatus_idx" ON "ServiceRecord"("billingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLine_slug_key" ON "ServiceLine"("slug");

-- CreateIndex
CREATE INDEX "ServiceLine_slug_idx" ON "ServiceLine"("slug");

-- CreateIndex
CREATE INDEX "ServiceLine_isActive_idx" ON "ServiceLine"("isActive");

-- CreateIndex
CREATE INDEX "ClientServiceContract_clientId_idx" ON "ClientServiceContract"("clientId");

-- CreateIndex
CREATE INDEX "ClientServiceContract_serviceId_idx" ON "ClientServiceContract"("serviceId");

-- CreateIndex
CREATE INDEX "ClientServiceContract_serviceLineId_idx" ON "ClientServiceContract"("serviceLineId");

-- CreateIndex
CREATE INDEX "ClientServiceContract_status_idx" ON "ClientServiceContract"("status");

-- CreateIndex
CREATE INDEX "ClientServiceContract_isActive_idx" ON "ClientServiceContract"("isActive");

-- CreateIndex
CREATE INDEX "Communication_clientId_idx" ON "Communication"("clientId");

-- CreateIndex
CREATE INDEX "Communication_timestamp_idx" ON "Communication"("timestamp");

-- CreateIndex
CREATE INDEX "Communication_purpose_idx" ON "Communication"("purpose");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Conversation_clientId_idx" ON "Conversation"("clientId");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Conversation_priority_idx" ON "Conversation"("priority");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_timestamp_idx" ON "Message"("timestamp");

-- CreateIndex
CREATE INDEX "FollowUp_clientId_idx" ON "FollowUp"("clientId");

-- CreateIndex
CREATE INDEX "FollowUp_scheduledDate_idx" ON "FollowUp"("scheduledDate");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUp_category_idx" ON "FollowUp"("category");

-- CreateIndex
CREATE INDEX "FollowUp_nextReminderAt_idx" ON "FollowUp"("nextReminderAt");

-- CreateIndex
CREATE INDEX "FollowUpNotification_followUpId_idx" ON "FollowUpNotification"("followUpId");

-- CreateIndex
CREATE INDEX "FollowUpNotification_scheduledAt_idx" ON "FollowUpNotification"("scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUpNotification_status_idx" ON "FollowUpNotification"("status");

-- CreateIndex
CREATE INDEX "CalendarIntegration_participantId_idx" ON "CalendarIntegration"("participantId");

-- CreateIndex
CREATE INDEX "CalendarIntegration_isActive_idx" ON "CalendarIntegration"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarIntegration_participantId_provider_key" ON "CalendarIntegration"("participantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_invoiceNumber_key" ON "BillingRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingRecord_clientId_idx" ON "BillingRecord"("clientId");

-- CreateIndex
CREATE INDEX "BillingRecord_serviceLineId_idx" ON "BillingRecord"("serviceLineId");

-- CreateIndex
CREATE INDEX "BillingRecord_status_idx" ON "BillingRecord"("status");

-- CreateIndex
CREATE INDEX "BillingRecord_billingDate_idx" ON "BillingRecord"("billingDate");

-- CreateIndex
CREATE INDEX "BillingRecord_invoiceNumber_idx" ON "BillingRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ConflictResolution_conflictType_idx" ON "ConflictResolution"("conflictType");

-- CreateIndex
CREATE INDEX "ConflictResolution_resolvedAt_idx" ON "ConflictResolution"("resolvedAt");

-- CreateIndex
CREATE INDEX "ConflictResolution_conflictId_resolutionType_idx" ON "ConflictResolution"("conflictId", "resolutionType");

-- CreateIndex
CREATE UNIQUE INDEX "ConflictResolution_conflictId_key" ON "ConflictResolution"("conflictId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingDocument_documentNumber_key" ON "BillingDocument"("documentNumber");

-- CreateIndex
CREATE INDEX "BillingDocument_clientId_idx" ON "BillingDocument"("clientId");

-- CreateIndex
CREATE INDEX "BillingDocument_conversationId_idx" ON "BillingDocument"("conversationId");

-- CreateIndex
CREATE INDEX "BillingDocument_status_idx" ON "BillingDocument"("status");

-- CreateIndex
CREATE INDEX "BillingDocument_documentType_idx" ON "BillingDocument"("documentType");

-- CreateIndex
CREATE INDEX "BillingDocument_date_idx" ON "BillingDocument"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_isActive_idx" ON "AdminUser"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentParticipant" ADD CONSTRAINT "AppointmentParticipant_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentParticipant" ADD CONSTRAINT "AppointmentParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCommand" ADD CONSTRAINT "VoiceCommand_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRecord" ADD CONSTRAINT "ClientRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientServiceContract" ADD CONSTRAINT "ClientServiceContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientServiceContract" ADD CONSTRAINT "ClientServiceContract_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_parentFollowUpId_fkey" FOREIGN KEY ("parentFollowUpId") REFERENCES "FollowUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpNotification" ADD CONSTRAINT "FollowUpNotification_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ClientServiceContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
