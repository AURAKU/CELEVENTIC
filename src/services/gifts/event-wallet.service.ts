import { Prisma } from "@prisma/client";
import type {
  EventWalletAccount,
  EventWalletLedgerEntry,
  EventWalletLedgerType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GIFT_DEFAULT_CURRENCY } from "@/lib/gifts/money";

/**
 * Event wallet — ledger first.
 *
 * `EventWalletLedgerEntry` is the source of truth for every pesewa a gift
 * moves. The balances on `EventWalletAccount` are a cache recomputed inside the
 * same transaction that appends an entry, so a crash between the two is
 * impossible. Nothing is ever updated or deleted: a reversal, refund or dispute
 * is a new compensating entry that points back at the entry it offsets.
 */

export type LedgerTxClient = Prisma.TransactionClient | typeof prisma;

export interface PostLedgerEntryInput {
  eventId: string;
  type: EventWalletLedgerType;
  /** Signed minor units: positive credits, negative debits. */
  amountMinor: number;
  currency?: string;
  /** Must be deterministic for the operation it represents. */
  idempotencyKey: string;
  giftPaymentId?: string | null;
  relatedEntryId?: string | null;
  source?: string;
  description?: string | null;
  createdById?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export type PostLedgerEntryResult = {
  entry: EventWalletLedgerEntry;
  account: EventWalletAccount;
  /** True when this exact operation had already been applied. */
  alreadyApplied: boolean;
};

const CREDIT_TYPES: EventWalletLedgerType[] = [
  "GIFT_CREDIT",
  "DISPUTE_RELEASE",
  "ADJUSTMENT_CREDIT",
  "WITHDRAWAL_REVERSAL",
];

/** Soft holds: signed debit amount, but balance stays put while reserved rises. */
const RESERVE_TYPES: EventWalletLedgerType[] = ["WITHDRAWAL_RESERVE"];

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class EventWalletService {
  async getOrCreateAccount(
    eventId: string,
    currency = GIFT_DEFAULT_CURRENCY,
    client: LedgerTxClient = prisma
  ): Promise<EventWalletAccount> {
    const existing = await client.eventWalletAccount.findUnique({ where: { eventId } });
    if (existing) return existing;
    try {
      return await client.eventWalletAccount.create({ data: { eventId, currency } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await client.eventWalletAccount.findUnique({ where: { eventId } });
        if (raced) return raced;
      }
      throw error;
    }
  }

  /**
   * Append one ledger entry and roll the account projections forward.
   *
   * Callers must pass a transaction client when this needs to be atomic with
   * other writes (which is every financial path). Replays are detected through
   * the unique `idempotencyKey`, so a Paystack webhook delivered five times
   * credits the wallet exactly once.
   */
  async postEntry(
    input: PostLedgerEntryInput,
    client: LedgerTxClient = prisma
  ): Promise<PostLedgerEntryResult> {
    if (!Number.isInteger(input.amountMinor)) {
      throw new Error("Ledger amounts must be integer minor units");
    }
    if (input.amountMinor === 0) {
      throw new Error("Ledger entries cannot be zero");
    }

    const isReserve = RESERVE_TYPES.includes(input.type);
    const expectedCredit = CREDIT_TYPES.includes(input.type);
    if (expectedCredit && input.amountMinor < 0) {
      throw new Error(`${input.type} must be a credit (positive amount)`);
    }
    if (!expectedCredit && input.amountMinor > 0) {
      throw new Error(`${input.type} must be a debit (negative amount)`);
    }

    const existing = await client.eventWalletLedgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      const account = await this.getOrCreateAccount(input.eventId, input.currency, client);
      return { entry: existing, account, alreadyApplied: true };
    }

    const account = await this.getOrCreateAccount(
      input.eventId,
      input.currency ?? GIFT_DEFAULT_CURRENCY,
      client
    );

    if (account.status === "CLOSED") {
      throw new Error("This event wallet is closed and cannot accept new entries");
    }
    if (account.status === "FROZEN" && input.type !== "ADJUSTMENT_CREDIT") {
      throw new Error("This event wallet is frozen");
    }

    const absAmount = Math.abs(input.amountMinor);
    // Reserves hold availability without moving cash balance.
    const balanceAfter = isReserve ? account.balanceMinor : account.balanceMinor + input.amountMinor;
    let nextReserved = account.reservedMinor;

    if (isReserve) {
      if (account.availableMinor < absAmount) {
        throw new Error("Insufficient available balance to reserve for withdrawal");
      }
      nextReserved = account.reservedMinor + absAmount;
    } else if (input.type === "WITHDRAWAL_DEBIT") {
      nextReserved = Math.max(0, account.reservedMinor - absAmount);
    } else if (input.type === "WITHDRAWAL_REVERSAL") {
      // Reversal restores balance; reserved should already have been released on failure paths.
      nextReserved = account.reservedMinor;
    }

    if (balanceAfter < 0) {
      throw new Error("Ledger balance cannot go negative");
    }

    let entry: EventWalletLedgerEntry;
    try {
      entry = await client.eventWalletLedgerEntry.create({
        data: {
          accountId: account.id,
          eventId: input.eventId,
          type: input.type,
          direction: input.amountMinor > 0 ? "CREDIT" : "DEBIT",
          amountMinor: input.amountMinor,
          currency: input.currency ?? account.currency,
          balanceAfterMinor: balanceAfter,
          idempotencyKey: input.idempotencyKey,
          giftPaymentId: input.giftPaymentId ?? undefined,
          relatedEntryId: input.relatedEntryId ?? undefined,
          source: input.source ?? "system",
          description: input.description ?? undefined,
          createdById: input.createdById ?? undefined,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await client.eventWalletLedgerEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (raced) return { entry: raced, account, alreadyApplied: true };
      }
      throw error;
    }

    const availableAfter = Math.max(0, balanceAfter - nextReserved);

    const updated = await client.eventWalletAccount.update({
      where: { id: account.id },
      data: {
        balanceMinor: balanceAfter,
        reservedMinor: nextReserved,
        availableMinor: availableAfter,
        lastLedgerAt: entry.createdAt,
        ...(input.type === "GIFT_CREDIT"
          ? {
              lifetimeGiftMinor: { increment: input.amountMinor },
              giftCount: { increment: 1 },
            }
          : {}),
        ...(input.type === "REFUND_DEBIT" || input.type === "GIFT_REVERSAL"
          ? { lifetimeRefundMinor: { increment: Math.abs(input.amountMinor) } }
          : {}),
        ...(input.type === "WITHDRAWAL_DEBIT"
          ? { lifetimeWithdrawnMinor: { increment: Math.abs(input.amountMinor) } }
          : {}),
      },
    });

    return { entry, account: updated, alreadyApplied: false };
  }

  /**
   * Release a previously reserved amount without posting a balance-moving debit.
   * Used when a withdrawal is rejected, cancelled, or a payout fails before PAID.
   */
  async releaseReservation(
    eventId: string,
    amountMinor: number,
    client: LedgerTxClient = prisma
  ): Promise<EventWalletAccount> {
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      throw new Error("Reservation release amount must be a positive integer");
    }
    const account = await this.getOrCreateAccount(eventId, undefined, client);
    const nextReserved = Math.max(0, account.reservedMinor - amountMinor);
    return client.eventWalletAccount.update({
      where: { id: account.id },
      data: {
        reservedMinor: nextReserved,
        availableMinor: Math.max(0, account.balanceMinor - nextReserved),
      },
    });
  }

  /** Ledger truth vs. cached projection — used by the reconcile action. */
  async reconcile(eventId: string): Promise<{
    ledgerBalanceMinor: number;
    accountBalanceMinor: number;
    drifted: boolean;
    entryCount: number;
  }> {
    const account = await this.getOrCreateAccount(eventId);
    const [aggregate, entryCount] = await Promise.all([
      prisma.eventWalletLedgerEntry.aggregate({
        where: { accountId: account.id },
        _sum: { amountMinor: true },
      }),
      prisma.eventWalletLedgerEntry.count({ where: { accountId: account.id } }),
    ]);

    const ledgerBalanceMinor = aggregate._sum.amountMinor ?? 0;
    const drifted = ledgerBalanceMinor !== account.balanceMinor;

    if (drifted) {
      await prisma.eventWalletAccount.update({
        where: { id: account.id },
        data: {
          balanceMinor: ledgerBalanceMinor,
          availableMinor: ledgerBalanceMinor - account.reservedMinor,
        },
      });
    }

    return {
      ledgerBalanceMinor,
      accountBalanceMinor: account.balanceMinor,
      drifted,
      entryCount,
    };
  }

  async getSummary(eventId: string) {
    const account = await this.getOrCreateAccount(eventId);
    const [recentEntries, successAggregate, refundAggregate, pendingCount] = await Promise.all([
      prisma.eventWalletLedgerEntry.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.eventGiftPayment.aggregate({
        where: { eventId, status: "SUCCESS" },
        _sum: { amountMinor: true, netAmountMinor: true, feeMinor: true },
        _count: true,
      }),
      prisma.eventGiftPayment.aggregate({
        where: { eventId, status: { in: ["REFUNDED", "REVERSED"] } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      prisma.eventGiftPayment.count({
        where: { eventId, status: { in: ["PENDING", "PROCESSING"] } },
      }),
    ]);

    const disputedCount = await prisma.eventGiftPayment.count({
      where: { eventId, status: "DISPUTED" },
    });

    return {
      account,
      recentEntries,
      totals: {
        giftCount: successAggregate._count,
        grossMinor: successAggregate._sum.amountMinor ?? 0,
        netMinor: successAggregate._sum.netAmountMinor ?? 0,
        feesMinor: successAggregate._sum.feeMinor ?? 0,
        refundedMinor: refundAggregate._sum.amountMinor ?? 0,
        refundedCount: refundAggregate._count,
        pendingCount,
        disputedCount,
        reservedMinor: account.reservedMinor,
        availableMinor: account.availableMinor,
        balanceMinor: account.balanceMinor,
        withdrawnMinor: account.lifetimeWithdrawnMinor,
      },
    };
  }

  async listEntries(
    eventId: string,
    options: { page?: number; limit?: number; type?: EventWalletLedgerType } = {}
  ) {
    const account = await this.getOrCreateAccount(eventId);
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 25));
    const where = {
      accountId: account.id,
      ...(options.type ? { type: options.type } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventWalletLedgerEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.eventWalletLedgerEntry.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }
}

export const eventWalletService = new EventWalletService();
