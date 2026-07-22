"use client";

import { useMemo, useState } from "react";
import { Play, Hand } from "lucide-react";
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
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";
import { InviteViewportShell } from "@/components/invitation/invite-viewport-shell";
import { cn } from "@/lib/utils";

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
        <button
          type="button"
          onClick={() => setActivated(true)}
          className={cn(
            "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 w-full",
            "bg-gradient-to-t from-black/80 via-black/45 to-black/25",
            "transition-all hover:from-black/85 hover:via-black/55"
          )}
          aria-label="Tap to open live studio preview"
        >
          <div className="rounded-full bg-black/45 backdrop-blur-sm p-4 shadow-lg border border-white/20">
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
          <span className="text-sm font-medium text-white drop-shadow-md flex items-center gap-2">
            <Hand className="h-4 w-4" />
            Tap to open live preview
          </span>
          <span className="text-xs text-white/75 max-w-xs text-center px-4">
            {hasMusic
              ? "Music starts automatically — use the corner button to mute"
              : "Full guest experience with reveal and gallery"}
          </span>
        </button>
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
        galleryInteractive
        rsvpRequired={false}
        eventId="preview-event"
      />
    </InviteViewportShell>
  );
}
