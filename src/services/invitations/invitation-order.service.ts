import { prisma } from "@/lib/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { catalogService } from "@/services/commerce/catalog.service";
import { pricingService } from "@/services/commerce/pricing.service";
import { seedCommerceEngine } from "@/services/commerce/commerce-seed.service";
import { invitationLanguageService } from "@/services/i18n/invitation-language.service";
import { languageService } from "@/services/i18n/language.service";
import { emailTemplateService } from "@/services/i18n/email-template.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";
import { productionNotificationService } from "@/services/invitations/production-notification.service";
import type { InvitationLanguageMode } from "@prisma/client";
import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import type { Prisma } from "@prisma/client";
import { Prisma as PrismaClient } from "@prisma/client";
import { paginatedResult } from "@/lib/pagination";
import type { MusicSelection } from "@/lib/music/music-types";
import { validateMusicSelection } from "@/lib/music/validate-selection";

export interface CreateOrderInput {
  userId: string;
  templateSlug: string;
  packageSlug: string;
  eventType: string;
}

export interface UpdateOrderDetailsInput {
  hostName?: string;
  coupleName1?: string;
  coupleName2?: string;
  deceasedName?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  landmark?: string;
  mapsLink?: string;
  dressCode?: string;
  contactPhone?: string;
  contactEmail?: string;
  story?: string;
  galleryUrls?: string[];
  musicPreference?: string;
  musicSelection?: MusicSelection | null;
  rsvpRequired?: boolean;
  guestCount?: number;
  addonSlugs?: string[];
  languageMode?: InvitationLanguageMode;
  designConfig?: Record<string, unknown>;
  eventTitleFr?: string;
  storyFr?: string;
}

function mapEventType(eventType: string): string {
  const map: Record<string, string> = {
    Engagement: "WEDDING",
    ENGAGEMENT: "WEDDING",
    Church: "CHURCH_PROGRAM",
    Corporate: "CORPORATE_EVENT",
    "Private Event": "PRIVATE_EVENT",
  };
  return map[eventType] ?? eventType;
}

export class InvitationOrderService {
  async ensureCatalogSeeded() {
    const { CATALOG_TEMPLATES } = await import("@/lib/invitation-mvp/catalogue");
    for (const t of CATALOG_TEMPLATES) {
      await prisma.invitationCatalogTemplate.upsert({
        where: { slug: t.slug },
        update: { name: t.name, category: t.category, style: t.style, layoutSlug: t.layoutSlug, isActive: true },
        create: {
          slug: t.slug,
          name: t.name,
          description: t.description,
          category: t.category,
          style: t.style,
          layoutSlug: t.layoutSlug,
          previewGradient: t.previewGradient,
          isPremium: t.isPremium,
          sortOrder: CATALOG_TEMPLATES.indexOf(t),
        },
      });
    }
    await seedCommerceEngine();
  }

  async createDraft(input: CreateOrderInput) {
    await this.ensureCatalogSeeded();

    const template = getCatalogTemplate(input.templateSlug);
    const pkg = await catalogService.getPackageBySlug(input.packageSlug);
    if (!template || !pkg) throw new Error("Invalid template or package");

    const designConfig = getDefaultDesignConfig(template.layoutSlug);

    const workflowType = productionWorkflowService.inferWorkflowType(input.packageSlug);

    return prisma.invitationOrder.create({
      data: {
        userId: input.userId,
        templateSlug: input.templateSlug,
        packageSlug: input.packageSlug,
        eventType: mapEventType(input.eventType),
        status: "DRAFT",
        productionStatus: "NOT_STARTED",
        workflowType,
        workflowStage: "PACKAGE_SELECTED",
        designConfig: designConfig as unknown as Prisma.InputJsonValue,
        totalAmountGhs: pkg.priceGhs,
        rsvpRequired: true,
      },
      include: { template: true, package: true },
    });
  }

