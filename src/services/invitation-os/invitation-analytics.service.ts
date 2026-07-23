import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AnalyticsEventType =
  | "TEMPLATE_VIEW"
  | "PACKAGE_SELECT"
  | "CHECKOUT_START"
  | "CHECKOUT_ABANDON"
  | "PAYMENT_SUCCESS"
  | "INVITE_OPEN"
  | "RSVP_SUBMIT"
  | "ADDON_SELECT"
  | "INVITE_PAGE_VIEW"
  | "INVITE_ACTION_CLICK"
  | "TEMPLATE_PREVIEW_OPEN"
  | "THEME_SWITCH"
  | "VIRAL_CTA_CLICK"
  | "CONTRIBUTE_CLICK";

export class InvitationAnalyticsService {
  async track(data: {
    eventType: AnalyticsEventType;
    orderId?: string;
    invitationId?: string;
    guestId?: string;
    userId?: string;
    templateSlug?: string;
    packageSlug?: string;
    addonSlug?: string;
    revenueGhs?: number;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.invitationAnalyticsEvent.create({
      data: {
        eventType: data.eventType,
        orderId: data.orderId,
        invitationId: data.invitationId,
        guestId: data.guestId,
        userId: data.userId,
        templateSlug: data.templateSlug,
        packageSlug: data.packageSlug,
        addonSlug: data.addonSlug,
        revenueGhs: data.revenueGhs,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async trackInviteOpen(invitationId: string, guestId?: string) {
    if (guestId) {
      await prisma.guest.updateMany({
        where: { id: guestId, inviteOpenedAt: null },
        data: { inviteOpenedAt: new Date(), status: "OPENED" },
      });
    }
    return this.track({ eventType: "INVITE_OPEN", invitationId, guestId });
  }

  async getOrganizerAnalytics(userId: string) {
    const orders = await prisma.invitationOrder.findMany({
      where: { userId },
      select: { id: true, invitationId: true, eventId: true, packageSlug: true, templateSlug: true, totalAmountGhs: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const orderIds = orders.map((o) => o.id);
    const invitationIds = orders.map((o) => o.invitationId).filter(Boolean) as string[];
    const eventIds = orders.map((o) => o.eventId).filter(Boolean) as string[];

    const [events, guests, rsvpStats] = await Promise.all([
      prisma.invitationAnalyticsEvent.findMany({
        where: {
          OR: [
            { orderId: { in: orderIds } },
            { invitationId: { in: invitationIds } },
            { userId },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      eventIds.length > 0
        ? prisma.guest.groupBy({
            by: ["status"],
            where: { eventId: { in: eventIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      eventIds.length > 0
        ? prisma.rsvp.groupBy({
            by: ["response"],
            where: { guest: { eventId: { in: eventIds } } },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const templateViews = events.filter((e) => e.eventType === "TEMPLATE_VIEW").length;
    const inviteOpens = events.filter((e) => e.eventType === "INVITE_OPEN").length;
    const checkoutStarts = events.filter((e) => e.eventType === "CHECKOUT_START").length;
    const checkoutAbandons = events.filter((e) => e.eventType === "CHECKOUT_ABANDON").length;

    const guestBreakdown: Record<string, number> = {};
    for (const g of guests) guestBreakdown[g.status] = g._count.id;

    const totalInvited = Object.values(guestBreakdown).reduce((s, n) => s + n, 0);
    const accepted = guestBreakdown.ACCEPTED ?? 0;
    const declined = guestBreakdown.DECLINED ?? 0;
    const maybe = guestBreakdown.MAYBE ?? 0;
    const opened = guestBreakdown.OPENED ?? 0;
    const checkedIn = guestBreakdown.CHECKED_IN ?? 0;
    const noResponse = totalInvited - accepted - declined - maybe - checkedIn;

    const revenue = orders.reduce((s, o) => s + Number(o.totalAmountGhs), 0);
    const rsvpRate = totalInvited > 0 ? Math.round(((accepted + maybe) / totalInvited) * 100) : 0;
    const openRate = totalInvited > 0 ? Math.round((opened / totalInvited) * 100) : 0;
    const conversionRate = checkoutStarts > 0
      ? Math.round(((checkoutStarts - checkoutAbandons) / checkoutStarts) * 100)
      : 0;

    const packageBreakdown: Record<string, number> = {};
    for (const o of orders) packageBreakdown[o.packageSlug] = (packageBreakdown[o.packageSlug] ?? 0) + 1;

    const templateBreakdown: Record<string, number> = {};
    for (const o of orders) templateBreakdown[o.templateSlug] = (templateBreakdown[o.templateSlug] ?? 0) + 1;

    const addonEvents = events.filter((e) => e.eventType === "ADDON_SELECT" && e.addonSlug);
    const addonBreakdown: Record<string, number> = {};
    for (const e of addonEvents) {
      if (e.addonSlug) addonBreakdown[e.addonSlug] = (addonBreakdown[e.addonSlug] ?? 0) + 1;
    }

    return {
      summary: {
        totalOrders: orders.length,
        revenue,
        templateViews,
        inviteOpens,
        rsvpRate,
        openRate,
        checkoutConversion: conversionRate,
        checkoutAbandonment: checkoutAbandons,
      },
      guestCrm: {
        invited: totalInvited,
        opened,
        accepted,
        declined,
        maybe,
        checkedIn,
        noResponse: Math.max(0, noResponse),
      },
      packageBreakdown,
      templateBreakdown,
      addonBreakdown,
      recentEvents: events.slice(0, 20),
    };
  }

  async getAdminGodTierAnalytics() {
    const [templateViews, checkoutStarts, abandons, opens, payments] = await Promise.all([
      prisma.invitationAnalyticsEvent.count({ where: { eventType: "TEMPLATE_VIEW" } }),
      prisma.invitationAnalyticsEvent.count({ where: { eventType: "CHECKOUT_START" } }),
      prisma.invitationAnalyticsEvent.count({ where: { eventType: "CHECKOUT_ABANDON" } }),
      prisma.invitationAnalyticsEvent.count({ where: { eventType: "INVITE_OPEN" } }),
      prisma.invitationAnalyticsEvent.aggregate({
        where: { eventType: "PAYMENT_SUCCESS" },
        _sum: { revenueGhs: true },
        _count: { id: true },
      }),
    ]);

    const topTemplates = await prisma.invitationAnalyticsEvent.groupBy({
      by: ["templateSlug"],
      where: { templateSlug: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    });

    return {
      templateViews,
      checkoutStarts,
      checkoutAbandonmentRate: checkoutStarts > 0 ? Math.round((abandons / checkoutStarts) * 100) : 0,
      inviteOpens: opens,
      paymentCount: payments._count.id,
      paymentRevenue: Number(payments._sum.revenueGhs ?? 0),
      topTemplates: topTemplates.map((t) => ({ slug: t.templateSlug, views: t._count.id })),
    };
  }
}

export const invitationAnalyticsService = new InvitationAnalyticsService();
