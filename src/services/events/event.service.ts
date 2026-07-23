import { prisma } from "@/lib/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { paginatedResult } from "@/lib/pagination";
import { eventAccessWhere } from "@/lib/workspace/event-access";
import { getTemplateCategoriesForEventType } from "@/lib/blueprints";
import type { EventType, EventStatus, PricingType } from "@prisma/client";

export interface CreateEventInput {
  title: string;
  eventType: EventType;
  hostName: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  venueName?: string;
  landmark?: string;
  mapsLink?: string;
  contactPhone?: string;
  dressCode?: string;
  expectedGuests?: number;
  pricingType?: PricingType;
  coverImageUrl?: string;
  qrCenterImageUrl?: string | null;
  qrLogoSize?: string | null;
  themeId?: string;
  packageId?: string;
  organizerId: string;
}

export class EventService {
  private async resolvePackageId(packageIdOrSlug?: string) {
    if (!packageIdOrSlug?.trim()) return undefined;
    const pkg = await prisma.eventPackage.findFirst({
      where: { OR: [{ id: packageIdOrSlug }, { slug: packageIdOrSlug }] },
    });
    return pkg?.id;
  }

  private async resolveThemeId(themeIdOrSlug?: string) {
    if (!themeIdOrSlug?.trim()) return undefined;
    const theme = await prisma.eventTemplate.findFirst({
      where: { OR: [{ id: themeIdOrSlug }, { slug: themeIdOrSlug }] },
    });
    return theme?.id;
  }

  async createEvent(input: CreateEventInput) {
    const baseSlug = slugify(input.title);
    const slug = `${baseSlug}-${generateToken(6)}`;

    const [packageId, themeId] = await Promise.all([
      this.resolvePackageId(input.packageId),
      this.resolveThemeId(input.themeId),
    ]);

    const { packageId: _pkg, themeId: _theme, ...rest } = input;

    return prisma.event.create({
      data: {
        ...rest,
        packageId,
        themeId,
        slug,
        status: "DRAFT",
      },
      include: { package: true, theme: true },
    });
  }

