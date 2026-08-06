-- Organiser-managed vendor pass types, scoped to one event.
--
-- CUSTOM rows are pass types the organiser added (Catering, Security, DJ Crew…).
-- SYSTEM rows are overrides for the built-in `VendorTeamPassType` enum values:
-- built-ins are never destroyed, they are only hidden from this event's picker
-- by setting `isActive = 0`.
--
-- Passes issued against a custom type keep `passType = 'CUSTOM'` with the label
-- snapshotted into `categoryLabel`, so removing a type never rewrites the text
-- on cards that are already printed and in vendors' hands.

-- CreateTable
CREATE TABLE "event_vendor_pass_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CUSTOM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_vendor_pass_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_vendor_pass_types_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "event_vendor_pass_types_eventId_key_key" ON "event_vendor_pass_types"("eventId", "key");

-- CreateIndex
CREATE INDEX "event_vendor_pass_types_eventId_isActive_idx" ON "event_vendor_pass_types"("eventId", "isActive");
