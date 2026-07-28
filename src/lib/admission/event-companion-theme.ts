import {
  getDefaultDesignConfig,
  mergeDesignConfig,
  applyCatalogCreativeIdentity,
} from "@/lib/invitation-templates";
import { pageBackgroundFromDesign } from "@/lib/invitation/studio-media-utils";
import { mergeWeddingBoard } from "@/lib/invitation/wedding-board";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { WeddingBoardProgrammeItem } from "@/lib/invitation/wedding-board";

export type CompanionTheme = {
  colors: InvitationDesignConfig["colors"];
  fonts: NonNullable<InvitationDesignConfig["fonts"]>;
  layout: string;
  backgroundImageUrl: string | null;
  programmeItems: WeddingBoardProgrammeItem[];
  accentWash: string;
  paperWash: string;
};

const FALLBACK_COLORS: InvitationDesignConfig["colors"] = {
  primary: "#3A2A2E",
  secondary: "#C7A35A",
  accent: "#D99A93",
  background: "#FBF6EF",
  text: "#3A2A2E",
};

const FALLBACK_FONTS: NonNullable<InvitationDesignConfig["fonts"]> = {
  heading: "Playfair Display",
  script: "Great Vibes",
  body: "Cormorant Garamond",
  eyebrow: "Cinzel",
};

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6 && raw.length !== 3) return hex;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fontStack(name: string | undefined, fallback: string): string {
  const n = (name ?? fallback).trim() || fallback;
  return `"${n}", ui-serif, Georgia, serif`;
}

/**
 * Resolve the live invitation design into companion theme tokens so the
 * post-admission surface always feels like a continuation of the invite.
 */
export function resolveCompanionTheme(invitation: {
  designConfig: unknown;
  template: { slug: string; config: unknown } | null;
  eventCoverImageUrl?: string | null;
}): CompanionTheme {
  const stored = invitation.designConfig as InvitationDesignConfig | null;
  const templateConfig = invitation.template?.config as Partial<InvitationDesignConfig> | null;
  const identitySlug =
    invitation.template?.slug ??
    stored?.layout ??
    templateConfig?.layout ??
    "classic-gold";

  let design: InvitationDesignConfig;
  try {
    const base = getDefaultDesignConfig(identitySlug);
    const merged = mergeDesignConfig(base, {
      ...(templateConfig ?? {}),
      ...(stored ?? {}),
      colors: { ...base.colors, ...templateConfig?.colors, ...stored?.colors },
      fonts: { ...base.fonts, ...templateConfig?.fonts, ...stored?.fonts },
    });
    design = applyCatalogCreativeIdentity(merged, identitySlug);
  } catch {
    design = {
      layout: "classic-gold",
      colors: FALLBACK_COLORS,
      fonts: FALLBACK_FONTS,
    };
  }

  const colors = { ...FALLBACK_COLORS, ...design.colors };
  const fonts = { ...FALLBACK_FONTS, ...design.fonts };
  const bg = pageBackgroundFromDesign(design);
  const backgroundImageUrl =
    bg.backgroundImageUrl ?? invitation.eventCoverImageUrl?.trim() ?? null;

  const studio = design.studio as
    | { weddingBoard?: unknown; visionBoard?: { programmeItems?: WeddingBoardProgrammeItem[] } }
    | undefined;
  let programmeItems: WeddingBoardProgrammeItem[] = [];
  try {
    if (design.layout === "forever-afaris-wedding") {
      programmeItems = mergeWeddingBoard(
        studio?.weddingBoard as Parameters<typeof mergeWeddingBoard>[0]
      ).programmeItems;
    } else if (studio?.visionBoard?.programmeItems?.length) {
      programmeItems = studio.visionBoard.programmeItems;
    }
  } catch {
    programmeItems = [];
  }

  return {
    colors,
    fonts: {
      heading: fonts.heading,
      script: fonts.script,
      body: fonts.body,
      eyebrow: fonts.eyebrow,
    },
    layout: design.layout,
    backgroundImageUrl,
    programmeItems,
    accentWash: withAlpha(colors.secondary, 0.14),
    paperWash: withAlpha(colors.background, 0.82),
  };
}

export function companionFontStyles(fonts: CompanionTheme["fonts"]): {
  heading: string;
  script: string;
  body: string;
  eyebrow: string;
} {
  return {
    heading: fontStack(fonts.heading, "Playfair Display"),
    script: fontStack(fonts.script, "Great Vibes"),
    body: fontStack(fonts.body, "Cormorant Garamond"),
    eyebrow: fontStack(fonts.eyebrow ?? fonts.heading, "Cinzel"),
  };
}
