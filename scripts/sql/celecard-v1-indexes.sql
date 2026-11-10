-- Additive indexes for CeleCard reminder scans. Local or staging only.
CREATE INDEX IF NOT EXISTS "digital_business_cards_subscriptionStatus_subscriptionExpiresAt_idx"
  ON "digital_business_cards" ("subscriptionStatus", "subscriptionExpiresAt");
CREATE INDEX IF NOT EXISTS "digital_business_cards_deletedAt_idx"
  ON "digital_business_cards" ("deletedAt");
