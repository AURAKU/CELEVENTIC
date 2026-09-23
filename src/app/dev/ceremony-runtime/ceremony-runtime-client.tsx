"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { pageBackgroundFromDesign } from "@/lib/invitation/studio-media-utils";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Production-shaped ceremony harness for Playwright / local diagnostics.
 * Live-guest mount (not embedded) so autoOpen stays false.
 *
 * Query:
 *   ?scenario=memorial-production (default)
 *   ?skipSoftIntro=1
 *   ?throwReveal=1 — InteractiveReveal throws; mandatory hold must NOT portal
 */
function buildMemorialProductionDesign(): InvitationDesignConfig {
  const preview = buildLivePreviewProps("memorial-candle-tribute", "Funeral", {
    catalogSlug: "one-week-vigil-notice",
  });
  return {
    ...preview.design,
    layout: "memorial-candle-tribute",
    studio: {
      ...(preview.design.studio ?? {}),
      revealMode: "curtain",
    },
    experience: {
      ...(preview.design.experience ?? {}),
      collectionId: "funeral",
      openingExperience: "envelope-classic",
      hubMode: preview.design.experience?.hubMode ?? "scroll",
    },
  };
}

export default function CeremonyRuntimeHarnessPage() {
  const params = useSearchParams();
  const skipSoftIntro = params.get("skipSoftIntro") === "1";

  const design = useMemo(() => buildMemorialProductionDesign(), []);
  const preview = useMemo(
    () =>
      buildLivePreviewProps("memorial-candle-tribute", "Funeral", {
        catalogSlug: "one-week-vigil-notice",
      }),
    []
  );
  const bg = pageBackgroundFromDesign(design);

  return (
    <main className="min-h-app-viewport bg-black" data-ceremony-harness="memorial-production">
      <PremiumInviteWrapper
        catalogSlug="one-week-vigil-notice"
        revealEnabled
        skipSoftIntro={skipSoftIntro}
        skipIntro
        skipTapGate={false}
        skipReveal={false}
        skipAnalytics={false}
        autoOpenReveal={false}
        musicEnabled={false}
        musicAutoplay={false}
        backgroundImageUrl={bg.backgroundImageUrl}
        backgroundVideoUrl={bg.backgroundVideoUrl}
        galleryUrls={preview.galleryUrls}
        invitation={{
          id: "cmt92f74200hilazf1lofhpr6",
          name: "One Week Vigil Notice",
          message: null,
          uniqueLink: "-pHNcbxKrAzcNNBZxkR2MM7pevHha72W",
        }}
        event={{
          ...preview.event,
          title: preview.event.title || "In Loving Memory",
          description: preview.event.description ?? null,
          startDateRaw: preview.event.startDateRaw ?? preview.event.startDate,
          venueName: preview.event.venueName ?? null,
          landmark: preview.event.landmark ?? null,
          mapsLink: preview.event.mapsLink ?? null,
          contactPhone: preview.event.contactPhone ?? null,
          dressCode: preview.event.dressCode ?? null,
          deceasedName: preview.event.deceasedName ?? "Beloved",
        }}
        design={design}
        templateSlug="one-week-vigil-notice"
        fullScreen
        embedded={false}
        rsvpRequired={false}
        eventId="cmt4re7wq022elad67v0vdqxx"
      />
    </main>
  );
}
