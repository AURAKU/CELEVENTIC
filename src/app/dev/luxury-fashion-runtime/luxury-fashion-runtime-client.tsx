"use client";

import { use } from "react";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import {
  FEMMORA_CATALOG_SLUG,
  FEMMORA_START_ISO,
  LUXURY_FASHION_LAYOUT_SLUG,
  MAISON_VALE_COLORS,
  MAISON_VALE_HOUSE,
  MAISON_VALE_START_ISO,
} from "@/lib/experience/luxury-fashion";

export function LuxuryFashionRuntimeClient({
  searchParams,
}: {
  searchParams: Promise<{ skipIntro?: string; reduced?: string; house?: string }>;
}) {
  const params = use(searchParams);
  const skipIntro = params.skipIntro === "1";
  const vale = params.house === "vale";
  const preview = buildLivePreviewProps(LUXURY_FASHION_LAYOUT_SLUG, "Corporate", {
    catalogSlug: vale ? LUXURY_FASHION_LAYOUT_SLUG : FEMMORA_CATALOG_SLUG,
    features: vale
      ? ["RSVP", "Gallery", "Countdown", "Maps", "Music", "Share"]
      : ["RSVP", "Gallery", "Countdown", "Maps", "Music", "Share", "Video"],
    musicEnabled: true,
    musicAutoplay: false,
    skipIntro,
  });
  const house = vale ? MAISON_VALE_HOUSE : preview.design.experience?.fashionHouse;
  const startIso = vale ? MAISON_VALE_START_ISO : preview.event.startDateRaw ?? FEMMORA_START_ISO;

  return (
    <div className="min-h-svh bg-[#FBF7F0]" data-testid={vale ? "vale-runtime" : "femmora-runtime"}>
      <PremiumInviteWrapper
        invitation={{
          id: vale ? "preview-maison-vale" : "preview-femmora-flagship",
          name: vale ? "Maison Vale Collection Launch" : preview.invitationName,
          message: vale ? house?.hubLede ?? preview.message : preview.message,
          uniqueLink: vale ? "preview-maison-vale" : "preview-femmora-flagship",
        }}
        event={{
          title: vale ? house?.eventTitle ?? preview.event.title : preview.event.title,
          hostName: vale ? house?.houseName ?? preview.event.hostName : preview.event.hostName,
          description: vale ? house?.hubLede ?? null : preview.event.description ?? null,
          startDate: vale ? house?.datesLabel ?? preview.event.startDate : preview.event.startDate,
          startDateRaw: startIso,
          venueName: vale ? house?.locationName ?? null : preview.event.venueName ?? null,
          landmark: vale ? house?.address ?? null : preview.event.landmark ?? null,
          mapsLink: vale ? house?.mapsUrl ?? null : preview.event.mapsLink ?? null,
          contactPhone: preview.event.contactPhone ?? null,
          dressCode: preview.event.dressCode ?? null,
          coverImageUrl: preview.event.coverImageUrl,
        }}
        design={{
          ...preview.design,
          colors: vale ? MAISON_VALE_COLORS : preview.design.colors,
          experience: {
            ...preview.design.experience,
            fashionHouse: house,
            viralFooterEnabled: false,
          },
        }}
        guestName={preview.guestName}
        galleryUrls={vale ? [] : preview.galleryUrls}
        catalogSlug={vale ? LUXURY_FASHION_LAYOUT_SLUG : FEMMORA_CATALOG_SLUG}
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
