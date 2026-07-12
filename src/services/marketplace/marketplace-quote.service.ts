import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { notificationService } from "@/services/notifications/notification.service";
import { paginatedResult } from "@/lib/pagination";
import type { VendorQuoteStatus, Prisma } from "@prisma/client";

export interface SendQuoteInput {
  leadId: string;
  vendorId: string;
  vendorUserId: string;
  title?: string;
  amount: number;
  depositAmount?: number;
  depositPercent?: number;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  deliverables?: string[];
  paymentSchedule?: Record<string, unknown>[];
  cancellationTerms?: string;
  notes?: string;
  expiresAt?: string;
  currency?: string;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

export class MarketplaceQuoteService {
  async sendQuote(input: SendQuoteInput) {
    const lead = await prisma.vendorLead.findFirst({
      where: { id: input.leadId, vendorId: input.vendorId },
    });
    if (!lead) throw new Error("Lead not found");

    const depositAmount =
      input.depositAmount ??
      (input.depositPercent ? (input.amount * input.depositPercent) / 100 : input.amount * 0.3);

    const existing = await prisma.vendorQuote.findFirst({
      where: { leadId: lead.id, deletedAt: null },
    });

    if (existing) {
      const nextVersion = existing.currentVersion + 1;
      const updated = await prisma.$transaction(async (tx) => {
        await tx.vendorQuoteVersion.create({
          data: {
            quoteId: existing.id,
            version: nextVersion,
            amount: input.amount,
            depositAmount,
            depositPercent: input.depositPercent,
            description: input.description,
            inclusions: toJson(input.inclusions),
            exclusions: toJson(input.exclusions),
            deliverables: toJson(input.deliverables),
            paymentSchedule: toJson(input.paymentSchedule),
            cancellationTerms: input.cancellationTerms,
            notes: input.notes,
            createdBy: input.vendorUserId,
          },
        });
        return tx.vendorQuote.update({
          where: { id: existing.id },
          data: {
            status: "SENT",
            currentVersion: nextVersion,
            title: input.title,
            currency: input.currency ?? "GHS",
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          },
        });
      });

      await prisma.vendorLead.update({
        where: { id: lead.id },
        data: { status: "QUOTED" },
      });

      await this.notifyQuoteSent(lead.organizerId, updated.id, lead.id, input.title ?? "Updated quote");
      return this.getQuoteById(updated.id);
    }

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.vendorQuote.create({
        data: {
          leadId: lead.id,
          vendorId: input.vendorId,
          organizerId: lead.organizerId,
          status: "SENT",
          title: input.title,
          currency: input.currency ?? "GHS",
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          currentVersion: 1,
        },
      });
      await tx.vendorQuoteVersion.create({
        data: {
          quoteId: created.id,
          version: 1,
          amount: input.amount,
          depositAmount,
          depositPercent: input.depositPercent,
          description: input.description,
          inclusions: toJson(input.inclusions),
          exclusions: toJson(input.exclusions),
          deliverables: toJson(input.deliverables),
          paymentSchedule: toJson(input.paymentSchedule),
          cancellationTerms: input.cancellationTerms,
          notes: input.notes,
          createdBy: input.vendorUserId,
        },
      });
      return created;
    });

    await prisma.vendorLead.update({
      where: { id: lead.id },
      data: { status: "QUOTED" },
    });

    await this.notifyQuoteSent(lead.organizerId, quote.id, lead.id, input.title ?? "Service quote");
    return this.getQuoteById(quote.id);
  }

  private async notifyQuoteSent(organizerId: string, quoteId: string, leadId: string, title: string) {
    await notificationService.notify(organizerId, {
      title: "Quote received",
      message: `You received a new quote: ${title}`,
      type: "vendor_quote",
      link: `/dashboard/quotes?quote=${quoteId}`,
    });
  }

  async getQuoteById(quoteId: string) {
    return prisma.vendorQuote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        versions: { orderBy: { version: "desc" } },
        vendor: { select: { businessName: true, slug: true, profileImage: true } },
        lead: true,
        booking: true,
      },
    });
  }

  async listQuotes(filters: {
    vendorId?: string;
    organizerId?: string;
    status?: VendorQuoteStatus;
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
      prisma.vendorQuote.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
          vendor: { select: { businessName: true, slug: true, profileImage: true } },
          lead: { select: { eventType: true, eventDate: true, location: true } },
        },
      }),
      prisma.vendorQuote.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async acceptQuote(quoteId: string, organizerId: string) {
    const quote = await prisma.vendorQuote.findFirst({
      where: { id: quoteId, organizerId, deletedAt: null },
      include: { versions: { orderBy: { version: "desc" }, take: 1 }, lead: true },
    });
    if (!quote) throw new Error("Quote not found");
    if (!["SENT", "VIEWED", "REVISED"].includes(quote.status)) {
      throw new Error("Quote cannot be accepted in its current state");
    }
    if (quote.expiresAt && quote.expiresAt < new Date()) {
      await prisma.vendorQuote.update({ where: { id: quoteId }, data: { status: "EXPIRED" } });
      throw new Error("Quote has expired");
    }

    const version = quote.versions[0];
    if (!version) throw new Error("Quote has no pricing version");

    const { marketplaceBookingService } = await import("@/services/marketplace/marketplace-booking.service");
    const booking = await marketplaceBookingService.createFromQuote(quote, version, organizerId);

    await prisma.vendorQuote.update({
      where: { id: quoteId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    await prisma.vendorLead.update({
      where: { id: quote.leadId },
      data: { status: "ACCEPTED" },
    });

    const vendor = await prisma.vendor.findUnique({
      where: { id: quote.vendorId },
      select: { userId: true },
    });
    if (vendor) {
      await notificationService.notify(vendor.userId, {
        title: "Quote accepted",
        message: "An organizer accepted your quote. Awaiting payment.",
        type: "vendor_booking",
        link: `/dashboard/vendor-portal?booking=${booking.id}`,
      });
    }

    await createAuditLog({
      userId: organizerId,
      action: "UPDATE",
      entity: "vendor_quote",
      entityId: quoteId,
      details: { action: "accepted", bookingId: booking.id },
    });

    return booking;
  }

  async declineQuote(quoteId: string, organizerId: string, reason?: string) {
    const quote = await prisma.vendorQuote.findFirst({
      where: { id: quoteId, organizerId, deletedAt: null },
    });
    if (!quote) throw new Error("Quote not found");

    await prisma.vendorQuote.update({
      where: { id: quoteId },
      data: { status: "DECLINED", declinedAt: new Date() },
    });
    await prisma.vendorLead.update({
      where: { id: quote.leadId },
      data: { status: "DECLINED" },
    });

    const vendor = await prisma.vendor.findUnique({
      where: { id: quote.vendorId },
      select: { userId: true },
    });
    if (vendor) {
      await notificationService.notify(vendor.userId, {
        title: "Quote declined",
        message: reason ?? "The organizer declined your quote.",
        type: "vendor_quote",
        link: `/dashboard/vendor-portal?lead=${quote.leadId}`,
      });
    }

    return { success: true };
  }

  async markViewed(quoteId: string, organizerId: string) {
    const quote = await prisma.vendorQuote.findFirst({
      where: { id: quoteId, organizerId, status: "SENT", deletedAt: null },
    });
    if (!quote) return null;
    return prisma.vendorQuote.update({
      where: { id: quoteId },
      data: { status: "VIEWED" },
    });
  }
}

export const marketplaceQuoteService = new MarketplaceQuoteService();
