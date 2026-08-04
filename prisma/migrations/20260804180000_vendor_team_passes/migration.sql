-- CreateTable
CREATE TABLE "vendor_team_passes" (
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
    "reentryPolicy" TEXT NOT NULL DEFAULT 'NONE',
    "reentryLimit" INTEGER,
    "reentryUsed" INTEGER NOT NULL DEFAULT 0,
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

-- CreateTable
CREATE TABLE "vendor_team_pass_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "admitted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_team_pass_members_passId_fkey" FOREIGN KEY ("passId") REFERENCES "vendor_team_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vendor_team_pass_admissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL,
    "scannedById" TEXT,
    "gate" TEXT,
    "deviceInfo" TEXT,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "clientRecordId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_team_pass_admissions_passId_fkey" FOREIGN KEY ("passId") REFERENCES "vendor_team_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_team_passes_tokenHash_key" ON "vendor_team_passes"("tokenHash");
CREATE UNIQUE INDEX "vendor_team_passes_tokenNonce_key" ON "vendor_team_passes"("tokenNonce");
CREATE UNIQUE INDEX "vendor_team_passes_publicToken_key" ON "vendor_team_passes"("publicToken");
CREATE UNIQUE INDEX "vendor_team_passes_eventId_admissionCode_key" ON "vendor_team_passes"("eventId", "admissionCode");
CREATE INDEX "vendor_team_passes_eventId_status_idx" ON "vendor_team_passes"("eventId", "status");
CREATE INDEX "vendor_team_passes_eventId_passType_idx" ON "vendor_team_passes"("eventId", "passType");
CREATE INDEX "vendor_team_passes_publicToken_idx" ON "vendor_team_passes"("publicToken");
CREATE INDEX "vendor_team_passes_tokenPrefix_idx" ON "vendor_team_passes"("tokenPrefix");
CREATE INDEX "vendor_team_pass_members_passId_idx" ON "vendor_team_pass_members"("passId");
CREATE UNIQUE INDEX "vendor_team_pass_admissions_clientRecordId_key" ON "vendor_team_pass_admissions"("clientRecordId");
CREATE INDEX "vendor_team_pass_admissions_passId_createdAt_idx" ON "vendor_team_pass_admissions"("passId", "createdAt");
CREATE INDEX "vendor_team_pass_admissions_eventId_createdAt_idx" ON "vendor_team_pass_admissions"("eventId", "createdAt");
