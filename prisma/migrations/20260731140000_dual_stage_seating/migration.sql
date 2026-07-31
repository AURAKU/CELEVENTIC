-- Dual-stage seating for SQLite.
-- Adds CEREMONY and RECEPTION plan support.
-- Prisma stores the SeatingPlanType enum as TEXT in SQLite.

ALTER TABLE "seating_plans"
ADD COLUMN "planType" TEXT NOT NULL DEFAULT 'RECEPTION';

CREATE INDEX IF NOT EXISTS
"seating_plans_eventId_idx"
ON "seating_plans"("eventId");

CREATE UNIQUE INDEX IF NOT EXISTS
"seating_plans_eventId_planType_key"
ON "seating_plans"("eventId", "planType");

-- Allow one guest assignment per seating plan.
-- A guest may therefore have one ceremony assignment and one reception assignment.

DROP INDEX IF EXISTS "seating_assignments_guestId_key";

CREATE UNIQUE INDEX IF NOT EXISTS
"seating_assignments_guestId_seatingPlanId_key"
ON "seating_assignments"("guestId", "seatingPlanId");

CREATE INDEX IF NOT EXISTS
"seating_assignments_guestId_idx"
ON "seating_assignments"("guestId");
