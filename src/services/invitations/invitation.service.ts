import { prisma } from "@/lib/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { qrService } from "@/services/qr/qr.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { GuestStatus, Prisma } from "@prisma/client";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";

export interface CreateInvitationInput {
  eventId: string;
  name: string;
  templateId?: string;
  message?: string;
  designConfig?: InvitationDesignConfig;
}

export interface GuestInput {
  name: string;
  email?: string;
  phone?: string;
  plusOnes?: number;
}

export interface AddGuestInput extends GuestInput {
  eventId: string;
  invitationId?: string;
}

export class InvitationService {
  private async resolveTemplateId(templateIdOrSlug?: string) {
    if (!templateIdOrSlug?.trim()) return undefined;
    const template = await prisma.eventTemplate.findFirst({
      where: { OR: [{ id: templateIdOrSlug }, { slug: templateIdOrSlug }] },
    });
    return template?.id;
  }

  async createInvitation(input: CreateInvitationInput) {
    const event = await prisma.event.findUnique({ where: { id: input.eventId } });
    if (!event) throw new Error("Event not found. Please select a valid event from the list.");

    const templateId = await this.resolveTemplateId(input.templateId);
    const slug = `${slugify(input.name) || "invitation"}-${generateToken(6)}`;
    const uniqueLink = generateToken(32);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const invitation = await prisma.invitation.create({
      data: {
        eventId: input.eventId,
        name: input.name.trim(),
        message: input.message?.trim() || null,
        templateId,
        designConfig: input.designConfig as Prisma.InputJsonValue | undefined,
        slug,
        uniqueLink,
        status: "ACTIVE",
      },
      include: { event: true, template: true },
    });

    return {
      ...invitation,
      shareUrl: `${appUrl}/invite/${uniqueLink}`,
    };
  }

  async getEventInvitations(eventId: string) {
    return prisma.invitation.findMany({
      where: { eventId },
      include: { _count: { select: { guests: true } }, template: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getInvitationByLink(uniqueLink: string) {
    return prisma.invitation.findUnique({
      where: { uniqueLink },
      include: {
        event: { include: { theme: true, media: true } },
        template: true,
        guests: { include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 } } },
      },
    });
  }

  async getGuestForInvitation(invitationId: string, guestToken: string) {
    return prisma.guest.findFirst({
      where: { invitationId, qrToken: guestToken },
      include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }

  async updateInvitationDesign(
    invitationId: string,
    designConfig: InvitationDesignConfig,
    organizerId: string
  ) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { event: { select: { organizerId: true } } },
    });
    if (!invitation || invitation.event.organizerId !== organizerId) {
      throw new Error("Invitation not found");
    }

    const existing = invitation.designConfig as (InvitationDesignConfig & {
      _revisions?: { savedAt: string; config: InvitationDesignConfig }[];
    }) | null;

    const revisions = existing?._revisions ?? [];
    if (existing?.layout) {
      const { _revisions: _, ...configOnly } = existing;
      revisions.unshift({
        savedAt: new Date().toISOString(),
        config: configOnly as InvitationDesignConfig,
      });
    }

    const nextConfig = {
      ...designConfig,
      _revisions: revisions.slice(0, 10),
    };

    return prisma.invitation.update({
      where: { id: invitationId },
      data: { designConfig: nextConfig as unknown as Prisma.InputJsonValue },
      include: { template: true },
    });
  }

  async addGuest(input: AddGuestInput) {
    const guest = await prisma.guest.create({
      data: {
        eventId: input.eventId,
        invitationId: input.invitationId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        plusOnes: input.plusOnes ?? 0,
        status: "INVITED",
      },
    });

    const { dataUrl, token } = await qrService.createGuestQr(input.eventId, guest.id);

    return { guest, qrDataUrl: dataUrl, qrToken: token };
  }

  async addGuestsBulk(eventId: string, invitationId: string | undefined, guests: GuestInput[]) {
    const results = [];
    for (const g of guests) {
      const result = await this.addGuest({ ...g, eventId, invitationId });
      results.push(result);
    }
    return results;
  }

  async submitRsvp(guestId: string, response: "ACCEPTED" | "DECLINED" | "MAYBE", message?: string) {
    const statusMap = { ACCEPTED: "ACCEPTED", DECLINED: "DECLINED", MAYBE: "MAYBE" } as const;

    const [rsvp] = await Promise.all([
      prisma.rsvp.create({ data: { guestId, response, message } }),
      prisma.guest.update({
        where: { id: guestId },
        data: { status: statusMap[response] },
      }),
    ]);

    return rsvp;
  }

  async getEventGuests(
    eventId: string,
    options?: { page?: number; limit?: number; status?: string }
  ) {
    const { page, limit, skip } = parsePaginationInput(options, { limit: 20 });

    const where: Prisma.GuestWhereInput = { eventId };
    if (options?.status && options.status !== "all") {
      if (options.status === "NO_RESPONSE") {
        where.status = {
          notIn: ["ACCEPTED", "DECLINED", "MAYBE", "CHECKED_IN", "OPENED"] as GuestStatus[],
        };
      } else {
        where.status = options.status as GuestStatus;
      }
    }

    const [guests, total, statusGroups] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 }, invitation: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.guest.count({ where }),
      prisma.guest.groupBy({
        by: ["status"],
        where: { eventId },
        _count: true,
      }),
    ]);

    const counts: Record<string, number> = {
      INVITED: 0,
      OPENED: 0,
      ACCEPTED: 0,
      DECLINED: 0,
      MAYBE: 0,
      CHECKED_IN: 0,
    };
    for (const g of statusGroups) counts[g.status] = g._count;

    const eventTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    const responded = counts.ACCEPTED + counts.DECLINED + counts.MAYBE + counts.CHECKED_IN;
    const noResponse = Math.max(0, eventTotal - responded - counts.OPENED);

    return {
      ...paginatedResult(guests, total, page, limit),
      stats: { counts, total: eventTotal, noResponse },
    };
  }
}

export const invitationService = new InvitationService();
