import { prisma } from "@/lib/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { qrService } from "@/services/qr/qr.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { GuestStatus, Prisma } from "@prisma/client";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { cleanName } from "@/lib/guest-import/name";
import { normalizeEmail, normalizeGhanaPhone } from "@/lib/guest-import/contact";
import { assertNoActiveGuestDuplicate } from "@/lib/guest-search/duplicate-guests";
import { computeGuestCrmPeopleStats } from "@/lib/seating/people-stats";

export interface CreateInvitationInput {
  eventId: string;
  name: string;
  templateId?: string;
  message?: string;
  designConfig?: InvitationDesignConfig;
  /** Explicit override after the organiser confirmed a name collision. */
  acknowledgeDuplicates?: boolean;
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
  acknowledgeDuplicates?: boolean;
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

    const displayName = cleanName(input.name);
    if (displayName.length < 2) {
      throw new Error("Invitation name must be at least 2 characters");
    }
    if (!input.acknowledgeDuplicates) {
      await assertNoActiveGuestDuplicate(input.eventId, displayName);
    }

    const templateId = await this.resolveTemplateId(input.templateId);
    const slug = `${slugify(displayName) || "invitation"}-${generateToken(6)}`;
    const uniqueLink = generateToken(32);
    const appUrl = getAppUrlFromEnv();

    const invitation = await prisma.invitation.create({
      data: {
        eventId: input.eventId,
        name: displayName,
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
        guests: {
          where: { archivedAt: null },
          include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    });
  }

  /**
   * Resolve the guest for a personalized invite link (`/invite/{link}?guest={qrToken}`).
   *
   * Strict invitation-party isolation: the guest must belong to THIS invitation.
   * Never fall back to event-scoped token lookup — that mixed unrelated parties
   * (e.g. “The OBUAH Family” into “Akua & Kelly”) on the same public page.
   */
  async getGuestForInvitation(invitationId: string, guestToken: string) {
    const token = guestToken?.trim();
    if (!token) return null;

    return prisma.guest.findFirst({
      where: {
        invitationId,
        qrToken: token,
        archivedAt: null,
      },
      include: { rsvps: { orderBy: { createdAt: "desc" as const }, take: 1 } },
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
    const displayName = cleanName(input.name);
    if (displayName.length < 2) {
      throw new Error("Enter the guest name.");
    }
    const email = normalizeEmail(input.email).value;
    const phone = normalizeGhanaPhone(input.phone).value;
    if (!input.acknowledgeDuplicates) {
      await assertNoActiveGuestDuplicate(input.eventId, displayName, email, phone);
    }

    const { allocateManualAdmissionCode } = await import("@/lib/qr/manual-code");
    const manualCode = await allocateManualAdmissionCode(input.eventId);

    // Never auto-attach to the newest event invitation — that polluted unrelated
    // party rosters. Guests without an explicit invitationId stay unlinked until
    // the organiser assigns them (or quick-invite / import mints a party).
    const invitationId = input.invitationId?.trim() || null;
    if (invitationId) {
      const owned = await prisma.invitation.findFirst({
        where: { id: invitationId, eventId: input.eventId },
        select: { id: true },
      });
      if (!owned) {
        throw new Error("Invitation not found for this event.");
      }
    }

    const guest = await prisma.guest.create({
      data: {
        eventId: input.eventId,
        invitationId,
        name: displayName,
        email: email ?? undefined,
        phone: phone ?? undefined,
        plusOnes: input.plusOnes ?? 0,
        status: "INVITED",
        manualCode,
      },
    });

    const { dataUrl, token } = await qrService.createGuestQr(input.eventId, guest.id);
    await qrService.createGuestAdmissionQr(input.eventId, guest.id);

    return { guest, qrDataUrl: dataUrl, qrToken: token, manualCode };
  }

  async addGuestsBulk(
    eventId: string,
    invitationId: string | undefined,
    guests: Array<GuestInput & { acknowledgeDuplicates?: boolean }>
  ) {
    const results = [];
    for (const g of guests) {
      const result = await this.addGuest({ ...g, eventId, invitationId });
      results.push(result);
    }
    return results;
  }

  async submitRsvp(guestId: string, response: "ACCEPTED" | "DECLINED" | "MAYBE", message?: string) {
    const statusMap = { ACCEPTED: "ACCEPTED", DECLINED: "DECLINED", MAYBE: "MAYBE" } as const;

    // RSVP is a seating / planning signal — never demote gate admission.
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        eventId: true,
        invitationId: true,
        event: {
          select: {
            id: true,
            title: true,
            organizerId: true,
            organizer: { select: { id: true, email: true, name: true } },
            collaborators: {
              where: { isActive: true },
              select: { userId: true, user: { select: { email: true } } },
            },
          },
        },
      },
    });
    if (!guest) throw new Error("Guest not found");

    const [rsvp] = await Promise.all([
      prisma.rsvp.create({ data: { guestId, response, message } }),
      guest.status === "CHECKED_IN"
        ? Promise.resolve(null)
        : prisma.guest.update({
            where: { id: guestId },
            data: { status: statusMap[response] },
          }),
    ]);

    // Organizer/admin planning signal — never fail the guest's RSVP if notify lags.
    await this.notifyOrganizersOfRsvp({
      guestId: guest.id,
      guestName: guest.name,
      guestEmail: guest.email,
      eventId: guest.event.id,
      eventTitle: guest.event.title,
      organizerId: guest.event.organizerId,
      organizerEmail: guest.event.organizer.email,
      collaboratorUserIds: guest.event.collaborators.map((c) => c.userId),
      collaboratorEmails: guest.event.collaborators
        .map((c) => c.user.email)
        .filter((email): email is string => Boolean(email)),
      response,
      message,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[rsvp] organizer notify incomplete", { guestId, response, message });
    });

    return rsvp;
  }

