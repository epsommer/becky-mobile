-- CreateTable
CREATE TABLE "StudioProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sceneData" JSONB NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioProject_userId_idx" ON "StudioProject"("userId");

-- CreateIndex
CREATE INDEX "StudioProject_createdAt_idx" ON "StudioProject"("createdAt");

-- CreateIndex
CREATE INDEX "StudioAsset_userId_idx" ON "StudioAsset"("userId");

-- CreateIndex
CREATE INDEX "StudioAsset_type_idx" ON "StudioAsset"("type");

-- CreateIndex
CREATE INDEX "StudioAsset_createdAt_idx" ON "StudioAsset"("createdAt");

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAsset" ADD CONSTRAINT "StudioAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
