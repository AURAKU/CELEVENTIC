import { prisma } from "@/lib/prisma";
import type { InvitationLanguageMode } from "@prisma/client";

interface OrderContent {
  id: string;
  languageMode: InvitationLanguageMode;
  eventTitle?: string | null;
  story?: string | null;
  dressCode?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  hostName?: string | null;
  eventTitleFr?: string | null;
  storyFr?: string | null;
}

export class InvitationLanguageService {
  async syncVersionsFromOrder(order: OrderContent) {
    const codes: string[] =
      order.languageMode === "EN_ONLY"
        ? ["en"]
        : order.languageMode === "FR_ONLY"
          ? ["fr"]
          : ["en", "fr"];

    for (const code of codes) {
      const isFr = code === "fr";
      await prisma.invitationLanguageVersion.upsert({
        where: {
          invitationOrderId_languageCode: {
            invitationOrderId: order.id,
            languageCode: code,
          },
        },
        update: {
          mode: order.languageMode,
          eventTitle: isFr ? (order.eventTitleFr ?? order.eventTitle) : order.eventTitle,
          story: isFr ? (order.storyFr ?? order.story) : order.story,
          dressCode: order.dressCode,
          venueName: order.venueName,
          landmark: order.landmark,
          hostName: order.hostName,
          isPublished: true,
        },
        create: {
          invitationOrderId: order.id,
          languageCode: code,
          mode: order.languageMode,
          eventTitle: isFr ? (order.eventTitleFr ?? order.eventTitle) : order.eventTitle,
          story: isFr ? (order.storyFr ?? order.story) : order.story,
          dressCode: order.dressCode,
          venueName: order.venueName,
          landmark: order.landmark,
          hostName: order.hostName,
          isPublished: true,
        },
      });
    }
  }

  async getVersionsForOrder(orderId: string) {
    return prisma.invitationLanguageVersion.findMany({
      where: { invitationOrderId: orderId, isPublished: true },
    });
  }

  getAvailableLocales(mode: InvitationLanguageMode): ("en" | "fr")[] {
    if (mode === "EN_ONLY") return ["en"];
    if (mode === "FR_ONLY") return ["fr"];
    return ["en", "fr"];
  }
}

export const invitationLanguageService = new InvitationLanguageService();
