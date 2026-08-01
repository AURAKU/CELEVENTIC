-- Event QR & Pass Hub (SQLite)

CREATE TABLE IF NOT EXISTS "event_qr_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heading" TEXT,
    "footerText" TEXT,
    "destinationUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "designJson" TEXT,
    "metadata" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_qr_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_qr_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_qr_links_publicToken_key" ON "event_qr_links"("publicToken");
CREATE UNIQUE INDEX IF NOT EXISTS "event_qr_links_eventId_type_title_key" ON "event_qr_links"("eventId", "type", "title");
CREATE INDEX IF NOT EXISTS "event_qr_links_eventId_type_status_idx" ON "event_qr_links"("eventId", "type", "status");

CREATE TABLE IF NOT EXISTS "shared_event_access_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VENDOR_GENERAL',
    "displayName" TEXT NOT NULL DEFAULT 'Vendor Access',
    "tokenHash" TEXT NOT NULL,
    "tokenNonce" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'cvs1',
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "manualCode" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reusable" BOOLEAN NOT NULL DEFAULT 1,
    "allowedGates" TEXT,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shared_event_access_passes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shared_event_access_passes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "shared_event_access_passes_tokenHash_key" ON "shared_event_access_passes"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "shared_event_access_passes_eventId_type_tokenVersion_key" ON "shared_event_access_passes"("eventId", "type", "tokenVersion");
CREATE UNIQUE INDEX IF NOT EXISTS "shared_event_access_passes_eventId_manualCode_key" ON "shared_event_access_passes"("eventId", "manualCode");
CREATE INDEX IF NOT EXISTS "shared_event_access_passes_eventId_status_idx" ON "shared_event_access_passes"("eventId", "status");

CREATE TABLE IF NOT EXISTS "shared_access_pass_print_variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "roleHeading" TEXT NOT NULL,
    "companyName" TEXT,
    "accentColor" TEXT,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shared_access_pass_print_variants_passId_fkey" FOREIGN KEY ("passId") REFERENCES "shared_event_access_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "shared_access_pass_print_variants_passId_roleKey_key" ON "shared_access_pass_print_variants"("passId", "roleKey");
CREATE INDEX IF NOT EXISTS "shared_access_pass_print_variants_passId_idx" ON "shared_access_pass_print_variants"("passId");

CREATE TABLE IF NOT EXISTS "shared_access_pass_scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "scannedById" TEXT,
    "gate" TEXT,
    "deviceInfo" TEXT,
    "operatorRoleNote" TEXT,
    "vendorLabel" TEXT,
    "offline" BOOLEAN NOT NULL DEFAULT 0,
    "clientRecordId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_access_pass_scans_passId_fkey" FOREIGN KEY ("passId") REFERENCES "shared_event_access_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "shared_access_pass_scans_clientRecordId_key" ON "shared_access_pass_scans"("clientRecordId");
CREATE INDEX IF NOT EXISTS "shared_access_pass_scans_eventId_createdAt_idx" ON "shared_access_pass_scans"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "shared_access_pass_scans_passId_createdAt_idx" ON "shared_access_pass_scans"("passId", "createdAt");
