import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decimalToMinorUnits,
  GIFT_DEFAULT_CURRENCY,
  minorToDecimalString,
} from "@/lib/gifts/money";
import {
  eventWalletService,
  type LedgerTxClient,
} from "@/services/gifts/event-wallet.service";

/**
 * Ticket revenue uses the same EventWallet ledger as gifts, on a separate TICKET
 * book. Gift cash and ticket cash never share a balance. Live payouts stay off.
 */

export const DEFAULT_TICKET_COMMISSION_PERCENT = 5;

export function ticketGrossIdempotencyKey(paymentId: string) {
  return `ticket_gross:payment:${paymentId}`;
}

export function ticketFeeIdempotencyKey(paymentId: string) {
  return `ticket_fee:payment:${paymentId}`;
}

export function ticketRefundGrossIdempotencyKey(orderId: string) {
  return `ticket_refund_gross:order:${orderId}`;
}

export function ticketRefundFeeIdempotencyKey(orderId: string) {
  return `ticket_refund_fee:order:${orderId}`;
}

export function splitTicketRevenue(
  grossMinor: number,
  commissionPercent: number = DEFAULT_TICKET_COMMISSION_PERCENT
): { feeMinor: number; netMinor: number } {
  if (!Number.isInteger(grossMinor) || grossMinor < 0) {
    throw new Error("Gross amount must be a non-negative integer in minor units");
  }
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    throw new Error("Commission percent must be between 0 and 100");
  }
  const feeMinor = Math.min(grossMinor, Math.max(0, Math.round((grossMinor * commissionPercent) / 100)));
  return { feeMinor, netMinor: grossMinor - feeMinor };
}

export async function readTicketCommissionPercent(): Promise<number> {
  const setting = await prisma.adminSetting.findUnique({
    where: { key: "pricing.ticket_commission" },
  });
  const pct = (setting?.value as { percent?: number } | null)?.percent;
  if (typeof pct === "number" && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
    return pct;
  }
  return DEFAULT_TICKET_COMMISSION_PERCENT;
}

export interface PostTicketSaleInput {
  eventId: string;
  paymentId: string;
  orderId?: string | null;
  grossMinor: number;
  commissionPercent?: number;
  currency?: string;
  reference?: string;
}

export interface TicketLedgerPostResult {
  alreadyApplied: boolean;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  balanceMinor: number;
}

export async function postTicketSale(
  input: PostTicketSaleInput,
  client: LedgerTxClient = prisma
): Promise<TicketLedgerPostResult> {
  const currency = input.currency ?? GIFT_DEFAULT_CURRENCY;
  const commissionPercent = input.commissionPercent ?? DEFAULT_TICKET_COMMISSION_PERCENT;
  const { feeMinor, netMinor } = splitTicketRevenue(input.grossMinor, commissionPercent);

  if (input.grossMinor === 0) {
    const account = await eventWalletService.getOrCreateAccount(
      input.eventId,
      currency,
      client,
      "TICKET"
    );
    return {
      alreadyApplied: true,
      grossMinor: 0,
      feeMinor: 0,
      netMinor: 0,
      balanceMinor: account.balanceMinor,
    };
  }

  const metadata: Prisma.InputJsonValue = {
    paymentId: input.paymentId,
    orderId: input.orderId ?? null,
    grossMinor: input.grossMinor,
    feeMinor,
    netMinor,
    commissionPercent,
  };

  const gross = await eventWalletService.postEntry(
    {
      eventId: input.eventId,
      book: "TICKET",
      type: "TICKET_GROSS_CREDIT",
      amountMinor: input.grossMinor,
      currency,
      idempotencyKey: ticketGrossIdempotencyKey(input.paymentId),
      source: "payment",
      description: input.reference ? `Ticket sales: ${input.reference}` : "Ticket sales",
      metadata,
    },
    client
  );

  if (feeMinor > 0) {
    await eventWalletService.postEntry(
      {
        eventId: input.eventId,
        book: "TICKET",
        type: "TICKET_COMMISSION_DEBIT",
        amountMinor: -feeMinor,
        currency,
        idempotencyKey: ticketFeeIdempotencyKey(input.paymentId),
        relatedEntryId: gross.entry.id,
        source: "payment",
        description: `Platform commission (${commissionPercent}%)`,
        metadata,
      },
      client
    );
  }

  const account = await eventWalletService.getOrCreateAccount(
    input.eventId,
    currency,
    client,
    "TICKET"
  );

  return {
    alreadyApplied: gross.alreadyApplied,
    grossMinor: input.grossMinor,
    feeMinor,
    netMinor,
    balanceMinor: account.balanceMinor,
  };
}

