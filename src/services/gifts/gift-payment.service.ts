import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import type { EventGiftPayment, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { createAuditLog } from "@/lib/audit";
import { paymentService, PaymentProviderError } from "@/services/payments/payment.service";
import { eventWalletService } from "@/services/gifts/event-wallet.service";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { giftReceiptService } from "@/services/gifts/gift-receipt.service";
import {
  amountsMatch,
  formatMinor,
  parseSuggestedAmounts,
  toMajorUnits,
  validateGiftAmount,
} from "@/lib/gifts/money";
import {
  DEFAULT_SUGGESTED_AMOUNTS_MINOR,
  GIFT_TYPE_LABELS,
} from "@/lib/gifts/gift-copy";
import {
  generateGiftReference,
  hashIp,
  ledgerIdempotencyKey,
} from "@/lib/gifts/tokens";
import {
  getGiftPaymentMethod,
  isGiftPaymentMethodId,
  paystackChannelsFor,
  type GiftPaymentMethodId,
} from "@/lib/gifts/gift-providers";
import { giftPaymentUiState, type PublicGiftPaymentView } from "@/lib/gifts/gift-privacy";
import {
  detectGiftVerificationMismatch,
  sanitizeCompanionReturnUrl,
} from "@/lib/gifts/gift-placement";
import { assertGuestGiftPaymentsAllowed } from "@/lib/gifts/gift-guest-access";

/**
 * Gift payments.
 *
 * The rule this whole file exists to enforce: a gift is only ever "successful"
 * after Paystack has told us so on a server-to-server call whose reference,
 * currency and minor-unit amount all match the pending record we wrote before
 * the guest was sent to the checkout. A redirect back to our callback URL, a
 * client-side poll, or an unverified webhook body are all treated as hints that
 * it is time to go and ask the provider — never as proof of payment.
 */

export class GiftPaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GiftPaymentError";
    this.status = status;
  }
}

