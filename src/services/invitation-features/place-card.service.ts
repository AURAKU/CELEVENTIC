import { prisma } from "@/lib/prisma";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import { resolveInvitationAllowance } from "@/lib/admission/admission-logic";
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
import { splitSeatingAssignments } from "@/lib/seating/assignment-pick";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { ReceptionAssignmentMode } from "@/lib/seating/studio-types";
import {
  filterForeignPartyGuests,
  looksLikeForeignPartyLabel,
  resolvePublicPartyDisplayName,
} from "@/lib/invitation/party-isolation";
import { loadSiblingInvitationLabels } from "@/lib/invitation/sibling-invitations";

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

type PlanLayout = {
  status?: "draft" | "published";
  settings?: { receptionMode?: ReceptionAssignmentMode };
} | null;

function isPublishedAssignment(layout: PlanLayout): boolean {
  return layout?.status !== "draft";
}

function resolveReceptionMode(layout: PlanLayout): ReceptionAssignmentMode {
  return layout?.settings?.receptionMode === "TABLE_ONLY" ? "TABLE_ONLY" : "TABLE_AND_CHAIR";
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
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          plusOnes: true,
          group: { select: { name: true } },
          seatingAssignments: {
            select: {
              tableNumber: true,
              seatLabel: true,
              zone: true,
              seatingPlan: {
                select: {
                  planType: true,
                  layout: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      event: { select: { title: true, hostName: true } },
    },
  });
  if (!invitation) return null;

  const siblings = await loadSiblingInvitationLabels(invitation.eventId, invitationId);
  const siblingNames = siblings.map((s) => s.name);
  const partyGuests = filterForeignPartyGuests(
    invitation.guests.map((g) => ({ ...g, invitationId })),
    {
      invitationId,
      invitationName: invitation.name,
      otherInvitationNames: siblings,
    }
  );

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

  // Never promote GuestGroup names or another invitation's pass label.
  const passRecipientRaw = pass?.displayName?.trim() || null;
  const passRecipient = looksLikeForeignPartyLabel(
    passRecipientRaw,
    invitation.name,
    siblingNames
  )
    ? null
    : passRecipientRaw;

  const tokenGuestRaw = guestName?.trim() || null;
  const tokenGuest = looksLikeForeignPartyLabel(tokenGuestRaw, invitation.name, siblingNames)
    ? null
    : tokenGuestRaw;

  const partyDisplayName = resolvePublicPartyDisplayName({
    invitationName: invitation.name,
    passDisplayName: passRecipient,
    tokenGuestName: tokenGuest,
    otherInvitationNames: siblingNames,
  });

  const resolvedGuestName =
    resolvePlaceCardGuestName({
      tokenGuest,
      passDisplayName: partyDisplayName,
      guestNames: partyGuests.map((guest) => guest.name),
    }) || partyDisplayName;

  const assigned = Boolean(resolvedGuestName) && !looksLikeEventTitle(resolvedGuestName);
  // A specific guest gets their own initials. Generic/non-personalized cards
  // retain the event/couple seal (for Forever Afaris, "C | J").
  const guestMonogram = assigned
    ? deriveGuestPlaceCardMonogram(resolvedGuestName)
    : "";
  const config = {
    ...baseConfig,
    // Organiser "group name" must never override the invitation party label
    // with a GuestGroup that can span or leak across invitations.
    groupName: "",
    monogram: guestMonogram || eventMonogram,
  };
  if (
    !shouldShowPlaceCard(
      config,
      feature?.enabled ?? false,
      assigned || partyGuests.length > 0
    )
  ) {
    return null;
  }

  const allowance = resolveInvitationAllowance(
    partyGuests,
    invitation.admissionAllowance,
    pass?.partySize
  );
  const personalizedGuest =
    (guestId ? partyGuests.find((guest) => guest.id === guestId) : null) ??
    (tokenGuest
      ? partyGuests.find(
          (guest) => guest.name.trim().toLocaleLowerCase() === tokenGuest.toLocaleLowerCase()
        )
      : null) ??
    (resolvedGuestName
      ? partyGuests.find(
          (guest) =>
            guest.name.trim().toLocaleLowerCase() ===
            resolvedGuestName.toLocaleLowerCase()
        )
      : null) ??
    (partyGuests.length === 1 ? partyGuests[0] : null);
  const { reception, ceremony } = splitSeatingAssignments(personalizedGuest?.seatingAssignments);
  const receptionLayout = (reception?.seatingPlan?.layout ?? null) as PlanLayout;
  const ceremonyLayout = (ceremony?.seatingPlan?.layout ?? null) as PlanLayout;
  const receptionLive =
    reception &&
    reception.tableNumber?.trim() &&
    isPublishedAssignment(receptionLayout)
      ? {
          tableNumber: reception.tableNumber.trim(),
          seatLabel: reception.seatLabel?.trim() || null,
          zone: reception.zone?.trim() || null,
          mode: resolveReceptionMode(receptionLayout),
        }
      : null;
  const ceremonyLive =
    ceremony &&
    (ceremony.tableNumber?.trim() || ceremony.seatLabel?.trim()) &&
    isPublishedAssignment(ceremonyLayout)
      ? {
          rowLabel: ceremony.tableNumber?.trim() || "Reserved section",
          seatLabel: ceremony.seatLabel?.trim() || null,
          zone: ceremony.zone?.trim() || null,
        }
      : null;

  return {
    config,
    recipient: {
      invitationName: invitation.name,
      guestName: resolvedGuestName,
      // Never GuestGroup — invitation.name is the only party identity.
      groupName: null,
      partySize: allowance,
      assigned,
    },
    party: {
      allowance,
    },
    seating:
      receptionLive || ceremonyLive
        ? {
            reception: receptionLive,
            ceremony: ceremonyLive,
          }
        : null,
  };
}
