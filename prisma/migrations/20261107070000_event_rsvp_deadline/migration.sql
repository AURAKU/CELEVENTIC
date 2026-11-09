-- Additive RSVP deadline on events. Null preserves current open-ended RSVP behaviour.
ALTER TABLE "events" ADD COLUMN "rsvpDeadline" DATETIME;

-- Latest-RSVP lookups used by idempotent submit and CSV export.
CREATE INDEX IF NOT EXISTS "rsvps_guestId_createdAt_idx" ON "rsvps"("guestId", "createdAt");
