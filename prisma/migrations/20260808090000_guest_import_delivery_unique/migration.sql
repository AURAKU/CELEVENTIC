-- Prevent duplicate WhatsApp/SMS/email sends for the same import row+channel.
-- Keep the earliest row when duplicates already exist.

DELETE FROM "guest_import_deliveries"
WHERE "rowid" NOT IN (
  SELECT MIN("rowid")
  FROM "guest_import_deliveries"
  GROUP BY "batchId", IFNULL("rowId", ''), "channel"
);

CREATE UNIQUE INDEX "guest_import_deliveries_batchId_rowId_channel_key"
ON "guest_import_deliveries"("batchId", "rowId", "channel");
