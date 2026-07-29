-- Private organizer-only guest relationship tags for seating/planning.
-- Never exposed on guest-facing invitation surfaces.

CREATE TABLE "event_guest_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guest_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "event_guest_tags_eventId_slug_key" ON "event_guest_tags"("eventId", "slug");
CREATE INDEX "event_guest_tags_eventId_sortOrder_idx" ON "event_guest_tags"("eventId", "sortOrder");

CREATE TABLE "guest_tag_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_tag_assignments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "event_guest_tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "guest_tag_assignments_guestId_tagId_key" ON "guest_tag_assignments"("guestId", "tagId");
CREATE INDEX "guest_tag_assignments_tagId_idx" ON "guest_tag_assignments"("tagId");
