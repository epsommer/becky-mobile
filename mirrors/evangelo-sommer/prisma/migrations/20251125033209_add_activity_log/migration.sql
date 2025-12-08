-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CLIENT_UPDATE', 'NOTE_CREATED', 'TESTIMONIAL_RECEIVED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_UPDATED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'RECEIPT_CREATED', 'INVOICE_CREATED', 'QUOTE_CREATED', 'DEPLOYMENT', 'GIT_PUSH', 'SYSTEM_EVENT', 'TIME_TRACKED');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "clientId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "deploymentInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_idx" ON "ActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_idx" ON "ActivityLog"("entityType");

-- CreateIndex
CREATE INDEX "ActivityLog_clientId_idx" ON "ActivityLog"("clientId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
