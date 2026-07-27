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
import { ForeverAfarisWeddingTemplate } from "./templates/forever-afaris-wedding";
import { CinematicTemplate, isCinematicLayout } from "./templates/cinematic-template";
import { InvitationMediaProvider } from "./invitation-media-context";
import { ManualGateCodeReveal } from "@/components/qr/manual-gate-code-reveal";
import { GuestEntryPass } from "@/components/admission/guest-entry-pass";
import { PlaceCard } from "@/components/invitation/place-card";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";

export type InvitationRendererProps = InvitationRenderProps & {
  interactiveMedia?: boolean;
  /** Optional organizer email — used by themed templates (e.g. traditional marriage merge) */
  contactEmail?: string | null;
  /** Portal section presence — quiet journey links (traditional marriage) */
  hasGiftsSection?: boolean;
  hasTimelineSection?: boolean;
  /** Guest-facing gallery URLs for templates that render their own gallery */
  galleryUrls?: string[];
};

export function InvitationRenderer({ interactiveMedia = false, ...props }: InvitationRendererProps) {
  const content = isCinematicLayout(props.design.layout) ? (
    <CinematicTemplate {...props} />
  ) : (() => {
    switch (props.design.layout) {
      case "traditional-marriage-ceremony":
        return <TraditionalMarriageCeremonyTemplate {...props} />;
      case "forever-afaris-wedding":
        return <ForeverAfarisWeddingTemplate {...props} />;
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
      {/* Personalised place card. One shared implementation for every template,
          placed directly above the entry pass so a guest reads who the
          invitation is for and how many it admits before they reach the QR. */}
      {props.placeCard && (
        <ClientErrorBoundary fallback={null}>
          <PlaceCard
            config={props.placeCard.config}
            recipient={props.placeCard.recipient}
            party={props.placeCard.party}
            design={props.design}
          />
        </ClientErrorBoundary>
      )}
      {/* Closing section of every invitation. The entry pass supersedes the
          standalone gate code — showing both would give a guest two different
          numbers to read out at the door. */}
      {props.entryPass ? (
        <ClientErrorBoundary
          fallback={
            <div className="px-4 pb-8 text-center text-sm text-slate-500">
              Your entry pass couldn&apos;t be displayed. Refresh the page, or show this
              invitation at the entrance.
            </div>
          }
        >
          <GuestEntryPass
            token={props.entryPass.token}
            code={props.entryPass.code}
            displayName={props.entryPass.displayName}
            eventName={props.event.title}
            eventDate={props.event.startDate}
            venueName={props.event.venueName}
            partySize={props.entryPass.partySize}
            admittedCount={props.entryPass.admittedCount}
            status={props.entryPass.status}
            tableNumber={props.entryPass.tableNumber}
            seatLabel={props.entryPass.seatLabel}
            instructions={props.entryPass.instructions}
            allowDownload={props.entryPass.allowDownload}
            allowPrint={props.entryPass.allowPrint}
            showPartySize={props.entryPass.showPartySize}
            layout={props.design.layout}
          />
        </ClientErrorBoundary>
      ) : (
        props.admissionManualCode && (
          <div className="px-4 pb-6 -mt-2">
            <ManualGateCodeReveal code={props.admissionManualCode} variant="invite" />
          </div>
        )
      )}
    </div>
  );
}
