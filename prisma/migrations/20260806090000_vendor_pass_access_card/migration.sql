-- Vendor passes become multi-use access cards with a full entry log.
--
-- `vendor_team_passes` gains entry-cycle bookkeeping (a cycle re-opens when the
-- card is re-scanned after its capacity is used) plus lifetime totals, and the
-- re-entry default flips to UNLIMITED so a vendor QR keeps working all event.
-- `vendor_team_pass_admissions` becomes the entry log: it now records denied
-- attempts, the cycle a scan belongs to, and the channel it came through.

-- AlterTable (entry log columns)
ALTER TABLE "vendor_team_pass_admissions" ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'ADMITTED';
ALTER TABLE "vendor_team_pass_admissions" ADD COLUMN "denialReason" TEXT;
ALTER TABLE "vendor_team_pass_admissions" ADD COLUMN "entryCycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "vendor_team_pass_admissions" ADD COLUMN "channel" TEXT;

-- CreateIndex
CREATE INDEX "vendor_team_pass_admissions_passId_outcome_createdAt_idx" ON "vendor_team_pass_admissions"("passId", "outcome", "createdAt");

-- RedefineTable (adds entry-cycle columns and the UNLIMITED re-entry default)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_vendor_team_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT,
    "passType" TEXT NOT NULL DEFAULT 'VENDOR',
    "passMode" TEXT NOT NULL DEFAULT 'TEAM',
    "entryMode" TEXT NOT NULL DEFAULT 'INDIVIDUAL_ENTRY',
    "title" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "categoryLabel" TEXT,
    "teamCapacity" INTEGER NOT NULL DEFAULT 1,
    "admittedCount" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "reentryPolicy" TEXT NOT NULL DEFAULT 'UNLIMITED',
    "reentryLimit" INTEGER,
    "reentryUsed" INTEGER NOT NULL DEFAULT 0,
    "entryCycle" INTEGER NOT NULL DEFAULT 1,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "totalAdmitted" INTEGER NOT NULL DEFAULT 0,
    "accessZones" TEXT,
    "setupAccess" BOOLEAN NOT NULL DEFAULT false,
    "breakdownAccess" BOOLEAN NOT NULL DEFAULT false,
    "equipmentAccess" BOOLEAN NOT NULL DEFAULT false,
    "vehicleRegistration" TEXT,
    "notes" TEXT,
    "logoUrl" TEXT,
    "photoUrl" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenNonce" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'cvt1',
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "admissionCode" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "firstAdmittedAt" DATETIME,
    "lastAdmittedAt" DATETIME,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendor_team_passes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_team_passes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_vendor_team_passes" ("id", "eventId", "createdById", "passType", "passMode", "entryMode", "title", "vendorName", "contactName", "phone", "email", "companyName", "categoryLabel", "teamCapacity", "admittedCount", "revision", "reentryPolicy", "reentryLimit", "reentryUsed", "accessZones", "setupAccess", "breakdownAccess", "equipmentAccess", "vehicleRegistration", "notes", "logoUrl", "photoUrl", "tokenHash", "tokenNonce", "tokenPrefix", "tokenVersion", "admissionCode", "codeLength", "publicToken", "status", "validFrom", "validUntil", "firstAdmittedAt", "lastAdmittedAt", "revokedAt", "revokedReason", "archivedAt", "createdAt", "updatedAt") SELECT "id", "eventId", "createdById", "passType", "passMode", "entryMode", "title", "vendorName", "contactName", "phone", "email", "companyName", "categoryLabel", "teamCapacity", "admittedCount", "revision", "reentryPolicy", "reentryLimit", "reentryUsed", "accessZones", "setupAccess", "breakdownAccess", "equipmentAccess", "vehicleRegistration", "notes", "logoUrl", "photoUrl", "tokenHash", "tokenNonce", "tokenPrefix", "tokenVersion", "admissionCode", "codeLength", "publicToken", "status", "validFrom", "validUntil", "firstAdmittedAt", "lastAdmittedAt", "revokedAt", "revokedReason", "archivedAt", "createdAt", "updatedAt" FROM "vendor_team_passes";
DROP TABLE "vendor_team_passes";
ALTER TABLE "new_vendor_team_passes" RENAME TO "vendor_team_passes";
CREATE UNIQUE INDEX "vendor_team_passes_tokenHash_key" ON "vendor_team_passes"("tokenHash");
CREATE UNIQUE INDEX "vendor_team_passes_tokenNonce_key" ON "vendor_team_passes"("tokenNonce");
CREATE UNIQUE INDEX "vendor_team_passes_publicToken_key" ON "vendor_team_passes"("publicToken");
CREATE UNIQUE INDEX "vendor_team_passes_eventId_admissionCode_key" ON "vendor_team_passes"("eventId", "admissionCode");
CREATE INDEX "vendor_team_passes_eventId_status_idx" ON "vendor_team_passes"("eventId", "status");
CREATE INDEX "vendor_team_passes_eventId_passType_idx" ON "vendor_team_passes"("eventId", "passType");
CREATE INDEX "vendor_team_passes_publicToken_idx" ON "vendor_team_passes"("publicToken");
CREATE INDEX "vendor_team_passes_tokenPrefix_idx" ON "vendor_team_passes"("tokenPrefix");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Existing vendor passes were issued as access cards in spirit; make them reusable.
UPDATE "vendor_team_passes" SET "reentryPolicy" = 'UNLIMITED' WHERE "reentryPolicy" = 'NONE';

-- Seed lifetime totals from the admissions already recorded.
UPDATE "vendor_team_passes"
SET "totalEntries" = (
        SELECT COUNT(*) FROM "vendor_team_pass_admissions" a
        WHERE a."passId" = "vendor_team_passes"."id" AND a."outcome" = 'ADMITTED'
    ),
    "totalAdmitted" = (
        SELECT COALESCE(SUM(a."quantity"), 0) FROM "vendor_team_pass_admissions" a
        WHERE a."passId" = "vendor_team_passes"."id" AND a."outcome" = 'ADMITTED'
    );
