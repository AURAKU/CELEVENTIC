/**
 * Build a full InvitationExperienceConfig from catalog creative + runtime flags.
 */
import type { OpeningExperienceId, OutroExperienceId } from "@/lib/experience/experience-types";
import {
  getTemplateCreativeProfile,
  type MotionLanguage,
  type TemplateCreativeProfile,
} from "@/lib/invitation/template-creative-registry";
import { getTemplateExperienceDNA } from "@/lib/experience/experience-engine-v2";
import type { InvitationExperienceConfig, ExperienceRuntimeFlags } from "@/lib/experience-engine/types";
import { buildExperienceSequence, resolvePrimaryActions } from "@/lib/experience-engine/experience-sequence";
import { resolvePreviewMode } from "@/lib/experience-engine/preview-mode";
import { adaptSceneTransition } from "@/lib/experience-engine/legacy-adapters";

export interface BuildInvitationExperienceInput {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  invitationId?: string | null;
  previewMode?: boolean;
  embedded?: boolean;
  reducedMotion?: boolean;
  audioEnabled?: boolean;
  surface?: "live" | "studio" | "catalog" | "thumbnail" | "admin";
  creativeOverride?: TemplateCreativeProfile | null;
}

export function buildInvitationExperienceConfig(
  input: BuildInvitationExperienceInput
): InvitationExperienceConfig {
  const creative =
    input.creativeOverride ??
    (input.catalogSlug ? getTemplateCreativeProfile(input.catalogSlug) : null);

  const dna = getTemplateExperienceDNA(input.layoutSlug ?? creative?.layoutSlug ?? "classic-gold");
  const preview = resolvePreviewMode({
    invitationId: input.invitationId,
    previewMode: input.previewMode,
    embedded: input.embedded,
    surface: input.surface,
  });

  const flags: ExperienceRuntimeFlags = {
    isPreview: preview.isPreview,
    isEmbedded: Boolean(input.embedded),
    reducedMotion: Boolean(input.reducedMotion),
    suppressSideEffects: preview.suppressSideEffects,
    audioEnabled: input.audioEnabled !== false,
  };

  const motionLanguage = (creative?.motionProfile ?? "cinematic") as MotionLanguage;

  return {
    creative,
    openingExperience: (creative?.openingExperience ??
      dna.openingExperience) as OpeningExperienceId,
    outroExperience: (creative?.outroExperience ?? dna.outroExperience) as OutroExperienceId,
    motionLanguage,
    parallaxIntensity: creative?.parallaxProfile ?? "subtle",
    transition: adaptSceneTransition(creative?.sceneTransition ?? dna.sceneTransition),
    sequence: buildExperienceSequence(creative, creative?.sceneTransition ?? dna.sceneTransition),
    primaryActions: resolvePrimaryActions(creative),
    flags,
  };
}
