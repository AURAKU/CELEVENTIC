import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { notificationService } from "@/services/notifications/notification.service";
import { paginatedResult } from "@/lib/pagination";
import { getDefaultCommissionPercent } from "@/lib/marketplace/feature-flags";
import type { VendorBookingStatus, VendorQuote, VendorQuoteVersion } from "@prisma/client";

export class MarketplaceBookingService {
  async createFromQuote(
    quote: VendorQuote & { lead: { eventId: string | null; eventType: string | null; eventDate: Date | null; location: string | null; guestCount: number | null } },
    version: VendorQuoteVersion,
    organizerId: string
  ) {
    const commissionPercent = await getDefaultCommissionPercent();
    const agreedAmount = Number(version.amount);
    const depositAmount = Number(version.depositAmount ?? agreedAmount * 0.3);
    const remainingAmount = Math.max(agreedAmount - depositAmount, 0);
    const platformCommission = (agreedAmount * commissionPercent) / 100;

    const existing = await prisma.vendorBooking.findFirst({
      where: { quoteId: quote.id, deletedAt: null },
    });
    if (existing) return existing;

    const booking = await prisma.vendorBooking.create({
      data: {
        vendorId: quote.vendorId,
        organizerId,
        leadId: quote.leadId,
        quoteId: quote.id,
        eventId: quote.lead.eventId ?? undefined,
        serviceName: quote.title ?? "Vendor service",
        eventType: quote.lead.eventType ?? undefined,
        eventDate: quote.lead.eventDate ?? undefined,
        location: quote.lead.location ?? undefined,
        guestCount: quote.lead.guestCount ?? undefined,
        agreedAmount,
        depositAmount,
        remainingAmount,
        currency: quote.currency,
        platformCommission,
        status: "AWAITING_PAYMENT",
        deliverables: version.deliverables ?? undefined,
        cancellationTerms: version.cancellationTerms ?? undefined,
        threadId: `lead:${quote.leadId}`,
        notes: version.notes ?? undefined,
      },
    });

    await prisma.bookingMilestone.createMany({
      data: [
        {
          bookingId: booking.id,
          title: "Deposit",
          amount: depositAmount,
          status: "pending",
          sortOrder: 1,
        },
        ...(remainingAmount > 0
          ? [
              {
                bookingId: booking.id,
                title: "Final balance",
                amount: remainingAmount,
                status: "pending",
                sortOrder: 2,
              },
            ]
          : []),
      ],
    });

    const { marketplaceEscrowService } = await import("@/services/marketplace/marketplace-escrow.service");
    await marketplaceEscrowService.createHoldForBooking(booking.id, depositAmount, quote.currency);

    await prisma.vendorLead.update({
      where: { id: quote.leadId },
      data: { status: "BOOKED" },
    });

    return booking;
  }

  async getById(bookingId: string) {
    return prisma.vendorBooking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        vendor: { select: { businessName: true, slug: true, profileImage: true, userId: true } },
        organizer: { select: { name: true, email: true } },
        quote: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
        lead: true,
        milestones: { orderBy: { sortOrder: "asc" } },
        escrowHolds: { orderBy: { createdAt: "desc" } },
        payouts: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        reviews: true,
      },
    });
  }

  async listBookings(filters: {
    vendorId?: string;
    organizerId?: string;
    status?: VendorBookingStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const where = {
      deletedAt: null,
      ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
      ...(filters.organizerId ? { organizerId: filters.organizerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.vendorBooking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          vendor: { select: { businessName: true, slug: true, profileImage: true } },
          organizer: { select: { name: true, email: true } },
        },
      }),
      prisma.vendorBooking.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async markInProgress(bookingId: string, vendorUserId: string) {
    const vendor = await prisma.vendor.findFirst({ where: { userId: vendorUserId } });
    if (!vendor) throw new Error("Vendor profile not found");

    const booking = await prisma.vendorBooking.findFirst({
      where: { id: bookingId, vendorId: vendor.id, deletedAt: null },
    });
    if (!booking) throw new Error("Booking not found");
    if (!["DEPOSIT_PAID", "CONFIRMED"].includes(booking.status)) {
      throw new Error("Booking is not ready to start");
    }

    return prisma.vendorBooking.update({
      where: { id: bookingId },
      data: { status: "IN_PROGRESS" },
    });
  }

  async requestCompletion(bookingId: string, vendorUserId: string) {
    const vendor = await prisma.vendor.findFirst({ where: { userId: vendorUserId } });
    if (!vendor) throw new Error("Vendor profile not found");

    const booking = await prisma.vendorBooking.findFirst({
      where: { id: bookingId, vendorId: vendor.id, deletedAt: null },
    });
    if (!booking) throw new Error("Booking not found");

    const updated = await prisma.vendorBooking.update({
      where: { id: bookingId },
      data: { status: "AWAITING_COMPLETION" },
    });

    await notificationService.notify(booking.organizerId, {
      title: "Service delivery ready for review",
      message: "Your vendor marked the service as delivered. Please confirm completion.",
      type: "vendor_booking",
      link: `/dashboard/bookings?booking=${bookingId}`,
    });

    return updated;
  }

  async confirmCompletion(bookingId: string, organizerId: string) {
    const booking = await prisma.vendorBooking.findFirst({
      where: { id: bookingId, organizerId, deletedAt: null },
      include: { vendor: { select: { userId: true, id: true } } },
    });
    if (!booking) throw new Error("Booking not found");
    if (!["IN_PROGRESS", "AWAITING_COMPLETION", "CONFIRMED", "DEPOSIT_PAID"].includes(booking.status)) {
      throw new Error("Booking cannot be completed yet");
    }

    const updated = await prisma.vendorBooking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    const { marketplaceEscrowService } = await import("@/services/marketplace/marketplace-escrow.service");
    await marketplaceEscrowService.releaseForBooking(bookingId, organizerId);

    await prisma.vendor.update({
      where: { id: booking.vendorId },
      data: { completedEventsCount: { increment: 1 } },
    });

    await notificationService.notify(booking.vendor.userId, {
      title: "Booking completed",
      message: "The organizer confirmed service completion. Payout is now eligible.",
      type: "vendor_payout",
      link: `/dashboard/vendor-portal?booking=${bookingId}`,
    });

    await notificationService.notify(organizerId, {
      title: "Leave a review",
      message: "How was your experience? Share a verified review.",
      type: "vendor_review",
      link: `/dashboard/bookings?booking=${bookingId}&review=1`,
    });

    await createAuditLog({
      userId: organizerId,
      action: "UPDATE",
      entity: "vendor_booking",
      entityId: bookingId,
      details: { action: "completed" },
    });

    return updated;
  }

  async cancelBooking(bookingId: string, actorId: string, reason: string) {
    const booking = await prisma.vendorBooking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { vendor: { select: { userId: true } } },
    });
    if (!booking) throw new Error("Booking not found");
    if (["COMPLETED", "CLOSED", "REFUNDED", "CANCELLED"].includes(booking.status)) {
      throw new Error("Booking cannot be cancelled");
    }

    const updated = await prisma.vendorBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });

    const notifyId =
      actorId === booking.organizerId ? booking.vendor.userId : booking.organizerId;
    await notificationService.notify(notifyId, {
      title: "Booking cancelled",
      message: reason,
      type: "vendor_booking",
      link: actorId === booking.organizerId
        ? `/dashboard/vendor-portal?booking=${bookingId}`
        : `/dashboard/bookings?booking=${bookingId}`,
    });

    return updated;
  }
}

export const marketplaceBookingService = new MarketplaceBookingService();
