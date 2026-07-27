import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { eventWalletService } from "@/services/gifts/event-wallet.service";
import { giftReceiptService } from "@/services/gifts/gift-receipt.service";
import { ledgerIdempotencyKey } from "@/lib/gifts/tokens";
import { toMajorUnits } from "@/lib/gifts/money";

/**
 * Post-settlement gift events driven by the provider: chargebacks and refunds
 * that Paystack completes on its own side.
 *
 * Both write compensating ledger entries rather than editing history, and both
 * are idempotent so a repeated webhook is a no-op.
 */
export class GiftLifecycleService {
  /** A chargeback was raised — hold the money out of the available balance. */
  async markDisputed(reference: string, event: string): Promise<void> {
    const gift = await prisma.eventGiftPayment.findUnique({ where: { reference } });
    if (!gift) return;
    if (gift.status !== "SUCCESS") return;

    await prisma.$transaction(async (tx) => {
      await tx.eventGiftPayment.update({
        where: { id: gift.id },
        data: { status: "DISPUTED", providerStatus: event },
      });

      await eventWalletService.postEntry(
        {
          eventId: gift.eventId,
          type: "DISPUTE_HOLD",
          amountMinor: -gift.amountMinor,
          currency: gift.currency,
          idempotencyKey: ledgerIdempotencyKey(["gift_dispute", gift.id]),
          giftPaymentId: gift.id,
          source: "payment_webhook",
          description: `Dispute hold — ${gift.reference}`,
          metadata: { event },
        },
        tx
      );
    });

    await createAuditLog({
      action: "WEBHOOK",
      entity: "event_gift_payment",
      entityId: gift.id,
      details: { event, reference, action: "DISPUTE_HOLD" },
    });
  }

  /** Paystack finished a refund we (or they) initiated. */
  async markProviderRefunded(reference: string): Promise<void> {
    const gift = await prisma.eventGiftPayment.findUnique({ where: { reference } });
    if (!gift) return;
    if (gift.status === "REVERSED") return;

    // An organiser-initiated refund already debited the ledger; this webhook is
    // just the confirmation, so there is nothing further to post.
    if (gift.status === "REFUNDED") {
      await prisma.eventGiftPayment.update({
        where: { id: gift.id },
        data: { providerStatus: "refund.processed" },
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.eventGiftPayment.update({
        where: { id: gift.id },
        data: {
          status: "REVERSED",
          providerStatus: "refund.processed",
          refundedAt: new Date(),
          refundAmountMinor: gift.amountMinor,
          refundReason: "Refunded at the provider",
        },
      });

      await eventWalletService.postEntry(
        {
          eventId: gift.eventId,
          type: "GIFT_REVERSAL",
          amountMinor: -gift.amountMinor,
          currency: gift.currency,
          idempotencyKey: ledgerIdempotencyKey(["gift_reversal", gift.id]),
          giftPaymentId: gift.id,
          source: "payment_webhook",
          description: `Gift reversed — ${gift.reference}`,
        },
        tx
      );

      if (gift.paymentId) {
        const wallet = await tx.wallet.findUnique({ where: { eventId: gift.eventId } });
        if (wallet) {
          const major = toMajorUnits(gift.amountMinor, gift.currency);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: major }, revenue: { decrement: major } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              eventId: gift.eventId,
              type: "gift_reversal",
              amount: -major,
              currency: gift.currency,
              source: "gift",
              reference: gift.reference,
              paymentId: gift.paymentId,
              description: `Gift reversed — ${gift.reference}`,
              isLocked: true,
            },
          });
        }
      }
    });

    await giftReceiptService.revokeForPayment(gift.id).catch(() => undefined);
    await createAuditLog({
      action: "WEBHOOK",
      entity: "event_gift_payment",
      entityId: gift.id,
      details: { reference, action: "PROVIDER_REFUND" },
    });
  }
}

export const giftLifecycleService = new GiftLifecycleService();
