import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { invitationService } from "@/services/invitations/invitation.service";
import { seatingService } from "@/services/seating/seating.service";
import { getInvitationAdmission } from "@/services/admission/admission.service";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import {
  resolveSeatingContinuity,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { ensureEventMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { EventCompanionExperience } from "@/components/admission/event-companion-experience";
import { PortalStatusPoller } from "./portal-status-poller";

// Admission is verified per request on the server — never cached, never trusted
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
          venueName: true,
          landmark: true,
          mapsLink: true,
          dressCode: true,
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
  const unlocked = Boolean(summary?.canAccessPortal);

  // Companion is admit-only — never a pre-arrival teaser.
  if (!unlocked) {
    const inviteHref = guestToken
      ? `/invite/${encodeURIComponent(link)}?guest=${encodeURIComponent(guestToken)}`
      : `/invite/${encodeURIComponent(link)}`;
    redirect(inviteHref);
  }

  const theme = resolveCompanionTheme({
    designConfig: invitation.designConfig,
    template: invitation.template,
    eventCoverImageUrl: invitation.event.coverImageUrl,
  });

  const guest = guestToken
    ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
    : null;
  const seating = guest ? await seatingService.lookupByGuestId(guest.id) : null;
  const seat = seating?.assignment ?? null;

  const guestName = guest?.name?.trim() || null;
  const isGroup = (summary?.allowance ?? 1) > 1;

  const features = await resolveInvitationFeatures(invitation.id);
  const showSeat =
    features.find((f) => f.key === "SEATING_REVEAL")?.enabled ?? true;

  const memoryLinks = features.some((f) => f.key === "MEMORY_VAULT" && f.enabled)
    ? await ensureEventMemoryLinks(invitation.event.id).catch(() => null)
    : null;
  const giftPlacement = features.some((f) => f.key === "GIFT_WALLET" && f.enabled)
    ? await giftCampaignService
        .resolveInvitePlacement(invitation.event.id, { guestQrToken: guestToken ?? null })
        .catch(() => null)
    : null;

  let continuity: SeatingContinuity | null = null;
  if (showSeat && isGroup) {
    const partyGuests = await prisma.guest.findMany({
      where: { invitationId: invitation.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        seatingAssignment: { select: { tableNumber: true, seatLabel: true, zone: true } },
      },
    });
    continuity = resolveSeatingContinuity(
      partyGuests
        .filter((g) => g.seatingAssignment)
        .map((g) => ({
          guestId: g.id,
          guestName: g.name,
          tableNumber: g.seatingAssignment!.tableNumber,
          seatLabel: g.seatingAssignment!.seatLabel,
          zone: g.seatingAssignment!.zone,
          admitted: g.status === "CHECKED_IN",
        })),
      summary?.allowance ?? 1,
      summary?.admittedCount ?? 0
    );
  }

  const inviteHref = guestToken
    ? `/invite/${encodeURIComponent(link)}?guest=${encodeURIComponent(guestToken)}`
    : `/invite/${encodeURIComponent(link)}`;

  return (
    <>
      <PortalStatusPoller link={invitation.uniqueLink} initialUnlocked />
      <EventCompanionExperience
        theme={theme}
        eventTitle={invitation.event.title}
        guestName={guestName}
        isGroup={isGroup}
        admittedCount={summary?.admittedCount ?? 1}
        remainingCount={summary?.remainingCount ?? 0}
        allowance={summary?.allowance ?? 1}
        seat={showSeat ? seat : null}
        showSeat={showSeat}
        continuity={continuity}
        features={features}
        event={invitation.event}
        memoryUploadUrl={memoryLinks?.uploadUrl ?? null}
        memoryAlbumUrl={memoryLinks?.albumUrl ?? null}
        giftUrl={giftPlacement?.giftUrl ?? null}
        giftTitle={giftPlacement?.title ?? null}
        inviteHref={inviteHref}
      />
    </>
  );
}
