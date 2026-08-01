import type { EventQrLinkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { generatePublicLinkToken } from "@/lib/qr-hub/vendor-token";
import { validateCustomQrDestination } from "@/lib/qr-hub/types";
import { createAuditLog } from "@/lib/audit";

const DEFAULTS: Record<
  Exclude<EventQrLinkType, "CUSTOM">,
  { title: string; heading: string; subtitle: string; footerText: string; path: string }
> = {
  MENU: {
    title: "Menu",
    heading: "View Today’s Menu",
    subtitle: "Scan to explore the menu prepared for this celebration.",
    footerText: "Menu only · No seating or gifts",
    path: "/event-menu",
  },
  SEATING_LOOKUP: {
    title: "Seating lookup",
    heading: "Find Your Seat",
    subtitle: "Scan and enter your personal pass code to view your table and seat.",
    footerText: "Your seat only · Private",
    path: "/event-seat",
  },
  PROGRAMME: {
    title: "Programme",
    heading: "Today’s Programme",
    subtitle: "Scan for times, stages and announcements.",
    footerText: "Programme only",
    path: "/event-programme",
  },
  VENUE: {
    title: "Venue & directions",
    heading: "Find Us",
    subtitle: "Venue details, landmark and map.",
    footerText: "Directions",
    path: "/event-venue",
  },
  HELP: {
    title: "Guest help",
    heading: "Need Help?",
    subtitle: "Approved contacts and assistance points.",
    footerText: "Guest assistance",
    path: "/event-help",
  },
  COMPANION_LANDING: {
    title: "Event Companion",
    heading: "Event Companion",
    subtitle: "Verify with your pass to unlock personalised experiences.",
    footerText: "Admission required for personal details",
    path: "/event-companion",
  },
};

export class EventQrLinkService {
  async ensureStandard(eventId: string, type: Exclude<EventQrLinkType, "CUSTOM">, createdById?: string) {
    const defaults = DEFAULTS[type];
    const existing = await prisma.eventQrLink.findFirst({
      where: { eventId, type, title: defaults.title },
    });
    if (existing) return existing;

    return prisma.eventQrLink.create({
      data: {
        eventId,
        type,
        publicToken: generatePublicLinkToken(),
        status: "ACTIVE",
        title: defaults.title,
        heading: defaults.heading,
        subtitle: defaults.subtitle,
        footerText: defaults.footerText,
        createdById,
      },
    });
  }

  async ensureAllStandard(eventId: string, createdById?: string) {
    const types = Object.keys(DEFAULTS) as Array<Exclude<EventQrLinkType, "CUSTOM">>;
    const links = [];
    for (const type of types) {
      links.push(await this.ensureStandard(eventId, type, createdById));
    }
    return links;
  }

  async getByToken(publicToken: string) {
    return prisma.eventQrLink.findUnique({
      where: { publicToken },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            hostName: true,
            startDate: true,
            endDate: true,
            venueName: true,
            landmark: true,
            mapsLink: true,
            contactPhone: true,
            dressCode: true,
            status: true,
            coverImageUrl: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async publicUrl(link: { publicToken: string; type: EventQrLinkType; destinationUrl?: string | null }) {
    if (link.type === "CUSTOM" && link.destinationUrl) return link.destinationUrl;
    const defaults = DEFAULTS[link.type as Exclude<EventQrLinkType, "CUSTOM">];
    const base = await getServerAppUrl();
    return `${base}${defaults.path}/${link.publicToken}`;
  }

  qrPreview(url: string, eventId: string, size = 512) {
    return `/api/qr/image?data=${encodeURIComponent(url)}&eventId=${encodeURIComponent(eventId)}&size=${size}`;
  }

  async createCustom(
    eventId: string,
    input: { title: string; subtitle?: string; destinationUrl: string; createdById?: string }
  ) {
    const dest = validateCustomQrDestination(input.destinationUrl);
    if (!dest.ok) throw new Error(dest.error);
    const link = await prisma.eventQrLink.create({
      data: {
        eventId,
        type: "CUSTOM",
        publicToken: generatePublicLinkToken(),
        status: "ACTIVE",
        title: input.title.trim() || "Custom link",
        subtitle: input.subtitle?.trim() || null,
        heading: input.title.trim() || "Custom link",
        destinationUrl: dest.url,
        createdById: input.createdById,
      },
    });
    await createAuditLog({
      userId: input.createdById,
      action: "CREATE",
      entity: "event_qr_link",
      entityId: link.id,
      details: { eventId, type: "CUSTOM" },
    });
    return link;
  }

  async setStatus(linkId: string, eventId: string, status: "ACTIVE" | "DISABLED" | "REVOKED", actorId: string) {
    const link = await prisma.eventQrLink.updateMany({
      where: { id: linkId, eventId },
      data: { status },
    });
    if (!link.count) throw new Error("QR link not found");
    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "event_qr_link",
      entityId: linkId,
      details: { eventId, status },
    });
  }

  async rotateToken(linkId: string, eventId: string, actorId: string) {
    const updated = await prisma.eventQrLink.updateMany({
      where: { id: linkId, eventId },
      data: { publicToken: generatePublicLinkToken() },
    });
    if (!updated.count) throw new Error("QR link not found");
    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "event_qr_link",
      entityId: linkId,
      details: { eventId, event: "token_rotated" },
    });
    return prisma.eventQrLink.findFirst({ where: { id: linkId, eventId } });
  }
}

export const eventQrLinkService = new EventQrLinkService();
