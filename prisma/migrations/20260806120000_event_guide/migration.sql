-- Event Guide (SQLite)
--
-- Purely additive. Prisma stores enums as TEXT on SQLite, so the two new
-- EventQrLinkType values (EVENT_GUIDE, EVENT_GUIDE_OFFLINE) need no DDL and no
-- table rewrite. Existing rows are untouched: an event with no event_guides row
-- simply has no guide.

CREATE TABLE IF NOT EXISTS "event_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "defaultTab" TEXT NOT NULL DEFAULT 'PROGRAMME',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER,
    "publishedAt" DATETIME,
    "publishedById" TEXT,
    "showCelebrants" BOOLEAN NOT NULL DEFAULT 1,
    "showDate" BOOLEAN NOT NULL DEFAULT 1,
    "showVenue" BOOLEAN NOT NULL DEFAULT 1,
    "showWelcome" BOOLEAN NOT NULL DEFAULT 1,
    "celebrantsText" TEXT,
    "welcomeMessage" TEXT,
    "useInvitationTheme" BOOLEAN NOT NULL DEFAULT 1,
    "themeOverrides" TEXT,
    "programmeDraft" TEXT,
    "menuDraft" TEXT,
    "attachments" TEXT,
    "publishedPayload" TEXT,
    "seatingEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "seatingMode" TEXT NOT NULL DEFAULT 'ADMISSION_CODE',
    "seatingMinQuery" INTEGER NOT NULL DEFAULT 4,
    "seatingMaxMatch" INTEGER NOT NULL DEFAULT 3,
    "seatingNote" TEXT,
    "offlineEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "venueOfflineEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "offlineSeatingMode" TEXT NOT NULL DEFAULT 'DISABLED',
    "venueLocalUrl" TEXT,
    "venueWifiName" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guides_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_guides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_guides_eventId_key" ON "event_guides"("eventId");
CREATE INDEX IF NOT EXISTS "event_guides_eventId_status_idx" ON "event_guides"("eventId", "status");

CREATE TABLE IF NOT EXISTS "event_guide_offline_packs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'egp1',
    "packVersion" INTEGER NOT NULL DEFAULT 1,
    "guideVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "seatingMode" TEXT NOT NULL DEFAULT 'DISABLED',
    "signature" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "lastSyncedAt" DATETIME,
    "lastSyncReport" TEXT,
    "syncedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guide_offline_packs_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "event_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_guide_offline_packs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_guide_offline_packs_tokenHash_key" ON "event_guide_offline_packs"("tokenHash");
CREATE INDEX IF NOT EXISTS "event_guide_offline_packs_guideId_status_idx" ON "event_guide_offline_packs"("guideId", "status");
CREATE INDEX IF NOT EXISTS "event_guide_offline_packs_tokenHash_idx" ON "event_guide_offline_packs"("tokenHash");

CREATE TABLE IF NOT EXISTS "event_guide_view_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "tab" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'ONLINE',
    "views" INTEGER NOT NULL DEFAULT 0,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guide_view_stats_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "event_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_guide_view_stats_guideId_day_tab_channel_key" ON "event_guide_view_stats"("guideId", "day", "tab", "channel");
CREATE INDEX IF NOT EXISTS "event_guide_view_stats_guideId_day_idx" ON "event_guide_view_stats"("guideId", "day");
