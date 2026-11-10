-- Additive CeleCard Admin Command Center V3.0 schema for local SQLite.
-- Do not run against production without authorization.
-- Do not use prisma migrate deploy on this database.
-- Each ALTER is its own statement so comment lines cannot swallow the first column.

ALTER TABLE digital_business_cards ADD COLUMN adminDeactivatedAt DATETIME;
ALTER TABLE digital_business_cards ADD COLUMN entitlementKind TEXT;
ALTER TABLE digital_business_cards ADD COLUMN unclaimedEmail TEXT;
ALTER TABLE digital_business_cards ADD COLUMN unclaimedPhone TEXT;
ALTER TABLE digital_business_cards ADD COLUMN claimedAt DATETIME;

CREATE INDEX IF NOT EXISTS digital_business_cards_createdAt_idx
  ON digital_business_cards(createdAt);
CREATE INDEX IF NOT EXISTS digital_business_cards_adminSuspendedAt_idx
  ON digital_business_cards(adminSuspendedAt);
CREATE INDEX IF NOT EXISTS digital_business_cards_adminDeactivatedAt_idx
  ON digital_business_cards(adminDeactivatedAt);
CREATE INDEX IF NOT EXISTS digital_business_cards_claimedAt_idx
  ON digital_business_cards(claimedAt);
CREATE INDEX IF NOT EXISTS digital_business_cards_unclaimedEmail_idx
  ON digital_business_cards(unclaimedEmail);

CREATE TABLE IF NOT EXISTS smartcard_claim_invites (
  id TEXT PRIMARY KEY NOT NULL,
  cardId TEXT NOT NULL,
  tokenHash TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  expiresAt DATETIME NOT NULL,
  consumedAt DATETIME,
  consumedByUserId TEXT,
  createdByUserId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cardId) REFERENCES digital_business_cards(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS smartcard_claim_invites_tokenHash_key
  ON smartcard_claim_invites(tokenHash);
CREATE INDEX IF NOT EXISTS smartcard_claim_invites_cardId_idx
  ON smartcard_claim_invites(cardId);
CREATE INDEX IF NOT EXISTS smartcard_claim_invites_email_idx
  ON smartcard_claim_invites(email);
CREATE INDEX IF NOT EXISTS smartcard_claim_invites_expiresAt_idx
  ON smartcard_claim_invites(expiresAt);

CREATE TABLE IF NOT EXISTS smartcard_entitlement_grants (
  id TEXT PRIMARY KEY NOT NULL,
  cardId TEXT NOT NULL,
  kind TEXT NOT NULL,
  planId TEXT,
  months INTEGER,
  startsAt DATETIME NOT NULL,
  expiresAt DATETIME NOT NULL,
  reason TEXT NOT NULL,
  grantedByUserId TEXT NOT NULL,
  approvalRef TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cardId) REFERENCES digital_business_cards(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS smartcard_entitlement_grants_cardId_createdAt_idx
  ON smartcard_entitlement_grants(cardId, createdAt);
CREATE INDEX IF NOT EXISTS smartcard_entitlement_grants_grantedByUserId_idx
  ON smartcard_entitlement_grants(grantedByUserId);
