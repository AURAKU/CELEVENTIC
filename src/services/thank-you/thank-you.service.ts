import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma, type ThankYouPageStatus } from "@prisma/client";
import { getThankYouTemplate } from "@/lib/thank-you/templates";
import {
  parseDesignConfig,
  parseFeaturedMemoryIds,
  parseGuestbookConfig,
  parseSectionConfig,
  parseSharingConfig,
  resolveThankYouDesign,
  type InvitationThemeHint,
} from "@/lib/thank-you/resolve-design";
import { createAuditLog } from "@/lib/audit";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";

export interface UpdateThankYouInput {
  templateId?: string;
  title?: string | null;
  message?: string | null;
  eyebrow?: string | null;
  subtitle?: string | null;
  closingMessage?: string | null;
  signatureLine?: string | null;
  hostNames?: string | null;
  eventHashtag?: string | null;
  footerText?: string | null;
  flyerUrl?: string | null;
  hostPhotoUrl?: string | null;
  heroImageUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  signatureImageUrl?: string | null;
  audioUrl?: string | null;
  themeSource?: string | null;
  designConfig?: Record<string, unknown> | null;
  sectionConfig?: Record<string, unknown> | null;
  guestbookConfig?: Record<string, unknown> | null;
  sharingConfig?: Record<string, unknown> | null;
  seoConfig?: Record<string, unknown> | null;
  featuredMemoryIds?: string[] | null;
  updatedById?: string;
}

function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}

