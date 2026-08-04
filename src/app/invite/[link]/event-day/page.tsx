import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invitationService } from "@/services/invitations/invitation.service";
import { getInvitationAdmission } from "@/services/admission/admission.service";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import {
  resolveSeatingContinuity,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { pickSeatingAssignment } from "@/lib/seating/assignment-pick";
import { ensureEventMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { buildInviteCeremonyHref, buildEventCompanionHref } from "@/lib/admission/event-companion";
import {
  COMPANION_STUDIO_FEATURE_KEYS,
  resolveCompanionMenu,
} from "@/lib/admission/companion-studio";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveProductionInvitationOrder } from "@/services/invitations/production-invitation-source.service";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";
import { EventCompanionExperience } from "@/components/admission/event-companion-experience";
import { PartyAdmissionSwitch } from "@/components/admission/party-admission-switch";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { PortalStatusPoller } from "./portal-status-poller";
import type { ResolvedFeature } from "@/lib/invitation-features/registry";

// Admission is verified per request on the server, never cached, never trusted
// from the client (spec §21, §27).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your Event Companion",
  robots: { index: false, follow: false },
};

async function canPreviewCompanion(eventId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role,
      EventPermissionKey.EDIT_INVITATIONS
    );
    return true;
  } catch {
    return false;
  }
}

async function resolveCanonicalCompanionConfig(eventId: string, invitationId: string) {
  const liveOrder = await prisma.invitationOrder.findFirst({
    where: {
      eventId,
      archivedAt: null,
      status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
      invitationId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { invitationId: true },
  });

  const preferredId =
    liveOrder?.invitationId && liveOrder.invitationId !== invitationId
      ? liveOrder.invitationId
      : null;

  if (preferredId) {
    return prisma.invitation.findUnique({
      where: { id: preferredId },
      select: { id: true, featureConfig: true, postAdmissionEnabled: true },
    });
  }

  // Events without a live Studio order still inherit companion settings from
  // whichever sibling invite already has the portal / studio content enabled.
  return prisma.invitation.findFirst({
    where: {
      eventId,
      id: { not: invitationId },
      postAdmissionEnabled: true,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, featureConfig: true, postAdmissionEnabled: true },
  });
}

function mergeCompanionFeatures(
  guestFeatures: ResolvedFeature[],
  canonicalFeatures: ResolvedFeature[]
): ResolvedFeature[] {
  const byKey = new Map(canonicalFeatures.map((f) => [f.key, f]));
  return guestFeatures.map((feature) => {
    if (!(COMPANION_STUDIO_FEATURE_KEYS as readonly string[]).includes(feature.key)) {
      return feature;
    }
    const canonical = byKey.get(feature.key);
    if (!canonical) return feature;
    return {
      ...feature,
      enabled: canonical.enabled,
      config:
        Object.keys(canonical.config).length > 0 ? canonical.config : feature.config,
      source: canonical.source,
    };
  });
}

export default async function EventDayPortal({
  params,
  searchParams,
}: {
  params: Promise<{ link: string }>;
  searchParams: Promise<{ guest?: string; preview?: string }>;
}) {
  const { link } = await params;
  const { guest: guestToken, preview } = await searchParams;
  const wantsPreview = preview === "1" || preview === "true";

  const invitation = await prisma.invitation.findUnique({
    where: { uniqueLink: link },
    select: {
      id: true,
      uniqueLink: true,
      status: true,
      postAdmissionEnabled: true,
      designConfig: true,
      featureConfig: true,
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

  const isOrganizerPreview =
    wantsPreview && (await canPreviewCompanion(invitation.event.id));

  // Inherit portal enablement from the production/canonical invite when this
  // personalized link was sent before Event Companion studio existed.
  const canonical = await resolveCanonicalCompanionConfig(
    invitation.event.id,
    invitation.id
  );
  const portalEnabled =
    invitation.postAdmissionEnabled ||
    Boolean(canonical?.postAdmissionEnabled) ||
    isOrganizerPreview;
  if (!portalEnabled) notFound();

  const summary = await getInvitationAdmission(invitation.id);
  const unlocked =
    Boolean(summary?.canAccessPortal) && (summary?.admittedCount ?? 0) > 0;

  // Companion is admit-only for guests; organizers may preview with ?preview=1.
  if (!unlocked && !isOrganizerPreview) {
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
          slug: productionOrder.templateSlug || productionOrder.template?.slug || "classic-gold",
          config: null,
        }
      : invitation.template,
    eventCoverImageUrl: invitation.event.coverImageUrl,
  });

  const guest = guestToken
    ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
    : null;

  // Strict party isolation: only guests owned by THIS invitation.
  // Never OR-in a foreign guestId — that mixed seating across parties that
  // share an event (or even a table).
  const partyGuests = await prisma.guest.findMany({
    where: { invitationId: invitation.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      qrToken: true,
      seatingAssignments: {
        select: {
          tableNumber: true,
          seatLabel: true,
          zone: true,
          seatingPlan: { select: { planType: true } },
        },
      },
    },
  });

  // Companion / continuity still surfaces reception seating as the primary seat
  // (gate + place-card parity). Ceremony rows are available on the assignment
  // list when a dual-stage plan exists, but partySeats keeps the reception shape.
  const partySeats = partyGuests
    .map((g) => {
      const seating = pickSeatingAssignment(g.seatingAssignments, "RECEPTION");
      if (!seating) return null;
      return {
        guestId: g.id,
        guestName: g.name,
        tableNumber: seating.tableNumber,
        seatLabel: seating.seatLabel,
        zone: seating.zone,
        admitted: g.status === "CHECKED_IN",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

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
    (isOrganizerPreview ? "Preview guest" : null);

  let features = await resolveInvitationFeatures(invitation.id);
  if (canonical?.id) {
    const canonicalFeatures = await resolveInvitationFeatures(canonical.id);
    features = mergeCompanionFeatures(features, canonicalFeatures);
  }

  // Defense-in-depth: if fan-out hasn't run yet, still surface canonical menu.
  const localMenuRaw =
    features.find((f) => f.key === "EVENT_MENU")?.config ??
    (invitation.featureConfig as Record<string, { config?: unknown }> | null)?.EVENT_MENU
      ?.config;
  const canonicalMenuRaw =
    (canonical?.featureConfig as Record<string, { config?: unknown }> | null)?.EVENT_MENU
      ?.config;
  const menu = resolveCompanionMenu(localMenuRaw, canonicalMenuRaw);
  const menuBody = menu.menuBody.trim() || null;
  const menuUrl = menu.menuUrl.trim() || null;

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
  const showPartySwitch =
    Boolean(summary) &&
    (summary?.admittedCount ?? 0) > 0 &&
    (summary?.remainingCount ?? 0) > 0;

  return (
    <>
      {!isOrganizerPreview ? (
        <PortalStatusPoller link={invitation.uniqueLink} initialUnlocked />
      ) : null}
      {showPartySwitch ? (
        <PartyAdmissionSwitch
          link={invitation.uniqueLink}
          companionHref={buildEventCompanionHref(link, guestToken ?? null)}
          inviteHref={inviteHref}
          initialAdmittedCount={summary!.admittedCount}
          initialAllowance={summary!.allowance}
          initialState={summary!.state}
          mode="event-access"
        />
      ) : null}
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
        giftHeadline={giftPlacement?.headline ?? null}
        giftCtaLabel={giftPlacement?.ctaLabel ?? null}
        giftOptionalNote={giftPlacement?.optionalNote ?? null}
        menuBody={menuBody}
        menuUrl={menuUrl}
        inviteHref={inviteHref}
      />
    </>
  );
}
