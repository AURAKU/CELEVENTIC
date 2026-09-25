"use client";

import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import {
  AURELIA_LAYOUT_SLUG,
  AURELIA_OPENING_ID,
} from "@/lib/experience/aurelia-editorial";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import { invitationFontVars } from "@/lib/invitation-fonts";

export function AureliaEditorialRuntimeClient({
  skipIntro = false,
  memoryUploadUrl,
  memoryAlbumUrl,
  memoryUploadQrImageUrl,
  memoryEventId,
  memoryAlbumTitle,
  layoutSlug = AURELIA_LAYOUT_SLUG,
  catalogSlug = AURELIA_LAYOUT_SLUG,
  openingExperience = AURELIA_OPENING_ID,
  runtimeId = "preview-aurelia-editorial-wedding",
  testId = "aurelia-runtime",
}: {
  skipIntro?: boolean;
  reduced?: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  memoryUploadQrImageUrl?: string | null;
  memoryEventId?: string | null;
  memoryAlbumTitle?: string | null;
  layoutSlug?: string;
  catalogSlug?: string;
  openingExperience?: OpeningExperienceId;
  runtimeId?: string;
  testId?: string;
}) {
  const preview = buildLivePreviewProps(layoutSlug, "Wedding", {
    catalogSlug,
    features: ["RSVP", "Countdown", "Maps", "Dress Code", "Story", "Music", "Share", "Album"],
    musicEnabled: true,
    musicAutoplay: true,
    skipIntro,
  });

  return (
    <div className={`relative isolate min-h-svh w-full overflow-x-hidden bg-[#F8F4EA] ${invitationFontVars}`} data-testid={testId}>
      <ClientErrorBoundary
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center px-4 text-center text-sm text-[#5C4033]">
            This invitation couldn&apos;t be displayed. Refresh the page to try again.
          </div>
        }
      >
        <PremiumInviteWrapper
          invitation={{
            id: runtimeId,
            name: preview.invitationName,
            message: preview.message,
            uniqueLink: runtimeId,
          }}
          event={preview.event}
          design={preview.design}
          guestName={preview.guestName}
          galleryUrls={preview.galleryUrls}
          catalogSlug={catalogSlug}
          musicSelection={preview.musicSelection}
          musicEnabled
          musicAutoplay
          skipAnalytics
          skipIntro={skipIntro}
          skipSoftIntro={skipIntro}
          skipTapGate
          skipReveal
          revealEnabled
          openingExperience={openingExperience}
          memoryVaultEnabled={Boolean(memoryUploadUrl)}
          memoryUploadUrl={memoryUploadUrl}
          memoryAlbumUrl={memoryAlbumUrl}
          memoryUploadQrImageUrl={memoryUploadQrImageUrl}
          memoryAlbumTitle={memoryAlbumTitle ?? preview.event.title}
          eventId={memoryEventId ?? undefined}
        />
      </ClientErrorBoundary>
    </div>
  );
}
