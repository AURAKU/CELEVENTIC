"use client";

import { useMemo } from "react";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { resolveDefaultMusicForLayout } from "@/lib/music/audio-experience-catalog";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";

interface InvitationStudioPreviewProps {
  design: InvitationDesignConfig;
  event: Partial<InvitationEventData>;
  message: string;
  invitationName: string;
}

export function InvitationStudioPreview({ design, event, message, invitationName }: InvitationStudioPreviewProps) {
  const fallback = buildLivePreviewProps(design.layout ?? "classic-gold", undefined, {
    musicEnabled: true,
    skipIntro: true,
    skipTapGate: false,
  });

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
  };

  const musicSelection = useMemo(
    () =>
      resolveDefaultMusicForLayout(
        design.layout,
        design.experience?.defaultAudioTrackId,
        design.experience?.defaultAudioCategory
      ) ?? fallback.musicSelection,
    [design.layout, design.experience?.defaultAudioTrackId, design.experience?.defaultAudioCategory, fallback.musicSelection]
  );

  return (
    <div className="relative rounded-xl border overflow-hidden bg-slate-900 shadow-inner min-h-[480px]">
      <div className="absolute top-2 right-2 z-20 bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full">
        Live Preview · Tap to play music
      </div>
      <PremiumInviteWrapper
        skipReveal={design.studio?.revealMode === "none" || design.experience?.openingExperience === "none"}
        skipTapGate={false}
        musicEnabled
        musicSelection={musicSelection}
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
        design={design}
        guestName="Guest Preview"
        fullScreen
        embedded
        rsvpRequired={false}
        eventId="preview-event"
      />
    </div>
  );
}
