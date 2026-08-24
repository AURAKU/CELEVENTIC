"use client";

import { useMemo } from "react";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
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
import { introAtmosphereUrlFromDesign } from "@/lib/invitation/studio-media-utils";
import { resolveThankYouFontStack } from "@/lib/invitation-theme/fonts";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";

const FRAME_WIDTH = 390;

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
  /** Scale of the faux phone frame inside the tile (card DNA fallback) */
  scale?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Faithful pre-tap visual of a template: sealed opening cover when the template
 * opens with an envelope/curtain, otherwise a static scaled invitation render.
 * Shown under a soft tap affordance, never a darkened generic blur.
 */
export function TemplatePreviewGlimpse({
  layoutSlug,
  catalogSlug,
  category,
  features,
  scale = 0.36,
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
  const visibleHeight = compact ? 108 : 200;

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

  // Funeral: show the exact live tap-to-begin poster (eyebrow + deceased name card).
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

  // Forever Afaris blush-gate: sealed champagne envelope (embedded absolute shell).
  if (openingId === "blush-gate") {
    const board = mergeWeddingBoard(
      (preview.design.studio as { weddingBoard?: Parameters<typeof mergeWeddingBoard>[0] } | undefined)
        ?.weddingBoard
    );
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        style={{ background: visual.background }}
        aria-hidden
      >
        <div className="relative h-full w-full">
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
        </div>
      </div>
    );
  }

  // Satin Bow: the tied ivory card itself is the poster, so the tile shows the
  // exact cover the guest taps rather than a generic scaled invitation.
  if (openingId === "satin-bow") {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        aria-hidden
      >
        <SatinBowReveal
          staticPreview
          eventTitle={preview.event.title}
          hostName={preview.event.hostName}
          guestName={preview.guestName}
          onComplete={noop}
        />
      </div>
    );
  }

  // True opening DNA: sealed envelope / closed curtain fills the tile.
  if (isEnvelopeExperience(openingId) && envelopeTheme) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        style={{ background: visual.background }}
        aria-hidden
      >
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
      </div>
    );
  }

  if (isCurtain) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        style={{ background: visual.background }}
        aria-hidden
      >
        <CurtainReveal
          eventTitle={preview.event.title}
          guestName={preview.guestName}
          theme={CURTAIN_THEME_MAP[openingId] ?? "wedding"}
          staticPreview
          onComplete={noop}
        />
      </div>
    );
  }

  // Card / layout DNA for templates without a theatrical opening cover.
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      style={{ background: visual.background }}
      aria-hidden
    >
      <InvitationStaticPreviewProvider>
        <div className="absolute inset-x-0 top-0 flex justify-center pt-1">
          <div
            className="overflow-hidden rounded-t-[1.25rem] border border-black/10 bg-[#FAF8F4] shadow-md"
            style={{
              width: FRAME_WIDTH * scale,
              height: visibleHeight,
            }}
          >
            <div
              style={{
                width: FRAME_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <InvitationRenderer
                invitation={{
                  id: `glimpse-${layoutSlug}`,
                  name: preview.invitationName,
                  message: preview.message,
                  uniqueLink: "preview",
                }}
                event={eventWithCover}
                design={preview.design}
                guestName={preview.guestName}
              />
            </div>
          </div>
        </div>
      </InvitationStaticPreviewProvider>
    </div>
  );
}
