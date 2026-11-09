-- Ticket-revenue book on the existing event wallet (same ledger, separate book).
-- Existing accounts are gift books. Composite unique replaces eventId-only unique.

ALTER TABLE "event_wallet_accounts" ADD COLUMN "book" TEXT NOT NULL DEFAULT 'GIFT';
ALTER TABLE "event_wallet_accounts" ADD COLUMN "lifetimeTicketGrossMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_wallet_accounts" ADD COLUMN "lifetimeTicketCommissionMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_wallet_accounts" ADD COLUMN "lifetimeTicketRefundMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_wallet_accounts" ADD COLUMN "ticketSaleCount" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "event_wallet_accounts_eventId_key";
CREATE UNIQUE INDEX "event_wallet_accounts_eventId_book_key" ON "event_wallet_accounts"("eventId", "book");
CREATE INDEX IF NOT EXISTS "event_wallet_accounts_eventId_idx" ON "event_wallet_accounts"("eventId");

CREATE TABLE IF NOT EXISTS "ticket_promos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "discountFixedMinor" INTEGER,
    "maxUses" INTEGER,
    "maxUsesPerUser" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "startsAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ticket_promos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_promos_eventId_code_key" ON "ticket_promos"("eventId", "code");
CREATE INDEX IF NOT EXISTS "ticket_promos_eventId_active_idx" ON "ticket_promos"("eventId", "active");

CREATE TABLE IF NOT EXISTS "ticket_promo_redemptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_promo_redemptions_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "ticket_promos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_promo_redemptions_orderId_key" ON "ticket_promo_redemptions"("orderId");
CREATE INDEX IF NOT EXISTS "ticket_promo_redemptions_promoId_userId_idx" ON "ticket_promo_redemptions"("promoId", "userId");
CREATE INDEX IF NOT EXISTS "ticket_promo_redemptions_eventId_idx" ON "ticket_promo_redemptions"("eventId");
