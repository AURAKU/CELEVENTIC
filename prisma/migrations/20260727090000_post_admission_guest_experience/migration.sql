-- Post-Admission Guest Experience (Phase 1)
-- Additive + feature-flagged. Mirrors exactly what `prisma db push` applied to
-- the SQLite datasource, so `prisma migrate deploy` produces an identical schema.
-- Existing invitations are unaffected until an organiser sets
-- `postAdmissionEnabled = true`.

-- AlterTable: invitation admission projection + portal config
ALTER TABLE "invitations" ADD COLUMN "admissionState" TEXT NOT NULL DEFAULT 'NOT_ADMITTED';
ALTER TABLE "invitations" ADD COLUMN "admittedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invitations" ADD COLUMN "admissionAllowance" INTEGER;
ALTER TABLE "invitations" ADD COLUMN "postAdmissionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invitations" ADD COLUMN "portalTokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invitations" ADD COLUMN "portalConfig" JSONB;

-- CreateTable: append-only admission ledger (never deleted on reset)
CREATE TABLE "admission_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "partyMemberId" TEXT,
    "action" TEXT NOT NULL,
    "admittedQuantity" INTEGER NOT NULL DEFAULT 0,
    "previousAdmittedCount" INTEGER NOT NULL DEFAULT 0,
    "resultingAdmittedCount" INTEGER NOT NULL DEFAULT 0,
    "scannerDeviceId" TEXT,
    "scannerUserId" TEXT,
    "organiserId" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "offlineCreatedAt" DATETIME,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admission_events_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "admission_events_invitationId_createdAt_idx" ON "admission_events"("invitationId", "createdAt");
CREATE INDEX "admission_events_eventId_createdAt_idx" ON "admission_events"("eventId", "createdAt");
