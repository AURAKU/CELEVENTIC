-- Dual-stage seating: ceremony + reception plans; one assignment per guest per plan.

CREATE TYPE "SeatingPlanType" AS ENUM ('RECEPTION', 'CEREMONY');

ALTER TABLE "seating_plans" ADD COLUMN "planType" "SeatingPlanType" NOT NULL DEFAULT 'RECEPTION';

-- Keep the newest plan per event as RECEPTION; drop empty duplicates if any.
WITH ranked AS (
  SELECT id, "eventId",
         ROW_NUMBER() OVER (PARTITION BY "eventId" ORDER BY "updatedAt" DESC, "createdAt" DESC) AS rn
  FROM "seating_plans"
)
DELETE FROM "seating_plans"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "seating_plans_eventId_planType_key" ON "seating_plans"("eventId", "planType");
CREATE INDEX "seating_plans_eventId_idx" ON "seating_plans"("eventId");

-- Allow a guest to hold both ceremony and reception assignments.
DROP INDEX IF EXISTS "seating_assignments_guestId_key";
CREATE UNIQUE INDEX "seating_assignments_guestId_seatingPlanId_key" ON "seating_assignments"("guestId", "seatingPlanId");
CREATE INDEX "seating_assignments_guestId_idx" ON "seating_assignments"("guestId");
