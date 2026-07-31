-- Soft-delete for event guest tags so organizers can remove presets/custom
-- labels without the preset seeder recreating them on the next load.
ALTER TABLE "event_guest_tags" ADD COLUMN "archivedAt" DATETIME;
