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
