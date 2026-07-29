import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { invitationService } from "@/services/invitations/invitation.service";
import { getInvitationAdmission } from "@/services/admission/admission.service";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import {
  resolveSeatingContinuity,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { ensureEventMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { buildInviteCeremonyHref, buildEventCompanionHref } from "@/lib/admission/event-companion";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveProductionInvitationOrder } from "@/services/invitations/production-invitation-source.service";
import { EventCompanionExperience } from "@/components/admission/event-companion-experience";
import { PortalStatusPoller } from "./portal-status-poller";

// Admission is verified per request on the server, never cached, never trusted
// from the client (spec §21, §27).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your Event Companion",
  robots: { index: false, follow: false },
};

export default async function EventDayPortal({
  params,
  searchParams,
}: {
  params: Promise<{ link: string }>;
  searchParams: Promise<{ guest?: string }>;
}) {
  const { link } = await params;
  const { guest: guestToken } = await searchParams;

  const invitation = await prisma.invitation.findUnique({
    where: { uniqueLink: link },
    select: {
      id: true,
      uniqueLink: true,
      status: true,
      postAdmissionEnabled: true,
      designConfig: true,
      template: { select: { slug: true, config: true } },
      event: {
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          contactPhone: true,
          coverImageUrl: true,
        },
      },
    },
  });

  if (!invitation) notFound();
  if (invitation.status === "EXPIRED" || invitation.event.status === "CANCELLED") notFound();
  if (!invitation.postAdmissionEnabled) notFound();

  const summary = await getInvitationAdmission(invitation.id);
  const unlocked =
    Boolean(summary?.canAccessPortal) && (summary?.admittedCount ?? 0) > 0;

  // Companion is admit-only: QR scan or manual gate code must succeed first.
  if (!unlocked) {
    const inviteHref = guestToken
      ? `/invite/${encodeURIComponent(link)}?guest=${encodeURIComponent(guestToken)}`
      : `/invite/${encodeURIComponent(link)}`;
    redirect(inviteHref);
  }

  // Event Companion must continue the same live Studio design guests saw on
  // the invitation — never a stale catalogue layout on a secondary invite.
  const productionOrder = await resolveProductionInvitationOrder(
    invitation.id,
    invitation.event.id
  );
  const theme = resolveCompanionTheme({
    designConfig: productionOrder
      ? buildPublishedDesignConfig(productionOrder)
      : invitation.designConfig,
    template: productionOrder
      ? {
          slug: productionOrder.templateSlug,
          config: null,
        }
      : invitation.template,
    eventCoverImageUrl: invitation.event.coverImageUrl,
  });

  const guest = guestToken
    ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
    : null;

  const partyGuests = await prisma.guest.findMany({
    // Guest CRM records can be event-scoped without invitationId. Include the
    // authenticated personalized guest so their real assignment reaches the
    // same partySeats/continuity projection as invitation-linked guests.
    where: guest
      ? { OR: [{ invitationId: invitation.id }, { id: guest.id }] }
      : { invitationId: invitation.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      qrToken: true,
      seatingAssignment: { select: { tableNumber: true, seatLabel: true, zone: true } },
    },
  });

  const partySeats = partyGuests
    .filter((g) => g.seatingAssignment)
    .map((g) => ({
      guestId: g.id,
      guestName: g.name,
      tableNumber: g.seatingAssignment!.tableNumber,
      seatLabel: g.seatingAssignment!.seatLabel,
      zone: g.seatingAssignment!.zone,
      admitted: g.status === "CHECKED_IN",
    }));

  // Prefer the viewing guest's row; otherwise any allocated seat on this pass.
  let seat: { tableNumber: string; seatLabel: string | null; zone: string | null } | null =
    null;
  if (guest) {
    const own = partySeats.find((s) => s.guestId === guest.id);
    if (own) {
      seat = {
        tableNumber: own.tableNumber,
        seatLabel: own.seatLabel,
        zone: own.zone,
      };
    }
  }
  if (!seat && partySeats.length > 0) {
    const pick =
      partySeats.find((s) => s.admitted) ??
      partySeats.find((s) => s.seatLabel) ??
      partySeats[0];
    seat = {
      tableNumber: pick.tableNumber,
      seatLabel: pick.seatLabel,
      zone: pick.zone,
    };
  }

  const guestName =
    guest?.name?.trim() ||
    partyGuests.find((g) => g.status === "CHECKED_IN")?.name?.trim() ||
    partyGuests[0]?.name?.trim() ||
    null;

  const features = await resolveInvitationFeatures(invitation.id);
  const seatingFeatureOn =
    features.find((f) => f.key === "SEATING_REVEAL")?.enabled ?? true;
  // Always surface allocated seating after admit when a table/seat exists.
  const showSeat = seatingFeatureOn || Boolean(seat) || partySeats.length > 0;

  const memoryLinks = features.some((f) => f.key === "MEMORY_VAULT" && f.enabled)
    ? await ensureEventMemoryLinks(invitation.event.id).catch(() => null)
    : null;
  const giftPlacement = features.some((f) => f.key === "GIFT_WALLET" && f.enabled)
    ? await giftCampaignService
        .resolveCompanionPlacement(invitation.event.id, {
          guestQrToken: guestToken ?? null,
          companionReturnUrl: buildEventCompanionHref(link, guestToken ?? null),
        })
        .catch(() => null)
    : null;

  let continuity: SeatingContinuity | null = null;
  if (showSeat && partySeats.length > 0) {
    continuity = resolveSeatingContinuity(
      partySeats,
      summary?.allowance ?? 1,
      summary?.admittedCount ?? 0
    );
  }

  const inviteHref = buildInviteCeremonyHref(link, guestToken ?? null);

  return (
    <>
      <PortalStatusPoller link={invitation.uniqueLink} initialUnlocked />
      <EventCompanionExperience
        theme={theme}
        eventTitle={invitation.event.title}
        guestName={guestName}
        seat={showSeat ? seat : null}
        showSeat={showSeat}
        partySeats={showSeat ? partySeats : []}
        continuity={continuity}
        features={features}
        event={{
          startDate: invitation.event.startDate,
          contactPhone: invitation.event.contactPhone,
        }}
        memoryUploadUrl={memoryLinks?.uploadUrl ?? null}
        memoryAlbumUrl={memoryLinks?.albumUrl ?? null}
        giftUrl={giftPlacement?.giftUrl ?? null}
        giftTitle={giftPlacement?.title ?? null}
        giftTeaser={giftPlacement?.teaser ?? null}
        inviteHref={inviteHref}
      />
    </>
  );
}
