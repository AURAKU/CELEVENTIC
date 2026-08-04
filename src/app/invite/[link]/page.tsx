import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { invitationService } from "@/services/invitations/invitation.service";
import { qrService } from "@/services/qr/qr.service";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { addonFulfillmentService } from "@/services/invitation-os/addon-fulfillment.service";
import { seatingService } from "@/services/seating/seating.service";
import { formatDate } from "@/lib/utils";
import { getDefaultDesignConfig, mergeDesignConfig, applyCatalogCreativeIdentity } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { prisma } from "@/lib/prisma";
import { invitationLanguageService } from "@/services/i18n/invitation-language.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";
import type { AppLocale } from "@/lib/i18n/constants";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import { resolveBackgroundMedia } from "@/lib/invitation/studio-media-utils";
import { generateBrandedQrDataUrl } from "@/lib/qr/branded-qr-generator";
import { getServerAppUrl } from "@/lib/app-url";
import { ensureEventMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { resolveShareOgImage } from "@/lib/social/share-image";
import { buildShareDescription } from "@/lib/social/share-description";
import { APP_NAME } from "@/lib/constants";
import { getInvitationPassView } from "@/services/admission/guest-pass.service";
import { getInvitationAdmission } from "@/services/admission/admission.service";
import {
  buildEventCompanionHref,
  shouldOpenEventCompanionOnly,
  wantsInviteCeremonyView,
} from "@/lib/admission/event-companion";
import { resolvePlaceCard } from "@/services/invitation-features/place-card.service";
import { resolveInvitationAllowance } from "@/lib/admission/admission-logic";
import type { GuestEntryPassData } from "@/types/invitation-design";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveProductionInvitationOrder } from "@/services/invitations/production-invitation-source.service";
import {
  resolveGuestFacingEventInstant,
  resolveGuestFacingVenue,
} from "@/lib/invitation/guest-event-details";
import { isOpenHostInvitation } from "@/services/guest-search/rsvp-self-registration.service";
import { resolvePostAdmissionEnabled } from "@/lib/admission/canonical-companion";

function resolveDesign(invitation: {
  designConfig: unknown;
  template: { slug: string; config: unknown } | null;
}): InvitationDesignConfig {
  const stored = invitation.designConfig as InvitationDesignConfig | null;
  if (stored?.layout) return stored;

  const templateConfig = invitation.template?.config as { layout?: string } | null;
  // Prefer catalog SKU slug so shared-layout Wave-1 templates keep unique DNA
  // (getCatalogTemplate(layoutSlug) would resolve to the first lite SKU).
  const identitySlug = invitation.template?.slug ?? templateConfig?.layout;
  const base = getDefaultDesignConfig(identitySlug);
  return mergeDesignConfig(base, templateConfig as Partial<InvitationDesignConfig> | undefined);
}

