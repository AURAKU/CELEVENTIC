import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { cleanName } from "@/lib/guest-import/name";
import { normalizeEmail, normalizeGhanaPhone } from "@/lib/guest-import/contact";
import { assertNoActiveGuestDuplicate } from "@/lib/guest-search/duplicate-guests";
import {
  setInvitationLifecycle,
  updateInvitationPersonalisation,
} from "@/services/guest-search/quick-invite.service";

/**
 * Organiser/admin guest CRM mutations.
 *
 * Soft-delete only: a guest who already holds a WhatsApp link or printed QR
 * deserves a withdrawn pass, not an unexplained "unknown code".
 */

export interface UpdateGuestInput {
  guestId: string;
  eventId: string;
  actorUserId: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  plusOnes?: number;
  notes?: string | null;
}

export async function updateGuestDetails(input: UpdateGuestInput) {
  const guest = await prisma.guest.findFirst({
    where: { id: input.guestId, eventId: input.eventId, archivedAt: null },
    select: { id: true, invitationId: true, name: true },
  });
  if (!guest) throw new Error("Guest not found");

  const nextName =
    input.name != null ? cleanName(input.name) : undefined;
  if (nextName != null && nextName.length < 2) {
    throw new Error("Enter the guest name.");
  }

  const email =
    input.email === undefined ? undefined : normalizeEmail(input.email).value;
  const phone =
    input.phone === undefined ? undefined : normalizeGhanaPhone(input.phone).value;
  const plusOnes =
    input.plusOnes == null ? undefined : Math.max(0, Math.trunc(input.plusOnes));

  if (nextName != null || email !== undefined || phone !== undefined) {
    await assertNoActiveGuestDuplicate(
      input.eventId,
      nextName ?? guest.name,
      email === undefined ? null : email,
      phone === undefined ? null : phone,
      {
        excludeGuestIds: [guest.id],
        excludeInvitationIds: guest.invitationId ? [guest.invitationId] : [],
      }
    );
  }

  const guestPatch = {
    ...(nextName ? { name: nextName } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(plusOnes !== undefined ? { plusOnes } : {}),
    ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
  };

  // Keep the personalised invitation (and entry pass) in step when this guest
  // is the primary invitee — otherwise the CRM list and guest link diverge.
  if (guest.invitationId) {
    const primary = await prisma.guest.findFirst({
      where: { invitationId: guest.invitationId, archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (primary?.id === guest.id) {
      await updateInvitationPersonalisation({
        eventId: input.eventId,
        invitationId: guest.invitationId,
        actorUserId: input.actorUserId,
        name: nextName,
        email: input.email === undefined ? undefined : email,
        phone: input.phone === undefined ? undefined : phone,
        notes: input.notes,
        partySize: plusOnes == null ? undefined : Math.max(1, plusOnes + 1),
      });
    } else if (Object.keys(guestPatch).length > 0) {
      await prisma.guest.update({ where: { id: guest.id }, data: guestPatch });
    }
  } else if (Object.keys(guestPatch).length > 0) {
    await prisma.guest.update({ where: { id: guest.id }, data: guestPatch });
  }

  await createAuditLog({
    userId: input.actorUserId,
    action: "UPDATE",
    entity: "guest",
    entityId: guest.id,
    details: {
      kind: "guest_details_updated",
      eventId: input.eventId,
      invitationId: guest.invitationId,
      fields: Object.keys(input).filter((k) => !["guestId", "eventId", "actorUserId"].includes(k)),
    },
  });

  return prisma.guest.findUnique({
    where: { id: guest.id },
    include: { invitation: { select: { id: true, uniqueLink: true, archivedAt: true } } },
  });
}

export interface DeleteGuestInput {
  guestId: string;
  eventId: string;
  actorUserId: string;
  reason?: string;
}

/**
 * Soft-delete a guest from the CRM list.
 *
 * Linked invitations are archived (pass revoked, restoreable). Guests without
 * an invitation are archived on the guest row alone.
 */
export async function deleteGuest(input: DeleteGuestInput) {
  const guest = await prisma.guest.findFirst({
    where: { id: input.guestId, eventId: input.eventId },
    select: { id: true, invitationId: true, archivedAt: true, name: true },
  });
  if (!guest) throw new Error("Guest not found");
  if (guest.archivedAt) {
    return { guestId: guest.id, invitationId: guest.invitationId, alreadyDeleted: true };
  }

  const reason = input.reason?.trim() || "Removed from guest list";

  if (guest.invitationId) {
    await setInvitationLifecycle({
      eventId: input.eventId,
      invitationId: guest.invitationId,
      action: "ARCHIVE",
      reason,
      actorUserId: input.actorUserId,
    });
  } else {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { archivedAt: new Date() },
    });
  }

  await createAuditLog({
    userId: input.actorUserId,
    action: "DELETE",
    entity: "guest",
    entityId: guest.id,
    details: {
      kind: "guest_soft_deleted",
      eventId: input.eventId,
      invitationId: guest.invitationId,
      reason,
      name: guest.name,
    },
  });

  return {
    guestId: guest.id,
    invitationId: guest.invitationId,
    alreadyDeleted: false,
  };
}
