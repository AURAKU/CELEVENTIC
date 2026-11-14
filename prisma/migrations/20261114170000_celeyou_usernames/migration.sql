-- Additive CeleYou unique usernames. Display names stay non-unique.
-- Existing card slugs, QR tokens, and NFC tokens are not rewritten.

ALTER TABLE "users" ADD COLUMN "celeYouPrimaryCardId" TEXT;

CREATE TABLE IF NOT EXISTS "celeyou_usernames" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "normalized" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "userId" TEXT,
  "cardId" TEXT,
  "redirectTo" TEXT,
  "holdUntil" DATETIME,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_usernames_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "celeyou_usernames_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "digital_business_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_usernames_normalized_key" ON "celeyou_usernames"("normalized");
CREATE INDEX IF NOT EXISTS "celeyou_usernames_userId_kind_idx" ON "celeyou_usernames"("userId", "kind");
CREATE INDEX IF NOT EXISTS "celeyou_usernames_kind_holdUntil_idx" ON "celeyou_usernames"("kind", "holdUntil");
CREATE INDEX IF NOT EXISTS "celeyou_usernames_cardId_idx" ON "celeyou_usernames"("cardId");

CREATE TABLE IF NOT EXISTS "celeyou_username_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "recordId" TEXT,
  "userId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "fromValue" TEXT,
  "toValue" TEXT,
  "reason" TEXT,
  "ipAddress" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_username_events_recordId_fkey"
    FOREIGN KEY ("recordId") REFERENCES "celeyou_usernames"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "celeyou_username_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "celeyou_username_events_username_createdAt_idx" ON "celeyou_username_events"("username", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_username_events_userId_createdAt_idx" ON "celeyou_username_events"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_username_events_action_createdAt_idx" ON "celeyou_username_events"("action", "createdAt");

-- Preserve every live card slug so /u/{slug} cannot be claimed by another account.
INSERT OR IGNORE INTO "celeyou_usernames" ("id", "normalized", "kind", "userId", "cardId", "createdAt", "updatedAt", "reason")
SELECT lower(hex(randomblob(12))), lower("slug"), 'SLUG', "userId", "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'card-slug'
FROM "digital_business_cards"
WHERE "slug" IS NOT NULL AND trim("slug") != '';

-- Adopt an existing User.username when that string is still free, or when it is the owner's own slug.
INSERT OR IGNORE INTO "celeyou_usernames" ("id", "normalized", "kind", "userId", "createdAt", "updatedAt", "reason")
SELECT lower(hex(randomblob(12))), lower("username"), 'ACTIVE', "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'legacy-user-username'
FROM "users"
WHERE "username" IS NOT NULL AND trim("username") != '';

UPDATE "celeyou_usernames"
SET "kind" = 'ACTIVE', "reason" = 'legacy-user-username', "updatedAt" = CURRENT_TIMESTAMP
WHERE "kind" = 'SLUG'
  AND "userId" IN (
    SELECT "id" FROM "users"
    WHERE "username" IS NOT NULL AND lower("username") = "celeyou_usernames"."normalized"
  );

-- System reserved names. Skip any string already owned.
INSERT OR IGNORE INTO "celeyou_usernames" ("id", "normalized", "kind", "reason", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(12))), value, 'RESERVED', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT 'admin' AS value UNION ALL SELECT 'administrator' UNION ALL SELECT 'api'
  UNION ALL SELECT 'billing' UNION ALL SELECT 'c' UNION ALL SELECT 'card'
  UNION ALL SELECT 'cards' UNION ALL SELECT 'celeventic' UNION ALL SELECT 'celeyou'
  UNION ALL SELECT 'claim' UNION ALL SELECT 'create' UNION ALL SELECT 'demo'
  UNION ALL SELECT 'edit' UNION ALL SELECT 'help' UNION ALL SELECT 'login'
  UNION ALL SELECT 'n' UNION ALL SELECT 'new' UNION ALL SELECT 'official'
  UNION ALL SELECT 'preview' UNION ALL SELECT 'present' UNION ALL SELECT 'privacy'
  UNION ALL SELECT 'root' UNION ALL SELECT 'security' UNION ALL SELECT 'staff'
  UNION ALL SELECT 'studio' UNION ALL SELECT 'support' UNION ALL SELECT 'u'
  UNION ALL SELECT 'username' UNION ALL SELECT 'usernames' UNION ALL SELECT 'www'
);

-- First retained card becomes primary when the owner has none.
UPDATE "users"
SET "celeYouPrimaryCardId" = (
  SELECT "id" FROM "digital_business_cards"
  WHERE "digital_business_cards"."userId" = "users"."id"
    AND ("deletedAt" IS NULL)
  ORDER BY "updatedAt" DESC
  LIMIT 1
)
WHERE "celeYouPrimaryCardId" IS NULL;
