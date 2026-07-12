import { prisma } from "@/lib/prisma";
import { paginatedResult } from "@/lib/pagination";
import { getMarketplaceFeatureFlags } from "@/lib/marketplace/feature-flags";

export interface CreateVerifiedReviewInput {
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string;
  serviceQuality?: number;
  communication?: number;
  valueRating?: number;
  timeliness?: number;
  wouldRecommend?: boolean;
}

export class MarketplaceReviewService {
  async createVerifiedReview(input: CreateVerifiedReviewInput) {
    const flags = await getMarketplaceFeatureFlags();

    const booking = await prisma.vendorBooking.findFirst({
      where: { id: input.bookingId, organizerId: input.userId, deletedAt: null },
    });
    if (!booking) throw new Error("Booking not found");
    if (flags.reviewsRequireBooking && booking.status !== "COMPLETED") {
      throw new Error("Only completed bookings can be reviewed");
    }

    const existing = await prisma.vendorReview.findFirst({
      where: { bookingId: input.bookingId, userId: input.userId },
    });
    if (existing) throw new Error("You already reviewed this booking");

    const review = await prisma.vendorReview.create({
      data: {
        vendorId: booking.vendorId,
        userId: input.userId,
        bookingId: booking.id,
        leadId: booking.leadId,
        rating: input.rating,
        comment: input.comment,
        eventType: booking.eventType,
        serviceQuality: input.serviceQuality,
        communication: input.communication,
        valueRating: input.valueRating,
        timeliness: input.timeliness,
        wouldRecommend: input.wouldRecommend,
        isVerified: true,
        status: "published",
      },
    });

    await this.recalculateVendorRating(booking.vendorId);
    return review;
  }

  async recalculateVendorRating(vendorId: string) {
    const agg = await prisma.vendorReview.aggregate({
      where: { vendorId, status: "published" },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count.id,
      },
    });
  }

  async listReviews(vendorId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const where = { vendorId, status: "published" };

    const [items, total] = await Promise.all([
      prisma.vendorReview.findMany({
        where,
        skip: (page - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, avatarUrl: true } } },
      }),
      prisma.vendorReview.count({ where }),
    ]);

    return paginatedResult(items, total, page, safeLimit);
  }
}

export const marketplaceReviewService = new MarketplaceReviewService();
