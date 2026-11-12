-- Additive CeleYou Connect tables. CREATE IF NOT EXISTS is safe to re-run.
-- New columns on smartcard_connections and background_jobs are added by
-- scripts/sql/apply-celeyou-sqlite.ts so this file never fails when they already exist.

CREATE TABLE IF NOT EXISTS "celeyou_connect_automations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT 0,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "delay" TEXT NOT NULL DEFAULT 'HOUR',
  "customDelayMinutes" INTEGER,
  "requireFollowupConsent" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_connect_automations_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_connect_automations_cardId_key"
  ON "celeyou_connect_automations"("cardId");

CREATE TABLE IF NOT EXISTS "celeyou_connect_deliveries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT,
  "cardId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "runAt" DATETIME NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "providerAccepted" BOOLEAN NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_connect_deliveries_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "smartcard_connections"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "celeyou_connect_deliveries_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_connect_deliveries_idempotencyKey_key"
  ON "celeyou_connect_deliveries"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "celeyou_connect_deliveries_status_runAt_idx"
  ON "celeyou_connect_deliveries"("status", "runAt");
CREATE INDEX IF NOT EXISTS "celeyou_connect_deliveries_cardId_createdAt_idx"
  ON "celeyou_connect_deliveries"("cardId", "createdAt");

CREATE TABLE IF NOT EXISTS "celeyou_connect_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "actorUserId" TEXT,
  "meta" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_connect_events_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "smartcard_connections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "celeyou_connect_events_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "celeyou_connect_events_connectionId_createdAt_idx"
  ON "celeyou_connect_events"("connectionId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_connect_events_cardId_createdAt_idx"
  ON "celeyou_connect_events"("cardId", "createdAt");

CREATE TABLE IF NOT EXISTS "celeyou_connect_preferences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "newConnectionAlerts" BOOLEAN NOT NULL DEFAULT 1,
  "exchangeAlerts" BOOLEAN NOT NULL DEFAULT 1,
  "followupReminders" BOOLEAN NOT NULL DEFAULT 1,
  "weeklySummary" BOOLEAN NOT NULL DEFAULT 0,
  "marketingNotifications" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_connect_preferences_userId_key"
  ON "celeyou_connect_preferences"("userId");

CREATE TABLE IF NOT EXISTS "celeyou_connect_reminders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "dueAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "note" TEXT,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_connect_reminders_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "smartcard_connections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "celeyou_connect_reminders_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "celeyou_connect_reminders_cardId_dueAt_idx"
  ON "celeyou_connect_reminders"("cardId", "dueAt");
CREATE INDEX IF NOT EXISTS "celeyou_connect_reminders_status_dueAt_idx"
  ON "celeyou_connect_reminders"("status", "dueAt");
