"use client";

import { useMemo, useState } from "react";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import type { MusicSelection } from "@/lib/music/music-types";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import {
  resolvePreviewCoverImage,
  resolvePreviewGalleryUrls,
  resolveBackgroundMedia,
} from "@/lib/invitation/studio-media-utils";
import { resolveEventTheme } from "@/lib/invitation/demo-gallery-assets";
import { TemplatePreviewGlimpse } from "@/components/invitation/template-preview-glimpse";
import { PreviewTapAffordance } from "@/components/invitation/preview-tap-affordance";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";
import { InviteViewportShell } from "@/components/invitation/invite-viewport-shell";
import {
  previewAutoOpensReveal,
  previewTapLabelForOpening,
} from "@/lib/experience/opening-experiences";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";

interface InvitationStudioPreviewProps {
  design: InvitationDesignConfig;
  event: Partial<InvitationEventData>;
  message: string;
  invitationName: string;
  musicSelection?: MusicSelection | null;
  galleryUrls?: string[] | null;
  /** Catalog SKU — ensures Wave 1 templates get unique audio */
  catalogSlug?: string | null;
}

export function InvitationStudioPreview({
  design,
  event,
  message,
  invitationName,
  musicSelection: musicOverride,
  galleryUrls,
  catalogSlug,
}: InvitationStudioPreviewProps) {
  const [activated, setActivated] = useState(false);
  const enrichedDesign = useMemo(() => enrichDesignWithExperienceDNA(design), [design]);

  const layoutSlug = enrichedDesign.layout ?? "classic-gold";
  const theme = resolveEventTheme(layoutSlug);
  const openingId = (enrichedDesign.experience?.openingExperience ??
    "none") as OpeningExperienceId;
  const autoOpenReveal = previewAutoOpensReveal(openingId);
  const tapCopy = previewTapLabelForOpening(openingId);
  const fallback = buildLivePreviewProps(layoutSlug, theme, {
    musicEnabled: true,
    musicAutoplay: true,
    skipIntro: true,
    skipTapGate: true,
    catalogSlug: catalogSlug ?? layoutSlug,
  });

  const resolvedGallery = useMemo(
    () => resolvePreviewGalleryUrls(enrichedDesign, galleryUrls ?? fallback.galleryUrls),
    [enrichedDesign, galleryUrls, fallback.galleryUrls]
  );

  const coverImage = useMemo(
    () => resolvePreviewCoverImage(enrichedDesign, resolvedGallery),
    [enrichedDesign, resolvedGallery]
  );

  const sampleEvent: InvitationEventData = {
    ...fallback.event,
    ...event,
    title: event.title ?? fallback.event.title,
    hostName: event.hostName ?? fallback.event.hostName,
    startDate: event.startDate ?? fallback.event.startDate,
    startDateRaw: event.startDateRaw ?? fallback.event.startDateRaw,
    venueName: event.venueName ?? fallback.event.venueName,
    landmark: event.landmark ?? fallback.event.landmark,
    description: event.description ?? fallback.event.description,
    coverImageUrl: event.coverImageUrl ?? coverImage,
  };

  const musicSelection = useMemo(
    () =>
      musicOverride ??
      resolveInvitationMusic({ design: enrichedDesign, catalogSlug }).musicSelection ??
      fallback.musicSelection,
    [musicOverride, enrichedDesign, catalogSlug, fallback.musicSelection]
  );

  const backgrounds = useMemo(
    () => resolveBackgroundMedia(enrichedDesign),
    [enrichedDesign]
  );

  const hasMusic = Boolean(musicSelection?.url);

  if (!activated) {
    return (
      <InviteViewportShell
        mode="embedded"
        className="relative rounded-xl border overflow-hidden shadow-inner min-h-[min(100dvh,520px)]"
      >
        <TemplatePreviewGlimpse
          layoutSlug={layoutSlug}
          catalogSlug={catalogSlug ?? layoutSlug}
          category={theme}
          scale={0.42}
        />
        <PreviewTapAffordance
          hasMusic={hasMusic}
          label={tapCopy.label}
          subtitle={
            autoOpenReveal && hasMusic
              ? `${tapCopy.subtitle ?? "Opens as guests see it"} · music begins`
              : tapCopy.subtitle ??
                (hasMusic
                  ? "Music starts automatically — use the corner button to mute"
                  : "Full guest experience with reveal and gallery")
          }
          onOpen={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActivated(true);
          }}
          aria-label="Tap to open live studio preview"
        />
      </InviteViewportShell>
    );
  }

  return (
    <InviteViewportShell mode="embedded" scrollable className="relative rounded-xl border overflow-hidden bg-slate-900 shadow-inner min-h-[min(100dvh,720px)]">
      <div className="absolute top-2 left-2 z-20 bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full max-w-[55%] truncate safe-area-pt safe-area-pl">
        Live preview · matches published invite
      </div>
      <PremiumInviteWrapper
        skipReveal={enrichedDesign.studio?.revealMode === "none" || enrichedDesign.experience?.openingExperience === "none"}
        skipIntro
        skipTapGate
        skipAnalytics
        musicEnabled={hasMusic}
        musicAutoplay={hasMusic}
        musicSelection={musicSelection}
        backgroundImageUrl={backgrounds.backgroundImageUrl}
        backgroundVideoUrl={backgrounds.backgroundVideoUrl}
        galleryUrls={resolvedGallery}
        invitation={{
          id: "studio-preview",
          name: invitationName || "Preview",
          message: message || null,
          uniqueLink: "preview",
        }}
        event={{
          ...sampleEvent,
          startDateRaw: sampleEvent.startDateRaw ?? sampleEvent.startDate,
        }}
        design={enrichedDesign}
        guestName="Guest Preview"
        fullScreen
        embedded
        autoOpenReveal={autoOpenReveal}
        galleryInteractive
        rsvpRequired={false}
        eventId="preview-event"
      />
    </InviteViewportShell>
  );
}
