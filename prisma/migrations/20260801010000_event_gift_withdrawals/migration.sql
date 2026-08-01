-- Event gift wallet withdrawals + companion/campaign settlement fields (SQLite).
-- Prisma stores enums as TEXT in SQLite — new enum values need no ALTER ENUM.

ALTER TABLE "event_gift_campaigns"
ADD COLUMN "showOnCompanion" BOOLEAN NOT NULL DEFAULT 1;

ALTER TABLE "event_gift_campaigns"
ADD COLUMN "opensAt" DATETIME;

ALTER TABLE "event_gift_campaigns"
ADD COLUMN "settlementDelayHours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "event_gift_campaigns"
ADD COLUMN "withdrawAfterEventOnly" BOOLEAN NOT NULL DEFAULT 1;

ALTER TABLE "event_gift_campaigns"
ADD COLUMN "minWithdrawalMinor" INTEGER NOT NULL DEFAULT 1000;

ALTER TABLE "event_gift_campaigns"
ADD COLUMN "maxWithdrawalMinor" INTEGER;

CREATE TABLE "event_wallet_withdrawal_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "payoutMethod" TEXT NOT NULL,
    "payoutKind" TEXT NOT NULL DEFAULT 'MANUAL_PAYOUT',
    "mobileMoneyNetwork" TEXT,
    "payoutPhoneMasked" TEXT,
    "payoutDestinationEnc" TEXT,
    "bankCode" TEXT,
    "bankAccountMasked" TEXT,
    "accountName" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "providerRecipientCode" TEXT,
    "providerTransferCode" TEXT,
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "reason" TEXT,
    "internalNote" TEXT,
    "failureReason" TEXT,
    "evidenceReference" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "processingAt" DATETIME,
    "paidAt" DATETIME,
    "failedAt" DATETIME,
    "cancelledAt" DATETIME,
    "reversedAt" DATETIME,
    "rejectedAt" DATETIME,
    "reserveLedgerEntryId" TEXT,
    "debitLedgerEntryId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_wallet_withdrawal_requests_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_withdrawal_requests_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "event_wallet_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_withdrawal_requests_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_withdrawal_requests_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "event_wallet_withdrawal_requests_idempotencyKey_key"
ON "event_wallet_withdrawal_requests"("idempotencyKey");

CREATE INDEX "event_wallet_withdrawal_requests_eventId_status_createdAt_idx"
ON "event_wallet_withdrawal_requests"("eventId", "status", "createdAt");

CREATE INDEX "event_wallet_withdrawal_requests_accountId_status_idx"
ON "event_wallet_withdrawal_requests"("accountId", "status");

CREATE INDEX "event_wallet_withdrawal_requests_requestedById_idx"
ON "event_wallet_withdrawal_requests"("requestedById");
