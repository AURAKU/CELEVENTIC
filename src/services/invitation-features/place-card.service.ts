import { prisma } from "@/lib/prisma";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import { computeAllowance } from "@/lib/admission/admission-logic";
import {
  deriveGuestPlaceCardMonogram,
  formatPlaceCardMonogram,
  looksLikeEventTitle,
  resolvePlaceCardConfig,
  resolvePlaceCardGuestName,
  shouldShowPlaceCard,
  type PlaceCardViewData,
} from "@/lib/invitation-features/place-card";
import { mergeVisionBoard, resolveSealInitials } from "@/lib/invitation/vision-board";
import { parseCoupleNames } from "@/lib/invitation-templates";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveProductionInvitationOrder } from "@/services/invitations/production-invitation-source.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Personalised Place Card — server resolution.
 *
 * Reads the organiser's config out of the shared feature layer and binds it to
 * the live party allowance and assigned seating, so a published invitation
 * reflects capacity or seat changes on the next guest view. Nothing here is
 * cached: the public invite route is `force-dynamic`.
 */

export type { PlaceCardViewData };

/** Statuses in which a pass still governs its invitation's capacity. */
const LIVE_PASS_STATUSES = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
] as const;

function designFromUnknown(value: unknown): Partial<InvitationDesignConfig> {
  return value && typeof value === "object"
    ? (value as Partial<InvitationDesignConfig>)
    : {};
}

/**
 * Resolve the place card for one invitation, or null when it should not render.
 *
 * @param guestName  personalised recipient, when the link carried a guest token
 * @param guestId    exact personalised guest, used for table / seat assignment
 */
export async function resolvePlaceCard(
  invitationId: string,
  guestName?: string | null,
  guestId?: string | null
): Promise<PlaceCardViewData | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      eventId: true,
      name: true,
      admissionAllowance: true,
      designConfig: true,
      guests: {
        select: {
          id: true,
          name: true,
          plusOnes: true,
          group: { select: { name: true } },
          seatingAssignment: {
            select: { tableNumber: true, seatLabel: true, zone: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      event: { select: { title: true, hostName: true } },
    },
  });
  if (!invitation) return null;

  const features = await resolveInvitationFeatures(invitationId);
  const feature = features.find((f) => f.key === "PLACE_CARD");
  const baseConfig = resolvePlaceCardConfig(feature?.config);

  // Prefer the event's live Studio design so place-card seals follow the
  // production template, not a catalogue layout stamped at invite create.
  let design = designFromUnknown(invitation.designConfig);
  const productionOrder = await resolveProductionInvitationOrder(
    invitation.id,
    invitation.eventId
  );
  if (productionOrder) {
    design = buildPublishedDesignConfig(productionOrder);
  }

  const board = mergeVisionBoard(
    (design.studio as { visionBoard?: Parameters<typeof mergeVisionBoard>[0] } | undefined)
      ?.visionBoard
  );
  const parsed = parseCoupleNames(invitation.event.title, invitation.event.hostName);
  const seal = resolveSealInitials(board.sealInitials, {
    layout: design.layout,
    coupleName1: board.coupleName1 || parsed.name1,
    coupleName2: board.coupleName2 || parsed.name2,
    hostName: invitation.event.hostName,
  });

  const storedMonogram = formatPlaceCardMonogram(baseConfig.monogram);
  // Drop ceremony-title initials ("TM" from Traditional Marriage) in favour of
  // the couple seal.
  const titleInitials = formatPlaceCardMonogram(
    (invitation.name || invitation.event.title || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
  );
  const sealMonogram = formatPlaceCardMonogram(seal);
  const eventMonogram =
    storedMonogram &&
    storedMonogram !== titleInitials &&
    !looksLikeEventTitle(invitation.name)
      ? storedMonogram
      : sealMonogram || storedMonogram;

  // The active QR admission pass is authoritative for who this invitation
  // admits. This prevents a canonical event invitation with many attached
  // guests from printing the entire event guest list on one place card.
  const pass = await prisma.guestPass.findFirst({
    where: { invitationId, status: { in: [...LIVE_PASS_STATUSES] } },
    orderBy: { tokenVersion: "desc" },
    select: { partySize: true, displayName: true },
  });

  // "Assigned" means this exact invitation/pass identifies a real recipient.
  // Never join every Guest row into a single guest-facing name.
  const tokenGuest = guestName?.trim() || null;
  const passRecipient = pass?.displayName?.trim() || null;
  const resolvedGuestName = resolvePlaceCardGuestName({
    tokenGuest,
    passDisplayName: passRecipient,
    guestNames: invitation.guests.map((guest) => guest.name),
  });
  const assigned = Boolean(resolvedGuestName);
  // A specific guest gets their own initials. Generic/non-personalized cards
  // retain the event/couple seal (for Forever Afaris, "C | J").
  const guestMonogram = assigned
    ? deriveGuestPlaceCardMonogram(resolvedGuestName)
    : "";
  const config = {
    ...baseConfig,
    monogram: guestMonogram || eventMonogram,
  };
  if (
    !shouldShowPlaceCard(
      config,
      feature?.enabled ?? false,
      assigned || invitation.guests.length > 0
    )
  ) {
    return null;
  }

  const allowance = Math.max(
    computeAllowance(invitation.guests, invitation.admissionAllowance),
    pass?.partySize ?? 0,
    1
  );
  const personalizedGuest =
    (guestId ? invitation.guests.find((guest) => guest.id === guestId) : null) ??
    (tokenGuest
      ? invitation.guests.find(
          (guest) => guest.name.trim().toLocaleLowerCase() === tokenGuest.toLocaleLowerCase()
        )
      : null) ??
    (resolvedGuestName
      ? invitation.guests.find(
          (guest) =>
            guest.name.trim().toLocaleLowerCase() ===
            resolvedGuestName.toLocaleLowerCase()
        )
      : null) ??
    (invitation.guests.length === 1 ? invitation.guests[0] : null);
  const seating = personalizedGuest?.seatingAssignment ?? null;

  return {
    config,
    recipient: {
      invitationName: invitation.name,
      guestName: resolvedGuestName,
      groupName: invitation.guests.find((g) => g.group?.name)?.group?.name ?? null,
      partySize: allowance,
      assigned,
    },
    party: {
      allowance,
    },
    seating: seating?.tableNumber?.trim()
      ? {
          tableNumber: seating.tableNumber.trim(),
          seatLabel: seating.seatLabel?.trim() || null,
          zone: seating.zone?.trim() || null,
        }
      : null,
  };
}
