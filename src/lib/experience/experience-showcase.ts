import { CINEMATIC_LAYOUT_SLUGS, CINEMATIC_THEMES } from "@/lib/invitation/cinematic-themes";
import { getTemplateExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { getOpeningExperience } from "@/lib/experience/opening-experiences";
import { getAudioTrackById } from "@/lib/music/audio-experience-catalog";
import { BUTTON_STYLE_OPTIONS } from "@/lib/invitation-studio/studio-types";
import type { CinematicLayoutSlug } from "@/lib/invitation/cinematic-themes";

export interface CinematicShowcaseItem {
  index: number;
  slug: CinematicLayoutSlug;
  name: string;
  category: string;
  tagline: string;
  previewGradient: string;
  collectionLabel: string;
  introLabel: string;
  audioLabel: string;
  buttonLabel: string;
  pacing: string;
}

export function buildCinematicShowcase(): CinematicShowcaseItem[] {
  return CINEMATIC_LAYOUT_SLUGS.map((slug, index) => {
    const theme = CINEMATIC_THEMES[slug];
    const dna = getTemplateExperienceDNA(slug);
    const opening = getOpeningExperience(dna.openingExperience);
    const track = getAudioTrackById(dna.defaultAudioTrackId);
    const button = BUTTON_STYLE_OPTIONS.find((b) => b.id === dna.buttonStyle);

    return {
      index: index + 1,
      slug,
      name: theme.name,
      category: theme.category,
      tagline: theme.tagline,
      previewGradient: theme.previewGradient,
      collectionLabel: dna.collectionId.replace(/-/g, " "),
      introLabel: opening?.label ?? "Custom intro",
      audioLabel: track?.title ?? theme.defaultAudioCategory,
      buttonLabel: button?.label ?? dna.buttonStyle,
      pacing: dna.pacing,
    };
  });
}

export const CINEMATIC_SHOWCASE = buildCinematicShowcase();
