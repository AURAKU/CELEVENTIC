-- CeleCard per-item access codes, grants, and anonymous requests (SQLite-safe, additive).

CREATE TABLE IF NOT EXISTS "smartcard_access_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeKind" TEXT NOT NULL,
  "itemKeys" JSON NOT NULL DEFAULT '[]',
  "expiresAt" DATETIME,
  "revokedAt" DATETIME,
  "maxRedemptions" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "smartcard_access_codes_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "smartcard_access_codes_cardId_idx"
  ON "smartcard_access_codes"("cardId");
CREATE INDEX IF NOT EXISTS "smartcard_access_codes_cardId_codeHash_idx"
  ON "smartcard_access_codes"("cardId", "codeHash");

CREATE TABLE IF NOT EXISTS "smartcard_access_grants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "itemKeys" JSON NOT NULL DEFAULT '[]',
  "source" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smartcard_access_grants_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "smartcard_access_grants_tokenHash_key"
  ON "smartcard_access_grants"("tokenHash");
CREATE INDEX IF NOT EXISTS "smartcard_access_grants_cardId_expiresAt_idx"
  ON "smartcard_access_grants"("cardId", "expiresAt");

CREATE TABLE IF NOT EXISTS "smartcard_access_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "itemKeys" JSON NOT NULL DEFAULT '[]',
  "visitorName" TEXT NOT NULL,
  "visitorContact" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "grantId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "smartcard_access_requests_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "smartcard_access_requests_grantId_fkey"
    FOREIGN KEY ("grantId") REFERENCES "smartcard_access_grants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "smartcard_access_requests_cardId_status_idx"
  ON "smartcard_access_requests"("cardId", "status");
