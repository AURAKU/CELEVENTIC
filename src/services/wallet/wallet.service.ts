import { prisma } from "@/lib/prisma";

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
      return this.settleTicketPayment(eventId, payment);
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
    const description = `${payment.purpose.replace(/_/g, " ").toLowerCase()} — ${payment.reference}`;

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
    payment: { id: string; amount: unknown; currency: string; reference: string }
  ) {
    const existing = await prisma.walletTransaction.findFirst({
      where: { paymentId: payment.id, type: "ticket_revenue" },
    });
    if (existing) return { eventId, amount: Number(existing.amount), type: "ticket_revenue" };

    const setting = await prisma.adminSetting.findUnique({
      where: { key: "pricing.ticket_commission" },
    });
    const pct = (setting?.value as { percent?: number })?.percent ?? 5;
    const gross = Number(payment.amount);
    const fee = Math.round(gross * pct) / 100;
    const net = gross - fee;
    const wallet = await this.getOrCreateEventWallet(eventId);

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: net },
          revenue: { increment: net },
          ...(fee > 0 ? { expenses: { increment: fee } } : {}),
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          eventId,
          type: "ticket_revenue",
          amount: net,
          currency: payment.currency,
          source: "payment",
          reference: payment.reference,
          paymentId: payment.id,
          description: `Ticket sales — ${payment.reference}`,
          isLocked: true,
        },
      }),
      ...(fee > 0
        ? [
            prisma.walletTransaction.create({
              data: {
                walletId: wallet.id,
                eventId,
                type: "platform_fee",
                amount: -fee,
                currency: payment.currency,
                source: "payment",
                reference: payment.reference,
                paymentId: payment.id,
                description: `Platform commission (${pct}%)`,
                isLocked: true,
              },
            }),
          ]
        : []),
    ]);

    return { eventId, amount: net, fee, type: "ticket_revenue" };
  }

  async getWalletSummary(eventId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { eventId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { creator: { select: { name: true } } },
        },
        eventExpenses: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    const resolvedWallet = wallet ?? (await this.getOrCreateEventWallet(eventId));
    const walletWithRelations = wallet
      ? wallet
      : await prisma.wallet.findUnique({
          where: { id: resolvedWallet.id },
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 50,
              include: { creator: { select: { name: true } } },
            },
            eventExpenses: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        });

    const contributions = await prisma.contribution.aggregate({
      where: { eventId },
      _sum: { amount: true },
      _count: true,
    });

    const revenue = Number(walletWithRelations?.revenue ?? 0);
    const expenses = Number(walletWithRelations?.expenses ?? 0);
    const balance = Number(walletWithRelations?.balance ?? 0);
    const contributionTotal = Number(contributions._sum.amount ?? 0);

    return {
      wallet: walletWithRelations,
      contributions: { total: contributionTotal, count: contributions._count },
      profitLoss: {
        revenue,
        expenses,
        balance,
        netProfit: revenue - expenses,
        contributionTotal,
      },
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