export interface InitializeGiftInput {
  publicToken: string;
  amountMinor: number;
  method: GiftPaymentMethodId | string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestMessage?: string | null;
  isAnonymous?: boolean;
  guestToken?: string | null;
  /** Safe relative companion path for post-success return (never absolute). */
  companionReturnUrl?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface InitializeGiftResult {
  reference: string;
  authorizationUrl: string;
  statusUrl: string;
  amountMinor: number;
  currency: string;
  method: GiftPaymentMethodId;
}

const FULFILMENT_SOURCES = ["payment_webhook", "guest_verify", "organiser_verify"] as const;
export type FulfilmentSource = (typeof FULFILMENT_SOURCES)[number];

export class GiftPaymentService {
  async initialize(input: InitializeGiftInput): Promise<InitializeGiftResult> {
    const context = await giftCampaignService.getByPublicToken(input.publicToken);
    if (!context) throw new GiftPaymentError("This gift link is not available", 404);

    const { campaign, event } = context;

    // Feature must be ON for this event — UI hide alone is not enough.
    const access = await assertGuestGiftPaymentsAllowed(event.id);
    if (!access.ok) throw new GiftPaymentError(access.message, access.status);

    const closed = giftCampaignService.resolveClosedReason(campaign);
    if (closed) throw new GiftPaymentError(closed, 409);

    if (!isGiftPaymentMethodId(input.method)) {
      throw new GiftPaymentError("Choose a valid payment method", 400);
    }
    const method = getGiftPaymentMethod(input.method);
    if (!method.enabled) {
      throw new GiftPaymentError(`${method.label} is temporarily unavailable`, 503);
    }

    const validation = validateGiftAmount(input.amountMinor, {
      minAmountMinor: campaign.minAmountMinor,
      maxAmountMinor: campaign.maxAmountMinor,
      allowCustomAmount: campaign.allowCustomAmount,
      suggestedAmountsMinor: parseSuggestedAmounts(
        campaign.suggestedAmounts,
        DEFAULT_SUGGESTED_AMOUNTS_MINOR
      ),
      currency: campaign.currency,
    });
    if (!validation.ok) throw new GiftPaymentError(validation.error, 400);

    const guest = await giftCampaignService.resolvePersonalisedGuest(campaign, input.guestToken);
    const isAnonymous = Boolean(input.isAnonymous) && campaign.allowAnonymous;
    const guestName = isAnonymous ? null : (input.guestName?.trim() || guest?.name || null);
    const guestEmail = input.guestEmail?.trim().toLowerCase() || guest?.email || null;
    const guestPhone = input.guestPhone?.trim() || guest?.phone || null;

    if (campaign.requireGuestName && !isAnonymous && !guestName) {
      throw new GiftPaymentError("Please tell the host who the gift is from", 400);
    }
    if (campaign.requireGuestContact && !guestEmail && !guestPhone) {
      throw new GiftPaymentError("Please add an email or phone number for your receipt", 400);
    }

    const guestMessage = campaign.allowGuestMessage
      ? input.guestMessage?.trim().slice(0, 500) || null
      : null;

    const companionReturnUrl = sanitizeCompanionReturnUrl(input.companionReturnUrl);

    // Paystack requires an email; when a guest only gives a phone number we use
    // a non-routable placeholder rather than inventing a deliverable address.
    const receiptEmail = guestEmail ?? `gift-${Date.now()}@guests.celeventic.com`;
    const reference = generateGiftReference();
    const baseUrl = await getServerAppUrl();
    const statusUrl = `${baseUrl}/gift/${campaign.publicToken}/status/${reference}`;

    // Pending record first: if the provider call fails, times out, or the guest
    // abandons the checkout, we still hold a durable record to reconcile.
    const gift = await prisma.eventGiftPayment.create({
      data: {
        campaignId: campaign.id,
        eventId: event.id,
        guestId: guest?.id,
        userId: input.userId ?? undefined,
        reference,
        provider: "PAYSTACK",
        channel: method.channel,
        providerChannelHint: method.paystackProvider,
        giftType: campaign.giftType,
        status: "PENDING",
        currency: campaign.currency,
        amountMinor: validation.amountMinor,
        netAmountMinor: validation.amountMinor,
        guestName,
        guestEmail,
        guestPhone,
        guestMessage,
        isAnonymous,
        ipHash: hashIp(input.ip),
        userAgent: input.userAgent?.slice(0, 300),
        metadata: {
          method: method.id,
          qrMode: campaign.qrMode,
          ...(companionReturnUrl ? { companionReturnUrl } : {}),
        },
      },
    });

    try {
      const result = await paymentService.initializePayment(
        input.userId ?? undefined,
        "PAYSTACK",
        "EVENT_GIFT",
        {
          amount: toMajorUnits(validation.amountMinor, campaign.currency),
          currency: campaign.currency,
          email: receiptEmail,
          purpose: "EVENT_GIFT",
          channels: paystackChannelsFor(method.id),
          callbackUrl: statusUrl,
          metadata: {
            giftPaymentId: gift.id,
            giftCampaignId: campaign.id,
            eventId: event.id,
            giftType: campaign.giftType,
            amountMinor: validation.amountMinor,
            currency: campaign.currency,
            method: method.id,
            description: `${GIFT_TYPE_LABELS[campaign.giftType]} — ${event.title}`,
          },
        },
        { reference }
      );

      if (!result.authorizationUrl) {
        throw new PaymentProviderError("Payment provider did not return a checkout link");
      }

      await prisma.eventGiftPayment.update({
        where: { id: gift.id },
        data: {
          paymentId: result.payment.id,
          authorizationUrl: result.authorizationUrl,
          status: "PROCESSING",
        },
      });

      return {
        reference,
        authorizationUrl: result.authorizationUrl,
        statusUrl,
        amountMinor: validation.amountMinor,
        currency: campaign.currency,
        method: method.id,
      };
    } catch (error) {
      await prisma.eventGiftPayment.update({
        where: { id: gift.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason:
            error instanceof Error ? error.message.slice(0, 300) : "Could not start payment",
        },
      });
      if (error instanceof PaymentProviderError) {
        throw new GiftPaymentError(
          "Gifting is temporarily unavailable. Please try again shortly.",
          503
        );
      }
      throw error;
    }
  }

  async findByReference(reference: string): Promise<EventGiftPayment | null> {
    if (typeof reference !== "string" || reference.length < 8 || reference.length > 128) {
      return null;
    }
    return prisma.eventGiftPayment.findUnique({ where: { reference } });
  }

