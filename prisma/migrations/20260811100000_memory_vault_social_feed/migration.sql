-- Memory Vault social feed: likes, comments, one-time consent (SQLite-safe, additive)

CREATE TABLE IF NOT EXISTS "event_memory_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "guestKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_memory_likes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_memory_likes_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "event_memory_uploads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_memory_likes_memoryId_guestKey_key" ON "event_memory_likes"("memoryId", "guestKey");
CREATE INDEX IF NOT EXISTS "event_memory_likes_eventId_memoryId_idx" ON "event_memory_likes"("eventId", "memoryId");

CREATE TABLE IF NOT EXISTS "event_memory_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorTokenHash" TEXT,
    "guestKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_memory_comments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_memory_comments_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "event_memory_uploads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "event_memory_comments_memoryId_createdAt_idx" ON "event_memory_comments"("memoryId", "createdAt");
CREATE INDEX IF NOT EXISTS "event_memory_comments_eventId_createdAt_idx" ON "event_memory_comments"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "event_memory_comments_authorTokenHash_idx" ON "event_memory_comments"("authorTokenHash");

CREATE TABLE IF NOT EXISTS "event_memory_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "guestKey" TEXT NOT NULL,
    "guestId" TEXT,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_memory_consents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_memory_consents_eventId_guestKey_key" ON "event_memory_consents"("eventId", "guestKey");
CREATE INDEX IF NOT EXISTS "event_memory_consents_eventId_idx" ON "event_memory_consents"("eventId");


-- Guest ownership key for delete-own uploads (additive, nullable)
ALTER TABLE "event_memory_uploads" ADD COLUMN "uploaderGuestKey" TEXT;
CREATE INDEX IF NOT EXISTS "event_memory_uploads_eventId_uploaderGuestKey_idx" ON "event_memory_uploads"("eventId", "uploaderGuestKey");
