-- Additive: attach successful contribution payments to organiser/admin audit fields.
ALTER TABLE "contributions" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "contributions" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "contributions" ADD COLUMN "payerEmail" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "contributions_paymentId_key" ON "contributions"("paymentId");
CREATE INDEX IF NOT EXISTS "contributions_paymentReference_idx" ON "contributions"("paymentReference");