  private async notifyOrganizersOfRsvp(input: {
    guestId: string;
    guestName: string;
    guestEmail: string | null;
    eventId: string;
    eventTitle: string;
    organizerId: string;
    organizerEmail: string | null;
    collaboratorUserIds: string[];
    collaboratorEmails: string[];
    response: "ACCEPTED" | "DECLINED" | "MAYBE";
    message?: string;
  }) {
    const { notificationService } = await import("@/services/notifications/notification.service");
    const { emailTemplateService } = await import("@/services/i18n/email-template.service");
    const { languageService } = await import("@/services/i18n/language.service");
    const { createAuditLog } = await import("@/lib/audit");

    const decision =
      input.response === "ACCEPTED"
        ? "Accepted"
        : input.response === "DECLINED"
          ? "Declined"
          : "Maybe";
    const guestsLink = `/dashboard/guests?eventId=${encodeURIComponent(input.eventId)}`;
    const seatingLink = `/dashboard/seating?eventId=${encodeURIComponent(input.eventId)}`;
    const title = `${input.guestName} ${decision}`;
    const body = [
      `${input.guestName} responded ${decision} for ${input.eventTitle}.`,
      input.message?.trim() ? `Note: ${input.message.trim()}` : null,
      "Use Guests and Seating to plan tables and headcount.",
    ]
      .filter(Boolean)
      .join(" ");

    const recipientIds = Array.from(
      new Set([input.organizerId, ...input.collaboratorUserIds].filter(Boolean))
    );

    await Promise.all(
      recipientIds.map((userId) =>
        notificationService.notify(userId, {
          type: "GUEST_RSVP",
          title,
          message: body,
          link: guestsLink,
        })
      )
    );

    const locale = await languageService.getUserPreference(input.organizerId);
    const emailRecipients = Array.from(
      new Set(
        [input.organizerEmail, ...input.collaboratorEmails]
          .map((email) => email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email))
      )
    );

    const { isProviderEnabled } = await import("@/lib/integrations/integration-runtime");
    const { getPlatformDefaultProviders } = await import(
      "@/lib/integrations/platform-provider-settings"
    );
    const { CommunicationProviderError } = await import(
      "@/services/communications/communication.service"
    );
    const defaults = await getPlatformDefaultProviders();
    const emailProvider = defaults.email || "RESEND";
    const emailEnabled = await isProviderEnabled(emailProvider);

