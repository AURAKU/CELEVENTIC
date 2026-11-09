import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToMinorUnits, minorToDecimalString } from "@/lib/gifts/money";
import { eventWalletService } from "@/services/gifts/event-wallet.service";
import {
  postTicketRefund,
  postTicketSale,
  readTicketCommissionPercent,
} from "@/services/tickets/ticket-ledger.service";

export interface RecordTransactionOptions {
  createdBy?: string;
  paymentId?: string;
  reference?: string;
  source?: string;
  isLocked?: boolean;
  currency?: string;
}

export class WalletService {
  async getOrCreateEventWallet(eventId: string) {
    const existing = await prisma.wallet.findUnique({ where: { eventId } });
    if (existing) return existing;
    return prisma.wallet.create({ data: { eventId } });
  }

  async recordRevenue(
    eventId: string,
    amount: number,
    description: string,
    type = "revenue",
    opts?: RecordTransactionOptions
  ) {
    if (opts?.paymentId) {
      const existing = await prisma.walletTransaction.findFirst({
        where: { paymentId: opts.paymentId, type },
      });
      if (existing) return existing;
    }

    const wallet = await this.getOrCreateEventWallet(eventId);
    return prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          revenue: { increment: amount },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          eventId,
          type,
          amount,
          description,
          currency: opts?.currency ?? wallet.currency,
          source: opts?.source ?? "manual",
          reference: opts?.reference,
          paymentId: opts?.paymentId,
          isLocked: opts?.isLocked ?? false,
          createdBy: opts?.createdBy,
        },
      }),
    ]);
  }

  async recordExpense(
    eventId: string,
    category: string,
    amount: number,
    description?: string,
    createdBy?: string
  ) {
    const wallet = await this.getOrCreateEventWallet(eventId);
    return prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          expenses: { increment: amount },
        },
      }),
      prisma.eventExpense.create({
        data: { eventId, walletId: wallet.id, category, amount, description },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          eventId,
          type: "expense",
          amount: -amount,
          description: description ?? category,
          source: "manual",
          createdBy,
        },
      }),
    ]);
  }

  async settlePayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { ticketOrder: true },
    });
    if (!payment || payment.status !== "SUCCESSFUL") return null;

    const metadata = payment.metadata as Record<string, unknown> | null;
    const eventId =
      payment.ticketOrder?.eventId ??
      (typeof metadata?.eventId === "string" ? metadata.eventId : undefined);

    if (!eventId) return null;

    if (payment.purpose === "TICKET_PURCHASE") {
      return this.settleTicketPayment(eventId, {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference,
        ticketOrderId: payment.ticketOrderId,
      });
    }

    const amount = Number(payment.amount);
    const typeMap: Record<string, string> = {
      CONTRIBUTION: "contribution",
      VENDOR_BOOKING: "vendor_payment",
      BULK_MESSAGING: "platform_fee",
      ADVERTISING: "platform_fee",
      EVENT_PACKAGE: "income",
    };

    const txType = typeMap[payment.purpose] ?? "income";
    const description = `${payment.purpose.replace(/_/g, " ").toLowerCase()}: ${payment.reference}`;

    await this.recordRevenue(eventId, amount, description, txType, {
      paymentId: payment.id,
      reference: payment.reference,
      source: "payment",
      isLocked: true,
      currency: payment.currency,
    });

    return { eventId, amount, type: txType };
  }

  async settleTicketPayment(
    eventId: string,
    payment: {
      id: string;
      amount: unknown;
      currency: string;
      reference: string;
      ticketOrderId?: string | null;
    }
  ) {
    const existing = await prisma.walletTransaction.findFirst({
      where: { paymentId: payment.id, type: "ticket_revenue" },
    });
    if (existing) return { eventId, amount: Number(existing.amount), type: "ticket_revenue" };

    const commissionPercent = await readTicketCommissionPercent();
    const grossMinor = decimalToMinorUnits(payment.amount, payment.currency);
    const wallet = await this.getOrCreateEventWallet(eventId);

    const posted = await prisma.$transaction(async (tx) => {
      const sale = await postTicketSale(
        {
          eventId,
          paymentId: payment.id,
          orderId: payment.ticketOrderId,
          grossMinor,
          commissionPercent,
          currency: payment.currency,
          reference: payment.reference,
        },
        tx
      );

      if (sale.alreadyApplied) return sale;

      const netDecimal = new Prisma.Decimal(minorToDecimalString(sale.netMinor, payment.currency));
      const feeDecimal = new Prisma.Decimal(minorToDecimalString(sale.feeMinor, payment.currency));

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: netDecimal },
          revenue: { increment: netDecimal },
          ...(sale.feeMinor > 0 ? { expenses: { increment: feeDecimal } } : {}),
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          eventId,
          type: "ticket_revenue",
          amount: netDecimal,
          currency: payment.currency,
          source: "payment",
          reference: payment.reference,
          paymentId: payment.id,
          description: `Ticket sales: ${payment.reference}`,
          isLocked: true,
        },
      });
      if (sale.feeMinor > 0) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            eventId,
            type: "platform_fee",
            amount: feeDecimal.negated(),
            currency: payment.currency,
            source: "payment",
            reference: payment.reference,
            paymentId: payment.id,
            description: `Platform commission (${commissionPercent}%)`,
            isLocked: true,
          },
        });
      }

      return sale;
    });

    return {
      eventId,
      amount: posted.netMinor / 100,
      fee: posted.feeMinor / 100,
      netMinor: posted.netMinor,
      feeMinor: posted.feeMinor,
      alreadyApplied: posted.alreadyApplied,
      type: "ticket_revenue",
    };
  }

  async reverseTicketPayment(
    eventId: string,
    orderId: string,
    payment: { id: string; currency: string }
  ) {
    return prisma.$transaction(async (tx) => {
      return postTicketRefund(
        {
          eventId,
          orderId,
          paymentId: payment.id,
          currency: payment.currency,
        },
        tx
      );
    });
  }

  async getWalletSummary(
    eventId: string,
    options?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 10));
    const skip = (page - 1) * limit;

    const wallet = await prisma.wallet.findUnique({
      where: { eventId },
      include: {
        eventExpenses: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    const resolvedWallet = wallet ?? (await this.getOrCreateEventWallet(eventId));
    const walletBase = wallet
      ? wallet
      : await prisma.wallet.findUnique({
          where: { id: resolvedWallet.id },
          include: {
            eventExpenses: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        });

    const walletId = walletBase?.id ?? resolvedWallet.id;
    const [transactions, transactionTotal] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { creator: { select: { name: true } } },
      }),
      prisma.walletTransaction.count({ where: { walletId } }),
    ]);

    const contributions = await prisma.contribution.aggregate({
      where: { eventId },
      _sum: { amount: true },
      _count: true,
    });

    const revenue = Number(walletBase?.revenue ?? 0);
    const expenses = Number(walletBase?.expenses ?? 0);
    const balance = Number(walletBase?.balance ?? 0);
    const contributionTotal = Number(contributions._sum.amount ?? 0);
    const pages = Math.max(1, Math.ceil(transactionTotal / limit));

    const ticketLedger = await eventWalletService.reconcile(eventId, "TICKET").catch(() => null);

    return {
      wallet: {
        ...walletBase,
        transactions,
      },
      transactionsMeta: {
        total: transactionTotal,
        page,
        limit,
        pages,
        hasMore: page < pages,
      },
      contributions: { total: contributionTotal, count: contributions._count },
      profitLoss: {
        revenue,
        expenses,
        balance,
        netProfit: revenue - expenses,
        contributionTotal,
      },
      ticketLedger: ticketLedger
        ? {
            balanceMinor: ticketLedger.ledgerBalanceMinor,
            projectedMinor: ticketLedger.accountBalanceMinor,
            drifted: ticketLedger.drifted,
            entryCount: ticketLedger.entryCount,
          }
        : null,
    };
  }

  async exportTransactionsCsv(eventId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { eventId } });
    if (!wallet) return "date,type,amount,source,description,created_by\n";

    const txs = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { name: true } } },
    });

    const header = "date,type,amount,source,description,created_by,locked\n";
    const rows = txs.map((t) =>
      [
        t.createdAt.toISOString(),
        t.type,
        Number(t.amount),
        t.source,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
        t.creator?.name ?? "",
        t.isLocked,
      ].join(",")
    );
    return header + rows.join("\n");
  }
}

export const walletService = new WalletService();
