import {
  AURELIA_LAYOUT_SLUG,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import type { SocialEventKind } from "@/lib/social/social-category";

export type SocialVisualTheme = {
  panel: string;
  veil: string;
  ivory: string;
  gold: string;
  muted: string;
  mark: string;
  heroWash: string;
};

const KIND_THEMES: Record<SocialEventKind, SocialVisualTheme> = {
  wedding: {
    panel: "linear-gradient(165deg, #1A1410 0%, #2A2118 42%, #3A2E22 100%)",
    veil: "linear-gradient(90deg, rgba(26, 20, 16, 0) 0%, rgba(26, 20, 16, 0.28) 55%, rgba(26, 20, 16, 0.92) 100%)",
    ivory: "#F6F0E6",
    gold: "#C9B07A",
    muted: "rgba(246, 240, 230, 0.72)",
    mark: "rgba(201, 176, 122, 0.88)",
    heroWash: "radial-gradient(circle at 30% 30%, #6B5340 0%, #1A1410 72%)",
  },
  engagement: {
    panel: "linear-gradient(165deg, #23181C 0%, #3A242C 45%, #4A3038 100%)",
    veil: "linear-gradient(90deg, rgba(35, 24, 28, 0) 0%, rgba(35, 24, 28, 0.3) 55%, rgba(35, 24, 28, 0.93) 100%)",
    ivory: "#F7EEEF",
    gold: "#D4A0A8",
    muted: "rgba(247, 238, 239, 0.72)",
    mark: "rgba(212, 160, 168, 0.9)",
    heroWash: "radial-gradient(circle at 30% 28%, #8A5A66 0%, #23181C 72%)",
  },
  birthday: {
    panel: "linear-gradient(165deg, #1B1230 0%, #2C1B4A 40%, #3D2460 100%)",
    veil: "linear-gradient(90deg, rgba(27, 18, 48, 0) 0%, rgba(27, 18, 48, 0.28) 55%, rgba(27, 18, 48, 0.93) 100%)",
    ivory: "#F6F1FF",
    gold: "#E2B45C",
    muted: "rgba(246, 241, 255, 0.74)",
    mark: "rgba(226, 180, 92, 0.9)",
    heroWash: "radial-gradient(circle at 32% 24%, #6B4CA0 0%, #1B1230 72%)",
  },
  funeral: {
    panel: "linear-gradient(165deg, #121214 0%, #1C1C20 42%, #26262C 100%)",
    veil: "linear-gradient(90deg, rgba(18, 18, 20, 0) 0%, rgba(18, 18, 20, 0.32) 55%, rgba(18, 18, 20, 0.94) 100%)",
    ivory: "#EEEAE2",
    gold: "#B7A48A",
    muted: "rgba(238, 234, 226, 0.7)",
    mark: "rgba(183, 164, 138, 0.86)",
    heroWash: "radial-gradient(circle at 30% 30%, #3A3A40 0%, #121214 74%)",
  },
  church: {
    panel: "linear-gradient(165deg, #1A1712 0%, #2A261C 42%, #3A3426 100%)",
    veil: "linear-gradient(90deg, rgba(26, 23, 18, 0) 0%, rgba(26, 23, 18, 0.3) 55%, rgba(26, 23, 18, 0.93) 100%)",
    ivory: "#F4EFE4",
    gold: "#C4B08A",
    muted: "rgba(244, 239, 228, 0.72)",
    mark: "rgba(196, 176, 138, 0.88)",
    heroWash: "radial-gradient(circle at 30% 28%, #6A5A40 0%, #1A1712 72%)",
  },
  corporate: {
    panel: "linear-gradient(165deg, #0E1620 0%, #15202C 40%, #1C2B3A 100%)",
    veil: "linear-gradient(90deg, rgba(14, 22, 32, 0) 0%, rgba(14, 22, 32, 0.28) 55%, rgba(14, 22, 32, 0.94) 100%)",
    ivory: "#EEF3F7",
    gold: "#C5A572",
    muted: "rgba(238, 243, 247, 0.72)",
    mark: "rgba(197, 165, 114, 0.88)",
    heroWash: "radial-gradient(circle at 30% 26%, #2A4A66 0%, #0E1620 74%)",
  },
  conference: {
    panel: "linear-gradient(165deg, #101820 0%, #182430 42%, #223040 100%)",
    veil: "linear-gradient(90deg, rgba(16, 24, 32, 0) 0%, rgba(16, 24, 32, 0.28) 55%, rgba(16, 24, 32, 0.94) 100%)",
    ivory: "#F0F4F7",
    gold: "#8EB4C8",
    muted: "rgba(240, 244, 247, 0.72)",
    mark: "rgba(142, 180, 200, 0.9)",
    heroWash: "radial-gradient(circle at 30% 26%, #3A6880 0%, #101820 74%)",
  },
  concert: {
    panel: "linear-gradient(165deg, #120814 0%, #220C22 38%, #341028 100%)",
    veil: "linear-gradient(90deg, rgba(18, 8, 20, 0) 0%, rgba(18, 8, 20, 0.3) 52%, rgba(18, 8, 20, 0.94) 100%)",
    ivory: "#F7F0F4",
    gold: "#E08A6A",
    muted: "rgba(247, 240, 244, 0.74)",
    mark: "rgba(224, 138, 106, 0.9)",
    heroWash: "radial-gradient(circle at 28% 22%, #6A2048 0%, #120814 72%)",
  },
  lunch: {
    panel: "linear-gradient(165deg, #1C1410 0%, #2A1E18 42%, #3A2A22 100%)",
    veil: "linear-gradient(90deg, rgba(28, 20, 16, 0) 0%, rgba(28, 20, 16, 0.26) 55%, rgba(28, 20, 16, 0.93) 100%)",
    ivory: "#F7F1E8",
    gold: "#D7C4A0",
    muted: "rgba(247, 241, 232, 0.74)",
    mark: "rgba(215, 196, 160, 0.9)",
    heroWash: "radial-gradient(circle at 30% 24%, #8A6A50 0%, #1C1410 72%)",
  },
  private: {
    panel: "linear-gradient(165deg, #141416 0%, #1E1E22 42%, #2A2A30 100%)",
    veil: "linear-gradient(90deg, rgba(20, 20, 22, 0) 0%, rgba(20, 20, 22, 0.3) 55%, rgba(20, 20, 22, 0.94) 100%)",
    ivory: "#F3F1EC",
    gold: "#C8B89A",
    muted: "rgba(243, 241, 236, 0.72)",
    mark: "rgba(200, 184, 154, 0.88)",
    heroWash: "radial-gradient(circle at 30% 28%, #4A4A52 0%, #141416 74%)",
  },
};

const AURELIA_THEME: SocialVisualTheme = {
  panel: "linear-gradient(165deg, #0B241C 0%, #102E24 42%, #17382C 100%)",
  veil: "linear-gradient(90deg, rgba(8, 24, 18, 0) 0%, rgba(8, 24, 18, 0.28) 55%, rgba(11, 36, 28, 0.92) 100%)",
  ivory: "#F4EFE4",
  gold: "#C9B07A",
  muted: "rgba(244, 239, 228, 0.72)",
  mark: "rgba(201, 176, 122, 0.88)",
  heroWash: "radial-gradient(circle at 30% 30%, #245544 0%, #0B241C 70%)",
};

const SERAPHINE_THEME: SocialVisualTheme = {
  panel: "linear-gradient(165deg, #2C261C 0%, #3A3226 38%, #4A3F30 100%)",
  veil: "linear-gradient(90deg, rgba(44, 38, 28, 0) 0%, rgba(58, 50, 38, 0.22) 52%, rgba(58, 50, 38, 0.94) 100%)",
  ivory: "#F7F1E6",
  gold: "#D7C4A0",
  muted: "rgba(247, 241, 230, 0.74)",
  mark: "rgba(168, 186, 154, 0.92)",
  heroWash: "radial-gradient(circle at 30% 24%, #8BA888 0%, #3A3226 72%)",
};

function mixPanelFromColors(base: SocialVisualTheme, colors?: {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  background?: string | null;
} | null): SocialVisualTheme {
  const background = colors?.background?.trim();
  const accent = colors?.accent?.trim() || colors?.primary?.trim();
  if (!background && !accent) return base;
  return {
    ...base,
    panel: background
      ? `linear-gradient(165deg, ${background} 0%, ${colors?.primary || background} 55%, ${colors?.secondary || background} 100%)`
      : base.panel,
    gold: accent || base.gold,
    mark: accent || base.mark,
  };
}

export function resolveSocialVisualTheme(input: {
  kind: SocialEventKind;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  colors?: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
    background?: string | null;
  } | null;
}): SocialVisualTheme {
  const slug = `${input.catalogSlug ?? ""} ${input.layoutSlug ?? ""}`.toLowerCase();
  if (slug.includes(AURELIA_LAYOUT_SLUG) || slug.includes("aurelia-editorial")) {
    return mixPanelFromColors(AURELIA_THEME, input.colors);
  }
  if (slug.includes(SERAPHINE_LAYOUT_SLUG) || slug.includes("seraphine")) {
    return mixPanelFromColors(SERAPHINE_THEME, input.colors);
  }
  return mixPanelFromColors(KIND_THEMES[input.kind], input.colors);
}
