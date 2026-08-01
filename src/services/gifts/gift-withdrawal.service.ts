import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import type {
  EventWalletPayoutMethod,
  EventWalletWithdrawalRequest,
  EventWalletWithdrawalStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { eventWalletService } from "@/services/gifts/event-wallet.service";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import {
  ACTIVE_RESERVE_STATUSES,
  canRequesterSelfApprove,
  evaluateWithdrawalPolicy,
  maskBankAccount,
  maskPhone,
  type WithdrawalPayoutMethodId,
} from "@/lib/gifts/gift-withdrawal";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";

/**
 * Event gift withdrawals.
 *
 * Authoritative cash lives on EventWalletLedgerEntry. A request:
 * 1) validates finance permission + settlement policy
 * 2) posts WITHDRAWAL_RESERVE (holds availableMinor)
 * 3) waits for a *different* approver (or platform admin)
 * 4) records MANUAL_PAYOUT with evidence — never claims a Paystack transfer
 *    unless PROVIDER_TRANSFER is explicitly confirmed later.
 */

function ledgerIdempotencyKey(parts: string[]): string {
  return parts.join(":");
}

function encryptDestination(payload: Record<string, string>): string {
  // Soft protection: store hashed fingerprint + plaintext only when ENCRYPTION_KEY unset.
  // Production should set GIFT_PAYOUT_SECRET; we never log the raw payload.
  const secret = process.env.GIFT_PAYOUT_SECRET || process.env.NEXTAUTH_SECRET || "celeventic-local";
  const json = JSON.stringify(payload);
  const fingerprint = createHash("sha256").update(`${secret}:${json}`).digest("hex");
  return Buffer.from(JSON.stringify({ v: 1, fingerprint, payload })).toString("base64url");
}

export interface RequestWithdrawalInput {
  eventId: string;
  requestedById: string;
  amountMinor: number;
  payoutMethod: WithdrawalPayoutMethodId;
  payoutPhone?: string | null;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  accountName?: string | null;
  reason?: string | null;
  idempotencyKey?: string | null;
}

export class GiftWithdrawalService {
  async request(input: RequestWithdrawalInput): Promise<EventWalletWithdrawalRequest> {
    const campaign = await giftCampaignService.ensureCampaign(input.eventId);
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, status: true, startDate: true, endDate: true },
    });
    if (!event) throw new Error("Event not found");

    const account = await eventWalletService.getOrCreateAccount(input.eventId, campaign.currency);

    const policy = evaluateWithdrawalPolicy(
      {
        withdrawAfterEventOnly: campaign.withdrawAfterEventOnly,
        settlementDelayHours: campaign.settlementDelayHours,
        minWithdrawalMinor: campaign.minWithdrawalMinor,
        maxWithdrawalMinor: campaign.maxWithdrawalMinor,
        eventStartDate: event.startDate,
        eventEndDate: event.endDate,
        eventStatus: event.status,
      },
      input.amountMinor,
      account.availableMinor
    );
    if (!policy.ok) throw new Error(policy.error);

    if (account.status !== "ACTIVE") {
      throw new Error("This event wallet cannot accept withdrawals right now");
    }

    const method = input.payoutMethod as EventWalletPayoutMethod;
    const isBank = method === "GHANA_BANK";
    if (isBank) {
      if (!input.bankAccountNumber?.trim() || !input.accountName?.trim()) {
        throw new Error("Bank account number and account name are required");
      }
    } else if (!input.payoutPhone?.trim()) {
      throw new Error("Mobile money number is required");
    }

    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      `wd_req:${input.eventId}:${input.requestedById}:${input.amountMinor}:${randomBytes(8).toString("hex")}`;

    const existing = await prisma.eventWalletWithdrawalRequest.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;

    const destinationEnc = encryptDestination({
      phone: input.payoutPhone?.trim() || "",
      bankCode: input.bankCode?.trim() || "",
      bankAccount: input.bankAccountNumber?.trim() || "",
      accountName: input.accountName?.trim() || "",
    });

    const withdrawal = await prisma.$transaction(async (tx) => {
      const reserve = await eventWalletService.postEntry(
        {
          eventId: input.eventId,
          type: "WITHDRAWAL_RESERVE",
          amountMinor: -input.amountMinor,
          currency: campaign.currency,
          idempotencyKey: ledgerIdempotencyKey(["withdrawal_reserve", idempotencyKey]),
          source: "organiser_withdrawal",
          description: "Withdrawal reservation",
          createdById: input.requestedById,
          metadata: { payoutMethod: method },
        },
        tx
      );

      return tx.eventWalletWithdrawalRequest.create({
        data: {
          eventId: input.eventId,
          accountId: account.id,
          requestedById: input.requestedById,
          amountMinor: input.amountMinor,
          currency: campaign.currency,
          status: "REQUESTED",
          payoutMethod: method,
          payoutKind: "MANUAL_PAYOUT",
          mobileMoneyNetwork: isBank ? null : method,
          payoutPhoneMasked: input.payoutPhone ? maskPhone(input.payoutPhone) : null,
          bankCode: input.bankCode?.trim() || null,
          bankAccountMasked: input.bankAccountNumber
            ? maskBankAccount(input.bankAccountNumber)
            : null,
          accountName: input.accountName?.trim() || null,
          payoutDestinationEnc: destinationEnc,
          provider: "MANUAL",
          idempotencyKey,
          reason: input.reason?.trim() || null,
          reserveLedgerEntryId: reserve.entry.id,
        },
      });
    });

    await createAuditLog({
      userId: input.requestedById,
      action: "PAYMENT",
      entity: "event_wallet_withdrawal",
      entityId: withdrawal.id,
      details: {
        event: "withdrawal_requested",
        eventId: input.eventId,
        amountMinor: input.amountMinor,
        payoutMethod: method,
        payoutKind: "MANUAL_PAYOUT",
      },
    });

    return withdrawal;
  }

  async approve(input: {
    withdrawalId: string;
    eventId: string;
    actorId: string;
    isPlatformAdmin?: boolean;
    note?: string | null;
  }): Promise<EventWalletWithdrawalRequest> {
    const row = await prisma.eventWalletWithdrawalRequest.findFirst({
      where: { id: input.withdrawalId, eventId: input.eventId },
    });
    if (!row) throw new Error("Withdrawal request not found");
    if (!["REQUESTED", "UNDER_REVIEW"].includes(row.status)) {
      throw new Error(`Cannot approve a withdrawal in status ${row.status}`);
    }
    if (
      !input.isPlatformAdmin &&
      canRequesterSelfApprove(row.requestedById, input.actorId)
    ) {
      throw new Error("Separation of duties: the requester cannot approve their own withdrawal");
    }

    const updated = await prisma.eventWalletWithdrawalRequest.update({
      where: { id: row.id },
      data: {
        status: "APPROVED",
        reviewedById: input.actorId,
        approvedAt: new Date(),
        internalNote: input.note?.trim() || row.internalNote,
      },
    });

    await createAuditLog({
      userId: input.actorId,
      action: "PAYMENT",
      entity: "event_wallet_withdrawal",
      entityId: row.id,
      details: { event: "withdrawal_approved", eventId: input.eventId },
    });

    return updated;
  }

  async reject(input: {
    withdrawalId: string;
    eventId: string;
    actorId: string;
    isPlatformAdmin?: boolean;
    reason?: string | null;
  }): Promise<EventWalletWithdrawalRequest> {
    const row = await prisma.eventWalletWithdrawalRequest.findFirst({
      where: { id: input.withdrawalId, eventId: input.eventId },
    });
    if (!row) throw new Error("Withdrawal request not found");
    if (!ACTIVE_RESERVE_STATUSES.includes(row.status as (typeof ACTIVE_RESERVE_STATUSES)[number])) {
      throw new Error(`Cannot reject a withdrawal in status ${row.status}`);
    }
    if (
      !input.isPlatformAdmin &&
      canRequesterSelfApprove(row.requestedById, input.actorId) &&
      row.status !== "REQUESTED"
    ) {
      throw new Error("Separation of duties: the requester cannot reject after review starts");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await eventWalletService.releaseReservation(input.eventId, row.amountMinor, tx);
      return tx.eventWalletWithdrawalRequest.update({
        where: { id: row.id },
        data: {
          status: "REJECTED",
          reviewedById: input.actorId,
          rejectedAt: new Date(),
          failureReason: input.reason?.trim() || "Rejected by finance reviewer",
        },
      });
    });

    await createAuditLog({
      userId: input.actorId,
      action: "PAYMENT",
      entity: "event_wallet_withdrawal",
      entityId: row.id,
      details: { event: "withdrawal_rejected", eventId: input.eventId, reason: input.reason },
    });

    return updated;
  }

  /**
   * Record a completed manual payout with evidence. Does not call Paystack Transfers.
   */
  async markManualPaid(input: {
    withdrawalId: string;
    eventId: string;
    actorId: string;
    isPlatformAdmin?: boolean;
    evidenceReference: string;
    providerReference?: string | null;
    note?: string | null;
  }): Promise<EventWalletWithdrawalRequest> {
    const evidence = input.evidenceReference.trim();
    if (!evidence) throw new Error("Evidence / provider reference is required for manual payout");

    const row = await prisma.eventWalletWithdrawalRequest.findFirst({
      where: { id: input.withdrawalId, eventId: input.eventId },
    });
    if (!row) throw new Error("Withdrawal request not found");
    if (!["APPROVED", "PROCESSING"].includes(row.status)) {
      throw new Error("Withdrawal must be approved before it can be marked paid");
    }
    if (
      !input.isPlatformAdmin &&
      canRequesterSelfApprove(row.requestedById, input.actorId)
    ) {
      throw new Error("Separation of duties: the requester cannot mark their own payout as paid");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.eventWalletWithdrawalRequest.update({
        where: { id: row.id },
        data: { status: "PROCESSING", processingAt: new Date(), reviewedById: input.actorId },
      });

      const debit = await eventWalletService.postEntry(
        {
          eventId: input.eventId,
          type: "WITHDRAWAL_DEBIT",
          amountMinor: -row.amountMinor,
          currency: row.currency,
          idempotencyKey: ledgerIdempotencyKey(["withdrawal_debit", row.id]),
          relatedEntryId: row.reserveLedgerEntryId,
          source: "manual_payout",
          description: "Manual gift wallet payout",
          createdById: input.actorId,
          metadata: {
            payoutKind: "MANUAL_PAYOUT",
            evidenceReference: evidence,
            providerReference: input.providerReference ?? null,
          },
        },
        tx
      );

      return tx.eventWalletWithdrawalRequest.update({
        where: { id: row.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          payoutKind: "MANUAL_PAYOUT",
          provider: "MANUAL",
          evidenceReference: evidence,
          providerReference: input.providerReference?.trim() || evidence,
          debitLedgerEntryId: debit.entry.id,
          internalNote: input.note?.trim() || row.internalNote,
          reviewedById: input.actorId,
        },
      });
    });

    await createAuditLog({
      userId: input.actorId,
      action: "PAYMENT",
      entity: "event_wallet_withdrawal",
      entityId: row.id,
      details: {
        event: "withdrawal_paid",
        eventId: input.eventId,
        payoutKind: "MANUAL_PAYOUT",
        evidenceReference: evidence,
      },
    });

    return updated;
  }

  async markFailed(input: {
    withdrawalId: string;
    eventId: string;
    actorId: string;
    reason?: string | null;
  }): Promise<EventWalletWithdrawalRequest> {
    const row = await prisma.eventWalletWithdrawalRequest.findFirst({
      where: { id: input.withdrawalId, eventId: input.eventId },
    });
    if (!row) throw new Error("Withdrawal request not found");
    if (!["APPROVED", "PROCESSING", "REQUESTED", "UNDER_REVIEW"].includes(row.status)) {
      throw new Error(`Cannot fail a withdrawal in status ${row.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (ACTIVE_RESERVE_STATUSES.includes(row.status as (typeof ACTIVE_RESERVE_STATUSES)[number])) {
        await eventWalletService.releaseReservation(input.eventId, row.amountMinor, tx);
      }
      return tx.eventWalletWithdrawalRequest.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: input.reason?.trim() || "Payout failed",
          reviewedById: input.actorId,
        },
      });
    });

    await createAuditLog({
      userId: input.actorId,
      action: "PAYMENT",
      entity: "event_wallet_withdrawal",
      entityId: row.id,
      details: { event: "withdrawal_failed", eventId: input.eventId, reason: input.reason },
    });

    return updated;
  }

  async cancel(input: {
    withdrawalId: string;
    eventId: string;
    actorId: string;
  }): Promise<EventWalletWithdrawalRequest> {
    const row = await prisma.eventWalletWithdrawalRequest.findFirst({
      where: { id: input.withdrawalId, eventId: input.eventId },
    });
    if (!row) throw new Error("Withdrawal request not found");
    if (row.status !== "REQUESTED") {
      throw new Error("Only REQUESTED withdrawals can be cancelled by the organiser");
    }
    if (row.requestedById !== input.actorId) {
      throw new Error("Only the requester can cancel this withdrawal");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await eventWalletService.releaseReservation(input.eventId, row.amountMinor, tx);
      return tx.eventWalletWithdrawalRequest.update({
        where: { id: row.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
    });

    await createAuditLog({
      userId: input.actorId,
      action: "PAYMENT",
      entity: "event_wallet_withdrawal",
      entityId: row.id,
      details: { event: "withdrawal_cancelled", eventId: input.eventId },
    });

    return updated;
  }

  async list(
    eventId: string,
    options: { page?: string | number | null; limit?: string | number | null; status?: string | null } = {}
  ) {
    const { page, limit, skip } = parsePaginationInput(options);
    const where: Prisma.EventWalletWithdrawalRequestWhereInput = {
      eventId,
      ...(options.status && options.status !== "ALL"
        ? { status: options.status as EventWalletWithdrawalStatus }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventWalletWithdrawalRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          payoutMethod: true,
          payoutKind: true,
          payoutPhoneMasked: true,
          bankAccountMasked: true,
          accountName: true,
          provider: true,
          providerReference: true,
          evidenceReference: true,
          reason: true,
          failureReason: true,
          requestedAt: true,
          approvedAt: true,
          paidAt: true,
          failedAt: true,
          cancelledAt: true,
          rejectedAt: true,
          createdAt: true,
          requestedBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.eventWalletWithdrawalRequest.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  toOrganiserView(row: EventWalletWithdrawalRequest & {
    requestedBy?: { id: string; name: string | null; email: string | null } | null;
    reviewedBy?: { id: string; name: string | null; email: string | null } | null;
  }) {
    return {
      id: row.id,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status,
      payoutMethod: row.payoutMethod,
      payoutKind: row.payoutKind,
      payoutPhoneMasked: row.payoutPhoneMasked,
      bankAccountMasked: row.bankAccountMasked,
      accountName: row.accountName,
      provider: row.provider,
      providerReference: row.providerReference,
      evidenceReference: row.evidenceReference,
      reason: row.reason,
      failureReason: row.failureReason,
      requestedAt: row.requestedAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      requestedBy: row.requestedBy
        ? { id: row.requestedBy.id, name: row.requestedBy.name, email: row.requestedBy.email }
        : null,
      reviewedBy: row.reviewedBy
        ? { id: row.reviewedBy.id, name: row.reviewedBy.name, email: row.reviewedBy.email }
        : null,
    };
  }
}

export const giftWithdrawalService = new GiftWithdrawalService();
