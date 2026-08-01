-- Recovery SQL for production databases that partially applied
-- 20260801030000_thank_you_premium before it failed on:
--   ALTER TABLE ... ADD COLUMN "updatedAt" ... DEFAULT CURRENT_TIMESTAMP
--
-- Preconditions (checked by deploy script):
--   - thank_you_pages already has premium columns (e.g. eyebrow)
--   - invitation_guest_wishes already has title/status/source/... columns
--   - invitation_guest_wishes does NOT yet have a usable NOT NULL updatedAt
--
-- After this file succeeds:
--   npx prisma migrate resolve --applied 20260801030000_thank_you_premium

-- Add updatedAt as nullable (SQLite-safe: no non-constant DEFAULT on ALTER ADD).
-- Ignore if a previous recovery attempt already added a nullable column.
-- SQLite has no ADD COLUMN IF NOT EXISTS — deploy script checks first.

ALTER TABLE "invitation_guest_wishes" ADD COLUMN "updatedAt" DATETIME;

UPDATE "invitation_guest_wishes"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_invitation_guest_wishes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "title" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "source" TEXT NOT NULL DEFAULT 'INVITATION',
    "isPinned" BOOLEAN NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT 0,
    "authorTokenHash" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT 1,
    "editedAt" DATETIME,
    "moderatedAt" DATETIME,
    "moderatedById" TEXT,
    "moderationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_guest_wishes_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitation_guest_wishes_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitation_guest_wishes_guestId_fkey"
      FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_invitation_guest_wishes" (
    "id",
    "eventId",
    "invitationId",
    "guestId",
    "authorName",
    "message",
    "title",
    "avatarUrl",
    "status",
    "source",
    "isPinned",
    "isFeatured",
    "isAnonymous",
    "authorTokenHash",
    "isVisible",
    "editedAt",
    "moderatedAt",
    "moderatedById",
    "moderationReason",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "eventId",
    "invitationId",
    "guestId",
    "authorName",
    "message",
    "title",
    "avatarUrl",
    COALESCE("status", 'APPROVED'),
    COALESCE("source", 'INVITATION'),
    COALESCE("isPinned", 0),
    COALESCE("isFeatured", 0),
    COALESCE("isAnonymous", 0),
    "authorTokenHash",
    COALESCE("isVisible", 1),
    "editedAt",
    "moderatedAt",
    "moderatedById",
    "moderationReason",
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
FROM "invitation_guest_wishes";

DROP TABLE "invitation_guest_wishes";
ALTER TABLE "new_invitation_guest_wishes" RENAME TO "invitation_guest_wishes";

CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_eventId_createdAt_idx"
  ON "invitation_guest_wishes"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_invitationId_idx"
  ON "invitation_guest_wishes"("invitationId");
CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_authorTokenHash_idx"
  ON "invitation_guest_wishes"("authorTokenHash");
CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_eventId_status_createdAt_idx"
  ON "invitation_guest_wishes"("eventId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_eventId_source_idx"
  ON "invitation_guest_wishes"("eventId", "source");

PRAGMA foreign_keys=ON;
PRAGMA foreign_key_check;
