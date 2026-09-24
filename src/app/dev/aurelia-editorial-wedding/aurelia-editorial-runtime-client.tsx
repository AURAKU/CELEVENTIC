"use client";

import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { AURELIA_LAYOUT_SLUG } from "@/lib/experience/aurelia-editorial";
import { invitationFontVars } from "@/lib/invitation-fonts";

export function AureliaEditorialRuntimeClient({
  skipIntro = false,
}: {
  skipIntro?: boolean;
  reduced?: boolean;
}) {
  const preview = buildLivePreviewProps(AURELIA_LAYOUT_SLUG, "Wedding", {
    catalogSlug: AURELIA_LAYOUT_SLUG,
    features: ["RSVP", "Countdown", "Maps", "Dress Code", "Story", "Music", "Share"],
    musicEnabled: true,
    musicAutoplay: false,
    skipIntro,
  });

  return (
    <div className={`min-h-svh bg-[#F8F4EA] ${invitationFontVars}`} data-testid="aurelia-runtime">
      <ClientErrorBoundary
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center px-4 text-center text-sm text-[#5C4033]">
            This invitation couldn&apos;t be displayed. Refresh the page to try again.
          </div>
        }
      >
        <PremiumInviteWrapper
          invitation={{
            id: "preview-aurelia-editorial-wedding",
            name: preview.invitationName,
            message: preview.message,
            uniqueLink: "preview-aurelia-editorial-wedding",
          }}
          event={preview.event}
          design={preview.design}
          guestName={preview.guestName}
          galleryUrls={preview.galleryUrls}
          catalogSlug={AURELIA_LAYOUT_SLUG}
          musicSelection={preview.musicSelection}
          musicEnabled
          skipAnalytics
          skipIntro={skipIntro}
          skipSoftIntro={skipIntro}
          skipTapGate
          skipReveal
          revealEnabled
          openingExperience="aurelia-editorial-wedding"
        />
      </ClientErrorBoundary>
    </div>
  );
}