export async function postTicketRefund(
  input: {
    eventId: string;
    orderId: string;
    paymentId: string;
    currency?: string;
  },
  client: LedgerTxClient = prisma
): Promise<TicketLedgerPostResult> {
  const currency = input.currency ?? GIFT_DEFAULT_CURRENCY;
  const original = await client.eventWalletLedgerEntry.findUnique({
    where: { idempotencyKey: ticketGrossIdempotencyKey(input.paymentId) },
  });

  if (!original) {
    const account = await eventWalletService.getOrCreateAccount(
      input.eventId,
      currency,
      client,
      "TICKET"
    );
    return {
      alreadyApplied: true,
      grossMinor: 0,
      feeMinor: 0,
      netMinor: 0,
      balanceMinor: account.balanceMinor,
    };
  }

  const meta = (original.metadata ?? {}) as {
    feeMinor?: number;
    netMinor?: number;
    commissionPercent?: number;
  };
  const grossMinor = original.amountMinor;
  const feeMinor =
    typeof meta.feeMinor === "number" && Number.isInteger(meta.feeMinor)
      ? meta.feeMinor
      : 0;
  const netMinor = grossMinor - feeMinor;

  // Reverse commission first so the subsequent gross debit cannot dip the book
  // below zero (sale net is gross - fee).
  if (feeMinor > 0) {
    await eventWalletService.postEntry(
      {
        eventId: input.eventId,
        book: "TICKET",
        type: "TICKET_COMMISSION_REVERSAL",
        amountMinor: feeMinor,
        currency,
        idempotencyKey: ticketRefundFeeIdempotencyKey(input.orderId),
        relatedEntryId: original.id,
        source: "refund",
        description: "Platform commission reversal",
        metadata: {
          paymentId: input.paymentId,
          orderId: input.orderId,
          feeMinor,
        },
      },
      client
    );
  }

  const refund = await eventWalletService.postEntry(
    {
      eventId: input.eventId,
      book: "TICKET",
      type: "TICKET_REFUND_DEBIT",
      amountMinor: -grossMinor,
      currency,
      idempotencyKey: ticketRefundGrossIdempotencyKey(input.orderId),
      relatedEntryId: original.id,
      source: "refund",
      description: `Ticket refund: ${input.orderId}`,
      metadata: {
        paymentId: input.paymentId,
        orderId: input.orderId,
        grossMinor,
        feeMinor,
        netMinor,
      },
    },
    client
  );

  const account = await eventWalletService.getOrCreateAccount(
    input.eventId,
    currency,
    client,
    "TICKET"
  );

  return {
    alreadyApplied: refund.alreadyApplied,
    grossMinor,
    feeMinor,
    netMinor,
    balanceMinor: account.balanceMinor,
  };
}

export function paymentMatchesTicketOrder(params: {
  orderAmount: unknown;
  orderCurrency: string;
  paymentAmount: unknown;
  paymentCurrency: string;
}): { ok: true; amountMinor: number } | { ok: false; error: string } {
  const orderCurrency = params.orderCurrency.toUpperCase();
  const paymentCurrency = params.paymentCurrency.toUpperCase();
  if (orderCurrency !== paymentCurrency) {
    return { ok: false, error: "Payment currency does not match the ticket order" };
  }
  try {
    const orderMinor = decimalToMinorUnits(params.orderAmount, orderCurrency);
    const paymentMinor = decimalToMinorUnits(params.paymentAmount, paymentCurrency);
    if (orderMinor !== paymentMinor) {
      return { ok: false, error: "Payment amount does not match the ticket order" };
    }
    return { ok: true, amountMinor: paymentMinor };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Payment amount is invalid",
    };
  }
}

export { decimalToMinorUnits, minorToDecimalString };
