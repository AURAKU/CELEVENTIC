-- Additive CeleYou Free plan + optional 7-day Pro trial.
-- Existing paid terms, payments, QR tokens, and NFC tokens are not rewritten.

ALTER TABLE "celecard_lifecycle_policy" ADD COLUMN "proTrialDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "celecard_lifecycle_policy" ADD COLUMN "businessTrialDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "celecard_lifecycle_policy" ADD COLUMN "checkoutCurrencies" TEXT NOT NULL DEFAULT '["GHS"]';
ALTER TABLE "celecard_lifecycle_policy" ADD COLUMN "internationalDraftPublished" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "celeyou_trial_records" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "cardId" TEXT,
  "family" TEXT NOT NULL DEFAULT 'pro',
  "status" TEXT NOT NULL DEFAULT 'ELIGIBLE',
  "startedAt" DATETIME,
  "expiresAt" DATETIME,
  "convertedAt" DATETIME,
  "convertedPlanId" TEXT,
  "durationDays" INTEGER NOT NULL DEFAULT 7,
  "reminderDay1At" DATETIME,
  "reminderDay4At" DATETIME,
  "reminderDay6At" DATETIME,
  "reminderDay7At" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_trial_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "celeyou_trial_records_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_trial_records_userId_key" ON "celeyou_trial_records"("userId");
CREATE INDEX IF NOT EXISTS "celeyou_trial_records_status_expiresAt_idx" ON "celeyou_trial_records"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "celeyou_trial_records_family_status_idx" ON "celeyou_trial_records"("family", "status");

CREATE TABLE IF NOT EXISTS "celeyou_trial_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trialId" TEXT,
  "userId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_trial_events_trialId_fkey"
    FOREIGN KEY ("trialId") REFERENCES "celeyou_trial_records"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "celeyou_trial_events_trialId_createdAt_idx" ON "celeyou_trial_events"("trialId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_trial_events_userId_createdAt_idx" ON "celeyou_trial_events"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_trial_events_action_createdAt_idx" ON "celeyou_trial_events"("action", "createdAt");
