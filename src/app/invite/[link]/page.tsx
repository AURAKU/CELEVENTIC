import { notFound } from "next/navigation";
import { invitationService } from "@/services/invitations/invitation.service";
import { qrService } from "@/services/qr/qr.service";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { addonFulfillmentService } from "@/services/invitation-os/addon-fulfillment.service";
import { seatingService } from "@/services/seating/seating.service";
import { formatDate } from "@/lib/utils";
import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { prisma } from "@/lib/prisma";
import { invitationLanguageService } from "@/services/i18n/invitation-language.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";
import type { AppLocale } from "@/lib/i18n/constants";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import { resolveBackgroundMedia } from "@/lib/invitation/studio-media-utils";
import { generateBrandedQrDataUrl } from "@/lib/qr/branded-qr-generator";
import { getServerAppUrl } from "@/lib/app-url";

function resolveDesign(invitation: {
  designConfig: unknown;
  template: { slug: string; config: unknown } | null;
}): InvitationDesignConfig {
  const stored = invitation.designConfig as InvitationDesignConfig | null;
  if (stored?.layout) return stored;

  const templateConfig = invitation.template?.config as { layout?: string } | null;
  const layoutSlug = templateConfig?.layout ?? invitation.template?.slug;
  const base = getDefaultDesignConfig(layoutSlug);
  return mergeDesignConfig(base, templateConfig as Partial<InvitationDesignConfig> | undefined);
}

export const revalidate = 60;

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

  const event = invitation.event;
  const personalizedGuest = guestToken
    ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
    : null;

  let qrDataUrl = "";
  let admissionQrDataUrl = "";
  let admissionQrToken = "";
  let guestQrToken = "";
  let seatQrDataUrl = "";
  let seatLookupUrl: string | null = null;

  if (personalizedGuest) {
    guestQrToken = personalizedGuest.qrToken;
    qrDataUrl = await qrService.generateBrandedVerifyQr(event.id, personalizedGuest.qrToken);
    const admission = await qrService.getGuestAdmissionQr(personalizedGuest.id);
    if (admission) {
      admissionQrDataUrl = admission.dataUrl;
      admissionQrToken = admission.token;
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
    include: { languageVersions: true, template: true },
  });

  const orderDesign = order?.designConfig as Partial<InvitationDesignConfig> | null;
  const design = mergeDesignConfig(baseDesign, orderDesign ?? undefined);

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
  const memoryVault = order ? addonFulfillmentService.hasFeature(order, "memory_vault") : false;
  const qrCheckin = order ? addonFulfillmentService.hasFeature(order, "qr_checkin") : false;
  const seatingPlan = order ? addonFulfillmentService.hasFeature(order, "seating_plan") : false;
  const { musicSelection, hasMusic } = resolveInvitationMusic({
    orderSelection: order?.musicSelection,
    legacyMusicUrl: order?.musicPreference,
    design,
    allowDnaFallback: true,
  });
  const musicEnabled = hasMusic || musicAddon;

  if (personalizedGuest && seatingPlan && seatLookupUrl) {
    const assignment = await seatingService.lookupByGuestId(personalizedGuest.id);
    if (assignment?.assignment) {
      const center = await qrBrandingService.resolveCenterImageUrl(event.id);
      seatQrDataUrl = await generateBrandedQrDataUrl(seatLookupUrl, center);
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
      guestName={personalizedGuest?.name}
      qrDataUrl={qrDataUrl}
      admissionQrDataUrl={qrCheckin ? admissionQrDataUrl : null}
      admissionQrToken={qrCheckin ? admissionQrToken : null}
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
      eventId={event.id}
      contactEmail={order?.contactEmail ?? null}
      seatingEnabled={seatingPlan && Boolean(seatQrDataUrl && seatLookupUrl)}
    />
  );
}
