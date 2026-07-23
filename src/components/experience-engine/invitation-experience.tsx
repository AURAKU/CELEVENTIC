"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { buildInvitationExperienceConfig } from "@/lib/experience-engine/build-invitation-experience";
import type { InvitationExperienceConfig } from "@/lib/experience-engine/types";
import {
  MotionProfileProvider,
  useScrollContainerRef,
} from "@/components/motion/motion-profile-provider";
import { adaptLanguageToThemeMotion } from "@/lib/experience-engine/legacy-adapters";
import { ResponsiveSceneComposer } from "@/components/experience-engine/responsive-scene-composer";
import { InteractiveReveal } from "@/components/experience-engine/interactive-reveal";
import { ExperienceSequence } from "@/components/experience-engine/experience-sequence";
import { ExperienceOutro } from "@/components/experience-engine/experience-outro";
import { SceneErrorBoundary } from "@/components/experience-engine/scene-error-boundary";
import type { InviteViewportMode } from "@/components/invitation/invite-viewport-shell";
import type { ParallaxIntensity } from "@/lib/invitation/template-creative-registry";

export interface InvitationExperienceProps {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  invitationId?: string | null;
  previewMode?: boolean;
  embedded?: boolean;
  eventTitle: string;
  guestName?: string;
  hostName?: string;
  musicEnabled?: boolean;
  enableSounds?: boolean;
  /** Wax-seal initials for envelope reveals. */
  sealInitials?: string;
  /** Skip reveal and render portal children immediately */
  skipReveal?: boolean;
  viewportMode?: InviteViewportMode;
  background?: string;
  configOverride?: InvitationExperienceConfig;
  /** Portal / template body */
  children: ReactNode;
  onRevealComplete?: () => void;
  /** Optional custom scene renderer for sequenced layouts */
  renderScene?: (sceneId: string, index: number) => ReactNode;
  /** When true, children are wrapped in ExperienceSequence scenes */
  useSequence?: boolean;
}

/**
 * Thin orchestrator — composes ResponsiveSceneComposer + InteractiveReveal +
 * sequence/outro. Does NOT replace PremiumInviteWrapper; Phase 3 templates can
 * adopt this incrementally. Legacy pipeline stays the source of truth for live invites.
 */
export function InvitationExperience({
  catalogSlug,
  layoutSlug,
  invitationId,
  previewMode,
  embedded,
  eventTitle,
  guestName,
  hostName,
  musicEnabled,
  enableSounds = true,
  sealInitials,
  skipReveal = false,
  viewportMode,
  background,
  configOverride,
  children,
  onRevealComplete,
  renderScene,
  useSequence = false,
}: InvitationExperienceProps) {
  const reducedMotion = useReducedMotion();
  const scrollContainerRef = useScrollContainerRef();
  const config =
    configOverride ??
    buildInvitationExperienceConfig({
      catalogSlug,
      layoutSlug,
      invitationId,
      previewMode,
      embedded,
      reducedMotion: Boolean(reducedMotion),
      surface: embedded ? "studio" : previewMode ? "catalog" : "live",
    });

  const mode: InviteViewportMode =
    viewportMode ?? (embedded || config.flags.isEmbedded ? "embedded" : "live");

  const themeProfileId = adaptLanguageToThemeMotion(config.motionLanguage);
  const motionIntensity = parallaxIntensityToMotion(config.parallaxIntensity);

  const body = useSequence ? (
    <ExperienceSequence
      sequence={config.sequence}
      renderScene={renderScene}
      staticRender={config.flags.reducedMotion}
    >
      {!renderScene ? children : undefined}
    </ExperienceSequence>
  ) : (
    children
  );

  const portal = (
    <SceneErrorBoundary sceneId="portal">
      {body}
      <ExperienceOutro outroId={config.outroExperience} />
    </SceneErrorBoundary>
  );

  return (
    <MotionProfileProvider
      profileId={themeProfileId}
      intensity={motionIntensity}
      scrollContainerRef={scrollContainerRef}
    >
      <ResponsiveSceneComposer
        mode={mode}
        background={background}
        scrollable={mode === "live"}
      >
        <div ref={scrollContainerRef} className="h-full min-h-full w-full overflow-y-auto overscroll-contain">
          {skipReveal || config.openingExperience === "none" ? (
            portal
          ) : (
            <InteractiveReveal
              openingExperience={config.openingExperience}
              guestName={guestName}
              eventTitle={eventTitle}
              hostName={hostName}
              musicEnabled={musicEnabled}
              enableSounds={enableSounds && !config.flags.suppressSideEffects}
              sealInitials={sealInitials}
              onComplete={() => onRevealComplete?.()}
            >
              {portal}
            </InteractiveReveal>
          )}
        </div>
      </ResponsiveSceneComposer>
    </MotionProfileProvider>
  );
}

function parallaxIntensityToMotion(intensity: ParallaxIntensity): number {
  switch (intensity) {
    case "none":
      return 0;
    case "subtle":
      return 0.35;
    case "moderate":
      return 0.65;
    case "cinematic":
      return 1;
    case "interactive":
      return 1;
    default:
      return 0.65;
  }
}
