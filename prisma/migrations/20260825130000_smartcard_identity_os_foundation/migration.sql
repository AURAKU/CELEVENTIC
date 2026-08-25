-- Celeventic SmartCard / Identity OS foundation (SQLite-safe, additive).
-- Preserves existing digital_business_cards rows and backfills publicToken.

-- Root card extensions (SQLite: one column per ALTER)
ALTER TABLE "digital_business_cards" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "digital_business_cards" ADD COLUMN "connectBackEnabled" BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE "digital_business_cards" ADD COLUMN "defaultMode" TEXT NOT NULL DEFAULT 'professional';
ALTER TABLE "digital_business_cards" ADD COLUMN "offlineSnapshotVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "digital_business_cards"
SET "publicToken" = lower(hex(randomblob(16)))
WHERE "publicToken" IS NULL OR "publicToken" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "digital_business_cards_publicToken_key"
  ON "digital_business_cards"("publicToken");
CREATE INDEX IF NOT EXISTS "digital_business_cards_publicToken_idx"
  ON "digital_business_cards"("publicToken");

CREATE TABLE IF NOT EXISTS "smartcard_variants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT 0,
  "overrides" JSON NOT NULL DEFAULT '{}',
  "isPublished" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "smartcard_variants_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "smartcard_variants_cardId_mode_key"
  ON "smartcard_variants"("cardId", "mode");
CREATE INDEX IF NOT EXISTS "smartcard_variants_cardId_idx"
  ON "smartcard_variants"("cardId");

CREATE TABLE IF NOT EXISTS "smartcard_campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "mode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "smartcard_campaigns_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "smartcard_campaigns_publicToken_key"
  ON "smartcard_campaigns"("publicToken");
CREATE INDEX IF NOT EXISTS "smartcard_campaigns_cardId_idx"
  ON "smartcard_campaigns"("cardId");

CREATE TABLE IF NOT EXISTS "smartcard_nfc_devices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "claimSecretHash" TEXT,
  "name" TEXT NOT NULL,
  "deviceType" TEXT NOT NULL DEFAULT 'card',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "assignedMode" TEXT,
  "campaignId" TEXT,
  "tapCount" INTEGER NOT NULL DEFAULT 0,
  "lastTapAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "smartcard_nfc_devices_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "smartcard_nfc_devices_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "smartcard_campaigns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "smartcard_nfc_devices_publicToken_key"
  ON "smartcard_nfc_devices"("publicToken");
CREATE INDEX IF NOT EXISTS "smartcard_nfc_devices_cardId_idx"
  ON "smartcard_nfc_devices"("cardId");
CREATE INDEX IF NOT EXISTS "smartcard_nfc_devices_status_idx"
  ON "smartcard_nfc_devices"("status");

CREATE TABLE IF NOT EXISTS "smartcard_connections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "visitorName" TEXT NOT NULL,
  "visitorEmail" TEXT,
  "visitorPhone" TEXT,
  "visitorCompany" TEXT,
  "visitorTitle" TEXT,
  "note" TEXT,
  "formMode" TEXT NOT NULL DEFAULT 'Instant',
  "source" TEXT NOT NULL DEFAULT 'connect_back',
  "campaignId" TEXT,
  "eventId" TEXT,
  "tags" JSON NOT NULL DEFAULT '[]',
  "consentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "smartcard_connections_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "smartcard_connections_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "smartcard_campaigns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "smartcard_connections_cardId_createdAt_idx"
  ON "smartcard_connections"("cardId", "createdAt");
CREATE INDEX IF NOT EXISTS "smartcard_connections_status_idx"
  ON "smartcard_connections"("status");

CREATE TABLE IF NOT EXISTS "smartcard_interactions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "campaignId" TEXT,
  "kind" TEXT NOT NULL,
  "meta" JSON NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smartcard_interactions_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "smartcard_interactions_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "smartcard_campaigns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "smartcard_interactions_cardId_createdAt_idx"
  ON "smartcard_interactions"("cardId", "createdAt");
CREATE INDEX IF NOT EXISTS "smartcard_interactions_kind_idx"
  ON "smartcard_interactions"("kind");