async function loadInvitationThemeHint(eventId: string): Promise<InvitationThemeHint | null> {
  const invitation =
    (await prisma.invitation.findFirst({
      where: { eventId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: { designConfig: true },
    })) ??
    (await prisma.invitation.findFirst({
      where: { eventId },
      orderBy: { updatedAt: "desc" },
      select: { designConfig: true },
    }));
  if (!invitation?.designConfig || typeof invitation.designConfig !== "object") return null;
  const design = invitation.designConfig as Record<string, unknown>;
  const colors = (design.colors ?? {}) as Record<string, unknown>;
  const fonts = (design.fonts ?? {}) as Record<string, unknown>;
  const theme = (design.theme ?? {}) as Record<string, unknown>;
  const themeColors = (theme.colors ?? {}) as Record<string, unknown>;
  const media = Array.isArray(design.media) ? design.media : [];
  const bgMedia = media.find(
    (item) =>
      item &&
      typeof item === "object" &&
      ((item as { role?: string }).role === "background" ||
        (item as { role?: string }).role === "cover" ||
        (item as { role?: string }).role === "intro")
  ) as { url?: string } | undefined;
  return {
    primaryColor:
      (colors.primary as string) || (themeColors.primary as string) || null,
    accentColor:
      (colors.accent as string) ||
      (colors.gold as string) ||
      (themeColors.accent as string) ||
      null,
    backgroundColor:
      (colors.background as string) || (themeColors.background as string) || null,
    textColor: (colors.text as string) || (themeColors.text as string) || null,
    mutedTextColor: (colors.muted as string) || null,
    displayFont: (fonts.heading as string) || null,
    bodyFont: (fonts.body as string) || null,
    scriptFont: (fonts.script as string) || null,
    backgroundImageUrl: bgMedia?.url || null,
  };
}

export class ThankYouService {
  async getOrCreate(eventId: string) {
    const existing = await prisma.thankYouPage.findUnique({
      where: { eventId },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
    if (existing) return existing;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    return prisma.thankYouPage.create({
      data: {
        eventId,
        title: event ? `Thank You — ${event.title}` : "Thank You",
        message:
          "Thank you for celebrating with us. Your presence made our day unforgettable.",
        eyebrow: "WITH HEARTFELT GRATITUDE",
        hostNames: event?.hostName ?? null,
        shareToken: generateShareToken(),
        themeSource: "INVITATION",
        templateId: "eternal-ivory",
      },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
  }

  async getForOrganizer(eventId: string) {
    return this.getOrCreate(eventId);
  }

  async update(eventId: string, data: UpdateThankYouInput) {
    await this.getOrCreate(eventId);
    const {
      designConfig,
      sectionConfig,
      guestbookConfig,
      sharingConfig,
      seoConfig,
      featuredMemoryIds,
      updatedById,
      themeSource,
      ...scalars
    } = data;

    const updateData: Prisma.ThankYouPageUpdateInput = {
      ...scalars,
      version: { increment: 1 },
      ...(themeSource != null ? { themeSource } : {}),
    };
    if (designConfig !== undefined) {
      updateData.designConfig =
        designConfig === null ? Prisma.DbNull : (designConfig as Prisma.InputJsonValue);
    }
    if (sectionConfig !== undefined) {
      updateData.sectionConfig =
        sectionConfig === null ? Prisma.DbNull : (sectionConfig as Prisma.InputJsonValue);
    }
    if (guestbookConfig !== undefined) {
      updateData.guestbookConfig =
        guestbookConfig === null ? Prisma.DbNull : (guestbookConfig as Prisma.InputJsonValue);
    }
    if (sharingConfig !== undefined) {
      updateData.sharingConfig =
        sharingConfig === null ? Prisma.DbNull : (sharingConfig as Prisma.InputJsonValue);
    }
    if (seoConfig !== undefined) {
      updateData.seoConfig = seoConfig === null ? Prisma.DbNull : (seoConfig as Prisma.InputJsonValue);
    }
    if (featuredMemoryIds !== undefined) {
      updateData.featuredMemoryIds =
        featuredMemoryIds === null
          ? Prisma.DbNull
          : (featuredMemoryIds as Prisma.InputJsonValue);
    }
    if (updatedById) updateData.updatedById = updatedById;

    const page = await prisma.thankYouPage.update({
      where: { eventId },
      data: updateData,
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });

    if (updatedById) {
      await createAuditLog({
        userId: updatedById,
        action: "UPDATE",
        entity: "ThankYouPage",
        entityId: page.id,
        details: { eventId, templateId: page.templateId, themeSource: page.themeSource },
      }).catch(() => undefined);
    }

    return page;
  }

  async publish(eventId: string, updatedById?: string) {
    const page = await this.getOrCreate(eventId);
    const snapshot = {
      templateId: page.templateId,
      title: page.title,
      message: page.message,
      designConfig: page.designConfig,
      sectionConfig: page.sectionConfig,
      guestbookConfig: page.guestbookConfig,
      publishedAt: new Date().toISOString(),
    };
    const published = await prisma.thankYouPage.update({
      where: { eventId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        lastPublishedSnapshot: snapshot,
        ...(updatedById ? { updatedById } : {}),
      },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
    if (updatedById) {
      await createAuditLog({
        userId: updatedById,
        action: "UPDATE",
        entity: "ThankYouPage",
        entityId: published.id,
        details: { eventId, published: true },
      }).catch(() => undefined);
    }
    return published;
  }

  async unpublish(eventId: string, updatedById?: string) {
    const unpublished = await prisma.thankYouPage.update({
      where: { eventId },
      data: {
        status: "DRAFT",
        ...(updatedById ? { updatedById } : {}),
      },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
    if (updatedById) {
      await createAuditLog({
        userId: updatedById,
        action: "UPDATE",
        entity: "ThankYouPage",
        entityId: unpublished.id,
        details: { eventId, published: false },
      }).catch(() => undefined);
    }
    return unpublished;
  }

  private async hydratePublished(page: NonNullable<Awaited<ReturnType<ThankYouService["getOrCreate"]>>>) {
    if (page.status !== "PUBLISHED" || page.archivedAt) return null;
    const invitation = await loadInvitationThemeHint(page.eventId);
    const design = resolveThankYouDesign({
      templateId: page.templateId,
      themeSource: page.themeSource,
      designConfig: page.designConfig,
      invitation,
      pageBackgroundImageUrl: page.backgroundImageUrl,
      pageBackgroundVideoUrl: page.backgroundVideoUrl,
    });
    const template = getThankYouTemplate(page.templateId);
    const sectionConfig = parseSectionConfig(page.sectionConfig);
    const guestbookConfig = parseGuestbookConfig(page.guestbookConfig);
    const sharingConfig = parseSharingConfig(page.sharingConfig);
    const featuredMemoryIds = parseFeaturedMemoryIds(page.featuredMemoryIds);

    let featuredMemories: Awaited<
      ReturnType<typeof eventMemoryUploadService.listApprovedPublic>
    >["items"] = [];
    try {
      const approved = await eventMemoryUploadService.listApprovedPublic(page.eventId, 1, 24);
      if (featuredMemoryIds.length) {
        const map = new Map(approved.items.map((item) => [item.id, item]));
        featuredMemories = featuredMemoryIds
          .map((id) => map.get(id))
          .filter(Boolean) as typeof featuredMemories;
        if (!featuredMemories.length) {
          featuredMemories = approved.items.slice(0, 8);
        }
      } else {
        featuredMemories = approved.items.filter((item) => item.isFeatured).slice(0, 8);
        if (!featuredMemories.length) featuredMemories = approved.items.slice(0, 8);
      }
    } catch {
      featuredMemories = [];
    }

    return {
      ...page,
      template: {
        ...template,
        accentColor: design.accentColor,
        background: design.background,
        fontFamily: design.isLight ? "serif" : "serif",
      },
      design,
      sectionConfig,
      guestbookConfig,
      sharingConfig,
      featuredMemoryIds,
      featuredMemories,
      invitationTheme: invitation,
    };
  }

  async getPublishedBySlug(slug: string) {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return null;
    const page = await prisma.thankYouPage.findUnique({
      where: { eventId: event.id },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
    if (!page) return null;
    return this.hydratePublished(page);
  }

  async getPublishedByShareToken(token: string) {
    const page = await prisma.thankYouPage.findFirst({
      where: { shareToken: token, status: "PUBLISHED" },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
    if (!page) return null;
    return this.hydratePublished(page);
  }

  async ensureShareToken(eventId: string) {
    const page = await this.getOrCreate(eventId);
    if (page.shareToken) return page;
    return prisma.thankYouPage.update({
      where: { eventId },
      data: { shareToken: generateShareToken() },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
            startDate: true,
          },
        },
      },
    });
  }

  formatPublicPage(page: Awaited<ReturnType<ThankYouService["getPublishedBySlug"]>>) {
    if (!page) return null;
    return {
      id: page.id,
      eventId: page.eventId,
      templateId: page.templateId,
      title: page.title,
      message: page.message,
      eyebrow: page.eyebrow,
      subtitle: page.subtitle,
      closingMessage: page.closingMessage,
      signatureLine: page.signatureLine,
      hostNames: page.hostNames,
      eventHashtag: page.eventHashtag,
      footerText: page.footerText,
      flyerUrl: page.flyerUrl,
      hostPhotoUrl: page.hostPhotoUrl,
      heroImageUrl: page.heroImageUrl,
      backgroundImageUrl: page.backgroundImageUrl,
      backgroundVideoUrl: page.backgroundVideoUrl,
      signatureImageUrl: page.signatureImageUrl,
      audioUrl: page.audioUrl,
      themeSource: page.themeSource,
      status: page.status as ThankYouPageStatus,
      publishedAt: page.publishedAt,
      event: page.event,
      template: page.template,
      design: page.design,
      sectionConfig: page.sectionConfig,
      guestbookConfig: page.guestbookConfig,
      sharingConfig: page.sharingConfig,
      featuredMemories: page.featuredMemories,
      designConfig: parseDesignConfig(page.designConfig),
    };
  }

  async previewForOrganizer(eventId: string, draft?: UpdateThankYouInput) {
    const page = await this.getOrCreate(eventId);
    const merged = {
      ...page,
      ...draft,
      designConfig: draft?.designConfig ?? page.designConfig,
      sectionConfig: draft?.sectionConfig ?? page.sectionConfig,
      guestbookConfig: draft?.guestbookConfig ?? page.guestbookConfig,
      sharingConfig: draft?.sharingConfig ?? page.sharingConfig,
      featuredMemoryIds: draft?.featuredMemoryIds ?? page.featuredMemoryIds,
      templateId: draft?.templateId ?? page.templateId,
      themeSource: draft?.themeSource ?? page.themeSource,
      status: "PUBLISHED" as const,
      archivedAt: null,
    };
    return this.hydratePublished(merged as typeof page);
  }
}

export const thankYouService = new ThankYouService();