  /**
   * Ask the provider what really happened, then credit exactly once.
   *
   * Safe to call from the webhook, from the guest's status poll, and from an
   * organiser's manual reconcile — concurrently. The ledger's unique
   * idempotency key is the backstop that makes all three paths converge on one
   * credit.
   */
  async fulfilFromProvider(
    reference: string,
    source: FulfilmentSource
  ): Promise<{ status: EventGiftPayment["status"]; gift: EventGiftPayment }> {
    const gift = await this.findByReference(reference);
    if (!gift) throw new GiftPaymentError("Gift not found", 404);

    if (gift.status === "SUCCESS") {
      return { status: gift.status, gift };
    }
    if (["REFUNDED", "REVERSED", "DISPUTED"].includes(gift.status)) {
      return { status: gift.status, gift };
    }

    const adapter = paymentService.getAdapter(gift.provider);
    if (!adapter.verifyTransactionDetailed) {
      throw new GiftPaymentError("This provider cannot verify gift payments", 500);
    }

    const verification = await adapter.verifyTransactionDetailed(reference);

    if (verification.status === "pending") {
      if (gift.status === "PENDING") {
        await prisma.eventGiftPayment.update({
          where: { id: gift.id },
          data: { status: "PROCESSING", providerStatus: verification.status },
        });
      }
      const refreshed = await prisma.eventGiftPayment.findUniqueOrThrow({ where: { id: gift.id } });
      return { status: refreshed.status, gift: refreshed };
    }

    if (verification.status === "failed") {
      const failed = await this.markFailed(gift.id, verification.gatewayResponse ?? "Payment failed");
      return { status: failed.status, gift: failed };
    }

    // Success claimed — now prove it matches what we asked for.
    const mismatch = this.detectMismatch(gift, verification);
    if (mismatch) {
      await prisma.eventGiftPayment.update({
        where: { id: gift.id },
        data: {
          status: "DISPUTED",
          providerStatus: verification.status,
          failureReason: mismatch.slice(0, 300),
        },
      });
      await createAuditLog({
        action: "PAYMENT",
        entity: "event_gift_payment",
        entityId: gift.id,
        details: { reference, mismatch, source },
      });
      throw new GiftPaymentError(
        "We could not confirm this gift. Our team has been alerted.",
        409
      );
    }

    const feeMinor = Math.max(0, verification.feesMinor);
    const netAmountMinor = Math.max(0, gift.amountMinor - feeMinor);
    const paidAt = verification.paidAt ? new Date(verification.paidAt) : new Date();

    const credited = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction so two concurrent webhooks cannot both
      // decide they are the first to credit.
      const current = await tx.eventGiftPayment.findUniqueOrThrow({ where: { id: gift.id } });
      if (current.status === "SUCCESS") return current;

      const updated = await tx.eventGiftPayment.update({
        where: { id: gift.id },
        data: {
          status: "SUCCESS",
          providerStatus: verification.status,
          providerReference: verification.reference,
          channel:
            verification.channel === "card"
              ? "CARD"
              : verification.channel === "mobile_money"
                ? "MOBILE_MONEY"
                : verification.channel === "bank_transfer"
                  ? "BANK_TRANSFER"
                  : current.channel,
          feeMinor,
          netAmountMinor,
          paidAt,
          verifiedAt: new Date(),
          failureReason: null,
        },
      });

      await eventWalletService.postEntry(
        {
          eventId: updated.eventId,
          type: "GIFT_CREDIT",
          amountMinor: updated.amountMinor,
          currency: updated.currency,
          idempotencyKey: ledgerIdempotencyKey(["gift_credit", updated.id]),
          giftPaymentId: updated.id,
          source,
          description: `${GIFT_TYPE_LABELS[updated.giftType]} — ${updated.reference}`,
          metadata: { feeMinor, netAmountMinor, provider: updated.provider },
        },
        tx
      );

      await this.mirrorToLegacyWallet(tx, updated, feeMinor);
      return updated;
    });

    if (credited.status !== "SUCCESS") {
      return { status: credited.status, gift: credited };
    }

    // Receipt + notification are deliberately outside the money transaction: a
    // slow mail provider must never be able to roll back a credited gift.
    await giftReceiptService.ensureReceipt(credited.id).catch((error) => {
      console.error("[gifts.receipt]", error);
    });
    await this.notifyGiftReceived(credited).catch((error) => {
      console.error("[gifts.notify]", error);
    });
    await createAuditLog({
      action: "PAYMENT",
      entity: "event_gift_payment",
      entityId: credited.id,
      details: {
        reference: credited.reference,
        amountMinor: credited.amountMinor,
        currency: credited.currency,
        source,
      },
    });