/**
 * Published invitations stay editable in Studio, so the guest page must never
 * serve a cached snapshot: a host who fixes a venue or swaps a photo expects
 * the very next guest tap to show it. Rendering per request keeps that promise
 * even if the route later stops reading `searchParams`.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Share-card preview defaults to the QR center logo (the mark guests see at
 * the heart of their branded QR) so the link-preview thumbnail matches what
 * they'll scan. Falls back to the Celeventic official logo when no center
 * logo has been uploaded, see `resolveShareOgImage`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ link: string }>;
}): Promise<Metadata> {
  const { link } = await params;
  const invitation = await invitationService.getInvitationByLink(link);
  if (!invitation || invitation.status === "EXPIRED" || invitation.event.status === "CANCELLED") {
    return { title: "Invitation" };
  }

  const event = invitation.event;
  const title = `${event.title} · You're invited`;
  // Always lead with the couple/host name rather than `event.description`
  // (the host's free-form "our story" text), see `buildShareDescription`.
  const description = buildShareDescription({ hostName: event.hostName, title: event.title });
  const appUrl = await getServerAppUrl();
  const ogImage = await resolveShareOgImage(event.id, appUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: APP_NAME,
      ...(ogImage ? { images: [{ url: ogImage, alt: event.title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ link: string }>;
  searchParams: Promise<{ guest?: string; view?: string }>;
}) {
  const { link } = await params;
  const query = await searchParams;
  const guestToken = query.guest;
  const preferInviteCeremony = wantsInviteCeremonyView(query);
  // These two reads are independent (env/host lookup vs. DB lookup), run them
  // together instead of serially so the very first await in this request
  // isn't paying for both round trips back-to-back. Every millisecond shaved
  // here shrinks the window guests spend looking at the branded load-up
  // (`loading.tsx`) before their invitation actually paints.
  const [appBaseUrl, invitation] = await Promise.all([
    getServerAppUrl(),
    invitationService.getInvitationByLink(link),
  ]);

  if (!invitation) notFound();

  // Soft-deleted / cancelled events must not keep serving as live guest pages.
  if (invitation.status === "EXPIRED" || invitation.event.status === "CANCELLED") {
    notFound();
  }

  const event = invitation.event;

  // Guest personalization, the order/design record, custom blocks, and the
  // memory-vault links are all independent reads keyed off `invitation.id` /
  // `event.id`, fetch them concurrently rather than as a serial waterfall.
  const [admissionSummary, tokenGuest, order, invitationBlocks, memoryLinks, portalEnabled] =
    await Promise.all([
      getInvitationAdmission(invitation.id),
      guestToken
        ? invitationService.getGuestForInvitation(invitation.id, guestToken)
        : Promise.resolve(null),
      resolveProductionInvitationOrder(invitation.id, event.id),
      invitationBlockService.getBlocksForInvitation(invitation.id),
      // Always provision Album QR for published invites so guests can upload/view live.
      ensureEventMemoryLinks(event.id),
      resolvePostAdmissionEnabled({
        eventId: event.id,
        invitationId: invitation.id,
        invitationEnabled: invitation.postAdmissionEnabled,
      }),
    ]);

  // Ceremony always opens from the start for WhatsApp / social / browser links.
  // Shared party links stay on the invitation while anyone remains awaiting.
  // Member-specific tokens jump only when that member is admitted.
  // Guests can reopen ceremony via ?view=invite after admit.
  const viewerAdmitted =
    tokenGuest != null ? tokenGuest.status === "CHECKED_IN" : null;
  if (
    !preferInviteCeremony &&
    shouldOpenEventCompanionOnly({
      ...admissionSummary,
      postAdmissionEnabled: portalEnabled,
      canAccessPortal: admissionSummary?.canAccessPortal ?? false,
      viewerAdmitted,
    })
  ) {
    redirect(buildEventCompanionHref(link, guestToken ?? null));
  }

  // Guest-specific invite links (one guest on this invitation) should lock the
  // RSVP name even when `?guest=` is missing from a copied/shared URL.
  // Open / general template invitations must never lock — each RSVP mints its
  // own personalised invitation instead of attaching to the shared link.
  const openHost = isOpenHostInvitation({
    name: invitation.name,
    isGeneralPass: invitation.isGeneralPass,
    eventTitle: event.title,
    guests: (invitation.guests ?? []).filter((g) => !g.archivedAt),
  });
  const soleAssignedGuest =
    !tokenGuest && !guestToken && !openHost
      ? (invitation.guests ?? []).filter((g) => !g.archivedAt)
      : [];
  const personalizedGuest =
    tokenGuest ?? (soleAssignedGuest.length === 1 ? soleAssignedGuest[0] : null);

  let qrDataUrl = "";
  let admissionQrDataUrl = "";
  let admissionQrToken = "";
  let admissionManualCode = "";
  let guestQrToken = "";
  let seatQrDataUrl = "";
  let seatLookupUrl: string | null = null;
  let seatTable: string | null = null;
  let seatLabel: string | null = null;

  if (personalizedGuest) {
    guestQrToken = personalizedGuest.qrToken;
    const [generatedQrDataUrl, admission] = await Promise.all([
      qrService.generateBrandedVerifyQr(event.id, personalizedGuest.qrToken),
      qrService.getGuestAdmissionQr(personalizedGuest.id),
    ]);
    qrDataUrl = generatedQrDataUrl;
    if (admission) {
      admissionQrDataUrl = admission.dataUrl;
      admissionQrToken = admission.token;
      admissionManualCode = admission.manualCode;
    }
    seatLookupUrl = `${appBaseUrl}/seat/${personalizedGuest.qrToken}`;
  }

  const rawDesign = resolveDesign(invitation);
  const { _revisions: _r, ...baseDesign } = rawDesign as InvitationDesignConfig & {
    _revisions?: unknown;
  };

  const galleryUrls = event.media?.map((m) => m.url) ?? [];

  // Once the organizer/admin publishes Studio work for this event, every guest
  // link for the selected event must render that live production design —
  // never a catalogue snapshot stamped onto a secondary invitation at create.
  const productionOrder = order;
  const catalogSlug =
    productionOrder?.templateSlug ??
    productionOrder?.template?.slug ??
    invitation.template?.slug ??
    null;
  const productionDesign = productionOrder
    ? buildPublishedDesignConfig(productionOrder)
    : null;
  const design = applyCatalogCreativeIdentity(
    productionDesign ?? baseDesign,
    catalogSlug
  );
  const guestFacingStartDate = resolveGuestFacingEventInstant(event.startDate, design);
  const guestFacingVenue = resolveGuestFacingVenue(event.venueName, design);
  const blocks = productionOrder
    ? (await invitationBlockService.getBlocksForOrder(productionOrder.id)).filter(
        (block) => block.isVisible
      )
    : invitationBlocks;

  let templateDefaultTrack = productionOrder?.template?.defaultMusicTrack ?? null;
  if (!templateDefaultTrack && catalogSlug) {
    templateDefaultTrack = await prisma.invitationCatalogTemplate.findUnique({
      where: { slug: catalogSlug },
      select: {
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
    }).then((t) => t?.defaultMusicTrack ?? null);
  }

  const allowedLocales = productionOrder
    ? invitationLanguageService.getAvailableLocales(productionOrder.languageMode)
    : (["en"] as AppLocale[]);

  const localizedVersions = productionOrder?.languageVersions.reduce(
    (acc, v) => {
      const code = v.languageCode as AppLocale;
      acc[code] = {
        eventTitle: v.eventTitle,
        story: v.story,
        dressCode: v.dressCode,
        venueName: v.venueName,
        landmark: v.landmark,
        hostName: v.hostName,
      };
      return acc;
    },
    {} as Partial<Record<AppLocale, { eventTitle?: string | null; story?: string | null; dressCode?: string | null; venueName?: string | null; landmark?: string | null; hostName?: string | null }>>
  );

  const musicAddon = productionOrder
    ? addonFulfillmentService.hasFeature(productionOrder, "guest_music")
    : false;
  const memoryVaultAddon = productionOrder
    ? addonFulfillmentService.hasFeature(productionOrder, "memory_vault")
    : false;
  const memoryVault = memoryVaultAddon || Boolean(memoryLinks);
  const qrCheckin = productionOrder
    ? addonFulfillmentService.hasFeature(productionOrder, "qr_checkin")
    : false;
  const seatingPlan = productionOrder
    ? addonFulfillmentService.hasFeature(productionOrder, "seating_plan")
    : false;
  const { musicSelection, hasMusic } = resolveInvitationMusic({
    orderSelection: productionOrder?.musicSelection,
    legacyMusicUrl: productionOrder?.musicPreference,
    design,
    catalogSlug: catalogSlug,
    eventDefaultTrack: event.defaultMusicTrack,
    templateDefaultTrack,
    allowDnaFallback: true,
  });
  const musicEnabled = hasMusic || musicAddon;

  if (personalizedGuest && seatLookupUrl) {
    const assignment = await seatingService.lookupByGuestId(personalizedGuest.id);
    if (assignment?.assignment) {
      seatTable = assignment.assignment.tableNumber;
      seatLabel = assignment.assignment.seatLabel;
      if (seatingPlan) {
        const [center, logoSize] = await Promise.all([
          qrBrandingService.resolveCenterImageUrl(event.id),
          qrBrandingService.resolveLogoSize(event.id),
        ]);
        seatQrDataUrl = await generateBrandedQrDataUrl(
          seatLookupUrl,
          center,
          undefined,
          "brand",
          logoSize
        );
      }
    }
  }

  // Guest Entry Pass, only for events that turned QR admission on. Issuance is
  // idempotent, so the first personalised view of an invite mints the pass and
  // every later view re-renders the same one.
  let entryPass: GuestEntryPassData | null = null;
  // Never expose a companion CTA before the gate admits this invite. Unlocked
  // guests are redirected above unless they explicitly reopen the ceremony
  // (?view=invite). While viewing the ceremony, do not hand off back to companion
  // on partial admission — PartyAdmissionSwitch offers Event Access instead.
  const companionUrl: string | null = null;
  const companionHandoffHref =
    portalEnabled && !preferInviteCeremony
      ? buildEventCompanionHref(link, personalizedGuest?.qrToken ?? guestToken ?? null)
      : null;
  const watchAdmissionHandoff = Boolean(companionHandoffHref);
  const partyAdmission =
    portalEnabled &&
    admissionSummary &&
    admissionSummary.admittedCount > 0 &&
    companionHandoffHref
      ? {
          admittedCount: admissionSummary.admittedCount,
          allowance: admissionSummary.allowance,
          state: admissionSummary.state,
          companionHref: companionHandoffHref,
        }
      : null;
  if (personalizedGuest) {
    try {
      const passView = await getInvitationPassView(invitation.id);
      if (
        passView &&
        passView.settings.qrAdmissionEnabled &&
        passView.settings.displayPassOnInvitation
      ) {
        // Capacity and assigned seating render on the place card only — the
        // entry pass is QR + admission code + save/print.
        entryPass = {
          token: passView.token,
          code: passView.pass.code,
          // Invitation party label only — never a foreign GuestPass.displayName.
          displayName:
            invitation.name?.trim() ||
            personalizedGuest.name?.trim() ||
            passView.pass.displayName,
          status: passView.pass.status,
          instructions: passView.settings.passInstructions,
          allowDownload: passView.settings.allowPassDownload,
          allowPrint: passView.settings.allowPassPrint,
        };
      }
    } catch (error) {
      // A pass failure must never take down a published invitation.
      console.error("[invite] entry pass unavailable", error);
    }
  }

  // Personalised place card, resolved for every published invitation, on every
  // template, from the shared feature layer. A failure here must never take the
  // invitation down, so it degrades to "no place card".
  const placeCard = await resolvePlaceCard(
    invitation.id,
    personalizedGuest?.name ?? null,
    personalizedGuest?.id ?? null
  ).catch((error) => {
    console.error("[invite] place card unavailable", error);
    return null;
  });

  // RSVP companion slots must follow organiser allowance even when place card is off.
  const partyAllowance = resolveInvitationAllowance(
    invitation.guests,
    invitation.admissionAllowance,
    entryPass?.partySize ?? placeCard?.party.allowance
  );

  const catalogTemplate = productionOrder?.template;
  const revealMode = design.studio?.revealMode;
  const resolvedBackground = resolveBackgroundMedia(design, catalogTemplate);

  // Gift Wallet placement, null unless the event has a live campaign with
  // invitation placement on, so invites without gifting are untouched.
  const giftPlacement = await giftCampaignService
    .resolveInvitePlacement(event.id, { guestQrToken })
    .catch(() => null);

  return (
    <PremiumInviteWrapper
      revealEnabled={revealMode !== "none"}
      revealMode={revealMode}
      musicEnabled={musicEnabled}
      musicSelection={musicSelection}
      musicAutoplay
      fullScreen={design.studio?.fullScreen ?? true}
      skipSoftIntro={false}
      skipIntro={false}
      invitation={{
        id: invitation.id,
        name: invitation.name,
        message: invitation.message,
        uniqueLink: invitation.uniqueLink,
      }}
      event={{
        title: event.title,
        hostName: event.hostName,
        description: event.description,
        startDate: formatDate(guestFacingStartDate),
        startDateRaw: guestFacingStartDate.toISOString(),
        venueName: guestFacingVenue,
        landmark: event.landmark,
        mapsLink: event.mapsLink,
        contactPhone: event.contactPhone,
        dressCode: event.dressCode,
        coverImageUrl: event.coverImageUrl,
      }}
      design={design}
      guestId={personalizedGuest?.id}
      guestName={personalizedGuest?.name?.trim() || undefined}
      openingEpoch={invitation.portalTokenVersion}
      qrDataUrl={qrDataUrl}
      admissionQrDataUrl={admissionQrDataUrl || null}
      admissionQrToken={admissionQrToken || null}
      admissionManualCode={admissionManualCode || null}
      entryPass={entryPass}
      placeCard={placeCard}
      partyAllowance={partyAllowance}
      guestQrToken={guestQrToken || null}
      seatLookupUrl={seatQrDataUrl ? seatLookupUrl : null}
      companionUrl={companionUrl}
      companionHandoffHref={companionHandoffHref}
      watchAdmissionHandoff={watchAdmissionHandoff}
      partyAdmission={partyAdmission}
      seatQrDataUrl={seatQrDataUrl || null}
      backgroundImageUrl={resolvedBackground.backgroundImageUrl ?? event.coverImageUrl}
      backgroundVideoUrl={resolvedBackground.backgroundVideoUrl}
      rsvpRequired={productionOrder?.rsvpRequired ?? true}
      galleryUrls={galleryUrls}
      allowedLocales={allowedLocales}
      localizedVersions={localizedVersions}
      blocks={blocks}
      memoryVaultEnabled={memoryVault}
      memoryUploadUrl={memoryLinks?.uploadUrl ?? null}
      memoryAlbumUrl={memoryLinks?.albumUrl ?? null}
      memoryUploadQrImageUrl={memoryLinks?.uploadQrImageUrl ?? null}
      memoryAlbumTitle={memoryLinks?.eventTitle ?? null}
      giftUrl={giftPlacement?.giftUrl ?? null}
      giftQrImageUrl={giftPlacement?.qrImageUrl ?? null}
      giftTitle={giftPlacement?.title ?? null}
      giftSubtitle={giftPlacement?.subtitle ?? null}
      giftCtaLabel={giftPlacement?.ctaLabel ?? null}
      giftPrivacyNote={giftPlacement?.privacyNote ?? null}
      eventId={event.id}
      contactEmail={productionOrder?.contactEmail ?? null}
      seatingEnabled={seatingPlan && Boolean(seatQrDataUrl && seatLookupUrl)}
      seatTable={seatTable}
      seatLabel={seatLabel}
      templateSlug={productionOrder?.templateSlug}
    />
  );
}
