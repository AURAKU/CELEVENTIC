"use client";

import { useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { getDemoHeroUrl } from "@/lib/invitation/demo-gallery-assets";
import { getLayoutVisualProfile } from "@/lib/experience/layout-visual-profiles";
import { cn } from "@/lib/utils";
import { InvitationStaticPreviewProvider } from "@/components/invitation/invitation-static-preview";
import {
  getOpeningExperience,
  isEnvelopeExperience,
} from "@/lib/experience/opening-experiences";
import type { OpeningExperienceId } from "@/lib/experience/experience-types";
import { EnvelopeCollectionReveal } from "@/components/experience/envelope-collection-reveal";
import { CurtainReveal } from "@/components/invitation-os/reveal/curtain-reveal";
import { BlushGateReveal } from "@/components/invitation-os/reveal/blush-gate-reveal";
import { SatinBowReveal } from "@/components/invitation-os/reveal/satin-bow-reveal";
import {
  mergeWeddingBoard,
  resolveGateTitle,
  resolveIntroCoupleLine,
} from "@/lib/invitation/wedding-board";
import {
  mergeVisionBoard,
  resolveSealInitials,
  type VisionBoardContent,
} from "@/lib/invitation/vision-board";
import { resolveSealStyle } from "@/lib/invitation/seal-design";
import { TapToBeginExperience } from "@/components/invitations/tap-to-begin-experience";
import { introAtmosphereUrlFromDesign, pageBackgroundFromDesign } from "@/lib/invitation/studio-media-utils";
import { resolveThankYouFontStack } from "@/lib/invitation-theme/fonts";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";

const GuestInvitationPortal = dynamic(
  () =>
    import("@/components/guest-portal/guest-invitation-portal").then(
      (m) => m.GuestInvitationPortal
    ),
  { ssr: false }
);

function isFuneralCategory(category?: string): boolean {
  return category?.toLowerCase() === "funeral";
}

const CURTAIN_THEME_MAP: Record<string, "wedding" | "concert" | "award" | "birthday" | "corporate"> = {
  "curtain-wedding": "wedding",
  "curtain-concert": "concert",
  "curtain-award": "award",
  "curtain-birthday": "birthday",
  "curtain-corporate": "corporate",
};

interface TemplatePreviewGlimpseProps {
  layoutSlug: string;
  /** Catalog SKU, required when multiple SKUs share a layout (Wave-1 pages) */
  catalogSlug?: string;
  category?: string;
  features?: string[];
  /** Unused visually; kept so catalogue callers can pass variant scale. */
  scale?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Catalogue / marketing tile: a snippet of the live guest invitation.
 * the opened event experience guests actually play, not a stock photo or
 * sealed-only poster. Theatrical openings stay visible as a small cover chip;
 * tap still plays them.
 */
export function TemplatePreviewGlimpse({
  layoutSlug,
  catalogSlug,
  category,
  features,
  compact = false,
  className,
}: TemplatePreviewGlimpseProps) {
  const preview = useMemo(
    () =>
      buildLivePreviewProps(layoutSlug, category, {
        features,
        musicEnabled: false,
        skipIntro: true,
        skipTapGate: true,
        catalogSlug: catalogSlug ?? layoutSlug,
      }),
    [layoutSlug, catalogSlug, category, features]
  );

  const visual = getLayoutVisualProfile(layoutSlug);
  const openingId = (preview.design.experience?.openingExperience ??
    "none") as OpeningExperienceId;
  const openingMeta = openingId !== "none" ? getOpeningExperience(openingId) : undefined;
  const envelopeTheme = openingMeta?.envelopeTheme;
  const isCurtain = openingId.startsWith("curtain-");

  const visionBoard = mergeVisionBoard(
    (preview.design.studio as { visionBoard?: VisionBoardContent } | undefined)?.visionBoard
  );
  const sealInitials = resolveSealInitials(visionBoard.sealInitials, {
    layout: preview.design.layout ?? layoutSlug,
    coupleName1: visionBoard.coupleName1,
    coupleName2: visionBoard.coupleName2,
    hostName: preview.event.hostName,
    eventCategory: category,
    eventTitle: preview.event.title,
    invitationName: preview.event.title,
  });
  const sealStyle = resolveSealStyle(visionBoard);

  const coverUrl = preview.event.coverImageUrl ?? getDemoHeroUrl(layoutSlug, category);
  const eventWithCover = { ...preview.event, coverImageUrl: coverUrl };
  const background = pageBackgroundFromDesign(preview.design);

  const noop = () => undefined;
  const funeral = isFuneralCategory(category);
  const atmosphereUrl =
    introAtmosphereUrlFromDesign(preview.design) ??
    preview.event.coverImageUrl ??
    getDemoHeroUrl(layoutSlug, category, catalogSlug ?? layoutSlug);
  const experience = preview.design.experience;
  const funeralCeremonyLabel =
    visionBoard.eyebrow?.trim() ||
    preview.design.introText?.trim() ||
    "IN LOVING MEMORY";

  const openingCover = (() => {
    if (funeral) return null;
    if (openingId === "blush-gate") {
      const board = mergeWeddingBoard(
        (preview.design.studio as { weddingBoard?: Parameters<typeof mergeWeddingBoard>[0] } | undefined)
          ?.weddingBoard
      );
      return (
        <BlushGateReveal
          embedded
          eventTitle={preview.event.title}
          hostName={preview.event.hostName}
          guestName={preview.guestName}
          copy={{
            monogram: board.sealMonogram,
            instruction: board.openingInstruction,
            gateWord: resolveGateTitle(board.gateWord),
            coupleLine: resolveIntroCoupleLine(board.coupleName1, board.coupleName2),
            addressLine: board.envelopeAddressLine,
            envelopeStyle: board.envelopeStyle,
            gateStyle: board.gateStyle,
            sealColor: board.sealColor,
            sealMotif: board.sealMotif,
            haptics: false,
            palette: {
              accentColor: board.accentColor,
              blushColor: board.blushColor,
              inkColor: board.inkColor,
              canvasColor: board.canvasColor,
            },
          }}
          onComplete={noop}
        />
      );
    }
    if (openingId === "satin-bow") {
      return (
        <SatinBowReveal
          staticPreview
          eventTitle={preview.event.title}
          hostName={preview.event.hostName}
          guestName={preview.guestName}
          onComplete={noop}
        />
      );
    }
    if (isEnvelopeExperience(openingId) && envelopeTheme) {
      return (
        <EnvelopeCollectionReveal
          theme={envelopeTheme}
          eventTitle={preview.event.title}
          hostName={preview.event.hostName}
          guestName={preview.guestName}
          sealInitials={sealInitials}
          sealStyle={sealStyle}
          enableSounds={false}
          staticPreview
          onComplete={noop}
        />
      );
    }
    if (isCurtain) {
      return (
        <CurtainReveal
          eventTitle={preview.event.title}
          guestName={preview.guestName}
          theme={CURTAIN_THEME_MAP[openingId] ?? "wedding"}
          staticPreview
          onComplete={noop}
        />
      );
    }
    return null;
  })();

  // Funeral: the live first screen is the tap-to-begin name card.
  if (funeral) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        style={{ background: visual.background }}
        aria-hidden
      >
        <TapToBeginExperience
          staticPreview
          onBegin={noop}
          eventTitle={preview.event.title}
          hostName={preview.event.hostName}
          invitationName={preview.event.title}
          name1={visionBoard.coupleName1?.trim() || null}
          accentColor={experience?.welcomeAccentColor ?? CELEVENTIC_PALETTE.teal}
          primaryColor={CELEVENTIC_PALETTE.gold}
          atmosphereUrl={atmosphereUrl}
          ceremonyLabel={funeralCeremonyLabel}
          layoutSlug={preview.design.layout ?? layoutSlug}
          category="funeral"
          fontFamily={
            experience?.welcomeFontFamily
              ? resolveThankYouFontStack(experience.welcomeFontFamily)
              : undefined
          }
          fontScale={experience?.welcomeFontScale ?? "compact"}
          textColorOverride={experience?.welcomeTextColor}
          accentColorOverride={experience?.welcomeAccentColor}
          scrim={experience?.welcomeScrim ?? "on"}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "template-glimpse-live absolute inset-0 overflow-hidden pointer-events-none bg-[#0a0a0a]",
        className
      )}
      aria-hidden
    >
      <InvitationStaticPreviewProvider>
        <div className="h-full w-full min-h-0">
          <GuestInvitationPortal
            invitation={{
              id: `preview-glimpse-${layoutSlug}`,
              name: preview.invitationName,
              message: preview.message,
              uniqueLink: "preview",
            }}
            event={eventWithCover}
            design={preview.design}
            guestName={preview.guestName}
            galleryUrls={preview.galleryUrls}
            templateSlug={catalogSlug ?? layoutSlug}
            experienceConfig={preview.design.experience}
            backgroundImageUrl={background.backgroundImageUrl ?? coverUrl}
            backgroundVideoUrl={background.backgroundVideoUrl}
            embedded
            fullScreen
            cinematicMode
            rsvpRequired={false}
          />
        </div>
      </InvitationStaticPreviewProvider>
      {openingCover ? (
        <OpeningCoverChip compact={compact}>{openingCover}</OpeningCoverChip>
      ) : null}
    </div>
  );
}

function OpeningCoverChip({
  compact,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute z-10 overflow-hidden rounded-xl border border-white/80 bg-black/20 shadow-[0_8px_24px_rgba(15,23,42,0.28)]",
        compact ? "left-1.5 top-1.5 h-[52px] w-[40px]" : "left-2 top-2 h-[88px] w-[68px]"
      )}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
