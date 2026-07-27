-- Guest Entry Pass (QR Admission)
-- Fully additive. Existing events keep their current gate behaviour until an
-- organiser sets `qrAdmissionEnabled = true` on event_admission_settings, and
-- every new column on existing tables is nullable or defaulted so no backfill
-- is required before deploy.

-- CreateTable: per-event admission policy
CREATE TABLE "event_admission_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "qrAdmissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "qrRequiredForEntry" BOOLEAN NOT NULL DEFAULT true,
    "manualCodeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "manualCodeLength" INTEGER NOT NULL DEFAULT 4,
    "offlineAdmissionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayPassOnInvitation" BOOLEAN NOT NULL DEFAULT true,
    "allowPassDownload" BOOLEAN NOT NULL DEFAULT true,
    "allowPassPrint" BOOLEAN NOT NULL DEFAULT true,
    "showPartySizeOnPass" BOOLEAN NOT NULL DEFAULT true,
    "showTableOnPass" BOOLEAN NOT NULL DEFAULT false,
    "showSeatOnPass" BOOLEAN NOT NULL DEFAULT false,
    "hideSeatingUntilAdmitted" BOOLEAN NOT NULL DEFAULT true,
    "passInstructions" TEXT,
    "allowPartialArrival" BOOLEAN NOT NULL DEFAULT true,
    "allowSeparateArrival" BOOLEAN NOT NULL DEFAULT true,
    "allowReEntry" BOOLEAN NOT NULL DEFAULT false,
    "reEntryWindowMinutes" INTEGER,
    "requireScannerConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "fastAdmissionMode" BOOLEAN NOT NULL DEFAULT false,
    "requireOperatorAuth" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "validityLeadHours" INTEGER NOT NULL DEFAULT 12,
    "validityTrailHours" INTEGER NOT NULL DEFAULT 12,
    "offlinePackageTtlMinutes" INTEGER NOT NULL DEFAULT 720,
    "manualCodeAttemptLimit" INTEGER NOT NULL DEFAULT 10,
    "manualCodeAttemptWindowSeconds" INTEGER NOT NULL DEFAULT 300,
    "duplicatePolicy" TEXT NOT NULL DEFAULT 'BLOCK',
    "portalUnlockPolicy" TEXT NOT NULL DEFAULT 'ON_FIRST_ADMISSION',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_admission_settings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "event_admission_settings_eventId_key" ON "event_admission_settings"("eventId");

-- CreateTable: one signed pass per invitation
CREATE TABLE "guest_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "groupId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenNonce" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "admittedCount" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstAdmittedAt" DATETIME,
    "lastAdmittedAt" DATETIME,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "reissuedFromId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_passes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_passes_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "guest_passes_tokenHash_key" ON "guest_passes"("tokenHash");
CREATE UNIQUE INDEX "guest_passes_tokenNonce_key" ON "guest_passes"("tokenNonce");
CREATE UNIQUE INDEX "guest_passes_eventId_code_key" ON "guest_passes"("eventId", "code");
CREATE UNIQUE INDEX "guest_passes_invitationId_tokenVersion_key" ON "guest_passes"("invitationId", "tokenVersion");
CREATE INDEX "guest_passes_eventId_status_idx" ON "guest_passes"("eventId", "status");
CREATE INDEX "guest_passes_invitationId_status_idx" ON "guest_passes"("invitationId", "status");
CREATE INDEX "guest_passes_tokenPrefix_idx" ON "guest_passes"("tokenPrefix");

-- AlterTable: link scans to the pass they resolved to
ALTER TABLE "qr_scans" ADD COLUMN "guestPassId" TEXT REFERENCES "guest_passes" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "qr_scans_guestPassId_idx" ON "qr_scans"("guestPassId");

-- AlterTable: offline records gain pass linkage, idempotency, and conflict state
ALTER TABLE "offline_checkins" ADD COLUMN "guestPassId" TEXT REFERENCES "guest_passes" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offline_checkins" ADD COLUMN "clientRecordId" TEXT;
ALTER TABLE "offline_checkins" ADD COLUMN "admittedQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "offline_checkins" ADD COLUMN "conflict" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "offline_checkins" ADD COLUMN "conflictReason" TEXT;
ALTER TABLE "offline_checkins" ADD COLUMN "usedManualCode" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "offline_checkins_clientRecordId_key" ON "offline_checkins"("clientRecordId");
CREATE INDEX "offline_checkins_guestPassId_idx" ON "offline_checkins"("guestPassId");
