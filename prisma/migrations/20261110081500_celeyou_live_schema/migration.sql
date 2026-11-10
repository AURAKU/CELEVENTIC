-- Additive CeleYou tables for live SQLite. CREATE IF NOT EXISTS is safe to re-run.
-- Missing columns on digital_business_cards / celecard_lifecycle_policy are applied
-- by scripts/sql/apply-celeyou-sqlite.ts (duplicate-column safe) before migrate deploy.

CREATE TABLE IF NOT EXISTS "smartcard_design_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "config" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'SAVED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" DATETIME,
  CONSTRAINT "smartcard_design_versions_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "smartcard_design_versions_cardId_createdAt_idx"
  ON "smartcard_design_versions"("cardId", "createdAt");

CREATE TABLE IF NOT EXISTS "smartcard_lifecycle_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "meta" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smartcard_lifecycle_events_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "smartcard_lifecycle_events_cardId_createdAt_idx"
  ON "smartcard_lifecycle_events"("cardId", "createdAt");
CREATE INDEX IF NOT EXISTS "smartcard_lifecycle_events_kind_idx"
  ON "smartcard_lifecycle_events"("kind");

CREATE TABLE IF NOT EXISTS "celecard_lifecycle_policy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
  "expiringSoonDays" INTEGER NOT NULL DEFAULT 14,
  "reminderOffsetsDays" TEXT NOT NULL DEFAULT '[14,7,3,1,0,-3,-14,-30]',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
  "reconnectBatchHours" INTEGER NOT NULL DEFAULT 6,
  "reconnectPerCardPerHour" INTEGER NOT NULL DEFAULT 3,
  "reconnectPerIpPerHour" INTEGER NOT NULL DEFAULT 10,
  "designVaultMax" INTEGER NOT NULL DEFAULT 40,
  "planPrices" TEXT,
  "conciergePriceGhs" INTEGER DEFAULT 199,
  "conciergeBundledPlanId" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedByUserId" TEXT
);
INSERT OR IGNORE INTO "celecard_lifecycle_policy" ("id") VALUES ('default');

CREATE TABLE IF NOT EXISTS "smartcard_claim_invites" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "consumedByUserId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smartcard_claim_invites_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "smartcard_claim_invites_tokenHash_key"
  ON "smartcard_claim_invites"("tokenHash");
CREATE INDEX IF NOT EXISTS "smartcard_claim_invites_cardId_idx"
  ON "smartcard_claim_invites"("cardId");
CREATE INDEX IF NOT EXISTS "smartcard_claim_invites_email_idx"
  ON "smartcard_claim_invites"("email");
CREATE INDEX IF NOT EXISTS "smartcard_claim_invites_expiresAt_idx"
  ON "smartcard_claim_invites"("expiresAt");

CREATE TABLE IF NOT EXISTS "smartcard_entitlement_grants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "planId" TEXT,
  "months" INTEGER,
  "startsAt" DATETIME NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "reason" TEXT NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "approvalRef" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smartcard_entitlement_grants_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "smartcard_entitlement_grants_cardId_createdAt_idx"
  ON "smartcard_entitlement_grants"("cardId", "createdAt");
CREATE INDEX IF NOT EXISTS "smartcard_entitlement_grants_grantedByUserId_idx"
  ON "smartcard_entitlement_grants"("grantedByUserId");

CREATE TABLE IF NOT EXISTS "smartcard_concierge_orders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'INTAKE',
  "customerUserId" TEXT,
  "customerEmail" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "brief" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "title" TEXT,
  "company" TEXT,
  "themePreference" TEXT,
  "planId" TEXT,
  "includeSubscription" INTEGER NOT NULL DEFAULT 1,
  "designFeeGhs" INTEGER NOT NULL,
  "subscriptionFeeGhs" INTEGER NOT NULL DEFAULT 0,
  "totalGhs" INTEGER NOT NULL,
  "paymentId" TEXT,
  "paymentReference" TEXT,
  "cardId" TEXT,
  "assignedAdminId" TEXT,
  "deliveredAt" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "smartcard_concierge_orders_status_createdAt_idx"
  ON "smartcard_concierge_orders"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "smartcard_concierge_orders_customerEmail_idx"
  ON "smartcard_concierge_orders"("customerEmail");
CREATE INDEX IF NOT EXISTS "smartcard_concierge_orders_customerUserId_idx"
  ON "smartcard_concierge_orders"("customerUserId");

CREATE INDEX IF NOT EXISTS "digital_business_cards_subscriptionStatus_subscriptionExpiresAt_idx"
  ON "digital_business_cards" ("subscriptionStatus", "subscriptionExpiresAt");
CREATE INDEX IF NOT EXISTS "digital_business_cards_createdAt_idx"
  ON "digital_business_cards"("createdAt");
