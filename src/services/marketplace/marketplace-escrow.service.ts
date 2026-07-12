import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { notificationService } from "@/services/notifications/notification.service";
import { paginatedResult } from "@/lib/pagination";
import { getDefaultCommissionPercent } from "@/lib/marketplace/feature-flags";
import type { EscrowHoldStatus } from "@prisma/client";

export class MarketplaceEscrowService {
  async createHoldForBooking(bookingId: string, amount: number, currency = "GHS") {
    const booking = await prisma.vendorBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found");

    const commissionPercent = await getDefaultCommissionPercent();
    const commissionAmount = (amount * commissionPercent) / 100;
    const netVendorAmount = amount - commissionAmount;

    const existing = await prisma.escrowHold.findFirst({
      where: { bookingId, status: { in: ["PENDING_PAYMENT", "FUNDED", "HELD"] } },
    });
    if (existing) return existing;

    return prisma.escrowHold.create({
      data: {
        bookingId,
        amount,
        currency,
        commissionAmount,
        netVendorAmount,
        status: "PENDING_PAYMENT",
      },
    });
  }

  async onPaymentSuccess(paymentId: string, bookingId: string) {
    const booking = await prisma.vendorBooking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { vendor: { select: { userId: true, id: true } } },
    });
    if (!booking) throw new Error("Booking not found");

    const hold = await prisma.escrowHold.findFirst({
      where: { bookingId, status: "PENDING_PAYMENT" },
      orderBy: { createdAt: "desc" },
    });
    if (!hold) throw new Error("Escrow hold not found");

    await prisma.$transaction([
      prisma.escrowHold.update({
        where: { id: hold.id },
        data: {
          paymentId,
          status: "HELD",
          fundedAt: new Date(),
        },
      }),
      prisma.vendorBooking.update({
        where: { id: bookingId },
        data: {
          status: booking.remainingAmount && Number(booking.remainingAmount) > 0
            ? "DEPOSIT_PAID"
            : "CONFIRMED",
        },
      }),
      prisma.bookingMilestone.updateMany({
        where: { bookingId, title: "Deposit", status: "pending" },
        data: { status: "paid" },
      }),
    ]);

    await notificationService.notify(booking.organizerId, {
      title: "Payment confirmed",
      message: "Your vendor booking payment was received and is held securely on Celeventic.",
      type: "vendor_payment",
      link: `/dashboard/bookings?booking=${bookingId}`,
    });
    await notificationService.notify(booking.vendor.userId, {
      title: "Booking payment received",
      message: "An organizer paid for a booking. Funds are held until completion is confirmed.",
      type: "vendor_payment",
      link: `/dashboard/vendor-portal?booking=${bookingId}`,
    });

    await createAuditLog({
      entity: "escrow_hold",
      entityId: hold.id,
      action: "UPDATE",
      details: { paymentId, bookingId, status: "HELD" },
    });
  }

  async releaseForBooking(bookingId: string, releasedBy: string) {
    const hold = await prisma.escrowHold.findFirst({
      where: { bookingId, status: { in: ["HELD", "FUNDED", "PARTIALLY_RELEASED"] } },
      orderBy: { createdAt: "desc" },
      include: { booking: { include: { vendor: true } } },
    });
    if (!hold) throw new Error("No releasable escrow hold");

    const payout = await prisma.$transaction(async (tx) => {
      await tx.escrowHold.update({
        where: { id: hold.id },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      await tx.escrowRelease.create({
        data: {
          holdId: hold.id,
          amount: hold.netVendorAmount,
          reason: "Organizer confirmed completion",
          releasedBy,
        },
      });
      return tx.vendorPayout.create({
        data: {
          bookingId,
          vendorId: hold.booking.vendorId,
          amount: hold.netVendorAmount,
          currency: hold.currency,
          status: "ELIGIBLE",
          eligibleAt: new Date(),
        },
      });
    });

    await createAuditLog({
      userId: releasedBy,
      action: "UPDATE",
      entity: "escrow_hold",
      entityId: hold.id,
      details: { action: "released", payoutId: payout.id },
    });

    return payout;
  }

  async adminFreezeHold(holdId: string, adminId: string, reason: string) {
    const hold = await prisma.escrowHold.update({
      where: { id: holdId },
      data: { status: "FROZEN", frozenAt: new Date(), frozenReason: reason },
    });
    await createAuditLog({
      userId: adminId,
      action: "SUSPEND",
      entity: "escrow_hold",
      entityId: holdId,
      details: { reason },
    });
    return hold;
  }

  async adminReleaseHold(holdId: string, adminId: string, reason?: string) {
    const hold = await prisma.escrowHold.findUnique({
      where: { id: holdId },
      include: { booking: true },
    });
    if (!hold) throw new Error("Hold not found");

    const payout = await prisma.$transaction(async (tx) => {
      await tx.escrowHold.update({
        where: { id: holdId },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      await tx.escrowRelease.create({
        data: { holdId, amount: hold.netVendorAmount, reason: reason ?? "Admin release", releasedBy: adminId },
      });
      const existingPayout = await tx.vendorPayout.findFirst({
        where: { bookingId: hold.bookingId, status: { in: ["ELIGIBLE", "PAID", "PROCESSING"] } },
      });
      if (existingPayout) return existingPayout;
      return tx.vendorPayout.create({
        data: {
          bookingId: hold.bookingId,
          vendorId: hold.booking.vendorId,
          amount: hold.netVendorAmount,
          currency: hold.currency,
          status: "ELIGIBLE",
          eligibleAt: new Date(),
        },
      });
    });

    await createAuditLog({
      userId: adminId,
      action: "UPDATE",
      entity: "escrow_hold",
      entityId: holdId,
      details: { action: "admin_release", payoutId: payout.id },
    });

    return payout;
  }

  async listHolds(filters: { status?: EscrowHoldStatus; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const where = filters.status ? { status: filters.status } : {};

    const [items, total] = await Promise.all([
      prisma.escrowHold.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              vendor: { select: { businessName: true, slug: true } },
              organizer: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.escrowHold.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }
}

export const marketplaceEscrowService = new MarketplaceEscrowService();
