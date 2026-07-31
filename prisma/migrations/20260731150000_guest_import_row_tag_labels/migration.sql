-- Per-row CRM tag labels from the import Tags column (resolved at generation).
ALTER TABLE "guest_import_rows" ADD COLUMN "tagLabels" JSON;
