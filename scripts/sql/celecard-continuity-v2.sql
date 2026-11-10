-- Additive CeleCard Continuity V2.0 schema for local SQLite.
-- Do not run against production without authorization.
-- Do not use prisma migrate deploy on this database.

ALTER TABLE digital_business_cards ADD COLUMN adminSuspendedAt DATETIME;
ALTER TABLE digital_business_cards ADD COLUMN deletedAt DATETIME;
ALTER TABLE digital_business_cards ADD COLUMN lastActivatedAt DATETIME;
ALTER TABLE digital_business_cards ADD COLUMN lastActivationPaymentId TEXT;
ALTER TABLE digital_business_cards ADD COLUMN publishedDesignVersionId TEXT;
ALTER TABLE digital_business_cards ADD COLUMN lastCourtesyAt DATETIME;

CREATE TABLE IF NOT EXISTS smartcard_design_versions (
  id TEXT PRIMARY KEY NOT NULL,
  cardId TEXT NOT NULL,
  label TEXT NOT NULL,
  themeId TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'SAVED',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archivedAt DATETIME,
  FOREIGN KEY (cardId) REFERENCES digital_business_cards(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS smartcard_design_versions_cardId_createdAt_idx
  ON smartcard_design_versions(cardId, createdAt);

CREATE TABLE IF NOT EXISTS smartcard_lifecycle_events (
  id TEXT PRIMARY KEY NOT NULL,
  cardId TEXT NOT NULL,
  kind TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cardId) REFERENCES digital_business_cards(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS smartcard_lifecycle_events_cardId_createdAt_idx
  ON smartcard_lifecycle_events(cardId, createdAt);
CREATE INDEX IF NOT EXISTS smartcard_lifecycle_events_kind_idx
  ON smartcard_lifecycle_events(kind);

CREATE TABLE IF NOT EXISTS celecard_lifecycle_policy (
  id TEXT PRIMARY KEY NOT NULL,
  gracePeriodDays INTEGER NOT NULL DEFAULT 3,
  expiringSoonDays INTEGER NOT NULL DEFAULT 14,
  reminderOffsetsDays TEXT NOT NULL DEFAULT '[14,7,3,1,0,-3,-14,-30]',
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra',
  reconnectBatchHours INTEGER NOT NULL DEFAULT 6,
  reconnectPerCardPerHour INTEGER NOT NULL DEFAULT 3,
  reconnectPerIpPerHour INTEGER NOT NULL DEFAULT 10,
  designVaultMax INTEGER NOT NULL DEFAULT 40,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedByUserId TEXT
);

INSERT OR IGNORE INTO celecard_lifecycle_policy (id) VALUES ('default');
