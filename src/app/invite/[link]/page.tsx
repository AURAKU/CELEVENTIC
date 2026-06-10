import { notFound } from "next/navigation";
import { invitationService } from "@/services/invitations/invitation.service";
import { qrService } from "@/services/qr/qr.service";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { addonFulfillmentService } from "@/services/invitation-os/addon-fulfillment.service";
import { formatDate } from "@/lib/utils";
import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { prisma } from "@/lib/prisma";
import { invitationLanguageService } from "@/services/i18n/invitation-language.service";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";
import type { AppLocale } from "@/lib/i18n/constants";

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
  const invitation = await invitationService.getInvitationByLink(link);

  if (!invitation) notFound();

  const event = invitation.event;
  const personalizedGuest = guestToken
    ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
    : null;
  const sampleGuest = personalizedGuest ?? invitation.guests[0];
  let qrDataUrl = "";
  let admissionQrDataUrl = "";

  if (sampleGuest) {
    qrDataUrl = await qrService.generatePortalQr(sampleGuest.qrToken);
    const admission = await qrService.getGuestAdmissionQr(sampleGuest.id);
    if (admission) admissionQrDataUrl = admission.dataUrl;
  }

  const rawDesign = resolveDesign(invitation);
  const { _revisions: _r, ...design } = rawDesign as InvitationDesignConfig & {
    _revisions?: unknown;
  };

  const galleryUrls = event.media?.map((m) => m.url) ?? [];

  const order = await prisma.invitationOrder.findFirst({
    where: { invitationId: invitation.id },
    include: { languageVersions: true, template: true },
  });

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

  const fulfilled = order ? addonFulfillmentService.hasFeature(order, "guest_music") : false;
  const memoryVault = order ? addonFulfillmentService.hasFeature(order, "memory_vault") : false;
  const qrCheckin = order ? addonFulfillmentService.hasFeature(order, "qr_checkin") : false;

  const catalogTemplate = order?.template;

  return (
    <PremiumInviteWrapper
      revealEnabled
      musicEnabled={fulfilled}
      musicUrl={order?.musicPreference?.startsWith("http") ? order.musicPreference : null}
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
      guestId={sampleGuest?.id}
      guestName={sampleGuest?.name}
      qrDataUrl={qrDataUrl}
      admissionQrDataUrl={qrCheckin ? admissionQrDataUrl : null}
      backgroundImageUrl={catalogTemplate?.backgroundImageUrl ?? event.coverImageUrl}
      backgroundVideoUrl={catalogTemplate?.backgroundVideoUrl ?? null}
      rsvpRequired={order?.rsvpRequired ?? true}
      galleryUrls={galleryUrls}
      allowedLocales={allowedLocales}
      localizedVersions={localizedVersions}
      blocks={blocks}
      memoryVaultEnabled={memoryVault}
      eventId={event.id}
    />
  );
}
