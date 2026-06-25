import type {
  InvitationDesignConfig,
  InvitationLayoutSlug,
  MediaType,
} from "@/types/invitation-design";
import {
  getTemplatePreset,
  mergeDesignConfig,
} from "@/lib/invitation-templates";
import { CINEMATIC_THEMES, isCinematicLayout } from "@/lib/invitation/cinematic-themes";

export interface ColorSample {
  hex: string;
  weight: number;
}

export interface UploadAnalysisInput {
  url: string;
  type: MediaType;
  name?: string;
  buildMode?: "template" | "inspired" | "similar" | "improved";
  colors?: ColorSample[];
  brightness?: number;
  aspectRatio?: number;
  width?: number;
  height?: number;
}

export interface InspirationConcept {
  style: string;
  mood: string;
  layoutReason: string;
  colorStory: string;
  typography: string;
  ideas: string[];
}

export interface UploadAnalysisResult {
  concept: InspirationConcept;
  suggestedLayout: InvitationLayoutSlug;
  designConfig: InvitationDesignConfig;
  confidence: number;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function isGold(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return r > 150 && g > 120 && b < 120 && r > g && g > b;
}

function isGreen(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return g > r && g > b && g > 80;
}

function isWarmWood(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return r > 80 && g > 50 && b < 80 && r > b && Math.abs(r - g) < 60;
}

function isLightPastel(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const avg = (r + g + b) / 3;
  return avg > 200;
}

function pickDominantColors(samples?: ColorSample[]) {
  if (!samples?.length) {
    return ["#F9F7F2", "#B89E67", "#4A4A4A"];
  }
  return samples
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((s) => s.hex);
}

function matchLayout(
  type: MediaType,
  colors: string[],
  brightness = 0.5,
  aspectRatio = 0.6,
  fileName = ""
): { layout: InvitationLayoutSlug; reason: string; confidence: number } {
  const name = fileName.toLowerCase();

  if (type === "video") {
    return { layout: "custom-media", reason: "Video sample works best as a cinematic background loop", confidence: 0.9 };
  }
  if (type === "pdf") {
    return { layout: "classic-gold", reason: "PDF samples pair well with an elegant framed digital card plus download", confidence: 0.85 };
  }

  const dominant = colors[0] ?? "#FFFFFF";
  const hasGold = colors.some(isGold);
  const hasGreen = colors.some(isGreen);
  const hasWood = colors.some(isWarmWood);
  const isLight = isLightPastel(dominant) || brightness > 0.65;
  const isDark = brightness < 0.35;

  if (name.includes("lace") || name.includes("rustic") || hasWood) {
    return { layout: "rustic-lace", reason: "Warm wood and lace tones detected — rustic heritage style", confidence: 0.88 };
  }
  if (name.includes("arch") || hasGreen || (isDark && !hasGold)) {
    return { layout: "arch-green", reason: "Deep green palette suits an arched botanical invitation", confidence: 0.86 };
  }
  if (name.includes("boho") || name.includes("floral") || (isLight && !hasGold)) {
    return { layout: "boho-hexagon", reason: "Soft florals and cream tones — modern boho romantic", confidence: 0.84 };
  }
  if (hasGold || name.includes("luxury") || name.includes("ring") || isDark) {
    return { layout: "luxury-rings", reason: "Gold accents and contrast suggest a luxury celebration", confidence: 0.87 };
  }
  if (aspectRatio > 0.75) {
    return { layout: "classic-gold", reason: "Portrait photo layout matches classic gold-frame wedding cards", confidence: 0.82 };
  }
  return { layout: "custom-media", reason: "Your upload will be featured as the hero with a tailored frame", confidence: 0.8 };
}

function buildPalette(colors: string[], layout: InvitationLayoutSlug, brightness: number) {
  const dominant = colors[0] ?? "#F9F7F2";
  const accent = colors.find(isGold) ?? colors[1] ?? "#B89E67";
  const secondary = colors[2] ?? accent;

  const presets: Partial<Record<InvitationLayoutSlug, InvitationDesignConfig["colors"]>> = {
    "classic-gold": { primary: "#1a1a1a", secondary: accent, accent: "#D4AF37", background: "#FFFFFF", text: "#333333" },
    "arch-green": { primary: "#F5F0E6", secondary: "#1B3022", accent: accent, background: "#1B3022", text: "#F5F0E6" },
    "rustic-lace": { primary: "#FFFFFF", secondary: "#3D2314", accent: "#F8F4EF", background: "#3D2314", text: "#FFFFFF" },
    "boho-hexagon": { primary: "#4A4A4A", secondary: accent, accent: secondary, background: dominant, text: "#4A4A4A" },
    "luxury-rings": { primary: "#FFFFFF", secondary: accent, accent: "#C9A227", background: "#0a0a0a", text: "#F5F5F5" },
    "custom-media": { primary: isLightPastel(dominant) ? "#4A4A4A" : "#F5F5F5", secondary: accent, accent: secondary, background: dominant, text: isLightPastel(dominant) ? "#333" : "#F5F5F5" },
    "passport-luxe": { primary: "#0F172A", secondary: "#D4A63A", accent: "#0B8A83", background: "#F8FAFC", text: "#1e293b" },
    "glass-acrylic": { primary: "#f8fafc", secondary: "#7dd3fc", accent: "#38bdf8", background: "rgba(255,255,255,0.08)", text: "#f1f5f9" },
    "floral-garden": { primary: "#881337", secondary: "#be185d", accent: "#fda4af", background: "#fff1f2", text: "#4c0519" },
  };

  if (isCinematicLayout(layout)) {
    return CINEMATIC_THEMES[layout].config.colors ?? presets["classic-gold"]!;
  }

  if (brightness < 0.35 && layout !== "arch-green") {
    return presets["luxury-rings"]!;
  }
  return presets[layout] ?? presets["classic-gold"]!;
}

function applyBuildMode(
  config: InvitationDesignConfig,
  buildMode: UploadAnalysisInput["buildMode"],
  mediaType: MediaType
): InvitationDesignConfig {
  const media = config.media ?? [];

  switch (buildMode) {
    case "similar":
      return mergeDesignConfig(config, {
        layout: config.layout,
        animation: mediaType === "video" ? "none" : "ken-burns",
        buildMode: "similar",
      });
    case "improved":
      return mergeDesignConfig(config, {
        layout: config.layout === "custom-media" ? "luxury-rings" : config.layout,
        animation: "fade",
        ornament: "gold-frame",
        buildMode: "improved",
        fonts: { heading: "Cinzel", script: "Great Vibes", body: "Cormorant Garamond" },
      });
    case "inspired":
    default:
      return mergeDesignConfig(config, {
        layout: mediaType === "pdf" ? "classic-gold" : mediaType === "video" ? "custom-media" : config.layout,
        animation: mediaType === "video" ? "none" : "ken-burns",
        buildMode: "inspired",
      });
  }
}

function generateIdeas(layout: InvitationLayoutSlug, type: MediaType, concept: string): string[] {
  const base = [
    `Frame your ${type} with ${layout.replace(/-/g, " ")} styling`,
    "Auto-matched typography for names, date, and venue",
    "Mobile-optimized with RSVP, maps, and calendar actions",
  ];
  if (type === "video") base.push("Use your clip as a looping cinematic background");
  if (type === "pdf") base.push("Attach original PDF for guests to download");
  if (layout === "rustic-lace") base.push("Add lace border overlay inspired by your sample");
  if (layout === "boho-hexagon") base.push("Floral corner accents echoing soft watercolor palettes");
  base.push(concept);
  return base.slice(0, 5);
}

export class InvitationInspirationService {
  analyze(input: UploadAnalysisInput): UploadAnalysisResult {
    const colors = pickDominantColors(input.colors);
    const brightness = input.brightness ?? 0.5;
    const { layout, reason, confidence } = matchLayout(
      input.type,
      colors,
      brightness,
      input.aspectRatio,
      input.name
    );

    const preset = getTemplatePreset(layout) ?? getTemplatePreset("custom-media")!;
    const palette = buildPalette(colors, layout, brightness);

    let designConfig: InvitationDesignConfig = mergeDesignConfig(preset.config, {
      layout,
      colors: palette,
      media: [{ url: input.url, type: input.type, role: input.type === "video" ? "background" : input.type === "pdf" ? "attachment" : "hero", name: input.name }],
    });

    designConfig = applyBuildMode(designConfig, input.buildMode ?? "inspired", input.type);

    const moodMap: Partial<Record<InvitationLayoutSlug, string>> = {
      "classic-gold": "timeless & elegant",
      "arch-green": "botanical & refined",
      "rustic-lace": "warm & heritage",
      "boho-hexagon": "romantic & modern",
      "luxury-rings": "opulent & celebratory",
      "custom-media": "personal & artistic",
      "passport-luxe": "destination & luxe",
      "glass-acrylic": "modern & luminous",
      "floral-garden": "romantic garden",
    };

    const mood = isCinematicLayout(layout)
      ? CINEMATIC_THEMES[layout].tagline
      : moodMap[layout] ?? "celebratory & refined";

    const concept: InspirationConcept = {
      style: preset.name,
      mood,
      layoutReason: reason,
      colorStory: `Extracted palette: ${colors.slice(0, 3).join(", ")}`,
      typography: `${designConfig.fonts?.heading ?? "Playfair"} + ${designConfig.fonts?.script ?? "Great Vibes"}`,
      ideas: generateIdeas(layout, input.type, reason),
    };

    return {
      concept,
      suggestedLayout: layout,
      designConfig,
      confidence,
    };
  }

  /** Re-analyze when build mode changes */
  reanalyzeWithMode(input: UploadAnalysisInput, buildMode: NonNullable<UploadAnalysisInput["buildMode"]>): UploadAnalysisResult {
    return this.analyze({ ...input, buildMode });
  }
}

export const invitationInspirationService = new InvitationInspirationService();
