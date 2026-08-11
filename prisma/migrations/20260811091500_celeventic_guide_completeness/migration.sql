-- Celeventic Guide completeness: media, freshness, versioning, badges, schedule, feedback.
-- Additive SQLite-safe ALTER TABLE only (constant defaults). No migrate reset.

ALTER TABLE "help_guides" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "mp4Url" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "webmUrl" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "mobileVideoUrl" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "desktopVideoUrl" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "help_guides" ADD COLUMN "narrationScript" TEXT NOT NULL DEFAULT '';
ALTER TABLE "help_guides" ADD COLUMN "a11yDescription" TEXT NOT NULL DEFAULT '';
ALTER TABLE "help_guides" ADD COLUMN "videoProductionRequired" BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE "help_guides" ADD COLUMN "featureKey" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "lastVerifiedAt" DATETIME;
ALTER TABLE "help_guides" ADD COLUMN "verifiedAgainstBuild" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "verifiedAgainstFeatureVersion" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'CURRENT';
ALTER TABLE "help_guides" ADD COLUMN "analyticsEvents" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "help_guides" ADD COLUMN "voiceoverEnUrl" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "voiceoverFrUrl" TEXT;
ALTER TABLE "help_guides" ADD COLUMN "isNew" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "help_guides" ADD COLUMN "newUntil" DATETIME;
ALTER TABLE "help_guides" ADD COLUMN "scheduledPublishAt" DATETIME;

CREATE INDEX IF NOT EXISTS "help_guides_featureKey_idx" ON "help_guides"("featureKey");
CREATE INDEX IF NOT EXISTS "help_guides_reviewStatus_idx" ON "help_guides"("reviewStatus");
CREATE INDEX IF NOT EXISTS "help_guides_scheduledPublishAt_idx" ON "help_guides"("scheduledPublishAt");

CREATE TABLE IF NOT EXISTS "help_guide_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "editorId" TEXT,
    "editorLabel" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "help_guide_versions_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "help_guide_versions_guideId_version_key" ON "help_guide_versions"("guideId", "version");
CREATE INDEX IF NOT EXISTS "help_guide_versions_guideId_createdAt_idx" ON "help_guide_versions"("guideId", "createdAt");

CREATE TABLE IF NOT EXISTS "help_guide_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "help_guide_feedback_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "help_guide_feedback_guideId_createdAt_idx" ON "help_guide_feedback"("guideId", "createdAt");
