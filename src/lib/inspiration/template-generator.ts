import type { InspirationOutputType } from "@prisma/client";
import type { TemplateSchema } from "@/types/template-engine";
import {
  createWeddingLuxuryTemplate,
  createFuneralClassicTemplate,
  createCorporateFlyerTemplate,
} from "@/lib/default-template-schemas";

export interface AnalysisSignals {
  colorPalette: string[];
  typographyMood?: string;
  animationStyle?: string;
  invitationCategory?: string;
  audioMood?: string;
}

function applyPalette(schema: TemplateSchema, colors: string[]) {
  const primary = colors[0] ?? "#0B8A83";
  const secondary = colors[1] ?? "#D4A63A";
  const background = colors[2] ?? schema.canvas.background;
  return {
    ...schema,
    colorPalette: {
      primary,
      secondary,
      background: typeof background === "string" ? background : "#FAF8F4",
      text: "#0F172A",
    },
    canvas: {
      ...schema.canvas,
      background: `linear-gradient(180deg, ${primary}15 0%, ${typeof background === "string" ? background : "#FAF8F4"} 100%)`,
    },
  };
}

function baseForOutputType(outputType: InspirationOutputType): TemplateSchema {
  switch (outputType) {
    case "FUNERAL_MEMORIAL":
      return createFuneralClassicTemplate();
    case "CORPORATE":
    case "CONCERT":
    case "TICKET":
    case "FLYER":
    case "THANK_YOU":
      return createCorporateFlyerTemplate();
    case "BIRTHDAY":
      return {
        ...createWeddingLuxuryTemplate(),
        name: "Celeventic Birthday Celebration",
        category: "Birthday",
        style: "Festive",
      };
    case "WEDDING":
    case "INVITATION":
    default:
      return createWeddingLuxuryTemplate();
  }
}

const OUTPUT_PRODUCT: Record<InspirationOutputType, TemplateSchema["productType"]> = {
  INVITATION: "INVITATION",
  WEDDING: "INVITATION",
  BIRTHDAY: "INVITATION",
  FUNERAL_MEMORIAL: "INVITATION",
  CORPORATE: "INVITATION",
  CONCERT: "TICKET",
  TICKET: "TICKET",
  FLYER: "FLYER",
  THANK_YOU: "FLYER",
};

export function generateOriginalTemplate(
  outputType: InspirationOutputType,
  signals: AnalysisSignals
): TemplateSchema {
  const base = baseForOutputType(outputType);
  const named = {
    ...base,
    name: `Celeventic ${outputType.replace(/_/g, " ")} Concept`,
    productType: OUTPUT_PRODUCT[outputType],
    style: signals.typographyMood ?? base.style,
  };
  const withPalette = applyPalette(named, signals.colorPalette);
  return {
    ...withPalette,
    name: `${withPalette.name} (Original)`,
    blocks: withPalette.blocks.map((b, i) => ({
      ...b,
      id: `celeb-${i + 1}`,
      content: b.content?.replace(/luxury|premium/gi, "Celeventic") ?? b.content,
    })),
  };
}
