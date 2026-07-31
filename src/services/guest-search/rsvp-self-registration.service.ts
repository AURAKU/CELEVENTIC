import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getServerAppUrl } from "@/lib/app-url";
import { cleanName, nameKey } from "@/lib/guest-import/name";
import { normalizeEmail, normalizeGhanaPhone } from "@/lib/guest-import/contact";
import { findActiveGuestDuplicates } from "@/lib/guest-search/duplicate-guests";
import type { DuplicateWarning } from "@/lib/guest-search/types";
import { looksLikeEventTitle } from "@/lib/invitation-features/place-card";
import { clampPartySize } from "@/lib/guest-search/party-allowance";
import {
  createQuickInvitation,
  buildQrImageUrl,
} from "@/services/guest-search/quick-invite.service";
import {
  allocateInvitationSlug,
  ensureGuestGateCode,
  featureConfigFor,
  loadEventCompanionFeatureConfig,
  newUniqueLink,
} from "@/services/invitations/personalised-invitation";
import { ensureInvitationPass } from "@/services/admission/guest-pass.service";

/**
 * Open / general template invitations are the published ceremony link that
 * anyone can RSVP on. They must stay guestless (or only briefly hold guests
 * pending promotion) so each self-registered person gets their own CRM card
 * and shareable invite URL.
 */
export function isOpenHostInvitation(input: {
  name: string;
  isGeneralPass?: boolean | null;
  eventTitle: string;
  guests: Array<{ name: string }>;
}): boolean {
  if (input.isGeneralPass) return false;
  if (looksLikeEventTitle(input.name)) return true;
  if (nameKey(input.name) === nameKey(input.eventTitle)) return true;
  if (input.guests.length === 0) return true;
  return !input.guests.some((guest) => nameKey(guest.name) === nameKey(input.name));
}

