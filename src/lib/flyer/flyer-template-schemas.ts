import type { TemplateSchema } from "@/types/template-engine";
import {
  createBirthdayPopTemplate,
  createCorporateFlyerTemplate,
} from "@/lib/default-template-schemas";

export interface FlyerTemplateDef {
  id: string;
  name: string;
  type: "FLYER" | "POSTER" | "BANNER" | "SOCIAL_MEDIA";
  description: string;
  gradient: string;
  schema: () => TemplateSchema;
}

function createPosterBoldTemplate(): TemplateSchema {
  const base = createCorporateFlyerTemplate();
  return {
    ...base,
    name: "Bold Poster",
    productType: "POSTER",
    canvas: { width: 1080, height: 1920, background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" },
  };
}

function createBannerWideTemplate(): TemplateSchema {
  const base = createCorporateFlyerTemplate();
  return {
    ...base,
    name: "Wide Banner",
    productType: "BANNER",
    canvas: { width: 1920, height: 640, background: "linear-gradient(90deg, #0B8A83 0%, #0F766E 100%)" },
    blocks: base.blocks.map((b) => ({ ...b, y: Math.round(b.y * 0.45) })),
  };
}

function createSocialSquareTemplate(): TemplateSchema {
  const base = createBirthdayPopTemplate();
  return {
    ...base,
    name: "Social Square",
    productType: "SOCIAL_MEDIA",
    canvas: { width: 1080, height: 1080, background: base.canvas.background },
  };
}

function createSocialStoryTemplate(): TemplateSchema {
  const base = createBirthdayPopTemplate();
  return {
    ...base,
    name: "Story Format",
    productType: "SOCIAL_MEDIA",
    canvas: { width: 1080, height: 1920, background: "linear-gradient(180deg, #831843 0%, #4C1D95 100%)" },
  };
}

export const FLYER_TEMPLATE_DEFS: FlyerTemplateDef[] = [
  {
    id: "flyer-classic",
    name: "Classic Flyer",
    type: "FLYER",
    description: "Corporate event flyer with QR and venue details",
    gradient: "from-teal-700 to-slate-900",
    schema: createCorporateFlyerTemplate,
  },
  {
    id: "poster-bold",
    name: "Bold Poster",
    type: "POSTER",
    description: "Tall portrait poster for entrances and print",
    gradient: "from-slate-800 to-slate-950",
    schema: createPosterBoldTemplate,
  },
  {
    id: "banner-wide",
    name: "Wide Banner",
    type: "BANNER",
    description: "Website and stage banner layout",
    gradient: "from-teal-600 to-emerald-800",
    schema: createBannerWideTemplate,
  },
  {
    id: "social-square",
    name: "Social Square",
    type: "SOCIAL_MEDIA",
    description: "Instagram / Facebook square post",
    gradient: "from-pink-200 to-violet-200",
    schema: createSocialSquareTemplate,
  },
  {
    id: "social-story",
    name: "Story Format",
    type: "SOCIAL_MEDIA",
    description: "9:16 story for Instagram, TikTok, WhatsApp status",
    gradient: "from-fuchsia-900 to-violet-950",
    schema: createSocialStoryTemplate,
  },
  {
    id: "birthday-pop",
    name: "Birthday Pop",
    type: "FLYER",
    description: "Colorful celebration flyer",
    gradient: "from-pink-100 to-violet-100",
    schema: createBirthdayPopTemplate,
  },
];

export function getFlyerTemplateDef(id: string): FlyerTemplateDef | undefined {
  return FLYER_TEMPLATE_DEFS.find((t) => t.id === id);
}
