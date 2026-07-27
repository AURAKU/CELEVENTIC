import { notFound } from "next/navigation";
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
 * logo has been uploaded — see `resolveShareOgImage`.
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
  // (the host's free-form "our story" text) — see `buildShareDescription`.
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
  searchParams: Promise<{ guest?: string }>;
}) {
  const { link } = await params;
  const { guest: guestToken } = await searchParams;
  // These two reads are independent (env/host lookup vs. DB lookup) — run them
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
  // `event.id` — fetch them concurrently rather than as a serial waterfall.
  const [personalizedGuest, order, blocks, memoryLinks] = await Promise.all([
    guestToken
      ? invitationService.getGuestForInvitation(invitation.id, guestToken)
      : Promise.resolve(null),
    prisma.invitationOrder.findFirst({
      where: { invitationId: invitation.id },
      include: {
        languageVersions: true,
        template: {
          include: {
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
      },
    }),
    invitationBlockService.getBlocksForInvitation(invitation.id),
    // Always provision Album QR for published invites so guests can upload/view live.
    ensureEventMemoryLinks(event.id),
  ]);

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

  const orderDesign = order?.designConfig as Partial<InvitationDesignConfig> | null;
  const catalogSlug = order?.templateSlug ?? order?.template?.slug ?? invitation.template?.slug ?? null;
  const design = applyCatalogCreativeIdentity(
    mergeDesignConfig(baseDesign, orderDesign ?? undefined),
    catalogSlug
  );

  let templateDefaultTrack = order?.template?.defaultMusicTrack ?? null;
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

  const allowedLocales = order
    ? invitationLanguageService.getAvailableLocales(order.languageMode)
    : (["en"] as AppLocale[]);

  const localizedVersions = order?.languageVersions.reduce(
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

  const musicAddon = order ? addonFulfillmentService.hasFeature(order, "guest_music") : false;
  const memoryVaultAddon = order ? addonFulfillmentService.hasFeature(order, "memory_vault") : false;
  const memoryVault = memoryVaultAddon || Boolean(memoryLinks);
  const qrCheckin = order ? addonFulfillmentService.hasFeature(order, "qr_checkin") : false;
  const seatingPlan = order ? addonFulfillmentService.hasFeature(order, "seating_plan") : false;
  const { musicSelection, hasMusic } = resolveInvitationMusic({
    orderSelection: order?.musicSelection,
    legacyMusicUrl: order?.musicPreference,
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

  const catalogTemplate = order?.template;
  const revealMode = design.studio?.revealMode;
  const resolvedBackground = resolveBackgroundMedia(design, catalogTemplate);

  // Gift Wallet placement — null unless the event has a live campaign with
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
        startDate: formatDate(event.startDate),
        startDateRaw: event.startDate.toISOString(),
        venueName: event.venueName,
        landmark: event.landmark,
        mapsLink: event.mapsLink,
        contactPhone: event.contactPhone,
        dressCode: event.dressCode,
        coverImageUrl: event.coverImageUrl,
      }}
      design={design}
      guestId={personalizedGuest?.id}
      guestName={personalizedGuest?.name?.trim() || undefined}
      qrDataUrl={qrDataUrl}
      admissionQrDataUrl={admissionQrDataUrl || null}
      admissionQrToken={admissionQrToken || null}
      admissionManualCode={admissionManualCode || null}
      guestQrToken={guestQrToken || null}
      seatLookupUrl={seatQrDataUrl ? seatLookupUrl : null}
      seatQrDataUrl={seatQrDataUrl || null}
      backgroundImageUrl={resolvedBackground.backgroundImageUrl ?? event.coverImageUrl}
      backgroundVideoUrl={resolvedBackground.backgroundVideoUrl}
      rsvpRequired={order?.rsvpRequired ?? true}
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
      contactEmail={order?.contactEmail ?? null}
      seatingEnabled={seatingPlan && Boolean(seatQrDataUrl && seatLookupUrl)}
      seatTable={seatTable}
      seatLabel={seatLabel}
      templateSlug={order?.templateSlug}
    />
  );
}
