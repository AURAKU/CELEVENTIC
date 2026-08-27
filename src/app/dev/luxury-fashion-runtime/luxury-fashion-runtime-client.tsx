"use client";

import { use } from "react";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { FEMMORA_CATALOG_SLUG, FEMMORA_START_ISO, LUXURY_FASHION_LAYOUT_SLUG } from "@/lib/experience/luxury-fashion";

export function LuxuryFashionRuntimeClient({
  searchParams,
}: {
  searchParams: Promise<{ skipIntro?: string; reduced?: string }>;
}) {
  const params = use(searchParams);
  const skipIntro = params.skipIntro === "1";
  const preview = buildLivePreviewProps(LUXURY_FASHION_LAYOUT_SLUG, "Corporate", {
    catalogSlug: FEMMORA_CATALOG_SLUG,
    features: ["RSVP", "Gallery", "Countdown", "Maps", "Music", "Share", "Video"],
    musicEnabled: true,
    musicAutoplay: false,
    skipIntro,
  });

  return (
    <div className="min-h-svh bg-[#FBF7F0]" data-testid="femmora-runtime">
      <PremiumInviteWrapper
        invitation={{
          id: "preview-femmora-flagship",
          name: preview.invitationName,
          message: preview.message,
          uniqueLink: "preview-femmora-flagship",
        }}
        event={{
          title: preview.event.title,
          hostName: preview.event.hostName,
          description: preview.event.description ?? null,
          startDate: preview.event.startDate,
          startDateRaw: preview.event.startDateRaw ?? FEMMORA_START_ISO,
          venueName: preview.event.venueName ?? null,
          landmark: preview.event.landmark ?? null,
          mapsLink: preview.event.mapsLink ?? null,
          contactPhone: preview.event.contactPhone ?? null,
          dressCode: preview.event.dressCode ?? null,
          coverImageUrl: preview.event.coverImageUrl,
        }}
        design={preview.design}
        guestName={preview.guestName}
        galleryUrls={preview.galleryUrls}
        catalogSlug={FEMMORA_CATALOG_SLUG}
        musicSelection={preview.musicSelection}
        musicEnabled
        skipAnalytics
        skipIntro={skipIntro}
        skipSoftIntro={skipIntro}
        skipTapGate={false}
        skipReveal={false}
        revealEnabled
        openingExperience="luxury-fashion-flagship"
      />
    </div>
  );
}