    return { status: credited.status, gift: credited };
  }

  private detectMismatch(
    gift: EventGiftPayment,
    verification: { reference: string; amountMinor: number; currency: string }
  ): string | null {
    return detectGiftVerificationMismatch(
      {
        reference: gift.reference,
        amountMinor: gift.amountMinor,
        currency: gift.currency,
      },
      verification,
      amountsMatch
    );
  }

  /**
   * Mirror the gift into the legacy event wallet so the existing wallet page,
   * CSV export and withdrawal flows keep showing one coherent event balance.
   * Idempotent on (paymentId, type) exactly like walletService.recordRevenue.
   */
  private async mirrorToLegacyWallet(
    tx: Prisma.TransactionClient,
    gift: EventGiftPayment,
    feeMinor: number
  ) {
    if (!gift.paymentId) return;

    const existing = await tx.walletTransaction.findFirst({
      where: { paymentId: gift.paymentId, type: "event_gift" },
    });
    if (existing) return;

    let wallet = await tx.wallet.findUnique({ where: { eventId: gift.eventId } });
    if (!wallet) {
      wallet = await tx.wallet.create({ data: { eventId: gift.eventId } });
    }

    const gross = toMajorUnits(gift.amountMinor, gift.currency);
    const fee = toMajorUnits(feeMinor, gift.currency);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: gross },
        revenue: { increment: gross },
        ...(fee > 0 ? { expenses: { increment: fee } } : {}),
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        eventId: gift.eventId,
        type: "event_gift",
        amount: gross,
        currency: gift.currency,
        source: "gift",
        reference: gift.reference,
        paymentId: gift.paymentId,
        description: `${GIFT_TYPE_LABELS[gift.giftType]} — ${gift.reference}`,
        isLocked: true,
      },
    });

    if (fee > 0) {
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          eventId: gift.eventId,
          type: "gift_processing_fee",
          amount: -fee,
          currency: gift.currency,
          source: "gift",
          reference: gift.reference,
          paymentId: gift.paymentId,
          description: `Processing fee — ${gift.reference}`,
          isLocked: true,
        },
      });
    }
  }

  async markFailed(giftPaymentId: string, reason: string): Promise<EventGiftPayment> {
    return prisma.eventGiftPayment.update({
      where: { id: giftPaymentId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: reason.slice(0, 300),
      },
    });
  }

  /** Called by the shared payment webhook when a gift transaction fails. */
  async markFailedFromProvider(reference: string, status: PaymentStatus): Promise<void> {
    const gift = await this.findByReference(reference);
    if (!gift || gift.status === "SUCCESS") return;
    if (["REFUNDED", "REVERSED", "DISPUTED", "FAILED"].includes(gift.status)) return;
    await this.markFailed(gift.id, `Provider reported ${status}`);
  }

  /** Sweep stale checkouts so a guest's pending screen resolves. */
  async expireStalePending(olderThanMinutes = 45): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const result = await prisma.eventGiftPayment.updateMany({
      where: { status: { in: ["PENDING", "PROCESSING"] }, createdAt: { lt: cutoff } },
      data: {
        status: "ABANDONED",
        failedAt: new Date(),
        failureReason: "Checkout was not completed",
      },
    });
    return result.count;
  }

  /**
   * Organiser-initiated refund. Writes a compensating REFUND_DEBIT rather than
   * editing the original credit — the gift and its reversal both stay on the
   * record forever.
   */
  async refund(input: {
    giftPaymentId: string;
    actorId: string;
    reason: string;
    amountMinor?: number;
  }): Promise<EventGiftPayment> {
    const gift = await prisma.eventGiftPayment.findUnique({
      where: { id: input.giftPaymentId },
    });
    if (!gift) throw new GiftPaymentError("Gift not found", 404);
    if (gift.status !== "SUCCESS") {
      throw new GiftPaymentError("Only a confirmed gift can be refunded", 409);
    }

    const amountMinor = input.amountMinor ?? gift.amountMinor;
    if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > gift.amountMinor) {
      throw new GiftPaymentError("Refund amount is invalid", 400);
    }

    await this.requestProviderRefund(gift, amountMinor, input.reason);

    const refunded = await prisma.$transaction(async (tx) => {
      const updated = await tx.eventGiftPayment.update({
        where: { id: gift.id },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
          refundAmountMinor: amountMinor,
          refundReason: input.reason.slice(0, 300),
          refundedById: input.actorId,
        },
      });

      await eventWalletService.postEntry(
        {
          eventId: updated.eventId,
          type: "REFUND_DEBIT",
          amountMinor: -amountMinor,
          currency: updated.currency,
          idempotencyKey: ledgerIdempotencyKey(["gift_refund", updated.id, amountMinor]),
          giftPaymentId: updated.id,
          source: "organiser_refund",
          description: `Refund — ${updated.reference}`,
          createdById: input.actorId,
          metadata: { reason: input.reason.slice(0, 300) },
        },
        tx
      );

      if (updated.paymentId) {
        const wallet = await tx.wallet.findUnique({ where: { eventId: updated.eventId } });
        if (wallet) {
          const major = toMajorUnits(amountMinor, updated.currency);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: major }, revenue: { decrement: major } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              eventId: updated.eventId,
              type: "gift_refund",
              amount: -major,
              currency: updated.currency,
              source: "gift",
              reference: updated.reference,
              paymentId: updated.paymentId,
              description: `Gift refund — ${updated.reference}`,
              isLocked: true,
              createdBy: input.actorId,
            },
          });
        }
        await tx.payment.update({
          where: { id: updated.paymentId },
          data: { status: "REFUNDED" },
        });
      }

      return updated;
    });

    await giftReceiptService.revokeForPayment(refunded.id).catch(() => undefined);
    await createAuditLog({
      userId: input.actorId,
      action: "PAYMENT",
      entity: "event_gift_payment",
      entityId: refunded.id,
      details: { reference: refunded.reference, amountMinor, reason: input.reason },
    });

    return refunded;
  }

  private async requestProviderRefund(
    gift: EventGiftPayment,
    amountMinor: number,
    reason: string
  ): Promise<void> {
    if (gift.provider !== "PAYSTACK") {
      throw new GiftPaymentError(
        `${gift.provider} refunds must be issued from the provider dashboard`,
        501
      );
    }

    const { getProviderSecret, isProviderEnabled } = await import(
      "@/lib/integrations/integration-runtime"
    );
    if (!(await isProviderEnabled("PAYSTACK"))) {
      throw new GiftPaymentError("Paystack is not configured", 503);
    }
    const secret = await getProviderSecret("PAYSTACK");
    if (!secret) throw new GiftPaymentError("Paystack is not configured", 503);

    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction: gift.reference,
        amount: amountMinor,
        merchant_note: reason.slice(0, 200),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string };
    if (!res.ok || body.status === false) {
      throw new GiftPaymentError(
        body.message || "The provider rejected this refund request",
        502
      );
    }
  }

  /** The only shape a guest ever sees of their own gift. */
  async toPublicView(
    gift: EventGiftPayment,
    options: { publicToken: string; baseUrl: string }
  ): Promise<PublicGiftPaymentView> {
    const state = giftPaymentUiState(gift.status);
    const receiptToken =
      state === "success" ? await giftReceiptService.tokenForPayment(gift.id) : null;

    const meta = gift.metadata as {
      method?: string;
      companionReturnUrl?: string;
    } | null;
    const methodId = meta?.method ?? null;
    const companionReturnUrl = sanitizeCompanionReturnUrl(meta?.companionReturnUrl);

    return {
      reference: gift.reference,
      status: gift.status,
      state,
      amountMinor: gift.amountMinor,
      currency: gift.currency,
      giftType: gift.giftType,
      createdAt: gift.createdAt.toISOString(),
      paidAt: gift.paidAt ? gift.paidAt.toISOString() : null,
      method: methodId,
      guestName: gift.isAnonymous ? null : gift.guestName,
      isAnonymous: gift.isAnonymous,
      receiptUrl: receiptToken ? `${options.baseUrl}/gift/receipt/${receiptToken}` : null,
      companionReturnUrl,
      failureReason:
        state === "failed" ? gift.failureReason ?? "This payment did not go through" : null,
    };
  }

  private async notifyGiftReceived(gift: EventGiftPayment): Promise<void> {
    const [{ notificationService }, event] = await Promise.all([
      import("@/services/notifications/notification.service"),
      prisma.event.findUnique({
        where: { id: gift.eventId },
        select: { title: true, organizerId: true },
      }),
    ]);
    if (!event) return;

    const amount = formatMinor(gift.amountMinor, gift.currency);
    const from = gift.isAnonymous ? "an anonymous guest" : gift.guestName || "a guest";

    await notificationService.notify(event.organizerId, {
      type: "GIFT_RECEIVED",
      title: `New ${GIFT_TYPE_LABELS[gift.giftType].toLowerCase()} received`,
      message: `${amount} from ${from} for ${event.title}.`,
      link: `/dashboard/gifts?event=${gift.eventId}`,
    });
  }
}

export const giftPaymentService = new GiftPaymentService();
