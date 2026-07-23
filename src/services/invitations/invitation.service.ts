import { prisma } from "@/lib/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { qrService } from "@/services/qr/qr.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { GuestStatus, Prisma } from "@prisma/client";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { getAppUrlFromEnv } from "@/lib/app-url";

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
    const appUrl = getAppUrlFromEnv();

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

  async getEventInvitations(eventId: string, page = 1, limit = 20) {
    const where = { eventId };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: { _count: { select: { guests: true } }, template: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invitation.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async getInvitationByLink(uniqueLink: string) {
    return prisma.invitation.findUnique({
      where: { uniqueLink },
      include: {
        event: {
          include: {
            theme: true,
            media: true,
            defaultMusicTrack: {
              select: {
                id: true,
                title: true,
                artist: true,
                url: true,
                durationSec: true,
                isActive: true,
              },
            },
          },
        },
        template: true,
        guests: { include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 } } },
      },
    });
  }

  /**
   * Resolve the guest for a personalized invite link (`/invite/{link}?guest={qrToken}`).
   * Prefer an exact invitation match; fall back to event-scoped token lookup because
   * Guest CRM often creates guests without invitationId.
   */
  async getGuestForInvitation(invitationId: string, guestToken: string) {
    const token = guestToken?.trim();
    if (!token) return null;

    const include = { rsvps: { orderBy: { createdAt: "desc" as const }, take: 1 } };

    const byInvitation = await prisma.guest.findFirst({
      where: { invitationId, qrToken: token },
      include,
    });
    if (byInvitation) return byInvitation;

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { eventId: true },
    });
    if (!invitation) return null;

    return prisma.guest.findFirst({
      where: { eventId: invitation.eventId, qrToken: token },
      include,
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
    const { allocateManualAdmissionCode } = await import("@/lib/qr/manual-code");
    const manualCode = await allocateManualAdmissionCode(input.eventId);

    let invitationId = input.invitationId;
    if (!invitationId) {
      const primary = await prisma.invitation.findFirst({
        where: { eventId: input.eventId, status: { not: "EXPIRED" } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      invitationId = primary?.id;
    }

    const guest = await prisma.guest.create({
      data: {
        eventId: input.eventId,
        invitationId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        plusOnes: input.plusOnes ?? 0,
        status: "INVITED",
        manualCode,
      },
    });

    const { dataUrl, token } = await qrService.createGuestQr(input.eventId, guest.id);
    await qrService.createGuestAdmissionQr(input.eventId, guest.id);

    return { guest, qrDataUrl: dataUrl, qrToken: token, manualCode };
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

    const [guests, total, statusGroups, primaryInvite] = await Promise.all([
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
      prisma.invitation.findFirst({
        where: { eventId, status: { not: "EXPIRED" } },
        orderBy: { createdAt: "desc" },
        select: { uniqueLink: true },
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
      defaultInviteUniqueLink: primaryInvite?.uniqueLink ?? null,
    };
  }
}

export const invitationService = new InvitationService();
