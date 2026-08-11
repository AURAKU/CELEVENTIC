import { prisma } from "@/lib/prisma";
import { walletService } from "@/services/wallet/wallet.service";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";

export interface CreateContributionInput {
  eventId: string;
  contributor: string;
  amount: number;
  userId?: string;
  message?: string;
  isAnonymous?: boolean;
  currency?: string;
  purpose?: import("@prisma/client").ContributionPurpose;
  paymentMethod?: string;
}

export interface ContributionPaymentMetadata {
  eventId: string;
  contributor: string;
  message?: string;
  isAnonymous?: boolean;
  purpose?: import("@prisma/client").ContributionPurpose;
  paymentMethod?: string;
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
        purpose: input.purpose ?? "FAMILY_SUPPORT",
        paymentMethod: input.paymentMethod ?? "PAYSTACK",
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
        purpose: metadata.purpose ?? "FAMILY_SUPPORT",
        paymentMethod: metadata.paymentMethod ?? "PAYSTACK",
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
    const [total, count] = await Promise.all([
      prisma.contribution.aggregate({ where: { eventId }, _sum: { amount: true } }),
      prisma.contribution.count({ where: { eventId } }),
    ]);

    return {
      total: Number(total._sum.amount ?? 0),
      count,
    };
  }

  async listContributions(
    eventId: string,
    input?: { page?: number | string | null; limit?: number | string | null }
  ) {
    const { page, limit, skip } = parsePaginationInput(input, { limit: 20, maxLimit: 100 });

    const [items, total] = await Promise.all([
      prisma.contribution.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          contributor: true,
          amount: true,
          message: true,
          isAnonymous: true,
          createdAt: true,
        },
      }),
      prisma.contribution.count({ where: { eventId } }),
    ]);

    return paginatedResult(
      items.map((c) => ({
        id: c.id,
        contributor: c.isAnonymous ? "Anonymous" : c.contributor,
        amount: String(c.amount),
        message: c.message,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      limit
    );
  }
}

export const contributionService = new ContributionService();
