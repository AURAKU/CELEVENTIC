-- CreateTable
CREATE TABLE "guest_import_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT,
    "label" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'PERSONALISED',
    "source" TEXT NOT NULL DEFAULT 'PASTE_LINES',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fileName" TEXT,
    "detectedHeaders" JSONB,
    "columnMapping" JSONB,
    "options" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "readyRows" INTEGER NOT NULL DEFAULT 0,
    "reviewRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "generatedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "generatedHeads" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "rolledBackAt" DATETIME,
    "rollbackReason" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_import_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_import_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guest_import_rows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "rawPhone" TEXT,
    "partyType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "memberNames" JSONB,
    "groupName" TEXT,
    "tableNumber" TEXT,
    "seatLabel" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "decision" TEXT NOT NULL DEFAULT 'CREATE',
    "issues" JSONB,
    "duplicateOfRowIndex" INTEGER,
    "duplicateOfGuestId" TEXT,
    "duplicateOfInvitationId" TEXT,
    "reviewedAt" DATETIME,
    "invitationId" TEXT,
    "guestId" TEXT,
    "guestPassId" TEXT,
    "generatedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_import_rows_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "guest_import_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_import_rows_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guest_import_rows_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "general_pass_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "label" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'FIXED_QUANTITY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "issuedCount" INTEGER NOT NULL DEFAULT 0,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "registrationToken" TEXT,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "maxRegistrations" INTEGER,
    "requireName" BOOLEAN NOT NULL DEFAULT true,
    "requireContact" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" DATETIME,
    "passLabelPrefix" TEXT NOT NULL DEFAULT 'Guest',
    "welcomeMessage" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "general_pass_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "general_pass_batches_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "guest_import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "general_pass_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "general_pass_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "general_pass_registrations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "general_pass_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "general_pass_registrations_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guest_import_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowId" TEXT,
    "invitationId" TEXT,
    "guestId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "recipient" TEXT,
    "guestName" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "provider" TEXT,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_import_deliveries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "guest_import_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_import_deliveries_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "guest_import_rows" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT,
    "groupId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "qrToken" TEXT NOT NULL,
    "manualCode" TEXT,
    "plusOnes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "inviteOpenedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "importBatchId" TEXT,
    "partyType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "archivedAt" DATETIME,
    CONSTRAINT "guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guests_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "guest_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guests_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "guest_import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_guests" ("createdAt", "email", "eventId", "groupId", "id", "invitationId", "inviteOpenedAt", "manualCode", "name", "notes", "phone", "plusOnes", "qrToken", "status", "updatedAt", "userId") SELECT "createdAt", "email", "eventId", "groupId", "id", "invitationId", "inviteOpenedAt", "manualCode", "name", "notes", "phone", "plusOnes", "qrToken", "status", "updatedAt", "userId" FROM "guests";
DROP TABLE "guests";
ALTER TABLE "new_guests" RENAME TO "guests";
CREATE UNIQUE INDEX "guests_qrToken_key" ON "guests"("qrToken");
CREATE INDEX "guests_eventId_idx" ON "guests"("eventId");
CREATE INDEX "guests_status_idx" ON "guests"("status");
CREATE INDEX "guests_importBatchId_idx" ON "guests"("importBatchId");
CREATE UNIQUE INDEX "guests_eventId_manualCode_key" ON "guests"("eventId", "manualCode");
CREATE TABLE "new_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "templateId" TEXT,
    "message" TEXT,
    "designConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "uniqueLink" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "admissionState" TEXT NOT NULL DEFAULT 'NOT_ADMITTED',
    "admittedCount" INTEGER NOT NULL DEFAULT 0,
    "admissionAllowance" INTEGER,
    "postAdmissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalTokenVersion" INTEGER NOT NULL DEFAULT 0,
    "portalConfig" JSONB,
    "featureConfig" JSONB,
    "featureVersion" INTEGER NOT NULL DEFAULT 1,
    "lastMigratedAt" DATETIME,
    "importBatchId" TEXT,
    "generalPassBatchId" TEXT,
    "isGeneralPass" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    CONSTRAINT "invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "event_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitations_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "guest_import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitations_generalPassBatchId_fkey" FOREIGN KEY ("generalPassBatchId") REFERENCES "general_pass_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invitations" ("admissionAllowance", "admissionState", "admittedCount", "createdAt", "designConfig", "eventId", "featureConfig", "featureVersion", "id", "lastMigratedAt", "message", "name", "portalConfig", "portalTokenVersion", "postAdmissionEnabled", "slug", "status", "templateId", "uniqueLink", "updatedAt") SELECT "admissionAllowance", "admissionState", "admittedCount", "createdAt", "designConfig", "eventId", "featureConfig", "featureVersion", "id", "lastMigratedAt", "message", "name", "portalConfig", "portalTokenVersion", "postAdmissionEnabled", "slug", "status", "templateId", "uniqueLink", "updatedAt" FROM "invitations";
DROP TABLE "invitations";
ALTER TABLE "new_invitations" RENAME TO "invitations";
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");
CREATE UNIQUE INDEX "invitations_uniqueLink_key" ON "invitations"("uniqueLink");
CREATE INDEX "invitations_eventId_idx" ON "invitations"("eventId");
CREATE INDEX "invitations_importBatchId_idx" ON "invitations"("importBatchId");
CREATE INDEX "invitations_generalPassBatchId_idx" ON "invitations"("generalPassBatchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "guest_import_batches_eventId_status_idx" ON "guest_import_batches"("eventId", "status");

-- CreateIndex
CREATE INDEX "guest_import_batches_eventId_createdAt_idx" ON "guest_import_batches"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "guest_import_rows_batchId_status_idx" ON "guest_import_rows"("batchId", "status");

-- CreateIndex
CREATE INDEX "guest_import_rows_invitationId_idx" ON "guest_import_rows"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_import_rows_batchId_rowIndex_key" ON "guest_import_rows"("batchId", "rowIndex");

-- CreateIndex
CREATE UNIQUE INDEX "general_pass_batches_registrationToken_key" ON "general_pass_batches"("registrationToken");

-- CreateIndex
CREATE INDEX "general_pass_batches_eventId_status_idx" ON "general_pass_batches"("eventId", "status");

-- CreateIndex
CREATE INDEX "general_pass_registrations_batchId_createdAt_idx" ON "general_pass_registrations"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "general_pass_registrations_batchId_ipHash_idx" ON "general_pass_registrations"("batchId", "ipHash");

-- CreateIndex
CREATE INDEX "guest_import_deliveries_batchId_status_idx" ON "guest_import_deliveries"("batchId", "status");

-- CreateIndex
CREATE INDEX "guest_import_deliveries_status_queuedAt_idx" ON "guest_import_deliveries"("status", "queuedAt");

