"use client";

import { useMemo } from "react";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";
import type { MusicSelection } from "@/lib/music/music-types";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import {
  resolvePreviewCoverImage,
  resolvePreviewGalleryUrls,
} from "@/lib/invitation/studio-media-utils";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";

interface InvitationStudioPreviewProps {
  design: InvitationDesignConfig;
  event: Partial<InvitationEventData>;
  message: string;
  invitationName: string;
  musicSelection?: MusicSelection | null;
  galleryUrls?: string[] | null;
}

export function InvitationStudioPreview({
  design,
  event,
  message,
  invitationName,
  musicSelection: musicOverride,
  galleryUrls,
}: InvitationStudioPreviewProps) {
  const enrichedDesign = useMemo(() => enrichDesignWithExperienceDNA(design), [design]);

  const fallback = buildLivePreviewProps(enrichedDesign.layout ?? "classic-gold", undefined, {
    musicEnabled: true,
    skipIntro: true,
    skipTapGate: false,
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
      resolveInvitationMusic({ design: enrichedDesign }).musicSelection ??
      fallback.musicSelection,
    [musicOverride, enrichedDesign, fallback.musicSelection]
  );

  return (
    <div className="relative rounded-xl border overflow-hidden bg-slate-900 shadow-inner min-h-[480px]">
      <div className="absolute top-2 left-2 z-20 bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full max-w-[55%] truncate">
        Live preview · matches published invite
      </div>
      <PremiumInviteWrapper
        skipReveal={enrichedDesign.studio?.revealMode === "none" || enrichedDesign.experience?.openingExperience === "none"}
        skipIntro
        skipTapGate={false}
        musicEnabled
        musicSelection={musicSelection}
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
        rsvpRequired={false}
        eventId="preview-event"
      />
    </div>
  );
}