    if (!emailEnabled) {
      console.warn("[rsvp] organizer notification skipped", {
        reason: "RESEND_DISABLED",
        guestId: input.guestId,
        response: input.response,
      });
    } else if (emailRecipients.length > 0) {
      await Promise.all(
        emailRecipients.map((to) =>
          emailTemplateService
            .sendLocalized("rsvp_organizer", to, locale, {
              guest: input.guestName,
              response: decision,
              event: input.eventTitle,
              guestsUrl: `${getAppUrlFromEnv()}${guestsLink}`,
              seatingUrl: `${getAppUrlFromEnv()}${seatingLink}`,
            })
            .catch((err) => {
              if (err instanceof CommunicationProviderError) {
                console.warn("[rsvp] organizer notification skipped", {
                  reason: "PROVIDER_ERROR",
                  guestId: input.guestId,
                  response: input.response,
                  message: err.message,
                });
                return;
              }
              console.error("[rsvp] organizer email failed", {
                guestId: input.guestId,
                response: input.response,
                message: err instanceof Error ? err.message : String(err),
              });
            })
        )
      );
    }

    if (emailEnabled && input.guestEmail?.trim()) {
      await emailTemplateService
        .sendLocalized("rsvp_confirmation", input.guestEmail.trim(), locale, {
          name: input.guestName,
          response: decision,
          event: input.eventTitle,
        })
        .catch((err) => {
          if (err instanceof CommunicationProviderError) {
            console.warn("[rsvp] guest confirmation email skipped:", err.message);
            return;
          }
          console.warn(
            "[rsvp] guest confirmation email failed:",
            err instanceof Error ? err.message : err
          );
        });
    }

    await createAuditLog({
      userId: input.organizerId,
      action: "CREATE",
      entity: "rsvp",
      entityId: input.guestId,
      details: {
        kind: "guest_rsvp",
        eventId: input.eventId,
        response: input.response,
        guestName: input.guestName,
        notifiedUserIds: recipientIds,
        emailProvider,
        emailSkipped: !emailEnabled,
      },
    });
  }

  async getEventGuests(
    eventId: string,
    options?: { page?: number; limit?: number; status?: string }
  ) {
    const { page, limit, skip } = parsePaginationInput(options, { limit: 20 });

    const where: Prisma.GuestWhereInput = { eventId, archivedAt: null };
    if (options?.status && options.status !== "all") {
      if (options.status === "NO_RESPONSE") {
        where.status = {
          notIn: ["ACCEPTED", "DECLINED", "MAYBE", "CHECKED_IN", "OPENED"] as GuestStatus[],
        };
      } else {
        where.status = options.status as GuestStatus;
      }
    }

    const [guests, total, peopleRows, primaryInvite] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: { rsvps: { orderBy: { createdAt: "desc" }, take: 1 }, invitation: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.guest.count({ where }),
      prisma.guest.findMany({
        where: { eventId, archivedAt: null },
        select: {
          id: true,
          invitationId: true,
          plusOnes: true,
          status: true,
          invitation: {
            select: {
              admissionAllowance: true,
              admittedCount: true,
            },
          },
        },
        take: 10_000,
      }),
      prisma.invitation.findFirst({
        where: { eventId, status: { not: "EXPIRED" }, archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: { uniqueLink: true },
      }),
    ]);

    const peopleStats = computeGuestCrmPeopleStats(
      peopleRows.map((guest) => {
        const allowance =
          guest.invitation?.admissionAllowance ?? 1 + Math.max(0, guest.plusOnes);
        const admittedCount = Math.max(0, guest.invitation?.admittedCount ?? 0);
        return {
          id: guest.id,
          invitationId: guest.invitationId,
          partySize: Math.max(1, allowance),
          status: guest.status,
          admission: {
            allowance: Math.max(1, allowance),
            admittedCount,
          },
        };
      })
    );

    return {
      ...paginatedResult(guests, total, page, limit),
      stats: {
        counts: peopleStats.counts,
        total: peopleStats.total,
        noResponse: peopleStats.noResponse,
        invitationRecords: peopleStats.invitationRecords,
      },
      defaultInviteUniqueLink: primaryInvite?.uniqueLink ?? null,
    };
  }
}

export const invitationService = new InvitationService();
