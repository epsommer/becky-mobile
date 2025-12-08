-- CreateEnum
CREATE TYPE "HouseholdType" AS ENUM ('PERSONAL', 'FAMILY', 'BUSINESS', 'ORGANIZATION');

-- AlterTable
ALTER TABLE "ClientRecord" ADD COLUMN     "householdId" TEXT,
ADD COLUMN     "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relationshipRole" TEXT;

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "HouseholdType" NOT NULL DEFAULT 'PERSONAL',
    "address" JSONB,
    "primaryContactId" TEXT,
    "notes" TEXT,
    "tags" JSONB,
    "billingPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Household_primaryContactId_idx" ON "Household"("primaryContactId");

-- CreateIndex
CREATE INDEX "Household_accountType_idx" ON "Household"("accountType");

-- CreateIndex
CREATE INDEX "ClientRecord_householdId_idx" ON "ClientRecord"("householdId");

-- CreateIndex
CREATE INDEX "ClientRecord_isPrimaryContact_idx" ON "ClientRecord"("isPrimaryContact");

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "ClientRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRecord" ADD CONSTRAINT "ClientRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
