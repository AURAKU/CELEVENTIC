-- Celeventic Guide (Learn Celeventic) — additive SQLite migration.
-- Distinct from event_guides (guest Event Guide companion).

CREATE TABLE IF NOT EXISTS "help_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT 0,
    "adminOnly" BOOLEAN NOT NULL DEFAULT 0,
    "posterUrl" TEXT,
    "videoUrl" TEXT,
    "captionsEnUrl" TEXT,
    "captionsFrUrl" TEXT,
    "storyboardKey" TEXT,
    "transcript" TEXT NOT NULL DEFAULT '',
    "synonyms" TEXT NOT NULL DEFAULT '[]',
    "contextRoutes" TEXT NOT NULL DEFAULT '[]',
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "relatedSlugs" TEXT NOT NULL DEFAULT '[]',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "help_guides_slug_key" ON "help_guides"("slug");
CREATE INDEX IF NOT EXISTS "help_guides_status_role_sortOrder_idx" ON "help_guides"("status", "role", "sortOrder");
CREATE INDEX IF NOT EXISTS "help_guides_category_status_idx" ON "help_guides"("category", "status");
CREATE INDEX IF NOT EXISTS "help_guides_featured_status_idx" ON "help_guides"("featured", "status");

CREATE TABLE IF NOT EXISTS "guide_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "stepType" TEXT NOT NULL DEFAULT 'motion',
    "mediaUrl" TEXT,
    "motionKey" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guide_steps_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "guide_steps_guideId_sortOrder_idx" ON "guide_steps"("guideId", "sortOrder");