export async function notifyOrganizersOfDuplicateGuest(input: {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  organizerEmail: string | null;
  collaboratorUserIds: string[];
  collaboratorEmails: string[];
  guestName: string;
  guestId: string;
  invitationId: string;
  duplicates: DuplicateWarning[];
}): Promise<void> {
  if (!input.duplicates.length) return;

  const { notificationService } = await import("@/services/notifications/notification.service");
  const { emailTemplateService } = await import("@/services/i18n/email-template.service");
  const { languageService } = await import("@/services/i18n/language.service");
  const { getAppUrlFromEnv } = await import("@/lib/app-url");

  const guestsLink = `/dashboard/guests?eventId=${encodeURIComponent(input.eventId)}`;
  const collisionList = input.duplicates
    .slice(0, 5)
    .map((row) => row.name)
    .join(", ");
  const title = `Possible duplicate guest: ${input.guestName}`;
  const message = [
    `${input.guestName} just RSVP’d for ${input.eventTitle}, but similar guests already exist (${collisionList}).`,
    "Open Guests to edit or delete the wrong entry.",
  ].join(" ");

  const recipientIds = Array.from(
    new Set([input.organizerId, ...input.collaboratorUserIds].filter(Boolean))
  );

  await Promise.all(
    recipientIds.map((userId) =>
      notificationService.notify(userId, {
        type: "GUEST_RSVP_DUPLICATE",
        title,
        message,
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

  await Promise.all(
    emailRecipients.map((to) =>
      emailTemplateService
        .sendLocalized("rsvp_organizer", to, locale, {
          guest: input.guestName,
          response: `Possible duplicate — review Guests`,
          event: input.eventTitle,
          guestsUrl: `${getAppUrlFromEnv()}${guestsLink}`,
          seatingUrl: `${getAppUrlFromEnv()}/dashboard/seating?eventId=${encodeURIComponent(input.eventId)}`,
        })
        .catch(() => undefined)
    )
  );

  await createAuditLog({
    userId: input.organizerId,
    action: "CREATE",
    entity: "rsvp",
    entityId: input.guestId,
    details: {
      kind: "guest_rsvp_duplicate",
      eventId: input.eventId,
      invitationId: input.invitationId,
      guestName: input.guestName,
      duplicates: input.duplicates.map((row) => ({
        kind: row.kind,
        id: row.id,
        name: row.name,
      })),
      notifiedUserIds: recipientIds,
    },
  });
}

/**
 * Self-register from an open template RSVP: mint a personalised invitation so
 * the organiser sees/edit/shares a real guest-list card.
 */
export async function registerOpenHostRsvp(input: {
  sourceInvitationId: string;
  guestName: string;
  email?: string | null;
  phone?: string | null;
  partySize?: number;
}): Promise<{
  invitationId: string;
  guestId: string;
  inviteUrl: string;
  invitePath: string;
  allowance: number;
  duplicates: DuplicateWarning[];
  organizerId: string;
  eventId: string;
  eventTitle: string;
  organizerEmail: string | null;
  collaboratorUserIds: string[];
  collaboratorEmails: string[];
}> {
  const source = await prisma.invitation.findUnique({
    where: { id: input.sourceInvitationId },
    select: {
      id: true,
      name: true,
      templateId: true,
      isGeneralPass: true,
      eventId: true,
      event: {
        select: {
          id: true,
          title: true,
          organizerId: true,
          organizer: { select: { email: true } },
          collaborators: {
            where: { isActive: true },
            select: { userId: true, user: { select: { email: true } } },
          },
        },
      },
      guests: {
        where: { archivedAt: null },
        select: { name: true },
      },
    },
  });
  if (!source) throw new Error("Invitation not found");

  if (
    !isOpenHostInvitation({
      name: source.name,
      isGeneralPass: source.isGeneralPass,
      eventTitle: source.event.title,
      guests: source.guests,
    })
  ) {
    throw new Error("NOT_OPEN_HOST");
  }

  const displayName = cleanName(input.guestName);
  const email = normalizeEmail(input.email).value;
  const phone = normalizeGhanaPhone(input.phone).value;
  const partySize = clampPartySize(input.partySize ?? 1);

  // Same person re-submitting on the general link should update their existing
  // personalised card, not mint a second invitation.
  const existingGuests = await prisma.guest.findMany({
    where: {
      eventId: source.eventId,
      archivedAt: null,
      invitation: { isGeneralPass: false, archivedAt: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      invitationId: true,
      qrToken: true,
      invitation: { select: { uniqueLink: true, admissionAllowance: true } },
    },
    take: 80,
  });
  const exact = existingGuests.find((guest) => nameKey(guest.name) === nameKey(displayName));
  if (exact?.invitationId && exact.invitation) {
    if (email || phone) {
      await prisma.guest.update({
        where: { id: exact.id },
        data: {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        },
      });
    }
    const appUrl = await getServerAppUrl();
    const invitePath = `/invite/${exact.invitation.uniqueLink}?guest=${exact.qrToken}`;
    return {
      invitationId: exact.invitationId,
      guestId: exact.id,
      inviteUrl: `${appUrl}${invitePath}`,
      invitePath,
      allowance: exact.invitation.admissionAllowance ?? partySize,
      duplicates: [],
      organizerId: source.event.organizerId,
      eventId: source.eventId,
      eventTitle: source.event.title,
      organizerEmail: source.event.organizer.email,
      collaboratorUserIds: source.event.collaborators.map((row) => row.userId),
      collaboratorEmails: source.event.collaborators
        .map((row) => row.user.email)
        .filter((value): value is string => Boolean(value)),
    };
  }

  const duplicates = await findActiveGuestDuplicates(
    source.eventId,
    displayName,
    email,
    phone
  );

  const created = await createQuickInvitation({
    eventId: source.eventId,
    name: displayName,
    partySize,
    phone,
    email,
    templateId: source.templateId,
    publishImmediately: true,
    issueEntryPass: true,
    enablePlaceCard: true,
    acknowledgeDuplicates: true,
    actorUserId: source.event.organizerId,
    notes: "Self-registered via general invitation RSVP",
  });

  await createAuditLog({
    userId: source.event.organizerId,
    action: "CREATE",
    entity: "invitation",
    entityId: created.invitationId,
    details: {
      kind: "rsvp_self_registered",
      eventId: source.eventId,
      sourceInvitationId: source.id,
      guestId: created.guestId,
      duplicateCount: duplicates.length,
    },
  });

  return {
    invitationId: created.invitationId,
    guestId: created.guestId,
    inviteUrl: created.inviteUrl,
    invitePath: created.invitePath,
    allowance: created.partySize,
    duplicates,
    organizerId: source.event.organizerId,
    eventId: source.eventId,
    eventTitle: source.event.title,
    organizerEmail: source.event.organizer.email,
    collaboratorUserIds: source.event.collaborators.map((row) => row.userId),
    collaboratorEmails: source.event.collaborators
      .map((row) => row.user.email)
      .filter((email): email is string => Boolean(email)),
  };
}

/**
 * Split guests already attached to open host invitations into personalised
 * invitations so they appear as editable/shareable guest-list cards.
 */
export async function promoteOpenHostRsvpGuests(
  eventId: string,
  actorUserId?: string
): Promise<{ promoted: number }> {
  const invitations = await prisma.invitation.findMany({
    where: { eventId, archivedAt: null, isGeneralPass: false },
    select: {
      id: true,
      name: true,
      templateId: true,
      isGeneralPass: true,
      event: { select: { title: true, organizerId: true } },
      guests: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          plusOnes: true,
          status: true,
          notes: true,
          partyType: true,
          qrToken: true,
        },
      },
    },
  });

  let promoted = 0;
  const appUrl = await getServerAppUrl();

  for (const invitation of invitations) {
    if (
      !isOpenHostInvitation({
        name: invitation.name,
        isGeneralPass: invitation.isGeneralPass,
        eventTitle: invitation.event.title,
        guests: invitation.guests,
      })
    ) {
      continue;
    }

    for (const guest of invitation.guests) {
      const displayName = cleanName(guest.name);
      if (displayName.length < 2) continue;

      const partySize = clampPartySize(1 + Math.max(0, guest.plusOnes));
      const slug = await allocateInvitationSlug(displayName);
      const uniqueLink = newUniqueLink();
      const companion = await loadEventCompanionFeatureConfig(eventId);

      const created = await prisma.invitation.create({
        data: {
          eventId,
          name: displayName,
          slug,
          uniqueLink,
          templateId: invitation.templateId || undefined,
          status: "ACTIVE",
          admissionAllowance: partySize,
          postAdmissionEnabled: companion?.postAdmissionEnabled ?? false,
          featureConfig: featureConfigFor({
            enablePlaceCard: true,
            issueEntryPass: true,
            companionFeatureConfig: companion?.featureConfig,
          }),
        },
        select: { id: true, uniqueLink: true },
      });

      await prisma.guest.update({
        where: { id: guest.id },
        data: {
          invitationId: created.id,
          notes:
            guest.notes?.includes("Self-registered")
              ? guest.notes
              : [guest.notes, "Promoted from general invitation RSVP"]
                  .filter(Boolean)
                  .join(" · "),
        },
      });

      await ensureGuestGateCode(guest.id, eventId);
      await ensureInvitationPass(created.id);

      await createAuditLog({
        userId: actorUserId ?? invitation.event.organizerId,
        action: "UPDATE",
        entity: "invitation",
        entityId: created.id,
        details: {
          kind: "rsvp_guest_promoted",
          eventId,
          sourceInvitationId: invitation.id,
          guestId: guest.id,
          invitePath: `/invite/${created.uniqueLink}?guest=${guest.qrToken}`,
          appUrl,
          qrImageUrl: buildQrImageUrl(
            appUrl,
            `${appUrl}/invite/${created.uniqueLink}?guest=${guest.qrToken}`,
            eventId
          ),
        },
      });

      promoted += 1;
    }
  }

  return { promoted };
}
