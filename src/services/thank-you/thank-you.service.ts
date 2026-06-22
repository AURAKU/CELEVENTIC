import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ThankYouPageStatus } from "@prisma/client";
import { getThankYouTemplate } from "@/lib/thank-you/templates";

export interface UpdateThankYouInput {
  templateId?: string;
  title?: string;
  message?: string;
  flyerUrl?: string | null;
  hostPhotoUrl?: string | null;
  audioUrl?: string | null;
}

function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}

export class ThankYouService {
  async getOrCreate(eventId: string) {
    const existing = await prisma.thankYouPage.findUnique({
      where: { eventId },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true } } },
    });
    if (existing) return existing;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    return prisma.thankYouPage.create({
      data: {
        eventId,
        title: event ? `Thank You — ${event.title}` : "Thank You",
        message: "Thank you for celebrating with us. Your presence made our day unforgettable.",
        shareToken: generateShareToken(),
      },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true } } },
    });
  }

  async getForOrganizer(eventId: string) {
    return this.getOrCreate(eventId);
  }

  async update(eventId: string, data: UpdateThankYouInput) {
    await this.getOrCreate(eventId);
    return prisma.thankYouPage.update({
      where: { eventId },
      data,
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true } } },
    });
  }

  async publish(eventId: string) {
    await this.getOrCreate(eventId);
    return prisma.thankYouPage.update({
      where: { eventId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true } } },
    });
  }

  async unpublish(eventId: string) {
    return prisma.thankYouPage.update({
      where: { eventId },
      data: { status: "DRAFT" },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true } } },
    });
  }

  async getPublishedBySlug(slug: string) {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return null;

    const page = await prisma.thankYouPage.findUnique({
      where: { eventId: event.id },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true, logoUrl: true } } },
    });
    if (!page || page.status !== "PUBLISHED") return null;

    const template = getThankYouTemplate(page.templateId);
    return { ...page, template };
  }

  async getPublishedByShareToken(token: string) {
    const page = await prisma.thankYouPage.findFirst({
      where: { shareToken: token, status: "PUBLISHED" },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true, logoUrl: true } } },
    });
    if (!page) return null;
    const template = getThankYouTemplate(page.templateId);
    return { ...page, template };
  }

  async ensureShareToken(eventId: string) {
    const page = await this.getOrCreate(eventId);
    if (page.shareToken) return page;
    return prisma.thankYouPage.update({
      where: { eventId },
      data: { shareToken: generateShareToken() },
      include: { event: { select: { slug: true, title: true, hostName: true, coverImageUrl: true } } },
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
      flyerUrl: page.flyerUrl,
      hostPhotoUrl: page.hostPhotoUrl,
      audioUrl: page.audioUrl,
      status: page.status as ThankYouPageStatus,
      publishedAt: page.publishedAt,
      event: page.event,
      template: page.template,
    };
  }
}

export const thankYouService = new ThankYouService();
