-- Event Seating companion holds + party plans (SQLite-safe, additive).
-- Internal planType RECEPTION is unchanged. Organiser UI labels it Event Seating.
-- Verified SQLite-safe: ALTER ADD locked uses constant DEFAULT 0;
-- CURRENT_TIMESTAMP appears only on CREATE TABLE (allowed), not ALTER ADD COLUMN.

ALTER TABLE "seating_assignments" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "seating_assignments_seatingPlanId_tableNumber_idx"
  ON "seating_assignments"("seatingPlanId", "tableNumber");

CREATE TABLE IF NOT EXISTS "seating_companion_holds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "seatingPlanId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "ownerGuestId" TEXT,
    "companionIndex" INTEGER NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "seatLabel" TEXT,
    "zone" TEXT,
    "notes" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "convertedGuestId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    CONSTRAINT "seating_companion_holds_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_seatingPlanId_fkey"
      FOREIGN KEY ("seatingPlanId") REFERENCES "seating_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_ownerGuestId_fkey"
      FOREIGN KEY ("ownerGuestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_convertedGuestId_fkey"
      FOREIGN KEY ("convertedGuestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "seating_companion_holds_seatingPlanId_invitationId_companionIndex_key"
  ON "seating_companion_holds"("seatingPlanId", "invitationId", "companionIndex");
CREATE INDEX IF NOT EXISTS "seating_companion_holds_eventId_seatingPlanId_idx"
  ON "seating_companion_holds"("eventId", "seatingPlanId");
CREATE INDEX IF NOT EXISTS "seating_companion_holds_seatingPlanId_tableNumber_idx"
  ON "seating_companion_holds"("seatingPlanId", "tableNumber");
CREATE INDEX IF NOT EXISTS "seating_companion_holds_invitationId_idx"
  ON "seating_companion_holds"("invitationId");
CREATE INDEX IF NOT EXISTS "seating_companion_holds_seatingPlanId_status_idx"
  ON "seating_companion_holds"("seatingPlanId", "status");
CREATE INDEX IF NOT EXISTS "seating_companion_holds_convertedGuestId_idx"
  ON "seating_companion_holds"("convertedGuestId");

CREATE TABLE IF NOT EXISTS "seating_party_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatingPlanId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "requiredPlaces" INTEGER NOT NULL,
    "assignmentStrategy" TEXT NOT NULL DEFAULT 'KEEP_TOGETHER',
    "splitConfirmed" BOOLEAN NOT NULL DEFAULT 0,
    "splitReason" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT 0,
    "lastCalculatedAt" DATETIME,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seating_party_plans_seatingPlanId_fkey"
      FOREIGN KEY ("seatingPlanId") REFERENCES "seating_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_party_plans_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_party_plans_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "seating_party_plans_seatingPlanId_invitationId_key"
  ON "seating_party_plans"("seatingPlanId", "invitationId");
CREATE INDEX IF NOT EXISTS "seating_party_plans_seatingPlanId_idx"
  ON "seating_party_plans"("seatingPlanId");
CREATE INDEX IF NOT EXISTS "seating_party_plans_invitationId_idx"
  ON "seating_party_plans"("invitationId");
CREATE INDEX IF NOT EXISTS "seating_party_plans_eventId_idx"
  ON "seating_party_plans"("eventId");