  async getPackages() {
    return prisma.eventPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, price: true, guestLimit: true },
    });
  }

  async getThemes(eventType?: EventType) {
    const categories = eventType ? getTemplateCategoriesForEventType(eventType) : [];

    const where = eventType
      ? {
          isActive: true,
          OR: [
            { eventType },
            { eventType: null },
            ...(categories.length ? [{ category: { in: categories } }] : []),
          ],
        }
      : { isActive: true };

    return prisma.eventTemplate.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, category: true, eventType: true },
    });
  }

  async updateEvent(id: string, organizerId: string, data: Partial<CreateEventInput>) {
    return prisma.event.update({
      where: { id, organizerId },
      data,
      include: { package: true, theme: true },
    });
  }

  async publishEvent(id: string, organizerId: string) {
    return prisma.event.update({
      where: { id, organizerId },
      data: { status: "PUBLISHED", isPublic: true },
    });
  }

  /**
   * Event removal.
   * - hard: true (platform admin) → always permanently delete (clears RESTRICT FKs first).
   * - Organizer (default): LIVE/PUBLISHED → soft-cancel + deactivate ACTIVE invitations;
   *   DRAFT/other → hard delete.
   *
   * Several Event relations lack onDelete:Cascade in DB (qr_scans, ticket_orders,
   * offline_devices, contributions). A bare prisma.event.delete() returns P2003 and
   * leaves CANCELLED rows stuck on the dashboard — purge those first.
   */
  async deleteEvent(id: string, options?: { hard?: boolean }) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error("Event not found");

    const hardDelete =
      options?.hard === true ||
      (event.status !== "LIVE" && event.status !== "PUBLISHED");

    if (!hardDelete) {
      const [cancelled] = await prisma.$transaction([
        prisma.event.update({
          where: { id },
          data: { status: "CANCELLED", isPublic: false },
        }),
        prisma.invitation.updateMany({
          where: { eventId: id, status: "ACTIVE" },
          data: { status: "EXPIRED" },
        }),
      ]);
      return { mode: "cancelled" as const, event: cancelled };
    }

    const deleted = await this.purgeAndDeleteEvent(id);
    return { mode: "deleted" as const, event: deleted };
  }

  /** Remove RESTRICT / non-cascading dependents, then delete the event row. */
  private async purgeAndDeleteEvent(id: string) {
    return prisma.$transaction(async (tx) => {
      // QR scans (RESTRICT on eventId)
      await tx.qrScan.deleteMany({ where: { eventId: id } });

      // Offline devices + child rows (RESTRICT on eventId / deviceId)
      const devices = await tx.offlineDevice.findMany({
        where: { eventId: id },
        select: { id: true },
      });
      if (devices.length) {
        const deviceIds = devices.map((d) => d.id);
        await tx.offlineCheckin.deleteMany({ where: { deviceId: { in: deviceIds } } });
        await tx.offlineSyncLog.deleteMany({ where: { deviceId: { in: deviceIds } } });
        await tx.offlineDevice.deleteMany({ where: { eventId: id } });
      }

      // Ticket orders (RESTRICT) — detach payments first
      const ticketOrders = await tx.ticketOrder.findMany({
        where: { eventId: id },
        select: { id: true },
      });
      if (ticketOrders.length) {
        const orderIds = ticketOrders.map((o) => o.id);
        await tx.payment.updateMany({
          where: { ticketOrderId: { in: orderIds } },
          data: { ticketOrderId: null },
        });
        await tx.ticketOrder.deleteMany({ where: { eventId: id } });
      }

      await tx.contribution.deleteMany({ where: { eventId: id } });

      // Optional FKs — null rather than block (belt-and-suspenders)
      await tx.campaign.updateMany({ where: { eventId: id }, data: { eventId: null } });
      await tx.flyerDesign.updateMany({ where: { eventId: id }, data: { eventId: null } });
      await tx.inspirationUpload.updateMany({ where: { eventId: id }, data: { eventId: null } });
      await tx.fraudDetectionLog.updateMany({ where: { eventId: id }, data: { eventId: null } });
      await tx.inspirationSource.updateMany({ where: { eventId: id }, data: { eventId: null } });

      // Invitation orders store eventId as a plain string (no Prisma relation)
      await tx.invitationOrder.updateMany({ where: { eventId: id }, data: { eventId: null } });

      // Wallet is SetNull on eventId; detach expenses/tx then remove wallet row
      const wallet = await tx.wallet.findFirst({ where: { eventId: id }, select: { id: true } });
      if (wallet) {
        await tx.eventExpense.updateMany({ where: { walletId: wallet.id }, data: { walletId: null } });
        await tx.walletTransaction.deleteMany({ where: { walletId: wallet.id } });
        await tx.wallet.delete({ where: { id: wallet.id } });
      }

      // Break Guest → Invitation before cascade deletes both from Event
      await tx.guest.updateMany({ where: { eventId: id }, data: { invitationId: null } });

      return tx.event.delete({ where: { id } });
    });
  }

  async getOrganizerEvents(userId: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const where = eventAccessWhere(userId);

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          package: true,
          _count: { select: { guests: true, tickets: true, invitations: true, collaborators: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return paginatedResult(events, total, page, limit);
  }

  async getEventById(id: string, userId?: string) {
    return prisma.event.findFirst({
      where: userId
        ? {
            id,
            ...eventAccessWhere(userId),
          }
        : { id },
      include: {
        package: true,
        theme: true,
        media: true,
        invitations: true,
        guests: { include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 } } },
        tickets: true,
        _count: { select: { guests: true, qrScans: true } },
      },
    });
  }

  async getEventBySlug(slug: string) {
    return prisma.event.findUnique({
      where: { slug },
      include: { package: true, theme: true, media: true },
    });
  }

  async getDashboardStats(organizerId: string) {
    const [events, invitations, tickets, payments, guests, qrScans] = await Promise.all([
      prisma.event.count({ where: { organizerId } }),
      prisma.invitation.count({ where: { event: { organizerId } } }),
      prisma.ticket.aggregate({
        where: { event: { organizerId } },
        _sum: { soldCount: true },
      }),
      prisma.payment.aggregate({
        where: { userId: organizerId, status: "SUCCESSFUL" },
        _sum: { amount: true },
      }),
      prisma.guest.groupBy({
        by: ["status"],
        where: { event: { organizerId } },
        _count: true,
      }),
      prisma.qrScan.count({
        where: { event: { organizerId }, result: "VALID" },
      }),
    ]);

    const guestStats = guests.reduce(
      (acc, g) => {
        if (g.status === "ACCEPTED") acc.accepted = g._count;
        if (g.status === "DECLINED") acc.declined = g._count;
        if (g.status === "MAYBE") acc.maybe = g._count;
        return acc;
      },
      { accepted: 0, declined: 0, maybe: 0 }
    );

    return {
      eventsCreated: events,
      invitationsGenerated: invitations,
      ticketsSold: tickets._sum.soldCount ?? 0,
      revenue: Number(payments._sum.amount ?? 0),
      rsvpAccepted: guestStats.accepted,
      rsvpDeclined: guestStats.declined,
      rsvpMaybe: guestStats.maybe,
      qrScans,
    };
  }
}

export const eventService = new EventService();
