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
import { resolveMediaUrl } from "@/lib/uploads/media-url";
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

export const revalidate = 60;

/** Share-card preview uses event cover / invite art — never a cropped QR branding asset. */
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
  const description =
    event.description?.trim() ||
    `${event.hostName ? `${event.hostName} invites you` : "You're invited"} to ${event.title} on Celeventic.`;
  const cover = resolveMediaUrl(event.coverImageUrl);
  const appUrl = await getServerAppUrl();
  const ogImage = cover
    ? cover.startsWith("http")
      ? cover
      : `${appUrl}${cover.startsWith("/") ? cover : `/${cover}`}`
    : undefined;

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
  const appBaseUrl = await getServerAppUrl();
  const invitation = await invitationService.getInvitationByLink(link);

  if (!invitation) notFound();

  // Soft-deleted / cancelled events must not keep serving as live guest pages.
  if (invitation.status === "EXPIRED" || invitation.event.status === "CANCELLED") {
    notFound();
  }

  const event = invitation.event;
  const personalizedGuest = guestToken
    ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
    : null;

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
    qrDataUrl = await qrService.generateBrandedVerifyQr(event.id, personalizedGuest.qrToken);
    const admission = await qrService.getGuestAdmissionQr(personalizedGuest.id);
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

  const order = await prisma.invitationOrder.findFirst({
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
  });

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

  const blocks = await invitationBlockService.getBlocksForInvitation(invitation.id);

  const musicAddon = order ? addonFulfillmentService.hasFeature(order, "guest_music") : false;
  const memoryVaultAddon = order ? addonFulfillmentService.hasFeature(order, "memory_vault") : false;
  // Always provision Album QR for published invites so guests can upload/view live
  const memoryLinks = await ensureEventMemoryLinks(event.id);
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
      eventId={event.id}
      contactEmail={order?.contactEmail ?? null}
      seatingEnabled={seatingPlan && Boolean(seatQrDataUrl && seatLookupUrl)}
      seatTable={seatTable}
      seatLabel={seatLabel}
      templateSlug={order?.templateSlug}
    />
  );
}
