import { prisma } from "@/lib/prisma";
import type { DesignType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export interface CreateFlyerInput {
  userId: string;
  eventId?: string;
  name: string;
  type: DesignType;
  config?: Record<string, unknown>;
}

export class FlyerService {
  async create(input: CreateFlyerInput) {
    return prisma.flyerDesign.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        name: input.name,
        type: input.type,
        config: input.config as Prisma.InputJsonValue,
        status: "DRAFT",
      },
    });
  }

  async getUserDesigns(userId: string, eventId?: string) {
    return prisma.flyerDesign.findMany({
      where: { userId, ...(eventId ? { eventId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async publish(id: string, userId: string) {
    return prisma.flyerDesign.update({
      where: { id, userId },
      data: { status: "PUBLISHED" },
    });
  }

  getTemplates() {
    return [
      { id: "flyer-classic", name: "Classic Flyer", type: "FLYER", preview: "/templates/flyer-classic" },
      { id: "poster-bold", name: "Bold Poster", type: "POSTER", preview: "/templates/poster-bold" },
      { id: "banner-wide", name: "Wide Banner", type: "BANNER", preview: "/templates/banner-wide" },
      { id: "social-square", name: "Social Square", type: "SOCIAL_MEDIA", preview: "/templates/social-square" },
      { id: "social-story", name: "Story Format", type: "SOCIAL_MEDIA", preview: "/templates/social-story" },
    ];
  }
}

export const flyerService = new FlyerService();