  async updateOrder(orderId: string, userId: string, data: UpdateOrderDetailsInput) {
    const order = await this.getOrderForUser(orderId, userId);
    const addonSlugs = data.addonSlugs ?? (order.addonSlugs as string[] | null) ?? [];
    const pricing = await pricingService.calculateOrderPricing(
      order.packageSlug,
      addonSlugs,
      (order.displayCurrency as "GHS" | "USD" | "GBP") ?? "GHS"
    );
    const total = pricing.totalGhs;

    if (data.musicSelection !== undefined && data.musicSelection !== null) {
      const musicErr = validateMusicSelection(data.musicSelection);
      if (musicErr) throw new Error(musicErr);
    }

    const musicPreferenceLabel =
      data.musicSelection?.title ??
      data.musicPreference ??
      (data.musicSelection ? "Custom music clip" : undefined);

    const updated = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        hostName: data.hostName,
        coupleName1: data.coupleName1,
        coupleName2: data.coupleName2,
        deceasedName: data.deceasedName,
        eventTitle: data.eventTitle,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        eventTime: data.eventTime,
        venueName: data.venueName,
        landmark: data.landmark,
        mapsLink: data.mapsLink,
        dressCode: data.dressCode,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        story: data.story,
        galleryUrls: data.galleryUrls as unknown as Prisma.InputJsonValue,
        musicPreference: musicPreferenceLabel,
        musicSelection:
          data.musicSelection === undefined
            ? undefined
            : data.musicSelection === null
              ? PrismaClient.JsonNull
              : (data.musicSelection as unknown as Prisma.InputJsonValue),
        rsvpRequired: data.rsvpRequired,
        guestCount: data.guestCount,
        addonSlugs: addonSlugs as unknown as Prisma.InputJsonValue,
        designConfig: data.designConfig as unknown as Prisma.InputJsonValue | undefined,
        totalAmountGhs: total,
        displayAmount: pricing.displayAmount,
        exchangeRate: pricing.exchangeRate,
        languageMode: data.languageMode,
      },
      include: { template: true, package: true },
    });

    const frVersion = await prisma.invitationLanguageVersion.findUnique({
      where: {
        invitationOrderId_languageCode: { invitationOrderId: orderId, languageCode: "fr" },
      },
    });

    await invitationLanguageService.syncVersionsFromOrder({
      id: orderId,
      languageMode: data.languageMode ?? order.languageMode,
      eventTitle: data.eventTitle ?? order.eventTitle,
      story: data.story ?? order.story,
      dressCode: data.dressCode ?? order.dressCode,
      venueName: data.venueName ?? order.venueName,
      landmark: data.landmark ?? order.landmark,
      hostName: data.hostName ?? order.hostName,
      eventTitleFr: data.eventTitleFr ?? frVersion?.eventTitle ?? undefined,
      storyFr: data.storyFr ?? frVersion?.story ?? undefined,
    });

    if (addonSlugs.length > 0) {
      await productionWorkflowService.onAddonsSelected(orderId, addonSlugs);
    }

    return updated;
  }

  async getOrderForUser(orderId: string, userId: string) {
    const order = await prisma.invitationOrder.findFirst({
      where: { id: orderId, userId },
      include: { template: true, package: true, payment: true, languageVersions: true },
    });
    if (!order) throw new Error("Order not found");
    return order;
  }

  async listUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [orders, total] = await Promise.all([
      prisma.invitationOrder.findMany({
        where,
        include: { template: true, package: true, payment: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invitationOrder.count({ where }),
    ]);

    return paginatedResult(orders, total, page, limit);
  }

  async listAllOrders() {
    return prisma.invitationOrder.findMany({
      include: { template: true, package: true, payment: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async setStatus(orderId: string, status: Prisma.InvitationOrderUpdateInput["status"]) {
    return prisma.invitationOrder.update({
      where: { id: orderId },
      data: { status: status as never },
    });
  }

  async publishFromPayment(orderId: string) {
    const order = await prisma.invitationOrder.findUnique({
      where: { id: orderId },
      include: { template: true, package: true, user: true },
    });
    if (!order) throw new Error("Order not found");

    const catalog = getCatalogTemplate(order.templateSlug);
    const layoutSlug = catalog?.layoutSlug ?? "classic-gold";
    const baseDesign = getDefaultDesignConfig(layoutSlug);
    const storedDesign = order.designConfig as Record<string, unknown> | null;
    const designConfig = mergeDesignConfig(baseDesign, storedDesign as never);

    const gallery = (order.galleryUrls as string[] | null) ?? [];
    if (gallery.length > 0) {
      designConfig.media = gallery.map((url, i) => ({
        url,
        type: "image" as const,
        role: i === 0 ? "hero" as const : "reference" as const,
      }));
    }

    const hostName =
      order.coupleName1 && order.coupleName2
        ? `${order.coupleName1} & ${order.coupleName2}`
        : order.hostName ?? order.user.name;

    const title =
      order.eventTitle ??
      (order.eventType === "FUNERAL" && order.deceasedName
        ? `In Loving Memory of ${order.deceasedName}`
        : `Celebration of ${hostName}`);

    const eventSlug = `${slugify(title) || "event"}-${generateToken(6)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const event = await prisma.event.create({
      data: {
        slug: eventSlug,
        title,
        eventType: mapEventType(order.eventType) as never,
        hostName,
        description: order.story,
        startDate: order.eventDate ?? new Date(),
        venueName: order.venueName,
        landmark: order.landmark,
        mapsLink: order.mapsLink,
        dressCode: order.dressCode,
        contactPhone: order.contactPhone,
        coverImageUrl: gallery[0] ?? null,
        isPublic: true,
        status: "PUBLISHED",
        organizerId: order.userId,
        pricingType: "FREE",
      },
    });

    if (gallery.length > 0) {
      await prisma.eventMedia.createMany({
        data: gallery.map((url, i) => ({
          eventId: event.id,
          url,
          type: "image",
          sortOrder: i,
        })),
      });
    }

    const uniqueLink = generateToken(32);
    const invitation = await prisma.invitation.create({
      data: {
        eventId: event.id,
        name: title,
        slug: `${slugify(title)}-${generateToken(6)}`,
        message: order.story,
        designConfig: designConfig as unknown as Prisma.InputJsonValue,
        uniqueLink,
        status: "ACTIVE",
      },
    });

    await invitationBlockService.ensureBlocksForOrder(orderId);
    await invitationBlockService.copyBlocksToInvitation(orderId, invitation.id);

    await invitationLanguageService.syncVersionsFromOrder({
      id: orderId,
      languageMode: order.languageMode,
      eventTitle: order.eventTitle,
      story: order.story,
      dressCode: order.dressCode,
      venueName: order.venueName,
      landmark: order.landmark,
      hostName: order.hostName,
    });

    const shareUrl = `${appUrl}/invite/${uniqueLink}`;
    const pkgDef = await catalogService.getPackageBySlug(order.packageSlug);
    const needsProduction = pkgDef?.designerAssist ?? false;

    const updated = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        invitationId: invitation.id,
        eventId: event.id,
        shareUrl,
        status: needsProduction ? "IN_PRODUCTION" : "PUBLISHED",
        productionStatus: needsProduction ? "ASSIGNED" : "DELIVERED",
        workflowStage: needsProduction ? "PRODUCTION_STARTED" : "PUBLISHED",
      },
    });

    if (!needsProduction) {
      await productionNotificationService.notify(order.userId, "INVITATION_PUBLISHED", {
        orderId,
        link: shareUrl,
      });
    } else {
      await productionNotificationService.notify(order.userId, "PAYMENT_SUCCESSFUL", { orderId });
      await productionNotificationService.notify(order.userId, "ORDER_RECEIVED", { orderId });
    }

    const userLocale = await languageService.getUserPreference(order.userId);
    if (order.user.email) {
      await emailTemplateService.sendLocalized("invitation_ready", order.user.email, userLocale, {
        name: order.user.name,
        url: shareUrl,
      });
    }

    return { order: updated, invitation, event, shareUrl };
  }
}

export const invitationOrderService = new InvitationOrderService();
