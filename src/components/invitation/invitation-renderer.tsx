"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { ClassicGoldTemplate } from "./templates/classic-gold";
import { ArchGreenTemplate } from "./templates/arch-green";
import { RusticLaceTemplate } from "./templates/rustic-lace";
import { BohoHexagonTemplate } from "./templates/boho-hexagon";
import { LuxuryRingsTemplate } from "./templates/luxury-rings";
import { CustomMediaTemplate } from "./templates/custom-media";
import { PassportLuxeTemplate } from "./templates/passport-luxe";
import { GlassAcrylicTemplate } from "./templates/glass-acrylic";
import { FloralGardenTemplate } from "./templates/floral-garden";
import { TraditionalMarriageCeremonyTemplate } from "./templates/traditional-marriage-ceremony";
import { CinematicTemplate, isCinematicLayout } from "./templates/cinematic-template";
import { InvitationMediaProvider } from "./invitation-media-context";
import { ManualGateCodeReveal } from "@/components/qr/manual-gate-code-reveal";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";

export type InvitationRendererProps = InvitationRenderProps & {
  interactiveMedia?: boolean;
  /** Optional organizer email — used by themed templates (e.g. traditional marriage merge) */
  contactEmail?: string | null;
  /** Portal section presence — quiet journey links (traditional marriage) */
  hasGiftsSection?: boolean;
  hasTimelineSection?: boolean;
};

export function InvitationRenderer({ interactiveMedia = false, ...props }: InvitationRendererProps) {
  const content = isCinematicLayout(props.design.layout) ? (
    <CinematicTemplate {...props} />
  ) : (() => {
    switch (props.design.layout) {
      case "traditional-marriage-ceremony":
        return <TraditionalMarriageCeremonyTemplate {...props} />;
      case "passport-luxe":
        return <PassportLuxeTemplate {...props} />;
      case "glass-acrylic":
        return <GlassAcrylicTemplate {...props} />;
      case "floral-garden":
        return <FloralGardenTemplate {...props} />;
      case "arch-green":
        return <ArchGreenTemplate {...props} />;
      case "rustic-lace":
        return <RusticLaceTemplate {...props} />;
      case "boho-hexagon":
        return <BohoHexagonTemplate {...props} />;
      case "luxury-rings":
        return <LuxuryRingsTemplate {...props} />;
      case "custom-media":
        return <CustomMediaTemplate {...props} />;
      case "classic-gold":
      default:
        return <ClassicGoldTemplate {...props} />;
    }
  })();

  return (
    <div className="invitation-copy-root">
      {/* Template-level isolation — a broken layout/media config must degrade to a
          friendly message instead of crashing the whole guest-facing page. */}
      <ClientErrorBoundary
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center px-4 py-16 text-center text-sm text-slate-500">
            This invitation couldn&apos;t be displayed right now. Please refresh the page.
          </div>
        }
      >
        <InvitationMediaProvider interactive={interactiveMedia}>{content}</InvitationMediaProvider>
      </ClientErrorBoundary>
      {props.admissionManualCode && (
        <div className="px-4 pb-6 -mt-2">
          <ManualGateCodeReveal code={props.admissionManualCode} variant="invite" />
        </div>
      )}
    </div>
  );
}
