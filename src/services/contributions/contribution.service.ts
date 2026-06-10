import { prisma } from "@/lib/prisma";
import { walletService } from "@/services/wallet/wallet.service";

export interface CreateContributionInput {
  eventId: string;
  contributor: string;
  amount: number;
  userId?: string;
  message?: string;
  isAnonymous?: boolean;
  currency?: string;
}

export interface ContributionPaymentMetadata {
  eventId: string;
  contributor: string;
  message?: string;
  isAnonymous?: boolean;
}

export class ContributionService {
  async contribute(input: CreateContributionInput, opts?: { paymentId?: string; source?: string }) {
    const contribution = await prisma.contribution.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        contributor: input.contributor,
        amount: input.amount,
        currency: input.currency ?? "GHS",
        message: input.message,
        isAnonymous: input.isAnonymous ?? false,
      },
    });

    await walletService.recordRevenue(
      input.eventId,
      input.amount,
      `Contribution from ${input.isAnonymous ? "Anonymous" : input.contributor}`,
      "contribution",
      {
        source: opts?.source ?? "manual",
        paymentId: opts?.paymentId,
        isLocked: Boolean(opts?.paymentId),
      }
    );

    return contribution;
  }

  async createFromPayment(
    paymentId: string,
    metadata: ContributionPaymentMetadata,
    amount: number,
    currency = "GHS"
  ) {
    const existing = await prisma.walletTransaction.findFirst({
      where: { paymentId, type: "contribution" },
    });
    if (existing) {
      return prisma.contribution.findFirst({
        where: { eventId: metadata.eventId, contributor: metadata.contributor, amount },
        orderBy: { createdAt: "desc" },
      });
    }

    return this.contribute(
      {
        eventId: metadata.eventId,
        contributor: metadata.contributor,
        amount,
        message: metadata.message,
        isAnonymous: metadata.isAnonymous ?? false,
        currency,
      },
      { paymentId, source: "payment" }
    );
  }

  async getEventContributions(eventId: string) {
    return prisma.contribution.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getContributionStats(eventId: string) {
    const [total, count, recent] = await Promise.all([
      prisma.contribution.aggregate({ where: { eventId }, _sum: { amount: true } }),
      prisma.contribution.count({ where: { eventId } }),
      prisma.contribution.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      total: Number(total._sum.amount ?? 0),
      count,
      recent,
    };
  }
}

export const contributionService = new ContributionService();
